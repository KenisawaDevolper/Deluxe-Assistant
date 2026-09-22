const fs = require('fs');
const os = require('os');
const path = require('path');
const ytSearch = require('yt-search');

async function runYtDlp(url, output) {
    const youtubeDl = require('youtube-dl-exec');
    const cookies = getCookies();
    const options = {
        noPlaylist: true,
        noWarnings: true,
        quiet: true,
        noProgress: true,
        format: 'bestaudio[ext=m4a]/bestaudio',
        maxFilesize: '15M',
        print: 'after_move:filepath',
        output
    };
    if (cookies.path) options.cookies = cookies.path;
    try {
        const result = await youtubeDl(url, options);
        return typeof result === 'string' ? result.trim() : String(result.stdout || '').trim();
    } finally {
        cookies.remove();
    }
}

function getCookies() {
    const configuredPath = process.env.YTDLP_COOKIES_FILE
        || path.join(process.cwd(), 'cookies', 'youtube-cookies.txt');
    if (configuredPath && fs.existsSync(configuredPath)) {
        return { path: configuredPath, remove() {} };
    }
    if (!process.env.YTDLP_COOKIES_B64) return { path: '', remove() {} };

    const temporaryPath = path.join(os.tmpdir(), `deluxe-youtube-cookies-${Date.now()}.txt`);
    fs.writeFileSync(temporaryPath, Buffer.from(process.env.YTDLP_COOKIES_B64, 'base64'));
    return {
        path: temporaryPath,
        remove() {
            try { fs.unlinkSync(temporaryPath); } catch {}
        }
    };
}

async function searchVideo(query) {
    try {
        const { YouTube } = require('youtube-sr');
        const results = await YouTube.search(query, { limit: 1, type: 'video' });
        const video = results?.[0];
        if (video?.url || video?.id) {
            return {
                url: video.url || `https://www.youtube.com/watch?v=${video.id}`,
                title: video.title || 'Audio de YouTube',
                thumbnail: video.thumbnail?.url || ''
            };
        }
    } catch (error) {
        console.log('[play] búsqueda youtube-sr:', error.message);
    }

    try {
        const youtubeDl = require('youtube-dl-exec');
        const cookies = getCookies();
        const options = {
            dumpSingleJson: true,
            skipDownload: true,
            noWarnings: true,
            noPlaylist: true,
            quiet: true
        };
        if (cookies.path) options.cookies = cookies.path;
        try {
            const result = await youtubeDl(`ytsearch1:${query}`, options);
            const raw = typeof result === 'string' ? result : result.stdout;
            const video = JSON.parse(raw);
            if (video.webpage_url) return { url: video.webpage_url, title: video.title, thumbnail: video.thumbnail };
        } finally {
            cookies.remove();
        }
    } catch (error) {
        console.log('[play] búsqueda yt-dlp:', error.message);
    }

    try {
        const result = await ytSearch(query);
        if (result.videos?.[0]) return result.videos[0];
        throw new Error('No se encontraron resultados.');
    } catch (error) {
        throw new Error(`No se encontraron resultados con los métodos disponibles: ${error.message}`);
    }
}

function isYouTubeUrl(value) {
    return /^https?:\/\/(www\.)?(youtube\.com|youtu\.be)\//i.test(value);
}

module.exports = {
    commands: ['play', 'song', 'music'],
    async handler({ q, reply, sock, m }) {
        const query = Array.isArray(q)
            ? q.join(' ').trim()
            : String(q || '').trim();
        if (!query) return reply('❌ Escribe el nombre de una canción o pega un enlace de YouTube.\nEjemplo: .play música relajante');

        let video;
        try {
            video = isYouTubeUrl(query)
                ? { url: query, title: 'Audio de YouTube', thumbnail: '' }
                : await searchVideo(query);
        } catch (error) {
            return reply(`❌ No se pudo buscar el video: ${error.message}`);
        }

        if (!video?.url) return reply('❌ No encontré resultados para esa búsqueda.');
        await reply(`🔎 *${video.title}*\n⏳ Descargando audio...`);

        const base = path.join(os.tmpdir(), `deluxe-play-${Date.now()}`);
        const output = `${base}.%(ext)s`;
        try {
            const result = await runYtDlp(video.url, output);
            const file = result.split('\n').filter(Boolean).pop();
            if (!file || !fs.existsSync(file)) throw new Error('yt-dlp no generó el archivo de audio.');
            const audio = fs.readFileSync(file);
            const extension = path.extname(file).toLowerCase();
            const mimetype = extension === '.webm' ? 'audio/webm' : 'audio/mp4';
            await sock.sendMessage(m.chat, {
                audio,
                mimetype,
                fileName: `${(video.title || 'audio').replace(/[\\/:*?"<>|]/g, '').slice(0, 80)}${extension || '.m4a'}`,
                ptt: false
            }, { quoted: m });
            fs.unlinkSync(file);
        } catch (error) {
            const message = error.message.includes('Cannot find module')
                ? 'Falta youtube-dl-exec. Ejecuta npm install en el panel de HidenCloud.'
                : error.message.includes('Sign in to confirm')
                    ? 'YouTube está bloqueando la IP de HidenCloud. Configura cookies propias con YTDLP_COOKIES_FILE o YTDLP_COOKIES_B64.'
                : error.message.includes('max-filesize')
                    ? 'El audio supera el límite de 15 MB.'
                    : `No se pudo descargar el audio: ${error.message}`;
            return reply(`❌ ${message}`);
        }
    }
};
