const Ficha = require('../models/Ficha');

// Enlaza las fichas que tengan el correo de la cuenta.
// SOLO si el correo está verificado y la cuenta es de víctima.
exports.vincularPorCorreo = async (user) => {
  if (!user || !user.isVerified || user.role !== 'victima') return;
  await Ficha.updateMany({ correo: user.email, cuenta: null }, { cuenta: user._id });
};
