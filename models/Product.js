const mongoose = require("mongoose");

const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    description: String,
    price: Number,
    image: String,
    category: { type: String, default: "General" },
    specs: [String],
  },
  { timestamps: true }
);

module.exports = mongoose.model("Product", productSchema);
