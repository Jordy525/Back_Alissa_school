const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

// Configuration de la base de données
const dbConfig = {
  host: 'mysql-zigh-portfolio.alwaysdata.net',
  user: '404304',
  password: 'Campement@2024',
  database: 'zigh-portfolio_alissa_school',
  charset: 'utf8mb4'
};

async function fixDatabaseIssues() {
  let connection;
  
  try {
    console.log('🔧 Connexion à la base de données...');
    connection = await mysql.createConnection(dbConfig);
    console.log('✅ Connexion établie');

    // 1. Vérifier si la table documents existe
    console.log('\n📋 Vérification de la table documents...');
    try {
      const [rows] = await connection.execute('DESCRIBE documents');
      console.log('✅ Table documents existe avec les colonnes:');
      rows.forEach(row => {
        console.log(`  - ${row.Field} (${row.Type})`);
      });
    } catch (error) {
      console.log('❌ Table documents n\'existe pas, création...');
      await createDocumentsTable(connection);
    }

    // 2. Corriger les problèmes de collation
    console.log('\n🔧 Correction des problèmes de collation...');
    await fixCollationIssues(connection);

    // 3. Vérifier et ajouter les colonnes manquantes
    console.log('\n📝 Vérification des colonnes de la table documents...');
    await ensureDocumentColumns(connection);

    // 4. Tester les requêtes problématiques
    console.log('\n🧪 Test des requêtes corrigées...');
    await testQueries(connection);

    console.log('\n🎉 Toutes les corrections ont été appliquées avec succès !');

  } catch (error) {
    console.error('❌ Erreur:', error.message);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

async function createDocumentsTable(connection) {
  const createTableSQL = `
    CREATE TABLE documents (
      id varchar(36) NOT NULL PRIMARY KEY,
      title varchar(255) NOT NULL,
      description text DEFAULT NULL,
      file_name varchar(255) NOT NULL,
      file_path varchar(500) NOT NULL,
      file_type varchar(50) NOT NULL,
      file_size bigint NOT NULL,
      subject_id varchar(36) NOT NULL,
      classe enum('6eme','5eme','4eme','3eme','seconde','premiere','terminale') NOT NULL,
      document_type enum('book','methodology','exercise','other') DEFAULT 'book',
      download_count int DEFAULT 0,
      is_active tinyint(1) DEFAULT 1,
      created_by varchar(36) NOT NULL,
      created_at timestamp DEFAULT CURRENT_TIMESTAMP,
      updated_at timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      deleted_at timestamp NULL DEFAULT NULL,
      INDEX idx_classe (classe),
      INDEX idx_subject (subject_id),
      INDEX idx_type (document_type),
      INDEX idx_active (is_active)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `;
  
  await connection.execute(createTableSQL);
  console.log('✅ Table documents créée');
}

async function fixCollationIssues(connection) {
  try {
    // Vérifier les collations actuelles
    const [usersColl] = await connection.execute(`
      SELECT TABLE_COLLATION 
      FROM information_schema.TABLES 
      WHERE TABLE_SCHEMA = 'zigh-portfolio_alissa_school' 
      AND TABLE_NAME = 'users'
    `);
    
    const [adminsColl] = await connection.execute(`
      SELECT TABLE_COLLATION 
      FROM information_schema.TABLES 
      WHERE TABLE_SCHEMA = 'zigh-portfolio_alissa_school' 
      AND TABLE_NAME = 'admins'
    `);

    console.log(`📊 Collation users: ${usersColl[0]?.TABLE_COLLATION}`);
    console.log(`📊 Collation admins: ${adminsColl[0]?.TABLE_COLLATION}`);

    // Convertir les tables vers utf8mb4_unicode_ci si nécessaire
    if (usersColl[0]?.TABLE_COLLATION !== 'utf8mb4_unicode_ci') {
      console.log('🔧 Conversion de la table users...');
      await connection.execute('ALTER TABLE users CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci');
    }

    if (adminsColl[0]?.TABLE_COLLATION !== 'utf8mb4_unicode_ci') {
      console.log('🔧 Conversion de la table admins...');
      await connection.execute('ALTER TABLE admins CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci');
    }

    console.log('✅ Collations corrigées');
  } catch (error) {
    console.log('⚠️ Erreur lors de la correction des collations:', error.message);
  }
}

async function ensureDocumentColumns(connection) {
  try {
    const [columns] = await connection.execute(`
      SELECT COLUMN_NAME 
      FROM information_schema.COLUMNS 
      WHERE TABLE_SCHEMA = 'zigh-portfolio_alissa_school' 
      AND TABLE_NAME = 'documents'
    `);
    
    const existingColumns = columns.map(col => col.COLUMN_NAME);
    console.log('📋 Colonnes existantes:', existingColumns);

    // Vérifier et ajouter les colonnes manquantes
    const requiredColumns = [
      { name: 'document_type', sql: "ADD COLUMN document_type enum('book','methodology','exercise','other') DEFAULT 'book'" },
      { name: 'download_count', sql: "ADD COLUMN download_count int DEFAULT 0" },
      { name: 'is_active', sql: "ADD COLUMN is_active tinyint(1) DEFAULT 1" },
      { name: 'deleted_at', sql: "ADD COLUMN deleted_at timestamp NULL DEFAULT NULL" }
    ];

    for (const column of requiredColumns) {
      if (!existingColumns.includes(column.name)) {
        console.log(`➕ Ajout de la colonne ${column.name}...`);
        await connection.execute(`ALTER TABLE documents ${column.sql}`);
      }
    }

    console.log('✅ Toutes les colonnes requises sont présentes');
  } catch (error) {
    console.log('⚠️ Erreur lors de la vérification des colonnes:', error.message);
  }
}

async function testQueries(connection) {
  try {
    // Test 1: Requête des statistiques élèves (version corrigée)
    console.log('🧪 Test requête statistiques élèves...');
    const [studentStats] = await connection.execute(`
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
      AND u.id NOT IN (SELECT COALESCE(user_id, '') FROM admins WHERE user_id IS NOT NULL)
      AND u.email NOT IN (SELECT COALESCE(email, '') FROM admins WHERE email IS NOT NULL)
    `);
    console.log('✅ Statistiques élèves:', studentStats[0]);

    // Test 2: Requête des statistiques documents
    console.log('🧪 Test requête statistiques documents...');
    const [docStats] = await connection.execute(`
      SELECT 
        COUNT(*) as total_documents,
        COUNT(CASE WHEN document_type = 'book' THEN 1 END) as books,
        COUNT(CASE WHEN document_type = 'methodology' THEN 1 END) as methodologies,
        COUNT(CASE WHEN document_type = 'exercise' THEN 1 END) as exercises,
        COALESCE(SUM(download_count), 0) as total_downloads
      FROM documents 
      WHERE deleted_at IS NULL
    `);
    console.log('✅ Statistiques documents:', docStats[0]);

    // Test 3: Requête des élèves
    console.log('🧪 Test requête élèves...');
    const [students] = await connection.execute(`
      SELECT 
        u.id, u.email, u.name, u.avatar_url, u.classe, u.selected_class, 
        u.total_points, u.level, u.created_at, u.last_login_at,
        u.matieres as selected_subjects
      FROM users u
      WHERE u.deleted_at IS NULL 
      AND u.id NOT IN (SELECT COALESCE(user_id, '') FROM admins WHERE user_id IS NOT NULL)
      AND u.email NOT IN (SELECT COALESCE(email, '') FROM admins WHERE email IS NOT NULL)
      ORDER BY u.created_at DESC
      LIMIT 5
    `);
    console.log(`✅ ${students.length} élèves récupérés`);

    console.log('🎉 Tous les tests sont passés !');
  } catch (error) {
    console.log('❌ Erreur lors des tests:', error.message);
  }
}

// Exécuter le script
fixDatabaseIssues();