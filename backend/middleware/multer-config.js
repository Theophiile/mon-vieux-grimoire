const multer = require("multer");
const sharp = require("sharp");
const path = require("path");

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "images");
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + ".webp");
  },
});

const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith("image/")) {
    cb(null, true);
  } else {
    cb(new Error("Seules les images sont autorisées !"), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB max
  },
}).single("image");

const optimizeImage = async (req, res, next) => {
  if (!req.file) return next();

  try {
    const outputPath = path.join("images", req.file.filename);
    await sharp(req.file.path)
      .resize(800, 800, {
        fit: "inside",
        withoutEnlargement: true,
      })
      .webp({ quality: 80 })
      .toFile(outputPath);

    // Supprime l'original et garde seulement l'optimisé
    fs.unlinkSync(req.file.path);
    req.file.path = outputPath;

    next();
  } catch (err) {
    next(err);
  }
};

module.exports = { upload, optimizeImage };
