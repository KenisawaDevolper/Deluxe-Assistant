require('./configure/settings');
const {
    default: makeWASocket,
    prepareWAMessageMedia,
    useMultiFileAuthState,
    DisconnectReason,
    fetchLatestBaileysVersion,
    makeInMemoryStore,
    jidDecode,
    makeCacheableSignalKeyStore
} = require("lilys-baileys");
const pino = require('pino');
const readline = require("readline");
const fs = require('fs');
const chalk = require("chalk");
const { smsg } = require('./lib/myfunc');
const { loadModule } = require('./lib/functions');
const { dispatchEvent } = require('./lib/plugin-loader');
const { logMessage, logEvent } = require('./lib/logger');

const usePairingCode = true;
const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const question = (text) => new Promise(resolve => rl.question(text, resolve));
const store = makeInMemoryStore({ logger: pino({ level: 'silent' }) });

async function connectToWhatsApp() {
    const { state, saveCreds } = await useMultiFileAuthState("./session");
    const { version } = await fetchLatestBaileysVersion();

    const sock = makeWASocket({
        version,
        printQRInTerminal: !usePairingCode,
        browser: ["Ubuntu", "Chrome", "20.0.04"],
        logger: pino({ level: 'silent' }),
        auth: {
            creds: state.creds,
            keys: makeCacheableSignalKeyStore(state.keys, pino({ level: 'silent' }))
        }
    });

    sock.decodeJid = (jid) => {
        if (!jid) return jid;
        if (/:\d+@/gi.test(jid)) {
            const decode = jidDecode(jid) || {};
            return decode.user && decode.server ? decode.user + '@' + decode.server : jid;
        }
        return jid;
    };

    store.bind(sock.ev);

    if (!sock.authState.creds.registered) {
        const phoneNumber = await question('\n Introduce el número de teléfono (549xxx):\n');
        const code = await sock.requestPairingCode(phoneNumber.trim(), "DELUXEAS");
        console.log(chalk.blue("CÓDIGO DE VINCULACIÓN:", code));
    }

    // ⭐ SOLO procesar mensajes nuevos en tiempo real (type === 'notify')
    // Esto evita mensajes duplicados y lentitud por sincronización de historial ('append')
    sock.ev.on('messages.upsert', async (chatUpdate) => {
        try {
            if (chatUpdate.type !== 'notify') return;

            for (const mek of chatUpdate.messages) {
                if (!mek.message) continue;
                if (mek.key.remoteJid === 'status@broadcast') continue;

                const m = smsg(sock, mek, store);
                if (!m) continue;

                logMessage(mek, m);

                const botNumber = sock.decodeJid(sock.user?.id || sock.user?.jid || '');
                const sender = sock.decodeJid(m.sender);
                const isCreator = [botNumber, ...(global.owner || [])]
                    .map(v => String(v).replace(/[^0-9]/g, '') + '@s.whatsapp.net')
                    .includes(sender);

                if (!sock.public && !mek.key.fromMe && !isCreator) continue;
                if (mek.key.id.startsWith('BAE5') && mek.key.id.length === 16) continue;
                if (mek.key.id.startsWith('DeluxeAssistant.exe')) continue;

                await require("./DeluxeAssistant")(sock, m, store);
            }
        } catch (e) {
            console.log('[messages.upsert error]:', e);
        }
    });

    sock.ev.on('group-participants.update', async update => {
        try {
            logEvent('group-participants.update', `[GRUPO] grupo=${update.id} accion=${update.action} participantes=${update.participants.join(',')}`);
            await dispatchEvent({ sock, update });
        } catch (error) {
            console.log(error);
        }
    });

    sock.public = true;

    sock.ev.on('connection.update', async ({ connection, lastDisconnect }) => {
        if (connection === 'open') {
            console.log('✅ Conectado exitosamente');
            await loadModule(sock);
        }

        if (connection === 'close') {
            const statusCode = lastDisconnect?.error?.output?.statusCode;
            const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
            console.log(`❌ Conexión cerrada. Reconectando: ${shouldReconnect}`);
            if (shouldReconnect) {
                setTimeout(() => connectToWhatsApp(), 3000);
            }
        }
    });

    sock.ev.on('creds.update', saveCreds);
}

connectToWhatsApp();
