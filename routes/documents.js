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
    fileSize: 50 * 1024 * 1024 // 50MB max
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /pdf|doc|docx|jpg|jpeg|png|gif|txt|ppt|pptx|xls|xlsx/;
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
// ROUTES ADMIN - GESTION DES DOCUMENTS
// =============================================

// GET /api/documents/admin - Liste tous les documents (admin)
router.get('/admin', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 20, classe, subject_id, search } = req.query;
    const offset = (page - 1) * limit;
    
    let whereClause = 'd.is_active = 1';
    let params = [];
    
    if (classe) {
      whereClause += ' AND d.classe = ?';
      params.push(classe);
    }
    
    if (subject_id) {
      whereClause += ' AND d.subject_id = ?';
      params.push(subject_id);
    }
    
    if (search) {
      whereClause += ' AND (d.title LIKE ? OR d.description LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }
    
    const query = `
      SELECT 
        d.*,
        s.name as subject_name,
        s.color as subject_color,
        u.first_name,
        u.last_name,
        (SELECT COUNT(*) FROM document_downloads dd WHERE dd.document_id = d.id) as download_count
      FROM documents d
      JOIN subjects s ON d.subject_id = s.id
      JOIN users u ON d.created_by = u.id
      WHERE ${whereClause}
      ORDER BY d.created_at DESC
      LIMIT ? OFFSET ?
    `;
    
    params.push(parseInt(limit), offset);
    
    const [documents] = await db.execute(query, params);
    
    // Compter le total
    const countQuery = `
      SELECT COUNT(*) as total
      FROM documents d
      WHERE ${whereClause}
    `;
    
    const [countResult] = await db.execute(countQuery, params.slice(0, -2));
    const total = countResult[0].total;
    
    res.json({
      success: true,
      data: documents,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    logger.error('Erreur lors de la récupération des documents:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

// POST /api/documents/admin - Créer un nouveau document (admin)
router.post('/admin', authenticateToken, requireAdmin, upload.single('file'), async (req, res) => {
  try {
    const { title, description, subject_id, classe, category_id } = req.body;
    
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
      INSERT INTO documents (id, title, description, file_name, file_path, file_type, file_size, subject_id, classe, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
      req.user.id
    ]);
    
    // Ajouter la catégorie si fournie
    if (category_id) {
      const categoryQuery = `
        INSERT INTO document_category_links (id, document_id, category_id)
        VALUES (?, ?, ?)
      `;
      await db.execute(categoryQuery, [uuidv4(), documentId, category_id]);
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

// PUT /api/documents/admin/:id - Modifier un document (admin)
router.put('/admin/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, classe, is_active } = req.body;
    
    const query = `
      UPDATE documents 
      SET title = ?, description = ?, classe = ?, is_active = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND created_by = ?
    `;
    
    const [result] = await db.execute(query, [title, description, classe, is_active, id, req.user.id]);
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Document non trouvé' });
    }
    
    res.json({ success: true, message: 'Document modifié avec succès' });
  } catch (error) {
    logger.error('Erreur lors de la modification du document:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

// DELETE /api/documents/admin/:id - Supprimer un document (admin)
router.delete('/admin/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Récupérer le chemin du fichier
    const [documents] = await db.execute(
      'SELECT file_path FROM documents WHERE id = ? AND created_by = ?',
      [id, req.user.id]
    );
    
    if (documents.length === 0) {
      return res.status(404).json({ success: false, message: 'Document non trouvé' });
    }
    
    // Supprimer le fichier physique
    const filePath = documents[0].file_path;
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
    
    // Supprimer de la base de données
    await db.execute('DELETE FROM documents WHERE id = ?', [id]);
    
    res.json({ success: true, message: 'Document supprimé avec succès' });
  } catch (error) {
    logger.error('Erreur lors de la suppression du document:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

// =============================================
// ROUTES ÉLÈVES - CONSULTATION DES DOCUMENTS
// =============================================

// GET /api/documents - Documents pour l'élève connecté
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { subject_id, category_id, search } = req.query;
    const userClasse = req.user.classe;
    
    if (!userClasse) {
      return res.status(400).json({ success: false, message: 'Classe non définie' });
    }
    
    let whereClause = 'd.classe = ? AND d.is_active = 1';
    let params = [userClasse];
    
    if (subject_id) {
      whereClause += ' AND d.subject_id = ?';
      params.push(subject_id);
    }
    
    if (search) {
      whereClause += ' AND (d.title LIKE ? OR d.description LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }
    
    const query = `
      SELECT 
        d.id,
        d.title,
        d.description,
        d.file_name,
        d.file_type,
        d.file_size,
        d.download_count,
        d.created_at,
        s.name as subject_name,
        s.color as subject_color,
        s.icon as subject_icon
      FROM documents d
      JOIN subjects s ON d.subject_id = s.id
      WHERE ${whereClause}
      ORDER BY d.created_at DESC
    `;
    
    const [documents] = await db.execute(query, params);
    
    res.json({ success: true, data: documents });
  } catch (error) {
    logger.error('Erreur lors de la récupération des documents:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

// GET /api/documents/:id/download - Télécharger un document
router.get('/:id/download', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userClasse = req.user.classe;
    
    const query = `
      SELECT d.*, s.name as subject_name
      FROM documents d
      JOIN subjects s ON d.subject_id = s.id
      WHERE d.id = ? AND d.classe = ? AND d.is_active = 1
    `;
    
    const [documents] = await db.execute(query, [id, userClasse]);
    
    if (documents.length === 0) {
      return res.status(404).json({ success: false, message: 'Document non trouvé' });
    }
    
    const document = documents[0];
    
    // Enregistrer le téléchargement
    await db.execute(
      'INSERT INTO document_downloads (id, document_id, user_id) VALUES (?, ?, ?)',
      [uuidv4(), id, req.user.id]
    );
    
    // Incrémenter le compteur de téléchargements
    await db.execute(
      'UPDATE documents SET download_count = download_count + 1 WHERE id = ?',
      [id]
    );
    
    // Envoyer le fichier
    res.download(document.file_path, document.file_name);
    
    logger.info(`Document téléchargé: ${document.title} par ${req.user.email}`);
  } catch (error) {
    logger.error('Erreur lors du téléchargement:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

// =============================================
// ROUTES POUR LES CATÉGORIES
// =============================================

// GET /api/documents/categories - Liste des catégories
router.get('/categories', async (req, res) => {
  try {
    const [categories] = await db.execute(
      'SELECT * FROM document_categories WHERE is_active = 1 ORDER BY name'
    );
    
    res.json({ success: true, data: categories });
  } catch (error) {
    logger.error('Erreur lors de la récupération des catégories:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

// =============================================
// ROUTES POUR LES STATISTIQUES
// =============================================

// GET /api/documents/stats - Statistiques (admin)
router.get('/stats', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const [stats] = await db.execute(`
      SELECT 
        classe,
        COUNT(*) as total_documents,
        SUM(download_count) as total_downloads
      FROM documents 
      WHERE is_active = 1 
      GROUP BY classe
      ORDER BY classe
    `);
    
    res.json({ success: true, data: stats });
  } catch (error) {
    logger.error('Erreur lors de la récupération des statistiques:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

module.exports = router;



