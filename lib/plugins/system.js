const util = require('util');
const { exec } = require('child_process');

module.exports = {
    commands: ['eval', 'exec'],
    async handler(context) {
        const { sock, m, store, command, q, isCreator, reply, quoted, args, prefix, from, isGroup, groupMetadata, pushname } = context;
        if (!isCreator) return reply('*Solo el propietario puede usar este comando.*');
        if (!q) return reply(`Uso: .${command} ${command === 'eval' ? 'código' : 'comando'}`);

        if (command === 'eval') {
            try {
                let evaled;
                if (q.includes('await') || q.includes('return')) {
                    evaled = await eval(`(async () => { ${q} })()`);
                } else {
                    evaled = await eval(q);
                }
                if (typeof evaled !== 'string') evaled = util.inspect(evaled);
                return reply(evaled);
            } catch (error) {
                return reply(String(error));
            }
        }

        return exec(q, (error, stdout, stderr) => {
            if (error) return reply(stderr || error.message);
            return reply(stdout || '✅ Comando ejecutado sin salida.');
        });
    },
    async onMessage(context) {
        const { sock, m, store, body, budy, hasPrefix, pushname, q, isCreator, reply, quoted, args, prefix, from, isGroup, groupMetadata } = context;

        if (!hasPrefix && (budy.startsWith('=>') || budy.startsWith('>') || budy.startsWith('$'))) {
            if (!isCreator) return reply('*Solo el propietario puede usar este comando.*');

            if (budy.startsWith('=>') || budy.startsWith('>')) {
                const code = budy.startsWith('=>') ? budy.slice(2).trim() : budy.slice(1).trim();
                try {
                    let evaled;
                    if (code.includes('await') || code.includes('return')) {
                        evaled = await eval(`(async () => { ${code} })()`);
                    } else {
                        evaled = await eval(code);
                    }
                    if (typeof evaled !== 'string') evaled = util.inspect(evaled);
                    return reply(evaled);
                } catch (error) {
                    return reply(String(error));
                }
            }
            if (budy.startsWith('$')) {
                const cmd = budy.slice(1).trim();
                exec(cmd, (error, stdout, stderr) => {
                    if (error) return reply(stderr || error.message);
                    if (stdout) return reply(stdout);
                });
                return true;
            }
        }

        return false;
    }
};
