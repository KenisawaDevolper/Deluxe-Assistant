require('./configure/settings');
const fs = require('fs');
const sharp = require('sharp');
const { getContentType } = require('lilys-baileys');
const { dispatch } = require('./lib/plugin-loader');
const { runtime, tanggal } = require('./lib/myfunc');

module.exports = async function deluxeAssistant(sock, m, store) {
    try {
        const message = m.message || {};
        const type = m.mtype;
        const body = (
            type === 'conversation' ? message.conversation :
            type === 'imageMessage' ? message.imageMessage.caption :
            type === 'videoMessage' ? message.videoMessage.caption :
            type === 'extendedTextMessage' ? message.extendedTextMessage.text :
            type === 'buttonsResponseMessage' ? message.buttonsResponseMessage.selectedButtonId :
            type === 'listResponseMessage' ? message.listResponseMessage.singleSelectReply.selectedRowId :
            type === 'templateButtonReplyMessage' ? message.templateButtonReplyMessage.selectedId :
            type === 'interactiveResponseMessage' ? JSON.parse(m.msg.nativeFlowResponseMessage.paramsJson).id :
            m.text || ''
        ) || '';

        const bodyTrim = body.trim();
        const legacyCommand = bodyTrim.startsWith('=>') || bodyTrim.startsWith('$');
        const prefixMatch = legacyCommand ? null : bodyTrim.match(/^[#$@+,.?='():%&><^|/\\]/);
        const prefix = prefixMatch ? prefixMatch[0] : '/';
        const hasPrefix = Boolean(prefixMatch);
        const withoutPrefix = hasPrefix ? bodyTrim.slice(prefix.length).trim() : bodyTrim;
        const parts = withoutPrefix.split(/ +/);
        const command = (parts.shift() || '').toLowerCase();
        const args = parts;
        const q = args.join(' ');
        const from = m.key.remoteJid;
        const isGroup = from.endsWith('@g.us');
        const botNumber = sock.decodeJid(sock.user?.id || sock.user?.jid || '');
        const sender = sock.decodeJid(m.sender || m.key.participant || m.key.remoteJid || '');

        const premium = JSON.parse(fs.readFileSync('./lib/database/premium.json'));
        const isPremium = premium.includes(sender);
        const isCreator = [botNumber, ...(global.owner || [])]
            .map(value => String(value).replace(/[^0-9]/g, '') + '@s.whatsapp.net')
            .includes(sender);

        const pushname = m.pushName || 'sin nombre';
        const quoted = m.quoted || m;
        const mime = (quoted.msg || quoted).mimetype || '';
        const reply = text => sock.sendMessage(m.chat, { text }, { quoted: m });

        const groupMetadata = isGroup ? (await sock.groupMetadata(m.chat).catch(() => null) || store?.chats?.get(m.chat)?.groupMetadata) : null;
        const participants = groupMetadata?.participants || [];
        const groupAdmins = participants
            .filter(participant => participant.admin === 'admin' || participant.admin === 'superadmin' || participant.admin)
            .map(participant => sock.decodeJid(participant.id));

        const isGroupAdmins = isGroup && groupAdmins.includes(sender);
        const isBotGroupAdmins = isGroup && groupAdmins.includes(botNumber);

        const thumb = await sharp('./lib/media/thumb.jpg')
            .resize(300, 300)
            .jpeg({ quality: 80 })
            .toBuffer();

        if (!sock.public && !isCreator) return;

        await dispatch({
            sock, m, store, body, budy: m.text || body, bodyTrim, command, args, q,
            prefix, hasPrefix, from, isGroup, botNumber, sender, isPremium, isCreator,
            pushname, quoted, mime, groupMetadata, groupAdmins, isGroupAdmins,
            isBotGroupAdmins, thumb,
            date: tanggal(Date.now()), runtime, reply
        });
    } catch (error) {
        console.log(require('util').format(error));
    }
};

let file = require.resolve(__filename);
fs.watchFile(file, () => {
    fs.unwatchFile(file);
    delete require.cache[file];
    require(file);
});
