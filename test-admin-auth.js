const { query, connectDB } = require('./config/database');

async function testAdminAuth() {
  try {
    console.log('🔍 Test de l\'authentification admin...\n');
    
    await connectDB();
    console.log('✅ Connexion à la base de données établie\n');

    // 1. Lister tous les utilisateurs
    console.log('📋 Liste des utilisateurs:');
    const users = await query('SELECT id, email, name FROM users LIMIT 5');
    users.forEach(user => {
      console.log(`   - ${user.name} (${user.email}) - ID: ${user.id}`);
    });
    console.log('');

    // 2. Lister tous les admins
    console.log('👑 Liste des administrateurs:');
    const admins = await query(`
      SELECT 
        a.id, a.user_id, a.email, a.created_at,
        u.name, u.avatar_url
      FROM admins a
      LEFT JOIN users u ON a.user_id = u.id
      ORDER BY a.created_at DESC
    `);
    
    if (admins.length === 0) {
      console.log('   ⚠️  Aucun administrateur trouvé');
      console.log('   💡 Utilisez: npm run add-admin <email> pour ajouter un admin');
    } else {
      admins.forEach(admin => {
        console.log(`   - ${admin.name || 'Nom non disponible'} (${admin.email}) - Admin ID: ${admin.id}`);
      });
    }
    console.log('');

    // 3. Test de vérification admin pour chaque utilisateur
    console.log('🔐 Test de vérification admin:');
    for (const user of users.slice(0, 3)) { // Tester seulement les 3 premiers
      const adminCheck = await query(
        'SELECT id FROM admins WHERE user_id = ? OR email = ?',
        [user.id, user.email]
      );
      
      const isAdmin = adminCheck.length > 0;
      const status = isAdmin ? '👑 ADMIN' : '👤 STUDENT';
      console.log(`   - ${user.name} (${user.email}): ${status}`);
    }
    console.log('');

    console.log('✅ Test terminé avec succès!');
    
  } catch (error) {
    console.error('❌ Erreur lors du test:', error);
  } finally {
    process.exit(0);
  }
}

testAdminAuth();