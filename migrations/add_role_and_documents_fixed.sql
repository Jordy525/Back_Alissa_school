-- Migration pour ajouter le système de rôles et de gestion des documents
-- Date: 2025-01-27

-- 1. Ajouter le champ role à la table users
ALTER TABLE `users` 
ADD COLUMN `role` ENUM('student', 'admin', 'super_admin') DEFAULT 'student' AFTER `google_id`;

-- 2. Créer la table documents pour gérer les livres et méthodologies
CREATE TABLE `documents` (
  `id` varchar(36) NOT NULL,
  `title` varchar(255) NOT NULL,
  `description` text DEFAULT NULL,
  `file_name` varchar(255) NOT NULL,
  `file_path` varchar(500) NOT NULL,
  `file_type` varchar(50) NOT NULL,
  `file_size` bigint(20) NOT NULL,
  `subject_id` varchar(36) NOT NULL,
  `classe` enum('6eme','5eme','4eme','3eme','seconde','premiere','terminale') NOT NULL,
  `document_type` enum('book', 'methodology', 'exercise', 'other') DEFAULT 'book',
  `is_active` tinyint(1) DEFAULT 1,
  `download_count` int(11) DEFAULT 0,
  `created_by` varchar(36) NOT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_subject_classe` (`subject_id`, `classe`),
  KEY `idx_created_by` (`created_by`),
  KEY `idx_document_type` (`document_type`),
  KEY `idx_is_active` (`is_active`),
  CONSTRAINT `fk_documents_subject` FOREIGN KEY (`subject_id`) REFERENCES `subjects` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_documents_created_by` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Créer la table document_categories pour organiser les documents
CREATE TABLE `document_categories` (
  `id` varchar(36) NOT NULL,
  `name` varchar(100) NOT NULL,
  `description` text DEFAULT NULL,
  `color` varchar(50) DEFAULT NULL,
  `icon` varchar(100) DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT 1,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_name` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Créer la table de liaison documents-catégories
CREATE TABLE `document_category_links` (
  `id` varchar(36) NOT NULL,
  `document_id` varchar(36) NOT NULL,
  `category_id` varchar(36) NOT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_document_category` (`document_id`, `category_id`),
  KEY `idx_document_id` (`document_id`),
  KEY `idx_category_id` (`category_id`),
  CONSTRAINT `fk_dcl_document` FOREIGN KEY (`document_id`) REFERENCES `documents` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_dcl_category` FOREIGN KEY (`category_id`) REFERENCES `document_categories` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. Insérer quelques catégories par défaut
INSERT INTO `document_categories` (`id`, `name`, `description`, `color`, `icon`) VALUES
('cat-001', 'Manuels scolaires', 'Livres de cours officiels', '#3B82F6', 'BookOpen'),
('cat-002', 'Méthodologies', 'Guides et méthodes d\'apprentissage', '#10B981', 'Lightbulb'),
('cat-003', 'Exercices', 'Cahiers d\'exercices et devoirs', '#F59E0B', 'FileText'),
('cat-004', 'Ressources complémentaires', 'Documents d\'approfondissement', '#8B5CF6', 'Download');

-- 6. Créer un utilisateur admin par défaut (mot de passe: admin123)
-- Note: Le mot de passe doit être hashé avec bcrypt
INSERT INTO `users` (`id`, `email`, `password_hash`, `name`, `role`, `created_at`) VALUES
('admin-001', 'admin@alissa-school.com', '$2b$10$rQZ8K9vL8xH5mN3pQ7R2uO1wE4tY6uI8oP2aS5dF7gH9jK1lM3nQ5rS7tU9vW', 'Administrateur Alissa School', 'admin', NOW());

-- 7. Créer un index pour optimiser les requêtes par classe et matière
CREATE INDEX `idx_documents_class_subject` ON `documents` (`classe`, `subject_id`, `is_active`);
