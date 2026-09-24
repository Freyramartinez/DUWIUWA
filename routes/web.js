const express = require("express");
const router = express.Router();

const seedProducts = require("../seeders/productSeeder");
const ProductController = require("../controllers/ProductController");

const AboutController = require('../controllers/AboutController');
const MapController = require('../controllers/MapController');

// Home route
router.get("/", ProductController.getAll);

router.get('/quienes-somos', AboutController.getAboutPage);

// Alias para el mapa (soporta tanto /mapa como /ubicacion)
router.get('/mapa', MapController.getMapPage);
router.get('/ubicacion', MapController.getMapPage);

// Página de acceso (login y registro)
router.get('/login', (req, res) => {
  res.render('login', { error: null });
});

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
