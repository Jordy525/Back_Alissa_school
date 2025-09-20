const { query } = require('./config/database');

async function testAdminLogin() {
  try {
    console.log('🔍 Test de la connexion admin...');
    
    // 1. Vérifier que l'utilisateur admin existe
    const admin = await query('SELECT id, email, name, role FROM users WHERE email = ?', ['admin@alissa-school.com']);
    
    if (admin.length === 0) {
      console.log('❌ Utilisateur admin non trouvé. Création en cours...');
      
      // Créer l'admin
      const adminId = 'admin-' + Date.now();
      const hashedPassword = '$2a$12$vEMYb7V1e1mbAk3wZHN2x.Dm0ISGeVZ/5GvMaeXHo0KsJPfspJdYK';
      
      await query(`
        INSERT INTO users (id, email, name, password_hash, classe, role, total_points, level, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())
      `, [adminId, 'admin@alissa-school.com', 'Administrateur Alissa', hashedPassword, '6eme', 'admin', 0, 1]);
      
      console.log('✅ Utilisateur admin créé');
    } else {
      console.log('✅ Utilisateur admin trouvé:');
      console.log(`   Email: ${admin[0].email}`);
      console.log(`   Nom: ${admin[0].name}`);
      console.log(`   Rôle: ${admin[0].role || 'student'}`);
      
      // Mettre à jour le rôle si nécessaire
      if (!admin[0].role || admin[0].role === 'student') {
        await query('UPDATE users SET role = "admin" WHERE email = ?', ['admin@alissa-school.com']);
        console.log('✅ Rôle mis à jour vers admin');
      }
    }
    
    // 2. Tester la requête de login (simuler ce que fait l'API)
    console.log('\n🔍 Test de la requête de login...');
    const loginQuery = await query(
      'SELECT id, email, password_hash, name, avatar_url, selected_class, total_points, level, role, created_at FROM users WHERE email = ? AND deleted_at IS NULL',
      ['admin@alissa-school.com']
    );
    
    if (loginQuery.length > 0) {
      const user = loginQuery[0];
      console.log('✅ Requête de login réussie:');
      console.log(`   ID: ${user.id}`);
      console.log(`   Email: ${user.email}`);
      console.log(`   Nom: ${user.name}`);
      console.log(`   Rôle: ${user.role || 'student'}`);
      console.log(`   Classe: ${user.classe || 'N/A'}`);
      console.log(`   Matières: ${user.matieres || 'N/A'}`);
      
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
    
    console.log('\n🎉 Test terminé !');
    console.log('\n📝 Instructions:');
    console.log('1. Redéployez le backend sur Render');
    console.log('2. Connectez-vous avec admin@alissa-school.com / admin123');
    console.log('3. Vous devriez être redirigé vers /admin/documents');
    
  } catch (error) {
    console.error('❌ Erreur lors du test:', error);
  }
}

testAdminLogin();
