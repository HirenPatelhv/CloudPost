<?php
/**
 * CloudPost API Studio - Database & System Configuration
 * Compatible with all Shared Hosting providers (Hostinger, cPanel, Plesk, XAMPP)
 */

if (isset($_GET['debug']) && $_GET['debug'] === '1') {
    error_reporting(E_ALL);
    ini_set('display_errors', 1);
    ini_set('display_startup_errors', 1);
} else {
    error_reporting(E_ALL & ~E_NOTICE & ~E_DEPRECATED);
    ini_set('display_errors', 0);
}

define('APP_NAME', 'CloudPost API Studio');
define('APP_VERSION', '2.4.0');
define('APP_VERSION_DISPLAY', 'v2.4.0');
define('APP_URL', getenv('APP_URL') ?: 'https://cloudpost.techvisionstudio.in');
define('DEFAULT_PROXY_TIMEOUT', 30);

// SuperAdmin System Configuration
define('SUPERADMIN_EMAILS', [
    'hirenpatelhv@gmail.com'
]);
define('SUPERADMIN_DEFAULT_ROLE', 'superadmin');

// MySQL Database Credentials
define('DB_HOST', getenv('DB_HOST') ?: 'localhost');
define('DB_PORT', getenv('DB_PORT') ?: '3306');
define('DB_NAME', getenv('DB_NAME') ?: 'u320472937_postman');
define('DB_USER', getenv('DB_USER') ?: 'u320472937_postman');
define('DB_PASS', getenv('DB_PASS') ?: 'Micr0@112233');

define('DATA_STORAGE_PATH', __DIR__ . '/data');
?>
