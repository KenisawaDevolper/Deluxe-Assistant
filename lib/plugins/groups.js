const {
    loadGroups,
    saveGroups,
    getGroupConfig,
    getTargetJid,
    displayNumber
} = require('../group-config');

function requireGroup(context) {
    if (!context.isGroup) {
        context.reply('❌ Este comando solo funciona dentro de un grupo.');
        return false;
    }
    if (!context.isGroupAdmins && !context.isCreator) {
        context.reply('❌ Solo los administradores pueden usar este comando.');
        return false;
    }
    return true;
}

function requireBotAdmin(context) {
    if (!context.isBotGroupAdmins) {
        context.reply('❌ Necesito ser administrador para ejecutar esa acción.');
        return false;
    }
    return true;
}

function mention(jid) {
    return `@${displayNumber(jid)}`;
}

module.exports = {
    commands: [
        'kick', 'ban', 'remove', 'promote', 'demote', 'add', 'tagall',
        'hidetag', 'groupinfo', 'setwelcome', 'welcome', 'antilink',
        'warn', 'warnings', 'delwarn', 'clearwarn'
    ],
    async handler(context) {
        const { command, args, q, m, sock, reply } = context;
        if (!requireGroup(context)) return;

        const groups = loadGroups();
        const config = getGroupConfig(m.chat, groups);

        if (['setwelcome', 'welcome'].includes(command)) {
            if (command === 'welcome' && ['on', 'off'].includes((args[0] || '').toLowerCase())) {
                config.welcome.enabled = args[0].toLowerCase() === 'on';
            } else if (q) {
                config.welcome.enabled = true;
                config.welcome.text = q;
            } else {
                return reply(`Uso: .setwelcome mensaje\n\nVariables: {user}, {group}, {count}\nEstado: ${config.welcome.enabled ? 'activado' : 'desactivado'}\nMensaje: ${config.welcome.text}`);
            }
            saveGroups(groups);
            return reply(`✅ Bienvenida ${config.welcome.enabled ? 'activada' : 'desactivada'}.`);
        }

        if (command === 'antilink') {
            const value = (args[0] || '').toLowerCase();
            if (!['on', 'off'].includes(value)) return reply(`Uso: .antilink on|off\nEstado: ${config.antilink.enabled ? 'activado' : 'desactivado'}`);
            config.antilink.enabled = value === 'on';
            saveGroups(groups);
            return reply(`✅ Antilink ${config.antilink.enabled ? 'activado' : 'desactivado'}.`);
        }

        if (['warn', 'warnings', 'delwarn', 'clearwarn'].includes(command)) {
            const target = getTargetJid(m, args);
            if (!target) return reply(`Menciona a un usuario o responde a su mensaje.\nEjemplo: .warn @${context.botNumber.split('@')[0]}`);
            config.warnings[target] ||= 0;

            if (command === 'warnings') {
                return reply(`${mention(target)} tiene *${config.warnings[target]}/3* advertencias.`);
            }
            if (command === 'clearwarn' || command === 'delwarn') {
                delete config.warnings[target];
                saveGroups(groups);
                return reply(`✅ Se eliminaron las advertencias de ${mention(target)}.`);
            }

            config.warnings[target] += 1;
            const count = config.warnings[target];
            saveGroups(groups);
            if (count >= 3 && requireBotAdmin(context)) {
                await sock.groupParticipantsUpdate(m.chat, [target], 'remove');
                delete config.warnings[target];
                saveGroups(groups);
                return reply(`🚫 ${mention(target)} alcanzó 3 advertencias y fue expulsado.`);
            }
            return reply(`⚠️ ${mention(target)} recibió una advertencia (*${count}/3*).`);
        }

        if (['kick', 'ban', 'remove'].includes(command)) {
            const target = getTargetJid(m, args);
            if (!target) return reply('Menciona al usuario que quieres expulsar o responde a su mensaje.');
            if (!requireBotAdmin(context)) return;
            await sock.groupParticipantsUpdate(m.chat, [target], 'remove');
            return reply(`✅ ${mention(target)} fue expulsado del grupo.`);
        }

        if (['promote', 'demote'].includes(command)) {
            const target = getTargetJid(m, args);
            if (!target) return reply('Menciona al usuario o responde a su mensaje.');
            if (!requireBotAdmin(context)) return;
            await sock.groupParticipantsUpdate(m.chat, [target], command);
            return reply(`✅ ${mention(target)} fue ${command === 'promote' ? 'promovido a administrador' : 'retirado de la administración'}.`);
        }

        if (command === 'add') {
            const target = getTargetJid(m, args);
            if (!target) return reply('Indica el número que quieres agregar.');
            if (!requireBotAdmin(context)) return;
            await sock.groupParticipantsUpdate(m.chat, [target], 'add');
            return reply(`✅ Se intentó agregar a ${mention(target)}.`);
        }

        if (['tagall', 'hidetag'].includes(command)) {
            const members = context.groupMetadata.participants.map(participant => participant.id);
            const text = q || 'Atención a todos los miembros del grupo.';
            return sock.sendMessage(m.chat, { text, mentions: members }, { quoted: m });
        }

        if (command === 'groupinfo') {
            const members = context.groupMetadata.participants.length;
            const admins = context.groupAdmins.length;
            const warningCount = Object.values(config.warnings).reduce((total, value) => total + value, 0);
            const welcomeState = config.welcome.enabled ? '✅ Activada' : '❌ Desactivada';
            const antilinkState = config.antilink.enabled ? '✅ Activado' : '❌ Desactivado';
            return reply(`👥 *Información del grupo*

*Nombre:* ${context.groupMetadata.subject}
*JID:* ${m.chat}
*Miembros:* ${members}
*Administradores:* ${admins}

*Funciones*
• Bienvenida: ${welcomeState}
• Antilink: ${antilinkState}
• Advertencias activas: ${warningCount}

*Mensaje de bienvenida configurado:*
${config.welcome.text}`);
        }
    }
};
