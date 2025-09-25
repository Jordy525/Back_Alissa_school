const express = require('express');

const { query } = require('../config/database');
const { authenticateToken, requireClassSelection, optionalAuth } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');
const logger = require('../config/logger');

const router = express.Router();

// Obtenir toutes les matières pour la classe de l'utilisateur
router.get('/', authenticateToken, requireClassSelection, asyncHandler(async (req, res) => {
  try {
    const userId = req.user.id;
    const classLevel = req.user.selectedClass;

    // Récupération des matières avec le progrès de l'utilisateur
    const subjects = await query(
      `SELECT s.id, s.name, s.description, s.icon, s.color, s.class_levels, s.total_lessons,
              COALESCE(up.lessons_completed, 0) as lessons_completed,
              COALESCE(up.quizzes_completed, 0) as quizzes_completed,
              COALESCE(up.total_points, 0) as user_points,
              COALESCE(up.current_streak, 0) as current_streak,
              COALESCE(up.longest_streak, 0) as longest_streak,
              up.last_activity_at,
              CASE 
                WHEN up.lessons_completed = 0 THEN 'not_started'
                WHEN up.lessons_completed = s.total_lessons THEN 'completed'
                WHEN up.last_activity_at >= DATE_SUB(NOW(), INTERVAL 7 DAY) THEN 'active'
                ELSE 'in_progress'
              END as status
       FROM subjects s
       LEFT JOIN user_progress up ON s.id = up.subject_id AND up.user_id = ?
       WHERE s.is_active = true AND JSON_CONTAINS(s.class_levels, ?)
       ORDER BY s.name`,
      [userId, JSON.stringify(`"${classLevel}"`)]
    );

    res.json({
      success: true,
      data: {
        subjects,
        classLevel
      }
    });
  } catch (error) {
    logger.logError(error, { context: 'get_subjects', userId: req.user?.id });
    throw error;
  }
}));

// Route publique pour récupérer toutes les matières (pour l'admin)
// IMPORTANT: Cette route doit être définie AVANT les routes dynamiques `/:id` pour éviter les collisions
router.get('/admin/all', async (req, res) => {
  try {
    const subjects = await query(
      'SELECT id, name, description, icon, color, class_levels, total_lessons, is_active FROM subjects WHERE is_active = true ORDER BY name'
    );

    res.json({
      success: true,
      data: {
        subjects: subjects
      }
    });
  } catch (error) {
    logger.logError(error, { context: 'get_all_subjects_admin' });
    res.status(500).json({
      success: false,
      error: {
        message: 'Erreur lors de la récupération des matières'
      }
    });
  }
});

// Obtenir une matière spécifique
router.get('/:id', authenticateToken, requireClassSelection, asyncHandler(async (req, res) => {
  try {
    const userId = req.user.id;
    const subjectId = req.params.id;
    const classLevel = req.user.selectedClass;

    // Vérification que la matière existe et est disponible pour la classe
    const subjects = await query(
      `SELECT s.id, s.name, s.description, s.icon, s.color, s.class_levels, s.total_lessons,
              COALESCE(up.lessons_completed, 0) as lessons_completed,
              COALESCE(up.quizzes_completed, 0) as quizzes_completed,
              COALESCE(up.total_points, 0) as user_points,
              COALESCE(up.current_streak, 0) as current_streak,
              COALESCE(up.longest_streak, 0) as longest_streak,
              up.last_activity_at
       FROM subjects s
       LEFT JOIN user_progress up ON s.id = up.subject_id AND up.user_id = ?
       WHERE s.id = ? AND s.is_active = true AND JSON_CONTAINS(s.class_levels, ?)`,
      [userId, subjectId, JSON.stringify(`"${classLevel}"`)]
    );

    if (subjects.length === 0) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'Matière non trouvée ou non disponible pour votre classe'
        }
      });
    }

    const subject = subjects[0];

    // Récupération des leçons de la matière
    const lessons = await query(
      `SELECT l.id, l.title, l.description, l.estimated_duration, l.difficulty, l.points_reward, l.order_index,
              CASE WHEN ul.id IS NOT NULL THEN true ELSE false END as is_completed,
              ul.completed_at,
              ul.points_earned
       FROM lessons l
       LEFT JOIN user_lessons ul ON l.id = ul.lesson_id AND ul.user_id = ?
       WHERE l.subject_id = ? AND l.is_active = true
       ORDER BY l.order_index, l.created_at`,
      [userId, subjectId]
    );

    // Récupération des quiz de la matière
    const quizzes = await query(
      `SELECT q.id, q.title, q.description, q.time_limit, q.passing_score,
              CASE WHEN qa.id IS NOT NULL THEN true ELSE false END as is_completed,
              qa.score as best_score,
              qa.completed_at as last_attempt
       FROM quizzes q
       LEFT JOIN quiz_attempts qa ON q.id = qa.quiz_id AND qa.user_id = ?
       WHERE q.subject_id = ? AND q.is_active = true
       ORDER BY q.created_at`,
      [userId, subjectId]
    );

    res.json({
      success: true,
      data: {
        subject,
        lessons,
        quizzes
      }
    });
  } catch (error) {
    logger.logError(error, { context: 'get_subject', userId: req.user?.id, subjectId: req.params.id });
    throw error;
  }
}));

// Obtenir les leçons d'une matière
router.get('/:id/lessons', authenticateToken, requireClassSelection, asyncHandler(async (req, res) => {
  try {
    const userId = req.user.id;
    const subjectId = req.params.id;
    const classLevel = req.user.selectedClass;

    // Vérification que la matière existe et est disponible
    const subjectCheck = await query(
      'SELECT id FROM subjects WHERE id = ? AND is_active = true AND JSON_CONTAINS(class_levels, ?)',
      [subjectId, JSON.stringify(`"${classLevel}"`)]
    );

    if (subjectCheck.length === 0) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'Matière non trouvée ou non disponible pour votre classe'
        }
      });
    }

    // Récupération des leçons avec le statut de completion
    const lessons = await query(
      `SELECT l.id, l.title, l.description, l.content, l.estimated_duration, l.difficulty, l.points_reward, l.order_index,
              CASE WHEN ul.id IS NOT NULL THEN true ELSE false END as is_completed,
              ul.completed_at,
              ul.points_earned
       FROM lessons l
       LEFT JOIN user_lessons ul ON l.id = ul.lesson_id AND ul.user_id = ?
       WHERE l.subject_id = ? AND l.is_active = true
       ORDER BY l.order_index, l.created_at`,
      [userId, subjectId]
    );

    res.json({
      success: true,
      data: {
        lessons
      }
    });
  } catch (error) {
    logger.logError(error, { context: 'get_subject_lessons', userId: req.user?.id, subjectId: req.params.id });
    throw error;
  }
}));

// Obtenir le progrès dans une matière
router.get('/:id/progress', authenticateToken, requireClassSelection, asyncHandler(async (req, res) => {
  try {
    const userId = req.user.id;
    const subjectId = req.params.id;
    const classLevel = req.user.selectedClass;

    // Vérification que la matière existe et est disponible
    const subjectCheck = await query(
      'SELECT id, name FROM subjects WHERE id = ? AND is_active = true AND JSON_CONTAINS(class_levels, ?)',
      [subjectId, JSON.stringify(`"${classLevel}"`)]
    );

    if (subjectCheck.length === 0) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'Matière non trouvée ou non disponible pour votre classe'
        }
      });
    }

    // Progrès détaillé
    const progress = await query(
      `SELECT 
              COALESCE(up.lessons_completed, 0) as lessons_completed,
              COALESCE(up.quizzes_completed, 0) as quizzes_completed,
              COALESCE(up.total_points, 0) as total_points,
              COALESCE(up.current_streak, 0) as current_streak,
              COALESCE(up.longest_streak, 0) as longest_streak,
              up.last_activity_at,
              s.total_lessons,
              ROUND((COALESCE(up.lessons_completed, 0) / s.total_lessons) * 100, 2) as completion_percentage
       FROM subjects s
       LEFT JOIN user_progress up ON s.id = up.subject_id AND up.user_id = ?
       WHERE s.id = ?`,
      [userId, subjectId]
    );

    // Historique des leçons terminées
    const completedLessons = await query(
      `SELECT l.id, l.title, l.difficulty, ul.completed_at, ul.points_earned
       FROM user_lessons ul
       INNER JOIN lessons l ON ul.lesson_id = l.id
       WHERE ul.user_id = ? AND l.subject_id = ?
       ORDER BY ul.completed_at DESC`,
      [userId, subjectId]
    );

    // Historique des quiz
    const quizHistory = await query(
      `SELECT q.id, q.title, qa.score, qa.points_earned, qa.completed_at
       FROM quiz_attempts qa
       INNER JOIN quizzes q ON qa.quiz_id = q.id
       WHERE qa.user_id = ? AND q.subject_id = ?
       ORDER BY qa.completed_at DESC`,
      [userId, subjectId]
    );

    res.json({
      success: true,
      data: {
        subject: subjectCheck[0],
        progress: progress[0] || {},
        completedLessons,
        quizHistory
      }
    });
  } catch (error) {
    logger.logError(error, { context: 'get_subject_progress', userId: req.user?.id, subjectId: req.params.id });
    throw error;
  }
}));

// Obtenir les matières populaires (pour les utilisateurs non connectés)
router.get('/public/popular', optionalAuth, asyncHandler(async (req, res) => {
  try {
    const classLevel = req.query.class || '6ème';

    // Matières les plus populaires basées sur le nombre d'utilisateurs actifs
    const popularSubjects = await query(
      `SELECT s.id, s.name, s.description, s.icon, s.color, s.total_lessons,
              COUNT(DISTINCT up.user_id) as active_users,
              AVG(up.lessons_completed) as avg_lessons_completed
       FROM subjects s
       LEFT JOIN user_progress up ON s.id = up.subject_id
       WHERE s.is_active = true AND JSON_CONTAINS(s.class_levels, ?)
       GROUP BY s.id, s.name, s.description, s.icon, s.color, s.total_lessons
       ORDER BY active_users DESC, avg_lessons_completed DESC
       LIMIT 6`,
      [JSON.stringify(`"${classLevel}"`)]
    );

    res.json({
      success: true,
      data: {
        subjects: popularSubjects,
        classLevel
      }
    });
  } catch (error) {
    logger.logError(error, { context: 'get_popular_subjects' });
    throw error;
  }
}));

// Route publique pour récupérer toutes les matières (pour l'admin)
router.get('/admin/all', async (req, res) => {
  try {
    const subjects = await query(
      'SELECT id, name, description, icon, color, class_levels, total_lessons, is_active FROM subjects WHERE is_active = true ORDER BY name'
    );

    res.json({
      success: true,
      data: {
        subjects: subjects
      }
    });
  } catch (error) {
    logger.logError(error, { context: 'get_all_subjects_admin' });
    res.status(500).json({
      success: false,
      error: {
        message: 'Erreur lors de la récupération des matières'
      }
    });
  }
});

module.exports = router;


