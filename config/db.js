const dns = require("dns");
const mongoose = require("mongoose");

// Usa DNS públicos para resolver la dirección de MongoDB Atlas
dns.setServers(["8.8.8.8", "1.1.1.1"]);

const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log("MongoDB Connected");
    } catch (err) {
        console.error("MongoDB connection error:", err.message);
        throw err;
    }
};

module.exports = connectDB;