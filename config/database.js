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
	port: Number(process.env.DB_PORT || 3306),
	waitForConnections: true,
	connectionLimit: Number(process.env.DB_POOL_LIMIT || 10),
	queueLimit: 0,
	connectTimeout: Number(process.env.DB_CONNECT_TIMEOUT || 20000),
	enableKeepAlive: true,
	keepAliveInitialDelay: Number(process.env.DB_KEEPALIVE_DELAY || 10000),
	// Certains providers (AlwaysData, PlanetScale, etc.) requièrent SSL
	ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: process.env.DB_SSL_STRICT === 'true' } : undefined
};

// Création du pool de connexions
let pool;

const connectWithRetry = async (attempt = 1) => {
	try {
		pool = mysql.createPool(dbConfig);
		const connection = await pool.getConnection();
		await connection.ping();
		connection.release();
		logger.info('✅ Connexion à MySQL établie avec succès');
		return pool;
	} catch (error) {
		logger.error(`❌ Tentative ${attempt} - Connexion MySQL échouée:`, error);
		if (attempt >= Number(process.env.DB_MAX_RETRIES || 3)) {
			throw error;
		}
		const backoffMs = Math.min(30000, 2000 * attempt);
		await new Promise(r => setTimeout(r, backoffMs));
		return connectWithRetry(attempt + 1);
	}
};

const connectDB = async () => {
	try {
		// Vérification des variables d'environnement
		if (!process.env.DB_HOST || !process.env.DB_USER || !process.env.DB_PASSWORD || !process.env.DB_NAME) {
			logger.warn("⚠️  Variables d'environnement DB incomplètes. Assurez-vous de définir DB_HOST, DB_USER, DB_PASSWORD, DB_NAME (et DB_PORT si nécessaire).");
		}
		return await connectWithRetry();
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
