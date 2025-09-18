-- Migration pour ajouter les colonnes manquantes à la table quizzes
-- pour supporter la génération automatique de quiz

ALTER TABLE `quizzes` 
ADD COLUMN `difficulty` ENUM('facile', 'moyen', 'difficile') DEFAULT 'moyen' AFTER `passing_score`,
ADD COLUMN `level` VARCHAR(50) DEFAULT NULL AFTER `difficulty`,
ADD COLUMN `content_type` ENUM('general', 'summary', 'search') DEFAULT 'general' AFTER `level`,
ADD COLUMN `content_source` TEXT DEFAULT NULL AFTER `content_type`,
ADD COLUMN `created_by` VARCHAR(36) DEFAULT NULL AFTER `content_source`;

-- Ajouter une clé étrangère pour created_by
ALTER TABLE `quizzes` 
ADD CONSTRAINT `quizzes_ibfk_3` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL;

-- Ajouter des index pour améliorer les performances
ALTER TABLE `quizzes` 
ADD KEY `idx_difficulty` (`difficulty`),
ADD KEY `idx_content_type` (`content_type`),
ADD KEY `idx_created_by` (`created_by`),
ADD KEY `idx_subject_created_by` (`subject_id`, `created_by`);
