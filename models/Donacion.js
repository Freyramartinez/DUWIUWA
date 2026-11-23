const mongoose = require('mongoose');

const donacionSchema = new mongoose.Schema({
  folio:      { type: String, required: true, unique: true },
  donante:    { type: String, default: 'Anónimo' },
  correo:     { type: String, default: '' },
  monto:      { type: Number, required: true },
  metodo:     { type: String, required: true },
  frecuencia: { type: String, enum: ['unica', 'mensual'], default: 'unica' },
  estado:     { type: String, enum: ['completada', 'pendiente'], default: 'completada' },
  fecha:      { type: Date, default: Date.now }
});

module.exports = mongoose.model('Donacion', donacionSchema);