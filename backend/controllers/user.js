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
      email: req.body.email.toLowerCase().trim(), // Normalisation de l'email
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
      return res.status(401).json({ message: "Identifiants incorrects" }); // Message générique pour la sécurité
    }

    // 3. Comparaison du mot de passe
    const validPassword = await bcrypt.compare(
      req.body.password,
      user.password
    );
    if (!validPassword) {
      return res.status(401).json({ message: "Identifiants incorrects" }); // Même message que ci-dessus
    }

    // 4. Génération du token
    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, {
      expiresIn: "24h",
    });

    // 5. Réponse adaptée au frontend
    res.status(200).json({
      userId: user._id,
      token,
      expiresIn: 86400, // 24h en secondes
    });
  } catch (error) {
    console.error("Erreur lors de la connexion:", error);
    res.status(500).json({ message: "Erreur serveur lors de la connexion" });
  }
};
