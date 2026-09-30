const bcrypt = require('bcryptjs');
const User = require('../models/User');

const destinos = { jefe: '/jefe', psicologa: '/psicologa', victima: '/victima' };
const etiquetas = { jefe: 'Jefe', psicologa: 'Psicóloga', victima: 'Víctima' };

const render = (req, res, error = null) =>
  res.render('cambiar-password', { usuario: req.session.user, rol: etiquetas[req.session.user.role] || '', error });

exports.form = (req, res) => render(req, res);

exports.cambiar = async (req, res) => {
  try {
    const nueva = typeof req.body.password === 'string' ? req.body.password : '';
    const confirmar = typeof req.body.password2 === 'string' ? req.body.password2 : '';

    if (nueva.length < 8) return render(req, res, 'La contraseña debe tener al menos 8 caracteres.');
    if (nueva !== confirmar) return render(req, res, 'Las contraseñas no coinciden.');

    const u = await User.findById(req.session.user.id);
    if (!u) return res.redirect('/login');
    if (await bcrypt.compare(nueva, u.password)) return render(req, res, 'Elige una contraseña distinta a la temporal.');

    u.password = await bcrypt.hash(nueva, 10);
    u.mustChangePassword = false;
    await u.save();

    req.session.user.mustChangePassword = false;
    res.redirect(destinos[u.role] || '/');
  } catch (err) {
    console.error(err);
    render(req, res, 'Ocurrió un error. Intenta de nuevo.');
  }
};
