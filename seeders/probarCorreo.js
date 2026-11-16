// Herramienta de diagnóstico: manda UN correo de prueba con Brevo y dice exactamente qué pasa.
// Uso:  node seeders/probarCorreo.js tu-correo@ejemplo.com
require('dotenv').config();
const { enviarCorreoBrevo, plantillaCodigo } = require('../utils/correo');

const para = process.argv[2];
if (!para) { console.log('Uso: node seeders/probarCorreo.js tu-correo@ejemplo.com'); process.exit(1); }

const key = (process.env.BREVO_API_KEY || '').trim();
console.log('BREVO_API_KEY:', key ? `definida (${key.length} caracteres, empieza con "${key.slice(0, 8)}")` : 'NO definida');
console.log('EMAIL_FROM   :', process.env.EMAIL_FROM ? 'definida' : 'NO definida');

(async () => {
  const m = plantillaCodigo('Prueba', '123456');
  try {
    const r = await enviarCorreoBrevo({ to: para, nombre: 'Prueba', ...m });
    console.log('✅ Brevo ACEPTÓ el correo (messageId: ' + r.messageId + '). Revisa la bandeja y la carpeta de spam.');
  } catch (e) {
    console.log('❌ Brevo respondió:', e.message);
    if (/unrecognised IP/i.test(e.message)) console.log('👉 IP no autorizada. Autorízala en https://app.brevo.com/security/authorised_ips');
    else if (/Key not found/i.test(e.message)) console.log('👉 La clave API no existe o está mal copiada. Crea una nueva en Brevo y ponla en .env');
    else if (/sender/i.test(e.message)) console.log('👉 El remitente (EMAIL_FROM) no está validado en Brevo.');
    else if (/Falta la variable/.test(e.message)) console.log('👉 Falta una variable en el archivo .env');
  }
})();