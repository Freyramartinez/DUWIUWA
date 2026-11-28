const COMUNES = [
  '12345678', '123456789', '1234567890', 'password', 'password1',
  'contraseña', 'contrasena', 'qwerty123', 'abc12345', 'iloveyou',
  'admin123', '11111111', 'womensafety'
];

function validarPassword(password, { email = '', nombre = '' } = {}) {
  if (typeof password !== 'string') return ['Contraseña inválida.'];

  const errores = [];
  const pass = password.toLowerCase();

  if (password.length < 8) errores.push('Mínimo 8 caracteres.');
  if (password.length > 128) errores.push('Máximo 128 caracteres.');
  if (!/[a-z]/.test(password)) errores.push('Incluye al menos una minúscula.');
  if (!/[A-Z]/.test(password)) errores.push('Incluye al menos una mayúscula.');
  if (!/\d/.test(password)) errores.push('Incluye al menos un número.');
  if (!/[^A-Za-z0-9]/.test(password)) errores.push('Incluye al menos un símbolo (!@#$%...).');
  if (/\s/.test(password)) errores.push('No uses espacios.');
  if (/(.)\1{3,}/.test(password)) errores.push('No repitas el mismo carácter 4 o más veces seguidas.');
  if (COMUNES.includes(pass)) errores.push('Esa contraseña es demasiado común.');

  const local = String(email).split('@')[0].toLowerCase();
  if (local.length >= 3 && pass.includes(local)) errores.push('No uses tu correo en la contraseña.');

  const nom = String(nombre).trim().toLowerCase();
  if (nom.length >= 3 && pass.includes(nom)) errores.push('No uses tu nombre en la contraseña.');

  return errores; // [] = válida
}

module.exports = { validarPassword };