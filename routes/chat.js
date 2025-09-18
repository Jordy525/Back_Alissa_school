const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { query } = require('../config/database');
const { v4: uuidv4 } = require('uuid');

// Créer ou récupérer une session de chat
router.post('/session', authenticateToken, async (req, res) => {
  try {
    const { subject_id, session_type = 'general' } = req.body;
    const userId = req.user.id;

    // Vérifier si une session active existe déjà pour cet utilisateur et cette matière
    let existingSession = null;
    try {
      if (subject_id) {
        const sessions = await query(
          `SELECT id FROM chat_sessions 
           WHERE user_id = ? AND subject_id = ? AND is_active = 1 
           ORDER BY created_at DESC LIMIT 1`,
          [userId, subject_id]
        );
        existingSession = sessions[0];
      } else {
        // Session générale
        const sessions = await query(
          `SELECT id FROM chat_sessions 
           WHERE user_id = ? AND subject_id IS NULL AND is_active = 1 
           ORDER BY created_at DESC LIMIT 1`,
          [userId]
        );
        existingSession = sessions[0];
      }
    } catch (error) {
      console.log('Erreur lors de la vérification des sessions existantes:', error);
      // Continuer avec la création d'une nouvelle session
    }

    if (existingSession) {
      return res.json({
        success: true,
        data: {
          sessionId: existingSession.id,
          isNew: false
        }
      });
    }

    // Créer une nouvelle session
    const sessionId = uuidv4();
    try {
      await query(
        `INSERT INTO chat_sessions (id, user_id, subject_id, session_type, is_active, created_at)
         VALUES (?, ?, ?, ?, 1, NOW())`,
        [sessionId, userId, subject_id, session_type]
      );
    } catch (error) {
      console.log('Erreur lors de la création de session avec nouvelles colonnes, tentative avec ancienne structure:', error);
      // Fallback vers l'ancienne structure si les nouvelles colonnes n'existent pas
      await query(
        `INSERT INTO chat_sessions (id, user_id, created_at)
         VALUES (?, ?, NOW())`,
        [sessionId, userId]
      );
    }

    res.json({
      success: true,
      data: {
        sessionId: sessionId,
        isNew: true
      }
    });
  } catch (error) {
    console.error('Erreur lors de la création de la session:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Erreur lors de la création de la session' }
    });
  }
});

// Sauvegarder un message de chat
router.post('/message', authenticateToken, async (req, res) => {
  try {
    const { session_id, role, content, context_data, message_type = 'text', metadata } = req.body;
    const userId = req.user.id;

    if (!session_id || !role || !content) {
      return res.status(400).json({
        success: false,
        error: { message: 'session_id, role et content sont requis' }
      });
    }

    // Vérifier que la session appartient à l'utilisateur
    const sessions = await query(
      `SELECT id FROM chat_sessions WHERE id = ? AND user_id = ?`,
      [session_id, userId]
    );

    if (sessions.length === 0) {
      return res.status(404).json({
        success: false,
        error: { message: 'Session non trouvée' }
      });
    }

    const messageId = uuidv4();
    try {
      await query(
        `INSERT INTO chat_messages (id, session_id, role, content, context_data, message_type, metadata, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, NOW())`,
        [messageId, session_id, role, content, JSON.stringify(context_data), message_type, JSON.stringify(metadata)]
      );
    } catch (error) {
      console.log('Erreur lors de la sauvegarde avec nouvelles colonnes, tentative avec ancienne structure:', error);
      // Fallback vers l'ancienne structure
      await query(
        `INSERT INTO chat_messages (id, session_id, role, content, context_data, created_at)
         VALUES (?, ?, ?, ?, ?, NOW())`,
        [messageId, session_id, role, content, JSON.stringify(context_data)]
      );
    }

    res.json({
      success: true,
      data: {
        messageId: messageId
      }
    });
  } catch (error) {
    console.error('Erreur lors de la sauvegarde du message:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Erreur lors de la sauvegarde du message' }
    });
  }
});

// Récupérer les messages d'une session
router.get('/messages/:sessionId', authenticateToken, async (req, res) => {
  try {
    const { sessionId } = req.params;
    const userId = req.user.id;

    // Vérifier que la session appartient à l'utilisateur
    const sessions = await query(
      `SELECT id FROM chat_sessions WHERE id = ? AND user_id = ?`,
      [sessionId, userId]
    );

    if (sessions.length === 0) {
      return res.status(404).json({
        success: false,
        error: { message: 'Session non trouvée' }
      });
    }

    const messages = await query(
      `SELECT id, role, content, context_data, message_type, metadata, created_at
       FROM chat_messages 
       WHERE session_id = ? 
       ORDER BY created_at ASC`,
      [sessionId]
    );

    res.json({
      success: true,
      data: {
        messages: messages.map(msg => ({
          id: msg.id,
          role: msg.role,
          content: msg.content,
          context_data: msg.context_data ? JSON.parse(msg.context_data) : null,
          message_type: msg.message_type,
          metadata: msg.metadata ? JSON.parse(msg.metadata) : null,
          timestamp: msg.created_at
        }))
      }
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des messages:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Erreur lors de la récupération des messages' }
    });
  }
});

// Récupérer les sessions d'un utilisateur
router.get('/sessions', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { subject_id } = req.query;

    let whereClause = 'WHERE user_id = ? AND is_active = 1';
    let params = [userId];

    if (subject_id) {
      whereClause += ' AND subject_id = ?';
      params.push(subject_id);
    }

    const sessions = await query(
      `SELECT cs.id, cs.subject_id, cs.session_type, cs.created_at, cs.updated_at,
              s.name as subject_name, s.icon as subject_icon,
              COUNT(cm.id) as message_count
       FROM chat_sessions cs
       LEFT JOIN subjects s ON cs.subject_id = s.id
       LEFT JOIN chat_messages cm ON cs.id = cm.session_id
       ${whereClause}
       GROUP BY cs.id
       ORDER BY cs.updated_at DESC`,
      params
    );

    res.json({
      success: true,
      data: {
        sessions: sessions.map(session => ({
          id: session.id,
          subject_id: session.subject_id,
          subject_name: session.subject_name,
          subject_icon: session.subject_icon,
          session_type: session.session_type,
          message_count: session.message_count,
          created_at: session.created_at,
          updated_at: session.updated_at
        }))
      }
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des sessions:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Erreur lors de la récupération des sessions' }
    });
  }
});

// Fermer une session
router.post('/session/:sessionId/close', authenticateToken, async (req, res) => {
  try {
    const { sessionId } = req.params;
    const userId = req.user.id;

    // Vérifier que la session appartient à l'utilisateur
    const sessions = await query(
      `SELECT id FROM chat_sessions WHERE id = ? AND user_id = ?`,
      [sessionId, userId]
    );

    if (sessions.length === 0) {
      return res.status(404).json({
        success: false,
        error: { message: 'Session non trouvée' }
      });
    }

    await query(
      `UPDATE chat_sessions SET is_active = 0, updated_at = NOW() WHERE id = ?`,
      [sessionId]
    );

    res.json({
      success: true,
      data: { message: 'Session fermée avec succès' }
    });
  } catch (error) {
    console.error('Erreur lors de la fermeture de la session:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Erreur lors de la fermeture de la session' }
    });
  }
});

module.exports = router;
