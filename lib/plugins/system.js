const util = require('util');
const { exec } = require('child_process');

module.exports = {
    commands: ['eval', 'exec'],
    async handler({ command, q, isCreator, reply }) {
        if (!isCreator) return reply('*Solo el propietario puede usar este comando.*');
        if (!q) return reply(`Uso: .${command} ${command === 'eval' ? 'código' : 'comando'}`);

        if (command === 'eval') {
            try {
                let result = await eval(q);
                if (typeof result !== 'string') result = util.inspect(result);
                return reply(result);
            } catch (error) {
                return reply(String(error));
            }
        }

        return exec(q, (error, stdout, stderr) => {
            if (error) return reply(stderr || error.message);
            return reply(stdout || '✅ Comando ejecutado sin salida.');
        });
    },
    async onMessage({ body, budy, hasPrefix, pushname, q, isCreator, reply }) {
        if (!hasPrefix && (budy.startsWith('=>') || budy.startsWith('$'))) {
            if (!isCreator) return reply('*Solo el propietario puede usar este comando.*');
            if (budy.startsWith('=>')) {
                try {
                    let result = await eval(budy.slice(2));
                    if (typeof result !== 'string') result = util.inspect(result);
                    return reply(result);
                } catch (error) {
                    return reply(String(error));
                }
            }
            exec(q, (error, stdout) => {
                if (error) return reply(error);
                if (stdout) return reply(stdout);
            });
            return true;
        }
        if (hasPrefix) return false;
        const lowerBody = (body || '').toLowerCase();
        if (!['bail', 'baileys', 'npm', 'bails'].some(word => lowerBody.includes(word))) return false;
        return reply(`¡Hola ${pushname}! 👋
Si estás creando un bot de WhatsApp, prueba lilys-baileys, una biblioteca completa y lista para usar.

📦 Instalación:
\`npm install lilys-baileys@latest\`

🔗 https://www.npmjs.com/package/lilys-baileys`);
    }
};
