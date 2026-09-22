const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, '..', 'database', 'autodownload.json');

function getAutoDlChats() {
    try {
        if (!fs.existsSync(dbPath)) {
            fs.writeFileSync(dbPath, JSON.stringify([]));
            return [];
        }
        return JSON.parse(fs.readFileSync(dbPath));
    } catch {
        return [];
    }
}

function saveAutoDlChats(chats) {
    try {
        const dir = path.dirname(dbPath);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(dbPath, JSON.stringify(chats, null, 2));
    } catch {}
}

const tiktokPlugin = require('./tiktok');
const playPlugin = require('./play');

function extractTikTokUrl(text) {
    const match = String(text || '').match(/https?:\/\/(vm|vt|www|mobile)\.tiktok\.com\/[^\s]+/i);
    return match ? match[0] : null;
}

function extractYouTubeUrl(text) {
    const match = String(text || '').match(/https?:\/\/(www\.)?(youtube\.com|youtu\.be)\/[^\s]+/i);
    return match ? match[0] : null;
}

module.exports = {
    commands: ['autodownload', 'autodl', 'autodescarga'],

    async onMessage(context) {
        const { m, body, hasPrefix } = context;
        if (!m || !body || m.key.fromMe) return false;

        const chats = getAutoDlChats();
        if (!chats.includes(m.chat)) return false;

        // Evitar interferir con comandos directos del bot
        if (hasPrefix) return false;

        // Detectar enlace de TikTok
        const tiktokUrl = extractTikTokUrl(body);
        if (tiktokUrl) {
            console.log(`[autodownload] TikTok detectado en ${m.chat}: ${tiktokUrl}`);
            await tiktokPlugin.handler({ ...context, command: 'tiktok', q: tiktokUrl, args: [tiktokUrl] });
            return true;
        }

        // Detectar enlace de YouTube
        const youtubeUrl = extractYouTubeUrl(body);
        if (youtubeUrl) {
            console.log(`[autodownload] YouTube detectado en ${m.chat}: ${youtubeUrl}`);
            await playPlugin.handler({ ...context, command: 'play', q: youtubeUrl, args: [youtubeUrl] });
            return true;
        }

        return false;
    },

    async handler({ args, reply, isGroup, isGroupAdmins, isCreator, m }) {
        const action = (args[0] || '').toLowerCase();
        const chats = getAutoDlChats();
        const isEnabled = chats.includes(m.chat);

        // Control de permisos en grupos
        if (isGroup && !isGroupAdmins && !isCreator) {
            return reply('❌ *Solo los administradores del grupo pueden activar o desactivar el AutoDownload.*');
        }

        if (['on', '1', 'enable', 'activar'].includes(action)) {
            if (isEnabled) return reply('✅ El *AutoDownload* ya está activado en este chat.');
            chats.push(m.chat);
            saveAutoDlChats(chats);
            return reply(`✅ *AutoDownload activado correctamente.* ${isGroup ? '\n👥 Enlace de TikTok o YouTube enviado en este grupo se descargará automáticamente.' : '\n👤 Enlace de TikTok o YouTube enviado en este chat privado se descargará automáticamente.'}`);
        }

        if (['off', '0', 'disable', 'desactivar'].includes(action)) {
            if (!isEnabled) return reply('✅ El *AutoDownload* ya está desactivado en este chat.');
            const filtered = chats.filter(jid => jid !== m.chat);
            saveAutoDlChats(filtered);
            return reply('🛑 *AutoDownload desactivado en este chat.*');
        }

        const statusText = isEnabled ? '🟢 *ACTIVADO*' : '🔴 *DESACTIVADO*';
        return reply(`📥 *AUTO DOWNLOAD*\n\nEstado en este chat: ${statusText}\n\nUso:\n• *.autodownload on* (Activar)\n• *.autodownload off* (Desactivar)\n\n${isGroup ? '⚠️ *Nota:* Solo administradores pueden cambiar este ajuste.' : ''}`);
    }
};
