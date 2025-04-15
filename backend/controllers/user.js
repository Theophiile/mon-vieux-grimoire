const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const User = require("../models/User");

exports.signup = async (req, res) => {
  try {
    // 1. Validation des données
    if (!req.body.email || !req.body.password) {
      return res.status(400).json({ message: "Email et mot de passe requis" });
    }

    // 2. Vérification de l'email existant
    const existingUser = await User.findOne({ email: req.body.email });
    if (existingUser) {
      return res.status(400).json({ message: "Cet email est déjà utilisé" });
    }

    // 3. Hachage du mot de passe
    const hash = await bcrypt.hash(req.body.password, 10);

    // 4. Création de l'utilisateur
    const user = new User({
      email: req.body.email.toLowerCase().trim(),
      password: hash,
    });

    await user.save();

    // 5. Réponse adaptée au frontend
    res.status(201).json({
      message: "Utilisateur créé avec succès",
      userId: user._id,
    });
  } catch (error) {
    console.error("Erreur lors de l'inscription:", error);
    res.status(500).json({ message: "Erreur serveur lors de l'inscription" });
  }
};

exports.login = async (req, res) => {
  try {
    // 1. Validation des données
    if (!req.body.email || !req.body.password) {
      return res.status(400).json({ message: "Email et mot de passe requis" });
    }

    // 2. Recherche de l'utilisateur
    const user = await User.findOne({
      email: req.body.email.toLowerCase().trim(),
    });
    if (!user) {
      return res.status(401).json({ message: "Identifiants incorrects" });
    }

    // 3. Comparaison du mot de passe
    const validPassword = await bcrypt.compare(
      req.body.password,
      user.password
    );
    if (!validPassword) {
      return res.status(401).json({ message: "Identifiants incorrects" });
    }

    // 4. Génération du token
    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, {
      expiresIn: "24h",
    });

    // 5. Réponse adaptée au frontend
    res.status(200).json({
      userId: user._id,
      token,
      expiresIn: 86400,
    });
  } catch (error) {
    console.error("Erreur lors de la connexion:", error);
    res.status(500).json({ message: "Erreur serveur lors de la connexion" });
  }
};

// Nouvelle fonction pour récupérer le profil utilisateur
exports.getUserProfile = async (req, res) => {
  try {
    const userId = req.user.userId;
    const user = await User.findById(userId).select("-password");

    if (!user) {
      return res.status(404).json({ message: "Utilisateur non trouvé" });
    }

    res.status(200).json({
      email: user.email,
      profileImage: user.profileImage || null,
      userId: user._id,
    });
  } catch (error) {
    console.error("Erreur lors de la récupération du profil:", error);
    res
      .status(500)
      .json({ message: "Erreur serveur lors de la récupération du profil" });
  }
};

// Nouvelle fonction pour mettre à jour le profil utilisateur
exports.updateProfile = async (req, res) => {
  try {
    const userId = req.user.userId;

    // Vérifier si l'utilisateur existe
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "Utilisateur non trouvé" });
    }

    // Mettre à jour l'image de profil si elle est fournie
    if (req.file) {
      user.profileImage = `${req.protocol}://${req.get("host")}/images/${
        req.file.filename
      }`;
      await user.save();
    }

    res.status(200).json({
      message: "Profil mis à jour avec succès",
      profileImage: user.profileImage || null,
    });
  } catch (error) {
    console.error("Erreur lors de la mise à jour du profil:", error);
    res
      .status(500)
      .json({ message: "Erreur serveur lors de la mise à jour du profil" });
  }
};
