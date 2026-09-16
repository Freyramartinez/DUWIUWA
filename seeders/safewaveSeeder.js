const mongoose = require("mongoose");
const Product = require("../models/Product");
require("dotenv").config();

const mongoURI = process.env.MONGO_URI || "mongodb://localhost:27017/duwiduwa";

const serviciosSafeWave = [
  {
    name: "Kit Piloto SafeWave Tlahuelilpan",
    category: "Paquete Piloto",
    description: "Infraestructura inicial a costo cero de mantenimiento en la nube para la Instancia de la Mujer.",
    price: 0,
    image: "https://via.placeholder.com/150",
    specs: [
      "1 Antena Base Gateway LoRaWAN",
      "5 a 10 Botones de pánico LilyGO T-Beam",
      "Integración directa con Firebase Realtime Database"
    ]
  },
  {
    name: "Estudio de Cobertura RF",
    category: "Consultoría Técnica",
    description: "Mapeo topográfico para detectar zonas silenciosas y ubicar antenas estratégicamente.",
    price: 0,
    image: "https://via.placeholder.com/150",
    specs: [
      "Análisis de terreno y elevación",
      "Identificación de puntos ciegos sin señal celular"
    ]
  },
  {
    name: "Dashboard Operacional React",
    category: "Software de Monitoreo",
    description: "Panel de control en tiempo real para la recepción de alertas en la Instancia de la Mujer.",
    price: 0,
    image: "https://via.placeholder.com/150",
    specs: [
      "Mapa interactivo con coordenadas GPS al segundo",
      "Alertas sonoras y visuales automáticas"
    ]
  }
];

const seedDB = async () => {
  try {
    await mongoose.connect(mongoURI);
    // Agrega los servicios sin borrar lo que ya existe en la BD
    await Product.insertMany(serviciosSafeWave);
    console.log("¡Servicios de SafeWave cargados exitosamente sin alterar datos existentes!");
    process.exit();
  } catch (error) {
    console.error("Error al ejecutar el seeder:", error);
    process.exit(1);
  }
};

seedDB();