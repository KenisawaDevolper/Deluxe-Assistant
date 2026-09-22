const axios = require('axios');
const { sendInteractiveButtons, sendCarouselCards } = require('../interactive-builder');

function isTikTokUrl(url) {
    return /https?:\/\/(vm|vt|www|mobile)\.tiktok\.com\//i.test(url);
}

async function downloadBuffer(url, referer = 'https://www.tiktok.com/') {
    const headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept': '*/*',
        'Accept-Language': 'en-US,en;q=0.9',
        'Referer': referer
    };

    try {
        const res = await axios.get(url, { responseType: 'arraybuffer', headers, timeout: 60000 });
        return Buffer.from(res.data);
    } catch (err1) {
        delete headers.Referer;
        const res = await axios.get(url, { responseType: 'arraybuffer', headers, timeout: 60000 });
        return Buffer.from(res.data);
    }
}

async function fetchTikTokData(url) {
    // 1. Intentar TikWM (Servicio principal)
    try {
        const { data } = await axios.post(
            'https://www.tikwm.com/api/',
            new URLSearchParams({ url, count: 12, cursor: 0, web: 1 }),
            {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
                },
                timeout: 15000
            }
        );
        if (data?.code === 0 && data?.data) {
            const res = data.data;
            const isImages = Array.isArray(res.images) && res.images.length > 0;
            return {
                type: isImages ? 'images' : 'video',
                title: res.title || 'TikTok sin título',
                author: res.author?.nickname || res.author?.unique_id || 'TikTok User',
                username: res.author?.unique_id || '',
                cover: res.cover || res.origin_cover || '',
                videoUrl: res.play.startsWith('http') ? res.play : `https://www.tikwm.com${res.play}`,
                wmVideoUrl: res.wmplay ? (res.wmplay.startsWith('http') ? res.wmplay : `https://www.tikwm.com${res.wmplay}`) : '',
                audioUrl: res.music.startsWith('http') ? res.music : `https://www.tikwm.com${res.music}`,
                musicTitle: res.music_info?.title || 'Audio de TikTok',
                images: res.images || []
            };
        }
    } catch (error) {
        console.log('[tiktok] error en TikWM:', error.message);
    }

    // 2. Fallback: Tiklydown
    try {
        const { data } = await axios.get(`https://api.tiklydown.eu.org/api/download?url=${encodeURIComponent(url)}`, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            },
            timeout: 15000
        });
        if (data?.video?.noWatermark || data?.images?.length) {
            const isImages = Array.isArray(data.images) && data.images.length > 0;
            return {
                type: isImages ? 'images' : 'video',
                title: data.title || 'TikTok Video',
                author: data.author?.name || 'TikTok',
                username: data.author?.unique_id || '',
                cover: data.thumbnail || '',
                videoUrl: data.video?.noWatermark || data.video?.watermark || '',
                wmVideoUrl: data.video?.watermark || '',
                audioUrl: data.music?.play_url || data.music?.url || '',
                musicTitle: data.music?.title || 'Audio de TikTok',
                images: (data.images || []).map(img => typeof img === 'string' ? img : img.url)
            };
        }
    } catch (error) {
        console.log('[tiktok] error en Tiklydown:', error.message);
    }

    throw new Error('No se pudo obtener el contenido de TikTok. Verifica que el enlace sea válido y público.');
}

module.exports = {
    commands: ['tiktok', 'tt', 'tiktokdl', 'ttdl', 'ttmp3', 'ttmp4'],
    async handler({ command, q, reply, sock, m }) {
        const query = Array.isArray(q) ? q.join(' ').trim() : String(q || '').trim();

        if (!query) {
            return reply('❌ Ingresa un enlace válido de TikTok.\nEjemplo: .tiktok https://vm.tiktok.com/XXXXXXXXX/');
        }

        if (!isTikTokUrl(query)) {
            return reply('❌ El enlace proporcionado no parece ser un enlace válido de TikTok.');
        }

        // Subcomando: Descarga solo MP3 (.ttmp3)
        if (command === 'ttmp3') {
            await reply('⏳ Descargando audio de TikTok...');
            try {
                const data = await fetchTikTokData(query);
                if (!data.audioUrl) throw new Error('No se encontró enlace de audio para este TikTok.');
                const audioBuffer = await downloadBuffer(data.audioUrl);
                return await sock.sendMessage(m.chat, {
                    audio: audioBuffer,
                    mimetype: 'audio/mp4',
                    fileName: `${(data.title || 'tiktok').slice(0, 30)}.mp3`,
                    ptt: false
                }, { quoted: m });
            } catch (error) {
                return reply(`❌ Error al descargar audio: ${error.message}`);
            }
        }

        // Subcomando: Descarga solo MP4 Video (.ttmp4)
        if (command === 'ttmp4') {
            await reply('⏳ Descargando video sin marca de agua...');
            try {
                const data = await fetchTikTokData(query);
                if (data.type === 'images') throw new Error('Este TikTok es una galería de fotos, usa .tiktok para ver las imágenes.');
                const videoBuffer = await downloadBuffer(data.videoUrl);
                return await sock.sendMessage(m.chat, {
                    video: videoBuffer,
                    mimetype: 'video/mp4',
                    caption: `🎵 *${data.title}*\n👤 *Autor:* @${data.username}`,
                    fileName: 'tiktok.mp4'
                }, { quoted: m });
            } catch (error) {
                return reply(`❌ Error al descargar video: ${error.message}`);
            }
        }

        // Comando Principal: .tiktok / .tt / .tiktokdl
        await reply('⏳ Procesando contenido de TikTok...');

        let data;
        try {
            data = await fetchTikTokData(query);
        } catch (error) {
            return reply(`❌ ${error.message}`);
        }

        // Caso A: Galería de Fotos / Diapositivas en Carrusel (Anti-Spam)
        if (data.type === 'images' && data.images.length > 0) {
            try {
                const cards = data.images.map((imgUrl, index) => ({
                    image: imgUrl,
                    body: `🖼️ *Foto ${index + 1}/${data.images.length}*`,
                    footer: data.title.slice(0, 45),
                    buttons: [
                        { type: 'reply', text: '🎵 Audio MP3', command: `.ttmp3 ${query}` }
                    ]
                }));

                return await sendCarouselCards(sock, m.chat, {
                    body: `📸 *TIKTOK GALERÍA (${data.images.length} fotos)*\n👤 *Autor:* @${data.username} (${data.author})\n💬 *Título:* ${data.title}\n🎶 *Música:* ${data.musicTitle}`,
                    footer: 'Deluxe Assistant · TikTok',
                    cards,
                    quoted: m
                });
            } catch (carouselError) {
                await reply(`📸 *TikTok Galería (${data.images.length} imágenes)*\n👤 *Autor:* @${data.username}\n💬 *Título:* ${data.title}\n\nEnviando fotos...`);
                for (let i = 0; i < data.images.length; i++) {
                    const imgUrl = data.images[i];
                    try {
                        const imgBuffer = await downloadBuffer(imgUrl);
                        await sock.sendMessage(m.chat, {
                            image: imgBuffer,
                            caption: `🖼️ *Foto ${i + 1}/${data.images.length}*`
                        }, { quoted: i === 0 ? m : undefined });
                    } catch {}
                }

                if (data.audioUrl) {
                    return await sendInteractiveButtons(sock, m.chat, {
                        headerTitle: '🎶 Audio de la Galería',
                        body: `¿Deseas descargar la música de fondo de esta galería?\n🎵 *Música:* ${data.musicTitle}`,
                        footer: 'Deluxe Assistant · TikTok',
                        buttons: [
                            { type: 'reply', text: '🎵 Descargar Audio MP3', command: `.ttmp3 ${query}` }
                        ],
                        quoted: m
                    });
                }
                return;
            }
        }

        // Caso B: Video Normal de TikTok
        try {
            const videoBuffer = await downloadBuffer(data.videoUrl);
            const caption = `🎵 *TIKTOK DOWNLOADER*\n\n👤 *Autor:* @${data.username} (${data.author})\n💬 *Descripción:* ${data.title}\n🎶 *Música:* ${data.musicTitle}`;

            await sock.sendMessage(m.chat, {
                video: videoBuffer,
                mimetype: 'video/mp4',
                caption,
                fileName: 'tiktok.mp4'
            }, { quoted: m });

            // Enviar botones interactivos de acciones adicionales
            if (data.audioUrl) {
                await sendInteractiveButtons(sock, m.chat, {
                    headerTitle: '🎵 Opciones de TikTok',
                    body: '¿Qué deseas hacer a continuación?',
                    footer: 'Deluxe Assistant · TikTok',
                    buttons: [
                        { type: 'reply', text: '🎵 Descargar Audio MP3', command: `.ttmp3 ${query}` },
                        { type: 'url', text: '🌐 Ver en TikTok', url: query }
                    ],
                    quoted: m
                });
            }
        } catch (error) {
            return reply(`❌ Error al descargar el archivo de video: ${error.message}`);
        }
    }
};
