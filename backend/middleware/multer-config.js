const multer = require("multer");
const sharp = require("sharp");
const path = require("path");
const fs = require("fs");

// 📁 Dossier de destination des images uploadées
const imagesDir = path.join(__dirname, "../images");

// 📦 Configuration de stockage avec Multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Création du dossier s'il n'existe pas
    if (!fs.existsSync(imagesDir)) {
      fs.mkdirSync(imagesDir, { recursive: true });
    }
    cb(null, imagesDir);
  },
  filename: (req, file, cb) => {
    // Utilisation de l'extension d'origine pour le fichier temporaire
    const uniqueName = `img-${Date.now()}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  },
});

// 📤 Middleware Multer configuré
const upload = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    // Accepter uniquement les fichiers image
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Seules les images sont autorisées"), false);
    }
  },
  limits: { fileSize: 5 * 1024 * 1024 }, // Limite de 5MB
}).single("image");

// 🧠 Middleware Sharp pour optimiser les images
const optimizeImage = async (req, res, next) => {
  if (!req.file) return next(); // Pas d'image, on continue

  try {
    const inputPath = req.file.path;

    // Génère le nom de fichier optimisé en .webp
    const outputFilename =
      "opt-" + path.basename(inputPath, path.extname(inputPath)) + ".webp";
    const outputPath = path.join(imagesDir, outputFilename);

    // 🔧 Optimisation avec Sharp
    await sharp(inputPath)
      .resize(800, 800, { fit: "inside" }) // Redimensionne si nécessaire
      .webp({ quality: 80 }) // Convertit en WebP
      .toFile(outputPath);

    // Supprime l'image originale (non optimisée)
    fs.unlinkSync(inputPath);

    // Mise à jour du chemin dans req.file pour la suite du traitement
    req.file.path = outputPath;
    req.file.filename = outputFilename;

    next();
  } catch (error) {
    console.error("❌ Erreur d'optimisation:", error);
    if (req.file?.path) fs.unlinkSync(req.file.path); // Nettoyage en cas d'erreur
    return res
      .status(500)
      .json({ error: "Échec de l'optimisation de l'image" });
  }
};

module.exports = { upload, optimizeImage };
