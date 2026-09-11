const express = require("express");
const path = require("path");
const app = express();

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(express.static("public"));

require("dotenv").config();

const connectDB = require("./config/db");
connectDB();

app.use(express.json());

app.use("/", require("./routes/web"));

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`Server Running on ${PORT}`);
});
