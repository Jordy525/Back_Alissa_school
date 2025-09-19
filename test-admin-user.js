// Test pour vérifier l'utilisateur admin
const { query } = require('./config/database');
require('dotenv').config();

async function testAdminUser() {
  try {
    console.log('🔍 Vérification de l\'utilisateur admin...');
    
    // 1. Vérifier si la colonne role existe
    console.log('\n1. Vérification de la colonne role...');
    try {
      const columns = await query('DESCRIBE users');
      const hasRoleColumn = columns.some(col => col.Field === 'role');
      
      if (!hasRoleColumn) {
        console.log('❌ Colonne "role" manquante. Ajout en cours...');
        await query('ALTER TABLE users ADD COLUMN role ENUM("student", "teacher", "admin", "super_admin") DEFAULT "student" AFTER classe');
        console.log('✅ Colonne "role" ajoutée');
      } else {
        console.log('✅ Colonne "role" existe');
      }
    } catch (error) {
      console.log('❌ Erreur lors de la vérification de la colonne role:', error.message);
    }
    
    // 2. Vérifier les utilisateurs admin existants
    console.log('\n2. Vérification des utilisateurs admin...');
    const adminUsers = await query('SELECT id, email, name, role FROM users WHERE role IN ("admin", "super_admin")');
    
    if (adminUsers.length === 0) {
      console.log('❌ Aucun utilisateur admin trouvé');
      console.log('\n📝 Création d\'un utilisateur admin...');
      
      // Créer un utilisateur admin
      const adminId = require('uuid').v4();
      const hashedPassword = '$2a$12$vEMYb7V1e1mbAk3wZHN2x.Dm0ISGeVZ/5GvMaeXHo0KsJPfspJdYK'; // admin123
      
      await query(`
        INSERT INTO users (
          id, email, name, password_hash, classe, role, total_points, level, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())
      `, [
        adminId,
        'admin@alissa-school.com',
        'Administrateur Alissa',
        hashedPassword,
        '6eme',
        'admin',
        0,
        1
      ]);
      
      console.log('✅ Utilisateur admin créé avec succès');
      console.log('   Email: admin@alissa-school.com');
      console.log('   Mot de passe: admin123');
    } else {
      console.log(`✅ ${adminUsers.length} utilisateur(s) admin trouvé(s):`);
      adminUsers.forEach(user => {
        console.log(`   - ${user.email} (${user.name}) - Rôle: ${user.role}`);
      });
    }
    
    // 3. Vérifier la connexion
    console.log('\n3. Test de connexion...');
    const testUser = await query('SELECT id, email, name, role, password_hash FROM users WHERE email = ?', ['admin@alissa-school.com']);
    
    if (testUser.length > 0) {
      const user = testUser[0];
      console.log('✅ Utilisateur trouvé:');
      console.log(`   ID: ${user.id}`);
      console.log(`   Email: ${user.email}`);
      console.log(`   Nom: ${user.name}`);
      console.log(`   Rôle: ${user.role}`);
      console.log(`   Mot de passe hashé: ${user.password_hash ? 'Oui' : 'Non'}`);
    } else {
      console.log('❌ Utilisateur admin non trouvé');
    }
    
    // 4. Vérifier les tables de documents
    console.log('\n4. Vérification des tables de documents...');
    const tables = ['documents', 'document_categories', 'document_downloads'];
    
    for (const table of tables) {
      try {
        const result = await query(`SELECT COUNT(*) as count FROM ${table}`);
        console.log(`✅ Table ${table}: ${result[0].count} enregistrements`);
      } catch (error) {
        console.log(`❌ Table ${table} n'existe pas: ${error.message}`);
      }
    }
    
    console.log('\n🎉 Test terminé !');
    console.log('\n📝 Instructions:');
    console.log('1. Redéployez le backend avec les corrections CORS');
    console.log('2. Connectez-vous avec admin@alissa-school.com / admin123');
    console.log('3. Accédez à /admin/documents pour gérer les documents');
    
  } catch (error) {
    console.error('❌ Erreur lors du test:', error);
  }
}

// Exécuter le test
testAdminUser();
