const { query, connectDB } = require('../config/database');
const bcrypt = require('bcryptjs');

async function testAdminLogin() {
  try {
    console.log('🔍 Test de connexion admin...\n');
    
    await connectDB();
    console.log('✅ Connexion à la base de données établie\n');

    // 1. Vérifier si l'utilisateur admin existe
    console.log('1. Vérification de l\'utilisateur admin...');
    const users = await query(
      'SELECT id, name, email, password_hash FROM users WHERE email = ? AND deleted_at IS NULL',
      ['admin@alissa-school.com']
    );
    
    if (users.length === 0) {
      console.log('❌ Utilisateur admin non trouvé!');
      
      // Créer l'utilisateur admin
      console.log('🔧 Création de l\'utilisateur admin...');
      const userId = require('uuid').v4();
      const passwordHash = await bcrypt.hash('admin123', 12);
      
      await query(
        `INSERT INTO users (id, name, email, password_hash, age_range, total_points, level, created_at) 
         VALUES (?, ?, ?, ?, ?, ?, ?, NOW())`,
        [userId, 'Administrateur Alissa', 'admin@alissa-school.com', passwordHash, '18+ ans', 0, 1]
      );
      
      console.log('✅ Utilisateur admin créé avec ID:', userId);
      
      // Vérifier si l'entrée admin existe
      const admins = await query('SELECT id FROM admins WHERE email = ?', ['admin@alissa-school.com']);
      if (admins.length === 0) {
        const adminId = require('uuid').v4();
        await query(
          'INSERT INTO admins (id, user_id, email, created_at) VALUES (?, ?, ?, NOW())',
          [adminId, userId, 'admin@alissa-school.com']
        );
        console.log('✅ Entrée admin créée avec ID:', adminId);
      }
    } else {
      const user = users[0];
      console.log('✅ Utilisateur admin trouvé:', {
        id: user.id,
        name: user.name,
        email: user.email,
        hasPassword: !!user.password_hash
      });
      
      // Tester le mot de passe
      if (user.password_hash) {
        const isPasswordValid = await bcrypt.compare('admin123', user.password_hash);
        console.log('🔐 Test du mot de passe:', isPasswordValid ? '✅ Valide' : '❌ Invalide');
        
        if (!isPasswordValid) {
          console.log('🔧 Mise à jour du mot de passe...');
          const newPasswordHash = await bcrypt.hash('admin123', 12);
          await query(
            'UPDATE users SET password_hash = ? WHERE id = ?',
            [newPasswordHash, user.id]
          );
          console.log('✅ Mot de passe mis à jour');
        }
      } else {
        console.log('🔧 Ajout du mot de passe manquant...');
        const passwordHash = await bcrypt.hash('admin123', 12);
        await query(
          'UPDATE users SET password_hash = ? WHERE id = ?',
          [passwordHash, user.id]
        );
        console.log('✅ Mot de passe ajouté');
      }
    }

    // 2. Vérifier l'entrée dans la table admins
    console.log('\n2. Vérification de la table admins...');
    const admins = await query('SELECT * FROM admins WHERE email = ?', ['admin@alissa-school.com']);
    
    if (admins.length === 0) {
      console.log('❌ Entrée admin non trouvée!');
      
      // Récupérer l'ID utilisateur
      const userResult = await query('SELECT id FROM users WHERE email = ?', ['admin@alissa-school.com']);
      if (userResult.length > 0) {
        const adminId = require('uuid').v4();
        await query(
          'INSERT INTO admins (id, user_id, email, created_at) VALUES (?, ?, ?, NOW())',
          [adminId, userResult[0].id, 'admin@alissa-school.com']
        );
        console.log('✅ Entrée admin créée');
      }
    } else {
      console.log('✅ Entrée admin trouvée:', {
        id: admins[0].id,
        user_id: admins[0].user_id,
        email: admins[0].email
      });
    }

    // 3. Test de connexion via API
    console.log('\n3. Test de connexion via API...');
    const fetch = require('node-fetch');
    
    try {
      const response = await fetch('https://back-alissa-school-up2p.onrender.com/api/frontend/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email: 'admin@alissa-school.com',
          password: 'admin123'
        })
      });
      
      const data = await response.json();
      console.log('📊 Réponse API:', {
        status: response.status,
        success: data.success,
        message: data.message || data.error?.message,
        role: data.data?.user?.role,
        redirectPath: data.data?.redirectPath
      });
      
      if (data.success) {
        console.log('✅ Connexion admin réussie!');
        console.log('🔑 Token généré:', data.data.token ? 'Oui' : 'Non');
      }
    } catch (error) {
      console.log('❌ Erreur API:', error.message);
    }

    console.log('\n🎉 Test terminé!');
    
  } catch (error) {
    console.error('❌ Erreur:', error);
  } finally {
    process.exit(0);
  }
}

testAdminLogin();