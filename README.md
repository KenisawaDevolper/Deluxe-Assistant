# Deluxe Assistant

Bot modular de WhatsApp para Node.js, construido sobre `lilys-baileys`. Incluye un sistema de plugins con recarga automática, menús interactivos con imágenes y ayuda integrada para los comandos.

## Características

- Conexión mediante código de vinculación.
- Sistema modular basado en plugins.
- Recarga automática de plugins sin reiniciar el bot.
- Menú interactivo con categorías y botones.
- Comando de ayuda con descripciones, permisos y ejemplos.
- Gestión de propietarios y usuarios premium.
- Modos público y privado.
- Soporte para imágenes y mensajes interactivos.
- Configuración mediante variables de entorno.

## Requisitos

- Node.js 18 o superior.
- Una cuenta de WhatsApp para vincular el bot.
- Acceso a internet.

## Instalación

```bash
git clone https://github.com/KenisawaDevolper/Deluxe-Assistant.git
cd Deluxe-Assistant
npm install
npm start
```

Al iniciar por primera vez, introduce el número de WhatsApp en formato internacional para recibir el código de vinculación.

## Configuración

Edita `configure/settings.js`:

```js
global.namaown = 'Deluxe Assistant';
global.owner = ['5491112345678'];
global.sessionName = 'sessions';
```

Reemplaza el número por el del propietario usando el código de país, sin espacios ni símbolos.

### Variables SMTP opcionales

Si utilizas la función de correo, crea un archivo `.env` basándote en `.env.example`:

```env
SMTP_USER=tu-correo@gmail.com
SMTP_PASS=tu-clave-de-aplicacion
SMTP_FROM=tu-correo@gmail.com
SMTP_TO=destinatario@gmail.com
```

Nunca publiques `.env`, contraseñas, tokens ni la carpeta `session/`.

## Comandos principales

Usa el prefijo configurado delante de cada comando. Por defecto se recomienda `.`.

| Comando | Descripción |
| --- | --- |
| `.menu` | Abre el menú principal. |
| `.menu download` | Abre la categoría de descargas. |
| `.menu group` | Abre la categoría de grupos. |
| `.menu tools` | Abre la categoría de herramientas. |
| `.menu owner` | Abre la categoría del propietario. |
| `.help` | Muestra todos los comandos disponibles. |
| `.help comando` | Muestra uso, permisos, alias y ejemplos. |
| `.plugins` | Lista los plugins activos. Solo propietario. |
| `.reload` | Recarga los plugins manualmente. Solo propietario. |
| `.checkupdate` | Comprueba cambios disponibles en GitHub. Solo propietario. |
| `.update` | Descarga la actualización y reinicia el bot. Solo propietario. |
| `.logs [cantidad]` | Muestra mensajes y eventos recientes. Solo propietario. |
| `.eval código` | Evalúa JavaScript. Solo propietario. |
| `.exec comando` | Ejecuta un comando del sistema. Solo propietario. |
| `.script` | Muestra información de la base del bot. |
| `.sticker descripción` | Convierte una imagen o video en sticker con descripción. |
| `.s` | Alias de `.sticker`. |
| `.toimg` | Convierte un sticker en imagen PNG. |
| `.play búsqueda` | Busca una canción en YouTube y envía el audio. |
| `.addowner número` | Agrega un propietario. Solo propietario. |
| `.delowner número` | Elimina un propietario. Solo propietario. |
| `.addprem número` | Agrega un usuario premium. Solo propietario. |
| `.delprem número` | Elimina un usuario premium. Solo propietario. |
| `.public` | Activa el modo público. Solo propietario. |
| `.self` | Activa el modo privado. Solo propietario. |
| `.groupinfo` | Muestra información del grupo. Solo administradores. |
| `.kick @usuario` | Expulsa a un usuario. Solo administradores. |
| `.promote @usuario` | Promueve a un administrador. Solo administradores. |
| `.demote @usuario` | Retira la administración. Solo administradores. |
| `.tagall mensaje` | Menciona a todos los miembros. Solo administradores. |
| `.setwelcome mensaje` | Configura la bienvenida. Solo administradores. |
| `.antilink on/off` | Activa o desactiva el antilink. Solo administradores. |
| `.warn @usuario` | Aplica una advertencia. Solo administradores. |
| `.warnings @usuario` | Consulta advertencias. Solo administradores. |
| `.delwarn @usuario` | Elimina advertencias. Solo administradores. |

### Bienvenida

Configura un mensaje con las variables `{user}`, `{group}` y `{count}`:

```text
.setwelcome ¡Bienvenido/a {user} a {group}! Somos {count} miembros.
.welcome off
```

La bienvenida se activa automáticamente al guardar un mensaje. Usa `.welcome on` para volver a activarla.

### Moderación

El antilink elimina enlaces publicados por usuarios que no sean administradores y suma una advertencia. Después de 3 advertencias, el usuario es expulsado. El bot debe ser administrador para eliminar mensajes y expulsar usuarios.

## Sistema de plugins

Los plugins se encuentran en `lib/plugins/`. Cada plugin debe exportar una lista de comandos y una función `handler`:

```js
module.exports = {
    commands: ['hola'],
    async handler({ reply, pushname }) {
        return reply(`Hola ${pushname}`);
    }
};
```

Guarda el archivo, por ejemplo `lib/plugins/hola.js`, y el bot lo cargará automáticamente. No es necesario reiniciarlo.

También puedes forzar la recarga usando:

```text
.reload
```

Los plugins pueden recibir el contexto del mensaje, incluyendo `sock`, `m`, `args`, `q`, `isCreator`, `isPremium`, `isGroup` y `reply`.

### Descripción de stickers

Puedes añadir una descripción al sticker escribiéndola después del comando:

```text
.sticker Mi sticker favorito
```

El nombre del paquete y el autor pueden configurarse con `STICKER_PACK_NAME` y `STICKER_AUTHOR`.

### Comando `.play`

El comando utiliza `youtube-sr` como buscador principal y `youtube-dl-exec` para descargar el audio mediante npm. En HidenCloud solo necesitas instalar las dependencias del proyecto:

```bash
npm install
```

No requiere `pip` ni permisos root. Si HidenCloud bloquea la descarga del binario durante `npm install`, abre un ticket con soporte.

Si YouTube bloquea la IP del servidor con el mensaje `Sign in to confirm`, crea el archivo `cookies/youtube-cookies.txt` en HidenCloud y pega allí tus cookies propias exportadas en formato Netscape. La ruta predeterminada será `/home/container/cookies/youtube-cookies.txt`; no necesitas modificar `play.js`. También puedes usar `YTDLP_COOKIES_FILE` o `YTDLP_COOKIES_B64`. No compartas esas cookies ni las subas a GitHub; son equivalentes a una sesión iniciada.

## Actualizaciones desde GitHub

El propietario puede comprobar e instalar actualizaciones sin acceder al servidor:

```text
.checkupdate
.update
```

El actualizador solo funciona si el bot está dentro de un repositorio Git, no hay cambios locales en el código y la actualización puede aplicarse como avance rápido (`ff-only`). Los datos de grupos de `lib/database/groups.json` se conservan automáticamente. Después de instalar una versión nueva, reinicia el proceso automáticamente.

## Registros

Los mensajes recibidos y los eventos de grupos se muestran en la consola y se guardan en `logs/bot.log`. El archivo se excluye del repositorio para no publicar conversaciones.

Cada mensaje incluye el tipo de chat (`[PRIVADO]`, `[GRUPO]` o `[CANAL]`), nombre, número y país detectado a partir del número telefónico.

El propietario puede consultar los últimos registros desde WhatsApp:

```text
.logs
.logs 30
```

## Estructura

```text
Deluxe-Assistant/
├── configure/
│   └── settings.js
├── lib/
│   ├── database/
│   ├── media/
│   ├── plugins/
│   ├── command-help.js
│   ├── myfunc.js
│   └── plugin-loader.js
├── DeluxeAssistant.js
├── index.js
├── package.json
└── .env.example
```

## Seguridad

- No compartas la carpeta `session/`.
- No subas archivos `.env`.
- Usa contraseñas de aplicación para SMTP.
- Revisa los plugins antes de instalarlos.
- Los comandos de evaluación y shell deben permanecer restringidos al propietario.

## Créditos

Proyecto basado en la base original de FallZx-Infinity. Los créditos originales se conservan.

## Licencia

MIT
