const bcrypt = require("bcryptjs");
const User = require("../models/User");

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

    const nuevoUsuario = await User.create({
      nombre,
      email,
      password: hash,
    });

    req.session.user = {
      id: nuevoUsuario._id,
      nombre: nuevoUsuario.nombre,
      email: nuevoUsuario.email,
    };

    res.redirect("/");

  } catch (err) {
    console.error(err);
    res.render("login", { error: "Ocurrió un error. Intenta de nuevo." });
  }
};

// POST /login
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const usuario = await User.findOne({ email: email.toLowerCase() });

    // Mensaje genérico: no revela si falló el correo o la contraseña
    if (!usuario) {
      return res.render("login", { error: "Correo o contraseña incorrectos." });
    }

    const coincide = await bcrypt.compare(password, usuario.password);

    if (!coincide) {
      return res.render("login", { error: "Correo o contraseña incorrectos." });
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