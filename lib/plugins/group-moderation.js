const {
    loadGroups,
    saveGroups,
    getGroupConfig,
    displayNumber
} = require('../group-config');

const linkPattern = /(?:https?:\/\/|www\.)\S+|chat\.whatsapp\.com\/\S+/i;

function mention(jid) {
    return `@${displayNumber(jid)}`;
}

module.exports = {
    commands: [],
    async handler() {},

    async onMessage(context) {
        if (!context.isGroup || !linkPattern.test(context.body)) return false;
        if (context.isGroupAdmins || context.isCreator) return false;

        const groups = loadGroups();
        const config = getGroupConfig(context.m.chat, groups);
        if (!config.antilink.enabled) return false;
        if (!context.isBotGroupAdmins) {
            await context.reply('⚠️ Detecté un enlace, pero necesito ser administrador para eliminarlo.');
            return true;
        }

        try {
            await context.sock.sendMessage(context.m.chat, { delete: context.m.key });
        } catch (error) {
            console.log('[antilink]', error.message);
        }

        const target = context.m.sender;
        config.warnings[target] = (config.warnings[target] || 0) + 1;
        const count = config.warnings[target];
        if (count >= 3) {
            await context.sock.groupParticipantsUpdate(context.m.chat, [target], 'remove');
            delete config.warnings[target];
            saveGroups(groups);
            await context.reply(`🚫 ${mention(target)} alcanzó 3 advertencias por enlaces y fue expulsado.`);
        } else {
            saveGroups(groups);
            await context.reply(`🚫 Enlace eliminado. ${mention(target)} recibe una advertencia (*${count}/3*).`);
        }
        return true;
    },

    async onEvent({ sock, update }) {
        if (update.action !== 'add') return;
        const groups = loadGroups();
        const config = getGroupConfig(update.id, groups);
        if (!config.welcome?.enabled) return;
        const metadata = await sock.groupMetadata(update.id).catch(() => null);
        const count = metadata?.participants?.length || 0;
        for (const participant of update.participants) {
            const userTag = mention(participant);
            const userNumber = displayNumber(participant);
            const text = config.welcome.text
                .replaceAll('{user}', userTag)
                .replaceAll('@user', userTag)
                .replaceAll('{name}', userTag)
                .replaceAll('@name', userTag)
                .replaceAll('{number}', userNumber)
                .replaceAll('@number', userNumber)
                .replaceAll('{group}', metadata?.subject || 'este grupo')
                .replaceAll('{count}', String(count));

            await sock.sendMessage(update.id, {
                text,
                mentions: [participant]
            });
        }
    }
};
