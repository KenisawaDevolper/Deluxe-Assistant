const { prepareWAMessageMedia, generateWAMessageFromContent } = require('lilys-baileys');
const { commandHelp } = require('../command-help');

function getMainRows() {
    const seen = new Set();
    const rows = [];
    for (const cmd of commandHelp) {
        const cat = cmd.category;
        if (!seen.has(cat) && cat !== 'General') {
            seen.add(cat);
            rows.push([cat.toLowerCase(), `📂 ${cat}`, `Comandos de ${cat}`]);
        }
    }
    return rows;
}

const categories = {
    main: {
        title: 'Menú principal',
        description: 'Selecciona una categoría',
        rows: [] // populated dynamically
    },
    info: {
        title: 'Información',
        description: 'Sobre el bot',
        rows: [
            ['script', '📦 Base del bot', 'Ver información del script'],
            ['menu', '↩️ Volver', 'Menú principal']
        ]
    }
};

function getCategory(value) {
    const key = (value || 'main').toLowerCase();
    if (key === 'main') {
        return { ...categories.main, rows: getMainRows() };
    }
    if (key === 'info') return categories.info;
    const items = commandHelp.filter(c => c.category.toLowerCase() === key);
    if (items.length) {
        return {
            title: key.charAt(0).toUpperCase() + key.slice(1),
            description: `${key} commands`,
            rows: items.map(item => [item.commands[0], `/${item.commands[0]}`, item.usage || item.description])
        };
    }
    return { ...categories.main, rows: getMainRows() };
}

module.exports = {
    commands: ['menu'],
    async handler({ sock, m, args, pushname, isCreator, isPremium, runtime, thumb }) {
        const requested = args[0] || 'main';
        const category = getCategory(requested);
        const rows = category.rows.map(([id, title, description]) => {
            const isCategory = ['download', 'group', 'tools', 'owner', 'info'].includes(id);
            const command = id === 'menu'
                ? '/menu'
                : category === categories.main || isCategory
                    ? `/menu ${id}`
                    : `/${id}`;
            return { header: '', title, description, id: command };
        });
        const media = await prepareWAMessageMedia({ image: thumb, mimetype: 'image/jpeg' }, { upload: sock.waUploadToServer });
        const header = requested === 'main'
            ? `Hola ${pushname}, bienvenido a *Deluxe Assistant*.`
            : `*${category.title}*`;
        const body = `${header}\n\nSelecciona una opción para continuar.\n\n👤 ${isCreator ? 'Propietario' : isPremium ? 'Premium' : 'Usuario'}\n⏱️ ${runtime(process.uptime())}`;
        const footer = `Deluxe Assistant · ${category.description}`;
        const message = generateWAMessageFromContent(m.chat, {
            viewOnceMessage: { message: {
                messageContextInfo: { deviceListMetadata: {}, deviceListMetadataVersion: 2 },
                interactiveMessage: {
                    body: { text: body },
                    footer: { text: footer },
                    header: { hasMediaAttachment: true, imageMessage: media.imageMessage },
                    nativeFlowMessage: {
                        buttons: [{
                            name: 'single_select',
                            buttonParamsJson: JSON.stringify({
                                title: category.title,
                                sections: [{ title: category.description, rows }]
                            })
                        }],
                        messageParamsJson: '{}'
                    }
                }
            }}
        }, { userJid: m.chat, upload: sock.waUploadToServer });
        return sock.relayMessage(m.chat, message.message, { messageId: message.key.id });
    }
};
