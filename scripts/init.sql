-- Script d'initialisation de la base de données MySQL
-- Ce script est exécuté automatiquement lors du premier démarrage du conteneur MySQL

-- Création de la base de données si elle n'existe pas
CREATE DATABASE IF NOT EXISTS alissa_school CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Utilisation de la base de données
USE alissa_school;

-- Configuration des paramètres MySQL pour de meilleures performances
SET GLOBAL innodb_buffer_pool_size = 256M;
SET GLOBAL max_connections = 200;
SET GLOBAL query_cache_size = 64M;
SET GLOBAL query_cache_type = 1;

-- Configuration du timezone
SET GLOBAL time_zone = '+00:00';

-- Création d'un utilisateur dédié pour l'application (si pas déjà créé)
-- CREATE USER IF NOT EXISTS 'alissa_user'@'%' IDENTIFIED BY 'alissa_password';
-- GRANT ALL PRIVILEGES ON alissa_school.* TO 'alissa_user'@'%';
-- FLUSH PRIVILEGES;

-- Message de confirmation
SELECT 'Base de données Alissa School initialisée avec succès' as status;
