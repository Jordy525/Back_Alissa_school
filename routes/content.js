const express = require('express');
const { body, validationResult } = require('express-validator');
const { authenticateToken } = require('../middleware/simpleAuth');
const router = express.Router();

// Validation pour les requêtes de contenu
const validateContentRequest = [
  body('subject')
    .isString()
    .withMessage('La matière est requise'),
  body('type')
    .isIn(['library', 'methodologies'])
    .withMessage('Le type doit être library ou methodologies')
];

// Route pour récupérer les ressources de bibliothèque
router.get('/library/:subject', authenticateToken, async (req, res) => {
  try {
    const { subject } = req.params;
    const userProfile = req.user;

    // Générer des ressources de bibliothèque dynamiques
    const libraryResources = [
      {
        id: '1',
        title: `Manuel de ${subject} - Niveau ${userProfile.classe || 'général'}`,
        status: 'Disponible',
        progress: Math.floor(Math.random() * 101),
        cover: `https://placehold.co/80x120?text=Manuel+${subject}&font=roboto&bg=3B82F6&color=white`,
        pdfUrl: '/Book.pdf',
        description: `Manuel complet de ${subject} adapté au niveau ${userProfile.classe || 'général'}`,
        author: 'Équipe Alissa School',
        pages: Math.floor(Math.random() * 200) + 50,
        difficulty: ['facile', 'moyen', 'difficile'][Math.floor(Math.random() * 3)]
      },
      {
        id: '2',
        title: `Exercices pratiques - ${subject}`,
        status: 'Nouveau',
        progress: 0,
        cover: `https://placehold.co/80x120?text=Exercices+${subject}&font=roboto&bg=10B981&color=white`,
        pdfUrl: '/Book.pdf',
        description: `Collection d'exercices progressifs pour maîtriser ${subject}`,
        author: 'Professeurs experts',
        pages: Math.floor(Math.random() * 150) + 30,
        difficulty: 'moyen'
      },
      {
        id: '3',
        title: `Résumé de cours - ${subject}`,
        status: 'En cours',
        progress: Math.floor(Math.random() * 80) + 20,
        cover: `https://placehold.co/80x120?text=Résumé+${subject}&font=roboto&bg=F59E0B&color=white`,
        pdfUrl: '/Book.pdf',
        description: `Résumé synthétique des concepts clés de ${subject}`,
        author: 'Assistant IA Alissa',
        pages: Math.floor(Math.random() * 50) + 20,
        difficulty: 'facile'
      }
    ];

    res.json({
      success: true,
      data: {
        resources: libraryResources,
        subject: subject,
        totalResources: libraryResources.length
      }
    });

  } catch (error) {
    console.error('Erreur récupération bibliothèque:', error);
    res.status(500).json({
      success: false,
      error: {
        message: 'Erreur lors de la récupération des ressources',
        details: error.message
      }
    });
  }
});

// Route pour récupérer les méthodologies
router.get('/methodologies/:subject', authenticateToken, async (req, res) => {
  try {
    const { subject } = req.params;
    const userProfile = req.user;

    // Générer des méthodologies dynamiques
    const methodologies = [
      {
        id: '1',
        title: `Méthode d'apprentissage - ${subject}`,
        status: 'Recommandé',
        progress: Math.floor(Math.random() * 101),
        cover: `https://placehold.co/80x120?text=Méthode+${subject}&font=roboto&bg=8B5CF6&color=white`,
        pdfUrl: '/Book.pdf',
        description: `Méthode éprouvée pour exceller en ${subject}`,
        author: 'Experts pédagogiques',
        duration: '30 min',
        level: userProfile.classe || 'général',
        techniques: ['Prise de notes', 'Répétition espacée', 'Cartes mentales']
      },
      {
        id: '2',
        title: `Techniques de mémorisation - ${subject}`,
        status: 'Populaire',
        progress: Math.floor(Math.random() * 80) + 10,
        cover: `https://placehold.co/80x120?text=Mémorisation+${subject}&font=roboto&bg=EF4444&color=white`,
        pdfUrl: '/Book.pdf',
        description: `Techniques avancées pour retenir les concepts de ${subject}`,
        author: 'Spécialistes en cognition',
        duration: '45 min',
        level: userProfile.classe || 'général',
        techniques: ['Palais de mémoire', 'Acronymes', 'Histoires mnémotechniques']
      },
      {
        id: '3',
        title: `Révision efficace - ${subject}`,
        status: 'Essentiel',
        progress: Math.floor(Math.random() * 60) + 30,
        cover: `https://placehold.co/80x120?text=Révision+${subject}&font=roboto&bg=06B6D4&color=white`,
        pdfUrl: '/Book.pdf',
        description: `Guide complet pour réviser efficacement ${subject}`,
        author: 'Coachs d\'étude',
        duration: '20 min',
        level: userProfile.classe || 'général',
        techniques: ['Pomodoro', 'Feynman', 'Tests de récupération']
      }
    ];

    res.json({
      success: true,
      data: {
        methodologies: methodologies,
        subject: subject,
        totalMethodologies: methodologies.length
      }
    });

  } catch (error) {
    console.error('Erreur récupération méthodologies:', error);
    res.status(500).json({
      success: false,
      error: {
        message: 'Erreur lors de la récupération des méthodologies',
        details: error.message
      }
    });
  }
});

// Route pour marquer une ressource comme lue
router.post('/mark-read', authenticateToken, [
  body('resourceId').isString().withMessage('ID de ressource requis'),
  body('type').isIn(['library', 'methodologies']).withMessage('Type invalide'),
  body('progress').isInt({ min: 0, max: 100 }).withMessage('Progression invalide')
], async (req, res) => {
  try {
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

    const { resourceId, type, progress } = req.body;
    const userProfile = req.user;

    // Ici, vous pourriez sauvegarder en base de données
    // Pour l'instant, on simule juste une réponse de succès
    res.json({
      success: true,
      data: {
        message: 'Progression sauvegardée',
        resourceId: resourceId,
        type: type,
        progress: progress,
        userId: userProfile.id
      }
    });

  } catch (error) {
    console.error('Erreur sauvegarde progression:', error);
    res.status(500).json({
      success: false,
      error: {
        message: 'Erreur lors de la sauvegarde',
        details: error.message
      }
    });
  }
});

module.exports = router;
