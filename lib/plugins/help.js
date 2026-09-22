const { commandHelp, findCommand } = require('../command-help');

function generalHelp() {
    const categories = [...new Set(commandHelp.map(item => item.category))];
    const sections = categories.map(category => {
        const items = commandHelp
            .filter(item => item.category === category)
            .map(item => `│ ${item.commands[0]}: ${item.description}`)
            .join('\n');
        return `╭─「 ${category.toUpperCase()} 」\n${items}\n╰─────────────`;
    }).join('\n\n');

    return `📖 *Ayuda de Deluxe Assistant*

Usa .help comando para ver la descripción, permisos y ejemplos de un comando.

${sections}

Ejemplo: .help addowner`;
}

function detailedHelp(command) {
    const item = findCommand(command);
    if (!item) {
        return `❌ No encontré ayuda para *${command}*.\nUsa .help para ver los comandos disponibles.`;
    }

    const examples = item.examples.map(example => `• ${example}`).join('\n');
    const aliases = item.commands.map(alias => `.${alias}`).join(', ');
    return `📘 *Ayuda: .${item.commands[0]}*

*Descripción:* ${item.description}
*Uso:* ${item.usage}
*Permisos:* ${item.access}

*Ejemplos:*
${examples}

*Alias:* ${aliases}`;
}

module.exports = {
    commands: ['help', 'ayuda'],
    async handler({ args, reply }) {
        return reply(args.length ? detailedHelp(args[0]) : generalHelp());
    }
};
