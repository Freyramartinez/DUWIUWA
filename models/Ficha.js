const mongoose = require('mongoose');

// La ficha es el registro de la víctima ANTE la psicóloga (no es una cuenta).
// Se conecta con la cuenta de la víctima por el correo verificado.
const fichaSchema = new mongoose.Schema({
  nombre:    { type: String, required: true, trim: true },
  correo:    { type: String, required: true, lowercase: true, trim: true },
  telefono:  { type: String, required: true, trim: true },
  psicologa: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  cuenta:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null }
}, { timestamps: true });

// Una psicóloga no puede repetir el mismo correo
fichaSchema.index({ psicologa: 1, correo: 1 }, { unique: true });

module.exports = mongoose.model('Ficha', fichaSchema);
