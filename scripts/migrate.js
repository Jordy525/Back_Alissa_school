const { connectDB, query } = require('../config/database');
const logger = require('../config/logger');

// Script de migration pour créer toutes les tables
const createTables = async () => {
  try {
    await connectDB();
    logger.info('🚀 Début de la migration de la base de données...');

    // Table des utilisateurs
    await query(`
      CREATE TABLE IF NOT EXISTS users (
        id VARCHAR(36) PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255),
        name VARCHAR(255) NOT NULL,
        avatar_url VARCHAR(500),
        selected_class ENUM('6ème', '5ème', '4ème', '3ème', '2nde', '1ère', 'Terminale'),
        total_points INT DEFAULT 0,
        level INT DEFAULT 1,
        google_id VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        last_login_at TIMESTAMP,
        deleted_at TIMESTAMP NULL,
        INDEX idx_email (email),
        INDEX idx_google_id (google_id),
        INDEX idx_selected_class (selected_class)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    logger.info('✅ Table users créée');

    // Table des matières
    await query(`
      CREATE TABLE IF NOT EXISTS subjects (
        id VARCHAR(36) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        icon VARCHAR(100),
        color VARCHAR(50),
        class_levels JSON,
        total_lessons INT DEFAULT 0,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_name (name),
        INDEX idx_is_active (is_active)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    logger.info('✅ Table subjects créée');

    // Table des leçons
    await query(`
      CREATE TABLE IF NOT EXISTS lessons (
        id VARCHAR(36) PRIMARY KEY,
        subject_id VARCHAR(36) NOT NULL,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        content LONGTEXT,
        estimated_duration INT,
        difficulty ENUM('easy', 'medium', 'hard'),
        points_reward INT DEFAULT 25,
        order_index INT,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE,
        INDEX idx_subject_id (subject_id),
        INDEX idx_difficulty (difficulty),
        INDEX idx_order_index (order_index),
        INDEX idx_is_active (is_active)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    logger.info('✅ Table lessons créée');

    // Table des quiz
    await query(`
      CREATE TABLE IF NOT EXISTS quizzes (
        id VARCHAR(36) PRIMARY KEY,
        lesson_id VARCHAR(36),
        subject_id VARCHAR(36) NOT NULL,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        questions JSON,
        time_limit INT,
        passing_score INT DEFAULT 250,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (lesson_id) REFERENCES lessons(id) ON DELETE SET NULL,
        FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE,
        INDEX idx_lesson_id (lesson_id),
        INDEX idx_subject_id (subject_id),
        INDEX idx_is_active (is_active)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    logger.info('✅ Table quizzes créée');

    // Table des tentatives de quiz
    await query(`
      CREATE TABLE IF NOT EXISTS quiz_attempts (
        id VARCHAR(36) PRIMARY KEY,
        quiz_id VARCHAR(36) NOT NULL,
        user_id VARCHAR(36) NOT NULL,
        score INT NOT NULL,
        total_questions INT NOT NULL,
        correct_answers INT NOT NULL,
        time_spent INT,
        answers JSON,
        points_earned INT,
        completed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (quiz_id) REFERENCES quizzes(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        INDEX idx_quiz_id (quiz_id),
        INDEX idx_user_id (user_id),
        INDEX idx_completed_at (completed_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    logger.info('✅ Table quiz_attempts créée');

    // Table du progrès utilisateur
    await query(`
      CREATE TABLE IF NOT EXISTS user_progress (
        id VARCHAR(36) PRIMARY KEY,
        user_id VARCHAR(36) NOT NULL,
        subject_id VARCHAR(36) NOT NULL,
        lessons_completed INT DEFAULT 0,
        quizzes_completed INT DEFAULT 0,
        total_points INT DEFAULT 0,
        current_streak INT DEFAULT 0,
        longest_streak INT DEFAULT 0,
        last_activity_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE,
        UNIQUE KEY unique_user_subject (user_id, subject_id),
        INDEX idx_user_id (user_id),
        INDEX idx_subject_id (subject_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    logger.info('✅ Table user_progress créée');

    // Table des succès
    await query(`
      CREATE TABLE IF NOT EXISTS achievements (
        id VARCHAR(36) PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        description TEXT NOT NULL,
        icon VARCHAR(100),
        points INT NOT NULL,
        rarity ENUM('common', 'rare', 'epic', 'legendary'),
        requirements JSON,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_rarity (rarity),
        INDEX idx_is_active (is_active)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    logger.info('✅ Table achievements créée');

    // Table des succès utilisateur
    await query(`
      CREATE TABLE IF NOT EXISTS user_achievements (
        id VARCHAR(36) PRIMARY KEY,
        user_id VARCHAR(36) NOT NULL,
        achievement_id VARCHAR(36) NOT NULL,
        unlocked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (achievement_id) REFERENCES achievements(id) ON DELETE CASCADE,
        UNIQUE KEY unique_user_achievement (user_id, achievement_id),
        INDEX idx_user_id (user_id),
        INDEX idx_achievement_id (achievement_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    logger.info('✅ Table user_achievements créée');

    // Table des sessions de chat
    await query(`
      CREATE TABLE IF NOT EXISTS chat_sessions (
        id VARCHAR(36) PRIMARY KEY,
        user_id VARCHAR(36) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        INDEX idx_user_id (user_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    logger.info('✅ Table chat_sessions créée');

    // Table des messages de chat
    await query(`
      CREATE TABLE IF NOT EXISTS chat_messages (
        id VARCHAR(36) PRIMARY KEY,
        session_id VARCHAR(36) NOT NULL,
        role ENUM('user', 'assistant') NOT NULL,
        content LONGTEXT NOT NULL,
        context_data JSON,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (session_id) REFERENCES chat_sessions(id) ON DELETE CASCADE,
        INDEX idx_session_id (session_id),
        INDEX idx_created_at (created_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    logger.info('✅ Table chat_messages créée');

    // Table des leçons terminées par l'utilisateur
    await query(`
      CREATE TABLE IF NOT EXISTS user_lessons (
        id VARCHAR(36) PRIMARY KEY,
        user_id VARCHAR(36) NOT NULL,
        lesson_id VARCHAR(36) NOT NULL,
        completed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        points_earned INT DEFAULT 0,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (lesson_id) REFERENCES lessons(id) ON DELETE CASCADE,
        UNIQUE KEY unique_user_lesson (user_id, lesson_id),
        INDEX idx_user_id (user_id),
        INDEX idx_lesson_id (lesson_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    logger.info('✅ Table user_lessons créée');

    logger.info('🎉 Migration terminée avec succès !');
    process.exit(0);
  } catch (error) {
    logger.error('❌ Erreur lors de la migration:', error);
    process.exit(1);
  }
};

// Exécution du script
if (require.main === module) {
  createTables();
}

module.exports = { createTables };
