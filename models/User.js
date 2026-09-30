const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  nombre: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true },
  isVerified: { type: Boolean, default: false },
  verificationToken: { type: String },

  // ---- Código de verificación por correo (como GitHub) ----
  verificationCodeHash: { type: String },                 // el código va cifrado, no se puede leer
  verificationExpires: { type: Date },                    // vence a los 15 minutos
  verificationAttempts: { type: Number, default: 0 },     // intentos fallidos
  verificationSentAt: { type: Date },                     // para limitar los reenvíos

  // ---- NUEVO ----
  role: { type: String, enum: ["jefe", "psicologa", "victima"], default: "victima" },
  validada: { type: Boolean, default: false },            // solo psicólogas: aprobación del jefe
  mustChangePassword: { type: Boolean, default: false },  // psicólogas: cambian la temporal al entrar
}, { timestamps: true });

module.exports = mongoose.model("User", userSchema);
