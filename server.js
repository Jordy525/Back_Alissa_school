const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const session = require('express-session');
const passport = require('passport');
require('dotenv').config();

const { connectDB } = require('./config/database');
const { logger } = require('./config/logger');
const { errorHandler } = require('./middleware/errorHandler');

// Import des routes
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const subjectRoutes = require('./routes/subjects');
const lessonRoutes = require('./routes/lessons');
const quizRoutes = require('./routes/quizzes');
const aiRoutes = require('./routes/ai');
const achievementRoutes = require('./routes/achievements');
const youtubeRoutes = require('./routes/youtube');
const gamificationRoutes = require('./routes/gamification');
const progressRoutes = require('./routes/progress');
const chatRoutes = require('./routes/chat');
const documentRoutes = require('./routes/documents');
const adminRoutes = require('./routes/admin');
const adminAuthRoutes = require('./routes/adminAuth');

const app = express();
const PORT = process.env.PORT || 3000;

// Configuration CORS
const corsOptions = {
  origin: [
    process.env.FRONTEND_URL || 'https://front-alissa-school-seven.vercel.app',
    'https://front-alissa-school-seven.vercel.app', // URL de production
    'https://front-alissa-school-446cs1h39-jordys-projects-d5468569.vercel.app', // URL Vercel actuelle
    'https://front-alissa-school-hctk8anw1-jordys-projects-d5468569.vercel.app', // Nouvelle URL Vercel
    'https://front-alissa-school-ifao2yvxs-jordys-projects-d5468569.vercel.app', // URL Vercel la plus récente
    /^https:\/\/front-alissa-school.*\.vercel\.app$/, // Pattern pour toutes les URLs Vercel
    'http://localhost:8080', // Port alternatif pour le frontend
    'http://localhost:3000', // Port du backend (pour les tests)
    'http://127.0.0.1:5173',
    'http://127.0.0.1:8080',
    'http://127.0.0.1:3000',
    'http://localhost:8081', // Port supplémentaire
    'http://127.0.0.1:8081'
  ],
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
  exposedHeaders: ['Content-Length', 'X-Foo', 'X-Bar'],
  maxAge: 86400 // 24 heures
};

// Middleware CORS personnalisé pour gérer les requêtes preflight
app.use((req, res, next) => {
  const origin = req.headers.origin;
  
  // Vérifier si l'origine est autorisée
  const isAllowedOrigin = corsOptions.origin.some(allowedOrigin => {
    if (typeof allowedOrigin === 'string') {
      return allowedOrigin === origin;
    } else if (allowedOrigin instanceof RegExp) {
      return allowedOrigin.test(origin);
    }
    return false;
  });
  
  if (isAllowedOrigin) {
    res.header('Access-Control-Allow-Origin', origin);
    res.header('Access-Control-Allow-Credentials', 'true');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin');
  }
  
  // Gérer les requêtes preflight
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  
  next();
});

// Middleware de sécurité
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
}));

// Middleware de rate limiting
const rateLimit = require('express-rate-limit');
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // Limite de 1000 requêtes par IP par fenêtre (augmenté pour le développement)
  message: {
    success: false,
    error: {
      message: 'Trop de requêtes, veuillez réessayer plus tard'
    }
  },
  standardHeaders: true,
  legacyHeaders: false,
  // Skip rate limiting for development
  skip: (req) => {
    return process.env.NODE_ENV === 'development' || req.ip === '127.0.0.1' || req.ip === '::1';
  }
});

app.use('/api/', limiter);

// Middleware généraux
app.use(compression());
app.use(morgan('combined', { stream: { write: message => logger.info(message.trim()) } }));
app.use(cors(corsOptions));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Configuration des sessions et Passport
app.use(session({
  secret: process.env.JWT_SECRET || 'fallback-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    maxAge: 24 * 60 * 60 * 1000 // 24 heures
  }
}));

app.use(passport.initialize());
app.use(passport.session());

// Routes de santé
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV
  });
});

// Routes API
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/subjects', subjectRoutes);
app.use('/api/lessons', lessonRoutes);
app.use('/api/quizzes', quizRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/content', require('./routes/content'));
app.use('/api/achievements', achievementRoutes);
app.use('/api/youtube', youtubeRoutes);
app.use('/api/gamification', gamificationRoutes);
app.use('/api/progress', progressRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/admin-auth', adminAuthRoutes);

// Routes pour le nouveau frontend
app.use('/api/frontend', require('./routes/frontend'));

// Route de test pour l'API
app.get('/api', (req, res) => {
  res.json({
    message: 'API Alissa School - Backend',
    version: '1.0.0',
    endpoints: {
      auth: '/api/auth',
      users: '/api/users',
      subjects: '/api/subjects',
      lessons: '/api/lessons',
      quizzes: '/api/quizzes',
      ai: '/api/ai',
      achievements: '/api/achievements'
    }
  });
});

// Gestion des routes non trouvées
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Route non trouvée',
    message: `La route ${req.originalUrl} n'existe pas`,
    availableRoutes: [
      'GET /api',
      'GET /health',
      'POST /api/auth/register',
      'POST /api/auth/login',
      'GET /api/auth/google',
      'GET /api/users/profile',
      'GET /api/subjects',
      'GET /api/lessons/:id',
      'POST /api/quizzes/:id/submit',
      'POST /api/ai/chat'
    ]
  });
});

// Middleware de gestion d'erreurs
app.use(errorHandler);

// Connexion à la base de données et démarrage du serveur
const startServer = async () => {
  try {
    // Vérification des variables d'environnement critiques
    if (!process.env.JWT_SECRET) {
      console.warn('⚠️  JWT_SECRET non défini, utilisation d\'une clé par défaut (NON SÉCURISÉ)');
      process.env.JWT_SECRET = 'default_jwt_secret_change_in_production';
    }

    if (!process.env.DB_HOST) {
      console.warn('⚠️  Variables de base de données non définies, utilisation des valeurs par défaut');
      process.env.DB_HOST = 'localhost';
      process.env.DB_PORT = '3306';
      process.env.DB_NAME = 'alissa_school';
      process.env.DB_USER = 'root';
      process.env.DB_PASSWORD = 'password';
    }

    await connectDB();
    logger.info('✅ Connexion à la base de données établie');
    
    app.listen(PORT, () => {
      logger.info(`🚀 Serveur Alissa School démarré sur le port ${PORT}`);
      logger.info(`📚 Environnement: ${process.env.NODE_ENV}`);
      logger.info(`🌐 Frontend URL: ${process.env.FRONTEND_URL}`);
      logger.info(`🔗 API disponible sur: http://localhost:${PORT}/api`);
    });
  } catch (error) {
    logger.error('❌ Erreur lors du démarrage du serveur:', error);
    console.error('❌ Erreur détaillée:', error.message);
    process.exit(1);
  }
};

// Gestion des signaux d'arrêt
process.on('SIGTERM', () => {
  logger.info('🛑 Signal SIGTERM reçu, arrêt du serveur...');
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('🛑 Signal SIGINT reçu, arrêt du serveur...');
  process.exit(0);
});

// Gestion des erreurs non capturées
process.on('uncaughtException', (error) => {
  logger.error('💥 Exception non capturée:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('💥 Promesse rejetée non gérée:', reason);
  process.exit(1);
});

startServer();

module.exports = app;
