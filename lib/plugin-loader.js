const fs = require('fs');
const path = require('path');

const pluginsPath = path.join(__dirname, 'plugins');
const plugins = new Map();
let watcherStarted = false;
let reloadTimer;

function pluginFiles() {
    return fs.readdirSync(pluginsPath)
        .filter(file => file.endsWith('.js'))
        .map(file => path.join(pluginsPath, file));
}

function removePlugin(file) {
    for (const [command, plugin] of plugins) {
        if (plugin.file === file) plugins.delete(command);
    }
}

function loadPlugin(file) {
    const previous = [...plugins.entries()].filter(([, plugin]) => plugin.file === file);

    try {
        if (!fs.existsSync(file)) {
            removePlugin(file);
            return;
        }
        delete require.cache[require.resolve(file)];
        const plugin = require(file);
        if (!Array.isArray(plugin.commands) || typeof plugin.handler !== 'function') {
            throw new Error('debe exportar commands y handler');
        }

        removePlugin(file);
        if (plugin.commands.length === 0) {
            plugins.set(`__hook__${file}`, { ...plugin, file });
        } else {
            for (const command of plugin.commands) {
                plugins.set(command.toLowerCase(), { ...plugin, file });
            }
        }
        console.log(`[plugins] Cargado: ${path.basename(file)}`);
    } catch (error) {
        for (const [command, plugin] of previous) plugins.set(command, plugin);
        console.error(`[plugins] Error en ${path.basename(file)}: ${error.message}`);
    }
}

function loadAllPlugins() {
    for (const file of pluginFiles()) loadPlugin(file);
}

function reloadAllPlugins() {
    for (const [command, plugin] of plugins) {
        if (!fs.existsSync(plugin.file)) plugins.delete(command);
    }
    loadAllPlugins();
}

function listPlugins() {
    return [...new Set([...plugins.values()].map(plugin => path.basename(plugin.file, '.js')))];
}

function reloadFile(file) {
    if (!file.endsWith('.js')) return;
    clearTimeout(reloadTimer);
    reloadTimer = setTimeout(() => loadPlugin(file), 100);
}

function startPluginWatcher() {
    if (watcherStarted) return;
    watcherStarted = true;
    loadAllPlugins();
    fs.watch(pluginsPath, (_event, filename) => {
        if (filename) reloadFile(path.join(pluginsPath, filename.toString()));
    });
    console.log('[plugins] Recarga automática activada.');
}

async function dispatch(context) {
    startPluginWatcher();

    for (const plugin of new Set(plugins.values())) {
        if (typeof plugin.onMessage === 'function') {
            const handled = await plugin.onMessage(context);
            if (handled) return true;
        }
    }

    const plugin = plugins.get(context.command);
    if (!plugin) return false;
    await plugin.handler(context);
    return true;
}

async function dispatchEvent(context) {
    startPluginWatcher();
    for (const plugin of new Set(plugins.values())) {
        if (typeof plugin.onEvent === 'function') await plugin.onEvent(context);
    }
}

module.exports = { dispatch, dispatchEvent, startPluginWatcher, reloadAllPlugins, listPlugins };
