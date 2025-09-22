-- Migration pour ajouter l'utilisateur admin
-- Exécutez ce script sur votre base de données de production

-- 1. Ajouter la colonne role si elle n'existe pas
ALTER TABLE users ADD COLUMN role ENUM('student', 'teacher', 'admin', 'super_admin') DEFAULT 'student' AFTER classe;

-- 2. Créer l'utilisateur admin
INSERT INTO users (
    id,
    email,
    name,
    password_hash,
    classe,
    role,
    total_points,
    level,
    created_at
) VALUES (
    UUID(),
    'admin@alissa-school.com',
    'Administrateur Alissa',
    '$2a$12$vEMYb7V1e1mbAk3wZHN2x.Dm0ISGeVZ/5GvMaeXHo0KsJPfspJdYK',
    '6eme',
    'admin',
    0,
    1,
    NOW()
);

-- 3. Vérifier que l'utilisateur a été créé
SELECT 
    id, 
    email, 
    name, 
    role, 
    classe,
    created_at 
FROM users 
WHERE email = 'admin@alissa-school.com';

-- 4. Vérifier tous les utilisateurs admin
SELECT 
    id, 
    email, 
    name, 
    role 
FROM users 
WHERE role IN ('admin', 'super_admin');
