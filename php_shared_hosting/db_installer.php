<?php
/**
 * CloudPost MySQL Database Installer & Intelligent Schema Alterer
 * 
 * Standalone Database Installer in PHP
 * Filename: db_installer.php
 * 
 * Features:
 * - Direct standalone access via browser: /db_installer.php or /install.php
 * - Full MySQL server connection verification (Hostinger, cPanel, Plesk, XAMPP, LAMP, RDS)
 * - Auto-creation of database with utf8mb4_unicode_ci collation
 * - Complete schema migrations and table creation (InnoDB, foreign keys, optimized indexes)
 * - Automatic seed of SuperAdmin account and demo workspace
 * - Production table optimization and performance tuning
 * - Visual live diagnostics and table inspector
 */

require_once __DIR__ . '/install.php';
