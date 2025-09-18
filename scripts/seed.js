const { connectDB, query } = require('../config/database');
const { logger } = require('../config/logger'); // <-- correction ici
const { v4: uuidv4 } = require('uuid');

// Données de base pour peupler la base de données
const seedData = async () => {
  try {
    await connectDB();
    logger.info('🌱 Début du seeding de la base de données...');

    // Vérification si les données existent déjà
    const existingSubjects = await query('SELECT COUNT(*) as count FROM subjects');
    if (existingSubjects[0].count > 0) {
      logger.info('⚠️  Des données existent déjà, seeding ignoré');
      return;
    }

    // 1. Création des matières
    const subjects = [
      {
        id: uuidv4(),
        name: 'Mathématiques',
        description: 'Apprentissage des concepts mathématiques fondamentaux',
        icon: '🧮',
        color: '#3B82F6',
        classLevels: ['6ème', '5ème', '4ème', '3ème', '2nde', '1ère', 'Terminale'],
        totalLessons: 0
      },
      {
        id: uuidv4(),
        name: 'Français',
        description: 'Maîtrise de la langue française et de la littérature',
        icon: '📚',
        color: '#EF4444',
        classLevels: ['6ème', '5ème', '4ème', '3ème', '2nde', '1ère', 'Terminale'],
        totalLessons: 0
      },
      {
        id: uuidv4(),
        name: 'Histoire-Géographie',
        description: 'Découverte de l\'histoire et de la géographie',
        icon: '🌍',
        color: '#10B981',
        classLevels: ['6ème', '5ème', '4ème', '3ème', '2nde', '1ère', 'Terminale'],
        totalLessons: 0
      },
      {
        id: uuidv4(),
        name: 'Sciences Physiques',
        description: 'Physique et chimie pour tous les niveaux',
        icon: '⚗️',
        color: '#8B5CF6',
        classLevels: ['6ème', '5ème', '4ème', '3ème', '2nde', '1ère', 'Terminale'],
        totalLessons: 0
      },
      {
        id: uuidv4(),
        name: 'Sciences de la Vie et de la Terre',
        description: 'Biologie et sciences de la terre',
        icon: '🔬',
        color: '#F59E0B',
        classLevels: ['6ème', '5ème', '4ème', '3ème', '2nde', '1ère', 'Terminale'],
        totalLessons: 0
      },
      {
        id: uuidv4(),
        name: 'Anglais',
        description: 'Apprentissage de la langue anglaise',
        icon: '🇬🇧',
        color: '#06B6D4',
        classLevels: ['6ème', '5ème', '4ème', '3ème', '2nde', '1ère', 'Terminale'],
        totalLessons: 0
      }
    ];

    for (const subject of subjects) {
      await query(
        'INSERT INTO subjects (id, name, description, icon, color, class_levels, total_lessons) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [subject.id, subject.name, subject.description, subject.icon, subject.color, JSON.stringify(subject.classLevels), subject.totalLessons]
      );
    }
    logger.info('✅ Matières créées');

    // 2. Création des leçons d'exemple pour les mathématiques
    const mathSubjectId = subjects[0].id;
    const mathLessons = [
      {
        id: uuidv4(),
        subjectId: mathSubjectId,
        title: 'Introduction aux fractions',
        description: 'Découverte des fractions et de leur utilisation',
        content: 'Les fractions représentent une partie d\'un tout. Le numérateur indique combien de parts on prend, le dénominateur indique en combien de parts le tout est divisé.',
        estimatedDuration: 30,
        difficulty: 'easy',
        pointsReward: 25,
        orderIndex: 1
      },
      {
        id: uuidv4(),
        subjectId: mathSubjectId,
        title: 'Addition et soustraction de fractions',
        description: 'Apprendre à additionner et soustraire des fractions',
        content: 'Pour additionner ou soustraire des fractions, il faut d\'abord les réduire au même dénominateur, puis additionner ou soustraire les numérateurs.',
        estimatedDuration: 45,
        difficulty: 'medium',
        pointsReward: 30,
        orderIndex: 2
      },
      {
        id: uuidv4(),
        subjectId: mathSubjectId,
        title: 'Multiplication et division de fractions',
        description: 'Maîtriser la multiplication et la division des fractions',
        content: 'Pour multiplier des fractions, on multiplie les numérateurs entre eux et les dénominateurs entre eux. Pour diviser, on multiplie par l\'inverse.',
        estimatedDuration: 50,
        difficulty: 'hard',
        pointsReward: 35,
        orderIndex: 3
      }
    ];

    for (const lesson of mathLessons) {
      await query(
        'INSERT INTO lessons (id, subject_id, title, description, content, estimated_duration, difficulty, points_reward, order_index) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [lesson.id, lesson.subjectId, lesson.title, lesson.description, lesson.content, lesson.estimatedDuration, lesson.difficulty, lesson.pointsReward, lesson.orderIndex]
      );
    }
    logger.info('✅ Leçons de mathématiques créées');

    // 3. Création des quiz d'exemple
    const quizData = {
      id: uuidv4(),
      lessonId: mathLessons[0].id,
      subjectId: mathSubjectId,
      title: 'Quiz sur les fractions',
      description: 'Testez vos connaissances sur les fractions',
      questions: JSON.stringify([
        {
          id: 'q1',
          question: 'Que représente le numérateur dans une fraction ?',
          options: [
            'Le nombre de parts prises',
            'Le nombre total de parts',
            'La valeur de la fraction',
            'Le dénominateur'
          ],
          correctAnswer: 0,
          explanation: 'Le numérateur indique combien de parts on prend du tout.'
        },
        {
          id: 'q2',
          question: 'Dans la fraction 3/4, que représente le 4 ?',
          options: [
            'Le numérateur',
            'Le dénominateur',
            'La valeur totale',
            'Le résultat'
          ],
          correctAnswer: 1,
          explanation: 'Le 4 est le dénominateur, il indique en combien de parts le tout est divisé.'
        },
        {
          id: 'q3',
          question: 'Quelle fraction représente la moitié ?',
          options: [
            '1/3',
            '2/4',
            '3/6',
            '2/4 et 3/6'
          ],
          correctAnswer: 3,
          explanation: '1/2 = 2/4 = 3/6, toutes ces fractions représentent la moitié.'
        }
      ]),
      timeLimit: 10,
      passingScore: 250
    };

    await query(
      'INSERT INTO quizzes (id, lesson_id, subject_id, title, description, questions, time_limit, passing_score) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [quizData.id, quizData.lessonId, quizData.subjectId, quizData.title, quizData.description, quizData.questions, quizData.timeLimit, quizData.passingScore]
    );
    logger.info('✅ Quiz créé');

    // 4. Création des succès
    const achievements = [
      {
        id: uuidv4(),
        title: 'Premier pas',
        description: 'Terminez votre première leçon',
        icon: '👶',
        points: 50,
        rarity: 'common',
        requirements: JSON.stringify({ type: 'lesson_completed', count: 1 })
      },
      {
        id: uuidv4(),
        title: 'Étudiant assidu',
        description: 'Terminez 10 leçons',
        icon: '📖',
        points: 200,
        rarity: 'rare',
        requirements: JSON.stringify({ type: 'lesson_completed', count: 10 })
      },
      {
        id: uuidv4(),
        title: 'Maître des quiz',
        description: 'Obtenez un score parfait à un quiz',
        icon: '🏆',
        points: 500,
        rarity: 'legendary',
        requirements: JSON.stringify({ type: 'perfect_quiz_score', count: 1 })
      },
      {
        id: uuidv4(),
        title: 'Série de victoires',
        description: 'Terminez 5 leçons consécutives',
        icon: '🔥',
        points: 300,
        rarity: 'epic',
        requirements: JSON.stringify({ type: 'consecutive_lessons', count: 5 })
      },
      {
        id: uuidv4(),
        title: 'Explorateur',
        description: 'Découvrez 3 matières différentes',
        icon: '🗺️',
        points: 150,
        rarity: 'rare',
        requirements: JSON.stringify({ type: 'subjects_explored', count: 3 })
      }
    ];

    for (const achievement of achievements) {
      await query(
        'INSERT INTO achievements (id, title, description, icon, points, rarity, requirements) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [achievement.id, achievement.title, achievement.description, achievement.icon, achievement.points, achievement.rarity, achievement.requirements]
      );
    }
    logger.info('✅ Succès créés');

    // 5. Mise à jour du nombre de leçons par matière
    await query('UPDATE subjects SET total_lessons = (SELECT COUNT(*) FROM lessons WHERE subject_id = subjects.id)');
    logger.info('✅ Compteurs de leçons mis à jour');

    logger.info('🎉 Seeding terminé avec succès !');
    process.exit(0);
  } catch (error) {
    console.error('❌ Erreur lors du seeding:', error);
    process.exit(1);
  }
};

// Exécution du script
if (require.main === module) {
  seedData();
}

module.exports = { seedData };
