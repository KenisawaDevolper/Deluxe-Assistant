const { reloadAllPlugins, listPlugins } = require('../plugin-loader');

module.exports = {
    commands: ['plugins', 'reloadplugins', 'reload'],
    async handler({ command, isCreator, reply }) {
        if (!isCreator) return reply('*Solo el propietario puede usar este comando.*');
        if (command === 'plugins') {
            return reply(`📦 Plugins activos (${listPlugins().length}):\n- ${listPlugins().join('\n- ')}`);
        }
        reloadAllPlugins();
        return reply('✅ Plugins recargados correctamente sin reiniciar el bot.');
    }
};
