-- phpMyAdmin SQL Dump
-- version 5.2.2
-- https://www.phpmyadmin.net/
--
-- Host: mysql-zigh-portfolio.alwaysdata.net
-- Generation Time: Sep 08, 2025 at 12:43 PM
-- Server version: 10.11.13-MariaDB
-- PHP Version: 7.4.33

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `zigh-portfolio_alissa_school`
--

-- --------------------------------------------------------

--
-- Table structure for table `achievements`
--

CREATE TABLE `achievements` (
  `id` varchar(36) NOT NULL,
  `title` varchar(255) NOT NULL,
  `description` text NOT NULL,
  `icon` varchar(100) DEFAULT NULL,
  `points` int(11) NOT NULL,
  `rarity` enum('common','rare','epic','legendary') DEFAULT NULL,
  `requirements` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`requirements`)),
  `is_active` tinyint(1) DEFAULT 1,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `achievements`
--

INSERT INTO `achievements` (`id`, `title`, `description`, `icon`, `points`, `rarity`, `requirements`, `is_active`, `created_at`, `updated_at`) VALUES
('17342264-f813-42b2-97ff-f1915374aa9b', 'Étudiant assidu', 'Terminez 10 leçons', '📖', 200, 'rare', '{\"type\":\"lesson_completed\",\"count\":10}', 1, '2025-09-04 11:02:14', '2025-09-04 11:02:14'),
('5b484fa8-67b1-4255-866c-a8b8cf00f7a9', 'Explorateur', 'Découvrez 3 matières différentes', '🗺️', 150, 'rare', '{\"type\":\"subjects_explored\",\"count\":3}', 1, '2025-09-04 11:02:15', '2025-09-04 11:02:15'),
('978e5a4e-a4ce-4765-91ea-45a2200f85c3', 'Premier pas', 'Terminez votre première leçon', '👶', 50, 'common', '{\"type\":\"lesson_completed\",\"count\":1}', 1, '2025-09-04 11:02:14', '2025-09-04 11:02:14'),
('achievement_1', 'Premier Pas', 'Complétez votre premier quiz', 'fa-rocket', 10, 'common', '{\"type\": \"first_quiz\"}', 1, '2025-09-06 11:22:49', '2025-09-06 11:22:49'),
('achievement_10', 'Légende', 'Débloquez tous les autres succès', 'fa-star', 500, 'legendary', '{\"type\": \"all_achievements\"}', 1, '2025-09-06 11:22:49', '2025-09-06 11:22:49'),
('achievement_2', 'Score Parfait', 'Obtenez 100% à un quiz', 'fa-crown', 50, 'rare', '{\"type\": \"perfect_score\", \"percentage\": 100}', 1, '2025-09-06 11:22:49', '2025-09-06 11:22:49'),
('achievement_3', 'Excellent Travail', 'Obtenez 80% ou plus à un quiz', 'fa-medal', 25, 'common', '{\"type\": \"good_score\", \"percentage\": 80}', 1, '2025-09-06 11:22:49', '2025-09-06 11:22:49'),
('achievement_4', 'Explorateur', 'Découvrez 5 matières différentes', 'fa-compass', 30, 'common', '{\"type\": \"subjects_discovered\", \"count\": 5}', 1, '2025-09-06 11:22:49', '2025-09-06 11:22:49'),
('achievement_5', 'Marathonien', 'Complétez 10 quiz en une journée', 'fa-trophy', 100, 'epic', '{\"type\": \"daily_quizzes\", \"count\": 10}', 1, '2025-09-06 11:22:49', '2025-09-06 11:22:49'),
('achievement_6', 'Maître des Langues', 'Excellez dans toutes les matières de langues', 'fa-language', 75, 'rare', '{\"type\": \"language_mastery\"}', 1, '2025-09-06 11:22:49', '2025-09-06 11:22:49'),
('achievement_7', 'Scientifique', 'Excellez dans toutes les matières scientifiques', 'fa-flask', 75, 'rare', '{\"type\": \"science_mastery\"}', 1, '2025-09-06 11:22:49', '2025-09-06 11:22:49'),
('achievement_8', 'Historien', 'Excellez dans l\'histoire et la géographie', 'fa-landmark', 75, 'rare', '{\"type\": \"history_mastery\"}', 1, '2025-09-06 11:22:49', '2025-09-06 11:22:49'),
('achievement_9', 'Artiste', 'Excellez dans les matières artistiques', 'fa-palette', 75, 'rare', '{\"type\": \"art_mastery\"}', 1, '2025-09-06 11:22:49', '2025-09-06 11:22:49'),
('cf6bd25f-646f-4b8e-bb20-8cfc99aec0d3', 'Série de victoires', 'Terminez 5 leçons consécutives', '🔥', 300, 'epic', '{\"type\":\"consecutive_lessons\",\"count\":5}', 1, '2025-09-04 11:02:14', '2025-09-04 11:02:14'),
('f1807f99-9171-4334-96a5-6000100b7bfd', 'Maître des quiz', 'Obtenez un score parfait à un quiz', '🏆', 500, 'legendary', '{\"type\":\"perfect_quiz_score\",\"count\":1}', 1, '2025-09-04 11:02:14', '2025-09-04 11:02:14');

-- --------------------------------------------------------

--
-- Table structure for table `chat_messages`
--

CREATE TABLE `chat_messages` (
  `id` varchar(36) NOT NULL,
  `session_id` varchar(36) NOT NULL,
  `role` enum('user','assistant') NOT NULL,
  `content` longtext NOT NULL,
  `context_data` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`context_data`)),
  `created_at` timestamp NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `chat_sessions`
--

CREATE TABLE `chat_sessions` (
  `id` varchar(36) NOT NULL,
  `user_id` varchar(36) NOT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `lessons`
--

CREATE TABLE `lessons` (
  `id` varchar(36) NOT NULL,
  `subject_id` varchar(36) NOT NULL,
  `class_level` enum('6ème','5ème','4ème','3ème','2nde','1ère','Terminale') NOT NULL,
  `title` varchar(255) NOT NULL,
  `description` text DEFAULT NULL,
  `content` longtext DEFAULT NULL,
  `estimated_duration` int(11) DEFAULT NULL,
  `difficulty` enum('easy','medium','hard') DEFAULT NULL,
  `points_reward` int(11) DEFAULT 25,
  `order_index` int(11) DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT 1,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `lessons`
--

INSERT INTO `lessons` (`id`, `subject_id`, `class_level`, `title`, `description`, `content`, `estimated_duration`, `difficulty`, `points_reward`, `order_index`, `is_active`, `created_at`, `updated_at`) VALUES
('02919fe7-c634-4922-8baa-813dae6344d1', '3cc53aee-38f7-4721-b8e1-1f1c32f814e2', '6ème', 'Introduction aux fractions', 'Découverte des fractions et de leur utilisation', 'Les fractions représentent une partie d\'un tout. Le numérateur indique combien de parts on prend, le dénominateur indique en combien de parts le tout est divisé.', 30, 'easy', 25, 1, 1, '2025-09-04 11:02:13', '2025-09-04 11:02:13'),
('b891ebe9-f124-4150-85e7-cdf4367e1449', '3cc53aee-38f7-4721-b8e1-1f1c32f814e2', '6ème', 'Multiplication et division de fractions', 'Maîtriser la multiplication et la division des fractions', 'Pour multiplier des fractions, on multiplie les numérateurs entre eux et les dénominateurs entre eux. Pour diviser, on multiplie par l\'inverse.', 50, 'hard', 35, 3, 1, '2025-09-04 11:02:14', '2025-09-04 11:02:14'),
('e9fc24a3-89d3-4d1c-be34-141e19a32f1b', '3cc53aee-38f7-4721-b8e1-1f1c32f814e2', '6ème', 'Addition et soustraction de fractions', 'Apprendre à additionner et soustraire des fractions', 'Pour additionner ou soustraire des fractions, il faut d\'abord les réduire au même dénominateur, puis additionner ou soustraire les numérateurs.', 45, 'medium', 30, 2, 1, '2025-09-04 11:02:13', '2025-09-04 11:02:13'),
('lesson_geo_6_1', 'geographie', '6ème', 'La Terre dans l\'espace', 'Notions de base en géographie', 'Contenu de la leçon sur la Terre...', 30, 'easy', 10, 1, 1, '2025-09-06 11:22:50', '2025-09-06 11:22:50'),
('lesson_hist_6_1', 'histoire', '6ème', 'L\'Antiquité', 'Introduction à l\'histoire antique', 'Contenu de la leçon sur l\'Antiquité...', 35, 'easy', 10, 1, 1, '2025-09-06 11:22:50', '2025-09-06 11:22:50'),
('lesson_math_5_1', 'mathematiques', '5ème', 'Les équations simples', 'Résolution d\'équations du premier degré', 'Contenu de la leçon sur les équations...', 40, 'medium', 20, 1, 1, '2025-09-06 11:22:50', '2025-09-06 11:22:50'),
('lesson_math_6_1', 'mathematiques', '6ème', 'Les nombres entiers', 'Introduction aux nombres entiers', 'Contenu de la leçon sur les nombres entiers...', 30, 'easy', 10, 1, 1, '2025-09-06 11:22:50', '2025-09-06 11:22:50'),
('lesson_math_6_2', 'mathematiques', '6ème', 'Les fractions', 'Apprentissage des fractions', 'Contenu de la leçon sur les fractions...', 45, 'medium', 15, 2, 1, '2025-09-06 11:22:50', '2025-09-06 11:22:50');

-- --------------------------------------------------------

--
-- Table structure for table `quizzes`
--

CREATE TABLE `quizzes` (
  `id` varchar(36) NOT NULL,
  `lesson_id` varchar(36) DEFAULT NULL,
  `subject_id` varchar(36) NOT NULL,
  `title` varchar(255) NOT NULL,
  `description` text DEFAULT NULL,
  `questions` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`questions`)),
  `time_limit` int(11) DEFAULT NULL,
  `passing_score` int(11) DEFAULT 250,
  `is_active` tinyint(1) DEFAULT 1,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `quizzes`
--

INSERT INTO `quizzes` (`id`, `lesson_id`, `subject_id`, `title`, `description`, `questions`, `time_limit`, `passing_score`, `is_active`, `created_at`, `updated_at`) VALUES
('220459a2-fe68-4472-8658-635328ecd144', '02919fe7-c634-4922-8baa-813dae6344d1', '3cc53aee-38f7-4721-b8e1-1f1c32f814e2', 'Quiz sur les fractions', 'Testez vos connaissances sur les fractions', '[{\"id\":\"q1\",\"question\":\"Que représente le numérateur dans une fraction ?\",\"options\":[\"Le nombre de parts prises\",\"Le nombre total de parts\",\"La valeur de la fraction\",\"Le dénominateur\"],\"correctAnswer\":0,\"explanation\":\"Le numérateur indique combien de parts on prend du tout.\"},{\"id\":\"q2\",\"question\":\"Dans la fraction 3/4, que représente le 4 ?\",\"options\":[\"Le numérateur\",\"Le dénominateur\",\"La valeur totale\",\"Le résultat\"],\"correctAnswer\":1,\"explanation\":\"Le 4 est le dénominateur, il indique en combien de parts le tout est divisé.\"},{\"id\":\"q3\",\"question\":\"Quelle fraction représente la moitié ?\",\"options\":[\"1/3\",\"2/4\",\"3/6\",\"2/4 et 3/6\"],\"correctAnswer\":3,\"explanation\":\"1/2 = 2/4 = 3/6, toutes ces fractions représentent la moitié.\"}]', 10, 250, 1, '2025-09-04 11:02:14', '2025-09-04 11:02:14');

-- --------------------------------------------------------

--
-- Table structure for table `quiz_attempts`
--

CREATE TABLE `quiz_attempts` (
  `id` varchar(36) NOT NULL,
  `quiz_id` varchar(36) NOT NULL,
  `user_id` varchar(36) NOT NULL,
  `score` int(11) NOT NULL,
  `total_questions` int(11) NOT NULL,
  `correct_answers` int(11) NOT NULL,
  `time_spent` int(11) DEFAULT NULL,
  `answers` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`answers`)),
  `points_earned` int(11) DEFAULT NULL,
  `completed_at` timestamp NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `quiz_results`
--

CREATE TABLE `quiz_results` (
  `id` varchar(36) NOT NULL,
  `user_id` varchar(36) NOT NULL,
  `matiere` varchar(50) NOT NULL,
  `score` int(11) NOT NULL,
  `max_score` int(11) NOT NULL,
  `percentage` decimal(5,2) NOT NULL,
  `questions` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`questions`)),
  `created_at` timestamp NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `quiz_results`
--

INSERT INTO `quiz_results` (`id`, `user_id`, `matiere`, `score`, `max_score`, `percentage`, `questions`, `created_at`) VALUES
('3efe1b35-69d7-4f54-a3b4-34c21eb04e10', 'e636f1d4-f881-4123-9433-3d07469fd1a6', 'mathematiques', 18, 20, 90.00, '[{\"question\":\"Test question\",\"options\":[\"A\",\"B\",\"C\",\"D\"],\"correctAnswer\":0}]', '2025-09-06 11:33:56'),
('540c15b3-4884-4188-8174-0879313a64a8', 'a8cc5a53-79f3-4b01-a09d-d9ec666a31c9', 'mathematiques', 18, 20, 90.00, '[]', '2025-09-08 09:20:32'),
('bf248671-b371-4707-a59f-4bf38665c63e', '14c62ceb-2d46-4135-9323-487582ae06d8', 'mathematiques', 19, 20, 95.00, '[]', '2025-09-08 09:44:12'),
('cfdd3b3b-4e38-4702-bc03-e4e2f458c930', '501c7e9c-5863-4593-9636-d179082408df', 'mathematiques', 18, 20, 90.00, '[{\"question\":\"Test question\",\"options\":[\"A\",\"B\",\"C\",\"D\"],\"correctAnswer\":0}]', '2025-09-06 11:56:27');

-- --------------------------------------------------------

--
-- Table structure for table `subjects`
--

CREATE TABLE `subjects` (
  `id` varchar(36) NOT NULL,
  `name` varchar(255) NOT NULL,
  `description` text DEFAULT NULL,
  `icon` varchar(100) DEFAULT NULL,
  `color` varchar(50) DEFAULT NULL,
  `class_levels` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`class_levels`)),
  `total_lessons` int(11) DEFAULT 0,
  `is_active` tinyint(1) DEFAULT 1,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `subjects`
--

INSERT INTO `subjects` (`id`, `name`, `description`, `icon`, `color`, `class_levels`, `total_lessons`, `is_active`, `created_at`, `updated_at`) VALUES
('2ba7d006-d18a-4316-964f-7d096b952414', 'Histoire-Géographie', 'Découverte de l\'histoire et de la géographie', '🌍', '#10B981', '[\"6ème\",\"5ème\",\"4ème\",\"3ème\",\"2nde\",\"1ère\",\"Terminale\"]', 0, 1, '2025-09-04 11:02:13', '2025-09-04 11:02:13'),
('3cc53aee-38f7-4721-b8e1-1f1c32f814e2', 'Mathématiques', 'Apprentissage des concepts mathématiques fondamentaux', '🧮', '#3B82F6', '[\"6ème\",\"5ème\",\"4ème\",\"3ème\",\"2nde\",\"1ère\",\"Terminale\"]', 3, 1, '2025-09-04 11:02:12', '2025-09-04 11:02:15'),
('442007a7-7db0-4b18-ad2a-e6e06ff3bbf9', 'Sciences Physiques', 'Physique et chimie pour tous les niveaux', '⚗️', '#8B5CF6', '[\"6ème\",\"5ème\",\"4ème\",\"3ème\",\"2nde\",\"1ère\",\"Terminale\"]', 0, 1, '2025-09-04 11:02:13', '2025-09-04 11:02:13'),
('546e78d0-43f3-4734-9aed-71dd2a346e22', 'Anglais', 'Apprentissage de la langue anglaise', '🇬🇧', '#06B6D4', '[\"6ème\",\"5ème\",\"4ème\",\"3ème\",\"2nde\",\"1ère\",\"Terminale\"]', 0, 1, '2025-09-04 11:02:13', '2025-09-04 11:02:13'),
('5955c274-1bd7-43f2-b2b6-5078f898fdff', 'Sciences de la Vie et de la Terre', 'Biologie et sciences de la terre', '🔬', '#F59E0B', '[\"6ème\",\"5ème\",\"4ème\",\"3ème\",\"2nde\",\"1ère\",\"Terminale\"]', 0, 1, '2025-09-04 11:02:13', '2025-09-04 11:02:13'),
('70d69148-c639-49b8-b40d-c726c3e3ee2e', 'Français', 'Maîtrise de la langue française et de la littérature', '📚', '#EF4444', '[\"6ème\",\"5ème\",\"4ème\",\"3ème\",\"2nde\",\"1ère\",\"Terminale\"]', 0, 1, '2025-09-04 11:02:13', '2025-09-04 11:02:13'),
('anglais', 'Anglais', 'Langue anglaise', 'fa-language', '#F59E0B', '[\"6eme\", \"5eme\", \"4eme\", \"3eme\", \"seconde\", \"premiere\", \"terminale\"]', 0, 1, '2025-09-06 11:22:50', '2025-09-06 11:22:50'),
('art_plastique', 'Art-plastique', 'Arts visuels', 'fa-palette', '#F59E0B', '[\"6eme\", \"5eme\", \"4eme\", \"3eme\", \"seconde\", \"premiere\", \"terminale\"]', 0, 1, '2025-09-06 11:22:50', '2025-09-06 11:22:50'),
('emc', 'Enseignement moral et civique', 'Éducation civique et morale', 'fa-balance-scale', '#6366F1', '[\"6eme\", \"5eme\", \"4eme\", \"3eme\", \"seconde\", \"premiere\", \"terminale\"]', 0, 1, '2025-09-06 11:22:50', '2025-09-06 11:22:50'),
('eps', 'Éducation physique et sportive', 'Sport et éducation physique', 'fa-running', '#EC4899', '[\"6eme\", \"5eme\", \"4eme\", \"3eme\", \"seconde\", \"premiere\", \"terminale\"]', 0, 1, '2025-09-06 11:22:50', '2025-09-06 11:22:50'),
('geographie', 'Géographie', 'Géographie générale', 'fa-globe', '#10B981', '[\"6eme\", \"5eme\", \"4eme\", \"3eme\", \"seconde\", \"premiere\", \"terminale\"]', 0, 1, '2025-09-06 11:22:50', '2025-09-06 11:22:50'),
('histoire', 'Histoire', 'Histoire générale', 'fa-landmark', '#EF4444', '[\"6eme\", \"5eme\", \"4eme\", \"3eme\", \"seconde\", \"premiere\", \"terminale\"]', 0, 1, '2025-09-06 11:22:50', '2025-09-06 11:22:50'),
('histoire_gabon', 'Histoire du Gabon', 'Histoire spécifique au Gabon', 'fa-landmark', '#DC2626', '[\"6eme\", \"5eme\", \"4eme\", \"3eme\", \"seconde\", \"premiere\", \"terminale\"]', 0, 1, '2025-09-06 11:22:50', '2025-09-06 11:22:50'),
('langue_gabonaise', 'Langue Gabonaise', 'Langues locales du Gabon', 'fa-language', '#F97316', '[\"6eme\", \"5eme\", \"4eme\", \"3eme\", \"seconde\", \"premiere\", \"terminale\"]', 0, 1, '2025-09-06 11:22:50', '2025-09-06 11:22:50'),
('mathematiques', 'Mathématiques', 'Sciences mathématiques', 'fa-calculator', '#3B82F6', '[\"6eme\", \"5eme\", \"4eme\", \"3eme\", \"seconde\", \"premiere\", \"terminale\"]', 0, 1, '2025-09-06 11:22:50', '2025-09-06 11:22:50'),
('musique', 'Musique', 'Éducation musicale', 'fa-music', '#F59E0B', '[\"6eme\", \"5eme\", \"4eme\", \"3eme\", \"seconde\", \"premiere\", \"terminale\"]', 0, 1, '2025-09-06 11:22:50', '2025-09-06 11:22:50'),
('philosophie', 'Philosophie', 'Réflexion philosophique', 'fa-balance-scale', '#6B7280', '[\"seconde\", \"premiere\", \"terminale\"]', 0, 1, '2025-09-06 11:22:50', '2025-09-06 11:22:50'),
('physique_chimie', 'Physique-Chimie', 'Sciences physiques et chimie', 'fa-flask', '#8B5CF6', '[\"6eme\", \"5eme\", \"4eme\", \"3eme\", \"seconde\", \"premiere\", \"terminale\"]', 0, 1, '2025-09-06 11:22:50', '2025-09-06 11:22:50'),
('ses', 'Sciences économiques et sociales', 'Économie et sociologie', 'fa-chart-line', '#8B5CF6', '[\"seconde\", \"premiere\", \"terminale\"]', 0, 1, '2025-09-06 11:22:50', '2025-09-06 11:22:50'),
('svt', 'Sciences de la vie et de la Terre', 'Biologie et géologie', 'fa-seedling', '#22C55E', '[\"6eme\", \"5eme\", \"4eme\", \"3eme\", \"seconde\", \"premiere\", \"terminale\"]', 0, 1, '2025-09-06 11:22:50', '2025-09-06 11:22:50'),
('theatre', 'Théâtre', 'Art dramatique', 'fa-theater-masks', '#EC4899', '[\"6eme\", \"5eme\", \"4eme\", \"3eme\", \"seconde\", \"premiere\", \"terminale\"]', 0, 1, '2025-09-06 11:22:50', '2025-09-06 11:22:50');

-- --------------------------------------------------------

--
-- Table structure for table `users`
--

CREATE TABLE `users` (
  `id` varchar(36) NOT NULL,
  `email` varchar(255) NOT NULL,
  `phone_number` varchar(20) DEFAULT NULL,
  `age_range` enum('< 13 ans','13-17 ans','18+ ans') DEFAULT NULL,
  `classe` enum('6eme','5eme','4eme','3eme','seconde','premiere','terminale') DEFAULT NULL,
  `matieres` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`matieres`)),
  `langue_gabonaise` enum('fang','myene','punu','nzebi','kota') DEFAULT NULL,
  `password_hash` varchar(255) DEFAULT NULL,
  `name` varchar(255) NOT NULL,
  `avatar_url` varchar(500) DEFAULT NULL,
  `selected_class` enum('6ème','5ème','4ème','3ème','2nde','1ère','Terminale') DEFAULT NULL,
  `selected_subjects` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`selected_subjects`)),
  `total_points` int(11) DEFAULT 0,
  `level` int(11) DEFAULT 1,
  `google_id` varchar(255) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `last_login_at` timestamp NULL DEFAULT NULL,
  `deleted_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `users`
--

INSERT INTO `users` (`id`, `email`, `phone_number`, `age_range`, `classe`, `matieres`, `langue_gabonaise`, `password_hash`, `name`, `avatar_url`, `selected_class`, `selected_subjects`, `total_points`, `level`, `google_id`, `created_at`, `updated_at`, `last_login_at`, `deleted_at`) VALUES
('b4b1e16e-104b-4ae6-80b9-7e63eb576f6b', 'sarah@gmail.com', '074297854', '13-17 ans', '3eme', '[\"histoire\",\"geographie\",\"anglais\",\"histoire_gabon\",\"langue_gabonaise\",\"mathematiques\"]', 'kota', '12345678', 'sarah', NULL, NULL, NULL, 0, 1, NULL, '2025-09-08 10:33:21', '2025-09-08 10:33:36', NULL, NULL);

-- --------------------------------------------------------

--
-- Table structure for table `user_achievements`
--

CREATE TABLE `user_achievements` (
  `id` varchar(36) NOT NULL,
  `user_id` varchar(36) NOT NULL,
  `achievement_id` varchar(36) NOT NULL,
  `unlocked_at` timestamp NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `user_lessons`
--

CREATE TABLE `user_lessons` (
  `id` varchar(36) NOT NULL,
  `user_id` varchar(36) NOT NULL,
  `lesson_id` varchar(36) NOT NULL,
  `completed_at` timestamp NULL DEFAULT current_timestamp(),
  `points_earned` int(11) DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `user_progress`
--

CREATE TABLE `user_progress` (
  `id` varchar(36) NOT NULL,
  `user_id` varchar(36) NOT NULL,
  `subject_id` varchar(36) NOT NULL,
  `lessons_completed` int(11) DEFAULT 0,
  `quizzes_completed` int(11) DEFAULT 0,
  `total_points` int(11) DEFAULT 0,
  `current_streak` int(11) DEFAULT 0,
  `longest_streak` int(11) DEFAULT 0,
  `last_activity_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Indexes for dumped tables
--

--
-- Indexes for table `achievements`
--
ALTER TABLE `achievements`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_rarity` (`rarity`),
  ADD KEY `idx_is_active` (`is_active`);

--
-- Indexes for table `chat_messages`
--
ALTER TABLE `chat_messages`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_session_id` (`session_id`),
  ADD KEY `idx_created_at` (`created_at`);

--
-- Indexes for table `chat_sessions`
--
ALTER TABLE `chat_sessions`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_user_id` (`user_id`);

--
-- Indexes for table `lessons`
--
ALTER TABLE `lessons`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unique_lesson_per_class` (`subject_id`,`class_level`,`order_index`),
  ADD KEY `idx_subject_id` (`subject_id`),
  ADD KEY `idx_difficulty` (`difficulty`),
  ADD KEY `idx_order_index` (`order_index`),
  ADD KEY `idx_is_active` (`is_active`),
  ADD KEY `idx_class_level` (`class_level`),
  ADD KEY `idx_subject_class` (`subject_id`,`class_level`);

--
-- Indexes for table `quizzes`
--
ALTER TABLE `quizzes`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_lesson_id` (`lesson_id`),
  ADD KEY `idx_subject_id` (`subject_id`),
  ADD KEY `idx_is_active` (`is_active`);

--
-- Indexes for table `quiz_attempts`
--
ALTER TABLE `quiz_attempts`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_quiz_id` (`quiz_id`),
  ADD KEY `idx_user_id` (`user_id`),
  ADD KEY `idx_completed_at` (`completed_at`);

--
-- Indexes for table `quiz_results`
--
ALTER TABLE `quiz_results`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_user_matiere` (`user_id`,`matiere`),
  ADD KEY `idx_created_at` (`created_at`);

--
-- Indexes for table `subjects`
--
ALTER TABLE `subjects`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_name` (`name`),
  ADD KEY `idx_is_active` (`is_active`);

--
-- Indexes for table `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `email` (`email`),
  ADD KEY `idx_email` (`email`),
  ADD KEY `idx_google_id` (`google_id`),
  ADD KEY `idx_selected_class` (`selected_class`);

--
-- Indexes for table `user_achievements`
--
ALTER TABLE `user_achievements`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unique_user_achievement` (`user_id`,`achievement_id`),
  ADD KEY `idx_user_id` (`user_id`),
  ADD KEY `idx_achievement_id` (`achievement_id`);

--
-- Indexes for table `user_lessons`
--
ALTER TABLE `user_lessons`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unique_user_lesson` (`user_id`,`lesson_id`),
  ADD KEY `idx_user_id` (`user_id`),
  ADD KEY `idx_lesson_id` (`lesson_id`);

--
-- Indexes for table `user_progress`
--
ALTER TABLE `user_progress`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unique_user_subject` (`user_id`,`subject_id`),
  ADD KEY `idx_user_id` (`user_id`),
  ADD KEY `idx_subject_id` (`subject_id`);

--
-- Constraints for dumped tables
--

--
-- Constraints for table `chat_messages`
--
ALTER TABLE `chat_messages`
  ADD CONSTRAINT `chat_messages_ibfk_1` FOREIGN KEY (`session_id`) REFERENCES `chat_sessions` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `chat_sessions`
--
ALTER TABLE `chat_sessions`
  ADD CONSTRAINT `chat_sessions_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `lessons`
--
ALTER TABLE `lessons`
  ADD CONSTRAINT `lessons_ibfk_1` FOREIGN KEY (`subject_id`) REFERENCES `subjects` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `quizzes`
--
ALTER TABLE `quizzes`
  ADD CONSTRAINT `quizzes_ibfk_1` FOREIGN KEY (`lesson_id`) REFERENCES `lessons` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `quizzes_ibfk_2` FOREIGN KEY (`subject_id`) REFERENCES `subjects` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `quiz_attempts`
--
ALTER TABLE `quiz_attempts`
  ADD CONSTRAINT `quiz_attempts_ibfk_1` FOREIGN KEY (`quiz_id`) REFERENCES `quizzes` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `quiz_attempts_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `user_achievements`
--
ALTER TABLE `user_achievements`
  ADD CONSTRAINT `user_achievements_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `user_achievements_ibfk_2` FOREIGN KEY (`achievement_id`) REFERENCES `achievements` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `user_lessons`
--
ALTER TABLE `user_lessons`
  ADD CONSTRAINT `user_lessons_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `user_lessons_ibfk_2` FOREIGN KEY (`lesson_id`) REFERENCES `lessons` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `user_progress`
--
ALTER TABLE `user_progress`
  ADD CONSTRAINT `user_progress_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `user_progress_ibfk_2` FOREIGN KEY (`subject_id`) REFERENCES `subjects` (`id`) ON DELETE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
