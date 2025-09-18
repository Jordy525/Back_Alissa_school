const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const { query } = require('../config/database');
const { asyncHandler } = require('../middleware/errorHandler');
const logger = require('../config/logger');

const router = express.Router();

/**
 * Récupère les progrès de l'utilisateur pour une matière
 */
router.get('/subject/:subjectId', authenticateToken, asyncHandler(async (req, res) => {
  try {
    const { subjectId } = req.params;
    const userId = req.user.id;

    // Récupérer ou créer le progrès pour cette matière
    let progress = await query(
      `SELECT * FROM user_progress WHERE user_id = ? AND subject_id = ?`,
      [userId, subjectId]
    );

    if (progress.length === 0) {
      // Créer un nouveau progrès
      await query(
        `INSERT INTO user_progress (id, user_id, subject_id, lessons_completed, quizzes_completed, total_points, current_streak, longest_streak, last_activity_at) 
         VALUES (?, ?, ?, 0, 0, 0, 0, 0, NULL)`,
        [require('crypto').randomUUID(), userId, subjectId]
      );
      
      progress = [{
        lessons_completed: 0,
        quizzes_completed: 0,
        total_points: 0,
        current_streak: 0,
        longest_streak: 0,
        last_activity_at: null
      }];
    }

    // Récupérer les leçons complétées pour cette matière
    const completedLessons = await query(
      `SELECT ul.*, l.title, l.difficulty, l.points_reward
       FROM user_lessons ul
       JOIN lessons l ON ul.lesson_id = l.id
       WHERE ul.user_id = ? AND l.subject_id = ?
       ORDER BY ul.completed_at DESC`,
      [userId, subjectId]
    );

    // Récupérer les quiz complétés pour cette matière
    const completedQuizzes = await query(
      `SELECT qa.*, q.title, qa.score, qa.total_questions, qa.correct_answers
       FROM quiz_attempts qa
       JOIN quizzes q ON qa.quiz_id = q.id
       WHERE qa.user_id = ? AND q.subject_id = ?
       ORDER BY qa.completed_at DESC`,
      [userId, subjectId]
    );

    res.json({
      success: true,
      data: {
        progress: progress[0],
        completedLessons,
        completedQuizzes,
        totalLessons: completedLessons.length,
        totalQuizzes: completedQuizzes.length
      }
    });

  } catch (error) {
    logger.logError(error, { context: 'progress_subject', userId: req.user?.id, subjectId: req.params.subjectId });
    res.status(500).json({ success: false, message: 'Erreur lors de la récupération des progrès' });
  }
}));

/**
 * Met à jour le progrès de l'utilisateur
 */
router.post('/update', authenticateToken, asyncHandler(async (req, res) => {
  try {
    const { subjectId, type, points, lessonId, quizId } = req.body;
    const userId = req.user.id;

    if (!subjectId || !type) {
      return res.status(400).json({ success: false, message: 'Paramètres manquants' });
    }

    // Récupérer le progrès actuel
    let progress = await query(
      `SELECT * FROM user_progress WHERE user_id = ? AND subject_id = ?`,
      [userId, subjectId]
    );

    if (progress.length === 0) {
      // Créer un nouveau progrès
      await query(
        `INSERT INTO user_progress (id, user_id, subject_id, lessons_completed, quizzes_completed, total_points, current_streak, longest_streak, last_activity_at) 
         VALUES (?, ?, ?, 0, 0, 0, 0, 0, NOW())`,
        [require('crypto').randomUUID(), userId, subjectId]
      );
      progress = [{ lessons_completed: 0, quizzes_completed: 0, total_points: 0, current_streak: 0, longest_streak: 0 }];
    }

    const currentProgress = progress[0];
    let updateFields = {};
    let updateValues = [];

    if (type === 'lesson_completed') {
      updateFields.lessons_completed = currentProgress.lessons_completed + 1;
      updateFields.total_points = currentProgress.total_points + (points || 0);
      updateFields.current_streak = currentProgress.current_streak + 1;
      updateFields.longest_streak = Math.max(currentProgress.longest_streak, currentProgress.current_streak + 1);
      updateFields.last_activity_at = 'NOW()';
    } else if (type === 'quiz_completed') {
      updateFields.quizzes_completed = currentProgress.quizzes_completed + 1;
      updateFields.total_points = currentProgress.total_points + (points || 0);
      updateFields.current_streak = currentProgress.current_streak + 1;
      updateFields.longest_streak = Math.max(currentProgress.longest_streak, currentProgress.current_streak + 1);
      updateFields.last_activity_at = 'NOW()';
    }

    // Mettre à jour le progrès
    const setClause = Object.keys(updateFields).map(key => `${key} = ?`).join(', ');
    updateValues = Object.values(updateFields);
    updateValues.push(userId, subjectId);

    await query(
      `UPDATE user_progress SET ${setClause} WHERE user_id = ? AND subject_id = ?`,
      updateValues
    );

    res.json({
      success: true,
      message: 'Progrès mis à jour',
      data: updateFields
    });

  } catch (error) {
    logger.logError(error, { context: 'progress_update', userId: req.user?.id });
    res.status(500).json({ success: false, message: 'Erreur lors de la mise à jour des progrès' });
  }
}));

/**
 * Récupère les statistiques globales de l'utilisateur
 */
router.get('/stats', authenticateToken, asyncHandler(async (req, res) => {
  try {
    const userId = req.user.id;

    // Statistiques globales
    const globalStats = await query(
      `SELECT 
        COUNT(DISTINCT subject_id) as subjects_explored,
        SUM(lessons_completed) as total_lessons,
        SUM(quizzes_completed) as total_quizzes,
        SUM(total_points) as total_points,
        AVG(current_streak) as avg_streak,
        MAX(longest_streak) as best_streak
       FROM user_progress 
       WHERE user_id = ?`,
      [userId]
    );

    // Progrès par matière
    const subjectProgress = await query(
      `SELECT 
        s.name as subject_name,
        s.icon as subject_icon,
        s.color as subject_color,
        up.lessons_completed,
        up.quizzes_completed,
        up.total_points,
        up.current_streak,
        up.longest_streak,
        up.last_activity_at
       FROM user_progress up
       JOIN subjects s ON up.subject_id = s.id
       WHERE up.user_id = ?
       ORDER BY up.last_activity_at DESC`,
      [userId]
    );

    // Activité récente
    const recentActivity = await query(
      `SELECT 'lesson' as type, ul.completed_at as timestamp, l.title as title, s.name as subject
       FROM user_lessons ul
       JOIN lessons l ON ul.lesson_id = l.id
       JOIN subjects s ON l.subject_id = s.id
       WHERE ul.user_id = ?
       UNION ALL
       SELECT 'quiz' as type, qa.completed_at as timestamp, q.title as title, s.name as subject
       FROM quiz_attempts qa
       JOIN quizzes q ON qa.quiz_id = q.id
       JOIN subjects s ON q.subject_id = s.id
       WHERE qa.user_id = ?
       ORDER BY timestamp DESC
       LIMIT 10`,
      [userId, userId]
    );

    res.json({
      success: true,
      data: {
        global: globalStats[0] || {
          subjects_explored: 0,
          total_lessons: 0,
          total_quizzes: 0,
          total_points: 0,
          avg_streak: 0,
          best_streak: 0
        },
        bySubject: subjectProgress,
        recentActivity
      }
    });

  } catch (error) {
    logger.logError(error, { context: 'progress_stats', userId: req.user?.id });
    res.status(500).json({ success: false, message: 'Erreur lors de la récupération des statistiques' });
  }
}));

/**
 * Récupère la progression globale de l'utilisateur
 */
router.get('/global', authenticateToken, asyncHandler(async (req, res) => {
  try {
    const userId = req.user.id;

    // Récupérer les matières de l'utilisateur
    const userSubjects = await query(
      `SELECT matieres FROM users WHERE id = ?`,
      [userId]
    );

    if (userSubjects.length > 0 && userSubjects[0].matieres) {
      const subjects = JSON.parse(userSubjects[0].matieres);
      
      // Créer les entrées de progression manquantes pour chaque matière
      for (const subjectId of subjects) {
        const existingProgress = await query(
          `SELECT id FROM user_progress WHERE user_id = ? AND subject_id = ?`,
          [userId, subjectId]
        );

        if (existingProgress.length === 0) {
          await query(
            `INSERT INTO user_progress (id, user_id, subject_id, lessons_completed, quizzes_completed, total_points, current_streak, longest_streak, last_activity_at) 
             VALUES (?, ?, ?, 0, 0, 0, 0, 0, NULL)`,
            [require('crypto').randomUUID(), userId, subjectId]
          );
        }
      }
    }

    // Récupérer les statistiques globales
    const globalStats = await query(
      `SELECT 
        COUNT(DISTINCT up.subject_id) as subjects_explored,
        SUM(up.lessons_completed) as total_lessons,
        SUM(up.quizzes_completed) as total_quizzes,
        SUM(up.total_points) as total_points,
        AVG(up.current_streak) as avg_streak,
        MAX(up.longest_streak) as best_streak
       FROM user_progress up
       WHERE up.user_id = ?`,
      [userId]
    );

    // Récupérer la progression par matière
    const subjectsProgress = await query(
      `SELECT 
        up.subject_id,
        s.name as subject_name,
        up.lessons_completed,
        up.quizzes_completed,
        up.total_points,
        up.current_streak,
        up.longest_streak,
        up.last_activity_at
       FROM user_progress up
       JOIN subjects s ON up.subject_id = s.id
       WHERE up.user_id = ?
       ORDER BY up.total_points DESC`,
      [userId]
    );

    // Calculer les niveaux pour chaque matière
    const subjectsWithLevels = subjectsProgress.map(subject => {
      const levelInfo = calculateLevel(subject.total_points);
      return {
        ...subject,
        level: levelInfo.level,
        xp: subject.total_points,
        nextLevelXp: levelInfo.nextLevelXp
      };
    });

    // Calculer le niveau global
    const totalXp = globalStats[0]?.total_points || 0;
    const globalLevelInfo = calculateLevel(totalXp);

    res.json({
      success: true,
      data: {
        totalLessonsCompleted: globalStats[0]?.total_lessons || 0,
        totalQuizzesCompleted: globalStats[0]?.total_quizzes || 0,
        totalPoints: totalXp,
        overallLevel: globalLevelInfo.level,
        totalXp: totalXp,
        nextLevelXp: globalLevelInfo.nextLevelXp,
        subjectsProgress: subjectsWithLevels
      }
    });

  } catch (error) {
    logger.logError(error, { context: 'progress_global', userId: req.user?.id });
    res.status(500).json({ success: false, message: 'Erreur lors de la récupération de la progression globale' });
  }
}));

/**
 * Met à jour la progression après un quiz
 */
router.post('/quiz', authenticateToken, asyncHandler(async (req, res) => {
  try {
    const { subjectId, points, isCompleted } = req.body;
    const userId = req.user.id;

    if (!subjectId || points === undefined) {
      return res.status(400).json({ success: false, message: 'Paramètres manquants' });
    }

    // Mettre à jour ou créer la progression pour cette matière
    await query(
      `INSERT INTO user_progress (id, user_id, subject_id, lessons_completed, quizzes_completed, total_points, current_streak, longest_streak, last_activity_at) 
       VALUES (?, ?, ?, 0, ?, ?, 1, 1, NOW())
       ON DUPLICATE KEY UPDATE 
       quizzes_completed = quizzes_completed + ?,
       total_points = total_points + ?,
       current_streak = current_streak + 1,
       longest_streak = GREATEST(longest_streak, current_streak + 1),
       last_activity_at = NOW()`,
      [
        require('crypto').randomUUID(), 
        userId, 
        subjectId, 
        isCompleted ? 1 : 0, 
        points,
        isCompleted ? 1 : 0,
        points
      ]
    );

    res.json({ success: true, message: 'Progression du quiz mise à jour' });

  } catch (error) {
    logger.logError(error, { context: 'progress_quiz', userId: req.user?.id });
    res.status(500).json({ success: false, message: 'Erreur lors de la mise à jour de la progression du quiz' });
  }
}));

/**
 * Met à jour la progression après une leçon
 */
router.post('/lesson', authenticateToken, asyncHandler(async (req, res) => {
  try {
    const { subjectId, points, isCompleted } = req.body;
    const userId = req.user.id;

    if (!subjectId || points === undefined) {
      return res.status(400).json({ success: false, message: 'Paramètres manquants' });
    }

    // Mettre à jour ou créer la progression pour cette matière
    await query(
      `INSERT INTO user_progress (id, user_id, subject_id, lessons_completed, quizzes_completed, total_points, current_streak, longest_streak, last_activity_at) 
       VALUES (?, ?, ?, ?, 0, ?, 1, 1, NOW())
       ON DUPLICATE KEY UPDATE 
       lessons_completed = lessons_completed + ?,
       total_points = total_points + ?,
       current_streak = current_streak + 1,
       longest_streak = GREATEST(longest_streak, current_streak + 1),
       last_activity_at = NOW()`,
      [
        require('crypto').randomUUID(), 
        userId, 
        subjectId, 
        isCompleted ? 1 : 0, 
        points,
        isCompleted ? 1 : 0,
        points
      ]
    );

    res.json({ success: true, message: 'Progression de la leçon mise à jour' });

  } catch (error) {
    logger.logError(error, { context: 'progress_lesson', userId: req.user?.id });
    res.status(500).json({ success: false, message: 'Erreur lors de la mise à jour de la progression de la leçon' });
  }
}));

/**
 * Calcule le niveau basé sur les points XP
 */
function calculateLevel(xp) {
  const levels = [
    { level: 1, minXp: 0, maxXp: 99 },
    { level: 2, minXp: 100, maxXp: 249 },
    { level: 3, minXp: 250, maxXp: 499 },
    { level: 4, minXp: 500, maxXp: 999 },
    { level: 5, minXp: 1000, maxXp: 1999 },
    { level: 6, minXp: 2000, maxXp: 3999 },
    { level: 7, minXp: 4000, maxXp: 9999 },
    { level: 8, minXp: 10000, maxXp: Infinity }
  ];

  for (let i = levels.length - 1; i >= 0; i--) {
    const levelInfo = levels[i];
    if (xp >= levelInfo.minXp) {
      const nextLevel = levels[i + 1] || { minXp: Infinity };
      return {
        level: levelInfo.level,
        currentXp: xp - levelInfo.minXp,
        nextLevelXp: nextLevel.minXp - levelInfo.minXp
      };
    }
  }

  return { level: 1, currentXp: xp, nextLevelXp: 100 };
}

module.exports = router;

