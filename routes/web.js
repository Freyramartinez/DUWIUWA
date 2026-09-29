const express = require("express");
const router = express.Router();

const seedProducts = require("../seeders/productSeeder");
const ProductController = require("../controllers/ProductController");

const AboutController = require('../controllers/AboutController');
const MapController = require('../controllers/MapController');

// Home route
router.get("/", ProductController.getAll);

router.get('/quiens-somos', AboutController.getAboutPage);

// Contacto
const ContactController = require('../controllers/ContactController');
router.get('/contacto', ContactController.getContactPage);

// Alias para el mapa (soporta tanto /mapa como /ubicacion)
const { getMap, getPlaces } = require('../controllers/MapController');

router.get('/mapa', getMap);
router.get('/api/places', getPlaces); // opcional, para futuras peticiones AJAX

// Página de acceso (login, registro y verificación)
const AuthController = require('../controllers/AuthController');

router.get('/login', AuthController.getLoginPage);
router.post('/login', AuthController.login);
router.post('/registro', AuthController.registrar);
router.post('/logout', AuthController.logout);
router.get('/verify/:token', AuthController.verifyEmail); // <--- RUTA DE ACTIVACIÓN DE CORREO

// Seed route - Renamed as requested
router.get("/seed", async (req, res) => {
  try {
    await seedProducts();
    res.send("Database Seeded Successfully");
  } catch (err) {
    res.status(500).send(err.message);
  }
});

module.exports = router;