const { recentLogs } = require('../logger');

module.exports = {
    commands: ['logs', 'log'],
    async handler({ args, isCreator, reply }) {
        if (!isCreator) return reply('*Solo el propietario puede usar este comando.*');
        const requested = Number(args[0]);
        const limit = Number.isInteger(requested) && requested > 0
            ? Math.min(requested, 50)
            : 20;
        const logs = recentLogs(limit);
        return reply(`📋 *Últimos ${limit} registros*\n\n${logs || 'No hay registros todavía.'}`);
    }
};
