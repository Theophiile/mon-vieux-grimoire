const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const { upload, optimizeImage } = require("../middleware/multer-config");
const bookCtrl = require("../controllers/book");

router.post(
  "/",
  auth,
  (req, res, next) => {
    if (req.headers["content-type"]?.startsWith("multipart/form-data")) {
      return upload.single("image")(req, res, () => {
        bookCtrl.createBook(req, res, next);
      });
    }
    next();
  },
  bookCtrl.createBook
);

router.get("/", bookCtrl.getAllBooks);
router.get("/bestrating", bookCtrl.getBestRating);
router.get("/:id", bookCtrl.getOneBook);
router.post("/", auth, upload, optimizeImage, bookCtrl.createBook);
router.put("/:id", auth, upload, optimizeImage, bookCtrl.modifyBook);
router.delete("/:id", auth, bookCtrl.deleteBook);
router.post("/:id/rating", auth, bookCtrl.rateBook);

module.exports = router;
