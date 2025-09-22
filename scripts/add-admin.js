const { v4: uuidv4 } = require('uuid');
const { query, connectDB } = require('../config/database');

async function addAdmin() {
  try {
    await connectDB();
    
    // Demander l'email de l'utilisateur à promouvoir en admin
    const email = process.argv[2];
    
    if (!email) {
      console.log('Usage: node scripts/add-admin.js <email>');
      console.log('Exemple: node scripts/add-admin.js admin@example.com');
      process.exit(1);
    }

    // Vérifier si l'utilisateur existe
    const users = await query('SELECT id, email, name FROM users WHERE email = ?', [email]);
    
    if (users.length === 0) {
      console.log(`❌ Aucun utilisateur trouvé avec l'email: ${email}`);
      console.log('Assurez-vous que l\'utilisateur a créé un compte d\'abord.');
      process.exit(1);
    }

    const user = users[0];

    // Vérifier si l'utilisateur est déjà admin
    const existingAdmin = await query(
      'SELECT id FROM admins WHERE user_id = ? OR email = ?',
      [user.id, user.email]
    );

    if (existingAdmin.length > 0) {
      console.log(`⚠️  L'utilisateur ${email} est déjà administrateur.`);
      process.exit(0);
    }

    // Ajouter l'utilisateur à la table admins
    const adminId = uuidv4();
    await query(
      'INSERT INTO admins (id, user_id, email, created_at) VALUES (?, ?, ?, NOW())',
      [adminId, user.id, user.email]
    );

    console.log(`✅ Utilisateur ${user.name} (${email}) ajouté comme administrateur avec succès!`);
    console.log(`   ID Admin: ${adminId}`);
    console.log(`   ID Utilisateur: ${user.id}`);
    
  } catch (error) {
    console.error('❌ Erreur lors de l\'ajout de l\'administrateur:', error);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

addAdmin();