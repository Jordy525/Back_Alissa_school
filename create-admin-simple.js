const { query } = require('./config/database');

// Fonction simple pour générer un UUID
function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

async function createAdmin() {
  try {
    console.log('🔧 Création de l\'utilisateur admin...');
    
    // 1. Ajouter la colonne role si elle n'existe pas
    try {
      await query('ALTER TABLE users ADD COLUMN role ENUM("student", "teacher", "admin", "super_admin") DEFAULT "student" AFTER classe');
      console.log('✅ Colonne "role" ajoutée');
    } catch (error) {
      if (error.message.includes('Duplicate column name')) {
        console.log('✅ Colonne "role" existe déjà');
      } else {
        throw error;
      }
    }
    
    // 2. Vérifier si l'admin existe déjà
    const existingAdmin = await query('SELECT id FROM users WHERE email = ?', ['admin@alissa-school.com']);
    
    if (existingAdmin.length > 0) {
      console.log('✅ Utilisateur admin existe déjà');
      // Mettre à jour le rôle
      await query('UPDATE users SET role = "admin" WHERE email = ?', ['admin@alissa-school.com']);
      console.log('✅ Rôle mis à jour vers admin');
    } else {
      // 3. Créer l'utilisateur admin
      const adminId = generateUUID();
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
    }
    
    // 4. Vérifier la création
    const admin = await query('SELECT id, email, name, role FROM users WHERE email = ?', ['admin@alissa-school.com']);
    
    if (admin.length > 0) {
      console.log('\n🎉 Admin créé avec succès !');
      console.log('📧 Email: admin@alissa-school.com');
      console.log('🔑 Mot de passe: admin123');
      console.log('👤 Nom:', admin[0].name);
      console.log('🔐 Rôle:', admin[0].role);
      console.log('\n📝 Instructions:');
      console.log('1. Redéployez le backend sur Render');
      console.log('2. Connectez-vous avec les identifiants ci-dessus');
      console.log('3. Accédez à /admin/documents');
    } else {
      console.log('❌ Erreur: Admin non trouvé après création');
    }
    
  } catch (error) {
    console.error('❌ Erreur lors de la création de l\'admin:', error);
  }
}

createAdmin();
