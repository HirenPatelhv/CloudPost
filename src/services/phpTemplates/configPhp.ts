export function getConfigPhpCode(): string {
  return `<?php
/**
 * CloudPost API Studio - Shared Hosting Configuration File
 * Configure database credentials for Hostinger, cPanel, Plesk, XAMPP, or LAMP servers.
 */

// MySQL Database Credentials
define('DB_HOST', 'localhost');
define('DB_NAME', 'u320472937_postman');
define('DB_USER', 'u320472937_postman');
define('DB_PASS', 'Micr0@112233');

// Application Settings
define('APP_NAME', 'CloudPost API Studio');
define('APP_URL', 'https://cloudpost.techvisionstudio.in');
define('APP_VERSION', '2.4.0');
define('ALLOW_GUEST_MODE', true);
define('ENABLE_CORS_PROXY', true);

// SuperAdmin Configuration
define('SUPERADMIN_EMAILS', [
    'hirenpatelhv@gmail.com'
]);
`;
}
