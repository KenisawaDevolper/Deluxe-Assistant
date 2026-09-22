const fs = require('fs');

function numberJid(text) {
    return text.replace(/[^0-9]/g, '') + '@s.whatsapp.net';
}

module.exports = {
    commands: ['addowner', 'addown', 'delowner', 'delown', 'addprem', 'delprem'],
    async handler({ command, args, q, prefix, isCreator, m, sock, reply }) {
        if (!isCreator) return reply('*Solo el propietario puede usar este comando.*');

        const isOwnerCommand = command === 'addowner' || command === 'addown' || command === 'delowner' || command === 'delown';
        const isAdd = command === 'addowner' || command === 'addown' || command === 'addprem';
        const file = isOwnerCommand ? './lib/database/owner.json' : './lib/database/premium.json';
        const label = isOwnerCommand ? 'propietario' : 'usuario premium';
        const example = `${prefix}${command} 628xxx`;

        if (!args[0]) return reply(`*Ejemplo: ${example}*`);

        const list = JSON.parse(fs.readFileSync(file));
        const target = numberJid(q);

        if (isAdd) {
            const registered = await sock.onWhatsApp(target);
            if (!registered.length) return reply('*Introduce un número válido registrado en WhatsApp.*');
            if (list.includes(target)) return reply(`*${target} ya es ${label}.*`);
            list.push(target);
            fs.writeFileSync(file, JSON.stringify(list, null, 2));
            return reply(`*✅ ${target} ahora es ${label}.*`);
        }

        const index = list.indexOf(target);
        if (index === -1) return reply(`*${target} no es ${label}.*`);
        list.splice(index, 1);
        fs.writeFileSync(file, JSON.stringify(list, null, 2));
        return reply(`*✅ ${target} ya no es ${label}.*`);
    }
};
