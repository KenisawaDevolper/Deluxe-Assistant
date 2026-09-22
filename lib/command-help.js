const commandHelp = [
    {
        category: 'General',
        commands: ['menu'],
        description: 'Abre el menú principal o una categoría específica.',
        usage: '.menu [categoría]',
        examples: ['.menu', '.menu download', '.menu owner'],
        access: 'Todos'
    },
    {
        category: 'Plugins',
        commands: ['help', 'ayuda'],
        description: 'Muestra esta ayuda o los detalles de un comando.',
        usage: '.help [comando]',
        examples: ['.help', '.help menu', '.help addprem'],
        access: 'Todos'
    },
    {
        category: 'Plugins',
        commands: ['plugins'],
        description: 'Lista los plugins cargados actualmente.',
        usage: '.plugins',
        examples: ['.plugins'],
        access: 'Propietario'
    },
    {
        category: 'Sistema',
        commands: ['logs', 'log'],
        description: 'Muestra los últimos mensajes y eventos registrados.',
        usage: '.logs [cantidad]',
        examples: ['.logs', '.logs 30'],
        access: 'Propietario'
    },
    {
        category: 'Plugins',
        commands: ['reload', 'reloadplugins'],
        description: 'Recarga todos los plugins sin reiniciar el bot.',
        usage: '.reload',
        examples: ['.reload', '.reloadplugins'],
        access: 'Propietario'
    },
    {
        category: 'Sistema',
        commands: ['eval'],
        description: 'Evalúa código JavaScript en el proceso del bot.',
        usage: '.eval código',
        examples: ['.eval 1 + 1', '.eval process.uptime()'],
        access: 'Propietario'
    },
    {
        category: 'Sistema',
        commands: ['exec'],
        description: 'Ejecuta un comando del sistema en el servidor.',
        usage: '.exec comando',
        examples: ['.exec pwd', '.exec yt-dlp --version'],
        access: 'Propietario'
    },
    {
        category: 'Sistema',
        commands: ['checkupdate'],
        description: 'Comprueba si existe una versión nueva en GitHub.',
        usage: '.checkupdate',
        examples: ['.checkupdate'],
        access: 'Propietario'
    },
    {
        category: 'Sistema',
        commands: ['update'],
        description: 'Descarga la última versión y reinicia el bot.',
        usage: '.update',
        examples: ['.update'],
        access: 'Propietario'
    },
    {
        category: 'Descargas',
        commands: ['play', 'song', 'music'],
        description: 'Busca una canción en YouTube y envía el audio.',
        usage: '.play búsqueda o enlace',
        examples: ['.play música relajante', '.play https://youtu.be/...'],
        access: 'Todos'
    },
    {
        category: 'Descargas',
        commands: ['tiktok', 'tt', 'tiktokdl'],
        description: 'Descarga videos sin marca de agua, fotos y audios de TikTok.',
        usage: '.tiktok enlace',
        examples: ['.tiktok https://vm.tiktok.com/...', '.ttmp3 https://vm.tiktok.com/...'],
        access: 'Todos'
    },
    {
        category: 'Descargas',
        commands: ['sticker', 's', 'stiker'],
        description: 'Convierte una imagen o video en un sticker de WhatsApp.',
        usage: '.sticker',
        examples: ['Enviar una imagen con .sticker', 'Responder una imagen con .s'],
        access: 'Todos'
    },
    {
        category: 'Descargas',
        commands: ['toimg'],
        description: 'Convierte un sticker de WhatsApp en una imagen PNG.',
        usage: '.toimg',
        examples: ['Responder un sticker con .toimg'],
        access: 'Todos'
    },
    {
        category: 'Descargas',
        commands: ['script', 'sc', 'getsc'],
        description: 'Muestra la información y el enlace de la base del bot.',
        usage: '.script',
        examples: ['.script', '.sc'],
        access: 'Todos'
    },
    {
        category: 'Propietario',
        commands: ['addowner', 'addown'],
        description: 'Agrega un número a la lista de propietarios.',
        usage: '.addowner número',
        examples: ['.addowner 5491112345678'],
        access: 'Propietario'
    },
    {
        category: 'Propietario',
        commands: ['delowner', 'delown'],
        description: 'Elimina un número de la lista de propietarios.',
        usage: '.delowner número',
        examples: ['.delowner 5491112345678'],
        access: 'Propietario'
    },
    {
        category: 'Premium',
        commands: ['addprem'],
        description: 'Concede acceso premium a un número registrado en WhatsApp.',
        usage: '.addprem número',
        examples: ['.addprem 5491112345678'],
        access: 'Propietario'
    },
    {
        category: 'Grupos',
        commands: ['groupinfo'],
        description: 'Muestra el nombre, miembros, administradores e ID del grupo.',
        usage: '.groupinfo',
        examples: ['.groupinfo'],
        access: 'Administrador'
    },
    {
        category: 'Grupos',
        commands: ['kick', 'ban', 'remove'],
        description: 'Expulsa a un usuario mencionado o citado.',
        usage: '.kick @usuario',
        examples: ['.kick @5491112345678', '.remove respondiendo a su mensaje'],
        access: 'Administrador'
    },
    {
        category: 'Grupos',
        commands: ['promote'],
        description: 'Promueve a un usuario como administrador.',
        usage: '.promote @usuario',
        examples: ['.promote @5491112345678'],
        access: 'Administrador'
    },
    {
        category: 'Grupos',
        commands: ['demote'],
        description: 'Retira a un usuario de la administración.',
        usage: '.demote @usuario',
        examples: ['.demote @5491112345678'],
        access: 'Administrador'
    },
    {
        category: 'Grupos',
        commands: ['tagall', 'hidetag'],
        description: 'Menciona a todos los miembros del grupo.',
        usage: '.tagall [mensaje]',
        examples: ['.tagall Reunión en 5 minutos', '.hidetag Aviso importante'],
        access: 'Administrador'
    },
    {
        category: 'Grupos',
        commands: ['setwelcome', 'welcome'],
        description: 'Activa, desactiva o personaliza el mensaje de bienvenida.',
        usage: '.setwelcome mensaje',
        examples: ['.setwelcome ¡Bienvenido/a {user} a {group}!', '.welcome off'],
        access: 'Administrador'
    },
    {
        category: 'Grupos',
        commands: ['antilink'],
        description: 'Elimina enlaces y aplica advertencias automáticamente.',
        usage: '.antilink on|off',
        examples: ['.antilink on', '.antilink off'],
        access: 'Administrador'
    },
    {
        category: 'Grupos',
        commands: ['warn'],
        description: 'Aplica una advertencia. Al llegar a 3, expulsa al usuario.',
        usage: '.warn @usuario [motivo]',
        examples: ['.warn @5491112345678', '.warn respondiendo a su mensaje spam'],
        access: 'Administrador'
    },
    {
        category: 'Grupos',
        commands: ['warnings'],
        description: 'Consulta las advertencias de un usuario.',
        usage: '.warnings @usuario',
        examples: ['.warnings @5491112345678'],
        access: 'Administrador'
    },
    {
        category: 'Grupos',
        commands: ['delwarn', 'clearwarn'],
        description: 'Elimina las advertencias de un usuario.',
        usage: '.delwarn @usuario',
        examples: ['.delwarn @5491112345678'],
        access: 'Administrador'
    },
    {
        category: 'Premium',
        commands: ['delprem'],
        description: 'Revoca el acceso premium de un número.',
        usage: '.delprem número',
        examples: ['.delprem 5491112345678'],
        access: 'Propietario'
    },
    {
        category: 'Modo',
        commands: ['public'],
        description: 'Hace que el bot responda a todos los usuarios.',
        usage: '.public',
        examples: ['.public'],
        access: 'Propietario'
    },
    {
        category: 'Modo',
        commands: ['self'],
        description: 'Hace que el bot solo responda al propietario.',
        usage: '.self',
        examples: ['.self'],
        access: 'Propietario'
    }
];

function findCommand(name) {
    const normalized = String(name || '').replace(/^[/#!.,+]/, '').toLowerCase();
    return commandHelp.find(item => item.commands.includes(normalized));
}

module.exports = { commandHelp, findCommand };
