-- =============================================
-- CRÉATION D'UN UTILISATEUR ADMINISTRATEUR
-- =============================================

-- 1. Créer un nouvel utilisateur admin
INSERT INTO users (
    id, 
    email, 
    name, 
    first_name, 
    last_name, 
    classe, 
    role, 
    total_points, 
    level, 
    created_at
) VALUES (
    UUID(), 
    'admin@alissa-school.com', 
    'Administrateur Alissa', 
    'Admin', 
    'Alissa', 
    '6eme', -- Classe par défaut (peut être changée)
    'admin', 
    0, 
    1, 
    NOW()
);

-- 2. Ou transformer un utilisateur existant en admin
-- Remplacez 'email@example.com' par l'email de l'utilisateur à promouvoir
UPDATE users 
SET role = 'admin' 
WHERE email = 'email@example.com';

-- 3. Vérifier que l'utilisateur a bien été créé/modifié
SELECT 
    id, 
    email, 
    name, 
    first_name, 
    last_name, 
    classe, 
    role, 
    created_at 
FROM users 
WHERE role IN ('admin', 'super_admin');

-- 4. Si vous voulez créer un super admin
UPDATE users 
SET role = 'super_admin' 
WHERE email = 'admin@alissa-school.com';

-- 5. Vérifier les rôles dans la base
SELECT 
    role, 
    COUNT(*) as count 
FROM users 
GROUP BY role;
