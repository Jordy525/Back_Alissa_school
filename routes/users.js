const express = require('express');
const { body, validationResult } = require('express-validator');
const { v4: uuidv4 } = require('uuid');

const { query, transaction } = require('../config/database');
const { authenticateToken, requireClassSelection } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');
const logger = require('../config/logger');

const router = express.Router();

// Validation pour la mise à jour du profil
const validateProfileUpdate = [
  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Le nom doit contenir entre 2 et 100 caractères'),
  body('avatar_url')
    .optional()
    .isURL()
    .withMessage('URL d\'avatar invalide')
];

// Validation pour la sélection de classe
const validateClassSelection = [
  body('classLevel')
    .isIn(['6ème', '5ème', '4ème', '3ème', '2nde', '1ère', 'Terminale'])
    .withMessage('Niveau de classe invalide')
];

// Validation pour la sélection de matières
const validateSubjectSelection = [
  body('subjects')
    .isArray({ min: 4 })
    .withMessage('Au moins 4 matières doivent être sélectionnées'),
  body('subjects.*')
    .isString()
    .isLength({ min: 1, max: 50 })
    .withMessage('ID de matière invalide')
];

// Obtenir le profil utilisateur
router.get('/profile', authenticateToken, asyncHandler(async (req, res) => {
  try {
    const userId = req.user.id;
    
    const users = await query(
      `SELECT id, email, name, avatar_url, selected_class, total_points, level, 
              google_id, created_at, last_login_at 
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
        user
      }
    });
  } catch (error) {
    logger.logError(error, { context: 'get_user_profile', userId: req.user?.id });
    throw error;
  }
}));

// Mettre à jour le profil utilisateur
router.put('/profile', authenticateToken, validateProfileUpdate, asyncHandler(async (req, res) => {
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
    const { name, avatar_url } = req.body;

    // Construction de la requête de mise à jour dynamiquement
    const updateFields = [];
    const updateValues = [];

    if (name !== undefined) {
      updateFields.push('name = ?');
      updateValues.push(name);
    }

    if (avatar_url !== undefined) {
      updateFields.push('avatar_url = ?');
      updateValues.push(avatar_url);
    }

    if (updateFields.length === 0) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Aucune donnée à mettre à jour'
        }
      });
    }

    updateFields.push('updated_at = NOW()');
    updateValues.push(userId);

    await query(
      `UPDATE users SET ${updateFields.join(', ')} WHERE id = ?`,
      updateValues
    );

    // Récupération des données mises à jour
    const users = await query(
      `SELECT id, email, name, avatar_url, selected_class, total_points, level, 
              google_id, created_at, last_login_at 
       FROM users 
       WHERE id = ?`,
      [userId]
    );

    logger.logEvent('user_profile_updated', { userId, updatedFields: Object.keys(req.body) });

    res.json({
      success: true,
      message: 'Profil mis à jour avec succès',
      data: {
        user: users[0]
      }
    });
  } catch (error) {
    logger.logError(error, { context: 'update_user_profile', userId: req.user?.id });
    throw error;
  }
}));

// Sélectionner la classe de l'utilisateur
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
    const { classLevel } = req.body;

    await query(
      'UPDATE users SET selected_class = ?, updated_at = NOW() WHERE id = ?',
      [classLevel, userId]
    );

    // Récupération des données mises à jour
    const users = await query(
      `SELECT id, email, name, avatar_url, selected_class, total_points, level, 
              google_id, created_at, last_login_at 
       FROM users 
       WHERE id = ?`,
      [userId]
    );

    logger.logEvent('user_class_selected', { userId, classLevel });

    res.json({
      success: true,
      message: 'Classe sélectionnée avec succès',
      data: {
        user: users[0]
      }
    });
  } catch (error) {
    logger.logError(error, { context: 'select_user_class', userId: req.user?.id });
    throw error;
  }
}));

// Sélectionner les matières de l'utilisateur
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
    const { subjects } = req.body;

    // Vérifier que les matières existent
    const placeholders = subjects.map(() => '?').join(',');
    const existingSubjects = await query(
      `SELECT id FROM subjects WHERE id IN (${placeholders}) AND is_active = true`,
      subjects
    );

    if (existingSubjects.length !== subjects.length) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Une ou plusieurs matières sélectionnées n\'existent pas'
        }
      });
    }

    // Mettre à jour les matières sélectionnées
    await query(
      'UPDATE users SET selected_subjects = ?, updated_at = NOW() WHERE id = ?',
      [JSON.stringify(subjects), userId]
    );

    // Récupération des données mises à jour
    const users = await query(
      `SELECT id, email, name, avatar_url, selected_class, selected_subjects, total_points, level, 
              google_id, created_at, last_login_at 
       FROM users 
       WHERE id = ?`,
      [userId]
    );

    logger.logEvent('user_subjects_selected', { userId, subjects });

    res.json({
      success: true,
      message: 'Matières sélectionnées avec succès',
      data: {
        user: users[0]
      }
    });
  } catch (error) {
    logger.logError(error, { context: 'select_user_subjects', userId: req.user?.id });
    throw error;
  }
}));

// Obtenir le progrès de l'utilisateur
router.get('/progress', authenticateToken, requireClassSelection, asyncHandler(async (req, res) => {
  try {
    const userId = req.user.id;

    // Progrès par matière
    const progressBySubject = await query(
      `SELECT s.id, s.name, s.icon, s.color, 
              COALESCE(up.lessons_completed, 0) as lessons_completed,
              COALESCE(up.quizzes_completed, 0) as quizzes_completed,
              COALESCE(up.total_points, 0) as total_points,
              COALESCE(up.current_streak, 0) as current_streak,
              COALESCE(up.longest_streak, 0) as longest_streak,
              up.last_activity_at,
              s.total_lessons
       FROM subjects s
       LEFT JOIN user_progress up ON s.id = up.subject_id AND up.user_id = ?
       WHERE s.is_active = true AND JSON_CONTAINS(s.class_levels, ?)
       ORDER BY s.name`,
      [userId, JSON.stringify(`"${req.user.selectedClass}"`)]
    );

    // Statistiques globales
    const globalStats = await query(
      `SELECT 
              SUM(COALESCE(up.lessons_completed, 0)) as total_lessons_completed,
              SUM(COALESCE(up.quizzes_completed, 0)) as total_quizzes_completed,
              SUM(COALESCE(up.total_points, 0)) as total_points_earned,
              MAX(COALESCE(up.longest_streak, 0)) as best_streak,
              COUNT(DISTINCT CASE WHEN up.lessons_completed > 0 THEN s.id END) as subjects_started
       FROM subjects s
       LEFT JOIN user_progress up ON s.id = up.subject_id AND up.user_id = ?
       WHERE s.is_active = true AND JSON_CONTAINS(s.class_levels, ?)`,
      [userId, JSON.stringify(`"${req.user.selectedClass}"`)]
    );

    res.json({
      success: true,
      data: {
        progressBySubject,
        globalStats: globalStats[0]
      }
    });
  } catch (error) {
    logger.logError(error, { context: 'get_user_progress', userId: req.user?.id });
    throw error;
  }
}));

// Obtenir les succès de l'utilisateur
router.get('/achievements', authenticateToken, asyncHandler(async (req, res) => {
  try {
    const userId = req.user.id;

    // Succès débloqués
    const unlockedAchievements = await query(
      `SELECT a.id, a.title, a.description, a.icon, a.points, a.rarity, ua.unlocked_at
       FROM achievements a
       INNER JOIN user_achievements ua ON a.id = ua.achievement_id
       WHERE ua.user_id = ? AND a.is_active = true
       ORDER BY ua.unlocked_at DESC`,
      [userId]
    );

    // Tous les succès disponibles
    const allAchievements = await query(
      `SELECT a.id, a.title, a.description, a.icon, a.points, a.rarity, a.requirements,
              CASE WHEN ua.id IS NOT NULL THEN true ELSE false END as is_unlocked,
              ua.unlocked_at
       FROM achievements a
       LEFT JOIN user_achievements ua ON a.id = ua.achievement_id AND ua.user_id = ?
       WHERE a.is_active = true
       ORDER BY a.rarity, a.points DESC`,
      [userId]
    );

    res.json({
      success: true,
      data: {
        unlocked: unlockedAchievements,
        all: allAchievements
      }
    });
  } catch (error) {
    logger.logError(error, { context: 'get_user_achievements', userId: req.user?.id });
    throw error;
  }
}));

// Obtenir les statistiques de l'utilisateur
router.get('/stats', authenticateToken, requireClassSelection, asyncHandler(async (req, res) => {
  try {
    const userId = req.user.id;

    // Statistiques détaillées
    const stats = await query(
      `SELECT 
              u.total_points,
              u.level,
              u.selected_class,
              u.created_at,
              u.last_login_at,
              COUNT(DISTINCT ul.lesson_id) as lessons_completed,
              COUNT(DISTINCT qa.quiz_id) as quizzes_completed,
              COALESCE(AVG(qa.score), 0) as average_quiz_score,
              COUNT(DISTINCT ua.achievement_id) as achievements_unlocked,
              MAX(up.longest_streak) as best_streak
       FROM users u
       LEFT JOIN user_lessons ul ON u.id = ul.user_id
       LEFT JOIN quiz_attempts qa ON u.id = qa.user_id
       LEFT JOIN user_achievements ua ON u.id = ua.user_id
       LEFT JOIN user_progress up ON u.id = up.user_id
       WHERE u.id = ? AND u.deleted_at IS NULL
       GROUP BY u.id`,
      [userId]
    );

    // Activité récente (dernières 30 jours)
    const recentActivity = await query(
      `SELECT 
              'lesson' as type,
              l.title as title,
              ul.completed_at as completed_at,
              ul.points_earned as points
       FROM user_lessons ul
       INNER JOIN lessons l ON ul.lesson_id = l.id
       WHERE ul.user_id = ? AND ul.completed_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
       
       UNION ALL
       
       SELECT 
              'quiz' as type,
              q.title as title,
              qa.completed_at as completed_at,
              qa.points_earned as points
       FROM quiz_attempts qa
       INNER JOIN quizzes q ON qa.quiz_id = q.id
       WHERE qa.user_id = ? AND qa.completed_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
       
       ORDER BY completed_at DESC
       LIMIT 20`,
      [userId, userId]
    );

    res.json({
      success: true,
      data: {
        stats: stats[0] || {},
        recentActivity
      }
    });
  } catch (error) {
    logger.logError(error, { context: 'get_user_stats', userId: req.user?.id });
    throw error;
  }
}));

// Supprimer le compte utilisateur (soft delete)
router.delete('/account', authenticateToken, asyncHandler(async (req, res) => {
  try {
    const userId = req.user.id;

    await query(
      'UPDATE users SET deleted_at = NOW(), updated_at = NOW() WHERE id = ?',
      [userId]
    );

    logger.logEvent('user_account_deleted', { userId });

    res.json({
      success: true,
      message: 'Compte supprimé avec succès'
    });
  } catch (error) {
    logger.logError(error, { context: 'delete_user_account', userId: req.user?.id });
    throw error;
  }
}));

module.exports = router;
