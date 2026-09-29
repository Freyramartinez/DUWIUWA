const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const User = require("../models/User");

// Envío de correo vía API HTTP de Brevo (puerto 443, Railway no lo bloquea)
async function enviarCorreoBrevo({ to, nombre, subject, html }) {
  const resp = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      accept: "application/json",
      "content-type": "application/json",
      "api-key": process.env.BREVO_API_KEY
    },
    body: JSON.stringify({
      sender: { name: "WOMEN SAFETY", email: process.env.EMAIL_FROM },
      to: [{ email: to, name: nombre }],
      subject,
      htmlContent: html
    }),
    signal: AbortSignal.timeout(10000) // corta a los 10 s, nunca se queda colgado
  });

  if (!resp.ok) {
    throw new Error(`Brevo ${resp.status}: ${await resp.text()}`);
  }
  return resp.json();
}

// GET /login
exports.getLoginPage = (req, res) => {
  res.render("login", { error: null });
};

// POST /registro
exports.registrar = async (req, res) => {
  try {
    const { nombre, email, password, password2 } = req.body;

    if (!nombre || !email || !password || !password2) {
      return res.render("login", { error: "Completa todos los campos." });
    }

    if (password !== password2) {
      return res.render("login", { error: "Las contraseñas no coinciden." });
    }

    const existe = await User.findOne({ email: email.toLowerCase() });
    if (existe) {
      return res.render("login", { error: "Ese correo ya está registrado." });
    }

    const hash = await bcrypt.hash(password, 10);
    const token = crypto.randomBytes(32).toString("hex");

    // Guardamos el usuario con isVerified: false
    await User.create({
      nombre,
      email: email.toLowerCase(),
      password: hash,
      verificationToken: token,
      isVerified: false
    });

    // Enlace de activación de correo
    const linkVerificacion = `${req.protocol}://${req.headers.host}/verify/${token}`;

    const subject = "Verifica tu cuenta - WOMEN SAFETY";
    const html = `
      <div style="font-family: Arial, sans-serif; padding: 20px; color: #292329;">
        <h2 style="color: #8e3a68;">¡Hola ${nombre}!</h2>
        <p>Gracias por registrarte en <strong>WOMEN SAFETY</strong>.</p>
        <p>Para activar tu cuenta y poder iniciar sesión, haz clic en el siguiente enlace:</p>
        <a href="${linkVerificacion}" style="display: inline-block; padding: 12px 20px; background-color: #8e3a68; color: white; text-decoration: none; border-radius: 20px; font-weight: bold;">Validar mi correo electrónico</a>
        <p style="margin-top: 20px; font-size: 0.8rem; color: #6f6470;">Si no creaste esta cuenta, puedes ignorar este mensaje.</p>
      </div>
    `;

    // Enviamos el correo sin romper el registro si falla
    console.log("📩 Enviando correo vía Brevo a:", email);
    let correoEnviado = true;
    try {
      const info = await enviarCorreoBrevo({ to: email, nombre, subject, html });
      console.log("✅ CORREO ENVIADO:", info.messageId);
    } catch (mailErr) {
      correoEnviado = false;
      console.error("⚠️ Error enviando correo (el usuario sí se guardó):", mailErr.message);
    }

    if (correoEnviado) {
      return res.render("login", {
        success: "¡Registro exitoso! Te hemos enviado un correo de activación. Revisa tu bandeja de entrada o spam antes de iniciar sesión."
      });
    }
    return res.render("login", {
      error: "Cuenta creada, pero no pudimos enviar el correo de activación. Intenta más tarde."
    });

  } catch (err) {
    console.error("❌ ERROR GENERAL EN REGISTRO:", err);
    res.render("login", { error: "Ocurrió un error al procesar el registro. Intenta de nuevo." });
  }
};

// GET /verify/:token (Confirmación de correo)
exports.verifyEmail = async (req, res) => {
  try {
    const { token } = req.params;
    const usuario = await User.findOne({ verificationToken: token });

    if (!usuario) {
      return res.render("login", { error: "El enlace de verificación es inválido o ha expirado." });
    }

    usuario.isVerified = true;
    usuario.verificationToken = null;
    await usuario.save();

    res.render("login", { success: "¡Tu correo ha sido verificado correctamente! Ya puedes iniciar sesión." });
  } catch (err) {
    console.error(err);
    res.render("login", { error: "Error al verificar el correo." });
  }
};

// POST /login
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const usuario = await User.findOne({ email: email.toLowerCase() });

    if (!usuario) {
      return res.render("login", { error: "Correo o contraseña incorrectos." });
    }

    const coincide = await bcrypt.compare(password, usuario.password);

    if (!coincide) {
      return res.render("login", { error: "Correo o contraseña incorrectos." });
    }

    // BLOQUEO SI NO ESTÁ VERIFICADO
    if (!usuario.isVerified) {
      return res.render("login", {
        error: "Debes validar tu correo electrónico primero. Revisa tu bandeja de entrada."
      });
    }

    req.session.user = {
      id: usuario._id,
      nombre: usuario.nombre,
      email: usuario.email,
    };

    res.redirect("/");

  } catch (err) {
    console.error(err);
    res.render("login", { error: "Ocurrió un error. Intenta de nuevo." });
  }
};

// POST /logout
exports.logout = (req, res) => {
  req.session.destroy(() => {
    res.redirect("/");
  });
};