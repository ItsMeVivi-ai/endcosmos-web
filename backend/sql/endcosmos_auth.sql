-- EndCosmos Auth Schema (MariaDB/MySQL)
-- Charset/collation selected for multilingual compatibility.

CREATE DATABASE IF NOT EXISTS endcosmos_auth
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE endcosmos_auth;

CREATE TABLE IF NOT EXISTS users (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  username VARCHAR(32) NOT NULL,
  email VARCHAR(191) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(32) NOT NULL DEFAULT 'player',
  tier VARCHAR(32) NOT NULL DEFAULT 'bronze',
  cosmic_rank BIGINT UNSIGNED NOT NULL DEFAULT 0,
  source VARCHAR(32) NOT NULL DEFAULT 'web',
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  is_verified TINYINT(1) NOT NULL DEFAULT 0,
  oauth_provider VARCHAR(32) NULL,
  oauth_subject VARCHAR(191) NULL,
  ip_register VARCHAR(45) NULL,
  last_login DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_users_username (username),
  UNIQUE KEY uq_users_email (email),
  UNIQUE KEY uq_users_oauth_identity (oauth_provider, oauth_subject),
  KEY idx_users_role_active (role, is_active),
  KEY idx_users_verified (is_verified),
  KEY idx_users_created_at (created_at),
  KEY idx_users_last_login (last_login)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS user_profiles (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,
  display_name VARCHAR(64) NULL,
  avatar_url VARCHAR(255) NULL,
  bio TEXT NULL,
  locale VARCHAR(12) NOT NULL DEFAULT 'es-ES',
  timezone VARCHAR(64) NOT NULL DEFAULT 'UTC',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_user_profiles_user_id (user_id),
  CONSTRAINT fk_user_profiles_user FOREIGN KEY (user_id)
    REFERENCES users (id)
    ON DELETE CASCADE
    ON UPDATE RESTRICT
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS email_verifications (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,
  token VARCHAR(128) NOT NULL,
  expires_at DATETIME NOT NULL,
  verified_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_email_verifications_token (token),
  KEY idx_email_verifications_user (user_id),
  KEY idx_email_verifications_expires (expires_at),
  CONSTRAINT fk_email_verifications_user FOREIGN KEY (user_id)
    REFERENCES users (id)
    ON DELETE CASCADE
    ON UPDATE RESTRICT
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS login_logs (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NULL,
  attempted_identity VARCHAR(191) NULL,
  ip_address VARCHAR(45) NULL,
  user_agent VARCHAR(512) NULL,
  source VARCHAR(32) NOT NULL DEFAULT 'web',
  success TINYINT(1) NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_login_logs_user (user_id),
  KEY idx_login_logs_success (success),
  KEY idx_login_logs_created (created_at),
  CONSTRAINT fk_login_logs_user FOREIGN KEY (user_id)
    REFERENCES users (id)
    ON DELETE SET NULL
    ON UPDATE RESTRICT
) ENGINE=InnoDB;
