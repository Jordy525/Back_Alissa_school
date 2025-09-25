const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const router = express.Router();
const { query: dbQuery, transaction } = require('../config/database');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const { logger } = require('../config/logger');

// Configuration Multer pour l'upload de fichiers
// Utilitaire: assainir les noms de fichiers (supprime accents/caractères spéciaux)
const sanitizeFilename = (name) => {
  try {
    const base = path.basename(name);
    const withoutDiacritics = base.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    return withoutDiacritics
      .replace(/[^a-zA-Z0-9._-]+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^[-.]+|[-.]+$/g, '')
      .toLowerCase();
  } catch {
    return 'file';
  }
};

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../uploads/documents');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const safeOriginal = sanitizeFilename(file.originalname);
    const uniqueName = `${uuidv4()}-${safeOriginal}`;
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
    const { page = 1, limit = 20, classe, subject_id, search, categorie } = req.query;
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
    if (categorie) {
      whereClause += ' AND d.categorie = ?';
      params.push(categorie);
    }
    
    const sql = `
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
    
    const documents = await dbQuery(sql, params);
    
    // Compter le total
    const countQuery = `
      SELECT COUNT(*) as total
      FROM documents d
      WHERE ${whereClause}
    `;
    
    const countResult = await dbQuery(countQuery, params.slice(0, -2));
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
    const { title, description, subject_id, classe, categorie = 'book' } = req.body;
    
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Aucun fichier fourni' });
    }
    
    if (!title || !subject_id || !classe) {
      return res.status(400).json({ success: false, message: 'Titre, matière et classe requis' });
    }
    
    // Empêcher les doublons par (subject_id, classe, document_type)
    const existing = await dbQuery(
      'SELECT id FROM documents WHERE subject_id = ? AND classe = ? AND categorie = ? AND is_active = 1 LIMIT 1',
      [subject_id, classe, categorie]
    );
    if (existing && existing.length > 0) {
      return res.status(409).json({ success: false, message: 'Un document existe déjà pour cette matière, cette classe et ce type.' });
    }

    const documentId = uuidv4();
    const fileSize = req.file.size;
    const fileType = path.extname(req.file.originalname).toLowerCase().substring(1);
    
    const insertSql = `
      INSERT INTO documents (id, title, description, file_name, file_path, file_type, file_size, subject_id, classe, categorie, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    
    await dbQuery(insertSql, [
      documentId,
      title,
      description || null,
      req.file.originalname,
      req.file.path,
      fileType,
      fileSize,
      subject_id,
      classe,
      categorie,
      req.user.id
    ]);
    
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
router.put('/admin/:id', authenticateToken, requireAdmin, upload.single('file'), async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, classe, is_active } = req.body;
    
    // Récupérer l'ancien document
    const rows = await dbQuery('SELECT file_path FROM documents WHERE id = ? LIMIT 1', [id]);
    if (!rows || rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Document non trouvé' });
    }

    // Si un nouveau fichier est fourni, remplacer les infos de fichier
    if (req.file) {
      const fileSize = req.file.size;
      const fileType = path.extname(req.file.originalname).toLowerCase().substring(1);
      const updateWithFile = `
        UPDATE documents 
        SET title = ?, description = ?, classe = ?, is_active = ?, 
            file_name = ?, file_path = ?, file_type = ?, file_size = ?,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `;
      await dbQuery(updateWithFile, [
        title,
        description,
        classe,
        is_active,
        req.file.originalname,
        req.file.path,
        fileType,
        fileSize,
        id
      ]);
      // Supprimer l'ancien fichier si présent
      const oldPath = rows[0].file_path;
      if (oldPath && fs.existsSync(oldPath)) {
        try { fs.unlinkSync(oldPath); } catch {}
      }
    } else {
      const updateSql = `
        UPDATE documents 
        SET title = ?, description = ?, classe = ?, is_active = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `;
      await dbQuery(updateSql, [
        title,
        description,
        classe,
        is_active,
        id
      ]);
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
    const documents = await dbQuery(
      'SELECT file_path FROM documents WHERE id = ? LIMIT 1',
      [id]
    );
    
    if (documents.length === 0) {
      return res.status(404).json({ success: false, message: 'Document non trouvé' });
    }
    
    // Supprimer le fichier physique
    const filePath = documents[0].file_path;
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
    
    // Supprimer en base dans une transaction
    await transaction(async (conn) => {
      await conn.execute('DELETE FROM document_downloads WHERE document_id = ?', [id]);
      await conn.execute('DELETE FROM document_category_links WHERE document_id = ?', [id]);
      await conn.execute('DELETE FROM documents WHERE id = ?', [id]);
    });
    
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
    const { subject_id, search, categorie } = req.query;
    const userClasse = req.user.classe;
    
    if (!userClasse) {
      return res.status(400).json({ success: false, message: 'Classe non définie' });
    }
    
    let whereClause = 'd.classe = ? AND d.is_active = 1';
    let params = [userClasse];
    
    if (subject_id) {
      // Vérifier que l'utilisateur a bien sélectionné cette matière
      try {
        const userRows = await dbQuery('SELECT matieres FROM users WHERE id = ? LIMIT 1', [req.user.id]);
        if (userRows && userRows.length > 0 && userRows[0].matieres) {
          const raw = userRows[0].matieres;
          let selected = [];
          try { selected = typeof raw === 'string' ? JSON.parse(raw) : raw; } catch { selected = []; }
          const subjectRows = await dbQuery('SELECT name FROM subjects WHERE id = ? LIMIT 1', [subject_id]);
          const subjectName = subjectRows && subjectRows[0] ? String(subjectRows[0].name).toLowerCase() : '';
          const normalized = (Array.isArray(selected) ? selected : []).map(v => String(v).toLowerCase());
          if (normalized.length > 0 && !(normalized.includes(String(subject_id).toLowerCase()) || (subjectName && normalized.includes(subjectName)))) {
            return res.json({ success: true, data: [] });
          }
        }
      } catch (e) {
        // En cas d'erreur de lecture, on ne bloque pas mais on continue avec le filtre
      }
      whereClause += ' AND d.subject_id = ?';
      params.push(subject_id);
    }
    
    if (categorie) {
      whereClause += ' AND d.categorie = ?';
      params.push(categorie);
    }
    
    let joinCategory = '';
    
    if (search) {
      whereClause += ' AND (d.title LIKE ? OR d.description LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }
    
    const listSql = `
      SELECT 
        d.id,
        d.title,
        d.description,
        d.file_name,
        d.file_type,
        d.file_size,
        d.download_count,
        d.created_at,
        d.categorie,
        s.name as subject_name,
        s.color as subject_color,
        s.icon as subject_icon
      FROM documents d
      JOIN subjects s ON d.subject_id = s.id
      ${joinCategory}
      WHERE ${whereClause}
      ORDER BY d.created_at DESC
    `;
    
    const documents = await dbQuery(listSql, params);
    
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
    const userClasse = req.user && req.user.classe ? req.user.classe : null;
    const isAdminUser = req.user && (req.user.role === 'admin' || req.user.role === 'super_admin' || req.user.is_admin);
    
    const baseSql = `
      SELECT d.*, s.name as subject_name
      FROM documents d
      JOIN subjects s ON d.subject_id = s.id
      WHERE d.id = ? AND d.is_active = 1`;

    const documents = userClasse && !isAdminUser
      ? await dbQuery(baseSql + ' AND d.classe = ?', [id, userClasse])
      : await dbQuery(baseSql, [id]);
    
    if (documents.length === 0) {
      return res.status(404).json({ success: false, message: 'Document non trouvé' });
    }
    
    const document = documents[0];

    // Envoyer le fichier et mettre à jour la DB uniquement si succès
    res.download(document.file_path, document.file_name, async (err) => {
      if (err) {
        logger.error('Business Error', {
          error: err.message,
          stack: err.stack,
          context: {
            url: req.originalUrl,
            method: req.method,
            ip: req.ip,
            userAgent: req.headers['user-agent'],
            userId: req.user?.id
          }
        });
        return res.status(404).json({ success: false, message: 'Fichier introuvable' });
      }
      try {
        await dbQuery('INSERT INTO document_downloads (id, document_id, user_id) VALUES (?, ?, ?)', [uuidv4(), id, req.user.id]);
        await dbQuery('UPDATE documents SET download_count = download_count + 1 WHERE id = ?', [id]);
        logger.info(`Document téléchargé: ${document.title} par ${req.user.email}`);
      } catch (e) {
        logger.error('Erreur post-téléchargement:', e);
      }
    });
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
    // Limiter aux deux catégories demandées pour l'instant
    const categories = await dbQuery(
      "SELECT id, name, description, color, is_active, created_at FROM document_categories WHERE is_active = 1 AND name IN ('Manuels scolaires','Méthodologies') ORDER BY name"
    );
    
    logger.info(`Récupération de ${categories.length} catégories`);
    res.json({ success: true, data: categories });
  } catch (error) {
    logger.error('Erreur lors de la récupération des catégories:', {
      message: error.message,
      code: error.code,
      errno: error.errno,
      sqlState: error.sqlState
    });
    res.status(500).json({ 
      success: false, 
      message: 'Erreur lors de la récupération des catégories',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// =============================================
// ROUTES POUR LES STATISTIQUES
// =============================================

// GET /api/documents/stats - Statistiques (admin)
router.get('/stats', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const stats = await dbQuery(`
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







