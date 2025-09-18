const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');
const { query } = require('../config/database');
const logger = require('../config/logger');

/**
 * Récupère les statistiques de l'utilisateur
 */
router.get('/stats', authenticateToken, asyncHandler(async (req, res) => {
  try {
    const userId = req.user.id;

    // Récupérer les informations de base de l'utilisateur
    const users = await query(
      `SELECT id, name, total_points, level, avatar_url 
       FROM users WHERE id = ? AND deleted_at IS NULL`,
      [userId]
    );

    if (users.length === 0) {
      return res.status(404).json({ success: false, message: 'Utilisateur non trouvé' });
    }

    const user = users[0];

    // Récupérer le classement de l'utilisateur
    let rank = 1;
    try {
      const rankResult = await query(
        `SELECT COUNT(*) + 1 as rank 
         FROM users 
         WHERE total_points > ? AND deleted_at IS NULL`,
        [user.total_points]
      );
      rank = rankResult[0].rank;
    } catch (rankError) {
      console.error('Erreur lors du calcul du rang:', rankError);
      rank = 1;
    }

    // Récupérer les succès de l'utilisateur
    let achievements = [];
    try {
      achievements = await query(
        `SELECT a.id, a.title, a.description, a.icon, a.points, a.rarity,
                ua.unlocked_at,
                CASE WHEN ua.id IS NOT NULL THEN 1 ELSE 0 END as is_unlocked
         FROM achievements a
         LEFT JOIN user_achievements ua ON a.id = ua.achievement_id AND ua.user_id = ?
         WHERE a.is_active = 1
         ORDER BY a.points ASC`,
        [userId]
      );
    } catch (achievementError) {
      console.error('Erreur lors de la récupération des succès:', achievementError);
      achievements = [];
    }

    // Récupérer l'activité récente (simplifiée)
    let recentActivity = [];
    try {
      const quizActivity = await query(
        `SELECT 'quiz_completed' as type, 
                CONCAT('Quiz terminé: ', q.title) as description,
                25 as points,
                q.created_at as timestamp,
                s.name as subject
         FROM quizzes q
         LEFT JOIN subjects s ON q.subject_id = s.id
         WHERE q.created_by = ?
         ORDER BY q.created_at DESC
         LIMIT 5`,
        [userId]
      );

      const lessonActivity = await query(
        `SELECT 'lesson_completed' as type,
                CONCAT('Leçon terminée: ', l.title) as description,
                COALESCE(l.points_reward, 50) as points,
                l.created_at as timestamp,
                s.name as subject
         FROM lessons l
         LEFT JOIN subjects s ON l.subject_id = s.id
         WHERE l.created_by = ?
         ORDER BY l.created_at DESC
         LIMIT 5`,
        [userId]
      );

      recentActivity = [...quizActivity, ...lessonActivity]
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
        .slice(0, 10);
    } catch (activityError) {
      console.error('Erreur lors de la récupération de l\'activité:', activityError);
      recentActivity = [];
    }

    // Calculer les informations de niveau
    const levelInfo = calculateLevelInfo(user.total_points);
    const progress = calculateProgress(user.total_points, levelInfo);

    const stats = {
      totalPoints: user.total_points,
      level: user.level,
      rank,
      title: levelInfo.title,
      nextLevelPoints: progress.pointsToNext,
      currentLevelPoints: user.total_points - levelInfo.minPoints,
      achievements: achievements.map(achievement => ({
        ...achievement,
        isUnlocked: Boolean(achievement.is_unlocked),
        unlockedAt: achievement.unlocked_at
      })),
      recentActivity: recentActivity.map(activity => ({
        id: Math.random().toString(36).substr(2, 9),
        type: activity.type,
        description: activity.description,
        points: activity.points || 0,
        timestamp: activity.timestamp,
        subject: activity.subject
      }))
    };

    res.json({ success: true, data: stats });

  } catch (error) {
    logger.logError(error, { context: 'gamification_stats', userId: req.user?.id });
    res.status(500).json({ success: false, message: 'Erreur lors de la récupération des statistiques' });
  }
}));

/**
 * Récupère le classement global
 */
router.get('/leaderboard', authenticateToken, asyncHandler(async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const currentUserId = req.user.id;

    const leaderboard = await query(
      `SELECT id, name, total_points, level, avatar_url
       FROM users 
       WHERE deleted_at IS NULL
       ORDER BY total_points DESC, level DESC
       LIMIT ?`,
      [limit]
    );

    const leaderboardWithRank = leaderboard.map((user, index) => {
      const levelInfo = calculateLevelInfo(user.total_points);
      return {
        rank: index + 1,
        userId: user.id,
        name: user.name,
        avatarUrl: user.avatar_url,
        totalPoints: user.total_points,
        level: user.level,
        title: levelInfo.title,
        isCurrentUser: user.id === currentUserId
      };
    });

    res.json({ success: true, data: leaderboardWithRank });

  } catch (error) {
    logger.logError(error, { context: 'gamification_leaderboard' });
    res.status(500).json({ success: false, message: 'Erreur lors de la récupération du classement' });
  }
}));

/**
 * Récupère tous les succès
 */
router.get('/achievements', authenticateToken, asyncHandler(async (req, res) => {
  try {
    const userId = req.user.id;

    const achievements = await query(
      `SELECT a.id, a.title, a.description, a.icon, a.points, a.rarity,
              ua.unlocked_at,
              CASE WHEN ua.id IS NOT NULL THEN 1 ELSE 0 END as is_unlocked
       FROM achievements a
       LEFT JOIN user_achievements ua ON a.id = ua.achievement_id AND ua.user_id = ?
       WHERE a.is_active = 1
       ORDER BY a.points ASC`,
      [userId]
    );

    const formattedAchievements = achievements.map(achievement => ({
      id: achievement.id,
      title: achievement.title,
      description: achievement.description,
      icon: achievement.icon,
      points: achievement.points,
      rarity: achievement.rarity,
      isUnlocked: Boolean(achievement.is_unlocked),
      unlockedAt: achievement.unlocked_at
    }));

    res.json({ success: true, data: formattedAchievements });

  } catch (error) {
    logger.logError(error, { context: 'gamification_achievements' });
    res.status(500).json({ success: false, message: 'Erreur lors de la récupération des succès' });
  }
}));

/**
 * Ajoute des points à l'utilisateur
 */
router.post('/add-points', authenticateToken, asyncHandler(async (req, res) => {
  try {
    const { points, reason, subject } = req.body;
    const userId = req.user.id;

    if (!points || points <= 0) {
      return res.status(400).json({ success: false, message: 'Points invalides' });
    }

    // Récupérer les points actuels de l'utilisateur
    const currentUser = await query(
      `SELECT total_points FROM users WHERE id = ?`,
      [userId]
    );
    
    if (currentUser.length === 0) {
      return res.status(404).json({ success: false, message: 'Utilisateur non trouvé' });
    }
    
    const newTotalPoints = currentUser[0].total_points + points;
    
    // Calculer le nouveau niveau
    let newLevel = 1;
    if (newTotalPoints >= 10000) newLevel = 8;
    else if (newTotalPoints >= 4000) newLevel = 7;
    else if (newTotalPoints >= 2000) newLevel = 6;
    else if (newTotalPoints >= 1000) newLevel = 5;
    else if (newTotalPoints >= 500) newLevel = 4;
    else if (newTotalPoints >= 250) newLevel = 3;
    else if (newTotalPoints >= 100) newLevel = 2;
    
    // Mettre à jour les points et le niveau
    await query(
      `UPDATE users 
       SET total_points = ?, level = ?
       WHERE id = ?`,
      [newTotalPoints, newLevel, userId]
    );

    // Vérifier les succès déblocables
    try {
      await checkAndUnlockAchievements(userId);
    } catch (achievementError) {
      console.error('Erreur lors de la vérification des succès:', achievementError);
      // Ne pas faire échouer l'ajout de points si la vérification des succès échoue
    }

    logger.logEvent('points_added', { 
      userId, 
      points, 
      reason, 
      subject 
    });

    res.json({ success: true, message: 'Points ajoutés avec succès' });

  } catch (error) {
    logger.logError(error, { context: 'gamification_add_points', userId: req.user?.id });
    res.status(500).json({ success: false, message: 'Erreur lors de l\'ajout de points' });
  }
}));

/**
 * Marque une leçon comme terminée
 */
router.post('/complete-lesson', authenticateToken, asyncHandler(async (req, res) => {
  try {
    const { lessonId, points } = req.body;
    const userId = req.user.id;

    if (!lessonId) {
      return res.status(400).json({ success: false, message: 'ID de leçon manquant' });
    }

    // Vérifier si la leçon existe
    const lessons = await query(
      `SELECT id, title, points_reward FROM lessons WHERE id = ? AND is_active = 1`,
      [lessonId]
    );

    if (lessons.length === 0) {
      return res.status(404).json({ success: false, message: 'Leçon non trouvée' });
    }

    const lesson = lessons[0];

    // Vérifier si la leçon n'est pas déjà complétée
    const existingCompletion = await query(
      `SELECT id FROM user_lessons WHERE user_id = ? AND lesson_id = ?`,
      [userId, lessonId]
    );

    if (existingCompletion.length > 0) {
      return res.status(400).json({ success: false, message: 'Leçon déjà complétée' });
    }

    // Marquer la leçon comme terminée
    const pointsToAward = points || lesson.points_reward || 50;
    await query(
      `INSERT INTO user_lessons (id, user_id, lesson_id, completed_at, points_earned) 
       VALUES (?, ?, ?, NOW(), ?)`,
      [require('crypto').randomUUID(), userId, lessonId, pointsToAward]
    );

    // Ajouter les points à l'utilisateur
    const currentUser = await query(
      `SELECT total_points FROM users WHERE id = ?`,
      [userId]
    );
    
    const newTotalPoints = currentUser[0].total_points + pointsToAward;
    
    // Calculer le nouveau niveau
    let newLevel = 1;
    if (newTotalPoints >= 10000) newLevel = 8;
    else if (newTotalPoints >= 4000) newLevel = 7;
    else if (newTotalPoints >= 2000) newLevel = 6;
    else if (newTotalPoints >= 1000) newLevel = 5;
    else if (newTotalPoints >= 500) newLevel = 4;
    else if (newTotalPoints >= 250) newLevel = 3;
    else if (newTotalPoints >= 100) newLevel = 2;
    
    // Mettre à jour les points et le niveau
    await query(
      `UPDATE users SET total_points = ?, level = ? WHERE id = ?`,
      [newTotalPoints, newLevel, userId]
    );

    // Vérifier les succès déblocables
    try {
      await checkAndUnlockAchievements(userId);
    } catch (achievementError) {
      console.error('Erreur lors de la vérification des succès:', achievementError);
    }

    logger.logEvent('lesson_completed', { 
      userId, 
      lessonId, 
      points: pointsToAward 
    });

    res.json({ 
      success: true, 
      message: 'Leçon marquée comme terminée',
      points: pointsToAward,
      newTotalPoints,
      newLevel
    });

  } catch (error) {
    logger.logError(error, { context: 'gamification_complete_lesson', userId: req.user?.id });
    res.status(500).json({ success: false, message: 'Erreur lors de la completion de la leçon' });
  }
}));

/**
 * Vérifie si une leçon est terminée par l'utilisateur
 */
router.get('/check-lesson-completion/:lessonId', authenticateToken, asyncHandler(async (req, res) => {
  const { lessonId } = req.params;
  const userId = req.user.id;

  try {
    const result = await query(
      `SELECT completed_at FROM user_lessons 
       WHERE user_id = ? AND lesson_id = ? AND completed_at IS NOT NULL`,
      [userId, lessonId]
    );

    const isCompleted = result.length > 0;
    
    res.json({
      success: true,
      isCompleted,
      completedAt: isCompleted ? result[0].completed_at : null
    });

  } catch (error) {
    console.error('Erreur lors de la vérification de la leçon:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la vérification de la leçon'
    });
  }
}));

/**
 * Enregistre une tentative de quiz
 */
router.post('/record-quiz-attempt', authenticateToken, asyncHandler(async (req, res) => {
  try {
    const { quizId, score, totalQuestions, correctAnswers, timeSpent, answers } = req.body;
    const userId = req.user.id;

    if (!quizId || score === undefined) {
      return res.status(400).json({ success: false, message: 'Paramètres manquants' });
    }

    // Vérifier si le quiz existe
    const quizzes = await query(
      `SELECT id, title, subject_id FROM quizzes WHERE id = ? AND is_active = 1`,
      [quizId]
    );

    if (quizzes.length === 0) {
      return res.status(404).json({ success: false, message: 'Quiz non trouvé' });
    }

    const quiz = quizzes[0];

    // Calculer les points selon le système équitable
    const pointsData = calculateQuizPoints(totalQuestions, correctAnswers);
    
    // Enregistrer la tentative
    await query(
      `INSERT INTO quiz_attempts (id, quiz_id, user_id, score, total_questions, correct_answers, time_spent, answers, points_earned) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        require('crypto').randomUUID(),
        quizId,
        userId,
        score,
        totalQuestions,
        correctAnswers,
        timeSpent || 0,
        JSON.stringify(answers || []),
        pointsData.netPoints // Points nets selon le nouveau système
      ]
    );

    // Mettre à jour les points de l'utilisateur avec les points nets
    const pointsToAdd = pointsData.netPoints;
    const currentUser = await query(
      `SELECT total_points FROM users WHERE id = ?`,
      [userId]
    );
    
    const newTotalPoints = currentUser[0].total_points + pointsToAdd;
    
    // Calculer le nouveau niveau
    let newLevel = 1;
    if (newTotalPoints >= 10000) newLevel = 8;
    else if (newTotalPoints >= 4000) newLevel = 7;
    else if (newTotalPoints >= 2000) newLevel = 6;
    else if (newTotalPoints >= 1000) newLevel = 5;
    else if (newTotalPoints >= 500) newLevel = 4;
    else if (newTotalPoints >= 250) newLevel = 3;
    else if (newTotalPoints >= 100) newLevel = 2;
    
    // Mettre à jour les points et le niveau
    await query(
      `UPDATE users SET total_points = ?, level = ? WHERE id = ?`,
      [newTotalPoints, newLevel, userId]
    );

    // Mettre à jour le progrès de la matière
    try {
      await query(
        `INSERT INTO user_progress (id, user_id, subject_id, quizzes_completed, total_points, last_activity_at) 
         VALUES (?, ?, ?, 1, ?, NOW())
         ON DUPLICATE KEY UPDATE 
         quizzes_completed = quizzes_completed + 1,
         total_points = total_points + ?,
         last_activity_at = NOW()`,
        [require('crypto').randomUUID(), userId, quiz.subject_id, pointsToAdd, pointsToAdd]
      );
    } catch (progressError) {
      console.error('Erreur lors de la mise à jour du progrès:', progressError);
    }

    // Vérifier les succès déblocables
    try {
      await checkAndUnlockAchievements(userId);
    } catch (achievementError) {
      console.error('Erreur lors de la vérification des succès:', achievementError);
    }

    logger.logEvent('quiz_attempt_recorded', { 
      userId, 
      quizId, 
      score, 
      points: pointsToAdd 
    });

    res.json({ 
      success: true, 
      message: 'Tentative enregistrée',
      points: pointsToAdd,
      newTotalPoints,
      newLevel,
      pointsData: {
        pointsPerQuestion: pointsData.pointsPerQuestion,
        pointsEarned: pointsData.pointsEarned,
        pointsLost: pointsData.pointsLost,
        netPoints: pointsData.netPoints
      }
    });

  } catch (error) {
    logger.logError(error, { context: 'gamification_record_quiz_attempt', userId: req.user?.id });
    res.status(500).json({ success: false, message: 'Erreur lors de l\'enregistrement de la tentative' });
  }
}));

/**
 * Débloque un succès
 */
router.post('/unlock-achievement', authenticateToken, asyncHandler(async (req, res) => {
  try {
    const { achievementId } = req.body;
    const userId = req.user.id;

    // Vérifier si le succès existe
    const achievements = await query(
      `SELECT id, points FROM achievements WHERE id = ? AND is_active = 1`,
      [achievementId]
    );

    if (achievements.length === 0) {
      return res.status(404).json({ success: false, message: 'Succès non trouvé' });
    }

    // Vérifier si déjà débloqué
    const existing = await query(
      `SELECT id FROM user_achievements WHERE user_id = ? AND achievement_id = ?`,
      [userId, achievementId]
    );

    if (existing.length > 0) {
      return res.status(400).json({ success: false, message: 'Succès déjà débloqué' });
    }

    // Débloquer le succès
    await query(
      `INSERT INTO user_achievements (id, user_id, achievement_id) VALUES (?, ?, ?)`,
      [require('crypto').randomUUID(), userId, achievementId]
    );

    // Ajouter les points du succès
    const achievement = achievements[0];
    await query(
      `UPDATE users SET total_points = total_points + ? WHERE id = ?`,
      [achievement.points, userId]
    );

    logger.logEvent('achievement_unlocked', { 
      userId, 
      achievementId, 
      points: achievement.points 
    });

    res.json({ success: true, message: 'Succès débloqué avec succès' });

  } catch (error) {
    logger.logError(error, { context: 'gamification_unlock_achievement', userId: req.user?.id });
    res.status(500).json({ success: false, message: 'Erreur lors du déblocage du succès' });
  }
}));

/**
 * Calcule les points pour un quiz selon le système équitable
 */
function calculateQuizPoints(totalQuestions, correctAnswers) {
  const pointsPerQuestion = getPointsPerQuestion(totalQuestions);
  const pointsEarned = correctAnswers * pointsPerQuestion;
  const pointsLost = (totalQuestions - correctAnswers) * pointsPerQuestion;
  const netPoints = pointsEarned - pointsLost;

  return {
    pointsPerQuestion,
    pointsEarned,
    pointsLost,
    netPoints
  };
}

/**
 * Obtient les points par question selon le nombre total de questions
 */
function getPointsPerQuestion(totalQuestions) {
  switch (totalQuestions) {
    case 5:
      return 3; // 15 points total (3 x 5)
    case 10:
      return 1.5; // 15 points total (1.5 x 10)
    case 15:
      return 1; // 15 points total (1 x 15)
    case 20:
      return 0.75; // 15 points total (0.75 x 20)
    default:
      return 15 / totalQuestions; // Calcul automatique pour maintenir 15 points total
  }
}

/**
 * Calcule les informations de niveau
 */
function calculateLevelInfo(points) {
  const levels = [
    { level: 1, title: 'Débutant', minPoints: 0, maxPoints: 99 },
    { level: 2, title: 'Apprenti', minPoints: 100, maxPoints: 249 },
    { level: 3, title: 'Étudiant', minPoints: 250, maxPoints: 499 },
    { level: 4, title: 'Étoile montante', minPoints: 500, maxPoints: 999 },
    { level: 5, title: 'Champion', minPoints: 1000, maxPoints: 1999 },
    { level: 6, title: 'Maître', minPoints: 2000, maxPoints: 3999 },
    { level: 7, title: 'Légende', minPoints: 4000, maxPoints: 9999 },
    { level: 8, title: 'Immortel', minPoints: 10000, maxPoints: Infinity }
  ];

  for (let i = levels.length - 1; i >= 0; i--) {
    const level = levels[i];
    if (points >= level.minPoints) {
      return level;
    }
  }
  return levels[0];
}

/**
 * Calcule la progression vers le niveau suivant
 */
function calculateProgress(points, currentLevel) {
  const levels = [
    { level: 1, minPoints: 0 }, { level: 2, minPoints: 100 }, { level: 3, minPoints: 250 },
    { level: 4, minPoints: 500 }, { level: 5, minPoints: 1000 }, { level: 6, minPoints: 2000 },
    { level: 7, minPoints: 4000 }, { level: 8, minPoints: 10000 }
  ];

  const nextLevel = levels.find(l => l.level === currentLevel.level + 1);
  if (!nextLevel) {
    return { progress: 100, pointsToNext: 0 };
  }

  const pointsInCurrentLevel = points - currentLevel.minPoints;
  const pointsNeededForNext = nextLevel.minPoints - currentLevel.minPoints;
  const progress = Math.min((pointsInCurrentLevel / pointsNeededForNext) * 100, 100);
  const pointsToNext = Math.max(nextLevel.minPoints - points, 0);

  return { progress, pointsToNext };
}

/**
 * Vérifie et débloque les succès automatiquement
 */
async function checkAndUnlockAchievements(userId) {
  try {
    // Récupérer les statistiques de l'utilisateur
    const users = await query(
      `SELECT total_points, level FROM users WHERE id = ?`,
      [userId]
    );
    
    if (users.length === 0) {
      console.log('Utilisateur non trouvé pour la vérification des succès');
      return;
    }
    
    const user = users[0];

    // Récupérer les succès déjà débloqués
    const unlockedAchievements = await query(
      `SELECT achievement_id FROM user_achievements WHERE user_id = ?`,
      [userId]
    );
    const unlockedIds = unlockedAchievements.map(ua => ua.achievement_id);

    // Récupérer tous les succès
    const allAchievements = await query(
      `SELECT id, requirements FROM achievements WHERE is_active = 1`
    );
    
    if (!allAchievements || allAchievements.length === 0) {
      console.log('Aucun succès trouvé dans la base de données');
      return;
    }

    // Vérifier chaque succès
    for (const achievement of allAchievements) {
      if (unlockedIds.includes(achievement.id)) continue;

      let requirements;
      try {
        requirements = JSON.parse(achievement.requirements);
      } catch (parseError) {
        console.error('Erreur lors du parsing des requirements pour le succès:', achievement.id, parseError);
        continue;
      }
      
      let shouldUnlock = false;

      switch (requirements.type) {
        case 'first_quiz':
          // Vérifier si l'utilisateur a complété au moins un quiz
          const quizCount = await query(
            `SELECT COUNT(*) as count FROM quizzes WHERE created_by = ?`,
            [userId]
          );
          shouldUnlock = quizCount[0].count > 0;
          break;

        case 'perfect_score':
          // Vérifier si l'utilisateur a obtenu un score parfait
          const perfectScores = await query(
            `SELECT COUNT(*) as count FROM quiz_attempts 
             WHERE user_id = ? AND score_percentage >= ?`,
            [userId, requirements.percentage]
          );
          shouldUnlock = perfectScores[0].count > 0;
          break;

        case 'first_lesson':
        case 'lesson_completed':
          // Vérifier le nombre de leçons complétées
          const lessonCount = await query(
            `SELECT COUNT(*) as count FROM user_lessons 
             WHERE user_id = ? AND completed_at IS NOT NULL`,
            [userId]
          );
          shouldUnlock = lessonCount[0].count >= (requirements.count || 1);
          break;

        case 'subjects_explored':
          // Vérifier le nombre de matières explorées
          const subjectCount = await query(
            `SELECT COUNT(DISTINCT subject_id) as count FROM user_lessons 
             WHERE user_id = ? AND completed_at IS NOT NULL`,
            [userId]
          );
          shouldUnlock = subjectCount[0].count >= requirements.count;
          break;

        case 'total_points':
          // Vérifier les points totaux
          shouldUnlock = user.total_points >= requirements.points;
          break;
      }

      if (shouldUnlock) {
        console.log(`🎉 Déblocage du succès: ${achievement.title} pour l'utilisateur ${userId}`);
        // Débloquer le succès
        await query(
          `INSERT INTO user_achievements (id, user_id, achievement_id) VALUES (?, ?, ?)`,
          [require('crypto').randomUUID(), userId, achievement.id]
        );
        console.log(`✅ Succès débloqué: ${achievement.title}`);
        
        logger.logEvent('achievement_auto_unlocked', { 
          userId, 
          achievementId: achievement.id 
        });
      } else {
        console.log(`❌ Succès non débloqué: ${achievement.title} (requirements: ${JSON.stringify(requirements)})`);
      }
    }
  } catch (error) {
    logger.logError(error, { context: 'check_achievements', userId });
  }
}

module.exports = router;
