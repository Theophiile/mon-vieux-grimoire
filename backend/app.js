require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const path = require("path");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const cors = require("cors");

// Vérification des variables d'environnement
if (
  !process.env.DB_USER ||
  !process.env.DB_PASS ||
  !process.env.DB_HOST ||
  !process.env.DB_NAME
) {
  console.error("ERREUR: Variables MongoDB manquantes dans le fichier .env");
  process.exit(1);
}

// Routes
const bookRoutes = require("./routes/book");
const userRoutes = require("./routes/user");

// Connexion MongoDB avec timeout
const MONGODB_URI = `mongodb+srv://${process.env.DB_USER}:${encodeURIComponent(
  process.env.DB_PASS
)}@${process.env.DB_HOST}/${process.env.DB_NAME}?retryWrites=true&w=majority`;

mongoose
  .connect(MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    serverSelectionTimeoutMS: 5000, // 5 secondes timeout
    socketTimeoutMS: 45000, // 45 secondes timeout
  })
  .then(() => console.log("✅ Connexion à MongoDB réussie !"))
  .catch((err) => {
    console.error("❌ Erreur de connexion MongoDB :", err.message);
    console.log(
      "ℹ URI utilisée :",
      MONGODB_URI.replace(process.env.DB_PASS, "*****")
    );
  });

const app = express();

// Middlewares de sécurité
app.use(helmet());
app.use(express.json());

// Configuration CORS pour le front-end
app.use(
  cors({
    origin: process.env.FRONTEND_URL,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })
);

// Limiteur de requêtes
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limite chaque IP à 100 requêtes par fenêtre
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);

// Gestion des images
app.use(
  "/images",
  (req, res, next) => {
    res.setHeader("Cross-Origin-Resource-Policy", "cross-origin"); // 👈 important
    next();
  },
  express.static(path.join(__dirname, "images"))
);

// Routes
app.use("/api/books", bookRoutes);
app.use("/api/auth", userRoutes);

// Middleware pour les erreurs 404
app.use((req, res) => {
  res.status(404).json({ message: "Endpoint non trouvé" });
});

// Middleware de gestion des erreurs
app.use((err, req, res, next) => {
  console.error("Erreur serveur :", err.stack);
  res.status(500).json({ message: "Erreur interne du serveur" });
});

module.exports = app;
