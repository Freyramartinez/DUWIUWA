const express = require("express");
const router = express.Router();

const seedProducts = require("../seeders/productSeeder");
const ProductController = require("../controllers/ProductController");

// Home route
router.get("/", ProductController.getAll);

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
