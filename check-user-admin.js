const { query, connectDB } = require('./config/database');

async function checkUserAdmin() {
  try {
    console.log('🔍 Vérification du statut admin pour Jude@gmail.com...\n');
    
    await connectDB();
    console.log('✅ Connexion à la base de données établie\n');

    const email = 'jude@gmail.com'; // Email en minuscules

    // 1. Vérifier si l'utilisateur existe
    console.log('👤 Recherche de l\'utilisateur...');
    const users = await query('SELECT id, email, name FROM users WHERE LOWER(email) = LOWER(?)', [email]);
    
    if (users.length === 0) {
      console.log(`❌ Aucun utilisateur trouvé avec l'email: ${email}`);
      process.exit(1);
    }

    const user = users[0];
    console.log(`✅ Utilisateur trouvé: ${user.name} (${user.email}) - ID: ${user.id}\n`);

    // 2. Vérifier si l'utilisateur est admin
    console.log('👑 Vérification du statut admin...');
    const admins = await query(
      'SELECT id FROM admins WHERE user_id = ? OR LOWER(email) = LOWER(?)',
      [user.id, user.email]
    );

    if (admins.length > 0) {
      console.log(`✅ L'utilisateur ${user.name} est déjà administrateur!`);
      console.log(`   Admin ID: ${admins[0].id}\n`);
    } else {
      console.log(`⚠️  L'utilisateur ${user.name} n'est PAS administrateur.`);
      console.log('💡 Ajout automatique en cours...\n');
      
      // Ajouter l'utilisateur comme admin
      const { v4: uuidv4 } = require('uuid');
      const adminId = uuidv4();
      
      await query(
        'INSERT INTO admins (id, user_id, email, created_at) VALUES (?, ?, ?, NOW())',
        [adminId, user.id, user.email]
      );
      
      console.log(`✅ Utilisateur ${user.name} ajouté comme administrateur!`);
      console.log(`   Nouvel Admin ID: ${adminId}\n`);
    }

    // 3. Test de vérification finale
    console.log('🔐 Test de vérification finale...');
    const finalCheck = await query(
      'SELECT id FROM admins WHERE user_id = ? OR LOWER(email) = LOWER(?)',
      [user.id, user.email]
    );
    
    const isAdmin = finalCheck.length > 0;
    const userRole = isAdmin ? 'admin' : 'student';
    
    console.log(`   - Utilisateur: ${user.name} (${user.email})`);
    console.log(`   - Statut: ${isAdmin ? '👑 ADMIN' : '👤 STUDENT'}`);
    console.log(`   - Rôle: ${userRole}`);
    console.log(`   - Redirection: ${isAdmin ? '/admin/dashboard' : '/dashboard'}\n`);

    console.log('✅ Vérification terminée! L\'utilisateur peut maintenant se connecter comme admin.');
    
  } catch (error) {
    console.error('❌ Erreur lors de la vérification:', error);
  } finally {
    process.exit(0);
  }
}

checkUserAdmin();