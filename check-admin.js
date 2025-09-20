const { query } = require('./config/database');

async function checkAdmin() {
  try {
    console.log('🔍 Vérification de l\'utilisateur admin...');
    
    // Vérifier si l'utilisateur admin existe
    const admin = await query('SELECT id, email, name, role, password_hash FROM users WHERE email = ?', ['admin@alissa-school.com']);
    
    if (admin.length > 0) {
      console.log('✅ Utilisateur admin trouvé:');
      console.log(`   ID: ${admin[0].id}`);
      console.log(`   Email: ${admin[0].email}`);
      console.log(`   Nom: ${admin[0].name}`);
      console.log(`   Rôle: ${admin[0].role || 'student'}`);
      console.log(`   Mot de passe hashé: ${admin[0].password_hash ? 'Oui' : 'Non'}`);
      
      // Vérifier le hash du mot de passe
      if (admin[0].password_hash === '$2a$12$vEMYb7V1e1mbAk3wZHN2x.Dm0ISGeVZ/5GvMaeXHo0KsJPfspJdYK') {
        console.log('✅ Hash du mot de passe correct (admin123)');
      } else {
        console.log('❌ Hash du mot de passe incorrect');
        console.log(`   Hash actuel: ${admin[0].password_hash}`);
        console.log('   Hash attendu: $2a$12$vEMYb7V1e1mbAk3wZHN2x.Dm0ISGeVZ/5GvMaeXHo0KsJPfspJdYK');
      }
    } else {
      console.log('❌ Utilisateur admin non trouvé');
    }
    
    // Vérifier tous les utilisateurs avec un rôle admin
    console.log('\n🔍 Tous les utilisateurs admin:');
    const allAdmins = await query('SELECT email, name, role FROM users WHERE role IN ("admin", "super_admin")');
    
    if (allAdmins.length > 0) {
      allAdmins.forEach(user => {
        console.log(`   - ${user.email} (${user.name}) - Rôle: ${user.role}`);
      });
    } else {
      console.log('   Aucun utilisateur admin trouvé');
    }
    
  } catch (error) {
    console.error('❌ Erreur:', error);
  }
}

checkAdmin();
