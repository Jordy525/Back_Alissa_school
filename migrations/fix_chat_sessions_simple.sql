-- Migration simplifiée pour corriger les tables de chat
-- Ajouter subject_id à chat_sessions et améliorer la structure

-- Ajouter la colonne subject_id à chat_sessions
ALTER TABLE `chat_sessions` 
ADD COLUMN `subject_id` varchar(36) DEFAULT NULL AFTER `user_id`,
ADD COLUMN `session_type` enum('general','subject_specific') DEFAULT 'general' AFTER `subject_id`,
ADD COLUMN `is_active` tinyint(1) DEFAULT 1 AFTER `session_type`;

-- Ajouter un index pour subject_id
ALTER TABLE `chat_sessions`
ADD KEY `idx_subject_id` (`subject_id`),
ADD KEY `idx_user_subject` (`user_id`, `subject_id`),
ADD KEY `idx_session_type` (`session_type`);

-- Ajouter des colonnes utiles à chat_messages
ALTER TABLE `chat_messages`
ADD COLUMN `message_type` enum('text','voice','image') DEFAULT 'text' AFTER `role`,
ADD COLUMN `metadata` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL AFTER `context_data`;

-- Ajouter des index pour améliorer les performances
ALTER TABLE `chat_messages`
ADD KEY `idx_role` (`role`),
ADD KEY `idx_message_type` (`message_type`),
ADD KEY `idx_created_at` (`created_at`);
