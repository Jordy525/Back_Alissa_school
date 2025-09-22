const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const router = express.Router();
const db = require('../config/database');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const logger = require('../config/logger');

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
    const { page = 1, limit = 20, search = '', classe = '', role = 'student' } = req.query;
    const offset = (page - 1) * limit;
    
    let whereClause = 'role = ? AND deleted_at IS NULL';
    let params = [role];
    
    if (search) {
      whereClause += ' AND (name LIKE ? OR email LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }
    
    if (classe) {
      whereClause += ' AND classe = ?';
      params.push(classe);
    }
    
    const query = `
      SELECT 
        id, email, name, avatar_url, classe, selected_class, 
        total_points, level, created_at, last_login_at,
        JSON_EXTRACT(selected_subjects, '$') as selected_subjects
      FROM users 
      WHERE ${whereClause}
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `;
    
    params.push(parseInt(limit), offset);
    const [students] = await db.execute(query, params);
    
    // Compter le total pour la pagination
    const countQuery = `SELECT COUNT(*) as total FROM users WHERE ${whereClause}`;
    const [countResult] = await db.execute(countQuery, params.slice(0, -2));
    const total = countResult[0].total;
    
    res.json({
      success: true,
      data: {
        students,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    logger.error('Erreur lors de la récupération des élèves:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

// PUT /api/admin/students/:id - Modifier un élève
router.put('/students/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
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
      updateFields.push('selected_subjects = ?');
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
      return res.status(400).json({ success: false, message: 'Aucune donnée à mettre à jour' });
    }
    
    updateFields.push('updated_at = NOW()');
    params.push(id);
    
    const query = `UPDATE users SET ${updateFields.join(', ')} WHERE id = ?`;
    await db.execute(query, params);
    
    logger.info(`Élève modifié: ${id} par ${req.user.email}`);
    
    res.json({
      success: true,
      message: 'Élève modifié avec succès'
    });
  } catch (error) {
    logger.error('Erreur lors de la modification de l\'élève:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

// DELETE /api/admin/students/:id - Supprimer un élève (soft delete)
router.delete('/students/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    
    await db.execute(
      'UPDATE users SET deleted_at = NOW() WHERE id = ?',
      [id]
    );
    
    logger.info(`Élève supprimé: ${id} par ${req.user.email}`);
    
    res.json({
      success: true,
      message: 'Élève supprimé avec succès'
    });
  } catch (error) {
    logger.error('Erreur lors de la suppression de l\'élève:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
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
    const [documents] = await db.execute(query, params);
    
    // Compter le total pour la pagination
    const countQuery = `
      SELECT COUNT(*) as total 
      FROM documents d 
      WHERE ${whereClause}
    `;
    const [countResult] = await db.execute(countQuery, params.slice(0, -2));
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
    
    await db.execute(query, [
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
    // Statistiques des élèves
    const [studentStats] = await db.execute(`
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
      LEFT JOIN admins a ON a.user_id = u.id
      WHERE a.id IS NULL AND u.deleted_at IS NULL
    `);
    
    // Statistiques des documents
    const [documentStats] = await db.execute(`
      SELECT 
        COUNT(*) as total_documents,
        COUNT(CASE WHEN document_type = 'book' THEN 1 END) as books,
        COUNT(CASE WHEN document_type = 'methodology' THEN 1 END) as methodologies,
        COUNT(CASE WHEN document_type = 'exercise' THEN 1 END) as exercises,
        SUM(download_count) as total_downloads
      FROM documents 
      WHERE deleted_at IS NULL
    `);
    
    // Documents par classe
    const [documentsByClass] = await db.execute(`
      SELECT classe, COUNT(*) as count
      FROM documents 
      WHERE deleted_at IS NULL
      GROUP BY classe
      ORDER BY classe
    `);
    
    res.json({
      success: true,
      data: {
        students: studentStats[0],
        documents: documentStats[0],
        documentsByClass
      }
    });
  } catch (error) {
    logger.error('Erreur lors de la récupération des statistiques:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

module.exports = router;
