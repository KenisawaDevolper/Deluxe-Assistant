const { prepareWAMessageMedia, generateWAMessageFromContent } = require('lilys-baileys');

module.exports = {
    commands: ['sc', 'script', 'getsc'],
    async handler({ sock, m, pushname, thumb, from, reply }) {
        const body = `> *Hola ${pushname}, ¿quieres obtener esta base?*`;
        const footer = `Si quieres obtener esta base, pulsa el botón de abajo.

\`Reglas\`
- Está prohibido eliminar los créditos; como mínimo, inclúyelos en los agradecimientos.
- Está prohibido vender esta base porque es completamente gratuita.
- Puedes venderla si le agregas nuevas funciones.
- Está prohibido reclamar la autoría total del script.`;

        try {
            const media = await prepareWAMessageMedia(
                { image: thumb, mimetype: 'image/jpeg' },
                { upload: sock.waUploadToServer }
            );
            const interactiveMsg = {
                body: { text: body },
                footer: { text: footer },
                header: { hasMediaAttachment: true, imageMessage: media.imageMessage },
                nativeFlowMessage: {
                    buttons: [{
                        name: 'cta_url',
                        buttonParamsJson: JSON.stringify({
                            display_text: 'Obtener base',
                            url: 'https://github.com/FallEzz',
                            merchant_url: 'fallxdstore.zone.id'
                        })
                    }],
                    messageParamsJson: '{}'
                }
            };
            const generated = generateWAMessageFromContent(from, {
                viewOnceMessage: { message: {
                    messageContextInfo: { deviceListMetadata: {}, deviceListMetadataVersion: 2 },
                    interactiveMessage: interactiveMsg
                }}
            }, { userJid: from, upload: sock.waUploadToServer });
            return sock.relayMessage(from, generated.message, { messageId: generated.key.id });
        } catch (error) {
            return reply(`❌ No se pudo enviar el mensaje: ${error.message}`);
        }
    }
};
