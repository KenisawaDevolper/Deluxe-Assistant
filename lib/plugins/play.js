const fs = require('fs');
const os = require('os');
const path = require('path');
const axios = require('axios');
const ytSearch = require('yt-search');
const { prepareWAMessageMedia, generateWAMessageFromContent } = require('lilys-baileys');

function formatSeconds(seconds) {
    if (!seconds || isNaN(seconds)) return 'Desconocido';
    const min = Math.floor(seconds / 60);
    const sec = Math.floor(seconds % 60);
    return `${min}:${sec < 10 ? '0' : ''}${sec}`;
}

function isYouTubeUrl(value) {
    return /^https?:\/\/(www\.)?(youtube\.com|youtu\.be)\//i.test(value);
}

async function downloadMediaBuffer(url) {
    const headersList = [
        {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
            'Accept': '*/*',
            'Accept-Language': 'en-US,en;q=0.9',
            'Referer': 'https://www.youtube.com/'
        },
        {
            'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
            'Accept': '*/*'
        },
        {
            'User-Agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36'
        }
    ];

    for (const headers of headersList) {
        try {
            const res = await axios.get(url, { responseType: 'arraybuffer', headers, timeout: 60000 });
            if (res.data && res.data.length > 500) {
                return Buffer.from(res.data);
            }
        } catch (e) {
            console.log('[downloadMediaBuffer] intento falló:', e.message);
        }
    }
    throw new Error('El servidor de descarga devolvió un error (403 Forbidden).');
}

async function searchVideo(query) {
    if (isYouTubeUrl(query)) {
        try {
            const videoId = query.includes('v=') ? query.split('v=')[1]?.split('&')[0] : query.split('/').pop();
            const result = await ytSearch({ videoId });
            if (result) {
                return {
                    url: query,
                    title: result.title || 'Video de YouTube',
                    author: result.author?.name || 'YouTube',
                    duration: result.seconds || 0,
                    thumbnail: result.thumbnail || ''
                };
            }
        } catch {}
        return { url: query, title: 'Video de YouTube', author: 'YouTube', duration: 0, thumbnail: '' };
    }

    try {
        const { YouTube } = require('youtube-sr');
        const results = await YouTube.search(query, { limit: 1, type: 'video' });
        const video = results?.[0];
        if (video) {
            return {
                url: video.url || `https://www.youtube.com/watch?v=${video.id}`,
                title: video.title || 'Video de YouTube',
                author: video.channel?.name || 'YouTube',
                duration: video.duration ? Math.floor(video.duration / 1000) : 0,
                thumbnail: video.thumbnail?.url || ''
            };
        }
    } catch (error) {
        console.log('[play] búsqueda youtube-sr:', error.message);
    }

    try {
        const result = await ytSearch(query);
        if (result.videos?.[0]) {
            const v = result.videos[0];
            return {
                url: v.url,
                title: v.title,
                author: v.author?.name || 'YouTube',
                duration: v.seconds || 0,
                thumbnail: v.thumbnail || ''
            };
        }
    } catch (error) {
        console.log('[play] búsqueda yt-search:', error.message);
    }

    throw new Error('No se encontraron resultados para esa búsqueda.');
}

async function getAudioFromMultiApis(youtubeUrl) {
    // 1. Nexray API
    try {
        const { data } = await axios.get(`https://api.nexray.eu.cc/downloader/v1/ytmp3?url=${encodeURIComponent(youtubeUrl)}`, {
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
            timeout: 30000
        });
        if (data?.status && data?.result?.url) {
            const buffer = await downloadMediaBuffer(data.result.url);
            return { buffer, title: data.result.title || 'Audio de YouTube' };
        }
    } catch (e) {
        console.log('[play] API 1 (Nexray) falló:', e.message);
    }

    // 2. Vreden API
    try {
        const { data } = await axios.get(`https://api.vreden.web.id/api/ytmp3?url=${encodeURIComponent(youtubeUrl)}`, { timeout: 30000 });
        const downloadUrl = data?.result?.download?.url || data?.result?.url;
        if (downloadUrl) {
            const buffer = await downloadMediaBuffer(downloadUrl);
            return { buffer, title: data?.result?.title || 'Audio de YouTube' };
        }
    } catch (e) {
        console.log('[play] API 2 (Vreden) falló:', e.message);
    }

    // 3. BTCH API
    try {
        const { data } = await axios.get(`https://api.btch.bz/download/ytdl?url=${encodeURIComponent(youtubeUrl)}`, { timeout: 30000 });
        const downloadUrl = data?.result?.mp3 || data?.result?.url;
        if (downloadUrl) {
            const buffer = await downloadMediaBuffer(downloadUrl);
            return { buffer, title: data?.result?.title || 'Audio de YouTube' };
        }
    } catch (e) {
        console.log('[play] API 3 (BTCH) falló:', e.message);
    }

    // 4. Fallback Local yt-dlp
    try {
        const youtubeDl = require('youtube-dl-exec');
        const base = path.join(os.tmpdir(), `deluxe-play-${Date.now()}`);
        const output = `${base}.%(ext)s`;
        const result = await youtubeDl(youtubeUrl, {
            noPlaylist: true,
            noWarnings: true,
            quiet: true,
            format: 'bestaudio[ext=m4a]/bestaudio',
            maxFilesize: '15M',
            print: 'after_move:filepath',
            output
        });
        const file = String(result.stdout || result || '').trim().split('\n').pop();
        if (file && fs.existsSync(file)) {
            const buffer = fs.readFileSync(file);
            try { fs.unlinkSync(file); } catch {}
            return { buffer, title: 'Audio de YouTube' };
        }
    } catch (e) {
        console.log('[play] Fallback 4 (yt-dlp local) falló:', e.message);
    }

    throw new Error('Todas las APIs de descarga fallaron (Error 403 en los servidores remotos). Reintenta con otro enlace.');
}

async function getVideoFromMultiApis(youtubeUrl) {
    // 1. Nexray API
    try {
        const { data } = await axios.get(`https://api.nexray.eu.cc/downloader/v1/ytmp4?url=${encodeURIComponent(youtubeUrl)}&resolusi=1080`, {
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
            timeout: 45000
        });
        if (data?.status && data?.result?.url) {
            const buffer = await downloadMediaBuffer(data.result.url);
            return { buffer, title: data.result.title || 'Video de YouTube', quality: data.result.quality || '1080p' };
        }
    } catch (e) {
        console.log('[play video] API 1 (Nexray) falló:', e.message);
    }

    // 2. Vreden API
    try {
        const { data } = await axios.get(`https://api.vreden.web.id/api/ytmp4?url=${encodeURIComponent(youtubeUrl)}`, { timeout: 45000 });
        const downloadUrl = data?.result?.download?.url || data?.result?.url;
        if (downloadUrl) {
            const buffer = await downloadMediaBuffer(downloadUrl);
            return { buffer, title: data?.result?.title || 'Video de YouTube', quality: '720p' };
        }
    } catch (e) {
        console.log('[play video] API 2 (Vreden) falló:', e.message);
    }

    throw new Error('No se pudo obtener el archivo de video desde ninguna API.');
}

module.exports = {
    commands: ['play', 'song', 'music', 'yta', 'playmp3', 'ytmp3', 'ytv', 'playmp4', 'ytmp4'],
    async handler({ command, q, reply, sock, m, thumb }) {
        const query = Array.isArray(q) ? q.join(' ').trim() : String(q || '').trim();

        // 1. Descarga directa de Audio (.yta / .playmp3 / .ytmp3)
        if (['yta', 'playmp3', 'ytmp3'].includes(command)) {
            if (!query) return reply('❌ Indica el enlace o búsqueda de YouTube.\nEjemplo: .yta https://youtu.be/...');
            await reply('⏳ Descargando audio en MP3...');
            try {
                let videoInfo = isYouTubeUrl(query) ? { url: query } : await searchVideo(query);
                const audioData = await getAudioFromMultiApis(videoInfo.url);

                return await sock.sendMessage(m.chat, {
                    audio: audioData.buffer,
                    mimetype: 'audio/mp4',
                    fileName: `${(audioData.title || 'audio').replace(/[\\/:*?"<>|]/g, '')}.mp3`,
                    ptt: false
                }, { quoted: m });
            } catch (error) {
                return reply(`❌ Error al descargar audio: ${error.message}`);
            }
        }

        // 2. Descarga directa de Video (.ytv / .playmp4 / .ytmp4)
        if (['ytv', 'playmp4', 'ytmp4'].includes(command)) {
            if (!query) return reply('❌ Indica el enlace o búsqueda de YouTube.\nEjemplo: .ytv https://youtu.be/...');
            await reply('⏳ Descargando video en MP4...');
            try {
                let videoInfo = isYouTubeUrl(query) ? { url: query } : await searchVideo(query);
                const videoData = await getVideoFromMultiApis(videoInfo.url);

                return await sock.sendMessage(m.chat, {
                    video: videoData.buffer,
                    mimetype: 'video/mp4',
                    caption: `🎬 *${videoData.title || 'Video de YouTube'}*\n📊 *Calidad:* ${videoData.quality || '1080p'}`,
                    fileName: `${(videoData.title || 'video').replace(/[\\/:*?"<>|]/g, '')}.mp4`
                }, { quoted: m });
            } catch (error) {
                return reply(`❌ Error al descargar video: ${error.message}`);
            }
        }

        // 3. Búsqueda principal (.play / .song / .music)
        if (!query) return reply('❌ Escribe el nombre de una canción o pega un enlace de YouTube.\nEjemplo: .play música relajante');

        let video;
        try {
            video = await searchVideo(query);
        } catch (error) {
            return reply(`❌ ${error.message}`);
        }

        const durationText = typeof video.duration === 'number' ? formatSeconds(video.duration) : video.duration;
        const bodyText = `🎬 *YOUTUBE DOWNLOADER*\n\n📌 *Título:* ${video.title}\n👤 *Canal/Autor:* ${video.author}\n⏱️ *Duración:* ${durationText}\n🔗 *Enlace:* ${video.url}\n\n*Selecciona una opción para descargar:*`;
        const footerText = 'Deluxe Assistant · YouTube';

        let media;
        try {
            if (video.thumbnail) {
                const imgBuffer = await downloadMediaBuffer(video.thumbnail);
                media = await prepareWAMessageMedia(
                    { image: imgBuffer, mimetype: 'image/jpeg' },
                    { upload: sock.waUploadToServer }
                );
            }
        } catch {}

        if (!media && thumb) {
            try {
                media = await prepareWAMessageMedia(
                    { image: thumb, mimetype: 'image/jpeg' },
                    { upload: sock.waUploadToServer }
                );
            } catch {}
        }

        try {
            const message = generateWAMessageFromContent(m.chat, {
                viewOnceMessage: {
                    message: {
                        messageContextInfo: { deviceListMetadata: {}, deviceListMetadataVersion: 2 },
                        interactiveMessage: {
                            body: { text: bodyText },
                            footer: { text: footerText },
                            header: media?.imageMessage ? { hasMediaAttachment: true, imageMessage: media.imageMessage } : { title: '🎬 YouTube Player' },
                            nativeFlowMessage: {
                                buttons: [
                                    {
                                        name: 'quick_reply',
                                        buttonParamsJson: JSON.stringify({
                                            display_text: '🎵 Audio (MP3)',
                                            id: `.yta ${video.url}`
                                        })
                                    },
                                    {
                                        name: 'quick_reply',
                                        buttonParamsJson: JSON.stringify({
                                            display_text: '🎥 Video (MP4)',
                                            id: `.ytv ${video.url}`
                                        })
                                    },
                                    {
                                        name: 'cta_url',
                                        buttonParamsJson: JSON.stringify({
                                            display_text: '📺 Ver en YouTube',
                                            url: video.url
                                        })
                                    }
                                ],
                                messageParamsJson: '{}'
                            }
                        }
                    }
                }
            }, { userJid: m.chat, upload: sock.waUploadToServer });

            return await sock.relayMessage(m.chat, message.message, { messageId: message.key.id });
        } catch (interactiveError) {
            const fallbackText = `${bodyText}\n\n💡 *Comandos de descarga:* \n• .yta ${video.url}\n• .ytv ${video.url}`;
            if (video.thumbnail) {
                return await sock.sendMessage(m.chat, { image: { url: video.thumbnail }, caption: fallbackText }, { quoted: m });
            }
            return await reply(fallbackText);
        }
    }
};
