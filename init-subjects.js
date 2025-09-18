const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

// Configuration de la base de données (même que le serveur)
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'password',
  database: process.env.DB_NAME || 'alissa_school',
  charset: 'utf8mb4'
};

async function initSubjects() {
  let connection;
  
  try {
    console.log('🔌 Connexion à la base de données...');
    connection = await mysql.createConnection(dbConfig);
    console.log('✅ Connexion établie');

    // Lire le fichier SQL
    const sqlFile = path.join(__dirname, 'create-subjects.sql');
    const sql = fs.readFileSync(sqlFile, 'utf8');
    
    console.log('📚 Exécution du script SQL...');
    
    // Diviser le script en requêtes individuelles
    const queries = sql.split(';').filter(query => query.trim());
    
    for (const query of queries) {
      if (query.trim()) {
        try {
          await connection.execute(query);
          console.log('✅ Requête exécutée');
        } catch (error) {
          console.log('⚠️  Erreur sur une requête:', error.message);
        }
      }
    }

    // Vérifier que les matières ont été créées
    console.log('\n🔍 Vérification des matières créées...');
    const [subjects] = await connection.execute(
      'SELECT id, name, is_active FROM subjects ORDER BY name'
    );
    
    console.log('📚 Matières disponibles:');
    subjects.forEach(subject => {
      console.log(`   - ${subject.id}: ${subject.name} (${subject.is_active ? 'actif' : 'inactif'})`);
    });

    console.log('\n🎉 Initialisation terminée !');
    console.log('\n📝 Prochaines étapes :');
    console.log('1. Tester la sélection de matières: node test-subjects.js');
    console.log('2. Tester dans le frontend');

  } catch (error) {
    console.error('❌ Erreur:', error.message);
    
    if (error.code === 'ECONNREFUSED') {
      console.log('\n💡 Solution : Vérifiez que MySQL est démarré');
    } else if (error.code === 'ER_ACCESS_DENIED_ERROR') {
      console.log('\n💡 Solution : Vérifiez les identifiants MySQL');
    } else if (error.code === 'ER_BAD_DB_ERROR') {
      console.log('\n💡 Solution : La base de données n\'existe pas, exécutez d\'abord: npm run migrate');
    }
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

initSubjects();


