const bcrypt = require('bcryptjs');
const User = require('../models/User');
const { vincularPorCorreo } = require('../utils/vincularFicha');
const { emitirCodigo, avisarNovedades } = require('../utils/verificacion');
const { MAX_INTENTOS, REENVIO_SEGUNDOS } = require('../utils/correo');

const str = v => (typeof v === 'string' ? v.trim() : '');
const normal = v => str(v).toLowerCase();

// Segundos que faltan para poder pedir otro código (la cuenta regresiva vive en la sesión,
// así la pantalla se ve igual exista o no el correo: no revela nada).
const restanteSegundos = req => {
  const t = req.session.codigoEnviadoAt;
  if (!t) return 0;
  return Math.max(0, Math.ceil(REENVIO_SEGUNDOS - (Date.now() - t) / 1000));
};

const vista = (req, res, extra = {}) => res.render('verificar', {
  email: normal(req.query.email) || req.session.pendingEmail || '',
  error: null, exito: null, aviso: null,
  restante: restanteSegundos(req),
  reenvioTotal: REENVIO_SEGUNDOS,
  ...extra
});

// GET /verificar
exports.form = (req, res) => {
  let aviso = null;
  if (req.query.envio === 'fallo') aviso = 'No pudimos enviar el código. Cuando termine la cuenta regresiva, pide uno nuevo con el botón de abajo.';
  else if (req.query.aviso === 'pendiente') aviso = 'Tu correo aún no está verificado. Escribe el código que te enviamos o pide uno nuevo.';
  vista(req, res, { aviso });
};

// POST /verificar
exports.verificar = async (req, res) => {
  try {
    const email = normal(req.body.email);
    const codigo = str(req.body.codigo).replace(/\s/g, '');
    if (!email || !/^\d{6}$/.test(codigo)) return vista(req, res, { email, error: 'Escribe tu correo y el código de 6 dígitos.' });

    const usuario = await User.findOne({ email });
    // Mensaje genérico: no revela si el correo existe
    if (!usuario || usuario.isVerified || !usuario.verificationCodeHash) {
      return vista(req, res, { email, error: 'Código incorrecto o vencido. Puedes pedir uno nuevo.' });
    }
    if (!usuario.verificationExpires || usuario.verificationExpires < new Date()) {
      return vista(req, res, { email, error: 'El código venció. Pide uno nuevo.' });
    }
    if (usuario.verificationAttempts >= MAX_INTENTOS) {
      return vista(req, res, { email, error: 'Demasiados intentos. Pide un código nuevo.' });
    }

    if (!(await bcrypt.compare(codigo, usuario.verificationCodeHash))) {
      usuario.verificationAttempts += 1;
      await usuario.save();
      const quedan = MAX_INTENTOS - usuario.verificationAttempts;
      return vista(req, res, {
        email,
        error: quedan > 0 ? `Código incorrecto. Te quedan ${quedan} intento(s).` : 'Demasiados intentos. Pide un código nuevo.'
      });
    }

    // Código correcto
    usuario.isVerified = true;
    usuario.verificationCodeHash = undefined;
    usuario.verificationExpires = undefined;
    usuario.verificationAttempts = 0;
    usuario.verificationToken = undefined;
    await usuario.save();

    // Si su psicóloga ya la había registrado: se conectan sus fichas y se le avisa
    const vinculadas = await vincularPorCorreo(usuario);
    if (vinculadas > 0) avisarNovedades(usuario, req);   // sin esperar

    delete req.session.pendingEmail;
    res.render('login', { success: '¡Correo verificado! Ya puedes iniciar sesión.' });
  } catch (err) {
    console.error(err);
    vista(req, res, { error: 'Ocurrió un error. Intenta de nuevo.' });
  }
};

// POST /verificar/reenviar
exports.reenviar = async (req, res) => {
  try {
    const email = normal(req.body.email);
    if (!email) return vista(req, res, { error: 'Escribe tu correo.' });

    const usuario = await User.findOne({ email });
    if (usuario && !usuario.isVerified && usuario.role === 'victima') {
      const desdeEnvio = usuario.verificationSentAt ? Date.now() - usuario.verificationSentAt.getTime() : Infinity;
      if (desdeEnvio >= REENVIO_SEGUNDOS * 1000) await emitirCodigo(usuario);   // si es muy pronto, no se reenvía
    }
    // La cuenta regresiva arranca igual exista o no el correo (así no se puede averiguar si está registrado)
    if (restanteSegundos(req) === 0) req.session.codigoEnviadoAt = Date.now();
    // Misma respuesta siempre: no revela si el correo está registrado
    vista(req, res, { email, exito: 'Si el correo está registrado y sin verificar, te enviamos un código nuevo. Puede tardar un minuto; revisa también la carpeta de spam.' });
  } catch (err) {
    console.error(err);
    vista(req, res, { error: 'Ocurrió un error. Intenta de nuevo.' });
  }
};
