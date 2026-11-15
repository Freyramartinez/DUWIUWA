const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs"); // 👈 Agregado para cifrar la contraseña

const User = require("../models/User"); // 👈 Agregado para crear el usuario
const seedProducts = require("../seeders/productSeeder");
const ProductController = require("../controllers/ProductController");

const AboutController = require('../controllers/AboutController');
const MapController = require('../controllers/MapController');

const DonacionController = require('../controllers/DonacionController');
const { requireRole } = require('../middleware/auth');

// Home route
router.get("/", ProductController.getAll);

router.get('/quiens-somos', AboutController.getAboutPage);

// Contacto
const ContactController = require('../controllers/ContactController');
router.get('/contacto', ContactController.getContactPage);

// Ruta para generar el PDF de la donación
router.post('/donaciones/ticket', DonacionController.generarTicket);

// Historial de donaciones
router.post('/donaciones/registrar', DonacionController.registrar);
router.get('/donaciones/historial', requireRole('jefe'), DonacionController.historial);

// Alias para el mapa
const { getMap, getPlaces } = require('../controllers/MapController');

router.get('/mapa', getMap);
router.get('/api/places', getPlaces);

// Página de acceso (login, registro y verificación)
const AuthController = require('../controllers/AuthController');

router.get('/login', AuthController.getLoginPage);
router.post('/login', AuthController.login);
router.post('/registro', AuthController.registrar);
router.post('/logout', AuthController.logout);
router.get('/verify/:token', AuthController.verifyEmail);

// Seed route - Productos
router.get("/seed", async (req, res) => {
  try {
    await seedProducts();
    res.send("Database Seeded Successfully");
  } catch (err) {
    res.status(500).send(err.message);
  }
});

// Seed route - Cuenta inicial de Seguridad Pública
router.get("/seed-seguridad", async (req, res) => {
  try {
    const existe = await User.findOne({ email: "seguridad@womensafety.com" });
    if (existe) {
      return res.send("El usuario de Seguridad Pública ya existe.");
    }

    const hash = await bcrypt.hash("Seguridad123*", 10);
    await User.create({
      nombre: "Central Seguridad Pública",
      email: "seguridad@womensafety.com",
      password: hash,
      role: "seguridad",
      isVerified: true,
      validada: true
    });

    res.send("Usuario creado con éxito. Correo: seguridad@womensafety.com | Contraseña: Seguridad123*");
  } catch (err) {
    res.status(500).send(err.message);
  }
});

module.exports = router;