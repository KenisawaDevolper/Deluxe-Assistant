require('./configure/settings');
const {
default: makeWASocket,
prepareWAMessageMedia,
useMultiFileAuthState,
DisconnectReason,
fetchLatestBaileysVersion,
makeInMemoryStore,
jidDecode,
downloadContentFromMessage,
makeCacheableSignalKeyStore,
updateProfileStatus
} = require("lilys-baileys");
const pino = require('pino');
const readline = require("readline");
const fs = require('fs');
const chalk = require("chalk");
const { smsg, getBuffer, getSizeMedia } = require('./lib/myfunc');
const {
     loadModule
      } = require('./lib/functions');
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

const client = sock
const conn = client


sock.decodeJid = (jid) => {
if (!jid) return jid
if (/:\d+@/gi.test(jid)) {
const decode = jidDecode(jid) || {}
return decode.user && decode.server ? decode.user + '@' + decode.server : jid
}
return jid
}

store.bind(sock.ev);

if (!sock.authState.creds.registered) {
const phoneNumber = await question(`
 Introduce el número de teléfono (549xxx):
`);

const code = await sock.requestPairingCode(phoneNumber.trim(), "DELUXEAS");
         console.log(chalk.blue("CÓDIGO DE VINCULACIÓN:", code));
}

sock.ev.on('messages.upsert', async ({ messages }) => {
try {
    const mek = messages[0];
    if (!mek.message) return;
    if (mek.key.remoteJid === 'status@broadcast') return;

    const m = smsg(sock, mek, store);
    if (!m) return;
    logMessage(mek, m);

    const isCreator = [sock?.user?.id,...(global.owner || [])]
       .map(v => v.replace(/[^0-9]/g,'')+'@s.whatsapp.net')
       .includes(m.sender);

    if (!sock.public &&!mek.key.fromMe &&!isCreator) return;
    if (mek.key.id.startsWith('BAE5') && mek.key.id.length === 16) return;
    if (mek.key.id.startsWith('DeluxeAssistant.exe')) return;

    require("./DeluxeAssistant")(sock, m, store);

} catch (e) {
    console.log(e);
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

sock.public = true

sock.ev.on('connection.update', async ({ connection, lastDisconnect }) => {
    if (connection === 'open') {
         console.log('✅ Conectado');

        await loadModule(sock);
    }

    if (connection === 'close') {
        if (lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut) {
            connectToWhatsApp();
        }
    }
});

sock.ev.on('creds.update', saveCreds);
}

connectToWhatsApp();
