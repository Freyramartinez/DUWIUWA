const bcrypt = require('bcryptjs');
const User = require('../models/User');

const str = v => (typeof v === 'string' ? v.trim() : '');

async function renderPanel(req, res, error = null) {
  const lista = await User.find({ role: 'psicologa' }).sort({ nombre: 1 }).lean();
  res.render('jefe', {
    usuario: req.session.user,
    error,
    psicologas: lista.map(p => ({ id: p._id, nombre: p.nombre, correo: p.email, estado: p.validada ? 'validada' : 'pendiente' }))
  });
}

const fallo = (req, res, err) => {
  console.error(err);
  return renderPanel(req, res, 'Ocurrió un error. Intenta de nuevo.').catch(() => res.status(500).send('Error del servidor.'));
};

exports.panel = (req, res) => renderPanel(req, res).catch(e => fallo(req, res, e));

exports.crearPsicologa = async (req, res) => {
  try {
    const nombre = str(req.body.nombre), email = str(req.body.correo).toLowerCase();
    const password = typeof req.body.password === 'string' ? req.body.password : '';

    if (!nombre || !email || !password) return renderPanel(req, res, 'Completa todos los campos.');
    if (password.length < 8) return renderPanel(req, res, 'La contraseña debe tener al menos 8 caracteres.');
    if (await User.findOne({ email })) return renderPanel(req, res, 'Ese correo ya está registrado.');

    await User.create({
      nombre, email,
      password: await bcrypt.hash(password, 10),
      role: 'psicologa',
      validada: false,           // no entra hasta que el jefe la valide
      isVerified: true,          // el jefe entrega las credenciales: no lleva verificación por correo
      mustChangePassword: true   // cambia la temporal en su primer inicio
    });
    res.redirect('/jefe');
  } catch (err) { fallo(req, res, err); }
};

exports.validar = async (req, res) => {
  try {
    await User.updateOne({ _id: req.params.id, role: 'psicologa' }, { validada: true });
  } catch (err) { console.error(err); }
  res.redirect('/jefe');
};
