const { execFile, spawn } = require('child_process');

const repository = process.env.GITHUB_REPO || 'https://github.com/KenisawaDevolper/Deluxe-Assistant.git';
const branch = process.env.GITHUB_BRANCH || 'main';

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
    async handler({ command, isCreator, reply }) {
        if (!isCreator) return reply('*Solo el propietario puede usar este comando.*');

        try {
            if (command === 'checkupdate') {
                const { local, remote } = await versions();
                if (local === remote) return reply('✅ El bot ya está actualizado.');
                return reply(`🆕 Hay una actualización disponible.\n\nActual: ${local.slice(0, 7)}\nNueva: ${remote.slice(0, 7)}\n\nUsa .update para instalarla.`);
            }

            const status = await git(['status', '--porcelain', '--untracked-files=no']);
            const files = changedFiles(status);
            const runtimeData = 'lib/database/groups.json';
            const codeChanges = files.filter(file => file !== runtimeData);
            if (codeChanges.length) {
                return reply('❌ No se puede actualizar porque hay cambios locales en el código. Guárdalos o haz una copia antes de continuar.');
            }

            let stashedRuntimeData = false;
            try {
                if (files.includes(runtimeData)) {
                    await git(['stash', 'push', '--quiet', '--', runtimeData]);
                    stashedRuntimeData = true;
                }

                const before = await git(['rev-parse', 'HEAD']);
                await git(['fetch', '--quiet', repository, branch]);
                const remote = await git(['rev-parse', 'FETCH_HEAD']);
                if (before === remote) {
                    if (stashedRuntimeData) await git(['stash', 'pop', '--index']);
                    return reply('✅ El bot ya está actualizado.');
                }

                await git(['merge', '--ff-only', 'FETCH_HEAD']);
                if (stashedRuntimeData) await git(['stash', 'pop', '--index']);
                await reply(`✅ Actualización instalada (${remote.slice(0, 7)}).\n🔄 Reiniciando el bot...`);
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
