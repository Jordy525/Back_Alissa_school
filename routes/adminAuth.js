const express = require('express');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const { query } = require('../config/database');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');
const logger = require('../config/logger');

const router = express.Router();

// Route pour ajouter un administrateur
router.post('/add-admin', authenticateToken, requireAdmin, asyncHandler(async (req, res) => {
  const { email, userId } = req.body;

  if (!email && !userId) {
    return res.status(400).json({
      success: false,
      error: {
        message: 'Email ou ID utilisateur requis'
      }
    });
  }

  try {
    let targetUser;

    if (userId) {
      // Recherche par ID utilisateur
      const users = await query('SELECT id, email FROM users WHERE id = ?', [userId]);
      if (users.length === 0) {
        return res.status(404).json({
          success: false,
          error: {
            message: 'Utilisateur non trouvé'
          }
        });
      }
      targetUser = users[0];
    } else {
      // Recherche par email
      const users = await query('SELECT id, email FROM users WHERE email = ?', [email]);
      if (users.length === 0) {
        return res.status(404).json({
          success: false,
          error: {
            message: 'Utilisateur non trouvé avec cet email'
          }
        });
      }
      targetUser = users[0];
    }

    // Vérifier si l'utilisateur est déjà admin
    const existingAdmin = await query(
      'SELECT id FROM admins WHERE user_id = ? OR email = ?',
      [targetUser.id, targetUser.email]
    );

    if (existingAdmin.length > 0) {
      return res.status(409).json({
        success: false,
        error: {
          message: 'Cet utilisateur est déjà administrateur'
        }
      });
    }

    // Ajouter l'utilisateur à la table admins
    const adminId = uuidv4();
    await query(
      'INSERT INTO admins (id, user_id, email, created_at) VALUES (?, ?, ?, NOW())',
      [adminId, targetUser.id, targetUser.email]
    );

    logger.info(`Nouvel administrateur ajouté: ${targetUser.email} par ${req.user.email}`);

    res.status(201).json({
      success: true,
      message: 'Administrateur ajouté avec succès',
      data: {
        id: adminId,
        user_id: targetUser.id,
        email: targetUser.email
      }
    });
  } catch (error) {
    logger.error('Erreur lors de l\'ajout de l\'administrateur:', error);
    res.status(500).json({
      success: false,
      error: {
        message: 'Erreur serveur'
      }
    });
  }
}));

// Route pour supprimer un administrateur
router.delete('/remove-admin/:adminId', authenticateToken, requireAdmin, asyncHandler(async (req, res) => {
  const { adminId } = req.params;

  try {
    // Vérifier si l'admin existe
    const admins = await query('SELECT id, email FROM admins WHERE id = ?', [adminId]);
    if (admins.length === 0) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'Administrateur non trouvé'
        }
      });
    }

    // Supprimer l'administrateur
    await query('DELETE FROM admins WHERE id = ?', [adminId]);

    logger.info(`Administrateur supprimé: ${admins[0].email} par ${req.user.email}`);

    res.json({
      success: true,
      message: 'Administrateur supprimé avec succès'
    });
  } catch (error) {
    logger.error('Erreur lors de la suppression de l\'administrateur:', error);
    res.status(500).json({
      success: false,
      error: {
        message: 'Erreur serveur'
      }
    });
  }
}));

// Route pour lister tous les administrateurs
router.get('/list-admins', authenticateToken, requireAdmin, asyncHandler(async (req, res) => {
  try {
    const admins = await query(`
      SELECT 
        a.id, a.user_id, a.email, a.created_at,
        u.name, u.avatar_url, u.last_login_at
      FROM admins a
      LEFT JOIN users u ON a.user_id = u.id
      ORDER BY a.created_at DESC
    `);

    res.json({
      success: true,
      data: {
        admins
      }
    });
  } catch (error) {
    logger.error('Erreur lors de la récupération des administrateurs:', error);
    res.status(500).json({
      success: false,
      error: {
        message: 'Erreur serveur'
      }
    });
  }
}));

module.exports = router;