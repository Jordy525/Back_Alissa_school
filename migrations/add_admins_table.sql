-- Créer la table admins si elle n'existe pas
CREATE TABLE IF NOT EXISTS admins (
  id varchar(36) NOT NULL,
  user_id varchar(36) DEFAULT NULL,
  email varchar(255) DEFAULT NULL,
  created_at timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uniq_user (user_id),
  UNIQUE KEY uniq_email (email)
);

-- Optionnel: promouvoir un utilisateur existant comme admin par email
-- INSERT INTO admins (id, user_id, email) VALUES ('admin-seed-001', NULL, 'admin@alissa-school.com');

