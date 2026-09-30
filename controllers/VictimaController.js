const Ficha = require('../models/Ficha');
const Cita = require('../models/Cita');
const instancia = require('../config/instancia');

const idsDeMisFichas = async (userId) =>
  (await Ficha.find({ cuenta: userId }).select('_id').lean()).map(f => f._id);

exports.panel = async (req, res) => {
  try {
    const fichas = await idsDeMisFichas(req.session.user.id);
    const citas = await Cita.find({ ficha: { $in: fichas } })
      .populate('psicologa', 'nombre').sort({ fecha: 1, hora: 1 }).lean();

    res.render('victima', {
      usuario: req.session.user,
      instancia,
      citas: citas.map(c => ({
        id: c._id, fecha: c.fecha, hora: c.hora, estado: c.estado,
        psicologa: c.psicologa ? c.psicologa.nombre : ''
      }))
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('Error al cargar tus citas.');
  }
};

// Solo puede cancelar citas de SUS fichas
exports.cancelar = async (req, res) => {
  try {
    const fichas = await idsDeMisFichas(req.session.user.id);
    await Cita.updateOne(
      { _id: req.params.id, ficha: { $in: fichas }, estado: 'programada' },
      { estado: 'cancelada', canceladaPor: req.session.user.id }
    );
  } catch (err) { console.error(err); }
  res.redirect('/victima');
};
