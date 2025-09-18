# 🚀 Alissa School - Backend API

Backend Express.js pour la plateforme éducative intelligente Alissa School, développé par Alissa IA.

## 📋 Prérequis

- Node.js 18+ 
- MySQL 8.0+
- Redis (optionnel, pour le cache)
- OpenAI API Key

## 🛠️ Installation

### 1. Cloner le projet
```bash
git clone <repository-url>
cd alissa-school/back
```

### 2. Installer les dépendances
```bash
npm install
```

### 3. Configuration des variables d'environnement
```bash
cp env.example .env
```

Éditer le fichier `.env` avec vos configurations :
```env
# Base de données
DB_HOST=localhost
DB_PORT=3306
DB_NAME=alissa_school
DB_USER=your_db_user
DB_PASSWORD=your_db_password

# JWT
JWT_SECRET=your_super_secret_jwt_key
JWT_EXPIRES_IN=7d

# OpenAI
OPENAI_API_KEY=sk-your-openai-api-key
OPENAI_MODEL=gpt-4

# Google OAuth
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret

# URLs
BASE_URL=http://localhost:3000
FRONTEND_URL=https://front-alissa-school-seven.vercel.app
```

### 4. Initialisation de la base de données
```bash
# Créer les tables
npm run migrate

# Peupler avec des données d'exemple
npm run seed
```

### 5. Démarrage du serveur
```bash
# Mode développement
npm run dev

# Mode production
npm start
```

## 🐳 Déploiement avec Docker

### Déploiement simple
```bash
# Construire et démarrer tous les services
docker-compose up -d

# Voir les logs
docker-compose logs -f

# Arrêter les services
docker-compose down
```

### Déploiement avec volumes persistants
```bash
# Démarrer avec sauvegarde des données
docker-compose up -d

# Les données MySQL et Redis sont sauvegardées dans des volumes Docker
```

## 📚 API Documentation

### Endpoints Principaux

#### Authentification (`/api/auth`)
- `POST /api/auth/register` - Inscription
- `POST /api/auth/login` - Connexion
- `GET /api/auth/google` - Connexion Google
- `POST /api/auth/refresh` - Rafraîchir le token
- `POST /api/auth/logout` - Déconnexion

#### Utilisateurs (`/api/users`)
- `GET /api/users/profile` - Profil utilisateur
- `PUT /api/users/profile` - Mettre à jour le profil
- `PUT /api/users/class` - Sélectionner la classe
- `GET /api/users/progress` - Progrès utilisateur
- `GET /api/users/achievements` - Succès utilisateur

#### Matières (`/api/subjects`)
- `GET /api/subjects` - Liste des matières
- `GET /api/subjects/:id` - Détails d'une matière
- `GET /api/subjects/:id/lessons` - Leçons d'une matière
- `GET /api/subjects/:id/progress` - Progrès dans une matière

#### Leçons (`/api/lessons`)
- `GET /api/lessons/:id` - Détails d'une leçon
- `POST /api/lessons/:id/complete` - Marquer comme terminée
- `GET /api/lessons/:id/quiz` - Quiz associé

#### Quiz (`/api/quizzes`)
- `GET /api/quizzes/:id` - Détails du quiz
- `POST /api/quizzes/:id/submit` - Soumettre les réponses
- `GET /api/quizzes/:id/attempts` - Historique des tentatives

#### IA (`/api/ai`)
- `POST /api/ai/chat` - Chat avec l'assistant IA
- `POST /api/ai/generate-quiz` - Générer un quiz
- `POST /api/ai/generate-lesson` - Générer une leçon

#### Succès (`/api/achievements`)
- `GET /api/achievements` - Liste des succès
- `GET /api/achievements/user/unlocked` - Succès débloqués
- `GET /api/achievements/leaderboard` - Classement

## 🔧 Scripts Disponibles

```bash
# Développement
npm run dev          # Démarrage avec nodemon

# Production
npm start            # Démarrage du serveur
npm run migrate      # Migration de la base de données
npm run seed         # Peuplement avec des données d'exemple

# Tests
npm test             # Exécution des tests
```

## 🏗️ Architecture

### Structure des Dossiers
```
back/
├── config/          # Configuration (database, logger)
├── middleware/      # Middlewares (auth, error handling)
├── routes/          # Routes API
├── scripts/         # Scripts de migration et seeding
├── logs/            # Fichiers de logs (production)
├── server.js        # Point d'entrée principal
└── package.json     # Dépendances et scripts
```

### Base de Données
- **MySQL 8.0** pour les données relationnelles
- **Redis** pour le cache et les sessions (optionnel)
- Tables principales : users, subjects, lessons, quizzes, achievements

### Sécurité
- **JWT** pour l'authentification
- **bcrypt** pour le hachage des mots de passe
- **Helmet** pour les headers de sécurité
- **Rate limiting** pour la protection contre les abus
- **CORS** configuré pour le frontend

## 🚀 Déploiement Production

### Variables d'Environnement Requises
```env
NODE_ENV=production
DB_HOST=your_mysql_host
DB_USER=your_db_user
DB_PASSWORD=your_secure_password
JWT_SECRET=your_very_secure_jwt_secret
OPENAI_API_KEY=sk-your-openai-key
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
```

### Configuration Nginx
Le fichier `nginx.conf` est fourni pour la configuration du reverse proxy.

### Monitoring
- Logs structurés avec Winston
- Health check endpoint : `GET /health`
- Métriques de performance intégrées

## 🧪 Test des APIs avec Postman

### 📋 Configuration Postman

1. **Base URL** : `http://localhost:3000`
2. **Headers par défaut** :
   - `Content-Type: application/json`
   - `Authorization: Bearer {token}` (pour les routes protégées)

### 🔐 Authentification

#### 1. Inscription d'un utilisateur
```http
POST /api/auth/register
Content-Type: application/json

{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "Password123"
}
```

**Réponse de succès (201)** :
```json
{
  "success": true,
  "message": "Compte créé avec succès",
  "data": {
    "user": {
      "id": "uuid-here",
      "email": "john@example.com",
      "name": "John Doe",
      "avatarUrl": null,
      "selectedClass": null,
      "totalPoints": 0,
      "level": 1,
      "createdAt": "2024-01-01T00:00:00.000Z"
    },
    "token": "jwt-token-here"
  }
}
```

#### 2. Connexion
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "john@example.com",
  "password": "Password123"
}
```

**Réponse de succès (200)** :
```json
{
  "success": true,
  "message": "Connexion réussie",
  "data": {
    "user": {
      "id": "uuid-here",
      "email": "john@example.com",
      "name": "John Doe",
      "selectedClass": null,
      "totalPoints": 0,
      "level": 1
    },
    "token": "jwt-token-here"
  }
}
```

#### 3. Sélection de classe (OBLIGATOIRE)
```http
PUT /api/users/class
Authorization: Bearer {token}
Content-Type: application/json

{
  "classLevel": "6ème"
}
```

**Réponse de succès (200)** :
```json
{
  "success": true,
  "message": "Classe sélectionnée avec succès",
  "data": {
    "user": {
      "id": "uuid-here",
      "selectedClass": "6ème",
      "totalPoints": 0,
      "level": 1
    }
  }
}
```

### 👤 Gestion des Utilisateurs

#### 1. Profil utilisateur
```http
GET /api/users/profile
Authorization: Bearer {token}
```

**Réponse de succès (200)** :
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid-here",
      "email": "john@example.com",
      "name": "John Doe",
      "selectedClass": "6ème",
      "totalPoints": 0,
      "level": 1,
      "createdAt": "2024-01-01T00:00:00.000Z"
    }
  }
}
```

#### 2. Progrès utilisateur
```http
GET /api/users/progress
Authorization: Bearer {token}
```

**Réponse de succès (200)** :
```json
{
  "success": true,
  "data": {
    "progressBySubject": [
      {
        "id": "subject-uuid",
        "name": "Mathématiques",
        "icon": "🧮",
        "color": "#3B82F6",
        "lessons_completed": 0,
        "quizzes_completed": 0,
        "user_points": 0,
        "current_streak": 0,
        "status": "not_started"
      }
    ],
    "globalStats": {
      "total_lessons_completed": 0,
      "total_quizzes_completed": 0,
      "total_points_earned": 0,
      "best_streak": 0,
      "subjects_started": 0
    }
  }
}
```

### 📚 Matières et Leçons

#### 1. Liste des matières
```http
GET /api/subjects
Authorization: Bearer {token}
```

**Réponse de succès (200)** :
```json
{
  "success": true,
  "data": {
    "subjects": [
      {
        "id": "subject-uuid",
        "name": "Mathématiques",
        "description": "Apprentissage des concepts mathématiques",
        "icon": "🧮",
        "color": "#3B82F6",
        "total_lessons": 3,
        "lessons_completed": 0,
        "user_points": 0,
        "status": "not_started"
      }
    ],
    "classLevel": "6ème"
  }
}
```

#### 2. Détails d'une matière
```http
GET /api/subjects/{subjectId}
Authorization: Bearer {token}
```

#### 3. Détails d'une leçon
```http
GET /api/lessons/{lessonId}
Authorization: Bearer {token}
```

**Réponse de succès (200)** :
```json
{
  "success": true,
  "data": {
    "lesson": {
      "id": "lesson-uuid",
      "title": "Introduction aux fractions",
      "description": "Découverte des fractions",
      "content": "Les fractions représentent...",
      "estimatedDuration": 30,
      "difficulty": "easy",
      "pointsReward": 25,
      "isCompleted": false
    },
    "navigation": {
      "previous_lesson": null,
      "next_lesson": "next-lesson-uuid"
    }
  }
}
```

#### 4. Marquer une leçon comme terminée
```http
POST /api/lessons/{lessonId}/complete
Authorization: Bearer {token}
```

**Réponse de succès (200)** :
```json
{
  "success": true,
  "message": "Leçon terminée avec succès",
  "data": {
    "lessonId": "lesson-uuid",
    "pointsEarned": 25,
    "subjectName": "Mathématiques"
  }
}
```

### 🧩 Quiz

#### 1. Détails d'un quiz
```http
GET /api/quizzes/{quizId}
Authorization: Bearer {token}
```

**Réponse de succès (200)** :
```json
{
  "success": true,
  "data": {
    "quiz": {
      "id": "quiz-uuid",
      "title": "Quiz sur les fractions",
      "description": "Testez vos connaissances",
      "questions": [
        {
          "id": "q1",
          "question": "Que représente le numérateur ?",
          "options": [
            "Le nombre de parts prises",
            "Le nombre total de parts",
            "La valeur de la fraction",
            "Le dénominateur"
          ],
          "correctAnswer": 0,
          "explanation": "Le numérateur indique..."
        }
      ],
      "timeLimit": 15,
      "passingScore": 250
    }
  }
}
```

#### 2. Soumettre un quiz
```http
POST /api/quizzes/{quizId}/submit
Authorization: Bearer {token}
Content-Type: application/json

{
  "answers": [
    {
      "questionId": "q1",
      "selectedAnswer": 0,
      "timeSpent": 30
    }
  ],
  "totalTimeSpent": 300
}
```

**Réponse de succès (200)** :
```json
{
  "success": true,
  "message": "Quiz soumis avec succès",
  "data": {
    "quizId": "quiz-uuid",
    "score": 10,
    "totalQuestions": 1,
    "correctAnswers": 1,
    "pointsEarned": 50,
    "status": "passed",
    "isPerfect": true,
    "passingScore": 250,
    "detailedAnswers": [
      {
        "questionId": "q1",
        "selectedAnswer": 0,
        "correctAnswer": 0,
        "isCorrect": true,
        "timeSpent": 30
      }
    ]
  }
}
```

### 🤖 Assistant IA

#### 1. Chat avec l'IA
```http
POST /api/ai/chat
Authorization: Bearer {token}
Content-Type: application/json

{
  "message": "Explique-moi les fractions",
  "context": {
    "subjectId": "math-subject-uuid",
    "lessonId": "fractions-lesson-uuid"
  }
}
```

**Réponse de succès (200)** :
```json
{
  "success": true,
  "data": {
    "message": "Les fractions sont une façon de représenter une partie d'un tout...",
    "sessionId": "session-uuid",
    "timestamp": "2024-01-01T00:00:00.000Z"
  }
}
```

#### 2. Générer un quiz personnalisé
```http
POST /api/ai/generate-quiz
Authorization: Bearer {token}
Content-Type: application/json

{
  "subjectId": "math-subject-uuid",
  "difficulty": "medium",
  "questionCount": 5,
  "topic": "Fractions"
}
```

**Réponse de succès (200)** :
```json
{
  "success": true,
  "message": "Quiz généré avec succès",
  "data": {
    "quiz": {
      "id": "generated-quiz-uuid",
      "title": "Quiz personnalisé sur les Fractions",
      "description": "Quiz généré par IA",
      "questions": [...],
      "timeLimit": 15,
      "passingScore": 250
    }
  }
}
```

### 🏆 Succès

#### 1. Liste des succès
```http
GET /api/achievements
Authorization: Bearer {token}
```

**Réponse de succès (200)** :
```json
{
  "success": true,
  "data": {
    "achievements": [
      {
        "id": "achievement-uuid",
        "title": "Premier pas",
        "description": "Terminez votre première leçon",
        "icon": "👶",
        "points": 50,
        "rarity": "common",
        "isUnlocked": false
      }
    ]
  }
}
```

#### 2. Succès débloqués par l'utilisateur
```http
GET /api/achievements/user/unlocked
Authorization: Bearer {token}
```

### 🔍 Santé du Serveur

#### 1. Vérification de santé
```http
GET /health
```

**Réponse de succès (200)** :
```json
{
  "status": "OK",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "uptime": 3600,
  "environment": "development"
}
```

### ⚠️ Codes d'Erreur Courants

- **400** : Données invalides
- **401** : Non authentifié (token manquant/invalide)
- **403** : Accès refusé (permissions insuffisantes)
- **404** : Ressource non trouvée
- **409** : Conflit (ressource déjà existante)
- **500** : Erreur serveur

### 📝 Collection Postman

Importez cette collection dans Postman pour tester rapidement toutes les APIs :

```json
{
  "info": {
    "name": "Alissa School API",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  "variable": [
    {
      "key": "baseUrl",
      "value": "http://localhost:3000"
    },
    {
      "key": "token",
      "value": ""
    }
  ]
}
```

## 🔍 Debugging

### Logs
```bash
# Voir les logs en temps réel
docker-compose logs -f backend

# Logs spécifiques
tail -f logs/combined.log
tail -f logs/error.log
```

### Base de Données
```bash
# Connexion MySQL
docker-compose exec mysql mysql -u root -p alissa_school

# Voir les tables
SHOW TABLES;

# Voir la structure d'une table
DESCRIBE users;
```

## 🤝 Contribution

1. Fork le projet
2. Créer une branche feature (`git checkout -b feature/AmazingFeature`)
3. Commit les changements (`git commit -m 'Add some AmazingFeature'`)
4. Push vers la branche (`git push origin feature/AmazingFeature`)
5. Ouvrir une Pull Request

## 📄 Licence

Ce projet est sous licence MIT. Voir le fichier `LICENSE` pour plus de détails.

## 📞 Support

- **Email** : dev@alissa-ai.com
- **Documentation** : Wiki interne Alissa IA
- **Issues** : GitHub Issues

---

*Développé avec ❤️ par l'équipe Alissa IA*
