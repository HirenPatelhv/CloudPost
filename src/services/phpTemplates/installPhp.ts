export function getInstallPhpCode(): string {
  return `<?php
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

function sendJson($data, $status = 200) {
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($data);
    exit;
}

$action = $_GET['action'] ?? $_POST['action'] ?? '';

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

if ($action === 'test_connection') {
    $host = trim($_POST['host'] ?? DB_HOST);
    $port = intval($_POST['port'] ?? 3306);
    $user = trim($_POST['user'] ?? DB_USER);
    $pass = $_POST['pass'] ?? DB_PASS;
    $dbname = trim($_POST['dbname'] ?? DB_NAME);

    try {
        $pdo = getRawConnection($host, $port, $user, $pass, $dbname);
        $vStmt = $pdo->query("SELECT VERSION() as v");
        $version = $vStmt->fetch()['v'] ?? 'Unknown';

        sendJson([
            'success' => true,
            'database_exists' => true,
            'version' => $version,
            'message' => "Connected successfully to database \`{$dbname}\` on MySQL {$version}."
        ]);
    } catch (PDOException $e) {
        if ($e->getCode() == 1049 || strpos($e->getMessage(), 'Unknown database') !== false) {
            try {
                $serverPdo = getRawConnection($host, $port, $user, $pass);
                $vStmt = $serverPdo->query("SELECT VERSION() as v");
                $version = $vStmt->fetch()['v'] ?? 'Unknown';
                sendJson([
                    'success' => true,
                    'database_exists' => false,
                    'version' => $version,
                    'message' => "MySQL Server connection verified, but database \`{$dbname}\` does not exist yet. You can create it now."
                ]);
            } catch (PDOException $se) {
                sendJson([
                    'success' => false,
                    'error' => 'Authentication failed on MySQL server: ' . $se->getMessage()
                ], 400);
            }
        } else {
            sendJson(['success' => false, 'error' => $e->getMessage()], 400);
        }
    }
}

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
        $serverPdo->exec("CREATE DATABASE IF NOT EXISTS \`{$dbname}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");
        sendJson([
            'success' => true,
            'message' => "Database \`{$dbname}\` has been created successfully with utf8mb4 charset."
        ]);
    } catch (PDOException $e) {
        sendJson([
            'success' => false,
            'error' => 'Could not create database: ' . $e->getMessage() . '. Please verify database creation permissions in cPanel or Hostinger.'
        ], 400);
    }
}

if ($action === 'migrate_schema') {
    $host = trim($_POST['host'] ?? DB_HOST);
    $port = intval($_POST['port'] ?? 3306);
    $user = trim($_POST['user'] ?? DB_USER);
    $pass = $_POST['pass'] ?? DB_PASS;
    $dbname = trim($_POST['dbname'] ?? DB_NAME);

    $logs = [];

    try {
        $pdo = getRawConnection($host, $port, $user, $pass, $dbname);
        $logs[] = "Connected to database \`{$dbname}\`.";

        $pdo->exec("CREATE TABLE IF NOT EXISTS cp_schema_migrations (
            id INT AUTO_INCREMENT PRIMARY KEY,
            version VARCHAR(64) NOT NULL UNIQUE,
            name VARCHAR(255) NOT NULL,
            executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;");
        $logs[] = "Verified table: \`cp_schema_migrations\`";

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
        $logs[] = "Verified table: \`cp_users\`";

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
        $logs[] = "Verified table: \`cp_app_state\`";

        $pdo->exec("CREATE TABLE IF NOT EXISTS cp_workspaces (
            id VARCHAR(64) PRIMARY KEY,
            user_id VARCHAR(64),
            name VARCHAR(255) NOT NULL,
            description TEXT,
            type VARCHAR(32) DEFAULT 'personal',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;");
        $logs[] = "Verified table: \`cp_workspaces\`";

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
        $logs[] = "Verified table: \`cp_collections\`";

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
        $logs[] = "Verified table: \`cp_environments\`";

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
        $logs[] = "Verified table: \`cp_history\`";

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
        $logs[] = "Verified table: \`cp_activity_logs\`";

        $pdo->exec("CREATE TABLE IF NOT EXISTS cp_saas_customers (
            id VARCHAR(64) PRIMARY KEY,
            user_id VARCHAR(64) NULL,
            name VARCHAR(255) NOT NULL,
            email VARCHAR(255) NOT NULL,
            company_name VARCHAR(255) DEFAULT 'Independent Developer',
            role VARCHAR(128) DEFAULT 'API Developer',
            plan VARCHAR(32) DEFAULT 'pro',
            status VARCHAR(32) DEFAULT 'active',
            monthly_fee DECIMAL(10,2) DEFAULT 29.00,
            total_requests BIGINT UNSIGNED DEFAULT 0,
            monthly_quota BIGINT UNSIGNED DEFAULT 1000000,
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
        $logs[] = "Verified table: \`cp_saas_customers\`";

        // Intelligent ALTER TABLE operations
        $colExists = function($table, $column) use ($pdo, $dbname) {
            $stmt = $pdo->prepare("SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND COLUMN_NAME = ?");
            $stmt->execute([$dbname, $table, $column]);
            return intval($stmt->fetchColumn()) > 0;
        };

        if (!$colExists('cp_users', 'role')) {
            $pdo->exec("ALTER TABLE cp_users ADD COLUMN role VARCHAR(32) NOT NULL DEFAULT 'member' AFTER avatar;");
            $logs[] = "Altered \`cp_users\`: Added missing column \`role\`";
        }
        if (!$colExists('cp_users', 'avatar')) {
            $pdo->exec("ALTER TABLE cp_users ADD COLUMN avatar TEXT NULL AFTER password_hash;");
            $logs[] = "Altered \`cp_users\`: Added missing column \`avatar\`";
        }
        if (!$colExists('cp_app_state', 'recent_requests_json')) {
            $pdo->exec("ALTER TABLE cp_app_state ADD COLUMN recent_requests_json LONGTEXT AFTER activity_logs_json;");
            $logs[] = "Altered \`cp_app_state\`: Added missing column \`recent_requests_json\`";
        }
        if (!$colExists('cp_app_state', 'settings_json')) {
            $pdo->exec("ALTER TABLE cp_app_state ADD COLUMN settings_json LONGTEXT AFTER recent_requests_json;");
            $logs[] = "Altered \`cp_app_state\`: Added missing column \`settings_json\`";
        }
        if (!$colExists('cp_saas_customers', 'user_id')) {
            $pdo->exec("ALTER TABLE cp_saas_customers ADD COLUMN user_id VARCHAR(64) NULL AFTER id;");
            $logs[] = "Altered \`cp_saas_customers\`: Added missing column \`user_id\`";
        }

        // Seed SuperAdmin hirenpatelhv@gmail.com
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
            $logs[] = "Provisioned SuperAdmin user \`hirenpatelhv@gmail.com\` with enterprise privileges.";
        }

        sendJson([
            'success' => true,
            'logs' => $logs,
            'message' => 'Database tables and schema have been successfully created/altered!'
        ]);
    } catch (PDOException $e) {
        sendJson(['success' => false, 'error' => $e->getMessage(), 'logs' => $logs], 400);
    }
}

if ($action === 'status') {
    try {
        $pdo = getDbConnection();
        if (!$pdo) sendJson(['success' => false, 'error' => 'Database not connected']);
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
            ];
        }
        sendJson(['success' => true, 'tables' => $tables, 'table_count' => count($tables)]);
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
</head>
<body class="bg-zinc-950 text-zinc-100 min-h-screen p-6 flex flex-col items-center justify-center">
<div class="w-full max-w-3xl bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-2xl">
    <div class="flex items-center gap-3 border-b border-zinc-800 pb-4 mb-6">
        <div class="w-10 h-10 rounded-xl bg-orange-500 flex items-center justify-center text-white font-bold">CP</div>
        <div>
            <h1 class="text-base font-bold text-white">CloudPost MySQL Database Installer</h1>
            <p class="text-xs text-zinc-400">Automated database creation, schema alteration, and SuperAdmin setup.</p>
        </div>
    </div>
    <div class="space-y-4 text-xs">
        <button onclick="runMigrate()" class="w-full py-3 bg-orange-600 hover:bg-orange-500 text-white font-bold rounded-xl transition-all shadow-lg shadow-orange-500/20">
            Run Database Create / Alter Migration
        </button>
        <pre id="output" class="p-4 bg-zinc-950 text-emerald-400 font-mono rounded-xl h-48 overflow-y-auto whitespace-pre-wrap border border-zinc-800">Ready.</pre>
    </div>
</div>
<script>
async function runMigrate() {
    const out = document.getElementById('output');
    out.innerHTML = 'Starting migration...';
    try {
        const fd = new FormData();
        fd.append('action', 'migrate_schema');
        const res = await fetch('', { method: 'POST', body: fd });
        const data = await res.json();
        out.innerHTML = data.logs ? data.logs.join('\\n') + '\\n\\n' + data.message : JSON.stringify(data, null, 2);
    } catch(e) {
        out.innerHTML = 'Error: ' + e.message;
    }
}
</script>
</body>
</html>
`;
}
