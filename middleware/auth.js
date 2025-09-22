const jwt = require('jsonwebtoken');
const { query } = require('../config/database');
const logger = require('../config/logger');

// Middleware d'authentification JWT
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

    // Vérification du token (JWT ou base64)
    let userId;
    try {
      if (token.includes('.')) {
        // Token JWT
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
      'SELECT id, email, name, avatar_url, classe, selected_class, total_points, level, google_id, created_at, last_login_at FROM users WHERE id = ?',
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
    
    // Vérification si l'utilisateur est actif (pas de suppression)
    if (user.deleted_at) {
      return res.status(401).json({
        success: false,
        error: {
          message: 'Compte désactivé'
        }
      });
    }

    // Ajout de l'utilisateur à la requête
    req.user = {
      id: user.id,
      email: user.email,
      name: user.name,
      avatarUrl: user.avatar_url,
      selectedClass: user.classe || user.selected_class, // Utiliser classe en priorité
      totalPoints: user.total_points,
      level: user.level,
      googleId: user.google_id,
      // plus de rôle, l'admin est géré via table admins
      createdAt: user.created_at,
      lastLoginAt: user.last_login_at
    };

    next();
  } catch (error) {
    logger.logError(error, { middleware: 'authenticateToken' });
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        error: {
          message: 'Token invalide'
        }
      });
    }
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        error: {
          message: 'Token expiré'
        }
      });
    }

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
  if (!req.user.selectedClass) {
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

// Middleware pour vérifier les permissions (admin, etc.)
const requireRole = (roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: {
          message: 'Authentification requise'
        }
      });
    }

    // Pour l'instant, tous les utilisateurs ont le même rôle
    // À étendre selon les besoins futurs
    const userRole = req.user.role || 'student';
    
    if (!roles.includes(userRole)) {
      return res.status(403).json({
        success: false,
        error: {
          message: 'Permissions insuffisantes'
        }
      });
    }

    next();
  };
};

// Middleware spécifique pour les administrateurs
const requireAdmin = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: {
          message: 'Authentification requise'
        }
      });
    }

    // Récupérer le rôle de l'utilisateur depuis la base de données
    // Vérifier dans la table admins plutôt que le champ role
    const admins = await query(
      'SELECT id FROM admins WHERE user_id = ? LIMIT 1',
      [req.user.id]
    );

    if (!admins || admins.length === 0) {
      return res.status(401).json({
        success: false,
        error: {
          message: 'Accès administrateur requis'
        }
      });
    }
    // Marquer admin
    req.user.role = 'admin';
    next();
  } catch (error) {
    logger.logError(error, { middleware: 'requireAdmin' });
    return res.status(500).json({
      success: false,
      error: {
        message: 'Erreur de vérification des permissions'
      }
    });
  }
};

// Middleware pour vérifier la propriété d'une ressource
const requireOwnership = (resourceUserIdField = 'user_id') => {
  return (req, res, next) => {
    const resourceUserId = req.params[resourceUserIdField] || req.body[resourceUserIdField];
    
    if (resourceUserId && resourceUserId !== req.user.id) {
      return res.status(403).json({
        success: false,
        error: {
          message: 'Accès non autorisé à cette ressource'
        }
      });
    }

    next();
  };
};

// Middleware optionnel d'authentification (ne bloque pas si pas de token)
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (token) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const users = await query(
        'SELECT id, email, name, avatar_url, selected_class, total_points, level FROM users WHERE id = ?',
        [decoded.userId]
      );

      if (users.length > 0) {
        req.user = users[0];
      }
    }

    next();
  } catch (error) {
    // En cas d'erreur, on continue sans utilisateur
    next();
  }
};

module.exports = {
  authenticateToken,
  requireClassSelection,
  requireRole,
  requireAdmin,
  requireOwnership,
  optionalAuth
};


