const multer = require("multer");
const sharp = require("sharp");
const path = require("path");
const fs = require("fs"); // N'oubliez pas d'importer fs

// Configuration de Multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, "../images");
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    cb(null, `img-${Date.now()}${path.extname(file.originalname)}`);
  },
});

const upload = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) cb(null, true);
    else cb(new Error("Seules les images sont autorisées"), false);
  },
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
}).single("image"); // .single() doit être appelé ici

const optimizeImage = async (req, res, next) => {
  if (!req.file) return next();

  try {
    const inputPath = req.file.path;
    const outputPath = path.join(
      path.dirname(inputPath),
      `opt-${path.basename(inputPath)}`
    );

    await sharp(inputPath)
      .resize(800, 800, { fit: "inside" })
      .webp({ quality: 80 })
      .toFile(outputPath);

    fs.unlinkSync(inputPath); // Supprime l'original
    req.file.path = outputPath; // Met à jour le chemin

    next();
  } catch (error) {
    console.error("Erreur d'optimisation:", error);
    if (req.file?.path) fs.unlinkSync(req.file.path);
    return res.status(500).json({ error: "Échec de l'optimisation" });
  }
};

module.exports = { upload, optimizeImage };
