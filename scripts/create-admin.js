const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const { query, connectDB } = require('../config/database');

async function createAdmin() {
  try {
    await connectDB();

    const email = process.argv[2];
    const password = process.argv[3];
    const name = process.argv[4] || 'Admin';

    if (!email || !password) {
      console.log('Usage: node scripts/create-admin.js <email> <password> [name]');
      process.exit(1);
    }

    // Vérifier si l'utilisateur existe
    const users = await query('SELECT id, email, name FROM users WHERE email = ?', [email]);

    let userId;
    if (users.length === 0) {
      // Créer l'utilisateur
      userId = uuidv4();
      const passwordHash = await bcrypt.hash(password, 12);
      await query(
        'INSERT INTO users (id, email, password_hash, name, created_at) VALUES (?, ?, ?, ?, NOW())',
        [userId, email, passwordHash, name]
      );
      console.log(`✅ Utilisateur créé: ${email} (${userId})`);
    } else {
      userId = users[0].id;
      console.log(`ℹ️  Utilisateur existant détecté: ${email} (${userId})`);
    }

    // Vérifier si déjà admin
    const existingAdmin = await query('SELECT id FROM admins WHERE user_id = ? OR email = ?', [userId, email]);
    if (existingAdmin.length > 0) {
      console.log('⚠️  Cet utilisateur est déjà administrateur.');
      process.exit(0);
    }

    // Ajouter l'admin
    const adminId = uuidv4();
    await query(
      'INSERT INTO admins (id, user_id, email, created_at) VALUES (?, ?, ?, NOW())',
      [adminId, userId, email]
    );

    console.log('✅ Administrateur ajouté avec succès.');
    console.log(`   Admin ID: ${adminId}`);
    console.log(`   User  ID: ${userId}`);
  } catch (error) {
    console.error('❌ Erreur lors de la création de l\'admin:', error);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

createAdmin();


