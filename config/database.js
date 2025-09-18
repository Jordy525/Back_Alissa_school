const mysql = require('mysql2/promise');
const { logger } = require('./logger');

// config/database.js
require('dotenv').config(); // charge le fichier .env automatiquement

// Configuration de la base de données
const dbConfig = {
  host: process.env.DB_HOST || 'mysql-zigh-portfolio.alwaysdata.net',
  user: process.env.DB_USER || '404304',
  password: process.env.DB_PASSWORD || 'Campement@2024',
  database: process.env.DB_NAME || 'zigh-portfolio_alissa_school',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
};

// Création du pool de connexions
let pool;

const connectDB = async () => {
  try {
    // Vérification des variables d'environnement
    if (!process.env.DB_HOST || !process.env.DB_USER || !process.env.DB_PASSWORD || !process.env.DB_NAME) {
      throw new Error("Variables d'environnement de base de données manquantes");
    }

    pool = mysql.createPool(dbConfig);
    
    // Test de connexion
    const connection = await pool.getConnection();
    await connection.ping();
    connection.release();
    
    logger.info('✅ Connexion à MySQL établie avec succès');
    return pool;
  } catch (error) {
    logger.error('❌ Erreur de connexion à la base de données:', error);
    throw error;
  }
};

// Fonction pour exécuter des requêtes
const query = async (sql, params = []) => {
  try {
    if (!pool) {
      throw new Error('Pool de connexions non initialisé');
    }
    
    const [rows] = await pool.execute(sql, params);
    return rows;
  } catch (error) {
    logger.error('Erreur lors de l\'exécution de la requête:', { sql, params, error: error.message });
    throw error;
  }
};

// Fonction pour les transactions
const transaction = async (callback) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const result = await callback(connection);
    await connection.commit();
    return result;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

// Fonction pour fermer le pool
const closePool = async () => {
  if (pool) {
    await pool.end();
    logger.info('🔌 Pool de connexions fermé');
  }
};

module.exports = {
  connectDB,
  query,
  transaction,
  closePool,
  pool: () => pool
};
