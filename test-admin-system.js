const mysql = require('mysql2/promise');
require('dotenv').config();

async function testAdminSystem() {
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

    console.log('🧪 Test du système admin...\n');

    // Test 1: Vérifier la structure de la table users
    console.log('1️⃣ Test de la structure de la table users...');
    const [userColumns] = await connection.execute('DESCRIBE users');
    const hasRoleColumn = userColumns.some(col => col.Field === 'role');
    console.log(hasRoleColumn ? '✅ Champ "role" présent' : '❌ Champ "role" manquant');

    // Test 2: Vérifier la table documents
    console.log('\n2️⃣ Test de la table documents...');
    try {
      const [documents] = await connection.execute('SELECT COUNT(*) as count FROM documents');
      console.log('✅ Table "documents" accessible');
      console.log(`   Nombre de documents: ${documents[0].count}`);
    } catch (error) {
      console.log('❌ Table "documents" non accessible:', error.message);
    }

    // Test 3: Vérifier la table document_categories
    console.log('\n3️⃣ Test de la table document_categories...');
    try {
      const [categories] = await connection.execute('SELECT COUNT(*) as count FROM document_categories');
      console.log('✅ Table "document_categories" accessible');
      console.log(`   Nombre de catégories: ${categories[0].count}`);
    } catch (error) {
      console.log('❌ Table "document_categories" non accessible:', error.message);
    }

    // Test 4: Vérifier l'utilisateur admin
    console.log('\n4️⃣ Test de l\'utilisateur admin...');
    try {
      const [adminUsers] = await connection.execute(
        'SELECT id, email, name, role FROM users WHERE role = "admin"'
      );
      if (adminUsers.length > 0) {
        console.log('✅ Utilisateur admin trouvé:');
        adminUsers.forEach(user => {
          console.log(`   - ${user.name} (${user.email}) - Rôle: ${user.role}`);
        });
      } else {
        console.log('❌ Aucun utilisateur admin trouvé');
      }
    } catch (error) {
      console.log('❌ Erreur lors de la recherche de l\'utilisateur admin:', error.message);
    }

    // Test 5: Vérifier les rôles des utilisateurs
    console.log('\n5️⃣ Test des rôles utilisateurs...');
    try {
      const [roleStats] = await connection.execute(`
        SELECT role, COUNT(*) as count 
        FROM users 
        WHERE deleted_at IS NULL 
        GROUP BY role
      `);
      console.log('✅ Statistiques des rôles:');
      roleStats.forEach(stat => {
        console.log(`   - ${stat.role || 'student'}: ${stat.count} utilisateur(s)`);
      });
    } catch (error) {
      console.log('❌ Erreur lors de la vérification des rôles:', error.message);
    }

    // Test 6: Vérifier les contraintes de clés étrangères
    console.log('\n6️⃣ Test des contraintes de clés étrangères...');
    try {
      const [constraints] = await connection.execute(`
        SELECT 
          CONSTRAINT_NAME,
          TABLE_NAME,
          COLUMN_NAME,
          REFERENCED_TABLE_NAME,
          REFERENCED_COLUMN_NAME
        FROM information_schema.KEY_COLUMN_USAGE 
        WHERE REFERENCED_TABLE_SCHEMA = ? 
        AND TABLE_NAME IN ('documents', 'document_category_links')
      `, [process.env.DB_NAME || 'alissa_school']);
      
      if (constraints.length > 0) {
        console.log('✅ Contraintes de clés étrangères trouvées:');
        constraints.forEach(constraint => {
          console.log(`   - ${constraint.TABLE_NAME}.${constraint.COLUMN_NAME} -> ${constraint.REFERENCED_TABLE_NAME}.${constraint.REFERENCED_COLUMN_NAME}`);
        });
      } else {
        console.log('⚠️ Aucune contrainte de clé étrangère trouvée');
      }
    } catch (error) {
      console.log('❌ Erreur lors de la vérification des contraintes:', error.message);
    }

    console.log('\n🎉 Tests terminés !');
    console.log('\n📋 Prochaines étapes:');
    console.log('   1. Démarrer le serveur backend: npm start');
    console.log('   2. Démarrer le frontend: npm run dev');
    console.log('   3. Se connecter avec admin@alissa-school.com / admin123');
    console.log('   4. Accéder au tableau de bord admin');

  } catch (error) {
    console.error('❌ Erreur lors des tests:', error);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      console.log('\n🔌 Connexion fermée');
    }
  }
}

// Exécuter les tests
testAdminSystem();
