const { query, connectDB } = require('./config/database');

async function testAdminLogic() {
  try {
    console.log('🔍 Test de la logique admin...\n');
    
    await connectDB();
    console.log('✅ Connexion à la base de données établie\n');

    const email = 'jude@gmail.com';

    // 1. Récupérer l'utilisateur
    console.log('👤 Récupération de l\'utilisateur...');
    const users = await query(
      `SELECT id, name, email, phone_number, age_range, total_points, level, 
              classe, matieres, langue_gabonaise, created_at, last_login_at
       FROM users 
       WHERE LOWER(email) = LOWER(?) AND deleted_at IS NULL`,
      [email]
    );

    if (users.length === 0) {
      console.log(`❌ Utilisateur non trouvé: ${email}`);
      process.exit(1);
    }

    const user = users[0];
    console.log(`✅ Utilisateur trouvé: ${user.name} (${user.email})`);
    console.log(`   ID: ${user.id}`);
    console.log(`   Classe: ${user.classe}`);
    console.log(`   Matières: ${user.matieres ? JSON.parse(user.matieres).join(', ') : 'Aucune'}\n`);

    // 2. Vérifier le statut admin (même logique que dans frontend.js)
    console.log('👑 Vérification du statut admin...');
    let isAdmin = false;
    let userRole = 'student';
    
    try {
      const admins = await query(
        'SELECT id FROM admins WHERE user_id = ? OR email = ? LIMIT 1',
        [user.id, user.email]
      );
      isAdmin = admins.length > 0;
      userRole = isAdmin ? 'admin' : 'student';
      
      console.log('🔍 Résultats de la vérification admin:');
      console.log(`   - Requête SQL: SELECT id FROM admins WHERE user_id = '${user.id}' OR email = '${user.email}' LIMIT 1`);
      console.log(`   - Résultats trouvés: ${admins.length}`);
      console.log(`   - isAdmin: ${isAdmin}`);
      console.log(`   - userRole: ${userRole}`);
      
      if (admins.length > 0) {
        console.log(`   - Admin ID: ${admins[0].id}`);
      }
    } catch (e) {
      console.error('❌ Erreur vérification admin:', e);
      isAdmin = false;
      userRole = 'student';
    }

    // 3. Déterminer la redirection
    console.log('\n🔄 Détermination de la redirection...');
    let redirectPath = '/dashboard';
    
    if (isAdmin) {
      redirectPath = '/admin/dashboard';
    } else {
      if (!user.classe) {
        redirectPath = '/choose-class';
      } else {
        redirectPath = '/dashboard';
      }
    }

    console.log(`   - Redirection: ${redirectPath}`);

    // 4. Simuler la réponse de l'API
    console.log('\n📋 Réponse simulée de l\'API:');
    const responseData = {
      success: true,
      message: 'Connexion réussie',
      data: {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          phoneNumber: user.phone_number,
          ageRange: user.age_range,
          totalPoints: user.total_points,
          level: user.level,
          classe: user.classe,
          matieres: user.matieres ? JSON.parse(user.matieres) : [],
          langueGabonaise: user.langue_gabonaise,
          role: userRole, // ← C'est ça qui était manquant !
          isAdmin,
          isConnected: true,
          createdAt: user.created_at,
          lastLoginAt: user.last_login_at
        },
        token: 'jwt_token_here',
        redirectPath
      }
    };

    console.log(JSON.stringify(responseData, null, 2));

    // 5. Résumé
    console.log('\n📊 RÉSUMÉ:');
    console.log(`   👤 Utilisateur: ${user.name} (${user.email})`);
    console.log(`   🔑 Statut: ${isAdmin ? '👑 ADMIN' : '👤 STUDENT'}`);
    console.log(`   📝 Rôle retourné: ${userRole}`);
    console.log(`   🔄 Redirection: ${redirectPath}`);
    
    if (isAdmin && userRole === 'admin' && redirectPath === '/admin/dashboard') {
      console.log('\n🎉 SUCCÈS: La logique admin fonctionne correctement!');
      console.log('   L\'utilisateur sera redirigé vers le dashboard admin.');
    } else {
      console.log('\n⚠️  PROBLÈME: La logique admin ne fonctionne pas comme attendu.');
    }
    
  } catch (error) {
    console.error('❌ Erreur lors du test:', error);
  } finally {
    process.exit(0);
  }
}

testAdminLogic();