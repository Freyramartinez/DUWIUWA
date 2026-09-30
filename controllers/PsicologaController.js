const User = require('../models/User');
const Ficha = require('../models/Ficha');
const Cita = require('../models/Cita');
const { avisarNovedades } = require('../utils/verificacion');

const FECHA_RE = /^\d{4}-\d{2}-\d{2}$/;
const HORA_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const str = v => (typeof v === 'string' ? v.trim() : '');

async function renderPanel(req, res, error = null) {
  const yo = req.session.user.id;
  const [fichas, citas] = await Promise.all([
    Ficha.find({ psicologa: yo }).sort({ nombre: 1 }).lean(),
    Cita.find({ psicologa: yo }).populate('ficha', 'nombre').lean()
  ]);
  res.render('psicologa', {
    usuario: req.session.user,
    error,
    victimas: fichas.map(f => ({ id: f._id, nombre: f.nombre, correo: f.correo, telefono: f.telefono, conCuenta: !!f.cuenta })),
    citas: citas.map(c => ({
      id: c._id, victima: c.ficha ? c.ficha.nombre : '(ficha eliminada)',
      fecha: c.fecha, hora: c.hora, motivo: c.motivo, estado: c.estado
    }))
  });
}

const fallo = (req, res, err) => {
  console.error(err);
  return renderPanel(req, res, 'Ocurrió un error. Intenta de nuevo.').catch(() => res.status(500).send('Error del servidor.'));
};

exports.panel = (req, res) => renderPanel(req, res).catch(e => fallo(req, res, e));

// Crea la FICHA (no una cuenta). Si la persona ya tiene cuenta verificada con ese correo, se vincula al instante.
exports.registrarVictima = async (req, res) => {
  try {
    const nombre = str(req.body.nombre), telefono = str(req.body.telefono);
    const correo = str(req.body.correo).toLowerCase();

    if (!nombre || !correo || !telefono) return renderPanel(req, res, 'Completa todos los campos.');
    if (!EMAIL_RE.test(correo)) return renderPanel(req, res, 'El correo no parece válido. Revísalo: con él se conecta su cuenta.');

    const cuenta = await User.findOne({ email: correo, role: 'victima', isVerified: true }).select('_id nombre email');
    await Ficha.create({ nombre, correo, telefono, psicologa: req.session.user.id, cuenta: cuenta ? cuenta._id : null });
    if (cuenta) avisarNovedades(cuenta, req);   // aviso neutro, solo si su correo ya está verificado
    res.redirect('/psicologa');
  } catch (err) {
    if (err && err.code === 11000) return renderPanel(req, res, 'Ya registraste a una persona con ese correo.');
    fallo(req, res, err);
  }
};

exports.crearCita = async (req, res) => {
  try {
    const yo = req.session.user.id;
    const ficha = str(req.body.ficha), fecha = str(req.body.fecha), hora = str(req.body.hora), motivo = str(req.body.motivo);

    if (!FECHA_RE.test(fecha) || !HORA_RE.test(hora)) return renderPanel(req, res, 'Fecha u hora no válidas.');
    if (!await Ficha.exists({ _id: ficha, psicologa: yo })) return renderPanel(req, res, 'Ficha no válida.');
    if (await Cita.exists({ psicologa: yo, fecha, hora, estado: 'programada' })) return renderPanel(req, res, 'Ya tienes una cita a esa fecha y hora.');

    await Cita.create({ ficha, psicologa: yo, fecha, hora, motivo });
    res.redirect('/psicologa');
  } catch (err) { fallo(req, res, err); }
};

exports.cancelarCita = async (req, res) => {
  try {
    await Cita.updateOne(
      { _id: req.params.id, psicologa: req.session.user.id, estado: 'programada' },
      { estado: 'cancelada', canceladaPor: req.session.user.id }
    );
  } catch (err) { console.error(err); }
  res.redirect('/psicologa');
};
