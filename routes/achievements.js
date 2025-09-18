const express = require('express');

const { query } = require('../config/database');
const { authenticateToken, optionalAuth } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');
const logger = require('../config/logger');

const router = express.Router();

// Obtenir tous les succès
router.get('/', optionalAuth, asyncHandler(async (req, res) => {
  try {
    const userId = req.user?.id;
    const { rarity, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    let whereClause = 'a.is_active = true';
    let queryParams = [];

    if (rarity) {
      whereClause += ' AND a.rarity = ?';
      queryParams.push(rarity);
    }

    if (userId) {
      queryParams.push(userId);
    }

    // Récupération des succès avec statut de déblocage
    const achievements = await query(
      `SELECT a.id, a.title, a.description, a.icon, a.points, a.rarity, a.requirements,
              CASE WHEN ua.id IS NOT NULL THEN true ELSE false END as is_unlocked,
              ua.unlocked_at
       FROM achievements a
       LEFT JOIN user_achievements ua ON a.id = ua.achievement_id ${userId ? 'AND ua.user_id = ?' : 'AND ua.user_id IS NULL'}
       WHERE ${whereClause}
       ORDER BY a.rarity, a.points DESC
       LIMIT ? OFFSET ?`,
      [...queryParams, parseInt(limit), offset]
    );

    // Comptage total
    const totalCount = await query(
      `SELECT COUNT(*) as total
       FROM achievements a
       WHERE ${whereClause}`,
      queryParams.slice(0, -1) // Retirer l'userId du comptage
    );

    res.json({
      success: true,
      data: {
        achievements,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: totalCount[0].total,
          totalPages: Math.ceil(totalCount[0].total / limit)
        }
      }
    });
  } catch (error) {
    logger.logError(error, { context: 'get_achievements' });
    throw error;
  }
}));

// Obtenir un succès spécifique
router.get('/:id', optionalAuth, asyncHandler(async (req, res) => {
  try {
    const userId = req.user?.id;
    const achievementId = req.params.id;

    // Récupération du succès
    const achievements = await query(
      `SELECT a.id, a.title, a.description, a.icon, a.points, a.rarity, a.requirements,
              CASE WHEN ua.id IS NOT NULL THEN true ELSE false END as is_unlocked,
              ua.unlocked_at
       FROM achievements a
       LEFT JOIN user_achievements ua ON a.id = ua.achievement_id ${userId ? 'AND ua.user_id = ?' : 'AND ua.user_id IS NULL'}
       WHERE a.id = ? AND a.is_active = true`,
      userId ? [userId, achievementId] : [achievementId]
    );

    if (achievements.length === 0) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'Succès non trouvé'
        }
      });
    }

    const achievement = achievements[0];

    // Statistiques globales du succès
    const stats = await query(
      `SELECT 
              COUNT(*) as total_unlocked,
              COUNT(DISTINCT user_id) as unique_users
       FROM user_achievements
       WHERE achievement_id = ?`,
      [achievementId]
    );

    res.json({
      success: true,
      data: {
        achievement,
        stats: stats[0]
      }
    });
  } catch (error) {
    logger.logError(error, { context: 'get_achievement', achievementId: req.params.id });
    throw error;
  }
}));

// Obtenir les succès de l'utilisateur connecté
router.get('/user/unlocked', authenticateToken, asyncHandler(async (req, res) => {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 20, rarity } = req.query;
    const offset = (page - 1) * limit;

    let whereClause = 'a.is_active = true AND ua.user_id = ?';
    let queryParams = [userId];

    if (rarity) {
      whereClause += ' AND a.rarity = ?';
      queryParams.push(rarity);
    }

    // Succès débloqués par l'utilisateur
    const unlockedAchievements = await query(
      `SELECT a.id, a.title, a.description, a.icon, a.points, a.rarity, a.requirements,
              ua.unlocked_at
       FROM achievements a
       INNER JOIN user_achievements ua ON a.id = ua.achievement_id
       WHERE ${whereClause}
       ORDER BY ua.unlocked_at DESC
       LIMIT ? OFFSET ?`,
      [...queryParams, parseInt(limit), offset]
    );

    // Comptage total
    const totalCount = await query(
      `SELECT COUNT(*) as total
       FROM achievements a
       INNER JOIN user_achievements ua ON a.id = ua.achievement_id
       WHERE ${whereClause}`,
      queryParams
    );

    res.json({
      success: true,
      data: {
        achievements: unlockedAchievements,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: totalCount[0].total,
          totalPages: Math.ceil(totalCount[0].total / limit)
        }
      }
    });
  } catch (error) {
    logger.logError(error, { context: 'get_user_achievements', userId: req.user?.id });
    throw error;
  }
}));

// Obtenir les statistiques des succès de l'utilisateur
router.get('/user/stats', authenticateToken, asyncHandler(async (req, res) => {
  try {
    const userId = req.user.id;

    // Statistiques générales
    const generalStats = await query(
      `SELECT 
              COUNT(*) as total_unlocked,
              SUM(a.points) as total_points_earned,
              COUNT(CASE WHEN a.rarity = 'common' THEN 1 END) as common_count,
              COUNT(CASE WHEN a.rarity = 'rare' THEN 1 END) as rare_count,
              COUNT(CASE WHEN a.rarity = 'epic' THEN 1 END) as epic_count,
              COUNT(CASE WHEN a.rarity = 'legendary' THEN 1 END) as legendary_count
       FROM user_achievements ua
       INNER JOIN achievements a ON ua.achievement_id = a.id
       WHERE ua.user_id = ? AND a.is_active = true`,
      [userId]
    );

    // Succès récents (derniers 30 jours)
    const recentAchievements = await query(
      `SELECT a.id, a.title, a.icon, a.rarity, ua.unlocked_at
       FROM user_achievements ua
       INNER JOIN achievements a ON ua.achievement_id = a.id
       WHERE ua.user_id = ? AND a.is_active = true 
             AND ua.unlocked_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
       ORDER BY ua.unlocked_at DESC
       LIMIT 10`,
      [userId]
    );

    // Progression par rareté
    const rarityProgress = await query(
      `SELECT 
              a.rarity,
              COUNT(ua.id) as unlocked,
              COUNT(a.id) as total,
              ROUND((COUNT(ua.id) / COUNT(a.id)) * 100, 2) as percentage
       FROM achievements a
       LEFT JOIN user_achievements ua ON a.id = ua.achievement_id AND ua.user_id = ?
       WHERE a.is_active = true
       GROUP BY a.rarity
       ORDER BY a.rarity`,
      [userId]
    );

    res.json({
      success: true,
      data: {
        generalStats: generalStats[0] || {},
        recentAchievements,
        rarityProgress
      }
    });
  } catch (error) {
    logger.logError(error, { context: 'get_user_achievement_stats', userId: req.user?.id });
    throw error;
  }
}));

// Obtenir les succès disponibles (non débloqués) pour l'utilisateur
router.get('/user/available', authenticateToken, asyncHandler(async (req, res) => {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 20, rarity } = req.query;
    const offset = (page - 1) * limit;

    let whereClause = 'a.is_active = true AND ua.id IS NULL';
    let queryParams = [userId];

    if (rarity) {
      whereClause += ' AND a.rarity = ?';
      queryParams.push(rarity);
    }

    // Succès non débloqués
    const availableAchievements = await query(
      `SELECT a.id, a.title, a.description, a.icon, a.points, a.rarity, a.requirements
       FROM achievements a
       LEFT JOIN user_achievements ua ON a.id = ua.achievement_id AND ua.user_id = ?
       WHERE ${whereClause}
       ORDER BY a.rarity, a.points DESC
       LIMIT ? OFFSET ?`,
      [...queryParams, parseInt(limit), offset]
    );

    // Comptage total
    const totalCount = await query(
      `SELECT COUNT(*) as total
       FROM achievements a
       LEFT JOIN user_achievements ua ON a.id = ua.achievement_id AND ua.user_id = ?
       WHERE ${whereClause}`,
      queryParams
    );

    res.json({
      success: true,
      data: {
        achievements: availableAchievements,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: totalCount[0].total,
          totalPages: Math.ceil(totalCount[0].total / limit)
        }
      }
    });
  } catch (error) {
    logger.logError(error, { context: 'get_available_achievements', userId: req.user?.id });
    throw error;
  }
}));

// Obtenir le classement des succès
router.get('/leaderboard', optionalAuth, asyncHandler(async (req, res) => {
  try {
    const { type = 'points', limit = 50 } = req.query;

    let orderClause = 'total_points DESC';
    if (type === 'achievements') {
      orderClause = 'achievement_count DESC';
    }

    // Classement des utilisateurs
    const leaderboard = await query(
      `SELECT u.id, u.name, u.avatar_url, u.selected_class, u.total_points,
              COUNT(ua.id) as achievement_count,
              MAX(ua.unlocked_at) as last_achievement
       FROM users u
       LEFT JOIN user_achievements ua ON u.id = ua.user_id
       LEFT JOIN achievements a ON ua.achievement_id = a.id AND a.is_active = true
       WHERE u.deleted_at IS NULL
       GROUP BY u.id, u.name, u.avatar_url, u.selected_class, u.total_points
       HAVING total_points > 0 OR achievement_count > 0
       ORDER BY ${orderClause}, u.created_at ASC
       LIMIT ?`,
      [parseInt(limit)]
    );

    // Position de l'utilisateur connecté (si connecté)
    let userPosition = null;
    if (req.user) {
      const userRank = await query(
        `SELECT position FROM (
          SELECT u.id, u.total_points, u.name,
                 ROW_NUMBER() OVER (ORDER BY u.total_points DESC, u.created_at ASC) as position
          FROM users u
          WHERE u.deleted_at IS NULL
        ) as ranked_users
        WHERE id = ?`,
        [req.user.id]
      );

      if (userRank.length > 0) {
        userPosition = userRank[0].position;
      }
    }

    res.json({
      success: true,
      data: {
        leaderboard,
        userPosition,
        type
      }
    });
  } catch (error) {
    logger.logError(error, { context: 'get_achievement_leaderboard' });
    throw error;
  }
}));

module.exports = router;


