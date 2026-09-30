const crypto = require('crypto');

// Ajustes del código de verificación
exports.CODIGO_MINUTOS = 15;
exports.MAX_INTENTOS = 5;
exports.REENVIO_SEGUNDOS = 60;

// Evita que un nombre con HTML se cuele en el correo
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
exports.esc = esc;

// Envío vía API HTTP de Brevo (puerto 443, Railway no lo bloquea)
exports.enviarCorreoBrevo = async ({ to, nombre, subject, html }) => {
  const apiKey = (process.env.BREVO_API_KEY || '').trim();
  const sender = (process.env.EMAIL_FROM || '').trim();
  if (!apiKey) throw new Error('Falta la variable BREVO_API_KEY en el servidor');
  if (!sender) throw new Error('Falta la variable EMAIL_FROM en el servidor');

  const resp = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: { accept: 'application/json', 'content-type': 'application/json', 'api-key': apiKey },
    body: JSON.stringify({
      sender: { name: 'Women Safety', email: sender },
      to: [{ email: to, name: nombre }],
      subject,
      htmlContent: html
    }),
    signal: AbortSignal.timeout(10000)
  });
  if (!resp.ok) throw new Error(`Brevo ${resp.status}: ${await resp.text()}`);
  return resp.json();
};

// Código de 6 dígitos criptográficamente aleatorio
exports.generarCodigo = () => String(crypto.randomInt(100000, 1000000));

exports.baseUrl = req =>
  (process.env.APP_URL || `${req.protocol}://${req.headers.host}`).replace(/\/+$/, '');

// Marco con título tipo empresa; el texto es neutro a propósito
const marco = contenido => `
<div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; border: 1px solid #eadbe4; border-radius: 16px; overflow: hidden; color: #292329;">
  <div style="background: #8e3a68; color: #ffffff; padding: 18px 24px; font-size: 18px; font-weight: bold; letter-spacing: 0.06em;">Women Safety</div>
  <div style="padding: 24px;">${contenido}</div>
  <div style="padding: 14px 24px; background: #fff8fb; font-size: 12px; color: #6f6470;">Este es un mensaje automático. Si no lo esperabas, puedes ignorarlo.</div>
</div>`;

exports.plantillaCodigo = (nombre, codigo) => ({
  subject: 'Tu código de verificación',
  html: marco(`
    <p>Hola ${esc(nombre)},</p>
    <p>Tu código de verificación es:</p>
    <p style="font-size: 32px; font-weight: bold; letter-spacing: 6px; color: #8e3a68; margin: 16px 0;">${codigo.slice(0, 3)} ${codigo.slice(3)}</p>
    <p style="font-size: 13px; color: #6f6470;">El código vence en ${exports.CODIGO_MINUTOS} minutos.</p>`)
});

exports.plantillaAviso = (nombre, urlLogin) => ({
  subject: 'Novedades en tu cuenta',
  html: marco(`
    <p>Hola ${esc(nombre)},</p>
    <p>Hay novedades en tu cuenta. Inicia sesión para verlas.</p>
    <p><a href="${esc(urlLogin)}" style="display: inline-block; padding: 12px 22px; background: #8e3a68; color: #ffffff; text-decoration: none; border-radius: 24px; font-weight: bold;">Iniciar sesión</a></p>`)
});