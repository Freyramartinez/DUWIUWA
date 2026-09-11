const Product = require("../models/Product");

async function seedProducts() {
  await Product.deleteMany({});
  await Product.insertMany([
    { name: "iPhone 16 Pro", description: "Apple Smartphone", price: 1200, image: "iphone.jpg" },
    { name: "Samsung S26", description: "Samsung Flagship", price: 1100, image: "samsung.jpg" },
    { name: "MacBook Pro M5", description: "Apple Laptop", price: 2500, image: "macbook.jpg" },
    { name: "AirPods Pro", description: "Wireless Earbuds", price: 299, image: "airpods.jpg" },
    { name: "Apple Watch", description: "Smart Watch", price: 499, image: "watch.jpg" }
  ]);
  console.log("Products Seeded");
}

module.exports = seedProducts;
