# Configuration du Système d'Administration

Ce guide explique comment configurer et utiliser le nouveau système d'administration basé sur la table `admins`.

## Problème Résolu

Le système utilisait auparavant le champ `role` dans la table `users` pour gérer les administrateurs. Maintenant, nous utilisons une table `admins` séparée pour une meilleure gestion des permissions.

## Structure de la Base de Données

### Table `admins`
```sql
CREATE TABLE `admins` (
  `id` varchar(36) NOT NULL,
  `user_id` varchar(36) DEFAULT NULL,
  `email` varchar(255) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
```

## Configuration Initiale

### 1. Ajouter votre premier administrateur

```bash
# Assurez-vous d'abord que l'utilisateur a créé un compte étudiant
npm run add-admin admin@example.com
```

### 2. Tester la configuration

```bash
node test-admin-auth.js
```

## Utilisation

### Backend - Routes disponibles

#### Authentification
- `POST /api/auth/login` - Connexion (détecte automatiquement les admins)
- `GET /api/auth/check-admin` - Vérifier le statut admin d'un utilisateur

#### Gestion des administrateurs
- `POST /api/admin-auth/add-admin` - Ajouter un administrateur
- `DELETE /api/admin-auth/remove-admin/:adminId` - Supprimer un administrateur  
- `GET /api/admin-auth/list-admins` - Lister tous les administrateurs

### Frontend - Pages disponibles

#### Pour les administrateurs
- `/admin/dashboard` - Dashboard principal admin
- `/admin/management` - Gestion des administrateurs
- `/admin/documents` - Gestion des documents

## Flux d'Authentification

1. **Connexion utilisateur** (`POST /api/auth/login`)
   - Vérification email/mot de passe dans la table `users`
   - Vérification du statut admin dans la table `admins`
   - Retour du rôle approprié (`admin` ou `student`)

2. **Redirection automatique**
   - Admin → `/admin/dashboard`
   - Étudiant non configuré → `/choose-class`
   - Étudiant configuré → `/dashboard`

## Middleware de Sécurité

### `requireAdmin`
Vérifie que l'utilisateur connecté est présent dans la table `admins`:

```javascript
const requireAdmin = async (req, res, next) => {
  const admins = await query(
    'SELECT id FROM admins WHERE user_id = ? LIMIT 1',
    [req.user.id]
  );

  if (!admins || admins.length === 0) {
    return res.status(401).json({
      success: false,
      error: { message: 'Accès administrateur requis' }
    });
  }
  
  req.user.role = 'admin';
  next();
};
```

## Commandes Utiles

```bash
# Ajouter un administrateur
npm run add-admin user@example.com

# Tester l'authentification admin
node test-admin-auth.js

# Démarrer le serveur en mode développement
npm run dev
```

## Dépannage

### Problème: L'utilisateur n'est pas redirigé vers le dashboard admin

1. Vérifiez que l'utilisateur est dans la table `admins`:
   ```sql
   SELECT * FROM admins WHERE email = 'user@example.com';
   ```

2. Vérifiez les logs de connexion dans la console du navigateur

3. Testez l'API directement:
   ```bash
   curl -X GET "http://localhost:3000/api/auth/check-admin" \
        -H "Authorization: Bearer YOUR_TOKEN"
   ```

### Problème: Erreur lors de l'ajout d'un administrateur

1. Assurez-vous que l'utilisateur existe dans la table `users`
2. Vérifiez que l'email n'est pas déjà dans la table `admins`
3. Vérifiez les permissions de la base de données

## Sécurité

- Les mots de passe sont hachés avec bcrypt (12 rounds)
- Les tokens JWT expirent après 7 jours par défaut
- Toutes les routes admin nécessitent une authentification
- La vérification admin se fait à chaque requête

## Migration depuis l'ancien système

Si vous aviez des utilisateurs avec `role = 'admin'` dans la table `users`, vous pouvez les migrer:

```sql
INSERT INTO admins (id, user_id, email, created_at)
SELECT 
  UUID(), 
  id, 
  email, 
  NOW()
FROM users 
WHERE role = 'admin' OR role = 'super_admin';
```