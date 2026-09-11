const Product = require("../models/Product");

exports.getAll = async (req, res) => {
  try {
    const products = await Product.find();
    res.render("index", { products });
  } catch (err) {
    res.status(500).send(err.message);
  }
};
