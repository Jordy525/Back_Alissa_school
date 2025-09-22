const { query, connectDB } = require('../config/database');

async function addDocumentTypeColumn() {
  try {
    console.log('🔧 Connexion à la base de données...');
    await connectDB();
    
    console.log('➕ Ajout de la colonne document_type...');
    await query(`
      ALTER TABLE documents 
      ADD COLUMN document_type enum('book','methodology','exercise','other') DEFAULT 'book'
      AFTER classe
    `);
    
    console.log('✅ Colonne document_type ajoutée avec succès !');
    
    // Vérifier la structure mise à jour
    const structure = await query('DESCRIBE documents');
    console.log('\n📋 Structure mise à jour de la table documents:');
    structure.forEach(col => {
      console.log(`  - ${col.Field} (${col.Type})`);
    });
    
  } catch (error) {
    if (error.message.includes('Duplicate column name')) {
      console.log('✅ La colonne document_type existe déjà');
    } else {
      console.error('❌ Erreur:', error.message);
    }
  } finally {
    process.exit(0);
  }
}

addDocumentTypeColumn();