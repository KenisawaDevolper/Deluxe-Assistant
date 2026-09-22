module.exports = {
    commands: ['public', 'self'],
    async handler({ command, isCreator, sock, reply }) {
        if (!isCreator) return reply('*Solo el propietario puede usar este comando.*');
        const publicMode = command === 'public';
        if (sock.public === publicMode) {
            return reply(`El bot ya está en modo ${publicMode ? 'público' : 'privado'}.`);
        }
        sock.public = publicMode;
        return reply(`✅ Modo ${publicMode ? 'público' : 'privado'} activado.`);
    }
};
