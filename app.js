require("dotenv").config(); // Carga las variables al inicio

const express = require("express");
const path = require("path");
const app = express();
const session = require("express-session");
const connectDB = require("./config/db");
const seguridadService = require("./utils/seguridadService");

// Railway está detrás de un proxy: necesario para que req.protocol sea "https"
app.set("trust proxy", 1);

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(express.static("public"));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(session({
  secret: process.env.SESSION_SECRET || "cambia-esto-por-una-frase-larga-y-secreta",
  resave: false,
  saveUninitialized: false,
}));

app.use((req, res, next) => {
  res.locals.user = req.session.user || null;
  next();
});

// TEMPORAL: solo para ver el diseño (borrar después)
app.get('/preview/victima',   (req, res) => res.render('victima'));
app.get('/preview/psicologa', (req, res) => res.render('psicologa'));
app.get('/preview/jefe',      (req, res) => res.render('jefe'));

// Rutas
app.use("/", require("./routes/panelRoutes"));
app.use("/", require("./routes/web"));

const PORT = process.env.PORT || 3000;

const startServer = async () => {
  try {
    await connectDB();
    seguridadService.start(); // 👈 ENCIENDE MQTT, DESCIFRADO AES Y SSE

    app.listen(PORT, () => {
      console.log(`Server Running on ${PORT}`);
    });
  } catch (err) {
    console.error("No se pudo iniciar la aplicación:", err.message);
  }
};

startServer();