const express = require('express');
const { body, validationResult } = require('express-validator');
const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const { query, transaction } = require('../config/database');
const { authenticateToken } = require('../middleware/simpleAuth');
const { asyncHandler } = require('../middleware/errorHandler');
const logger = require('../config/logger');

const router = express.Router();

// Validation pour l'inscription
const validateRegistration = [
  body('name')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Le nom doit contenir entre 2 et 100 caractères'),
  body('email')
    .optional()
    .isEmail()
    .withMessage('Email invalide'),
  body('phoneNumber')
    .trim()
    .isLength({ min: 8, max: 20 })
    .withMessage('Numéro de téléphone invalide'),
  body('ageRange')
    .isIn(['< 13 ans', '13-17 ans', '18+ ans'])
    .withMessage('Tranche d\'âge invalide'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Le mot de passe doit contenir au moins 6 caractères')
];

// Validation pour la sélection de classe
const validateClassSelection = [
  body('classe')
    .isIn(['6eme', '5eme', '4eme', '3eme', 'seconde', 'premiere', 'terminale'])
    .withMessage('Classe invalide')
];

// Validation pour la sélection de matières
const validateSubjectSelection = [
  body('matieres')
    .isArray({ min: 1 })
    .withMessage('Au moins une matière doit être sélectionnée'),
  body('matieres.*')
    .isString()
    .isLength({ min: 1, max: 50 })
    .withMessage('ID de matière invalide')
];

// Validation pour la sélection de langue
const validateLanguageSelection = [
  body('langueGabonaise')
    .isIn(['fang', 'myene', 'punu', 'nzebi', 'kota'])
    .withMessage('Langue gabonaise invalide')
];

// Inscription utilisateur
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

  try {
    const { name, email, phoneNumber, ageRange, password } = req.body;
    const userId = uuidv4();

    // Vérifier si l'email existe déjà (si fourni)
    if (email) {
      const existingUsers = await query(
        'SELECT id FROM users WHERE email = ? AND deleted_at IS NULL',
        [email]
      );
      if (existingUsers.length > 0) {
        return res.status(400).json({
          success: false,
          error: {
            message: 'Un compte avec cet email existe déjà'
          }
        });
      }
    }

    // Hasher le mot de passe avec bcrypt
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Créer l'utilisateur
    await query(
      `INSERT INTO users (id, name, email, phone_number, age_range, password_hash, 
                         total_points, level, classe, matieres, langue_gabonaise, 
                         created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, 0, 1, NULL, '[]', NULL, NOW(), NOW())`,
      [userId, name, email, phoneNumber, ageRange, passwordHash] // Mot de passe hashé
    );

    // Générer un token JWT
    const token = jwt.sign(
      { userId, email: email || null },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    logger.logEvent('user_registered', { userId, name, email });

    res.json({
      success: true,
      message: 'Compte créé avec succès',
      data: {
        user: {
          id: userId,
          name,
          email,
          phoneNumber,
          ageRange,
          totalPoints: 0,
          level: 1,
          classe: null,
          matieres: [],
          langueGabonaise: null,
          isConnected: true,
          createdAt: new Date().toISOString(),
          lastLoginAt: null
        },
        token
      }
    });
  } catch (error) {
    logger.logError(error, { context: 'register_user' });
    throw error;
  }
}));

// Connexion utilisateur
router.post('/login', asyncHandler(async (req, res) => {
  console.log('🔍 [LOGIN] Requête reçue:', {
    email: req.body.email,
    password: req.body.password ? '***' : 'undefined',
    headers: req.headers,
    body: req.body
  });

  const { email, password } = req.body;

  if (!email || !password) {
    console.log('❌ [LOGIN] Données manquantes:', { email: !!email, password: !!password });
    return res.status(400).json({
      success: false,
      error: {
        message: 'Email et mot de passe requis'
      }
    });
  }

  try {
    // Récupérer l'utilisateur avec le mot de passe hashé
    const users = await query(
      `SELECT id, name, email, phone_number, age_range, total_points, level, 
              classe, matieres, langue_gabonaise, created_at, last_login_at, password_hash
       FROM users 
       WHERE email = ? AND deleted_at IS NULL`,
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

    // Vérifier le mot de passe avec bcrypt
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        error: {
          message: 'Email ou mot de passe incorrect'
        }
      });
    }

    // Supprimer le hash du mot de passe de la réponse
    delete user.password_hash;
    
    // Mettre à jour la dernière connexion
    await query(
      'UPDATE users SET last_login_at = NOW() WHERE id = ?',
      [user.id]
    );

    // Générer un token JWT
    const token = jwt.sign(
      { userId: user.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    logger.logEvent('user_logged_in', { userId: user.id, email });

    // Vérifier dans la table admins au lieu du champ role
    let redirectPath = '/dashboard';
    let isAdmin = false;
    try {
      const [admins] = await query(
        'SELECT id FROM admins WHERE user_id = ? OR email = ? LIMIT 1',
        [user.id, user.email]
      );
      isAdmin = Array.isArray(admins) ? admins.length > 0 : admins && admins.id;
    } catch (e) {
      // En cas d'erreur de table manquante, rester compatible
      isAdmin = (user.role === 'admin' || user.role === 'super_admin');
    }

    if (isAdmin) {
      redirectPath = '/admin/dashboard';
    } else {
      // Pour les non-admins, vérifier s'ils ont déjà sélectionné leur classe
      if (!user.classe) {
        redirectPath = '/choose-class';
      } else {
        redirectPath = '/dashboard';
      }
    }

    const responseData = {
      success: true,
      message: 'Connexion réussie',
      data: {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          phoneNumber: user.phone_number,
          ageRange: user.age_range,
          totalPoints: user.total_points,
          level: user.level,
          classe: user.classe,
          matieres: user.matieres ? JSON.parse(user.matieres) : [],
          langueGabonaise: user.langue_gabonaise,
          isAdmin,
          isConnected: true,
          createdAt: user.created_at,
          lastLoginAt: user.last_login_at
        },
        token,
        redirectPath
      }
    };

    console.log('✅ [LOGIN] Réponse envoyée:', {
      success: responseData.success,
      userId: responseData.data.user.id,
      email: responseData.data.user.email,
      tokenLength: responseData.data.token.length
    });

    res.json(responseData);
  } catch (error) {
    logger.logError(error, { context: 'login_user' });
    throw error;
  }
}));

// Connexion Google
router.post('/google-login', asyncHandler(async (req, res) => {
  const { name, email, googleId } = req.body;

  if (!name || !email || !googleId) {
    return res.status(400).json({
      success: false,
      error: {
        message: 'Données Google requises'
      }
    });
  }

  try {
    // Vérifier si l'utilisateur existe déjà
    let users = await query(
      `SELECT id, name, email, phone_number, age_range, total_points, level, 
              classe, matieres, langue_gabonaise, created_at, last_login_at
       FROM users 
       WHERE google_id = ? AND is_active = true AND deleted_at IS NULL`,
      [googleId]
    );

    let user;
    if (users.length === 0) {
      // Créer un nouvel utilisateur Google
      const userId = uuidv4();
      await query(
        `INSERT INTO users (id, name, email, google_id, total_points, level, 
                           created_at, updated_at)
         VALUES (?, ?, ?, ?, 0, 1, NOW(), NOW())`,
        [userId, name, email, googleId]
      );

      user = {
        id: userId,
        name,
        email,
        phoneNumber: null,
        ageRange: null,
        totalPoints: 0,
        level: 1,
        classe: null,
        matieres: [],
        langueGabonaise: null,
        createdAt: new Date().toISOString(),
        lastLoginAt: null
      };
    } else {
      user = users[0];
      // Mettre à jour la dernière connexion
      await query(
        'UPDATE users SET last_login_at = NOW() WHERE id = ?',
        [user.id]
      );
    }

    // Générer un token JWT
    const token = jwt.sign(
      { userId: user.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    logger.logEvent('google_login', { userId: user.id, email });

    res.json({
      success: true,
      message: 'Connexion Google réussie',
      data: {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          phoneNumber: user.phone_number,
          ageRange: user.age_range,
          totalPoints: user.total_points,
          level: user.level,
          classe: user.classe,
          matieres: user.matieres ? JSON.parse(user.matieres) : [],
          langueGabonaise: user.langue_gabonaise,
          isConnected: true,
          createdAt: user.created_at,
          lastLoginAt: user.last_login_at
        },
        token
      }
    });
  } catch (error) {
    logger.logError(error, { context: 'google_login' });
    throw error;
  }
}));

// Sélectionner la classe
router.put('/class', authenticateToken, validateClassSelection, asyncHandler(async (req, res) => {
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

  try {
    const userId = req.user.id;
    const { classe } = req.body;

    await query(
      'UPDATE users SET classe = ?, updated_at = NOW() WHERE id = ?',
      [classe, userId]
    );

    logger.logEvent('user_class_selected', { userId, classe });

    // Récupérer l'utilisateur mis à jour - VERSION CORRIGÉE
    const [updatedUsers] = await query(
      `SELECT id, name, email, phone_number, age_range, total_points, level, 
              classe, matieres, langue_gabonaise, created_at, last_login_at
       FROM users 
       WHERE id = ? AND deleted_at IS NULL`,
      [userId]
    );

    if (updatedUsers.length === 0) {
      return res.status(404).json({
        success: false,
        error: { message: 'Utilisateur non trouvé' }
      });
    }

    res.json({
      success: true,
      message: 'Classe sélectionnée avec succès',
      data: { 
        user: updatedUsers[0],
        classe 
      }
    });
  } catch (error) {
    logger.logError(error, { context: 'select_class', userId: req.user?.id });
    throw error;
  }
}));

// Sélectionner les matières
router.put('/subjects', authenticateToken, validateSubjectSelection, asyncHandler(async (req, res) => {
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

  try {
    const userId = req.user.id;
    const { matieres } = req.body;

    await query(
      'UPDATE users SET matieres = ?, updated_at = NOW() WHERE id = ?',
      [JSON.stringify(matieres), userId]
    );

    logger.logEvent('user_subjects_selected', { userId, matieres });

    // Récupérer l'utilisateur mis à jour
    const [updatedUsers] = await query(
      `SELECT id, name, email, phone_number, age_range, total_points, level, 
              classe, matieres, langue_gabonaise, created_at, last_login_at
       FROM users 
       WHERE id = ? AND deleted_at IS NULL`,
      [userId]
    );

    if (updatedUsers.length === 0) {
      return res.status(404).json({
        success: false,
        error: { message: 'Utilisateur non trouvé' }
      });
    }

    res.json({
      success: true,
      message: 'Matières sélectionnées avec succès',
      data: { 
        user: updatedUsers[0],
        matieres 
      }
    });
  } catch (error) {
    logger.logError(error, { context: 'select_subjects', userId: req.user?.id });
    throw error;
  }
}));

// Sélectionner la langue gabonaise
router.put('/language', authenticateToken, validateLanguageSelection, asyncHandler(async (req, res) => {
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

  try {
    const userId = req.user.id;
    const { langueGabonaise } = req.body;

    await query(
      'UPDATE users SET langue_gabonaise = ?, updated_at = NOW() WHERE id = ?',
      [langueGabonaise, userId]
    );

    logger.logEvent('user_language_selected', { userId, langueGabonaise });

    res.json({
      success: true,
      message: 'Langue gabonaise sélectionnée avec succès',
      data: { langueGabonaise }
    });
  } catch (error) {
    logger.logError(error, { context: 'select_language', userId: req.user?.id });
    throw error;
  }
}));

// Route pour obtenir les quiz d'une matière
router.get('/quizzes/:subject', authenticateToken, asyncHandler(async (req, res) => {
  try {
    const { subject } = req.params;
    const userId = req.user.id;

    const quizzes = await query(
      `SELECT id, title, description, questions, 
              COALESCE(difficulty, 'moyen') as difficulty, 
              COALESCE(level, 'général') as level, 
              COALESCE(content_type, 'general') as content_type, 
              created_at 
       FROM quizzes 
       WHERE subject_id = ? AND (created_by = ? OR created_by IS NULL)
       ORDER BY created_at DESC`,
      [subject, userId]
    );

    // Parser les questions JSON
    const formattedQuizzes = quizzes.map(quiz => ({
      ...quiz,
      questions: JSON.parse(quiz.questions || '[]')
    }));

    res.json({
      success: true,
      data: {
        quizzes: formattedQuizzes
      }
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des quiz:', error);
    res.status(500).json({
      success: false,
      error: {
        message: 'Erreur lors de la récupération des quiz',
        details: error.message
      }
    });
  }
}));

// Route pour obtenir les leçons d'une matière
router.get('/lessons/:subject', authenticateToken, asyncHandler(async (req, res) => {
  try {
    const { subject } = req.params;
    const userId = req.user.id;

    const lessons = await query(
      `SELECT id, title, description, content, class_level, difficulty, points_reward, created_at
       FROM lessons
       WHERE subject_id = ? AND is_active = 1
       ORDER BY created_at DESC`,
      [subject]
    );

    res.json({
      success: true,
      data: {
        lessons: lessons
      }
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des leçons:', error);
    res.status(500).json({
      success: false,
      error: {
        message: 'Erreur lors de la récupération des leçons',
        details: error.message
      }
    });
  }
}));

// Route pour obtenir une leçon spécifique par ID
router.get('/lesson/:lessonId', authenticateToken, asyncHandler(async (req, res) => {
  try {
    const { lessonId } = req.params;
    const userId = req.user.id;

    const lessons = await query(
      `SELECT id, title, description, content, class_level, difficulty, points_reward, created_at, subject_id
       FROM lessons
       WHERE id = ? AND is_active = 1`,
      [lessonId]
    );

    if (lessons.length === 0) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'Leçon non trouvée'
        }
      });
    }

    res.json({
      success: true,
      data: {
        lesson: lessons[0]
      }
    });
  } catch (error) {
    console.error('Erreur lors de la récupération de la leçon:', error);
    res.status(500).json({
      success: false,
      error: {
        message: 'Erreur lors de la récupération de la leçon',
        details: error.message
      }
    });
  }
}));

// Obtenir le profil utilisateur
router.get('/profile', authenticateToken, asyncHandler(async (req, res) => {
  try {
    const userId = req.user.id;
    
    const users = await query(
      `SELECT id, name, email, phone_number, age_range, total_points, level, 
              classe, matieres, langue_gabonaise, created_at, last_login_at
       FROM users 
       WHERE id = ? AND deleted_at IS NULL`,
      [userId]
    );

    if (users.length === 0) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'Utilisateur non trouvé'
        }
      });
    }

    const user = users[0];

    res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          phoneNumber: user.phone_number,
          ageRange: user.age_range,
          totalPoints: user.total_points,
          level: user.level,
          classe: user.classe,
          matieres: user.matieres ? JSON.parse(user.matieres) : [],
          langueGabonaise: user.langue_gabonaise,
          isConnected: true,
          createdAt: user.created_at,
          lastLoginAt: user.last_login_at
        }
      }
    });
  } catch (error) {
    logger.logError(error, { context: 'get_user_profile', userId: req.user?.id });
    throw error;
  }
}));

// Sauvegarder les résultats de quiz
router.post('/quiz-result', authenticateToken, asyncHandler(async (req, res) => {
  const { matiere, score, maxScore, percentage, questions } = req.body;

  if (!matiere || score === undefined || maxScore === undefined || percentage === undefined) {
    return res.status(400).json({
      success: false,
      error: {
        message: 'Données de quiz requises'
      }
    });
  }

  try {
    const userId = req.user.id;
    const quizResultId = uuidv4();

    // Sauvegarder le résultat
    await query(
      `INSERT INTO quiz_results (id, user_id, matiere, score, max_score, percentage, 
                                questions, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, NOW())`,
      [quizResultId, userId, matiere, score, maxScore, percentage, JSON.stringify(questions)]
    );

    // Mettre à jour les points de l'utilisateur
    const pointsEarned = Math.floor(percentage / 10) * 10; // 10 points par 10%
    await query(
      'UPDATE users SET total_points = total_points + ?, updated_at = NOW() WHERE id = ?',
      [pointsEarned, userId]
    );

    logger.logEvent('quiz_completed', { userId, matiere, percentage, pointsEarned });

    res.json({
      success: true,
      message: 'Résultat de quiz sauvegardé',
      data: {
        quizResult: {
          id: quizResultId,
          matiere,
          score,
          maxScore,
          percentage,
          pointsEarned
        }
      }
    });
  } catch (error) {
    logger.logError(error, { context: 'save_quiz_result', userId: req.user?.id });
    throw error;
  }
}));

// Obtenir les résultats de quiz par matière
router.get('/quiz-results/:matiere', authenticateToken, asyncHandler(async (req, res) => {
  try {
    const userId = req.user.id;
    const { matiere } = req.params;

    const results = await query(
      `SELECT id, matiere, score, max_score, percentage, questions, created_at
       FROM quiz_results 
       WHERE user_id = ? AND matiere = ?
       ORDER BY created_at DESC`,
      [userId, matiere]
    );

    res.json({
      success: true,
      data: {
        results: results.map(result => ({
          id: result.id,
          matiere: result.matiere,
          score: result.score,
          maxScore: result.max_score,
          percentage: result.percentage,
          questions: result.questions ? JSON.parse(result.questions) : [],
          date: result.created_at
        }))
      }
    });
  } catch (error) {
    logger.logError(error, { context: 'get_quiz_results', userId: req.user?.id });
    throw error;
  }
}));

// Obtenir le progrès par matière
router.get('/progress/:matiere', authenticateToken, asyncHandler(async (req, res) => {
  try {
    const userId = req.user.id;
    const { matiere } = req.params;

    // Statistiques de la matière
    const stats = await query(
      `SELECT 
              COUNT(*) as totalQuizzes,
              AVG(percentage) as averageScore,
              MAX(percentage) as bestScore,
              MAX(created_at) as lastQuizDate
       FROM quiz_results 
       WHERE user_id = ? AND matiere = ?`,
      [userId, matiere]
    );

    // Calculer le niveau et XP
    const totalPoints = await query(
      'SELECT total_points FROM users WHERE id = ?',
      [userId]
    );

    const userPoints = totalPoints[0]?.total_points || 0;
    const level = Math.floor(userPoints / 500) + 1;
    const xp = userPoints % 500;

    res.json({
      success: true,
      data: {
        progress: {
          matiere,
          totalQuizzes: stats[0]?.totalQuizzes || 0,
          completedQuizzes: stats[0]?.totalQuizzes || 0,
          averageScore: Math.round(stats[0]?.averageScore || 0),
          lastQuizDate: stats[0]?.lastQuizDate,
          level,
          xp
        }
      }
    });
  } catch (error) {
    logger.logError(error, { context: 'get_progress', userId: req.user?.id });
    throw error;
  }
}));

// Obtenir tous les progrès
router.get('/progress', authenticateToken, asyncHandler(async (req, res) => {
  try {
    const userId = req.user.id;

    // Obtenir les matières de l'utilisateur
    const user = await query(
      'SELECT matieres FROM users WHERE id = ?',
      [userId]
    );

    if (!user[0]?.matieres) {
      return res.json({
        success: true,
        data: { progress: [] }
      });
    }

    const matieres = JSON.parse(user[0].matieres);
    const progress = [];

    for (const matiere of matieres) {
      const stats = await query(
        `SELECT 
                COUNT(*) as totalQuizzes,
                AVG(percentage) as averageScore,
                MAX(percentage) as bestScore,
                MAX(created_at) as lastQuizDate
         FROM quiz_results 
         WHERE user_id = ? AND matiere = ?`,
        [userId, matiere]
      );

      const totalPoints = await query(
        'SELECT total_points FROM users WHERE id = ?',
        [userId]
      );

      const userPoints = totalPoints[0]?.total_points || 0;
      const level = Math.floor(userPoints / 500) + 1;
      const xp = userPoints % 500;

      progress.push({
        matiere,
        totalQuizzes: stats[0]?.totalQuizzes || 0,
        completedQuizzes: stats[0]?.totalQuizzes || 0,
        averageScore: Math.round(stats[0]?.averageScore || 0),
        lastQuizDate: stats[0]?.lastQuizDate,
        level,
        xp
      });
    }

    res.json({
      success: true,
      data: { progress }
    });
  } catch (error) {
    logger.logError(error, { context: 'get_all_progress', userId: req.user?.id });
    throw error;
  }
}));

// Déconnexion
router.post('/logout', authenticateToken, asyncHandler(async (req, res) => {
  try {
    const userId = req.user.id;

    logger.logEvent('user_logged_out', { userId });

    res.json({
      success: true,
      message: 'Déconnexion réussie'
    });
  } catch (error) {
    logger.logError(error, { context: 'logout_user', userId: req.user?.id });
    throw error;
  }
}));

// Obtenir la liste des matières disponibles
router.get('/subjects', asyncHandler(async (req, res) => {
  try {
    const subjects = [
      { id: 'philosophie', label: 'Philosophie', required: false },
      { id: 'histoire', label: 'Histoire', required: true },
      { id: 'geographie', label: 'Géographie', required: true },
      { id: 'anglais', label: 'Anglais', required: true },
      { id: 'autre_langue', label: 'Autre Langue', required: false },
      { id: 'histoire_gabon', label: 'Histoire du Gabon', required: true },
      { id: 'langue_gabonaise', label: 'Langue Gabonaise', required: true },
      { id: 'eps', label: 'Éducation physique et sportive (EPS)', required: false },
      { id: 'emc', label: 'Enseignement moral et civique (EMC)', required: false },
      { id: 'mathematiques', label: 'Mathématiques', required: true },
      { id: 'physique_chimie', label: 'Physique-Chimie', required: false },
      { id: 'svt', label: 'Sciences de la vie et de la Terre (SVT)', required: false },
      { id: 'ses', label: 'Sciences économiques et sociales (SES)', required: false },
      { id: 'art_plastique', label: 'Art-plastique', required: false },
      { id: 'theatre', label: 'Théâtre', required: false },
      { id: 'musique', label: 'Musique', required: false }
    ];

    res.json({
      success: true,
      data: { subjects }
    });
  } catch (error) {
    logger.logError(error, { context: 'get_subjects' });
    throw error;
  }
}));

// Obtenir la liste des classes disponibles
router.get('/classes', asyncHandler(async (req, res) => {
  try {
    const classes = [
      { id: '6eme', label: '6ème', description: 'Première année du collège' },
      { id: '5eme', label: '5ème', description: 'Deuxième année du collège' },
      { id: '4eme', label: '4ème', description: 'Troisième année du collège' },
      { id: '3eme', label: '3ème', description: 'Dernière année du collège' },
      { id: 'seconde', label: 'Seconde', description: 'Première année du lycée' },
      { id: 'premiere', label: 'Première', description: 'Deuxième année du lycée' },
      { id: 'terminale', label: 'Terminale', description: 'Dernière année du lycée' }
    ];

    res.json({
      success: true,
      data: { classes }
    });
  } catch (error) {
    logger.logError(error, { context: 'get_classes' });
    throw error;
  }
}));

// Obtenir la liste des langues gabonaises disponibles
router.get('/languages', asyncHandler(async (req, res) => {
  try {
    const languages = [
      { id: 'fang', label: 'Fang', description: 'Langue parlée principalement au nord' },
      { id: 'myene', label: 'Myene', description: 'Langue parlée dans l\'Ogooué-Maritime' },
      { id: 'punu', label: 'Punu', description: 'Langue parlée dans le sud' },
      { id: 'nzebi', label: 'Nzebi', description: 'Langue parlée dans l\'Ogooué-Ivindo' },
      { id: 'kota', label: 'Kota', description: 'Langue parlée dans l\'Ogooué-Lolo' }
    ];

    res.json({
      success: true,
      data: { languages }
    });
  } catch (error) {
    logger.logError(error, { context: 'get_languages' });
    throw error;
  }
}));

module.exports = router;
