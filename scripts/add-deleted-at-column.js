const { query, connectDB } = require('../config/database');

async function addDeletedAtColumn() {
  try {
    console.log('🔧 Connexion à la base de données...');
    await connectDB();
    
    console.log('➕ Ajout de la colonne deleted_at à la table documents...');
    await query(`
      ALTER TABLE documents 
      ADD COLUMN deleted_at timestamp NULL DEFAULT NULL
      AFTER updated_at
    `);
    
    console.log('✅ Colonne deleted_at ajoutée avec succès !');
    
    // Vérifier la structure mise à jour
    const structure = await query('DESCRIBE documents');
    console.log('\n📋 Structure mise à jour de la table documents:');
    structure.forEach(col => {
      console.log(`  - ${col.Field} (${col.Type})`);
    });
    
  } catch (error) {
    if (error.message.includes('Duplicate column name')) {
      console.log('✅ La colonne deleted_at existe déjà');
    } else {
      console.error('❌ Erreur:', error.message);
    }
  } finally {
    process.exit(0);
  }
}

addDeletedAtColumn();