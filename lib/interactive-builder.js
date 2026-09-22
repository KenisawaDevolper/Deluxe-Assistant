const { prepareWAMessageMedia, generateWAMessageFromContent } = require('lilys-baileys');
const crypto = require('crypto');

/**
 * Helper para construir y enviar mensajes interactivos y dinámicos en Baileys.
 */

/**
 * Envía un mensaje interactivo con botones (Quick Reply, CTA URL, CTA Call, CTA Copy, Single Select List)
 */
async function sendInteractiveButtons(sock, jid, {
    headerTitle = '',
    body = '',
    footer = '',
    image = null,
    video = null,
    document = null,
    fileName = '',
    mimetype = '',
    buttons = [],
    quoted = null
}) {
    let media = null;
    if (image) {
        const payload = typeof image === 'string' ? { image: { url: image } } : { image };
        media = await prepareWAMessageMedia(payload, { upload: sock.waUploadToServer });
    } else if (video) {
        const payload = typeof video === 'string' ? { video: { url: video } } : { video };
        media = await prepareWAMessageMedia(payload, { upload: sock.waUploadToServer });
    } else if (document) {
        const payload = typeof document === 'string' ? { document: { url: document }, mimetype, fileName } : { document, mimetype, fileName };
        media = await prepareWAMessageMedia(payload, { upload: sock.waUploadToServer });
    }

    const formattedButtons = buttons.map(btn => {
        if (btn.type === 'url' || btn.url) {
            return {
                name: 'cta_url',
                buttonParamsJson: JSON.stringify({
                    display_text: btn.text || btn.display_text,
                    url: btn.url
                })
            };
        }
        if (btn.type === 'call' || btn.phone) {
            return {
                name: 'cta_call',
                buttonParamsJson: JSON.stringify({
                    display_text: btn.text || btn.display_text,
                    phone_number: btn.phone
                })
            };
        }
        if (btn.type === 'copy' || btn.copy) {
            return {
                name: 'cta_copy',
                buttonParamsJson: JSON.stringify({
                    display_text: btn.text || btn.display_text,
                    id: btn.id || 'copy',
                    copy_code: btn.copy
                })
            };
        }
        if (btn.type === 'select' || btn.sections) {
            return {
                name: 'single_select',
                buttonParamsJson: JSON.stringify({
                    title: btn.title || 'Opciones',
                    sections: btn.sections
                })
            };
        }
        // Quick reply por defecto
        return {
            name: 'quick_reply',
            buttonParamsJson: JSON.stringify({
                display_text: btn.text || btn.display_text,
                id: btn.id || btn.command
            })
        };
    });

    const header = media ? {
        hasMediaAttachment: true,
        ...media
    } : {
        title: headerTitle,
        hasMediaAttachment: false
    };

    const msg = generateWAMessageFromContent(jid, {
        viewOnceMessage: {
            message: {
                messageContextInfo: { deviceListMetadata: {}, deviceListMetadataVersion: 2 },
                interactiveMessage: {
                    header,
                    body: { text: body },
                    footer: { text: footer },
                    nativeFlowMessage: {
                        buttons: formattedButtons,
                        messageParamsJson: '{}'
                    }
                }
            }
        }
    }, { userJid: jid, quoted, upload: sock.waUploadToServer });

    return await sock.relayMessage(jid, msg.message, { messageId: msg.key.id });
}

/**
 * Envía un menú de tarjetas deslizables (Carousel Cards)
 */
async function sendCarouselCards(sock, jid, { body = '', footer = '', cards = [], quoted = null }) {
    const formattedCards = [];

    for (const card of cards) {
        let cardMedia = null;
        if (card.image) {
            const payload = typeof card.image === 'string' ? { image: { url: card.image } } : { image: card.image };
            cardMedia = await prepareWAMessageMedia(payload, { upload: sock.waUploadToServer });
        } else if (card.video) {
            const payload = typeof card.video === 'string' ? { video: { url: card.video } } : { video: card.video };
            cardMedia = await prepareWAMessageMedia(payload, { upload: sock.waUploadToServer });
        }

        const cardButtons = (card.buttons || []).map(btn => {
            if (btn.url) {
                return { name: 'cta_url', buttonParamsJson: JSON.stringify({ display_text: btn.text, url: btn.url }) };
            }
            if (btn.copy) {
                return { name: 'cta_copy', buttonParamsJson: JSON.stringify({ display_text: btn.text, id: btn.id || 'copy', copy_code: btn.copy }) };
            }
            return { name: 'quick_reply', buttonParamsJson: JSON.stringify({ display_text: btn.text, id: btn.id || btn.command }) };
        });

        formattedCards.push({
            header: {
                hasMediaAttachment: !!cardMedia,
                ...(cardMedia || {})
            },
            body: { text: card.body || card.title || '' },
            footer: { text: card.footer || '' },
            nativeFlowMessage: {
                buttons: cardButtons
            }
        });
    }

    const msg = generateWAMessageFromContent(jid, {
        viewOnceMessage: {
            message: {
                interactiveMessage: {
                    body: { text: body },
                    footer: { text: footer },
                    carouselMessage: {
                        cards: formattedCards
                    }
                }
            }
        }
    }, { userJid: jid, quoted, upload: sock.waUploadToServer });

    return await sock.relayMessage(jid, msg.message, { messageId: msg.key.id });
}

/**
 * Envía un mensaje de evento / reunión con fecha, hora y enlace
 */
async function sendEventMessage(sock, jid, { name, description = '', locationName = 'WhatsApp', joinLink = '', startTime = Date.now(), endTime = Date.now() + 3600000, quoted = null }) {
    const msg = generateWAMessageFromContent(jid, {
        viewOnceMessage: {
            message: {
                messageContextInfo: {
                    deviceListMetadata: {},
                    deviceListMetadataVersion: 2,
                    messageSecret: crypto.randomBytes(32)
                },
                eventMessage: {
                    name,
                    description,
                    location: { name: locationName, degreesLatitude: 0, degreesLongitude: 0 },
                    joinLink,
                    startTime: typeof startTime === 'number' ? startTime : Date.now(),
                    endTime: typeof endTime === 'number' ? endTime : Date.now() + 3600000,
                    extraGuestsAllowed: true
                }
            }
        }
    }, { quoted });

    return await sock.relayMessage(jid, msg.message, { messageId: msg.key.id });
}

module.exports = {
    sendInteractiveButtons,
    sendCarouselCards,
    sendEventMessage
};
