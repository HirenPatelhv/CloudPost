-- CloudPost Studio - High-Performance Database Schema
-- Optimized for Shared Hosting (MySQL 5.7+, MySQL 8.0+, MariaDB 10.3+, and SQLite 3)
-- Charset: utf8mb4 / utf8mb4_unicode_ci for full Unicode & emoji support

SET FOREIGN_KEY_CHECKS = 0;
SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
SET time_zone = "+00:00";

-- --------------------------------------------------------
-- Table structure for table `cp_users`
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `cp_users` (
  `id` VARCHAR(64) NOT NULL,
  `name` VARCHAR(255) NOT NULL,
  `email` VARCHAR(255) NOT NULL,
  `password_hash` VARCHAR(255) NOT NULL,
  `role` VARCHAR(32) NOT NULL DEFAULT 'member',
  `avatar` VARCHAR(512) DEFAULT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_user_email` (`email`),
  KEY `idx_user_role` (`role`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Table structure for table `cp_workspaces`
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `cp_workspaces` (
  `id` VARCHAR(64) NOT NULL,
  `user_id` VARCHAR(64) DEFAULT NULL,
  `name` VARCHAR(255) NOT NULL,
  `description` TEXT DEFAULT NULL,
  `type` VARCHAR(32) NOT NULL DEFAULT 'personal',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_ws_user` (`user_id`),
  KEY `idx_ws_created` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Table structure for table `cp_collections`
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `cp_collections` (
  `id` VARCHAR(64) NOT NULL,
  `workspace_id` VARCHAR(64) DEFAULT NULL,
  `user_id` VARCHAR(64) DEFAULT NULL,
  `name` VARCHAR(255) NOT NULL,
  `description` TEXT DEFAULT NULL,
  `data_json` LONGTEXT DEFAULT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_col_workspace` (`workspace_id`),
  KEY `idx_col_user` (`user_id`),
  KEY `idx_col_name` (`name`(64))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Table structure for table `cp_environments`
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `cp_environments` (
  `id` VARCHAR(64) NOT NULL,
  `workspace_id` VARCHAR(64) DEFAULT NULL,
  `user_id` VARCHAR(64) DEFAULT NULL,
  `name` VARCHAR(255) NOT NULL,
  `variables_json` LONGTEXT DEFAULT NULL,
  `is_active` TINYINT(1) NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`),
  KEY `idx_env_workspace` (`workspace_id`),
  KEY `idx_env_user` (`user_id`),
  KEY `idx_env_active` (`is_active`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Table structure for table `cp_history`
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `cp_history` (
  `id` VARCHAR(64) NOT NULL,
  `user_id` VARCHAR(64) DEFAULT NULL,
  `workspace_id` VARCHAR(64) DEFAULT NULL,
  `method` VARCHAR(16) NOT NULL,
  `url` TEXT NOT NULL,
  `status_code` INT NOT NULL DEFAULT 0,
  `response_time_ms` INT NOT NULL DEFAULT 0,
  `response_size_bytes` INT NOT NULL DEFAULT 0,
  `request_json` LONGTEXT DEFAULT NULL,
  `response_json` LONGTEXT DEFAULT NULL,
  `executed_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_hist_user_time` (`user_id`, `executed_at`),
  KEY `idx_hist_workspace` (`workspace_id`),
  KEY `idx_hist_status` (`status_code`),
  KEY `idx_hist_method` (`method`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Table structure for table `cp_activity_logs`
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `cp_activity_logs` (
  `id` VARCHAR(64) NOT NULL,
  `user_id` VARCHAR(64) DEFAULT NULL,
  `workspace_id` VARCHAR(64) DEFAULT NULL,
  `action` VARCHAR(64) NOT NULL,
  `target_name` VARCHAR(255) DEFAULT NULL,
  `target_type` VARCHAR(64) DEFAULT NULL,
  `details` TEXT DEFAULT NULL,
  `timestamp` VARCHAR(64) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_act_user` (`user_id`),
  KEY `idx_act_workspace` (`workspace_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Table structure for table `cp_saas_customers`
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `cp_saas_customers` (
  `id` VARCHAR(64) NOT NULL,
  `user_id` VARCHAR(64) DEFAULT NULL,
  `name` VARCHAR(255) NOT NULL,
  `email` VARCHAR(255) NOT NULL,
  `company_name` VARCHAR(255) NOT NULL DEFAULT '',
  `role` VARCHAR(128) NOT NULL DEFAULT 'Backend Engineer',
  `plan` VARCHAR(32) NOT NULL DEFAULT 'pro',
  `status` VARCHAR(32) NOT NULL DEFAULT 'active',
  `monthly_fee` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `billing_cycle` VARCHAR(16) NOT NULL DEFAULT 'monthly',
  `total_requests` BIGINT UNSIGNED NOT NULL DEFAULT 0,
  `monthly_quota` BIGINT UNSIGNED NOT NULL DEFAULT 999999999,
  `requests_this_month` BIGINT UNSIGNED NOT NULL DEFAULT 0,
  `data_transfer_mb` DECIMAL(12,3) NOT NULL DEFAULT 0.000,
  `compute_time_ms` BIGINT UNSIGNED NOT NULL DEFAULT 0,
  `ai_tokens_used` BIGINT UNSIGNED NOT NULL DEFAULT 0,
  `avg_latency_ms` INT UNSIGNED NOT NULL DEFAULT 45,
  `error_rate_percent` DECIMAL(5,2) NOT NULL DEFAULT 0.00,
  `total_cost` DECIMAL(10,4) NOT NULL DEFAULT 0.0000,
  `api_gateway_cost` DECIMAL(10,4) NOT NULL DEFAULT 0.0000,
  `bandwidth_cost` DECIMAL(10,4) NOT NULL DEFAULT 0.0000,
  `database_cost` DECIMAL(10,4) NOT NULL DEFAULT 0.0000,
  `ai_compute_cost` DECIMAL(10,4) NOT NULL DEFAULT 0.0000,
  `net_margin` DECIMAL(10,2) NOT NULL DEFAULT 29.00,
  `net_margin_percent` DECIMAL(5,2) NOT NULL DEFAULT 95.00,
  `health_score` TINYINT UNSIGNED NOT NULL DEFAULT 98,
  `country` VARCHAR(64) NOT NULL DEFAULT 'United States',
  `registered_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `last_active_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_saas_email` (`email`),
  KEY `idx_saas_plan_status` (`plan`, `status`),
  KEY `idx_saas_user_id` (`user_id`),
  KEY `idx_saas_registered` (`registered_at`),
  KEY `idx_saas_margin` (`net_margin`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Table structure for table `cp_saas_usage_logs`
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `cp_saas_usage_logs` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `customer_id` VARCHAR(64) NOT NULL,
  `endpoint` VARCHAR(512) DEFAULT NULL,
  `method` VARCHAR(16) NOT NULL DEFAULT 'GET',
  `status_code` INT NOT NULL DEFAULT 200,
  `latency_ms` INT UNSIGNED NOT NULL DEFAULT 0,
  `payload_bytes` INT UNSIGNED NOT NULL DEFAULT 0,
  `cost_incurred` DECIMAL(10,6) NOT NULL DEFAULT 0.000000,
  `logged_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_usage_cust_time` (`customer_id`, `logged_at`),
  KEY `idx_usage_status` (`status_code`),
  KEY `idx_usage_logged_at` (`logged_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Table structure for table `cp_app_state`
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `cp_app_state` (
  `user_id` VARCHAR(64) NOT NULL,
  `workspaces_json` LONGTEXT DEFAULT NULL,
  `collections_json` LONGTEXT DEFAULT NULL,
  `environments_json` LONGTEXT DEFAULT NULL,
  `activity_logs_json` LONGTEXT DEFAULT NULL,
  `recent_requests_json` LONGTEXT DEFAULT NULL,
  `settings_json` LONGTEXT DEFAULT NULL,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`user_id`),
  KEY `idx_state_updated` (`updated_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Table structure for table `cp_shares`
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `cp_shares` (
  `id` VARCHAR(64) NOT NULL,
  `type` VARCHAR(32) DEFAULT 'collection',
  `title` VARCHAR(255) DEFAULT NULL,
  `data_json` LONGTEXT DEFAULT NULL,
  `postman_json` LONGTEXT DEFAULT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_shares_type` (`type`),
  KEY `idx_shares_created` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Table structure for table `cp_desktop_releases`
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `cp_desktop_releases` (
  `id` VARCHAR(64) NOT NULL,
  `version` VARCHAR(32) NOT NULL,
  `version_code` INT UNSIGNED NOT NULL,
  `channel` VARCHAR(32) DEFAULT 'stable',
  `title` VARCHAR(255) NOT NULL,
  `release_notes` TEXT DEFAULT NULL,
  `min_supported_version` VARCHAR(32) DEFAULT '1.0.0',
  `is_mandatory` TINYINT(1) DEFAULT 0,
  `is_active` TINYINT(1) DEFAULT 1,
  `downloads_count` INT UNSIGNED DEFAULT 0,
  `windows_url` VARCHAR(1024) DEFAULT NULL,
  `windows_sha256` VARCHAR(64) DEFAULT NULL,
  `windows_size_bytes` BIGINT UNSIGNED DEFAULT 0,
  `mac_url` VARCHAR(1024) DEFAULT NULL,
  `mac_sha256` VARCHAR(64) DEFAULT NULL,
  `mac_size_bytes` BIGINT UNSIGNED DEFAULT 0,
  `linux_url` VARCHAR(1024) DEFAULT NULL,
  `linux_sha256` VARCHAR(64) DEFAULT NULL,
  `linux_size_bytes` BIGINT UNSIGNED DEFAULT 0,
  `php_url` VARCHAR(1024) DEFAULT NULL,
  `php_sha256` VARCHAR(64) DEFAULT NULL,
  `php_size_bytes` BIGINT UNSIGNED DEFAULT 0,
  `uploaded_by` VARCHAR(128) DEFAULT 'CloudPost Core Engineering',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_rel_ver` (`version`),
  KEY `idx_rel_active_code` (`is_active`, `version_code`),
  KEY `idx_rel_created` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Seed initial SaaS SuperAdmin user & Desktop Release
-- --------------------------------------------------------
INSERT INTO `cp_users` (`id`, `name`, `email`, `password_hash`, `role`, `avatar`)
VALUES ('usr_hiren_hv', 'Hiren Patel', 'hirenpatelhv@gmail.com', 'Micr0@1122', 'superadmin', 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80')
ON DUPLICATE KEY UPDATE `password_hash` = VALUES(`password_hash`), `role` = VALUES(`role`);

INSERT INTO `cp_saas_customers` (`id`, `user_id`, `name`, `email`, `company_name`, `role`, `plan`, `status`, `monthly_fee`, `total_requests`, `monthly_quota`, `requests_this_month`, `data_transfer_mb`, `total_cost`, `net_margin`, `net_margin_percent`, `health_score`, `country`)
VALUES ('cust_hiren_hv', 'usr_hiren_hv', 'Hiren Patel', 'hirenpatelhv@gmail.com', 'CloudPost SaaS Enterprise', 'Workspace Architect & SuperAdmin', 'enterprise', 'active', 199.00, 1250000, 10000000, 1250000, 48500.00, 14.20, 184.80, 92.86, 100, 'United States')
ON DUPLICATE KEY UPDATE `plan` = VALUES(`plan`), `status` = VALUES(`status`), `monthly_fee` = VALUES(`monthly_fee`);

INSERT INTO `cp_desktop_releases` (`id`, `version`, `version_code`, `channel`, `title`, `release_notes`, `min_supported_version`, `is_mandatory`, `is_active`, `downloads_count`, `windows_url`, `windows_sha256`, `windows_size_bytes`, `mac_url`, `mac_sha256`, `mac_size_bytes`, `linux_url`, `linux_sha256`, `linux_size_bytes`, `php_url`, `php_sha256`, `php_size_bytes`, `uploaded_by`, `created_at`)
VALUES ('rel_v2_4_0', '2.4.0', 20400, 'stable', 'CloudPost v2.4.0 - Collaborative Multi-Protocol Release', '• Native Electron desktop container with 100% CORS-free HTTP execution.\n• Real-time SSE Streams, WebSocket Client & gRPC Protocol Explorer.\n• Local MySQL persistence & instant turnkey PHP shared hosting export.', '1.0.0', 0, 1, 14820, '/api/desktop/download/windows?format=exe', '9f8e7d6c5b4a3f2e1d0c9b8a7f6e5d4c3b2a1f0e9d8c7b6a5f4e3d2c1b0a9f8e', 88473600, '/api/desktop/download/mac?format=dmg', '7b6a5f4e3d2c1b0a9f8e7d6c5b4a3f2e1d0c9b8a7f6e5d4c3b2a1f0e9d8c7b6a', 96468992, '/api/desktop/download/linux?format=AppImage', '5f4e3d2c1b0a9f8e7d6c5b4a3f2e1d0c9b8a7f6e5d4c3b2a1f0e9d8c7b6a5f4e', 91226112, '/api/php-export/download', '2c1b0a9f8e7d6c5b4a3f2e1d0c9b8a7f6e5d4c3b2a1f0e9d8c7b6a5f4e3d2c1b', 891289, 'CloudPost Core Engineering', '2026-03-15 12:00:00')
ON DUPLICATE KEY UPDATE `version` = VALUES(`version`), `is_active` = VALUES(`is_active`);

SET FOREIGN_KEY_CHECKS = 1;
