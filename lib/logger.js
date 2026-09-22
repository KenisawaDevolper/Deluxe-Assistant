const fs = require('fs');
const path = require('path');
const PhoneNumber = require('awesome-phonenumber');
const chalk = require('chalk');

const logsDir = path.resolve('./logs');
const logFile = path.join(logsDir, 'bot.log');

function ensureLogFile() {
    fs.mkdirSync(logsDir, { recursive: true });
}

function clean(value, limit = 160) {
    return String(value || '').replace(/\s+/g, ' ').trim().slice(0, limit);
}

function chatType(jid) {
    if (String(jid).endsWith('@g.us')) return '[GRUPO]';
    if (String(jid).endsWith('@newsletter')) return '[CANAL]';
    return '[PRIVADO]';
}

function countryFromNumber(jid) {
    const number = String(jid || '').split('@')[0].replace(/[^0-9]/g, '');
    if (!number) return 'desconocido';
    try {
        const region = new PhoneNumber(`+${number}`).getRegionCode();
        if (!region) return 'desconocido';
        return new Intl.DisplayNames(['es'], { type: 'region' }).of(region) || region;
    } catch {
        return 'desconocido';
    }
}

function writeLog(type, data) {
    ensureLogFile();
    const time = new Date().toLocaleTimeString('es-ES', { hour12: false });
    const line = `[${time}] [${type}] ${data}`;
    const color = type === 'MENSAJE' ? chalk.cyan : chalk.magenta;
    console.log(color(line));
    fs.appendFileSync(logFile, `${line}\n`);
}

function logMessage(mek, message) {
    const text = message?.text || message?.message?.conversation || '';
    const chat = mek.key.remoteJid;
    const sender = message?.sender || mek.key.participant || chat;
    const number = String(sender).split('@')[0].replace(/[^0-9]/g, '') || 'desconocido';
    const name = clean(message?.pushName || number, 60);
    const country = countryFromNumber(sender);
    const location = country === 'desconocido' ? '' : ` · ${country}`;
    writeLog('MENSAJE', `${chatType(chat)} ${name}${location}: ${clean(text) || '[sin texto]'}`);
}

function logEvent(name, data) {
    writeLog('EVENTO', `${name} ${data}`);
}

function recentLogs(limit = 20) {
    ensureLogFile();
    const lines = fs.readFileSync(logFile, 'utf8').split('\n').filter(Boolean);
    return lines.slice(-limit).join('\n');
}

module.exports = { logMessage, logEvent, recentLogs };
