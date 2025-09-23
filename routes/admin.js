const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const router = express.Router();
const { query } = require('../config/database');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const { logger } = require('../config/logger');

// Configuration Multer pour l'upload de fichiers
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../uploads/documents');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${uuidv4()}-${file.originalname}`;
    cb(null, uniqueName);
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 100 * 1024 * 1024 // 100MB max
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /pdf|doc|docx|jpg|jpeg|png|gif|txt|ppt|pptx|xls|xlsx|mp4|mp3|wav/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Type de fichier non autorisé'));
    }
  }
});

// =============================================
// GESTION DES ÉLÈVES
// =============================================

// GET /api/admin/students - Récupérer tous les élèves
router.get('/students', authenticateToken, requireAdmin, async (req, res) => {
  try {
    console.log('👥 Récupération des élèves...', req.query);
    
    const { page = 1, limit = 20, search = '', classe = '' } = req.query;
    const offset = (page - 1) * limit;
    
    // Approche simplifiée pour éviter les problèmes de collation
    let whereClause = `u.deleted_at IS NULL`;
    let params = [];
    
    if (search) {
      whereClause += ' AND (u.name LIKE ? OR u.email LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }
    
    if (classe) {
      whereClause += ' AND u.classe = ?';
      params.push(classe);
    }
    
    // Récupérer tous les utilisateurs avec une sous-requête pour exclure les admins
    const allUsersQuery = `
      SELECT 
        u.id, u.email, u.name, u.avatar_url, u.classe, u.selected_class, 
        u.total_points, u.level, u.created_at, u.last_login_at,
        u.matieres as selected_subjects
      FROM users u
      WHERE ${whereClause}
      AND u.id NOT IN (
        SELECT COALESCE(user_id, '') FROM admins WHERE user_id IS NOT NULL
      )
      AND u.email NOT IN (
        SELECT COALESCE(email, '') FROM admins WHERE email IS NOT NULL
      )
      ORDER BY u.created_at DESC
    `;
    
    const allStudents = await query(allUsersQuery, params);
    
    // Pagination manuelle
    const total = allStudents.length;
    const students = allStudents.slice(offset, offset + parseInt(limit));
    
    // Parser les matières JSON
    const studentsWithParsedSubjects = students.map(student => ({
      ...student,
      selected_subjects: student.selected_subjects ? 
        (typeof student.selected_subjects === 'string' ? 
          JSON.parse(student.selected_subjects) : 
          student.selected_subjects
        ) : []
    }));
    
    console.log(`✅ ${students.length} élèves récupérés sur ${total} total`);
    
    res.json({
      success: true,
      data: {
        students: studentsWithParsedSubjects,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    console.error('❌ Erreur lors de la récupération des élèves:', error);
    logger.error('Erreur lors de la récupération des élèves:', error);
    res.status(500).json({ 
      success: false, 
      error: { message: 'Erreur serveur' },
      details: error.message 
    });
  }
});

// PUT /api/admin/students/:id - Modifier un élève
router.put('/students/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    console.log('✏️ Modification élève:', req.params.id, req.body);
    
    const { id } = req.params;
    const { name, email, classe, selected_subjects, total_points, level } = req.body;
    
    const updateFields = [];
    const params = [];
    
    if (name) {
      updateFields.push('name = ?');
      params.push(name);
    }
    if (email) {
      updateFields.push('email = ?');
      params.push(email);
    }
    if (classe) {
      updateFields.push('classe = ?');
      params.push(classe);
    }
    if (selected_subjects) {
      updateFields.push('matieres = ?');
      params.push(JSON.stringify(selected_subjects));
    }
    if (total_points !== undefined) {
      updateFields.push('total_points = ?');
      params.push(total_points);
    }
    if (level !== undefined) {
      updateFields.push('level = ?');
      params.push(level);
    }
    
    if (updateFields.length === 0) {
      return res.status(400).json({ 
        success: false, 
        error: { message: 'Aucune donnée à mettre à jour' }
      });
    }
    
    updateFields.push('updated_at = NOW()');
    params.push(id);
    
    const updateQuery = `UPDATE users SET ${updateFields.join(', ')} WHERE id = ?`;
    await query(updateQuery, params);
    
    console.log('✅ Élève modifié avec succès:', id);
    logger.info(`Élève modifié: ${id} par ${req.user.email}`);
    
    res.json({
      success: true,
      message: 'Élève modifié avec succès'
    });
  } catch (error) {
    console.error('❌ Erreur lors de la modification de l\'élève:', error);
    logger.error('Erreur lors de la modification de l\'élève:', error);
    res.status(500).json({ 
      success: false, 
      error: { message: 'Erreur serveur' },
      details: error.message 
    });
  }
});

// DELETE /api/admin/students/:id - Supprimer un élève (soft delete)
router.delete('/students/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    console.log('🗑️ Suppression élève:', req.params.id);
    
    const { id } = req.params;
    
    // Vérifier que l'élève existe et n'est pas un admin
    const student = await query(
      `SELECT u.id, u.name, u.email 
       FROM users u
       LEFT JOIN admins a ON (BINARY a.user_id = BINARY u.id OR BINARY a.email = BINARY u.email)
       WHERE u.id = ? AND a.id IS NULL`,
      [id]
    );
    
    if (student.length === 0) {
      return res.status(404).json({
        success: false,
        error: { message: 'Élève non trouvé ou est un administrateur' }
      });
    }
    
    await query(
      'UPDATE users SET deleted_at = NOW() WHERE id = ?',
      [id]
    );
    
    console.log('✅ Élève supprimé avec succès:', student[0].name);
    logger.info(`Élève supprimé: ${id} (${student[0].name}) par ${req.user.email}`);
    
    res.json({
      success: true,
      message: 'Élève supprimé avec succès'
    });
  } catch (error) {
    console.error('❌ Erreur lors de la suppression de l\'élève:', error);
    logger.error('Erreur lors de la suppression de l\'élève:', error);
    res.status(500).json({ 
      success: false, 
      error: { message: 'Erreur serveur' },
      details: error.message 
    });
  }
});

// GET /api/admin/students/:id/overview - Vue d'ensemble d'un élève (succès, moyennes, langue, quiz)
router.get('/students/:id/overview', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    // Profil de base (inclut la langue choisie et les matières)
    const users = await query(
      `SELECT id, name, email, classe, total_points, level, langue_gabonaise, 
              matieres, created_at, last_login_at
       FROM users
       WHERE id = ? AND deleted_at IS NULL
       LIMIT 1`,
      [id]
    );

    if (users.length === 0) {
      return res.status(404).json({ success: false, error: { message: 'Élève introuvable' } });
    }

    const user = users[0];
    const subjects = user.matieres ? (typeof user.matieres === 'string' ? JSON.parse(user.matieres) : user.matieres) : [];

    // Succès débloqués
    const achievements = await query(
      `SELECT a.id, a.title, a.points, a.rarity, ua.unlocked_at
       FROM user_achievements ua
       INNER JOIN achievements a ON a.id = ua.achievement_id
       WHERE ua.user_id = ?
       ORDER BY ua.unlocked_at DESC
       LIMIT 30`,
      [id]
    );

    // Historique des quiz (les 20 derniers) et calcul des moyennes
    const quizAttempts = await query(
      `SELECT qa.id, qa.score, qa.total_questions, qa.correct_answers, qa.points_earned, qa.completed_at,
              q.id as quiz_id, q.title, q.subject_id
       FROM quiz_attempts qa
       INNER JOIN quizzes q ON q.id = qa.quiz_id
       WHERE qa.user_id = ?
       ORDER BY qa.completed_at DESC
       LIMIT 20`,
      [id]
    );

    // Moyenne globale et par matière (pour les matières connues)
    const averagesBySubject = {};
    let totalPercent = 0;
    let count = 0;
    for (const att of quizAttempts) {
      const percent = att.total_questions > 0 ? Math.round((att.correct_answers / att.total_questions) * 100) : 0;
      totalPercent += percent;
      count += 1;
      const key = String(att.subject_id || 'autre');
      if (!averagesBySubject[key]) {
        averagesBySubject[key] = { total: 0, count: 0 };
      }
      averagesBySubject[key].total += percent;
      averagesBySubject[key].count += 1;
    }

    const overallAverage = count > 0 ? Math.round(totalPercent / count) : 0;
    const formattedAverages = Object.entries(averagesBySubject).map(([subjectId, agg]) => ({
      subjectId,
      average: Math.round((agg.total / Math.max(agg.count, 1)))
    }));

    res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          classe: user.classe,
          langue: user.langue_gabonaise || null,
          subjects,
          totalPoints: user.total_points,
          level: user.level,
          createdAt: user.created_at,
          lastLoginAt: user.last_login_at
        },
        achievements,
        averages: {
          overall: overallAverage,
          bySubject: formattedAverages
        },
        quizzes: quizAttempts
      }
    });
  } catch (error) {
    console.error('❌ Erreur overview élève:', error);
    res.status(500).json({ success: false, error: { message: 'Erreur serveur' }, details: error.message });
  }
});

// =============================================
// GESTION DES DOCUMENTS
// =============================================

// GET /api/admin/documents - Récupérer tous les documents
router.get('/documents', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 20, search = '', classe = '', subject_id = '', document_type = '' } = req.query;
    const offset = (page - 1) * limit;
    
    let whereClause = 'd.deleted_at IS NULL';
    let params = [];
    
    if (search) {
      whereClause += ' AND (d.title LIKE ? OR d.description LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }
    
    if (classe) {
      whereClause += ' AND d.classe = ?';
      params.push(classe);
    }
    
    if (subject_id) {
      whereClause += ' AND d.subject_id = ?';
      params.push(subject_id);
    }
    
    if (document_type) {
      whereClause += ' AND d.document_type = ?';
      params.push(document_type);
    }
    
    const query = `
      SELECT 
        d.id, d.title, d.description, d.file_name, d.file_type, 
        d.file_size, d.classe, d.document_type, d.download_count,
        d.is_active, d.created_at, d.updated_at,
        s.name as subject_name, s.color as subject_color,
        u.name as created_by_name
      FROM documents d
      JOIN subjects s ON d.subject_id = s.id
      JOIN users u ON d.created_by = u.id
      WHERE ${whereClause}
      ORDER BY d.created_at DESC
      LIMIT ? OFFSET ?
    `;
    
    params.push(parseInt(limit), offset);
    const documents = await query(queryStr, params);
    
    // Compter le total pour la pagination
    const countQuery = `
      SELECT COUNT(*) as total 
      FROM documents d 
      WHERE ${whereClause}
    `;
    const countResult = await query(countQuery, params.slice(0, -2));
    const total = countResult[0].total;
    
    res.json({
      success: true,
      data: {
        documents,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    logger.error('Erreur lors de la récupération des documents:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

// POST /api/admin/documents - Créer un nouveau document
router.post('/documents', authenticateToken, requireAdmin, upload.single('file'), async (req, res) => {
  try {
    const { title, description, subject_id, classe, document_type = 'book', category_ids } = req.body;
    
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Aucun fichier fourni' });
    }
    
    if (!title || !subject_id || !classe) {
      return res.status(400).json({ success: false, message: 'Titre, matière et classe requis' });
    }
    
    const documentId = uuidv4();
    const fileSize = req.file.size;
    const fileType = path.extname(req.file.originalname).toLowerCase().substring(1);
    
    const query = `
      INSERT INTO documents (id, title, description, file_name, file_path, file_type, file_size, subject_id, classe, document_type, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    
    await query(queryStr, [
      documentId,
      title,
      description || null,
      req.file.originalname,
      req.file.path,
      fileType,
      fileSize,
      subject_id,
      classe,
      document_type,
      req.user.id
    ]);
    
    // Ajouter les catégories si fournies
    if (category_ids && Array.isArray(category_ids)) {
      for (const categoryId of category_ids) {
        const categoryQuery = `
          INSERT INTO document_category_links (id, document_id, category_id)
          VALUES (?, ?, ?)
        `;
        await db.execute(categoryQuery, [uuidv4(), documentId, categoryId]);
      }
    }
    
    logger.info(`Document créé: ${title} par ${req.user.email}`);
    
    res.status(201).json({
      success: true,
      message: 'Document créé avec succès',
      data: { id: documentId, title }
    });
  } catch (error) {
    logger.error('Erreur lors de la création du document:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

// PUT /api/admin/documents/:id - Modifier un document
router.put('/documents/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, subject_id, classe, document_type, is_active } = req.body;
    
    const updateFields = [];
    const params = [];
    
    if (title) {
      updateFields.push('title = ?');
      params.push(title);
    }
    if (description !== undefined) {
      updateFields.push('description = ?');
      params.push(description);
    }
    if (subject_id) {
      updateFields.push('subject_id = ?');
      params.push(subject_id);
    }
    if (classe) {
      updateFields.push('classe = ?');
      params.push(classe);
    }
    if (document_type) {
      updateFields.push('document_type = ?');
      params.push(document_type);
    }
    if (is_active !== undefined) {
      updateFields.push('is_active = ?');
      params.push(is_active ? 1 : 0);
    }
    
    if (updateFields.length === 0) {
      return res.status(400).json({ success: false, message: 'Aucune donnée à mettre à jour' });
    }
    
    updateFields.push('updated_at = NOW()');
    params.push(id);
    
    const query = `UPDATE documents SET ${updateFields.join(', ')} WHERE id = ?`;
    await db.execute(query, params);
    
    logger.info(`Document modifié: ${id} par ${req.user.email}`);
    
    res.json({
      success: true,
      message: 'Document modifié avec succès'
    });
  } catch (error) {
    logger.error('Erreur lors de la modification du document:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

// DELETE /api/admin/documents/:id - Supprimer un document
router.delete('/documents/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Récupérer le chemin du fichier avant suppression
    const [documents] = await db.execute(
      'SELECT file_path FROM documents WHERE id = ?',
      [id]
    );
    
    if (documents.length === 0) {
      return res.status(404).json({ success: false, message: 'Document non trouvé' });
    }
    
    // Supprimer de la base de données
    await db.execute(
      'UPDATE documents SET deleted_at = NOW() WHERE id = ?',
      [id]
    );
    
    // Supprimer le fichier physique
    const filePath = documents[0].file_path;
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
    
    logger.info(`Document supprimé: ${id} par ${req.user.email}`);
    
    res.json({
      success: true,
      message: 'Document supprimé avec succès'
    });
  } catch (error) {
    logger.error('Erreur lors de la suppression du document:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

// =============================================
// STATISTIQUES ADMIN
// =============================================

// GET /api/admin/stats - Statistiques générales
router.get('/stats', authenticateToken, requireAdmin, async (req, res) => {
  try {
    console.log('📊 Récupération des statistiques admin...');
    
    // Statistiques des élèves - Approche avec sous-requêtes pour éviter les problèmes de collation
    const studentStats = await query(`
      SELECT 
        COUNT(*) as total_students,
        COUNT(CASE WHEN classe = '6eme' THEN 1 END) as classe_6eme,
        COUNT(CASE WHEN classe = '5eme' THEN 1 END) as classe_5eme,
        COUNT(CASE WHEN classe = '4eme' THEN 1 END) as classe_4eme,
        COUNT(CASE WHEN classe = '3eme' THEN 1 END) as classe_3eme,
        COUNT(CASE WHEN classe = 'seconde' THEN 1 END) as classe_seconde,
        COUNT(CASE WHEN classe = 'premiere' THEN 1 END) as classe_premiere,
        COUNT(CASE WHEN classe = 'terminale' THEN 1 END) as classe_terminale
      FROM users u
      WHERE u.deleted_at IS NULL 
      AND u.id NOT IN (
        SELECT COALESCE(user_id, '') FROM admins WHERE user_id IS NOT NULL
      )
      AND u.email NOT IN (
        SELECT COALESCE(email, '') FROM admins WHERE email IS NOT NULL
      )
    `);
    
    // Statistiques des documents (utiliser la nouvelle colonne document_type)
    const documentStats = await query(`
      SELECT 
        COUNT(*) as total_documents,
        COUNT(CASE WHEN document_type = 'book' THEN 1 END) as books,
        COUNT(CASE WHEN document_type = 'methodology' THEN 1 END) as methodologies,
        COUNT(CASE WHEN document_type = 'exercise' THEN 1 END) as exercises,
        COALESCE(SUM(download_count), 0) as total_downloads
      FROM documents 
      WHERE deleted_at IS NULL
    `);
    
    // Compter les admins
    const adminStats = await query(`SELECT COUNT(*) as total_admins FROM admins`);
    
    // Documents par classe
    const documentsByClass = await query(`
      SELECT classe, COUNT(*) as count
      FROM documents 
      WHERE deleted_at IS NULL AND classe IS NOT NULL
      GROUP BY classe
      ORDER BY classe
    `);
    
    console.log('✅ Statistiques récupérées:', {
      students: studentStats[0],
      documents: documentStats[0],
      admins: adminStats[0]
    });
    
    res.json({
      success: true,
      data: {
        students: {
          total_students: studentStats[0]?.total_students || 0,
          classe_6eme: studentStats[0]?.classe_6eme || 0,
          classe_5eme: studentStats[0]?.classe_5eme || 0,
          classe_4eme: studentStats[0]?.classe_4eme || 0,
          classe_3eme: studentStats[0]?.classe_3eme || 0,
          classe_seconde: studentStats[0]?.classe_seconde || 0,
          classe_premiere: studentStats[0]?.classe_premiere || 0,
          classe_terminale: studentStats[0]?.classe_terminale || 0
        },
        documents: {
          total_documents: documentStats[0]?.total_documents || 0,
          books: documentStats[0]?.books || 0,
          methodologies: documentStats[0]?.methodologies || 0,
          exercises: documentStats[0]?.exercises || 0,
          total_downloads: documentStats[0]?.total_downloads || 0
        },
        admins: {
          total_admins: adminStats[0]?.total_admins || 0
        },
        documentsByClass: documentsByClass || []
      }
    });
  } catch (error) {
    console.error('❌ Erreur lors de la récupération des statistiques:', error);
    logger.error('Erreur lors de la récupération des statistiques:', error);
    res.status(500).json({ 
      success: false, 
      error: { message: 'Erreur serveur' },
      details: error.message 
    });
  }
});

module.exports = router;
