const { query } = require('../config/database');
const logger = require('../config/logger');

// Middleware d'authentification simple pour le frontend
const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({
        success: false,
        error: {
          message: 'Token d\'authentification requis'
        }
      });
    }

    // Décoder le token (JWT ou base64 simple)
    let userId;
    try {
      if (token.includes('.')) {
        // Token JWT
        const jwt = require('jsonwebtoken');
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        userId = decoded.userId;
      } else {
        // Token base64 simple (format: userId:timestamp en base64)
        const decoded = Buffer.from(token, 'base64').toString('utf8');
        const parts = decoded.split(':');
        userId = parts[0];
      }
    } catch (error) {
      return res.status(401).json({
        success: false,
        error: {
          message: 'Token invalide'
        }
      });
    }

    // Récupération de l'utilisateur depuis la base de données
    const users = await query(
      `SELECT id, email, name, phone_number, age_range, classe, matieres, 
              langue_gabonaise, total_points, level, google_id, created_at, last_login_at 
       FROM users WHERE id = ? AND deleted_at IS NULL`,
      [userId]
    );

    if (users.length === 0) {
      return res.status(401).json({
        success: false,
        error: {
          message: 'Utilisateur non trouvé'
        }
      });
    }

    const user = users[0];
    
    // Ajout de l'utilisateur à la requête
    req.user = {
      id: user.id,
      email: user.email,
      name: user.name,
      phoneNumber: user.phone_number,
      ageRange: user.age_range,
      classe: user.classe,
      matieres: user.matieres ? JSON.parse(user.matieres) : [],
      langueGabonaise: user.langue_gabonaise,
      totalPoints: user.total_points,
      level: user.level,
      googleId: user.google_id,
      createdAt: user.created_at,
      lastLoginAt: user.last_login_at
    };

    next();
  } catch (error) {
    logger.logError(error, { middleware: 'simpleAuth' });
    
    return res.status(500).json({
      success: false,
      error: {
        message: 'Erreur d\'authentification'
      }
    });
  }
};

// Middleware pour vérifier si l'utilisateur a sélectionné sa classe
const requireClassSelection = (req, res, next) => {
  if (!req.user.classe) {
    return res.status(400).json({
      success: false,
      error: {
        message: 'Sélection de classe requise',
        code: 'CLASS_SELECTION_REQUIRED'
      }
    });
  }
  next();
};

module.exports = {
  authenticateToken,
  requireClassSelection
};

