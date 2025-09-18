const express = require('express');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { body, validationResult } = require('express-validator');
const { authenticateToken } = require('../middleware/simpleAuth');
const asyncHandler = require('express-async-handler');
const { query } = require('../config/database');
const router = express.Router();

// Initialiser Gemini AI
const genAI = process.env.GEMINI_API_KEY 
  ? new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
  : null;

// Validation pour les requêtes de chat
const validateChatRequest = [
  body('message')
    .isString()
    .isLength({ min: 1, max: 1000 })
    .withMessage('Le message doit être une chaîne de 1 à 1000 caractères'),
  body('context')
    .optional()
    .isObject()
    .withMessage('Le contexte doit être un objet'),
  body('subject')
    .optional()
    .isString()
    .withMessage('La matière doit être une chaîne')
];

// Validation pour les requêtes de résumé
const validateSummaryRequest = [
  body('courseTitle')
    .isString()
    .isLength({ min: 1, max: 200 })
    .withMessage('Le titre du cours doit être une chaîne de 1 à 200 caractères'),
  body('subject')
    .isString()
    .withMessage('La matière est requise'),
  body('level')
    .optional()
    .isString()
    .withMessage('Le niveau doit être une chaîne')
];

// Validation pour les requêtes de quiz
const validateQuizRequest = [
  body('subject')
    .isString()
    .withMessage('La matière est requise'),
  body('level')
    .optional()
    .isString()
    .withMessage('Le niveau doit être une chaîne'),
  body('topic')
    .optional()
    .isString()
    .withMessage('Le sujet doit être une chaîne'),
  body('difficulty')
    .optional()
    .isIn(['facile', 'moyen', 'difficile'])
    .withMessage('La difficulté doit être facile, moyen ou difficile')
];

// Route pour l'assistant IA global
router.post('/chat', authenticateToken, async (req, res) => {
  try {
    // Validation manuelle
    const { message, context = {}, subject } = req.body;
    
    if (!message || typeof message !== 'string' || message.length < 1 || message.length > 1000) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Le message doit être une chaîne de 1 à 1000 caractères'
        }
      });
    }

    const userProfile = req.user;

    // Vérifier que Gemini AI est configuré
    if (!genAI) {
      return res.status(500).json({
        success: false,
        error: {
          message: 'Service IA non configuré',
          details: 'La clé API Gemini n\'est pas configurée. Veuillez configurer GEMINI_API_KEY dans le fichier .env'
        }
      });
    }

    // Construire le prompt contextuel
    let matieresText = 'Aucune';
    try {
      if (userProfile.matieres) {
        const matieres = JSON.parse(userProfile.matieres);
        matieresText = Array.isArray(matieres) ? matieres.join(', ') : 'Aucune';
      }
    } catch (e) {
      console.error('Erreur parsing matières:', e);
      matieresText = 'Aucune';
    }

    let systemPrompt = `Tu es un assistant éducatif intelligent pour la plateforme Alissa School. 
    Tu aides les étudiants gabonais dans leur apprentissage scolaire.

    Informations sur l'étudiant:
    - Nom: ${userProfile.name}
    - Classe: ${userProfile.classe || 'Non spécifiée'}
    - Matières: ${matieresText}
    - Langue gabonaise: ${userProfile.langue_gabonaise || 'Non spécifiée'}`;

    if (subject) {
      systemPrompt += `\n- Matière spécifique: ${subject}`;
    }

    systemPrompt += `\n\nContexte de la conversation: ${JSON.stringify(context)}

    Réponds de manière:
    - Éducative et motivante
    - Adaptée au niveau scolaire de l'étudiant
    - En français, mais n'hésite pas à utiliser des mots de la langue gabonaise de l'étudiant si approprié
    - Avec des exemples concrets et pratiques
    - En encourageant l'apprentissage actif

    Question de l'étudiant: ${message}`;

    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const result = await model.generateContent(systemPrompt);
    const response = await result.response;
    
    // Vérifier si la réponse est valide
    if (!response || !response.text) {
      throw new Error('Réponse invalide de Gemini AI');
    }
    
    const aiResponse = response.text();
    
    // Vérifier que la réponse n'est pas vide
    if (!aiResponse || aiResponse.trim().length === 0) {
      throw new Error('Réponse vide de Gemini AI');
    }

    res.json({
      success: true,
      data: {
        message: aiResponse,
        timestamp: new Date().toISOString(),
        subject: subject || null
      }
    });

  } catch (error) {
    console.error('Erreur Gemini AI:', error);
    res.status(500).json({
      success: false,
      error: {
        message: 'Erreur lors de la génération de la réponse IA',
        details: error.message
      }
    });
  }
});

// Route pour l'assistant IA spécifique à une matière
router.post('/chat/subject', authenticateToken, async (req, res) => {
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

    const { message, context = {}, subject } = req.body;
    const userProfile = req.user;

    // Vérifier que Gemini AI est configuré
    if (!genAI) {
      return res.status(500).json({
        success: false,
        error: {
          message: 'Service IA non configuré',
          details: 'La clé API Gemini n\'est pas configurée. Veuillez configurer GEMINI_API_KEY dans le fichier .env'
        }
      });
    }

    if (!subject) {
      return res.status(400).json({
      success: false,
      error: {
          message: 'La matière est requise pour l\'assistant spécialisé'
      }
    });
  }

    // Construire le prompt spécialisé pour la matière
    let systemPrompt = `Tu es un assistant éducatif spécialisé en ${subject} pour la plateforme Alissa School.
    Tu aides les étudiants gabonais à exceller dans cette matière spécifique.

    Informations sur l'étudiant:
    - Nom: ${userProfile.name}
    - Classe: ${userProfile.classe || 'Non spécifiée'}
    - Matière: ${subject}
    - Langue gabonaise: ${userProfile.langue_gabonaise || 'Non spécifiée'}

    Contexte de la conversation: ${JSON.stringify(context)}

    Réponds de manière:
    - Spécialisée en ${subject}
    - Adaptée au niveau ${userProfile.classe || 'scolaire'}
    - Avec des exemples concrets de ${subject}
    - En proposant des exercices pratiques
    - En expliquant les concepts clés
    - En encourageant la pratique régulière

    Question de l'étudiant: ${message}`;

    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const result = await model.generateContent(systemPrompt);
    const response = await result.response;
    const aiResponse = response.text();

    res.json({
      success: true,
      data: {
        message: aiResponse,
        timestamp: new Date().toISOString(),
        subject: subject
      }
    });

  } catch (error) {
    console.error('Erreur Gemini AI (matière):', error);
    res.status(500).json({
        success: false,
        error: {
        message: 'Erreur lors de la génération de la réponse IA spécialisée',
        details: error.message
        }
      });
    }
});

// Route pour générer des résumés de cours
router.post('/summary', authenticateToken, async (req, res) => {
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

    const { courseTitle, subject, level } = req.body;
    const userProfile = req.user;

    const systemPrompt = `Génère un résumé éducatif complet et structuré pour le cours "${courseTitle}" en ${subject}.

    Informations contextuelles:
    - Niveau scolaire: ${level || userProfile.classe || 'général'}
    - Matière: ${subject}
    - Étudiant gabonais: ${userProfile.name}
    - Langue gabonaise: ${userProfile.langue_gabonaise || 'Non spécifiée'}

    Le résumé doit inclure:
    1. Introduction et objectifs du cours
    2. Concepts clés et définitions importantes
    3. Points essentiels à retenir
    4. Exemples pratiques et applications
    5. Conseils d'étude spécifiques à la matière
    6. Ressources pour approfondir

    Format:
    - Structure claire avec des titres
    - Langage adapté au niveau scolaire
    - Exemples concrets et pertinents
    - Conseils pratiques pour la révision
    - Longueur: 500-800 mots

    Génère le résumé maintenant:`;

    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const result = await model.generateContent(systemPrompt);
    const response = await result.response;
    const summary = response.text();

    res.json({
      success: true,
      data: {
        summary: summary,
        courseTitle: courseTitle,
        subject: subject,
        level: level || userProfile.classe,
        generatedAt: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Erreur génération résumé:', error);
    res.status(500).json({
      success: false,
      error: {
        message: 'Erreur lors de la génération du résumé',
        details: error.message
      }
    });
  }
});

// Route pour générer une leçon
router.post('/lesson/generate', authenticateToken, async (req, res) => {
  try {
    const { subject, content, contentType = 'search', topic, level, difficulty = 'medium' } = req.body;

    if (!subject || !content) {
      return res.status(400).json({
        success: false,
        error: { message: 'Sujet et contenu requis' }
      });
    }

    // Récupérer le profil utilisateur
    const { query } = require('../config/database');
    const users = await query(
      `SELECT id, name, email, classe, total_points, level 
       FROM users WHERE id = ? AND deleted_at IS NULL`,
      [req.user.id]
    );

    if (users.length === 0) {
      return res.status(404).json({
        success: false,
        error: { message: 'Profil utilisateur non trouvé' }
      });
    }

    const userProfile = users[0];

    if (!genAI) {
      return res.status(500).json({
        success: false,
        error: { message: 'Service IA non configuré' }
      });
    }

    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    // Convertir le niveau pour correspondre à l'enum de la table lessons
    const classLevel = level || userProfile.classe;
    const mappedLevel = classLevel === 'terminale' ? 'Terminale' : 
                       classLevel === 'premiere' ? '1ère' :
                       classLevel === 'seconde' ? '2nde' :
                       classLevel === '3eme' ? '3ème' :
                       classLevel === '4eme' ? '4ème' :
                       classLevel === '5eme' ? '5ème' :
                       classLevel === '6eme' ? '6ème' : 'Terminale';

    // Convertir la difficulté pour correspondre à l'enum de la table lessons
    const mappedDifficulty = difficulty === 'facile' ? 'easy' :
                            difficulty === 'moyen' ? 'medium' :
                            difficulty === 'difficile' ? 'hard' : 'medium';

    let systemPrompt;
    if (contentType === 'summary') {
      systemPrompt = `Génère une leçon complète et structurée basée sur ce résumé pour un élève de niveau ${mappedLevel}:\n\nRÉSUMÉ:\n${content}\n\nLa leçon doit inclure:\n1. Introduction claire\n2. Concepts clés expliqués simplement\n3. Exemples concrets\n4. Exercices pratiques\n5. Conclusion avec points à retenir\n\nAdapte le niveau de difficulté et le vocabulaire à la classe ${mappedLevel}.`;
    } else if (contentType === 'search') {
      systemPrompt = `Génère une leçon complète et structurée basée sur ces résultats de recherche pour un élève de niveau ${mappedLevel}:\n\nRÉSULTATS DE RECHERCHE:\n${content}\n\nLa leçon doit inclure:\n1. Introduction claire\n2. Concepts clés expliqués simplement\n3. Exemples concrets\n4. Exercices pratiques\n5. Conclusion avec points à retenir\n\nAdapte le niveau de difficulté et le vocabulaire à la classe ${mappedLevel}.`;
    } else {
      systemPrompt = `Génère une leçon complète et structurée sur le sujet "${topic || subject}" pour un élève de niveau ${mappedLevel}.\n\nLa leçon doit inclure:\n1. Introduction claire\n2. Concepts clés expliqués simplement\n3. Exemples concrets\n4. Exercices pratiques\n5. Conclusion avec points à retenir\n\nAdapte le niveau de difficulté et le vocabulaire à la classe ${mappedLevel}.`;
    }

    const result = await model.generateContent(systemPrompt);
    const response = await result.response;
    const lessonContent = response.text();

    // Structurer le contenu de la leçon
    const lessonData = {
      title: topic || `Leçon: ${subject}`,
      content: lessonContent,
      level: mappedLevel,
      difficulty: mappedDifficulty,
      contentType: contentType,
      contentSource: content ? content.substring(0, 500) : null
    };

    // Sauvegarder la leçon dans la base de données
    const { v4: uuidv4 } = require('uuid');
    const lessonId = uuidv4();

    try {
      // Récupérer le prochain order_index disponible pour cette matière et classe
      const existingLessons = await query(
        `SELECT MAX(order_index) as max_order FROM lessons 
         WHERE subject_id = ? AND class_level = ?`,
        [subject, lessonData.level]
      );
      
      const nextOrderIndex = (existingLessons[0]?.max_order || 0) + 1;

      await query(
        `INSERT INTO lessons (id, subject_id, class_level, title, description, content, difficulty, points_reward, order_index, is_active, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
        [lessonId, subject, lessonData.level, lessonData.title, `Leçon générée automatiquement - ${contentType}`, lessonData.content, lessonData.difficulty, 25, nextOrderIndex, 1]
      );
      
      console.log(`✅ Leçon sauvegardée avec l'ID: ${lessonId} et l'ordre: ${nextOrderIndex}`);
    } catch (dbError) {
      console.error('Erreur lors de la sauvegarde de la leçon:', dbError);
      // Retourner une erreur si la sauvegarde échoue
      return res.status(500).json({
        success: false,
        error: { message: 'Erreur lors de la sauvegarde de la leçon en base de données' }
      });
    }

    res.json({
      success: true,
      data: {
        lesson: lessonData,
        lessonId: lessonId
      }
    });

  } catch (error) {
    console.error('Erreur lors de la génération de la leçon:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Erreur lors de la génération de la leçon' }
    });
  }
});

// Route pour générer des quiz
router.post('/quiz/generate', authenticateToken, async (req, res) => {
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

    const { subject, level, topic, difficulty = 'moyen', content, contentType = 'general' } = req.body;
    const userProfile = req.user;

    // Vérifier que Gemini AI est configuré
    if (!genAI) {
      return res.status(500).json({
        success: false,
        error: {
          message: 'Service IA non configuré',
          details: 'La clé API Gemini n\'est pas configurée. Veuillez configurer GEMINI_API_KEY dans le fichier .env'
        }
      });
    }

    // Construire le prompt selon le type de contenu
    let systemPrompt;
    
    if (content && contentType === 'summary') {
      systemPrompt = `Génère un quiz éducatif de 5 questions basé sur ce résumé de cours:

RÉSUMÉ:
${content}

Paramètres:
- Matière: ${subject}
- Niveau: ${level || userProfile.classe || 'général'}
- Difficulté: ${difficulty}
- Étudiant: ${userProfile.name} (Gabon)

Format de réponse (JSON strict):
{
  "title": "Quiz basé sur le résumé: ${topic || 'Cours'}",
  "description": "Questions basées sur le résumé créé",
  "questions": [
    {
      "id": 1,
      "question": "Question claire basée sur le résumé",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correctAnswer": 0,
      "explanation": "Explication de la réponse correcte"
    }
  ]
}

Règles:
- Questions basées UNIQUEMENT sur le contenu du résumé
- Options plausibles et bien différenciées
- Explications éducatives et constructives
- Langage clair et accessible
- Niveau adapté à ${level || userProfile.classe}

Génère le quiz maintenant:`;
    } else if (content && contentType === 'search') {
      systemPrompt = `Génère un quiz éducatif de 5 questions basé sur ces résultats de recherche:

RÉSULTATS DE RECHERCHE:
${content}

Paramètres:
- Matière: ${subject}
- Niveau: ${level || userProfile.classe || 'général'}
- Difficulté: ${difficulty}
- Étudiant: ${userProfile.name} (Gabon)

Format de réponse (JSON strict):
{
  "title": "Quiz basé sur la recherche: ${topic || 'Recherche'}",
  "description": "Questions basées sur les informations trouvées",
  "questions": [
    {
      "id": 1,
      "question": "Question claire basée sur les résultats",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correctAnswer": 0,
      "explanation": "Explication de la réponse correcte"
    }
  ]
}

Règles:
- Questions basées UNIQUEMENT sur le contenu des résultats de recherche
- Options plausibles et bien différenciées
- Explications éducatives et constructives
- Langage clair et accessible
- Niveau adapté à ${level || userProfile.classe}

Génère le quiz maintenant:`;
    } else {
      // Quiz général (comportement existant)
      systemPrompt = `Génère un quiz éducatif de 5 questions pour la matière ${subject}.

    Paramètres:
    - Niveau: ${level || userProfile.classe || 'général'}
    - Sujet: ${topic || 'général'}
    - Difficulté: ${difficulty}
    - Étudiant: ${userProfile.name} (Gabon)

    Format de réponse (JSON strict):
{
  "title": "Titre du quiz",
  "description": "Description courte",
  "questions": [
    {
          "id": 1,
      "question": "Question claire et précise",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correctAnswer": 0,
          "explanation": "Explication de la réponse correcte"
        }
      ]
    }

    Règles:
    - Questions adaptées au niveau ${level || userProfile.classe}
    - Options plausibles et bien différenciées
    - Explications éducatives et constructives
    - Langage clair et accessible
    - Sujet: ${topic || 'concepts généraux de ' + subject}

    Génère le quiz maintenant:`;
    }

    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const result = await model.generateContent(systemPrompt);
    const response = await result.response;
    const quizContent = response.text();

    // Parser la réponse JSON
    let quizData;
    try {
      // Extraire le JSON de la réponse
      const jsonMatch = quizContent.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        quizData = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('Format JSON non trouvé dans la réponse');
      }
    } catch (parseError) {
      console.error('Erreur parsing JSON:', parseError);
      return res.status(500).json({
        success: false,
        error: {
          message: 'Erreur lors du parsing de la réponse IA',
          details: 'Format de réponse invalide'
        }
      });
    }

    // Sauvegarder le quiz dans la base de données
    const quizId = require('uuid').v4();
    const { query } = require('../config/database');
    
    try {
      // Vérifier si les colonnes existent avant d'insérer
      const tableInfo = await query(`DESCRIBE quizzes`);
      const columns = tableInfo.map(col => col.Field);
      
      let insertQuery, insertValues;
      
      if (columns.includes('difficulty') && columns.includes('content_type')) {
        // Nouvelles colonnes disponibles
        insertQuery = `INSERT INTO quizzes (id, subject_id, title, description, questions, difficulty, level, content_type, content_source, created_by, created_at) 
                       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`;
        insertValues = [
          quizId,
          subject,
          quizData.title,
          quizData.description,
          JSON.stringify(quizData.questions),
          difficulty,
          level || userProfile.classe,
          contentType,
          content ? content.substring(0, 500) : null,
          userProfile.id
        ];
      } else {
        // Structure existante
        insertQuery = `INSERT INTO quizzes (id, subject_id, title, description, questions, created_at) 
                       VALUES (?, ?, ?, ?, ?, NOW())`;
        insertValues = [
          quizId,
          subject,
          quizData.title,
          quizData.description,
          JSON.stringify(quizData.questions)
        ];
      }
      
      await query(insertQuery, insertValues);
    } catch (dbError) {
      console.error('Erreur lors de la sauvegarde du quiz:', dbError);
      // Continuer même si la sauvegarde échoue
    }

    res.json({
      success: true,
      data: {
        quiz: quizData,
        quizId: quizId,
        metadata: {
          subject: subject,
          level: level || userProfile.classe,
          topic: topic,
          difficulty: difficulty,
          contentType: contentType,
          generatedAt: new Date().toISOString()
        }
      }
    });

  } catch (error) {
    console.error('Erreur génération quiz:', error);
    res.status(500).json({
      success: false,
      error: {
        message: 'Erreur lors de la génération du quiz',
        details: error.message
      }
    });
  }
});

// Route pour analyser des fichiers PDF (future fonctionnalité)
router.post('/analyze/pdf', authenticateToken, async (req, res) => {
  try {
    // Cette fonctionnalité sera implémentée plus tard
    res.status(501).json({
      success: false,
      error: {
        message: 'Analyse PDF non encore implémentée',
        details: 'Cette fonctionnalité sera disponible dans une future version'
      }
    });
  } catch (error) {
    console.error('Erreur analyse PDF:', error);
    res.status(500).json({
        success: false,
        error: {
        message: 'Erreur lors de l\'analyse du PDF',
        details: error.message
      }
    });
  }
});

/**
 * Récupère un quiz par son ID
 */
router.get('/quiz/:quizId', authenticateToken, asyncHandler(async (req, res) => {
  try {
    const { quizId } = req.params;
    const userId = req.user.id;

    // Récupérer le quiz depuis la base de données
    const quizzes = await query(
      `SELECT id, subject_id, title, description, questions, difficulty, level, 
              content_type, content_source, created_by, created_at
       FROM quizzes 
       WHERE id = ? AND (created_by = ? OR created_by IS NULL)`,
      [quizId, userId]
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
    
    // Parser les questions JSON
    let questions = [];
    try {
      questions = JSON.parse(quiz.questions);
    } catch (parseError) {
      console.error('Erreur lors du parsing des questions:', parseError);
      questions = [];
    }

    const quizData = {
      id: quiz.id,
      title: quiz.title,
      description: quiz.description,
      questions: questions,
      difficulty: quiz.difficulty,
      level: quiz.level,
      contentType: quiz.content_type,
      contentSource: quiz.content_source,
      createdAt: quiz.created_at
    };

    res.json({
      success: true,
      data: {
        quiz: quizData
      }
    });

  } catch (error) {
    console.error('Erreur lors de la récupération du quiz:', error);
    res.status(500).json({
      success: false,
      error: {
        message: 'Erreur lors de la récupération du quiz'
      }
    });
  }
}));

module.exports = router;