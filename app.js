const express = require("express");
const path = require("path");
const app = express();


const session = require("express-session");

app.use(session({
  secret: "cambia-esto-por-una-frase-larga-y-secreta",
  resave: false,
  saveUninitialized: false,
}));

app.use((req, res, next) => {
  res.locals.user = req.session.user || null;
  next();
});

require("dotenv").config();

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(express.static("public"));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const connectDB = require("./config/db");

app.use("/", require("./routes/web"));

const PORT = process.env.PORT || 3000;

const startServer = async () => {
    try {
        await connectDB();

        app.listen(PORT, () => {
            console.log(`Server Running on ${PORT}`);
        });
    } catch (err) {
        console.error("No se pudo iniciar la aplicación:", err.message);
    }
};

startServer();


