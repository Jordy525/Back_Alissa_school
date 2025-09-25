# Guide d’implémentation du tableau de bord administrateur

Ce guide décrit la structure du tableau de bord admin côté front et les points d’intégration backend.

## Structure UI
- Page: `school-front-main/src/pages/Admin/AdminDashboard.tsx`
- Onglets:
  - Vue d’ensemble (statistiques + actions rapides navigantes)
  - Gestion des élèves
  - Gestion des documents (`DocumentsPage`)
  - Configuration (inclut le bouton “Se déconnecter”)

## Données et endpoints
- Statistiques générales: `GET /api/admin/stats`
- Élèves:
  - Liste: `GET /api/admin/students?search=&classe=&page=&limit=`
  - Modification: `PUT /api/admin/students/:id`
  - Suppression: `DELETE /api/admin/students/:id`
- Documents (admin):
  - Liste: `GET /api/admin/documents`
  - Création: `POST /api/admin/documents` (multipart: file, title, description, subject_id, classe, categorie)
  - Mise à jour: `PUT /api/admin/documents/:id`
  - Suppression: `DELETE /api/admin/documents/:id`

## Documents côté élève
- Liste filtrée: `GET /api/documents?subject_id=...&categorie=(book|methodology)`
- Lecture inline (PDF): `GET /api/documents/:id/view?token=...`
- Téléchargement: `GET /api/documents/:id/download` (ou `?inline=1` pour inline)

## Authentification
- Contexte: `src/contexts/AuthContext.tsx` (front)
- Token JWT en `Authorization: Bearer <token>` (front → back)
- Bouton de déconnexion: onglet Configuration (front) → `logout()` du contexte

## Stockage des fichiers
- Côté back, le chemin d’upload est configurable via `UPLOAD_DIR`.
- En environnement non persistant, ré‑uploader après redeploy, ou utiliser un stockage objet.

## Navigation et actions
- Les “Actions rapides” de la vue d’ensemble déclenchent `setActiveTab(...)` pour naviguer vers l’onglet cible.

## Débogage
- Vérifier les logs:
  - `[DOCS_LIST]` lors des listes
  - `[DOCS_VIEW]` pour l’inline
  - `[ADMIN_UPLOAD]`/`[DOCS_UPLOAD]` pour l’initialisation du dossier

## 🗄️ **Base de Données**

### **Nouvelles Tables Créées**

1. **`quiz_results`** - Résultats des quiz des utilisateurs
2. **`achievements`** - Succès disponibles
3. **`user_achievements`** - Succès débloqués par les utilisateurs

### **Colonnes Ajoutées à `users`**

- `phone_number` - Numéro de téléphone
- `age_range` - Tranche d'âge (`< 13 ans`, `13-17 ans`, `18+ ans`)
- `classe` - Classe de l'utilisateur (`6eme`, `5eme`, etc.)
- `matieres` - Matières sélectionnées (JSON)
- `langue_gabonaise` - Langue gabonaise choisie

## 🔌 **Endpoints API**

### **Authentification**
- `POST /api/frontend/register` - Inscription
- `POST /api/frontend/login` - Connexion
- `POST /api/frontend/google-login` - Connexion Google
- `POST /api/frontend/logout` - Déconnexion

### **Profil Utilisateur**
- `GET /api/frontend/profile` - Obtenir le profil
- `PUT /api/frontend/class` - Sélectionner la classe
- `PUT /api/frontend/subjects` - Sélectionner les matières
- `PUT /api/frontend/language` - Sélectionner la langue

### **Quiz et Progression**
- `POST /api/frontend/quiz-result` - Sauvegarder un résultat de quiz
- `GET /api/frontend/quiz-results/:matiere` - Obtenir les résultats par matière
- `GET /api/frontend/progress` - Obtenir tout le progrès
- `GET /api/frontend/progress/:matiere` - Obtenir le progrès d'une matière

## 🛠️ **Intégration Frontend**

### **1. Remplacer le Service de Stockage**

```typescript
// Avant (localStorage)
import { saveUserProfile, getUserProfile } from '@/services/storage';

// Après (API)
import backendService from '@/services/backendSe
### **2. Modifier les Pages d'Authentification**

#### **Login.tsx**
```typescript
// Remplacer la logique de simulation par des appels APIS
const handleManualSignUp = async (e: React.FormEvent) => {
  e.preventDefault();
  setIsLoading(true);

  try {
    const { user, token } = await backendService.register({
      name: fullName.trim(),
      email: email.trim() || undefined,
      phoneNumber: phoneNumber.trim(),
      ageRange,
      password: password.trim()
    });

    // Sauvegarder le token
    localStorage.setItem('auth_token', token);
    
    // Créer l'effet confetti
    createConfetti();
    
    setTimeout(() => {
      navigate('/choose-class');
    }, 1000);
  } catch (error) {
    alert('Erreur lors de l\'inscription: ' + error.message);
  } finally {
    setIsLoading(false);
  }
};
```

#### **ChooseClass.tsx**
```typescript
const handleContinue = async () => {
  if (!selectedClass) return;

  setIsLoading(true);

  try {
    await backendService.selectClass(selectedClass);
    
    // Créer l'effet confetti
    createConfetti();
    
    setTimeout(() => {
      navigate('/choose-subjects');
    }, 1500);
  } catch (error) {
    alert('Erreur lors de la sélection de classe: ' + error.message);
  } finally {
    setIsLoading(false);
  }
};
```

### **3. Modifier le Dashboard**

```typescript
useEffect(() => {
  const loadUserData = async () => {
    try {
      // Initialiser le service avec le token
      const token = localStorage.getItem('auth_token');
      if (token) {
        backendService.setToken(token);
      }

      // Vérifier la connexion
      if (!(await backendService.isUserLoggedIn())) {
        navigate('/login');
        return;
      }

      // Charger le profil
      const userProfile = await backendService.getUserProfile();
      if (!userProfile) {
        navigate('/login');
        return;
      }

      // Vérifier les étapes de configuration
      if (!userProfile.classe) {
        navigate('/choose-class');
        return;
      }

      if (!userProfile.matieres?.length) {
        navigate('/choose-subjects');
        return;
      }

      if (!userProfile.langueGabonaise) {
        navigate('/choose-language');
        return;
      }

      // Charger les données
      setProfile(userProfile);
      setProgress(await backendService.getAllProgress());
      setAchievements(await backendService.getAchievements());
      setRecentQuizzes(await backendService.getQuizResultsLocal());
      setMotivationalMessage(backendService.getRandomMotivationalMessage());
    } catch (error) {
      console.error('Erreur lors du chargement:', error);
      navigate('/login');
    }
  };

  loadUserData();
}, [navigate]);
```

### **4. Modifier la Gestion des Quiz**

```typescript
// Dans SubjectDetail.tsx ou une page de quiz
const handleQuizComplete = async (quizData: QuizResult) => {
  try {
    // Sauvegarder via l'API
    await backendService.saveQuizResult({
      matiere: quizData.matiere,
      score: quizData.score,
      maxScore: quizData.maxScore,
      percentage: quizData.percentage,
      questions: quizData.questions
    });

    // Mettre à jour l'interface
    setQuizResults(prev => [...prev, quizData]);
    
    // Afficher un message de succès
    alert(`Quiz terminé ! Score: ${quizData.percentage}%`);
  } catch (error) {
    console.error('Erreur lors de la sauvegarde:', error);
    alert('Erreur lors de la sauvegarde du quiz');
  }
};
```

## 🚀 **Étapes d'Intégration**

### **1. Exécuter la Migration**
```bash
cd back
node run-frontend-migration.js
```

### **2. Démarrer le Backend**
```bash
cd back
npm run dev
```

### **3. Tester les Endpoints**
Utiliser la collection Postman fournie ou tester manuellement :
```bash
# Test d'inscription
curl -X POST http://localhost:3000/api/frontend/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test User",
    "email": "test@example.com",
    "phoneNumber": "+24112345678",
    "ageRange": "13-17 ans",
    "password": "password123"
  }'
```

### **4. Modifier le Frontend**
1. Remplacer les imports `@/services/storage` par `@/services/backendService`
2. Modifier les pages d'authentification
3. Mettre à jour le Dashboard
4. Adapter la gestion des quiz

### **5. Tester l'Intégration**
1. Inscription d'un nouvel utilisateur
2. Sélection de classe et matières
3. Complétion d'un quiz
4. Vérification de la progression

## 🔧 **Configuration**

### **Variables d'Environnement Backend**
```env
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=password
DB_NAME=alissa_school
JWT_SECRET=your-secret-key
GEMINI_API_KEY=your-gemini-key
```

### **Configuration Frontend**
```typescript
// Dans backendService.ts
const API_BASE_URL = 'http://localhost:3000/api/frontend';
```

## 🐛 **Débogage**

### **Problèmes Courants**

1. **Erreur CORS** : Vérifier la configuration CORS dans `server.js`
2. **Token manquant** : S'assurer que le token est sauvegardé et envoyé
3. **Erreur 401** : Vérifier l'authentification
4. **Erreur 500** : Vérifier les logs du serveur

### **Logs Utiles**
```bash
# Logs du serveur
cd back
npm run dev

# Logs de la base de données
mysql -u root -p alissa_school
SHOW TABLES;
SELECT * FROM users LIMIT 5;
```

## 📊 **Données de Test**

La migration crée :
- 1 utilisateur de test (`test@example.com`)
- 15 matières avec leurs leçons
- 2 quiz d'exemple
- 10 succès prédéfinis

## 🎯 **Avantages de l'Intégration**

1. **Données persistantes** - Plus de perte de données
2. **Synchronisation** - Données partagées entre appareils
3. **Sécurité** - Authentification et autorisation
4. **Scalabilité** - Support de nombreux utilisateurs
5. **Analytics** - Suivi des performances et progression

## 🔄 **Migration Graduelle**

Il est possible de migrer progressivement :
1. Commencer par l'authentification
2. Puis la sélection de classe/matières
3. Enfin les quiz et la progression

Cela permet de tester chaque partie individuellement.
