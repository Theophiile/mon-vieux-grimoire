const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const { upload, optimizeImage } = require("../middleware/multer-config");
const bookCtrl = require("../controllers/book");

// Route POST corrigée
router.post(
  "/",
  auth,
  (req, res, next) => {
    upload(req, res, (err) => {
      if (err) return next(err);
      next();
    });
  },
  optimizeImage,
  bookCtrl.createBook
);

// Autres routes...
router.get("/", bookCtrl.getAllBooks);
router.get("/bestrating", bookCtrl.getBestRating);
router.get("/:id", bookCtrl.getOneBook);
router.put("/:id", auth, upload, optimizeImage, bookCtrl.modifyBook);
router.delete("/:id", auth, bookCtrl.deleteBook);
router.post("/:id/rating", auth, bookCtrl.rateBook);

module.exports = router;
