const { log } = require("console");
const Book = require("../models/book");
const fs = require("fs");

// Helper pour supprimer les fichiers
const deleteFile = (filePath) => {
  fs.unlink(filePath, (err) => {
    if (err) console.error("Erreur suppression fichier:", err);
  });
};

exports.getAllBooks = (req, res, next) => {
  Book.find()
    .then((books) => res.status(200).json(books))
    .catch((error) => res.status(500).json({ error: error.message }));
};

exports.getOneBook = (req, res, next) => {
  Book.findById(req.params.id)
    .then((book) => {
      if (!book) return res.status(404).json({ message: "Livre non trouvé" });
      res.status(200).json(book);
    })
    .catch((error) => res.status(500).json({ error: error.message }));
};

exports.getBestRating = (req, res, next) => {
  Book.find()
    .sort({ averageRating: -1 })
    .limit(3)
    .then((books) => res.status(200).json(books))
    .catch((error) => res.status(500).json({ error: error.message }));
};

exports.createBook = async (req, res) => {
  try {
    const bookData = req.body.book ? JSON.parse(req.body.book) : req.body;
    const userId = req.user.userId;

    if (!bookData.title || !bookData.author) {
      if (req.file) fs.unlinkSync(req.file.path);
      return res
        .status(400)
        .json({ message: "Le titre et l'auteur sont requis" });
    }

    let ratings = [];
    let averageRating = 0;

    if (bookData.rating) {
      const grade = Math.min(5, Math.max(0, parseInt(bookData.rating, 10)));
      ratings.push({ userId, grade });
      averageRating = grade;
    }

    if (Array.isArray(bookData.ratings) && bookData.ratings.length > 0) {
      ratings = bookData.ratings;
      const total = ratings.reduce((sum, r) => sum + r.grade, 0);
      averageRating = total / ratings.length;
    }

    const newBook = new Book({
      ...bookData,
      userId: req.user.userId,
      imageUrl: req.file
        ? `${req.protocol}://${req.get("host")}/images/${req.file.filename}`
        : null,
      ratings,
      averageRating,
    });

    const savedBook = await newBook.save();
    res.status(201).json(savedBook);
  } catch (error) {
    if (req.file) fs.unlinkSync(req.file.path);
    res.status(400).json({
      error: error.message,
      details: process.env.NODE_ENV === "development" ? error.stack : undefined,
    });
  }
};

exports.modifyBook = async (req, res, next) => {
  try {
    const book = await Book.findById(req.params.id);
    if (!book) return res.status(404).json({ message: "Livre non trouvé" });

    if (book.userId.toString() !== req.user.userId) {
      return res.status(403).json({ message: "Requête non autorisée" });
    }

    let bookData;
    let oldImagePath;

    if (req.body.book) {
      bookData = JSON.parse(req.body.book);
    } else {
      bookData = req.body;
    }

    if (req.file) {
      oldImagePath = book.imageUrl?.split("/images/")[1];
      bookData.imageUrl = `${req.protocol}://${req.get("host")}/images/${
        req.file.filename
      }`;
    }

    const updatedBook = await Book.findByIdAndUpdate(
      req.params.id,
      { ...bookData, _id: req.params.id },
      { new: true }
    );

    if (oldImagePath) {
      deleteFile(`images/${oldImagePath}`);
    }

    res.status(200).json(updatedBook);
  } catch (error) {
    if (req.file) deleteFile(req.file.path);
    res.status(400).json({ error: error.message });
  }
};

exports.deleteBook = async (req, res, next) => {
  try {
    const book = await Book.findById(req.params.id);
    if (!book) return res.status(404).json({ message: "Livre non trouvé" });

    if (book.userId.toString() !== req.user.userId) {
      return res.status(403).json({ message: "Requête non autorisée" });
    }

    const filename = book.imageUrl?.split("/images/")[1];
    await Book.deleteOne({ _id: req.params.id });

    if (filename) {
      deleteFile(`images/${filename}`);
    }

    res.status(200).json({ message: "Livre supprimé !" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.rateBook = async (req, res) => {
  try {
    const { rating } = req.body;
    const userId = req.user.userId;

    // Validation de la note
    if (rating < 0 || rating > 5) {
      return res
        .status(400)
        .json({ message: "La note doit être entre 0 et 5" });
    }

    const book = await Book.findById(req.params.id);
    if (!book) return res.status(404).json({ message: "Livre non trouvé" });

    // Empêche l'auteur de noter son propre livre
    if (book.userId.toString() === userId) {
      return res
        .status(401)
        .json({ message: "Vous ne pouvez pas noter votre propre livre" });
    }

    // Vérifie si l'utilisateur a déjà noté
    const existingRating = book.ratings.find(
      (r) => r.userId.toString() === userId
    );
    if (existingRating) {
      return res.status(400).json({ message: "Vous avez déjà noté ce livre" });
    }

    // Ajoute la note et calcule la moyenne
    book.ratings.push({ userId, grade: rating });
    book.averageRating =
      book.ratings.reduce((sum, r) => sum + r.grade, 0) / book.ratings.length;

    const updatedBook = await book.save();
    res.status(200).json(updatedBook);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
