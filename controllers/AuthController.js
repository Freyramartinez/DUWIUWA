const bcrypt = require("bcryptjs");
const nodemailer = require("nodemailer");
const crypto = require("crypto");
const User = require("../models/User");

// Configuración del servicio de correo con puerto 465 (SSL) explícito para Railway
const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 465,
  secure: true, // SSL activado
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

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
    const domain = req.headers.host;
    const protocol = req.protocol;
    const linkVerificacion = `${protocol}://${domain}/verify/${token}`;

    // Correo de activación
    const mailOptions = {
      from: `"WOMEN SAFETY" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: "Verifica tu cuenta - WOMEN SAFETY",
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; color: #292329;">
          <h2 style="color: #8e3a68;">¡Hola ${nombre}!</h2>
          <p>Gracias por registrarte en <strong>WOMEN SAFETY</strong>.</p>
          <p>Para activar tu cuenta y poder iniciar sesión, haz clic en el siguiente enlace:</p>
          <a href="${linkVerificacion}" style="display: inline-block; padding: 12px 20px; background-color: #8e3a68; color: white; text-decoration: none; border-radius: 20px; font-weight: bold;">Validar mi correo electrónico</a>
          <p style="margin-top: 20px; font-size: 0.8rem; color: #6f6470;">Si no creaste esta cuenta, puedes ignorar este mensaje.</p>
        </div>
      `
    };

    console.log("📩 Intentando enviar correo a:", email);
    const info = await transporter.sendMail(mailOptions);
    console.log("✅ CORREO ENVIADO CON ÉXITO:", info.response);

    res.render("login", { 
      success: "¡Registro exitoso! Te hemos enviado un correo de activación. Revisa tu bandeja de entrada o spam antes de iniciar sesión." 
    });

  } catch (err) {
    console.error("❌ ERROR DETALLADO AL ENVIAR CORREO / REGISTRAR:", err);
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