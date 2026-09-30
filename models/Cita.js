const mongoose = require('mongoose');

// fecha 'YYYY-MM-DD' y hora 'HH:mm' como texto: evita desfases de zona horaria.
// La cita se liga a la FICHA, así se puede agendar aunque aún no exista la cuenta.
const citaSchema = new mongoose.Schema({
  ficha:     { type: mongoose.Schema.Types.ObjectId, ref: 'Ficha', required: true },
  psicologa: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  fecha:     { type: String, required: true },
  hora:      { type: String, required: true },
  motivo:    { type: String, default: '' },
  estado:    { type: String, enum: ['programada', 'cancelada'], default: 'programada' },
  canceladaPor: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

module.exports = mongoose.model('Cita', citaSchema);
