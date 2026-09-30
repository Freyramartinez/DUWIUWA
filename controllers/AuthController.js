const bcrypt = require("bcryptjs");
const User = require("../models/User");
const { vincularPorCorreo } = require("../utils/vincularFicha");
const { emitirCodigo, avisarNovedades } = require("../utils/verificacion");

const destinos = { jefe: "/jefe", psicologa: "/psicologa", victima: "/victima" };
const str = v => (typeof v === "string" ? v.trim() : "");

// GET /login
exports.getLoginPage = (req, res) => {
  res.render("login", { error: null });
};

// POST /registro  (público: siempre crea una cuenta de víctima)
exports.registrar = async (req, res) => {
  try {
    const nombre = str(req.body.nombre);
    const correo = str(req.body.email).toLowerCase();
    const password = typeof req.body.password === "string" ? req.body.password : "";
    const password2 = typeof req.body.password2 === "string" ? req.body.password2 : "";

    if (!nombre || !correo || !password || !password2) {
      return res.render("login", { error: "Completa todos los campos." });
    }
    if (password !== password2) {
      return res.render("login", { error: "Las contraseñas no coinciden." });
    }
    if (password.length < 8) {
      return res.render("login", { error: "La contraseña debe tener al menos 8 caracteres." });
    }

    let usuario = await User.findOne({ email: correo });
    if (usuario && (usuario.isVerified || usuario.role !== "victima")) {
      return res.render("login", { error: "Ese correo ya está registrado." });
    }

    const hash = await bcrypt.hash(password, 10);
    if (usuario) {
      // Cuenta SIN verificar: se reemplaza. Así nadie puede dejar una cuenta "preparada"
      // con una contraseña que conoce en el correo de otra persona.
      usuario.nombre = nombre;
      usuario.password = hash;
    } else {
      usuario = new User({ nombre, email: correo, password: hash, role: "victima", isVerified: false });
    }

    const enviado = await emitirCodigo(usuario);   // guarda la cuenta, crea el código y lo envía
    req.session.codigoEnviadoAt = Date.now();      // arranca la cuenta regresiva del botón "Enviar código nuevo"
    req.session.pendingEmail = correo;
    res.redirect("/verificar" + (enviado ? "" : "?envio=fallo"));

  } catch (err) {
    console.error("❌ ERROR GENERAL EN REGISTRO:", err);
    res.render("login", { error: "Ocurrió un error al procesar el registro. Intenta de nuevo." });
  }
};

// GET /verify/:token  (enlace antiguo: se conserva para correos ya enviados)
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

    const vinculadas = await vincularPorCorreo(usuario);
    if (vinculadas > 0) avisarNovedades(usuario, req);

    res.render("login", { success: "¡Tu correo ha sido verificado correctamente! Ya puedes iniciar sesión." });
  } catch (err) {
    console.error(err);
    res.render("login", { error: "Error al verificar el correo." });
  }
};

// POST /login
exports.login = async (req, res) => {
  try {
    const email = str(req.body.email).toLowerCase();
    const password = typeof req.body.password === "string" ? req.body.password : "";

    const usuario = await User.findOne({ email });
    if (!usuario) {
      return res.render("login", { error: "Correo o contraseña incorrectos." });
    }

    const coincide = await bcrypt.compare(password, usuario.password);
    if (!coincide) {
      return res.render("login", { error: "Correo o contraseña incorrectos." });
    }

    // Sin verificar: la llevamos a escribir su código (o a pedir uno nuevo)
    if (!usuario.isVerified) {
      req.session.pendingEmail = usuario.email;
      return res.redirect("/verificar?aviso=pendiente");
    }

    // Una psicóloga no entra hasta que el jefe la valide
    if (usuario.role === "psicologa" && !usuario.validada) {
      return res.render("login", { error: "Tu cuenta aún no ha sido validada por la jefa de área." });
    }

    // Por si la psicóloga registró su ficha después de que ella se verificó
    await vincularPorCorreo(usuario);

    req.session.user = {
      id: usuario._id,
      nombre: usuario.nombre,
      email: usuario.email,
      role: usuario.role,
      mustChangePassword: !!usuario.mustChangePassword
    };

    if (usuario.mustChangePassword) return res.redirect("/cambiar-password");
    res.redirect(destinos[usuario.role] || "/");

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