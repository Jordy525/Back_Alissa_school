// Script simple pour tester la création d'admin
const mysql = require('mysql2/promise');
require('dotenv').config();

async function createAdmin() {
  let connection;
  
  try {
    console.log('🔧 Création de l\'utilisateur admin...');
    
    // Connexion à la base de données
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'zigh-portfolio_alissa_school',
      port: process.env.DB_PORT || 3306
    });
    
    console.log('✅ Connexion à la base de données réussie');
    
    // 1. Ajouter la colonne role si elle n'existe pas
    try {
      await connection.execute('ALTER TABLE users ADD COLUMN role ENUM("student", "teacher", "admin", "super_admin") DEFAULT "student" AFTER classe');
      console.log('✅ Colonne "role" ajoutée');
    } catch (error) {
      if (error.message.includes('Duplicate column name')) {
        console.log('✅ Colonne "role" existe déjà');
      } else {
        throw error;
      }
    }
    
    // 2. Vérifier si l'admin existe
    const [existingAdmin] = await connection.execute('SELECT id, email, name, role FROM users WHERE email = ?', ['admin@alissa-school.com']);
    
    if (existingAdmin.length > 0) {
      console.log('✅ Utilisateur admin existe déjà:');
      console.log(`   Email: ${existingAdmin[0].email}`);
      console.log(`   Nom: ${existingAdmin[0].name}`);
      console.log(`   Rôle: ${existingAdmin[0].role || 'student'}`);
      
      // Mettre à jour le rôle si nécessaire
      if (!existingAdmin[0].role || existingAdmin[0].role === 'student') {
        await connection.execute('UPDATE users SET role = "admin" WHERE email = ?', ['admin@alissa-school.com']);
        console.log('✅ Rôle mis à jour vers admin');
      }
    } else {
      // 3. Créer l'utilisateur admin
      const adminId = 'admin-' + Date.now();
      const hashedPassword = '$2a$12$vEMYb7V1e1mbAk3wZHN2x.Dm0ISGeVZ/5GvMaeXHo0KsJPfspJdYK'; // admin123
      
      await connection.execute(`
        INSERT INTO users (id, email, name, password_hash, classe, role, total_points, level, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())
      `, [adminId, 'admin@alissa-school.com', 'Administrateur Alissa', hashedPassword, '6eme', 'admin', 0, 1]);
      
      console.log('✅ Utilisateur admin créé avec succès');
    }
    
    // 4. Tester la requête de login (simuler l'API)
    console.log('\n🔍 Test de la requête de login...');
    const [loginResult] = await connection.execute(
      'SELECT id, email, password_hash, name, avatar_url, selected_class, total_points, level, role, created_at FROM users WHERE email = ? AND deleted_at IS NULL',
      ['admin@alissa-school.com']
    );
    
    if (loginResult.length > 0) {
      const user = loginResult[0];
      console.log('✅ Requête de login réussie:');
      console.log(`   ID: ${user.id}`);
      console.log(`   Email: ${user.email}`);
      console.log(`   Nom: ${user.name}`);
      console.log(`   Rôle: ${user.role || 'student'}`);
      console.log(`   Classe: ${user.classe || 'N/A'}`);
      
      // Simuler la logique de redirection
      console.log('\n🎯 Test de la logique de redirection:');
      const userRole = user.role || 'student';
      
      if (userRole === 'admin' || userRole === 'super_admin') {
        console.log('✅ Redirection vers: /admin/documents');
      } else if (!user.classe || !user.matieres) {
        console.log('⚠️  Redirection vers: /choose-class (élève non configuré)');
      } else {
        console.log('⚠️  Redirection vers: /dashboard (élève configuré)');
      }
    } else {
      console.log('❌ Aucun utilisateur trouvé pour le login');
    }
    
    console.log('\n🎉 Test terminé avec succès !');
    console.log('\n📝 Instructions:');
    console.log('1. Redéployez le backend sur Render');
    console.log('2. Connectez-vous avec admin@alissa-school.com / admin123');
    console.log('3. Vous devriez être redirigé vers /admin/documents');
    
  } catch (error) {
    console.error('❌ Erreur lors du test:', error);
  } finally {
    if (connection) {
      await connection.end();
      console.log('\n🔌 Connexion fermée');
    }
  }
}

createAdmin();



