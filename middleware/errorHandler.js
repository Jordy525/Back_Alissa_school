const logger = require('../config/logger');

// Middleware de gestion d'erreurs global
const errorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;

  // Log de l'erreur
  logger.logError(err, {
    url: req.originalUrl,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    userId: req.user?.id || null
  });

  // Erreur de validation Mongoose
  if (err.name === 'ValidationError') {
    const message = Object.values(err.errors).map(val => val.message).join(', ');
    error = {
      message: 'Erreur de validation',
      details: message,
      statusCode: 400
    };
  }

  // Erreur de clé dupliquée MySQL
  if (err.code === 'ER_DUP_ENTRY') {
    const field = err.sqlMessage.match(/for key '(.+?)'/)?.[1] || 'champ';
    error = {
      message: `Cette ${field} est déjà utilisée`,
      statusCode: 409
    };
  }

  // Erreur de contrainte de clé étrangère
  if (err.code === 'ER_NO_REFERENCED_ROW_2') {
    error = {
      message: 'Référence invalide',
      statusCode: 400
    };
  }

  // Erreur de connexion à la base de données
  if (err.code === 'ECONNREFUSED' || err.code === 'ER_ACCESS_DENIED_ERROR') {
    error = {
      message: 'Erreur de connexion à la base de données',
      statusCode: 503
    };
  }

  // Erreur JWT
  if (err.name === 'JsonWebTokenError') {
    error = {
      message: 'Token invalide',
      statusCode: 401
    };
  }

  if (err.name === 'TokenExpiredError') {
    error = {
      message: 'Token expiré',
      statusCode: 401
    };
  }

  // Erreur de validation des entrées
  if (err.type === 'entity.parse.failed') {
    error = {
      message: 'Format JSON invalide',
      statusCode: 400
    };
  }

  // Erreur de limite de taille
  if (err.code === 'LIMIT_FILE_SIZE') {
    error = {
      message: 'Fichier trop volumineux',
      statusCode: 413
    };
  }

  // Erreur de limite de requêtes
  if (err.status === 429) {
    error = {
      message: 'Trop de requêtes, veuillez réessayer plus tard',
      statusCode: 429
    };
  }

  // Erreur par défaut
  const statusCode = error.statusCode || err.statusCode || 500;
  const message = error.message || 'Erreur interne du serveur';

  // Réponse d'erreur
  const errorResponse = {
    success: false,
    error: {
      message,
      ...(process.env.NODE_ENV === 'development' && {
        stack: err.stack,
        details: error.details
      })
    },
    timestamp: new Date().toISOString(),
    path: req.originalUrl
  };

  // Log spécifique pour les erreurs 5xx
  if (statusCode >= 500) {
    logger.logError(err, {
      url: req.originalUrl,
      method: req.method,
      userId: req.user?.id || null,
      severity: 'high'
    });
  }

  res.status(statusCode).json(errorResponse);
};

// Middleware pour les routes non trouvées
const notFound = (req, res, next) => {
  const error = new Error(`Route non trouvée - ${req.originalUrl}`);
  error.statusCode = 404;
  next(error);
};

// Middleware pour les erreurs asynchrones
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = {
  errorHandler,
  notFound,
  asyncHandler
};


