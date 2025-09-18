const express = require('express');
const { body, validationResult } = require('express-validator');
const { v4: uuidv4 } = require('uuid');

const { query, transaction } = require('../config/database');
const { authenticateToken, requireClassSelection } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');
const logger = require('../config/logger');

const router = express.Router();

// Système de points pour les quiz
const QUIZ_POINTS = {
  10: 50,   // Perfect score
  9: 40,    // Excellent
  8: 30,    // Very good
  7: 20,    // Good
  6: 10,    // Pass (6/10)
  5: 10,    // Pass (5/10)
  4: -10,   // Fail
  3: -20,   // Poor
  2: -30,   // Very poor
  1: -40,   // Critical
  0: -50    // No answers
};

const MASTERY_THRESHOLD = 250; // Points pour maîtriser une matière

// Validation pour la soumission de quiz
const validateQuizSubmission = [
  body('answers')
    .isArray({ min: 1 })
    .withMessage('Les réponses doivent être un tableau'),
  body('answers.*.questionId')
    .notEmpty()
    .withMessage('ID de question requis'),
  body('answers.*.selectedAnswer')
    .isInt({ min: 0, max: 3 })
    .withMessage('Réponse sélectionnée invalide'),
  body('totalTimeSpent')
    .isInt({ min: 0 })
    .withMessage('Temps total invalide')
];

// Obtenir un quiz spécifique
router.get('/:id', authenticateToken, requireClassSelection, asyncHandler(async (req, res) => {
  try {
    const userId = req.user.id;
    const quizId = req.params.id;
    const classLevel = req.user.selectedClass;

    // Récupération du quiz avec vérification de disponibilité
    const quizzes = await query(
      `SELECT q.id, q.title, q.description, q.questions, q.time_limit, q.passing_score,
              s.id as subject_id, s.name as subject_name, s.icon as subject_icon, s.color as subject_color,
              l.id as lesson_id, l.title as lesson_title,
              CASE WHEN qa.id IS NOT NULL THEN true ELSE false END as is_completed,
              qa.score as best_score,
              qa.completed_at as last_attempt
       FROM quizzes q
       INNER JOIN subjects s ON q.subject_id = s.id
       LEFT JOIN lessons l ON q.lesson_id = l.id
       LEFT JOIN quiz_attempts qa ON q.id = qa.quiz_id AND qa.user_id = ?
       WHERE q.id = ? AND q.is_active = true AND s.is_active = true 
             AND JSON_CONTAINS(s.class_levels, ?)`,
      [userId, quizId, JSON.stringify(`"${classLevel}"`)]
    );

    if (quizzes.length === 0) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'Quiz non trouvé ou non disponible pour votre classe'
        }
      });
    }

    const quiz = quizzes[0];

    // Parsing des questions JSON
    try {
      quiz.questions = JSON.parse(quiz.questions);
    } catch (parseError) {
      logger.logError(parseError, { context: 'parse_quiz_questions', quizId });
      return res.status(500).json({
        success: false,
        error: {
          message: 'Erreur lors du chargement du quiz'
        }
      });
    }

    res.json({
      success: true,
      data: {
        quiz
      }
    });
  } catch (error) {
    logger.logError(error, { context: 'get_quiz', userId: req.user?.id, quizId: req.params.id });
    throw error;
  }
}));

// Soumettre les réponses d'un quiz
router.post('/:id/submit', authenticateToken, requireClassSelection, validateQuizSubmission, asyncHandler(async (req, res) => {
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
    const quizId = req.params.id;
    const { answers, totalTimeSpent } = req.body;

    // Récupération du quiz
    const quizzes = await query(
      `SELECT q.id, q.title, q.questions, q.passing_score, q.subject_id, q.lesson_id,
              s.name as subject_name
       FROM quizzes q
       INNER JOIN subjects s ON q.subject_id = s.id
       WHERE q.id = ? AND q.is_active = true`,
      [quizId]
    );

    if (quizzes.length === 0) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'Quiz non trouvé'
        }
      });
    }

    const quiz = quizzes[0];
    const questions = JSON.parse(quiz.questions);

    // Calcul du score
    let correctAnswers = 0;
    const detailedAnswers = [];

    for (const answer of answers) {
      const question = questions.find(q => q.id === answer.questionId);
      if (!question) continue;

      const isCorrect = question.correctAnswer === answer.selectedAnswer;
      if (isCorrect) correctAnswers++;

      detailedAnswers.push({
        questionId: answer.questionId,
        selectedAnswer: answer.selectedAnswer,
        correctAnswer: question.correctAnswer,
        isCorrect,
        timeSpent: answer.timeSpent || 0
      });
    }

    const totalQuestions = questions.length;
    const score = Math.round((correctAnswers / totalQuestions) * 10);
    const pointsEarned = QUIZ_POINTS[score] || 0;

    // Transaction pour enregistrer la tentative et mettre à jour les statistiques
    await transaction(async (connection) => {
      // Enregistrement de la tentative
      const attemptId = uuidv4();
      await connection.execute(
        `INSERT INTO quiz_attempts (id, quiz_id, user_id, score, total_questions, correct_answers, time_spent, answers, points_earned, completed_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
        [attemptId, quizId, userId, score, totalQuestions, correctAnswers, totalTimeSpent, JSON.stringify(detailedAnswers), pointsEarned]
      );

      // Mise à jour des points totaux de l'utilisateur
      if (pointsEarned !== 0) {
        await connection.execute(
          'UPDATE users SET total_points = total_points + ?, updated_at = NOW() WHERE id = ?',
          [pointsEarned, userId]
        );
      }

      // Mise à jour du progrès dans la matière
      const progressCheck = await connection.execute(
        'SELECT id FROM user_progress WHERE user_id = ? AND subject_id = ?',
        [userId, quiz.subject_id]
      );

      if (progressCheck[0].length > 0) {
        // Mise à jour du progrès existant
        await connection.execute(
          `UPDATE user_progress 
           SET quizzes_completed = quizzes_completed + 1,
               total_points = total_points + ?,
               last_activity_at = NOW(),
               updated_at = NOW()
           WHERE user_id = ? AND subject_id = ?`,
          [pointsEarned, userId, quiz.subject_id]
        );
      } else {
        // Création d'un nouveau progrès
        const progressId = uuidv4();
        await connection.execute(
          `INSERT INTO user_progress (id, user_id, subject_id, quizzes_completed, total_points, last_activity_at)
           VALUES (?, ?, ?, 1, ?, NOW())`,
          [progressId, userId, quiz.subject_id, pointsEarned]
        );
      }
    });

    // Vérification des succès potentiels
    await checkAndUnlockAchievements(userId, { quizId, score, pointsEarned });

    // Détermination du statut
    const status = score >= 6 ? 'passed' : 'failed';
    const isPerfect = score === 10;

    logger.logEvent('quiz_completed', { 
      userId, 
      quizId, 
      subjectId: quiz.subject_id,
      score, 
      pointsEarned,
      status 
    });

    res.json({
      success: true,
      message: 'Quiz soumis avec succès',
      data: {
        quizId,
        score,
        totalQuestions,
        correctAnswers,
        pointsEarned,
        status,
        isPerfect,
        passingScore: quiz.passing_score,
        detailedAnswers
      }
    });
  } catch (error) {
    logger.logError(error, { context: 'submit_quiz', userId: req.user?.id, quizId: req.params.id });
    throw error;
  }
}));

// Obtenir l'historique des tentatives d'un quiz
router.get('/:id/attempts', authenticateToken, requireClassSelection, asyncHandler(async (req, res) => {
  try {
    const userId = req.user.id;
    const quizId = req.params.id;
    const { page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;

    // Vérification que le quiz existe
    const quizCheck = await query(
      'SELECT id, title FROM quizzes WHERE id = ? AND is_active = true',
      [quizId]
    );

    if (quizCheck.length === 0) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'Quiz non trouvé'
        }
      });
    }

    // Récupération des tentatives
    const attempts = await query(
      `SELECT id, score, total_questions, correct_answers, time_spent, points_earned, completed_at
       FROM quiz_attempts
       WHERE quiz_id = ? AND user_id = ?
       ORDER BY completed_at DESC
       LIMIT ? OFFSET ?`,
      [quizId, userId, parseInt(limit), offset]
    );

    // Comptage total
    const totalCount = await query(
      'SELECT COUNT(*) as total FROM quiz_attempts WHERE quiz_id = ? AND user_id = ?',
      [quizId, userId]
    );

    res.json({
      success: true,
      data: {
        quiz: quizCheck[0],
        attempts,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: totalCount[0].total,
          totalPages: Math.ceil(totalCount[0].total / limit)
        }
      }
    });
  } catch (error) {
    logger.logError(error, { context: 'get_quiz_attempts', userId: req.user?.id, quizId: req.params.id });
    throw error;
  }
}));

// Obtenir les statistiques d'un quiz
router.get('/:id/stats', authenticateToken, requireClassSelection, asyncHandler(async (req, res) => {
  try {
    const userId = req.user.id;
    const quizId = req.params.id;

    // Vérification que le quiz existe
    const quizCheck = await query(
      'SELECT id, title, passing_score FROM quizzes WHERE id = ? AND is_active = true',
      [quizId]
    );

    if (quizCheck.length === 0) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'Quiz non trouvé'
        }
      });
    }

    // Statistiques de l'utilisateur
    const userStats = await query(
      `SELECT 
              COUNT(*) as total_attempts,
              AVG(score) as average_score,
              MAX(score) as best_score,
              MIN(score) as worst_score,
              SUM(points_earned) as total_points_earned,
              AVG(time_spent) as average_time
       FROM quiz_attempts
       WHERE quiz_id = ? AND user_id = ?`,
      [quizId, userId]
    );

    // Statistiques globales
    const globalStats = await query(
      `SELECT 
              COUNT(*) as total_attempts,
              AVG(score) as average_score,
              COUNT(DISTINCT user_id) as unique_users
       FROM quiz_attempts
       WHERE quiz_id = ?`,
      [quizId]
    );

    res.json({
      success: true,
      data: {
        quiz: quizCheck[0],
        userStats: userStats[0] || {},
        globalStats: globalStats[0] || {}
      }
    });
  } catch (error) {
    logger.logError(error, { context: 'get_quiz_stats', userId: req.user?.id, quizId: req.params.id });
    throw error;
  }
}));

// Obtenir tous les quiz d'une matière
router.get('/subject/:subjectId', authenticateToken, requireClassSelection, asyncHandler(async (req, res) => {
  try {
    const userId = req.user.id;
    const subjectId = req.params.subjectId;
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

    // Récupération des quiz de la matière
    const quizzes = await query(
      `SELECT q.id, q.title, q.description, q.time_limit, q.passing_score,
              l.id as lesson_id, l.title as lesson_title,
              CASE WHEN qa.id IS NOT NULL THEN true ELSE false END as is_completed,
              qa.score as best_score,
              qa.completed_at as last_attempt
       FROM quizzes q
       LEFT JOIN lessons l ON q.lesson_id = l.id
       LEFT JOIN quiz_attempts qa ON q.id = qa.quiz_id AND qa.user_id = ?
       WHERE q.subject_id = ? AND q.is_active = true
       ORDER BY q.created_at`,
      [userId, subjectId]
    );

    res.json({
      success: true,
      data: {
        subject: subjectCheck[0],
        quizzes
      }
    });
  } catch (error) {
    logger.logError(error, { context: 'get_subject_quizzes', userId: req.user?.id, subjectId: req.params.subjectId });
    throw error;
  }
}));

// Fonction utilitaire pour vérifier et débloquer les succès liés aux quiz
async function checkAndUnlockAchievements(userId, quizData = null) {
  try {
    // Récupération des succès disponibles
    const achievements = await query(
      'SELECT id, title, requirements FROM achievements WHERE is_active = true'
    );

    for (const achievement of achievements) {
      const requirements = JSON.parse(achievement.requirements);
      let shouldUnlock = false;

      // Vérification si l'utilisateur a déjà ce succès
      const existingAchievement = await query(
        'SELECT id FROM user_achievements WHERE user_id = ? AND achievement_id = ?',
        [userId, achievement.id]
      );

      if (existingAchievement.length > 0) continue;

      // Vérification des critères selon le type
      switch (requirements.type) {
        case 'perfect_quiz_score':
          if (quizData && quizData.score === 10) {
            shouldUnlock = true;
          }
          break;

        case 'quiz_master':
          const perfectQuizzes = await query(
            'SELECT COUNT(*) as count FROM quiz_attempts WHERE user_id = ? AND score = 10',
            [userId]
          );
          shouldUnlock = perfectQuizzes[0].count >= requirements.count;
          break;

        case 'subject_master':
          const subjectPoints = await query(
            'SELECT total_points FROM user_progress WHERE user_id = ? AND subject_id = ?',
            [userId, quizData?.subjectId]
          );
          shouldUnlock = subjectPoints.length > 0 && subjectPoints[0].total_points >= MASTERY_THRESHOLD;
          break;
      }

      if (shouldUnlock) {
        // Déblocage du succès
        const userAchievementId = uuidv4();
        await query(
          'INSERT INTO user_achievements (id, user_id, achievement_id, unlocked_at) VALUES (?, ?, ?, NOW())',
          [userAchievementId, userId, achievement.id]
        );

        logger.logEvent('achievement_unlocked', { 
          userId, 
          achievementId: achievement.id, 
          title: achievement.title 
        });
      }
    }
  } catch (error) {
    logger.logError(error, { context: 'check_quiz_achievements', userId });
  }
}

module.exports = router;


