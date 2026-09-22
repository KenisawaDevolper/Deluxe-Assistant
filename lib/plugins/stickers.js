const fs = require('fs');
const os = require('os');
const path = require('path');
const sharp = require('sharp');
const ffmpeg = require('fluent-ffmpeg');
const ffmpegPath = require('@ffmpeg-installer/ffmpeg').path;
const { downloadContentFromMessage } = require('lilys-baileys');

ffmpeg.setFfmpegPath(ffmpegPath);

async function streamToBuffer(stream) {
    const chunks = [];
    for await (const chunk of stream) chunks.push(chunk);
    return Buffer.concat(chunks);
}

async function downloadMedia(message, mime) {
    const type = mime.split('/')[0] === 'image' ? 'image' : 'video';
    return streamToBuffer(await downloadContentFromMessage(message, type));
}

async function imageSticker(buffer) {
    return sharp(buffer)
        .resize(512, 512, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
        .webp({ quality: 85 })
        .toBuffer();
}

function addStickerDescription(webp, description) {
    const metadata = JSON.stringify({
        'sticker-pack-id': `deluxe-assistant-${Date.now()}`,
        'sticker-pack-name': process.env.STICKER_PACK_NAME || 'Deluxe Assistant',
        'sticker-pack-publisher': process.env.STICKER_AUTHOR || 'Deluxe Assistant',
        'sticker-pack-description': description || 'Sticker creado con Deluxe Assistant'
    });
    const data = Buffer.from(`${metadata}\0`);
    const exif = Buffer.alloc(26 + data.length);
    exif.writeUInt16LE(0x4949, 0);
    exif.writeUInt16LE(0x002A, 2);
    exif.writeUInt32LE(8, 4);
    exif.writeUInt16LE(1, 8);
    exif.writeUInt16LE(0x010E, 10);
    exif.writeUInt16LE(2, 12);
    exif.writeUInt32LE(data.length, 14);
    exif.writeUInt32LE(26, 18);
    exif.writeUInt32LE(0, 22);
    data.copy(exif, 26);

    const chunk = Buffer.alloc(8 + exif.length + (exif.length % 2));
    chunk.write('EXIF', 0, 4, 'ascii');
    chunk.writeUInt32LE(exif.length, 4);
    exif.copy(chunk, 8);
    const output = Buffer.concat([webp, chunk]);
    output.writeUInt32LE(output.length - 8, 4);
    return output;
}

function videoSticker(buffer, extension = 'mp4') {
    const input = path.join(os.tmpdir(), `deluxe-sticker-${Date.now()}.${extension}`);
    const output = `${input}.webp`;
    fs.writeFileSync(input, buffer);
    return new Promise((resolve, reject) => {
        ffmpeg(input)
            .outputOptions([
                '-vcodec libwebp',
                '-vf scale=512:512:force_original_aspect_ratio=decrease,pad=512:512:-1:-1:color=0x00000000,fps=15',
                '-loop 0',
                '-an',
                '-vsync 0',
                '-t 6'
            ])
            .toFormat('webp')
            .on('end', () => {
                try {
                    const result = fs.readFileSync(output);
                    fs.unlinkSync(input);
                    fs.unlinkSync(output);
                    resolve(result);
                } catch (error) {
                    reject(error);
                }
            })
            .on('error', error => {
                try { fs.unlinkSync(input); } catch {}
                try { fs.unlinkSync(output); } catch {}
                reject(error);
            })
            .save(output);
    });
}

function mediaTarget(m) {
    const message = m.quoted ? m.quoted : m.msg;
    const mime = message?.mimetype || '';
    return { message, mime };
}

module.exports = {
    commands: ['sticker', 's', 'stiker', 'toimg'],
    async handler({ command, m, q, reply, sock }) {
        const target = mediaTarget(m);
        if (!target.message || !target.mime) {
            return reply(command === 'toimg'
                ? '❌ Responde a un sticker para convertirlo en imagen.'
                : '❌ Envía o responde a una imagen o video para crear un sticker.');
        }

        try {
            const buffer = await downloadMedia(target.message, target.mime);
            if (command === 'toimg') {
                const image = await sharp(buffer).png().toBuffer();
                return sock.sendMessage(m.chat, { image }, { quoted: m });
            }

            const sticker = target.mime.startsWith('video/')
                ? await videoSticker(buffer, target.mime.split('/')[1] || 'mp4')
                : await imageSticker(buffer);
            return sock.sendMessage(m.chat, { sticker: addStickerDescription(sticker, q) }, { quoted: m });
        } catch (error) {
            console.log('[stickers]', error.message);
            return reply('❌ No se pudo crear el sticker. Usa una imagen válida o un video de máximo 6 segundos.');
        }
    }
};
