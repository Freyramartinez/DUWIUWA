const bcrypt = require('bcryptjs');
const { generarCodigo, enviarCorreoBrevo, plantillaCodigo, plantillaAviso, baseUrl, CODIGO_MINUTOS } = require('./correo');

// Genera un código nuevo, lo guarda CIFRADO en la cuenta y lo manda por correo.
// Devuelve true si el correo salió, false si falló (la cuenta queda guardada igual).
exports.emitirCodigo = async (usuario) => {
  const codigo = generarCodigo();
  usuario.verificationCodeHash = await bcrypt.hash(codigo, 10);
  usuario.verificationExpires = new Date(Date.now() + CODIGO_MINUTOS * 60 * 1000);
  usuario.verificationAttempts = 0;
  usuario.verificationSentAt = new Date();
  usuario.verificationToken = undefined;   // invalida enlaces viejos
  await usuario.save();

  try {
    const m = plantillaCodigo(usuario.nombre, codigo);
    await enviarCorreoBrevo({ to: usuario.email, nombre: usuario.nombre, ...m });
    return true;
  } catch (err) {
    console.error('⚠️ No se pudo enviar el código:', err.message);   // el detalle técnico solo va a la terminal
    return false;
  }
};

// Aviso neutro: "hay novedades en tu cuenta". No espera ni rompe nada si falla.
exports.avisarNovedades = (usuario, req) => {
  const m = plantillaAviso(usuario.nombre, baseUrl(req) + '/login');
  return enviarCorreoBrevo({ to: usuario.email, nombre: usuario.nombre, ...m })
    .catch(err => console.error('⚠️ No se pudo enviar el aviso:', err.message));
};