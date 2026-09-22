const fs = require('fs');

const CONFIG_PATH = './lib/database/groups.json';

function loadGroups() {
    return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
}

function saveGroups(groups) {
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(groups, null, 2));
}

function getGroupConfig(jid, groups = loadGroups()) {
    groups[jid] ||= {};
    groups[jid].welcome ||= {
        enabled: false,
        text: 'Bienvenido/a @user a *{group}*.'
    };
    groups[jid].antilink ||= { enabled: false };
    groups[jid].warnings ||= {};
    return groups[jid];
}

function getTargetJid(m, args = []) {
    const mentioned = m.message?.extendedTextMessage?.contextInfo?.mentionedJid
        || m.message?.imageMessage?.contextInfo?.mentionedJid
        || [];
    if (mentioned[0]) return mentioned[0];
    if (m.quoted?.sender) return m.quoted.sender;
    const number = args.find(value => /\d{5,16}/.test(value))?.replace(/[^0-9]/g, '');
    return number ? `${number}@s.whatsapp.net` : '';
}

function displayNumber(jid) {
    return String(jid || '').split('@')[0];
}

module.exports = { loadGroups, saveGroups, getGroupConfig, getTargetJid, displayNumber };
