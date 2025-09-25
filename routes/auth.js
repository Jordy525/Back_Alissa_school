const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const { v4: uuidv4 } = require('uuid');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;

const { query, transaction } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');
const logger = require('../config/logger');

const router = express.Router();

// Configuration Google OAuth (optionnel)
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: `${process.env.BASE_URL}/api/auth/google/callback`
  }, async (accessToken, refreshToken, profile, done) => {
  try {
    // Vérification si l'utilisateur existe déjà avec toutes les données
    const existingUsers = await query(
      `SELECT id, email, name, avatar_url, google_id, total_points, level, 
              phone_number, age_range, classe, matieres, langue_gabonaise, 
              created_at, last_login_at
       FROM users WHERE google_id = ? OR email = ?`,
      [profile.id, profile.emails[0].value]
    );

    if (existingUsers.length > 0) {
      const user = existingUsers[0];
      // Mise à jour du google_id et last_login_at si nécessaire
      if (!user.google_id) {
        await query(
          'UPDATE users SET google_id = ?, last_login_at = NOW() WHERE id = ?',
          [profile.id, user.id]
        );
        user.google_id = profile.id;
        user.last_login_at = new Date().toISOString();
      } else {
        // Mettre à jour seulement last_login_at
        await query(
          'UPDATE users SET last_login_at = NOW() WHERE id = ?',
          [user.id]
        );
        user.last_login_at = new Date().toISOString();
      }
      return done(null, user);
    }

    // Création d'un nouvel utilisateur
    const newUser = {
      id: uuidv4(),
      email: profile.emails[0].value,
      name: profile.displayName,
      avatar_url: profile.photos[0]?.value,
      google_id: profile.id,
      total_points: 0,
      level: 1,
      phone_number: null,
      age_range: null,
      classe: null,
      matieres: null,
      langue_gabonaise: null,
      created_at: new Date().toISOString(),
      last_login_at: new Date().toISOString()
    };

    await query(
      'INSERT INTO users (id, email, name, avatar_url, google_id, total_points, level, phone_number, age_range, classe, matieres, langue_gabonaise, created_at, last_login_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())',
      [newUser.id, newUser.email, newUser.name, newUser.avatar_url, newUser.google_id, newUser.total_points, newUser.level, newUser.phone_number, newUser.age_range, newUser.classe, newUser.matieres, newUser.langue_gabonaise]
    );

    return done(null, newUser);
  } catch (error) {
    logger.logError(error, { context: 'Google OAuth' });
    return done(error, null);
  }
  }));
} else {
  console.log('⚠️  Google OAuth non configuré (GOOGLE_CLIENT_ID et GOOGLE_CLIENT_SECRET requis)');
}

// Sérialisation des utilisateurs pour les sessions
passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const users = await query(
      `SELECT id, email, name, avatar_url, google_id, total_points, level, 
              phone_number, age_range, classe, matieres, langue_gabonaise, 
              created_at, last_login_at
       FROM users WHERE id = ?`,
      [id]
    );
    
    if (users.length > 0) {
      return done(null, users[0]);
    } else {
      return done(null, false);
    }
  } catch (error) {
    return done(error, null);
  }
});

// Validation des données d'inscription
const validateRegistration = [
  body('name')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Le nom doit contenir entre 2 et 100 caractères'),
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Email invalide'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Le mot de passe doit contenir au moins 6 caractères')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Le mot de passe doit contenir au moins une minuscule, une majuscule et un chiffre')
];

// Validation des données de connexion
const validateLogin = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Email invalide'),
  body('password')
    .notEmpty()
    .withMessage('Mot de passe requis')
];

// Inscription
router.post('/register', validateRegistration, asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      error: {
        message: 'Données invalides',
        details: errors.array()
      }
    });
  }

  const { name, email, password } = req.body;

  try {
    // Vérification si l'utilisateur existe déjà
    const existingUsers = await query('SELECT id FROM users WHERE email = ?', [email]);
    if (existingUsers.length > 0) {
      return res.status(409).json({
        success: false,
        error: {
          message: 'Un compte avec cet email existe déjà'
        }
      });
    }

    // Hachage du mot de passe
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Création de l'utilisateur
    const userId = uuidv4();
    await query(
      'INSERT INTO users (id, email, password_hash, name, total_points, level, created_at) VALUES (?, ?, ?, ?, 0, 1, NOW())',
      [userId, email, passwordHash, name]
    );

    // Génération du token JWT
    const token = jwt.sign(
      { userId, email },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    // Récupération des données utilisateur
    const users = await query(
      'SELECT id, email, name, avatar_url, selected_class, total_points, level, created_at FROM users WHERE id = ?',
      [userId]
    );

    logger.logEvent('user_registered', { userId, email });

    res.status(201).json({
      success: true,
      message: 'Compte créé avec succès',
      data: {
        user: users[0],
        token
      }
    });
  } catch (error) {
    logger.logError(error, { context: 'user_registration', email });
    throw error;
  }
}));

// Connexion
router.post('/login', validateLogin, asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      error: {
        message: 'Données invalides',
        details: errors.array()
      }
    });
  }

  const { email, password } = req.body;

  try {
    // Récupération de l'utilisateur
    const users = await query(
      'SELECT id, email, password_hash, name, avatar_url, selected_class, classe, total_points, level, created_at FROM users WHERE email = ? AND deleted_at IS NULL',
      [email]
    );

    if (users.length === 0) {
      return res.status(401).json({
        success: false,
        error: {
          message: 'Email ou mot de passe incorrect'
        }
      });
    }

    const user = users[0];

    // Vérification du mot de passe avec bcrypt
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        error: {
          message: 'Email ou mot de passe incorrect'
        }
      });
    }

    // Vérifier si l'utilisateur est un administrateur dans la table admins
    const adminCheck = await query(
      'SELECT id FROM admins WHERE user_id = ? OR email = ?',
      [user.id, user.email]
    );

    // Déterminer le rôle basé sur la table admins
    const userRole = adminCheck.length > 0 ? 'admin' : 'student';

    // Mise à jour de la dernière connexion
    await query(
      'UPDATE users SET last_login_at = NOW() WHERE id = ?',
      [user.id]
    );

    // Génération du token JWT
    const token = jwt.sign(
      { userId: user.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    // Suppression du hash du mot de passe de la réponse
    delete user.password_hash;

    // Déterminer le type de redirection selon le rôle
    let redirectPath = '/dashboard';
    if (userRole === 'admin') {
      redirectPath = '/admin/dashboard';
    } else if (userRole === 'student') {
      // Pour les étudiants, vérifier s'ils ont déjà sélectionné leur classe
      if (!user.classe && !user.selected_class) {
        redirectPath = '/choose-class';
      } else {
        redirectPath = '/dashboard';
      }
    }

    logger.logEvent('user_login', { userId: user.id, email });

    res.json({
      success: true,
      message: 'Connexion réussie',
      data: {
        user: {
          ...user
        },
        token,
        redirectPath
      }
    });
  } catch (error) {
    logger.logError(error, { context: 'user_login', email });
    throw error;
  }
}));

// Connexion Google (si configuré)
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  router.get('/google', passport.authenticate('google', {
    scope: ['profile', 'email']
  }));

  // Callback Google OAuth
  router.get('/google/callback', 
    passport.authenticate('google', { failureRedirect: `${process.env.FRONTEND_URL}/login?error=google_auth_failed` }),
    asyncHandler(async (req, res) => {
      try {
        const user = req.user;
        
        logger.logger.info('🔍 [GOOGLE_CALLBACK] Utilisateur reçu:', {
          id: user.id,
          email: user.email,
          name: user.name,
          classe: user.classe,
          matieres: user.matieres,
          langue_gabonaise: user.langue_gabonaise,
          google_id: user.google_id
        });
        
        // Génération du token JWT (comme l'inscription normale)
        const token = jwt.sign(
          { userId: user.id, email: user.email },
          process.env.JWT_SECRET,
          { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
        );

        // Suppression du hash du mot de passe de la réponse
        delete user.password_hash;

        logger.logEvent('user_google_login', { userId: user.id, email: user.email });

        // Vérifier si l'utilisateur a déjà configuré sa classe, ses matières et sa langue
        const isUserConfigured = user.classe && user.matieres && user.matieres.length > 0 && user.langue_gabonaise;
        
        logger.logger.info('🔍 [GOOGLE_CALLBACK] Vérification configuration utilisateur:', {
          userId: user.id,
          classe: user.classe,
          matieres: user.matieres,
          langue_gabonaise: user.langue_gabonaise,
          isConfigured: isUserConfigured
        });
        
        if (isUserConfigured) {
          // Utilisateur déjà configuré, rediriger vers le dashboard
          logger.logEvent('user_google_redirect_dashboard', { userId: user.id, classe: user.classe });
          const redirectUrl = `${process.env.FRONTEND_URL}/auth/callback?token=${token}&user=${encodeURIComponent(JSON.stringify(user))}`;
          logger.logger.info('🔄 [GOOGLE_CALLBACK] Redirection vers dashboard:', redirectUrl);
          console.log('🔍 [GOOGLE_CALLBACK] URL complète de redirection:', redirectUrl);
          console.log('🔍 [GOOGLE_CALLBACK] Longueur URL:', redirectUrl.length);
          res.redirect(redirectUrl);
        } else {
          // Utilisateur non configuré, rediriger vers le callback pour traitement
          logger.logEvent('user_google_redirect_choose_class', { userId: user.id });
          const redirectUrl = `${process.env.FRONTEND_URL}/auth/callback?token=${token}&user=${encodeURIComponent(JSON.stringify(user))}`;
          logger.logger.info('🔄 [GOOGLE_CALLBACK] Redirection vers callback pour configuration:', redirectUrl);
          console.log('🔍 [GOOGLE_CALLBACK] URL complète de redirection:', redirectUrl);
          console.log('🔍 [GOOGLE_CALLBACK] Longueur URL:', redirectUrl.length);
          res.redirect(redirectUrl);
        }
      } catch (error) {
        logger.logError(error, { context: 'google_callback' });
        logger.logger.error('❌ [GOOGLE_CALLBACK] Erreur lors du callback:', error);
        res.redirect(`${process.env.FRONTEND_URL}/login?error=google_auth_failed`);
      }
    })
  );
} else {
  // Routes Google non disponibles
  router.get('/google', (req, res) => {
    res.status(501).json({
      success: false,
      error: {
        message: 'Google OAuth non configuré'
      }
    });
  });
  
  router.get('/google/callback', (req, res) => {
    res.status(501).json({
      success: false,
      error: {
        message: 'Google OAuth non configuré'
      }
    });
  });
}

// Rafraîchissement du token
router.post('/refresh', authenticateToken, asyncHandler(async (req, res) => {
  try {
    const user = req.user;
    
    // Génération d'un nouveau token
    const newToken = jwt.sign(
      { userId: user.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    logger.logEvent('token_refreshed', { userId: user.id });

    res.json({
      success: true,
      message: 'Token rafraîchi avec succès',
      data: {
        token: newToken
      }
    });
  } catch (error) {
    logger.logError(error, { context: 'token_refresh', userId: req.user?.id });
    throw error;
  }
}));

// Déconnexion
router.post('/logout', authenticateToken, asyncHandler(async (req, res) => {
  try {
    const userId = req.user.id;
    
    logger.logEvent('user_logout', { userId });

    res.json({
      success: true,
      message: 'Déconnexion réussie'
    });
  } catch (error) {
    logger.logError(error, { context: 'user_logout', userId: req.user?.id });
    throw error;
  }
}));

// Vérification du token
router.get('/verify', authenticateToken, asyncHandler(async (req, res) => {
  try {
    const user = req.user;
    
    res.json({
      success: true,
      message: 'Token valide',
      data: {
        user
      }
    });
  } catch (error) {
    logger.logError(error, { context: 'token_verification' });
    throw error;
  }
}));

// Route pour vérifier le statut admin
router.get('/check-admin', authenticateToken, asyncHandler(async (req, res) => {
  try {
    const userId = req.user.id;
    const userEmail = req.user.email;
    
    // Vérifier si l'utilisateur est admin
    const adminCheck = await query(
      'SELECT id FROM admins WHERE user_id = ? OR email = ?',
      [userId, userEmail]
    );
    
    const isAdmin = adminCheck.length > 0;
    
    res.json({
      success: true,
      data: {
        isAdmin
      }
    });
  } catch (error) {
    logger.logError(error, { context: 'admin_check' });
    throw error;
  }
}));

module.exports = router;
