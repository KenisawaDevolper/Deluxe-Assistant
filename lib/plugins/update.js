const { execFile, spawn } = require('child_process');

const repository = process.env.GITHUB_REPO || 'https://github.com/KenisawaDevolper/Deluxe-Assistant.git';
const branch = process.env.GITHUB_BRANCH || 'master';

function git(args) {
    return new Promise((resolve, reject) => {
        execFile('git', args, { cwd: process.cwd(), timeout: 120000 }, (error, stdout, stderr) => {
            if (error) return reject(new Error(stderr.trim() || error.message));
            resolve(stdout.trim());
        });
    });
}

async function versions() {
    const local = await git(['rev-parse', 'HEAD']);
    const remote = await git(['ls-remote', repository, `refs/heads/${branch}`]);
    const remoteHash = remote.split(/\s+/)[0];
    return { local, remote: remoteHash };
}

function changedFiles(status) {
    return status.split('\n')
        .filter(Boolean)
        .map(line => line.slice(3).trim());
}

function isRuntimeFile(file) {
    return file.startsWith('lib/database/') || file.startsWith('cookies/') || file.endsWith('.json') || file.endsWith('.log');
}

function restartBot() {
    const child = spawn(process.argv[0], process.argv.slice(1), {
        cwd: process.cwd(),
        env: process.env,
        detached: true,
        stdio: 'inherit'
    });
    child.unref();
    setTimeout(() => process.exit(0), 2500);
}

module.exports = {
    commands: ['checkupdate', 'update'],
    async handler({ command, args, isCreator, reply }) {
        if (!isCreator) return reply('*Solo el propietario puede usar este comando.*');

        try {
            if (command === 'checkupdate') {
                const { local, remote } = await versions();
                if (local === remote) return reply('✅ El bot ya está actualizado a la última versión.');
                return reply(`🆕 *Actualización Disponible*\n\nVersión Actual: ${local.slice(0, 7)}\nNueva Versión: ${remote.slice(0, 7)}\n\nEscribe *.update* para instalarla.`);
            }

            const forceUpdate = (args[0] || '').toLowerCase() === 'force' || (args[0] || '').toLowerCase() === 'reset';

            const status = await git(['status', '--porcelain', '--untracked-files=no']);
            const files = changedFiles(status);
            const codeChanges = files.filter(file => !isRuntimeFile(file));

            if (codeChanges.length && !forceUpdate) {
                return reply(`❌ *Archivos modificados detectados:*\n${codeChanges.map(f => `• ${f}`).join('\n')}\n\nSi deseas forzar la actualización y reemplazar estos cambios con la versión limpia de GitHub, usa:\n*.update force*`);
            }

            let stashedRuntimeData = false;
            try {
                const runtimeFiles = files.filter(file => isRuntimeFile(file));
                if (runtimeFiles.length > 0) {
                    await git(['stash', 'push', '--quiet', '--', ...runtimeFiles]);
                    stashedRuntimeData = true;
                }

                await git(['fetch', '--quiet', repository, branch]);
                const remote = await git(['rev-parse', 'FETCH_HEAD']);

                if (forceUpdate) {
                    await git(['reset', '--hard', 'FETCH_HEAD']);
                } else {
                    await git(['merge', '--ff-only', 'FETCH_HEAD']);
                }

                if (stashedRuntimeData) {
                    try { await git(['stash', 'pop', '--index']); } catch {}
                }

                await reply(`✅ *Actualización exitosa (${remote.slice(0, 7)}).* \n🔄 Reiniciando el bot...`);
                restartBot();
            } catch (error) {
                if (stashedRuntimeData) {
                    try { await git(['stash', 'pop', '--index']); } catch {}
                }
                throw error;
            }
        } catch (error) {
            return reply(`❌ No se pudo comprobar o instalar la actualización:\n${error.message}`);
        }
    }
};
