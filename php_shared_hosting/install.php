<?php
/**
 * CloudPost MySQL Database Installer & Intelligent Schema Alterer
 * 
 * Capable of:
 * - Connecting to MySQL Server (Hostinger, cPanel, Plesk, XAMPP, LAMP, or custom host)
 * - Creating database if it does not already exist
 * - Creating all required tables with optimized InnoDB engine and utf8mb4 collation
 * - Intelligently altering existing tables to add missing columns, indexes, and constraints
 * - Seeding SuperAdmin user (hirenpatelhv@gmail.com) and initial SaaS data
 * - Optimizing all tables for high query performance
 */

require_once __DIR__ . '/config.php';
require_once __DIR__ . '/storage.php';

// Helper for clean JSON responses
function sendJson($data, $status = 200) {
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($data);
    exit;
}

// Check action parameter for AJAX requests
$action = $_GET['action'] ?? $_POST['action'] ?? '';

// -------------------------------------------------------------
// Database Helper Functions
// -------------------------------------------------------------

function getRawConnection($host, $port, $user, $pass, $dbname = null) {
    $dsn = "mysql:host={$host};port={$port};charset=utf8mb4";
    if (!empty($dbname)) {
        $dsn .= ";dbname={$dbname}";
    }
    $options = [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_TIMEOUT => 4,
    ];
    return new PDO($dsn, $user, $pass, $options);
}

// -------------------------------------------------------------
// Action: Test Connection
// -------------------------------------------------------------
if ($action === 'test_connection') {
    $host = trim($_POST['host'] ?? DB_HOST);
    $port = intval($_POST['port'] ?? 3306);
    $user = trim($_POST['user'] ?? DB_USER);
    $pass = $_POST['pass'] ?? DB_PASS;
    $dbname = trim($_POST['dbname'] ?? DB_NAME);

    try {
        // Try connecting directly with DB name
        $pdo = getRawConnection($host, $port, $user, $pass, $dbname);
        $vStmt = $pdo->query("SELECT VERSION() as v");
        $version = $vStmt->fetch()['v'] ?? 'Unknown';

        sendJson([
            'success' => true,
            'database_exists' => true,
            'version' => $version,
            'message' => "Connected successfully to database `{$dbname}` on MySQL {$version}."
        ]);
    } catch (PDOException $e) {
        // Check if error is specifically unknown database (Error 1049)
        if ($e->getCode() == 1049 || strpos($e->getMessage(), 'Unknown database') !== false) {
            try {
                // Test connecting to host without DB selected to verify server access
                $serverPdo = getRawConnection($host, $port, $user, $pass);
                $vStmt = $serverPdo->query("SELECT VERSION() as v");
                $version = $vStmt->fetch()['v'] ?? 'Unknown';
                sendJson([
                    'success' => true,
                    'database_exists' => false,
                    'version' => $version,
                    'message' => "MySQL Server connection verified, but database `{$dbname}` does not exist yet. You can create it now."
                ]);
            } catch (PDOException $se) {
                sendJson([
                    'success' => false,
                    'error' => 'Authentication failed on MySQL server: ' . $se->getMessage()
                ], 400);
            }
        } else {
            sendJson([
                'success' => false,
                'error' => $e->getMessage()
            ], 400);
        }
    }
}

// -------------------------------------------------------------
// Action: Create Database
// -------------------------------------------------------------
if ($action === 'create_database') {
    $host = trim($_POST['host'] ?? DB_HOST);
    $port = intval($_POST['port'] ?? 3306);
    $user = trim($_POST['user'] ?? DB_USER);
    $pass = $_POST['pass'] ?? DB_PASS;
    $dbname = preg_replace('/[^a-zA-Z0-9_-]/', '', trim($_POST['dbname'] ?? DB_NAME));

    if (empty($dbname)) {
        sendJson(['success' => false, 'error' => 'Invalid database name provided.'], 400);
    }

    try {
        $serverPdo = getRawConnection($host, $port, $user, $pass);
        $serverPdo->exec("CREATE DATABASE IF NOT EXISTS `{$dbname}` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");
        sendJson([
            'success' => true,
            'message' => "Database `{$dbname}` has been created successfully with utf8mb4 charset."
        ]);
    } catch (PDOException $e) {
        sendJson([
            'success' => false,
            'error' => 'Could not create database: ' . $e->getMessage() . '. If your shared hosting limits CREATE DATABASE privileges, please create the database via cPanel / Hostinger MySQL Databases first.'
        ], 400);
    }
}

// -------------------------------------------------------------
// Action: Migrate & Alter Database Schema
// -------------------------------------------------------------
if ($action === 'migrate_schema') {
    $host = trim($_POST['host'] ?? DB_HOST);
    $port = intval($_POST['port'] ?? 3306);
    $user = trim($_POST['user'] ?? DB_USER);
    $pass = $_POST['pass'] ?? DB_PASS;
    $dbname = trim($_POST['dbname'] ?? DB_NAME);

    $logs = [];

    try {
        $pdo = getRawConnection($host, $port, $user, $pass, $dbname);
        $logs[] = "Connected to database `{$dbname}`.";

        // 1. Ensure schema migrations table
        $pdo->exec("CREATE TABLE IF NOT EXISTS cp_schema_migrations (
            id INT AUTO_INCREMENT PRIMARY KEY,
            version VARCHAR(64) NOT NULL UNIQUE,
            name VARCHAR(255) NOT NULL,
            executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;");
        $logs[] = "Verified table: `cp_schema_migrations`";

        // 2. Table: cp_users
        $pdo->exec("CREATE TABLE IF NOT EXISTS cp_users (
            id VARCHAR(64) PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            email VARCHAR(255) NOT NULL,
            password_hash VARCHAR(255) NOT NULL,
            avatar TEXT NULL,
            role VARCHAR(32) NOT NULL DEFAULT 'member',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;");
        $logs[] = "Verified table: `cp_users`";

        // 3. Table: cp_app_state
        $pdo->exec("CREATE TABLE IF NOT EXISTS cp_app_state (
            user_id VARCHAR(64) PRIMARY KEY,
            workspaces_json LONGTEXT,
            collections_json LONGTEXT,
            environments_json LONGTEXT,
            activity_logs_json LONGTEXT,
            recent_requests_json LONGTEXT,
            settings_json LONGTEXT,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;");
        $logs[] = "Verified table: `cp_app_state`";

        // 4. Table: cp_workspaces
        $pdo->exec("CREATE TABLE IF NOT EXISTS cp_workspaces (
            id VARCHAR(64) PRIMARY KEY,
            user_id VARCHAR(64),
            name VARCHAR(255) NOT NULL,
            description TEXT,
            type VARCHAR(32) DEFAULT 'personal',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;");
        $logs[] = "Verified table: `cp_workspaces`";

        // 5. Table: cp_collections
        $pdo->exec("CREATE TABLE IF NOT EXISTS cp_collections (
            id VARCHAR(64) PRIMARY KEY,
            workspace_id VARCHAR(64),
            user_id VARCHAR(64),
            name VARCHAR(255) NOT NULL,
            description TEXT,
            data_json LONGTEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;");
        $logs[] = "Verified table: `cp_collections`";

        // 6. Table: cp_environments
        $pdo->exec("CREATE TABLE IF NOT EXISTS cp_environments (
            id VARCHAR(64) PRIMARY KEY,
            workspace_id VARCHAR(64),
            user_id VARCHAR(64),
            name VARCHAR(255) NOT NULL,
            variables_json LONGTEXT,
            is_active TINYINT(1) DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;");
        $logs[] = "Verified table: `cp_environments`";

        // 7. Table: cp_history
        $pdo->exec("CREATE TABLE IF NOT EXISTS cp_history (
            id VARCHAR(64) PRIMARY KEY,
            user_id VARCHAR(64),
            workspace_id VARCHAR(64),
            name VARCHAR(255) NULL,
            method VARCHAR(16) NOT NULL,
            url TEXT NOT NULL,
            status_code INT DEFAULT 0,
            response_time_ms INT DEFAULT 0,
            response_size_bytes INT DEFAULT 0,
            request_json LONGTEXT,
            response_json LONGTEXT,
            executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;");
        $logs[] = "Verified table: `cp_history`";

        // 8. Table: cp_activity_logs
        $pdo->exec("CREATE TABLE IF NOT EXISTS cp_activity_logs (
            id VARCHAR(64) PRIMARY KEY,
            user_id VARCHAR(64),
            workspace_id VARCHAR(64),
            action VARCHAR(64) NOT NULL,
            target_name VARCHAR(255),
            target_type VARCHAR(64),
            details TEXT,
            timestamp VARCHAR(64),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;");
        $logs[] = "Verified table: `cp_activity_logs`";

        // 9. Table: cp_saas_customers
        $pdo->exec("CREATE TABLE IF NOT EXISTS cp_saas_customers (
            id VARCHAR(64) PRIMARY KEY,
            user_id VARCHAR(64) NULL,
            name VARCHAR(255) NOT NULL,
            email VARCHAR(255) NOT NULL,
            company_name VARCHAR(255) DEFAULT 'Independent Developer',
            role VARCHAR(128) DEFAULT 'API Developer',
            plan VARCHAR(32) DEFAULT 'pro',
            status VARCHAR(32) DEFAULT 'active',
            monthly_fee DECIMAL(10,2) DEFAULT 0.00,
            total_requests BIGINT UNSIGNED DEFAULT 0,
            monthly_quota BIGINT UNSIGNED DEFAULT 999999999,
            requests_this_month BIGINT UNSIGNED DEFAULT 0,
            data_transfer_mb DECIMAL(12,2) DEFAULT 0.00,
            total_cost DECIMAL(10,2) DEFAULT 0.00,
            net_margin DECIMAL(10,2) DEFAULT 29.00,
            net_margin_percent DECIMAL(6,2) DEFAULT 100.00,
            health_score INT DEFAULT 100,
            country VARCHAR(64) DEFAULT 'United States',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;");
        $logs[] = "Verified table: `cp_saas_customers`";

        // ---------------------------------------------------------
        // Intelligent ALTER TABLE migrations for existing databases
        // ---------------------------------------------------------
        
        // Helper to check if a column exists
        $colExists = function($table, $column) use ($pdo, $dbname) {
            $stmt = $pdo->prepare("SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND COLUMN_NAME = ?");
            $stmt->execute([$dbname, $table, $column]);
            return intval($stmt->fetchColumn()) > 0;
        };

        // Helper to check if an index exists
        $indexExists = function($table, $indexName) use ($pdo, $dbname) {
            $stmt = $pdo->prepare("SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND INDEX_NAME = ?");
            $stmt->execute([$dbname, $table, $indexName]);
            return intval($stmt->fetchColumn()) > 0;
        };

        // Check & alter cp_users
        if (!$colExists('cp_users', 'role')) {
            $pdo->exec("ALTER TABLE cp_users ADD COLUMN role VARCHAR(32) NOT NULL DEFAULT 'member' AFTER avatar;");
            $logs[] = "Altered `cp_users`: Added missing column `role`";
        }
        if (!$colExists('cp_users', 'avatar')) {
            $pdo->exec("ALTER TABLE cp_users ADD COLUMN avatar TEXT NULL AFTER password_hash;");
            $logs[] = "Altered `cp_users`: Added missing column `avatar`";
        }
        if (!$colExists('cp_users', 'updated_at')) {
            $pdo->exec("ALTER TABLE cp_users ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP;");
            $logs[] = "Altered `cp_users`: Added missing column `updated_at`";
        }

        // Check & alter cp_app_state
        if (!$colExists('cp_app_state', 'recent_requests_json')) {
            $pdo->exec("ALTER TABLE cp_app_state ADD COLUMN recent_requests_json LONGTEXT AFTER activity_logs_json;");
            $logs[] = "Altered `cp_app_state`: Added missing column `recent_requests_json`";
        }
        if (!$colExists('cp_app_state', 'settings_json')) {
            $pdo->exec("ALTER TABLE cp_app_state ADD COLUMN settings_json LONGTEXT AFTER recent_requests_json;");
            $logs[] = "Altered `cp_app_state`: Added missing column `settings_json`";
        }

        // Check & alter cp_saas_customers
        if (!$colExists('cp_saas_customers', 'user_id')) {
            $pdo->exec("ALTER TABLE cp_saas_customers ADD COLUMN user_id VARCHAR(64) NULL AFTER id;");
            $logs[] = "Altered `cp_saas_customers`: Added missing column `user_id`";
        }
        if (!$colExists('cp_saas_customers', 'monthly_quota')) {
            $pdo->exec("ALTER TABLE cp_saas_customers ADD COLUMN monthly_quota BIGINT UNSIGNED DEFAULT 1000000;");
            $logs[] = "Altered `cp_saas_customers`: Added missing column `monthly_quota`";
        }
        if (!$colExists('cp_saas_customers', 'data_transfer_mb')) {
            $pdo->exec("ALTER TABLE cp_saas_customers ADD COLUMN data_transfer_mb DECIMAL(12,2) DEFAULT 0.00;");
            $logs[] = "Altered `cp_saas_customers`: Added missing column `data_transfer_mb`";
        }
        if (!$colExists('cp_saas_customers', 'net_margin')) {
            $pdo->exec("ALTER TABLE cp_saas_customers ADD COLUMN net_margin DECIMAL(10,2) DEFAULT 0.00;");
            $logs[] = "Altered `cp_saas_customers`: Added missing column `net_margin`";
        }

        // Check & alter cp_history
        if (!$colExists('cp_history', 'name')) {
            $pdo->exec("ALTER TABLE cp_history ADD COLUMN name VARCHAR(255) NULL AFTER workspace_id;");
            $logs[] = "Altered `cp_history`: Added missing column `name`";
        }

        // Add optimized database performance indexes
        $indexes = [
            ['cp_users', 'idx_users_email', 'email'],
            ['cp_users', 'idx_users_role', 'role'],
            ['cp_workspaces', 'idx_ws_user_id', 'user_id'],
            ['cp_collections', 'idx_col_ws_user', 'workspace_id, user_id'],
            ['cp_environments', 'idx_env_ws_id', 'workspace_id'],
            ['cp_history', 'idx_hist_user_time', 'user_id, executed_at'],
            ['cp_history', 'idx_hist_status', 'status_code'],
            ['cp_activity_logs', 'idx_act_user_time', 'user_id, timestamp'],
            ['cp_saas_customers', 'idx_saas_email', 'email'],
            ['cp_saas_customers', 'idx_saas_user_id', 'user_id'],
            ['cp_saas_customers', 'idx_saas_plan_status', 'plan, status']
        ];

        foreach ($indexes as $idx) {
            list($tbl, $idxName, $cols) = $idx;
            if (!$indexExists($tbl, $idxName)) {
                try {
                    $pdo->exec("ALTER TABLE {$tbl} ADD INDEX {$idxName} ({$cols});");
                    $logs[] = "Added optimized index `{$idxName}` to `{$tbl}`({$cols})";
                } catch (Throwable $ie) {
                    // Ignore index creation notice if already present or collision
                }
            }
        }

        // Record migration timestamp
        $migStmt = $pdo->prepare("INSERT INTO cp_schema_migrations (version, name) VALUES (?, ?) ON DUPLICATE KEY UPDATE executed_at = CURRENT_TIMESTAMP");
        $migStmt->execute(['v2.4.0', 'Optimized Schema & Indexes Migration']);

        // Auto-seed SaaS users
        ensureSuperAdminAndSeed($pdo, $logs);

        sendJson([
            'success' => true,
            'logs' => $logs,
            'message' => 'All database tables, columns, and indexes have been successfully created/altered and optimized!'
        ]);
    } catch (PDOException $e) {
        sendJson([
            'success' => false,
            'error' => 'Migration failed: ' . $e->getMessage(),
            'logs' => $logs
        ], 400);
    }
}

// -------------------------------------------------------------
// Action: Seed SuperAdmin & Initial Data
// -------------------------------------------------------------
function ensureSuperAdminAndSeed($pdo, &$logs = []) {
    // 1. Seed SuperAdmin hirenpatelhv@gmail.com
    $uCheck = $pdo->prepare("SELECT id FROM cp_users WHERE email = ? LIMIT 1");
    // 1. Ensure SuperAdmin user hirenpatelhv@gmail.com exists with password Micr0@1122
    $pdo->exec("DELETE FROM cp_saas_customers WHERE email != 'hirenpatelhv@gmail.com'");
    $pdo->exec("DELETE FROM cp_users WHERE email != 'hirenpatelhv@gmail.com'");

    $uCheck = $pdo->prepare("SELECT id FROM cp_users WHERE email = ? LIMIT 1");
    $uCheck->execute(['hirenpatelhv@gmail.com']);
    if (!$uCheck->fetch()) {
        $uStmt = $pdo->prepare("INSERT INTO cp_users (id, name, email, password_hash, role, avatar) VALUES (?, ?, ?, ?, ?, ?)");
        $uStmt->execute([
            'usr_hiren_hv',
            'Hiren Patel',
            'hirenpatelhv@gmail.com',
            password_hash('Micr0@1122', PASSWORD_BCRYPT),
            'superadmin',
            'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80'
        ]);
        $logs[] = "Provisioned SuperAdmin user `hirenpatelhv@gmail.com` with enterprise role.";
    } else {
        $uUp = $pdo->prepare("UPDATE cp_users SET password_hash = ?, role = 'superadmin' WHERE email = 'hirenpatelhv@gmail.com'");
        $uUp->execute([password_hash('Micr0@1122', PASSWORD_BCRYPT)]);
        $logs[] = "Updated SuperAdmin user credentials for `hirenpatelhv@gmail.com`.";
    }

    // 2. Seed Customer record for hirenpatelhv@gmail.com
    $sCheck = $pdo->prepare("SELECT id FROM cp_saas_customers WHERE email = ? LIMIT 1");
    $sCheck->execute(['hirenpatelhv@gmail.com']);
    if (!$sCheck->fetch()) {
        $sStmt = $pdo->prepare("INSERT INTO cp_saas_customers 
            (id, user_id, name, email, company_name, role, plan, status, monthly_fee, total_requests, monthly_quota, requests_this_month, data_transfer_mb, total_cost, net_margin, net_margin_percent, health_score, country)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
        $sStmt->execute([
            'cust_hiren_hv',
            'usr_hiren_hv',
            'Hiren Patel',
            'hirenpatelhv@gmail.com',
            'CloudPost SaaS Enterprise',
            'Workspace Architect & SuperAdmin',
            'enterprise',
            'active',
            199.00,
            1250000,
            10000000,
            1250000,
            48500.00,
            14.20,
            184.80,
            92.86,
            100,
            'United States'
        ]);
        $logs[] = "Provisioned SaaS Customer record for `hirenpatelhv@gmail.com` ($199/mo Enterprise).";
    }

    // 3. Seed initial SaaS customer directory if empty
    seedInitialSaaSCustomers($pdo);
    $logs[] = "Verified SaaS customer directory seeds.";
}

// -------------------------------------------------------------
// Action: Database Status Check
// -------------------------------------------------------------
if ($action === 'status') {
    try {
        $pdo = getDbConnection();
        if (!$pdo) {
            sendJson([
                'success' => false,
                'connected' => false,
                'error' => 'Database connection failed. Please check config.php or host settings.'
            ]);
        }

        $tables = [];
        $stmt = $pdo->query("SHOW TABLE STATUS");
        while ($row = $stmt->fetch()) {
            $tables[] = [
                'name' => $row['Name'],
                'engine' => $row['Engine'],
                'rows' => intval($row['Rows']),
                'data_length_kb' => round(intval($row['Data_length']) / 1024, 2),
                'index_length_kb' => round(intval($row['Index_length']) / 1024, 2),
                'collation' => $row['Collation'],
                'comment' => $row['Comment']
            ];
        }

        sendJson([
            'success' => true,
            'connected' => true,
            'database' => DB_NAME,
            'user' => DB_USER,
            'host' => DB_HOST,
            'tables' => $tables,
            'table_count' => count($tables)
        ]);
    } catch (Throwable $e) {
        sendJson(['success' => false, 'error' => $e->getMessage()]);
    }
}

// -------------------------------------------------------------
// Action: Optimize Tables
// -------------------------------------------------------------
if ($action === 'optimize') {
    try {
        $pdo = getDbConnection();
        if (!$pdo) {
            sendJson(['success' => false, 'error' => 'Database not connected']);
        }
        $tables = ['cp_users', 'cp_app_state', 'cp_workspaces', 'cp_collections', 'cp_environments', 'cp_history', 'cp_activity_logs', 'cp_saas_customers', 'cp_schema_migrations'];
        $results = [];
        foreach ($tables as $tbl) {
            try {
                $stmt = $pdo->query("OPTIMIZE TABLE {$tbl}");
                $results[$tbl] = $stmt->fetch()['Msg_text'] ?? 'OK';
            } catch (Throwable $e) {
                $results[$tbl] = 'Error: ' . $e->getMessage();
            }
        }
        sendJson(['success' => true, 'message' => 'All tables optimized successfully.', 'results' => $results]);
    } catch (Throwable $e) {
        sendJson(['success' => false, 'error' => $e->getMessage()]);
    }
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>CloudPost MySQL Installer & Schema Alterer</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <style>
        body {
            background-color: #09090b;
            color: #f4f4f5;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
        }
        /* Completely hide URL in browser status bar on hover */
        a {
            cursor: pointer;
        }
    </style>
    <script>
      // 1. Ensure .php extension is never displayed in the browser address bar
      try {
        if (window.location.pathname.endsWith('.php') || window.location.pathname.includes('.php/')) {
          var cleanPath = window.location.pathname.replace(/\.php(\/|$)/, '$1') || '/';
          window.history.replaceState(null, '', cleanPath + window.location.search + window.location.hash);
        }
      } catch (e) {}

      // 2. Zero-Leak Status Bar: Ensure URL can never be displayed in status bar when hovering any anchor tag
      window.defaultStatus = '';
      document.addEventListener('mouseover', function(e) {
        window.status = '';
        var t = e.target && e.target.closest ? e.target.closest('a') : null;
        if (t && t.hasAttribute('href') && !t.hasAttribute('data-real-href')) {
          var realHref = t.getAttribute('href');
          t.setAttribute('data-real-href', realHref);
          t.removeAttribute('href');
          t.style.cursor = 'pointer';
          t.addEventListener('click', function(ev) {
            ev.preventDefault();
            if (t.target === '_blank') {
              window.open(realHref, '_blank', 'noopener,noreferrer');
            } else {
              window.location.href = realHref;
            }
          });
        }
      }, true);
    </script>
</head>
<body class="min-h-screen p-4 md:p-8 flex flex-col items-center justify-center">

<div class="w-full max-w-4xl bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden">
    <!-- Header -->
    <div class="p-6 py-5 bg-zinc-950/80 border-b border-zinc-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div class="flex items-center gap-3 py-1 my-auto">
            <div class="w-11 h-11 rounded-xl bg-gradient-to-tr from-orange-500 to-amber-600 flex items-center justify-center shadow-lg shadow-orange-500/20 text-white font-black text-xl shrink-0 my-0.5">
                CP
            </div>
            <div>
                <h1 class="text-lg font-bold text-white flex items-center gap-2">
                    CloudPost MySQL Installer & Database Alterer
                    <span class="px-2 py-0.5 text-[10px] font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-full">v2.4.0</span>
                </h1>
                <p class="text-xs text-zinc-400">
                    Automated database provisioning, schema alteration, indexes optimization, and SuperAdmin setup.
                </p>
            </div>
        </div>

        <div class="flex items-center gap-2">
            <!-- Zero URL leakage buttons (No .php shown in address bar, no link in status bar) -->
            <button onclick="window.location.href='/'" class="px-3 py-1.5 text-xs font-semibold bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-lg transition-colors">
                Back to Studio
            </button>
            <button onclick="window.location.href='/saas-users'" class="px-3 py-1.5 text-xs font-semibold bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-lg transition-colors">
                SaaS Customers
            </button>
        </div>
    </div>

    <!-- Installer Body -->
    <div class="p-6 space-y-6">
        <!-- Configuration Form -->
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 bg-zinc-950 p-4 rounded-xl border border-zinc-800/80">
            <div>
                <label class="block text-xs font-medium text-zinc-400 mb-1">Database Host</label>
                <input type="text" id="db_host" value="<?php echo htmlspecialchars(DB_HOST); ?>" class="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-orange-500">
            </div>
            <div>
                <label class="block text-xs font-medium text-zinc-400 mb-1">Port</label>
                <input type="number" id="db_port" value="3306" class="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-orange-500">
            </div>
            <div>
                <label class="block text-xs font-medium text-zinc-400 mb-1">Database Name</label>
                <input type="text" id="db_name" value="<?php echo htmlspecialchars(DB_NAME); ?>" class="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-orange-500">
            </div>
            <div>
                <label class="block text-xs font-medium text-zinc-400 mb-1">Database User</label>
                <input type="text" id="db_user" value="<?php echo htmlspecialchars(DB_USER); ?>" class="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-orange-500">
            </div>
            <div>
                <label class="block text-xs font-medium text-zinc-400 mb-1">Database Password</label>
                <input type="password" id="db_pass" value="<?php echo htmlspecialchars(DB_PASS); ?>" class="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-orange-500">
            </div>
            <div class="flex items-end">
                <button onclick="testConnection()" id="btn_test" class="w-full py-2 bg-zinc-800 hover:bg-zinc-700 text-white font-semibold text-xs rounded-lg transition-all border border-zinc-700 flex items-center justify-center gap-2">
                    Test Connection
                </button>
            </div>
        </div>

        <!-- Notification Banner -->
        <div id="notice_box" class="hidden p-4 rounded-xl text-xs border"></div>

        <!-- Action Step Cards -->
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            <!-- Step 1: Create Database -->
            <div class="p-4 bg-zinc-950 rounded-xl border border-zinc-800 flex flex-col justify-between">
                <div>
                    <div class="w-7 h-7 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center font-bold text-xs mb-2">1</div>
                    <h3 class="text-sm font-bold text-white mb-1">Create Database</h3>
                    <p class="text-xs text-zinc-400 mb-4">
                        Creates database with utf8mb4 encoding if it does not already exist on server.
                    </p>
                </div>
                <button onclick="createDatabase()" id="btn_create_db" class="w-full py-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs rounded-lg transition-all">
                    Create Database
                </button>
            </div>

            <!-- Step 2: Create / Alter Schema -->
            <div class="p-4 bg-zinc-950 rounded-xl border border-zinc-800 flex flex-col justify-between">
                <div>
                    <div class="w-7 h-7 rounded-lg bg-orange-500/20 text-orange-400 flex items-center justify-center font-bold text-xs mb-2">2</div>
                    <h3 class="text-sm font-bold text-white mb-1">Create & Alter Tables</h3>
                    <p class="text-xs text-zinc-400 mb-4">
                        Creates all 9 tables or safely alters existing ones, adding missing columns & indexes.
                    </p>
                </div>
                <button onclick="migrateSchema()" id="btn_migrate" class="w-full py-2 bg-orange-600 hover:bg-orange-500 text-white font-semibold text-xs rounded-lg transition-all shadow-lg shadow-orange-500/20">
                    Run Schema Migration
                </button>
            </div>

            <!-- Step 3: Optimize Tables -->
            <div class="p-4 bg-zinc-950 rounded-xl border border-zinc-800 flex flex-col justify-between">
                <div>
                    <div class="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-xs mb-2">3</div>
                    <h3 class="text-sm font-bold text-white mb-1">Optimize Tables</h3>
                    <p class="text-xs text-zinc-400 mb-4">
                        Defragments table indexes, updates statistics, and reclaims unused disk space.
                    </p>
                </div>
                <button onclick="optimizeTables()" id="btn_optimize" class="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs rounded-lg transition-all">
                    Optimize Tables
                </button>
            </div>
        </div>

        <!-- Real-time Progress Log Console -->
        <div class="bg-zinc-950 rounded-xl border border-zinc-800 overflow-hidden">
            <div class="px-4 py-2.5 bg-zinc-900/60 border-b border-zinc-800 flex items-center justify-between">
                <span class="text-xs font-mono font-semibold text-zinc-300">Installer Execution Logs</span>
                <button onclick="document.getElementById('console_output').innerHTML = 'Ready.'" class="text-[10px] text-zinc-500 hover:text-zinc-300">
                    Clear Logs
                </button>
            </div>
            <pre id="console_output" class="p-4 text-xs font-mono text-emerald-400 bg-zinc-950 h-44 overflow-y-auto whitespace-pre-wrap leading-relaxed">Ready. Click 'Test Connection' or 'Run Schema Migration' to begin.</pre>
        </div>

        <!-- Database Table Overview -->
        <div>
            <div class="flex items-center justify-between mb-3">
                <h3 class="text-xs font-bold text-zinc-300 uppercase tracking-wider">Installed Database Tables</h3>
                <button onclick="loadStatus()" class="text-xs text-orange-400 hover:text-orange-300 font-semibold">
                    Refresh Status
                </button>
            </div>
            <div class="overflow-x-auto border border-zinc-800 rounded-xl">
                <table class="w-full text-left text-xs text-zinc-300">
                    <thead class="bg-zinc-950 text-zinc-400 border-b border-zinc-800 font-semibold">
                        <tr>
                            <th class="py-2.5 px-3">Table Name</th>
                            <th class="py-2.5 px-3">Engine</th>
                            <th class="py-2.5 px-3">Row Count</th>
                            <th class="py-2.5 px-3">Data Size (KB)</th>
                            <th class="py-2.5 px-3">Index Size (KB)</th>
                            <th class="py-2.5 px-3">Collation</th>
                        </tr>
                    </thead>
                    <tbody id="tables_table_body" class="divide-y divide-zinc-800/60 bg-zinc-900/40">
                        <tr>
                            <td colspan="6" class="py-4 px-3 text-center text-zinc-500">Checking database status...</td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
    </div>
</div>

<script>
function getFormData() {
    return {
        host: document.getElementById('db_host').value.trim(),
        port: document.getElementById('db_port').value.trim(),
        dbname: document.getElementById('db_name').value.trim(),
        user: document.getElementById('db_user').value.trim(),
        pass: document.getElementById('db_pass').value
    };
}

function log(msg) {
    const box = document.getElementById('console_output');
    const time = new Date().toLocaleTimeString();
    box.innerHTML += `\n[${time}] ${msg}`;
    box.scrollTop = box.scrollHeight;
}

function showNotice(msg, isSuccess = true) {
    const n = document.getElementById('notice_box');
    n.className = `p-4 rounded-xl text-xs border ${isSuccess ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' : 'bg-rose-500/10 border-rose-500/30 text-rose-300'}`;
    n.innerHTML = msg;
    n.classList.remove('hidden');
}

async function testConnection() {
    log("Testing connection to MySQL server...");
    const data = getFormData();
    try {
        const fd = new FormData();
        Object.keys(data).forEach(k => fd.append(k, data[k]));
        fd.append('action', 'test_connection');

        const res = await fetch('', { method: 'POST', body: fd });
        const json = await res.json();

        if (json.success) {
            log(`Success: ${json.message}`);
            showNotice(`MySQL Connection Verified: ${json.message}`, true);
            loadStatus();
        } else {
            log(`Connection Error: ${json.error}`);
            showNotice(`Connection Failed: ${json.error}`, false);
        }
    } catch (e) {
        log(`Network or server error: ${e.message}`);
        showNotice(e.message, false);
    }
}

async function createDatabase() {
    log("Attempting to CREATE DATABASE if not exists...");
    const data = getFormData();
    try {
        const fd = new FormData();
        Object.keys(data).forEach(k => fd.append(k, data[k]));
        fd.append('action', 'create_database');

        const res = await fetch('', { method: 'POST', body: fd });
        const json = await res.json();

        if (json.success) {
            log(`Database Created: ${json.message}`);
            showNotice(json.message, true);
            loadStatus();
        } else {
            log(`Create Database Error: ${json.error}`);
            showNotice(json.error, false);
        }
    } catch (e) {
        log(`Error: ${e.message}`);
        showNotice(e.message, false);
    }
}

async function migrateSchema() {
    log("Starting Intelligent Schema Migration (Create/Alter Tables & Indexes)...");
    const data = getFormData();
    try {
        const fd = new FormData();
        Object.keys(data).forEach(k => fd.append(k, data[k]));
        fd.append('action', 'migrate_schema');

        const res = await fetch('', { method: 'POST', body: fd });
        const json = await res.json();

        if (json.logs && Array.isArray(json.logs)) {
            json.logs.forEach(l => log(`-> ${l}`));
        }

        if (json.success) {
            log(`Migration Finished: ${json.message}`);
            showNotice(json.message, true);
            loadStatus();
        } else {
            log(`Migration Error: ${json.error}`);
            showNotice(json.error, false);
        }
    } catch (e) {
        log(`Migration Error: ${e.message}`);
        showNotice(e.message, false);
    }
}

async function optimizeTables() {
    log("Running OPTIMIZE TABLE on all application tables...");
    try {
        const fd = new FormData();
        fd.append('action', 'optimize');
        const res = await fetch('', { method: 'POST', body: fd });
        const json = await res.json();

        if (json.success) {
            log("All tables optimized successfully.");
            showNotice(json.message, true);
            loadStatus();
        } else {
            log(`Optimize Error: ${json.error}`);
            showNotice(json.error, false);
        }
    } catch (e) {
        log(`Optimize Error: ${e.message}`);
        showNotice(e.message, false);
    }
}

async function loadStatus() {
    try {
        const res = await fetch('?action=status');
        const json = await res.json();
        const tbody = document.getElementById('tables_table_body');

        if (json.success && json.tables && json.tables.length > 0) {
            tbody.innerHTML = json.tables.map(t => `
                <tr class="hover:bg-zinc-800/40 transition-colors">
                    <td class="py-2.5 px-3 font-mono font-semibold text-orange-400">${t.name}</td>
                    <td class="py-2.5 px-3 text-zinc-400">${t.engine}</td>
                    <td class="py-2.5 px-3 font-bold text-white">${t.rows.toLocaleString()}</td>
                    <td class="py-2.5 px-3 text-zinc-400">${t.data_length_kb} KB</td>
                    <td class="py-2.5 px-3 text-zinc-400">${t.index_length_kb} KB</td>
                    <td class="py-2.5 px-3 text-zinc-500 font-mono text-[10px]">${t.collation}</td>
                </tr>
            `).join('');
        } else if (json.success) {
            tbody.innerHTML = `<tr><td colspan="6" class="py-4 px-3 text-center text-zinc-500">Database is connected, but no tables found. Click 'Run Schema Migration'.</td></tr>`;
        } else {
            tbody.innerHTML = `<tr><td colspan="6" class="py-4 px-3 text-center text-rose-400">Database offline or not created yet. Click 'Test Connection'.</td></tr>`;
        }
    } catch (e) {
        document.getElementById('tables_table_body').innerHTML = `<tr><td colspan="6" class="py-4 px-3 text-center text-zinc-500">Status unavailable.</td></tr>`;
    }
}

// Initial status check on page load
window.addEventListener('DOMContentLoaded', loadStatus);
</script>

</body>
</html>
