const mysql = require('mysql2/promise');
require('dotenv').config();

async function checkTable() {
  let connection;
  
  try {
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'alissa_school',
      port: process.env.DB_PORT || 3306
    });

    console.log('Vérification de la table document_categories...');
    const [cols] = await connection.execute('DESCRIBE document_categories');
    console.log('Colonnes:');
    cols.forEach(col => {
      console.log(`- ${col.Field} (${col.Type})`);
    });

  } catch (error) {
    console.error('Erreur:', error.message);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

checkTable();
