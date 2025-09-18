const express = require('express');
const { query } = require('../config/database');
const { authenticateToken, requireClassSelection } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');
const logger = require('../config/logger');

const router = express.Router();

// Récupérer les leçons d'une matière pour la classe de l'utilisateur
router.get('/subject/:subjectId', authenticateToken, requireClassSelection, asyncHandler(async (req, res) => {
  try {
    const userId = req.user.id;
    const { subjectId } = req.params;
    const userClass = req.user.selectedClass;

    // Vérifier que la matière existe et est active
    const subjects = await query(
      'SELECT id, name, description FROM subjects WHERE id = ? AND is_active = true',
      [subjectId]
    );

    if (subjects.length === 0) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'Matière non trouvée'
        }
      });
    }

    // Récupérer les leçons de cette matière pour la classe de l'utilisateur
    const lessons = await query(
      `SELECT l.id, l.title, l.description, l.estimated_duration, l.difficulty, 
              l.points_reward, l.order_index, l.created_at,
              ul.completed_at, ul.points_earned
       FROM lessons l
       LEFT JOIN user_lessons ul ON l.id = ul.lesson_id AND ul.user_id = ?
       WHERE l.subject_id = ? AND l.class_level = ? AND l.is_active = true
       ORDER BY l.order_index ASC`,
      [userId, subjectId, userClass]
    );

    // Récupérer le progrès de l'utilisateur dans cette matière
    const progress = await query(
      'SELECT lessons_completed, total_points FROM user_progress WHERE user_id = ? AND subject_id = ?',
      [userId, subjectId]
    );

    logger.logEvent('lessons_retrieved', { userId, subjectId, classLevel: userClass, count: lessons.length });

    res.json({
      success: true,
      data: {
        subject: subjects[0],
        lessons: lessons.map(lesson => ({
          id: lesson.id,
          title: lesson.title,
          description: lesson.description,
          estimatedDuration: lesson.estimated_duration,
          difficulty: lesson.difficulty,
          pointsReward: lesson.points_reward,
          orderIndex: lesson.order_index,
          isCompleted: !!lesson.completed_at,
          completedAt: lesson.completed_at,
          pointsEarned: lesson.points_earned,
          createdAt: lesson.created_at
        })),
        progress: progress[0] || { lessons_completed: 0, total_points: 0 }
      }
    });
  } catch (error) {
    logger.logError(error, { context: 'get_lessons', userId: req.user?.id, subjectId: req.params.subjectId });
    throw error;
  }
}));

// Récupérer une leçon spécifique
router.get('/:lessonId', authenticateToken, requireClassSelection, asyncHandler(async (req, res) => {
  try {
    const userId = req.user.id;
    const { lessonId } = req.params;
    const userClass = req.user.selectedClass;

    // Récupérer la leçon avec vérification de la classe
    const lessons = await query(
      `SELECT l.id, l.subject_id, l.class_level, l.title, l.description, l.content,
              l.estimated_duration, l.difficulty, l.points_reward, l.order_index,
              l.created_at, s.name as subject_name,
              ul.completed_at, ul.points_earned
       FROM lessons l
       JOIN subjects s ON l.subject_id = s.id
       LEFT JOIN user_lessons ul ON l.id = ul.lesson_id AND ul.user_id = ?
       WHERE l.id = ? AND l.class_level = ? AND l.is_active = true`,
      [userId, lessonId, userClass]
    );

    if (lessons.length === 0) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'Leçon non trouvée ou non accessible pour votre classe'
        }
      });
    }

    const lesson = lessons[0];

    logger.logEvent('lesson_retrieved', { userId, lessonId, classLevel: userClass });

    res.json({
      success: true,
      data: {
        lesson: {
          id: lesson.id,
          subjectId: lesson.subject_id,
          subjectName: lesson.subject_name,
          classLevel: lesson.class_level,
          title: lesson.title,
          description: lesson.description,
          content: lesson.content,
          estimatedDuration: lesson.estimated_duration,
          difficulty: lesson.difficulty,
          pointsReward: lesson.points_reward,
          orderIndex: lesson.order_index,
          isCompleted: !!lesson.completed_at,
          completedAt: lesson.completed_at,
          pointsEarned: lesson.points_earned,
          createdAt: lesson.created_at
        }
      }
    });
  } catch (error) {
    logger.logError(error, { context: 'get_lesson', userId: req.user?.id, lessonId: req.params.lessonId });
    throw error;
  }
}));

// Marquer une leçon comme terminée
router.post('/:lessonId/complete', authenticateToken, requireClassSelection, asyncHandler(async (req, res) => {
  try {
    const userId = req.user.id;
    const { lessonId } = req.params;
    const userClass = req.user.selectedClass;

    // Vérifier que la leçon existe et est accessible
    const lessons = await query(
      'SELECT id, points_reward, subject_id FROM lessons WHERE id = ? AND class_level = ? AND is_active = true',
      [lessonId, userClass]
    );

    if (lessons.length === 0) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'Leçon non trouvée ou non accessible pour votre classe'
        }
      });
    }

    const lesson = lessons[0];

    // Vérifier si la leçon n'est pas déjà terminée
    const existingCompletion = await query(
      'SELECT id FROM user_lessons WHERE user_id = ? AND lesson_id = ?',
      [userId, lessonId]
    );

    if (existingCompletion.length > 0) {
      return res.status(409).json({
        success: false,
        error: {
          message: 'Cette leçon est déjà terminée'
        }
      });
    }

    // Marquer la leçon comme terminée
    await query(
      'INSERT INTO user_lessons (id, user_id, lesson_id, completed_at, points_earned) VALUES (?, ?, ?, NOW(), ?)',
      [require('uuid').v4(), userId, lessonId, lesson.points_reward]
    );

    // Mettre à jour le progrès de l'utilisateur
    await query(
      `INSERT INTO user_progress (id, user_id, subject_id, lessons_completed, total_points, last_activity_at, created_at, updated_at)
       VALUES (?, ?, ?, 1, ?, NOW(), NOW(), NOW())
       ON DUPLICATE KEY UPDATE
       lessons_completed = lessons_completed + 1,
       total_points = total_points + ?,
       last_activity_at = NOW(),
       updated_at = NOW()`,
      [require('uuid').v4(), userId, lesson.subject_id, lesson.points_reward, lesson.points_reward]
    );

    // Mettre à jour les points totaux de l'utilisateur
    await query(
      'UPDATE users SET total_points = total_points + ? WHERE id = ?',
      [lesson.points_reward, userId]
    );

    logger.logEvent('lesson_completed', { userId, lessonId, pointsEarned: lesson.points_reward });

    res.json({
      success: true,
      message: 'Leçon terminée avec succès',
      data: {
        pointsEarned: lesson.points_reward,
        completedAt: new Date().toISOString()
      }
    });
  } catch (error) {
    logger.logError(error, { context: 'complete_lesson', userId: req.user?.id, lessonId: req.params.lessonId });
    throw error;
  }
}));

module.exports = router;