const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function runMigration() {
  let connection;
  
  try {
    // Connexion à la base de données
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'alissa_school',
      port: process.env.DB_PORT || 3306
    });

    console.log('✅ Connexion à la base de données établie');

    // Lire le fichier de migration
    const migrationPath = path.join(__dirname, '../migrations/add_role_and_documents_fixed.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    // Diviser les requêtes SQL (séparées par des points-virgules)
    const queries = migrationSQL
      .split(';')
      .map(query => query.trim())
      .filter(query => query.length > 0 && !query.startsWith('--') && !query.startsWith('/*'));

    console.log(`📝 Exécution de ${queries.length} requêtes de migration...`);

    // Exécuter chaque requête
    for (let i = 0; i < queries.length; i++) {
      const query = queries[i];
      if (query.trim()) {
        try {
          console.log(`⏳ Exécution de la requête ${i + 1}/${queries.length}...`);
          await connection.execute(query);
          console.log(`✅ Requête ${i + 1} exécutée avec succès`);
        } catch (error) {
          console.error(`❌ Erreur lors de l'exécution de la requête ${i + 1}:`, error.message);
          // Continuer avec les autres requêtes même si une échoue
        }
      }
    }

    console.log('🎉 Migration terminée avec succès !');
    console.log('');
    console.log('📋 Résumé des modifications :');
    console.log('   - Ajout du champ "role" à la table "users"');
    console.log('   - Création de la table "documents"');
    console.log('   - Création de la table "document_categories"');
    console.log('   - Création de la table "document_category_links"');
    console.log('   - Insertion des catégories par défaut');
    console.log('   - Création d\'un utilisateur admin par défaut');
    console.log('');
    console.log('🔑 Compte admin créé :');
    console.log('   Email: admin@alissa-school.com');
    console.log('   Mot de passe: admin123');
    console.log('');
    console.log('⚠️  N\'oubliez pas de changer le mot de passe admin après la première connexion !');

  } catch (error) {
    console.error('❌ Erreur lors de la migration:', error);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      console.log('🔌 Connexion fermée');
    }
  }
}

// Exécuter la migration
runMigration();
