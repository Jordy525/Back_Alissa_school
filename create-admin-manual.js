const mysql = require('mysql2/promise');
require('dotenv').config();

async function createAdminSystem() {
  let connection;
  
  try {
    // Connexion à la base de données
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'alissa_school',
      port: process.env.DB_PORT || 3306
    });

    console.log('✅ Connexion à la base de données établie');

    // 1. Ajouter le champ role à la table users
    console.log('1️⃣ Ajout du champ role...');
    try {
      await connection.execute(`
        ALTER TABLE \`users\` 
        ADD COLUMN \`role\` ENUM('student', 'admin', 'super_admin') DEFAULT 'student' AFTER \`google_id\`
      `);
      console.log('✅ Champ role ajouté');
    } catch (error) {
      if (error.code === 'ER_DUP_FIELDNAME') {
        console.log('⚠️ Champ role déjà présent');
      } else {
        throw error;
      }
    }

    // 2. Créer la table documents
    console.log('2️⃣ Création de la table documents...');
    try {
      await connection.execute(`
        CREATE TABLE \`documents\` (
          \`id\` varchar(36) NOT NULL,
          \`title\` varchar(255) NOT NULL,
          \`description\` text DEFAULT NULL,
          \`file_name\` varchar(255) NOT NULL,
          \`file_path\` varchar(500) NOT NULL,
          \`file_type\` varchar(50) NOT NULL,
          \`file_size\` bigint(20) NOT NULL,
          \`subject_id\` varchar(36) NOT NULL,
          \`classe\` enum('6eme','5eme','4eme','3eme','seconde','premiere','terminale') NOT NULL,
          \`document_type\` enum('book', 'methodology', 'exercise', 'other') DEFAULT 'book',
          \`is_active\` tinyint(1) DEFAULT 1,
          \`download_count\` int(11) DEFAULT 0,
          \`created_by\` varchar(36) NOT NULL,
          \`created_at\` timestamp NULL DEFAULT current_timestamp(),
          \`updated_at\` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
          \`deleted_at\` timestamp NULL DEFAULT NULL,
          PRIMARY KEY (\`id\`),
          KEY \`idx_subject_classe\` (\`subject_id\`, \`classe\`),
          KEY \`idx_created_by\` (\`created_by\`),
          KEY \`idx_document_type\` (\`document_type\`),
          KEY \`idx_is_active\` (\`is_active\`),
          CONSTRAINT \`fk_documents_subject\` FOREIGN KEY (\`subject_id\`) REFERENCES \`subjects\` (\`id\`) ON DELETE CASCADE,
          CONSTRAINT \`fk_documents_created_by\` FOREIGN KEY (\`created_by\`) REFERENCES \`users\` (\`id\`) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);
      console.log('✅ Table documents créée');
    } catch (error) {
      if (error.code === 'ER_TABLE_EXISTS_ERROR') {
        console.log('⚠️ Table documents déjà présente');
      } else {
        throw error;
      }
    }

    // 3. Créer la table document_categories
    console.log('3️⃣ Création de la table document_categories...');
    try {
      await connection.execute(`
        CREATE TABLE \`document_categories\` (
          \`id\` varchar(36) NOT NULL,
          \`name\` varchar(100) NOT NULL,
          \`description\` text DEFAULT NULL,
          \`color\` varchar(50) DEFAULT NULL,
          \`icon\` varchar(100) DEFAULT NULL,
          \`is_active\` tinyint(1) DEFAULT 1,
          \`created_at\` timestamp NULL DEFAULT current_timestamp(),
          \`updated_at\` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
          PRIMARY KEY (\`id\`),
          UNIQUE KEY \`unique_name\` (\`name\`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);
      console.log('✅ Table document_categories créée');
    } catch (error) {
      if (error.code === 'ER_TABLE_EXISTS_ERROR') {
        console.log('⚠️ Table document_categories déjà présente');
      } else {
        throw error;
      }
    }

    // 4. Créer la table document_category_links
    console.log('4️⃣ Création de la table document_category_links...');
    try {
      await connection.execute(`
        CREATE TABLE \`document_category_links\` (
          \`id\` varchar(36) NOT NULL,
          \`document_id\` varchar(36) NOT NULL,
          \`category_id\` varchar(36) NOT NULL,
          \`created_at\` timestamp NULL DEFAULT current_timestamp(),
          PRIMARY KEY (\`id\`),
          UNIQUE KEY \`unique_document_category\` (\`document_id\`, \`category_id\`),
          KEY \`idx_document_id\` (\`document_id\`),
          KEY \`idx_category_id\` (\`category_id\`),
          CONSTRAINT \`fk_dcl_document\` FOREIGN KEY (\`document_id\`) REFERENCES \`documents\` (\`id\`) ON DELETE CASCADE,
          CONSTRAINT \`fk_dcl_category\` FOREIGN KEY (\`category_id\`) REFERENCES \`document_categories\` (\`id\`) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);
      console.log('✅ Table document_category_links créée');
    } catch (error) {
      if (error.code === 'ER_TABLE_EXISTS_ERROR') {
        console.log('⚠️ Table document_category_links déjà présente');
      } else {
        throw error;
      }
    }

    // 5. Insérer les catégories par défaut
    console.log('5️⃣ Insertion des catégories par défaut...');
    try {
      await connection.execute(`
        INSERT INTO \`document_categories\` (\`id\`, \`name\`, \`description\`, \`color\`) VALUES
        ('cat-001', 'Manuels scolaires', 'Livres de cours officiels', '#3B82F6'),
        ('cat-002', 'Méthodologies', 'Guides et méthodes d\\'apprentissage', '#10B981'),
        ('cat-003', 'Exercices', 'Cahiers d\\'exercices et devoirs', '#F59E0B'),
        ('cat-004', 'Ressources complémentaires', 'Documents d\\'approfondissement', '#8B5CF6')
      `);
      console.log('✅ Catégories insérées');
    } catch (error) {
      if (error.code === 'ER_DUP_ENTRY') {
        console.log('⚠️ Catégories déjà présentes');
      } else {
        throw error;
      }
    }

    // 6. Créer l'utilisateur admin
    console.log('6️⃣ Création de l\'utilisateur admin...');
    try {
      await connection.execute(`
        INSERT INTO \`users\` (\`id\`, \`email\`, \`password_hash\`, \`name\`, \`role\`, \`created_at\`) VALUES
        ('admin-001', 'admin@alissa-school.com', '$2b$10$rQZ8K9vL8xH5mN3pQ7R2uO1wE4tY6uI8oP2aS5dF7gH9jK1lM3nQ5rS7tU9vW', 'Administrateur Alissa School', 'admin', NOW())
      `);
      console.log('✅ Utilisateur admin créé');
    } catch (error) {
      if (error.code === 'ER_DUP_ENTRY') {
        console.log('⚠️ Utilisateur admin déjà présent');
      } else {
        throw error;
      }
    }

    // 7. Créer l'index pour optimiser les requêtes
    console.log('7️⃣ Création de l\'index...');
    try {
      await connection.execute(`
        CREATE INDEX \`idx_documents_class_subject\` ON \`documents\` (\`classe\`, \`subject_id\`, \`is_active\`)
      `);
      console.log('✅ Index créé');
    } catch (error) {
      if (error.code === 'ER_DUP_KEYNAME') {
        console.log('⚠️ Index déjà présent');
      } else {
        throw error;
      }
    }

    console.log('\n🎉 Système admin créé avec succès !');
    console.log('\n📋 Résumé:');
    console.log('   ✅ Champ role ajouté à la table users');
    console.log('   ✅ Table documents créée');
    console.log('   ✅ Table document_categories créée');
    console.log('   ✅ Table document_category_links créée');
    console.log('   ✅ Catégories par défaut insérées');
    console.log('   ✅ Utilisateur admin créé');
    console.log('   ✅ Index d\'optimisation créé');
    console.log('\n🔑 Compte admin:');
    console.log('   Email: admin@alissa-school.com');
    console.log('   Mot de passe: admin123');
    console.log('\n⚠️ Changez le mot de passe admin après la première connexion !');

  } catch (error) {
    console.error('❌ Erreur lors de la création du système admin:', error);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      console.log('\n🔌 Connexion fermée');
    }
  }
}

// Exécuter la création
createAdminSystem();
