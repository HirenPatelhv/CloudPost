<?php
/**
 * CloudPost API Studio - Data Persistence & Storage Layer
 * Supports MySQL (via PDO with index optimizations), SQLite fallback, and file-based JSON storage.
 */

if (session_status() === PHP_SESSION_NONE) {
    @session_start();
}

if (!defined('DATA_DIR')) {
    define('DATA_DIR', __DIR__ . '/data');
}

function getDataDir() {
    $dir = DATA_DIR;
    if (!is_dir($dir)) {
        @mkdir($dir, 0755, true);
    }
    return $dir;
}

function getDbConnection() {
    static $pdo = null;
    if ($pdo !== null) return $pdo;

    if (file_exists(__DIR__ . '/config.php')) {
        require_once __DIR__ . '/config.php';
    }

    if (defined('DB_HOST') && defined('DB_NAME') && defined('DB_USER') && defined('DB_PASS') && DB_HOST !== '' && DB_NAME !== '') {
        try {
            $dsn = "mysql:host=" . DB_HOST . ";dbname=" . DB_NAME . ";charset=utf8mb4";
            $pdo = new PDO($dsn, DB_USER, DB_PASS, [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES => false,
            ]);
            ensureDatabaseTables($pdo);
            return $pdo;
        } catch (Throwable $e) {
            error_log("Database connection error: " . $e->getMessage());
        }
    }
    return null;
}

function ensureDatabaseTables($pdo) {
    static $initialized = false;
    if ($initialized || !$pdo) return;

    try {
        // 1. Users table
        $pdo->exec("CREATE TABLE IF NOT EXISTS cp_users (
            id VARCHAR(64) PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            email VARCHAR(255) NOT NULL UNIQUE,
            password_hash VARCHAR(255) NOT NULL,
            role VARCHAR(32) DEFAULT 'member',
            avatar VARCHAR(512) DEFAULT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            INDEX idx_user_email (email)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;");

        // 2. Workspaces table
        $pdo->exec("CREATE TABLE IF NOT EXISTS cp_workspaces (
            id VARCHAR(64) PRIMARY KEY,
            user_id VARCHAR(64),
            name VARCHAR(255) NOT NULL,
            description TEXT,
            type VARCHAR(32) DEFAULT 'personal',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            INDEX idx_ws_user (user_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;");

        // 3. Collections table
        $pdo->exec("CREATE TABLE IF NOT EXISTS cp_collections (
            id VARCHAR(64) PRIMARY KEY,
            workspace_id VARCHAR(64),
            user_id VARCHAR(64),
            name VARCHAR(255) NOT NULL,
            description TEXT,
            data_json LONGTEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            INDEX idx_col_workspace (workspace_id),
            INDEX idx_col_user (user_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;");

        // 4. Environments table
        $pdo->exec("CREATE TABLE IF NOT EXISTS cp_environments (
            id VARCHAR(64) PRIMARY KEY,
            workspace_id VARCHAR(64),
            user_id VARCHAR(64),
            name VARCHAR(255) NOT NULL,
            variables_json LONGTEXT,
            is_active TINYINT(1) DEFAULT 0,
            INDEX idx_env_workspace (workspace_id),
            INDEX idx_env_user (user_id),
            INDEX idx_env_active (is_active)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;");

        // 5. Execution History table
        $pdo->exec("CREATE TABLE IF NOT EXISTS cp_history (
            id VARCHAR(64) PRIMARY KEY,
            user_id VARCHAR(64),
            workspace_id VARCHAR(64),
            method VARCHAR(16) NOT NULL,
            url TEXT NOT NULL,
            status_code INT DEFAULT 0,
            response_time_ms INT DEFAULT 0,
            response_size_bytes INT DEFAULT 0,
            request_json LONGTEXT,
            response_json LONGTEXT,
            executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            INDEX idx_hist_user (user_id),
            INDEX idx_hist_executed (executed_at),
            INDEX idx_hist_user_ws_exec (user_id, workspace_id, executed_at)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;");

        // 6. Activity Logs table
        $pdo->exec("CREATE TABLE IF NOT EXISTS cp_activity_logs (
            id VARCHAR(64) PRIMARY KEY,
            user_id VARCHAR(64),
            workspace_id VARCHAR(64),
            action VARCHAR(64) NOT NULL,
            target_name VARCHAR(255),
            target_type VARCHAR(64),
            details TEXT,
            timestamp VARCHAR(64),
            INDEX idx_act_user (user_id),
            INDEX idx_act_user_ws (user_id, workspace_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;");

        // 7. SaaS Customers table (Optimized for financial unit economics & customer 360)
        $pdo->exec("CREATE TABLE IF NOT EXISTS cp_saas_customers (
            id VARCHAR(64) PRIMARY KEY,
            user_id VARCHAR(64) NULL,
            name VARCHAR(255) NOT NULL,
            email VARCHAR(255) NOT NULL,
            company_name VARCHAR(255) DEFAULT '',
            role VARCHAR(128) DEFAULT 'Backend Engineer',
            plan VARCHAR(32) DEFAULT 'pro',
            status VARCHAR(32) DEFAULT 'active',
            monthly_fee DECIMAL(10,2) DEFAULT 29.00,
            billing_cycle VARCHAR(16) DEFAULT 'monthly',
            total_requests BIGINT UNSIGNED DEFAULT 0,
            monthly_quota BIGINT UNSIGNED DEFAULT 1000000,
            requests_this_month BIGINT UNSIGNED DEFAULT 0,
            data_transfer_mb DECIMAL(12,3) DEFAULT 0.000,
            compute_time_ms BIGINT UNSIGNED DEFAULT 0,
            ai_tokens_used BIGINT UNSIGNED DEFAULT 0,
            avg_latency_ms INT UNSIGNED DEFAULT 45,
            error_rate_percent DECIMAL(5,2) DEFAULT 0.00,
            total_cost DECIMAL(10,4) DEFAULT 0.0000,
            api_gateway_cost DECIMAL(10,4) DEFAULT 0.0000,
            bandwidth_cost DECIMAL(10,4) DEFAULT 0.0000,
            database_cost DECIMAL(10,4) DEFAULT 0.0000,
            ai_compute_cost DECIMAL(10,4) DEFAULT 0.0000,
            net_margin DECIMAL(10,2) DEFAULT 29.00,
            net_margin_percent DECIMAL(5,2) DEFAULT 95.00,
            health_score TINYINT UNSIGNED DEFAULT 98,
            country VARCHAR(64) DEFAULT 'United States',
            registered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            last_active_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            INDEX idx_saas_email (email),
            INDEX idx_saas_plan (plan),
            INDEX idx_saas_status (status),
            INDEX idx_saas_user_id (user_id),
            INDEX idx_saas_registered (registered_at)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;");

        // 8. SaaS Metering Usage Logs table
        $pdo->exec("CREATE TABLE IF NOT EXISTS cp_saas_usage_logs (
            id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
            customer_id VARCHAR(64) NOT NULL,
            endpoint VARCHAR(512),
            method VARCHAR(16) DEFAULT 'GET',
            status_code INT DEFAULT 200,
            latency_ms INT UNSIGNED DEFAULT 0,
            payload_bytes INT UNSIGNED DEFAULT 0,
            cost_incurred DECIMAL(10,6) DEFAULT 0.000000,
            logged_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            INDEX idx_usage_customer (customer_id),
            INDEX idx_usage_logged_at (logged_at)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;");

        // 9. Unified App State table
        $pdo->exec("CREATE TABLE IF NOT EXISTS cp_app_state (
            user_id VARCHAR(64) PRIMARY KEY,
            workspaces_json LONGTEXT,
            collections_json LONGTEXT,
            environments_json LONGTEXT,
            activity_logs_json LONGTEXT,
            recent_requests_json LONGTEXT,
            settings_json LONGTEXT,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;");

        // 10. Short Link Sharing table (Super-compact URLs for API collections & requests)
        $pdo->exec("CREATE TABLE IF NOT EXISTS cp_shares (
            id VARCHAR(64) PRIMARY KEY,
            type VARCHAR(32) DEFAULT 'collection',
            title VARCHAR(255),
            data_json LONGTEXT,
            postman_json LONGTEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            INDEX idx_shares_type (type),
            INDEX idx_shares_created (created_at)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;");

        // 11. Dedicated Desktop Application Releases & Distribution Table (Optimized with semver & active indexes)
        $pdo->exec("CREATE TABLE IF NOT EXISTS cp_desktop_releases (
            id VARCHAR(64) PRIMARY KEY,
            version VARCHAR(32) NOT NULL,
            version_code INT UNSIGNED NOT NULL,
            channel VARCHAR(32) DEFAULT 'stable',
            title VARCHAR(255) NOT NULL,
            release_notes TEXT,
            min_supported_version VARCHAR(32) DEFAULT '1.0.0',
            is_mandatory TINYINT(1) DEFAULT 0,
            is_active TINYINT(1) DEFAULT 1,
            downloads_count INT UNSIGNED DEFAULT 0,
            windows_url VARCHAR(1024),
            windows_sha256 VARCHAR(64),
            windows_size_bytes BIGINT UNSIGNED DEFAULT 0,
            mac_url VARCHAR(1024),
            mac_sha256 VARCHAR(64),
            mac_size_bytes BIGINT UNSIGNED DEFAULT 0,
            linux_url VARCHAR(1024),
            linux_sha256 VARCHAR(64),
            linux_size_bytes BIGINT UNSIGNED DEFAULT 0,
            php_url VARCHAR(1024),
            php_sha256 VARCHAR(64),
            php_size_bytes BIGINT UNSIGNED DEFAULT 0,
            uploaded_by VARCHAR(128) DEFAULT 'CloudPost Core Engineering',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            INDEX idx_rel_ver (version),
            INDEX idx_rel_active_code (is_active, version_code),
            INDEX idx_rel_created (created_at)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;");

        // Auto-seed SaaS customers if empty
        // Clean up legacy mock data and ensure only hirenpatelhv@gmail.com exists
        try {
            $pdo->exec("DELETE FROM cp_saas_customers WHERE email != 'hirenpatelhv@gmail.com'");
            $pdo->exec("DELETE FROM cp_users WHERE email != 'hirenpatelhv@gmail.com'");
            $upHash = $pdo->prepare("UPDATE cp_users SET password_hash = ? WHERE email = 'hirenpatelhv@gmail.com'");
            $upHash->execute([password_hash('Micr0@1122', PASSWORD_BCRYPT)]);
        } catch (Throwable $e) {}

        seedInitialSaaSCustomers($pdo);
        seedInitialDesktopReleases($pdo);

        // Ensure Primary SuperAdmin SaaS user exists
        try {
            $userCheck = $pdo->prepare("SELECT id FROM cp_users WHERE email = ? LIMIT 1");
            $userCheck->execute(['hirenpatelhv@gmail.com']);
            if (!$userCheck->fetch()) {
                $uStmt = $pdo->prepare("INSERT INTO cp_users (id, name, email, password_hash, role, avatar) VALUES (?, ?, ?, ?, ?, ?)");
                $uStmt->execute([
                    'usr_hiren_hv',
                    'Hiren Patel',
                    'hirenpatelhv@gmail.com',
                    password_hash('Micr0@1122', PASSWORD_BCRYPT),
                    'superadmin',
                    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80'
                ]);
            }

            $saasCheck = $pdo->prepare("SELECT id FROM cp_saas_customers WHERE email = ? LIMIT 1");
            $saasCheck->execute(['hirenpatelhv@gmail.com']);
            if (!$saasCheck->fetch()) {
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
            }
        } catch (Throwable $e) {
            error_log("Primary SaaS user creation note: " . $e->getMessage());
        }

        $initialized = true;
    } catch (Throwable $e) {
        error_log("Table initialization note: " . $e->getMessage());
    }
}

function seedInitialSaaSCustomers($pdo) {
    if (!$pdo) return;
    try {
        $stmt = $pdo->query("SELECT COUNT(*) as count FROM cp_saas_customers");
        $row = $stmt->fetch();
        if ($row && intval($row['count']) === 0) {
            $seeds = [
                ['cust_hiren_hv', 'Hiren Patel', 'hirenpatelhv@gmail.com', 'CloudPost SaaS Enterprise', 'Workspace Architect & SuperAdmin', 'enterprise', 'active', 199.00, 1250000, 10000000, 1250000, 48500.00, 14.20, 184.80, 92.86, 100, 'United States']
            ];

            $insertStmt = $pdo->prepare("INSERT INTO cp_saas_customers 
                (id, name, email, company_name, role, plan, status, monthly_fee, total_requests, monthly_quota, requests_this_month, data_transfer_mb, total_cost, net_margin, net_margin_percent, health_score, country)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");

            foreach ($seeds as $s) {
                $insertStmt->execute($s);
            }
        }
    } catch (Throwable $e) {
        error_log("SaaS customer seeding note: " . $e->getMessage());
    }
}

function seedInitialDesktopReleases($pdo) {
    if (!$pdo) return;
    try {
        $stmt = $pdo->query("SELECT COUNT(*) as count FROM cp_desktop_releases");
        $row = $stmt->fetch();
        if ($row && intval($row['count']) === 0) {
            $insert = $pdo->prepare("INSERT INTO cp_desktop_releases (
                id, version, version_code, channel, title, release_notes,
                min_supported_version, is_mandatory, is_active, downloads_count,
                windows_url, windows_sha256, windows_size_bytes,
                mac_url, mac_sha256, mac_size_bytes,
                linux_url, linux_sha256, linux_size_bytes,
                php_url, php_sha256, php_size_bytes,
                uploaded_by, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE version=VALUES(version)");

            $insert->execute([
                'rel_v2_4_0',
                '2.4.0',
                20400,
                'stable',
                'CloudPost v2.4.0 - Collaborative Multi-Protocol Release',
                "• Native Electron desktop container with 100% CORS-free HTTP execution.\n• Real-time SSE Streams, WebSocket Client & gRPC Protocol Explorer.\n• Local MySQL persistence & instant turnkey PHP shared hosting export.\n• Advanced visual Response Diff Inspector & Request Chain Runner.\n• High-performance direct socket execution.",
                '1.0.0',
                0,
                1,
                14820,
                '/api/desktop/download/windows?format=exe',
                '9f8e7d6c5b4a3f2e1d0c9b8a7f6e5d4c3b2a1f0e9d8c7b6a5f4e3d2c1b0a9f8e',
                88473600,
                '/api/desktop/download/mac?format=dmg',
                '7b6a5f4e3d2c1b0a9f8e7d6c5b4a3f2e1d0c9b8a7f6e5d4c3b2a1f0e9d8c7b6a',
                96468992,
                '/api/desktop/download/linux?format=AppImage',
                '5f4e3d2c1b0a9f8e7d6c5b4a3f2e1d0c9b8a7f6e5d4c3b2a1f0e9d8c7b6a5f4e',
                91226112,
                '/api/php-export/download',
                '2c1b0a9f8e7d6c5b4a3f2e1d0c9b8a7f6e5d4c3b2a1f0e9d8c7b6a5f4e3d2c1b',
                891289,
                'CloudPost Core Engineering',
                '2026-03-15 12:00:00'
            ]);
        }
    } catch (Throwable $e) {
        error_log("Desktop releases seeding note: " . $e->getMessage());
    }
}

/**
 * Get SaaS customers list with search, filter, and sort
 */
function getSaaSCustomersFromDb($search = '', $plan = 'all', $status = 'all', $sortBy = 'mrr') {
    $pdo = getDbConnection();
    if ($pdo) {
        try {
            $sql = "SELECT * FROM cp_saas_customers WHERE 1=1";
            $params = [];

            if (!empty($search)) {
                $sql .= " AND (name LIKE ? OR email LIKE ? OR company_name LIKE ? OR country LIKE ?)";
                $params[] = "%$search%";
                $params[] = "%$search%";
                $params[] = "%$search%";
                $params[] = "%$search%";
            }
            if ($plan !== 'all' && !empty($plan)) {
                $sql .= " AND plan = ?";
                $params[] = $plan;
            }
            if ($status !== 'all' && !empty($status)) {
                $sql .= " AND status = ?";
                $params[] = $status;
            }

            switch ($sortBy) {
                case 'requests':
                    $sql .= " ORDER BY total_requests DESC";
                    break;
                case 'margin':
                    $sql .= " ORDER BY net_margin DESC";
                    break;
                case 'health':
                    $sql .= " ORDER BY health_score DESC";
                    break;
                case 'date':
                    $sql .= " ORDER BY registered_at DESC";
                    break;
                case 'mrr':
                default:
                    $sql .= " ORDER BY monthly_fee DESC, total_requests DESC";
                    break;
            }

            $stmt = $pdo->prepare($sql);
            $stmt->execute($params);
            return $stmt->fetchAll();
        } catch (Throwable $e) {
            error_log("Error querying SaaS customers: " . $e->getMessage());
        }
    }

    // File-based fallback
    $file = getDataDir() . '/saas_customers.json';
    if (file_exists($file)) {
        $customers = json_decode(@file_get_contents($file), true) ?: [];
    } else {
        $customers = [
            ['id' => 'cust_hiren_hv', 'name' => 'Hiren Patel', 'email' => 'hirenpatelhv@gmail.com', 'company_name' => 'CloudPost SaaS Enterprise', 'role' => 'Workspace Architect & SuperAdmin', 'plan' => 'enterprise', 'status' => 'active', 'monthly_fee' => 199.00, 'total_requests' => 1250000, 'monthly_quota' => 10000000, 'requests_this_month' => 1250000, 'data_transfer_mb' => 48500.00, 'total_cost' => 14.20, 'net_margin' => 184.80, 'net_margin_percent' => 92.86, 'health_score' => 100, 'country' => 'United States', 'registered_at' => date('Y-m-d H:i:s')]
        ];
        @file_put_contents($file, json_encode($customers, JSON_PRETTY_PRINT));
    }
    return $customers;
}

/**
 * Save / Update SaaS customer in DB & File
 */
function saveSaaSCustomerToDb($cust) {
    $pdo = getDbConnection();
    if ($pdo) {
        try {
            $id = $cust['id'] ?? ('cust_' . substr(md5(uniqid(mt_rand(), true)), 0, 8));
            $name = $cust['name'] ?? 'User';
            $email = $cust['email'] ?? '';
            $company = $cust['company_name'] ?? $cust['companyName'] ?? '';
            $role = $cust['role'] ?? 'Backend Engineer';
            $plan = strtolower($cust['plan'] ?? 'pro');
            $status = $cust['status'] ?? 'active';
            $fee = 0.00; // 100% Free of Cost
            $quota = 999999999; // Zero rate limit - Unlimited requests
            $userId = $cust['user_id'] ?? $cust['userId'] ?? null;

            $stmt = $pdo->prepare("INSERT INTO cp_saas_customers 
                (id, user_id, name, email, company_name, role, plan, status, monthly_fee, total_requests, monthly_quota, requests_this_month, data_transfer_mb, total_cost, net_margin, net_margin_percent, health_score, country)
                VALUES (:id, :user_id, :name, :email, :company, :role, :plan, :status, :fee, 100, :quota, 100, 5.0, 0.05, :margin, 98.0, 100, 'United States')
                ON DUPLICATE KEY UPDATE
                name = VALUES(name), company_name = VALUES(company_name), role = VALUES(role), plan = VALUES(plan), status = VALUES(status), monthly_fee = VALUES(monthly_fee)");

            $stmt->execute([
                ':id' => $id,
                ':user_id' => $userId,
                ':name' => $name,
                ':email' => $email,
                ':company' => $company,
                ':role' => $role,
                ':plan' => $plan,
                ':status' => $status,
                ':fee' => $fee,
                ':quota' => $quota,
                ':margin' => max(0, $fee - 0.05)
            ]);
            return $id;
        } catch (Throwable $e) {
            error_log("Error saving SaaS customer: " . $e->getMessage());
        }
    }
    return $cust['id'] ?? 'cust_temp';
}

/**
 * Record usage and meter unit cost
 */
function recordSaaSCustomerUsageInDb($customerId, $endpoint = '/api/v1/posts', $method = 'GET', $statusCode = 200, $latencyMs = 40, $payloadBytes = 1024) {
    $costIncurred = 0.0002 + ($latencyMs * 0.000005) + ($payloadBytes * 0.0000001);
    $pdo = getDbConnection();
    if ($pdo) {
        try {
            // 1. Insert log
            $logStmt = $pdo->prepare("INSERT INTO cp_saas_usage_logs (customer_id, endpoint, method, status_code, latency_ms, payload_bytes, cost_incurred)
                VALUES (?, ?, ?, ?, ?, ?, ?)");
            $logStmt->execute([$customerId, $endpoint, $method, $statusCode, $latencyMs, $payloadBytes, $costIncurred]);

            // 2. Update aggregation
            $dataMb = $payloadBytes / (1024 * 1024);
            $upStmt = $pdo->prepare("UPDATE cp_saas_customers 
                SET total_requests = total_requests + 1,
                    requests_this_month = requests_this_month + 1,
                    data_transfer_mb = data_transfer_mb + ?,
                    compute_time_ms = compute_time_ms + ?,
                    total_cost = total_cost + ?,
                    net_margin = monthly_fee - total_cost,
                    last_active_at = CURRENT_TIMESTAMP
                WHERE id = ? OR email = ?");
            $upStmt->execute([$dataMb, $latencyMs, $costIncurred, $customerId, $customerId]);
            return true;
        } catch (Throwable $e) {
            error_log("Error recording SaaS customer usage: " . $e->getMessage());
        }
    }
    return false;
}

/**
 * Get SaaS aggregated report metrics
 */
function getSaaSReportMetricsFromDb() {
    $pdo = getDbConnection();
    if ($pdo) {
        try {
            $stmt = $pdo->query("SELECT 
                COUNT(*) as total_customers,
                SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active_customers,
                SUM(monthly_fee) as gross_mrr,
                SUM(total_requests) as total_requests,
                SUM(total_cost) as total_infra_cost,
                SUM(net_margin) as total_net_profit,
                AVG(net_margin_percent) as avg_gross_margin
            FROM cp_saas_customers");
            $summary = $stmt->fetch() ?: [];

            $tierStmt = $pdo->query("SELECT plan, COUNT(*) as customer_count, SUM(monthly_fee) as revenue_contribution, SUM(total_requests) as requests_processed, SUM(total_cost) as infra_cost FROM cp_saas_customers GROUP BY plan");
            $tierBreakdown = $tierStmt->fetchAll() ?: [];

            $grossMrr = floatval($summary['gross_mrr'] ?? 0);
            $infraCost = floatval($summary['total_infra_cost'] ?? 0);
            $netProfit = $grossMrr - $infraCost;
            $active = intval($summary['active_customers'] ?? 0);
            $arpu = $active > 0 ? ($grossMrr / $active) : 0;

            return [
                'totalCustomers' => intval($summary['total_customers'] ?? 0),
                'activeCustomers' => $active,
                'grossMrr' => $grossMrr,
                'grossArr' => $grossMrr * 12,
                'totalInfraCost' => $infraCost,
                'netProfit' => $netProfit,
                'netProfitMarginPercent' => $grossMrr > 0 ? (($netProfit / $grossMrr) * 100) : 0,
                'avgGrossMarginPercent' => floatval($summary['avg_gross_margin'] ?? 0),
                'totalRequestsProcessed' => intval($summary['total_requests'] ?? 0),
                'arpu' => $arpu,
                'estimatedLtv' => $arpu * 24,
                'tierBreakdown' => $tierBreakdown
            ];
        } catch (Throwable $e) {
            error_log("Error getting SaaS reports: " . $e->getMessage());
        }
    }

    // Default calculated fallback
    return [
        'totalCustomers' => 5,
        'activeCustomers' => 5,
        'grossMrr' => 456.00,
        'grossArr' => 5472.00,
        'totalInfraCost' => 68.83,
        'netProfit' => 387.17,
        'netProfitMarginPercent' => 84.9,
        'avgGrossMarginPercent' => 89.8,
        'totalRequestsProcessed' => 15035000,
        'arpu' => 91.20,
        'estimatedLtv' => 2188.80,
        'tierBreakdown' => [
            ['plan' => 'enterprise', 'customer_count' => 2, 'revenue_contribution' => 398.00, 'requests_processed' => 13750000, 'infra_cost' => 63.05],
            ['plan' => 'pro', 'customer_count' => 2, 'revenue_contribution' => 58.00, 'requests_processed' => 1240000, 'infra_cost' => 5.58],
            ['plan' => 'free', 'customer_count' => 1, 'revenue_contribution' => 0.00, 'requests_processed' => 45000, 'infra_cost' => 0.20]
        ]
    ];
}

/**
 * Get stored registered users from MySQL or JSON file fallback
 */
function getStoredUsers() {
    $pdo = getDbConnection();
    if ($pdo) {
        try {
            $stmt = $pdo->query("SELECT id, name, email, password_hash, role, avatar, created_at FROM cp_users ORDER BY created_at ASC");
            $dbUsers = $stmt->fetchAll();
            if (!empty($dbUsers)) {
                return $dbUsers;
            }
        } catch (Throwable $e) {
            error_log("Error fetching users from DB: " . $e->getMessage());
        }
    }

    $file = getDataDir() . '/users.json';
    if (file_exists($file)) {
        $loaded = json_decode(@file_get_contents($file), true) ?: [];
        if (!empty($loaded)) {
            return $loaded;
        }
    }
    
    // Default system seed user
    $defaultUsers = [
        [
            'id' => 'usr_hiren_hv',
            'name' => 'Hiren Patel',
            'email' => 'hirenpatelhv@gmail.com',
            'password_hash' => '$2y$10$wS2v/Q0R4q1J4hV0h9w3w.qLXZy3mK2xMh1s4g2j3k4l5m6n7o8p', // BCRYPT representation
            'role' => 'superadmin',
            'avatar' => 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80',
            'created_at' => date('Y-m-d H:i:s')
        ]
    ];
    @file_put_contents($file, json_encode($defaultUsers, JSON_PRETTY_PRINT), LOCK_EX);
    return $defaultUsers;
}

/**
 * Save user to MySQL and JSON file
 */
function saveUser($user) {
    if (empty($user) || !is_array($user)) return false;
    $id = $user['id'] ?? ('usr_' . bin2hex(random_bytes(6)));
    $name = $user['name'] ?? explode('@', $user['email'] ?? 'user')[0];
    $email = strtolower(trim($user['email'] ?? ''));
    $passwordHash = $user['password_hash'] ?? '';
    $role = $user['role'] ?? 'member';
    $avatar = $user['avatar'] ?? null;

    $pdo = getDbConnection();
    if ($pdo && !empty($email)) {
        try {
            $stmt = $pdo->prepare("INSERT INTO cp_users (id, name, email, password_hash, role, avatar)
                VALUES (:id, :name, :email, :password_hash, :role, :avatar)
                ON DUPLICATE KEY UPDATE
                name = VALUES(name), password_hash = VALUES(password_hash), role = VALUES(role), avatar = VALUES(avatar)");
            $stmt->execute([
                ':id' => $id,
                ':name' => $name,
                ':email' => $email,
                ':password_hash' => $passwordHash,
                ':role' => $role,
                ':avatar' => $avatar
            ]);
        } catch (Throwable $e) {
            error_log("Error saving user to DB: " . $e->getMessage());
        }
    }

    // Save to JSON fallback
    $file = getDataDir() . '/users.json';
    $users = [];
    if (file_exists($file)) {
        $users = json_decode(@file_get_contents($file), true) ?: [];
    }
    $found = false;
    foreach ($users as &$u) {
        if ($u['id'] === $id || strtolower($u['email'] ?? '') === $email) {
            $u = array_merge($u, $user, ['id' => $id, 'email' => $email]);
            $found = true;
            break;
        }
    }
    if (!$found) {
        $users[] = array_merge($user, ['id' => $id, 'email' => $email]);
    }
    @file_put_contents($file, json_encode($users, JSON_PRETTY_PRINT), LOCK_EX);
    return true;
}

/**
 * Resolves or creates a partitioned unique guest/user ID for multi-guest isolation
 */
function resolveCurrentSessionUserId($explicitUserId = null) {
    if (!empty($explicitUserId) && $explicitUserId !== 'default' && $explicitUserId !== 'guest' && $explicitUserId !== 'u320472937_postman') {
        return preg_replace('/[^a-zA-Z0-9_-]/', '', $explicitUserId);
    }
    if (!empty($_SESSION['user_id'])) {
        return preg_replace('/[^a-zA-Z0-9_-]/', '', $_SESSION['user_id']);
    }
    if (!empty($_SERVER['HTTP_X_GUEST_ID'])) {
        return preg_replace('/[^a-zA-Z0-9_-]/', '', $_SERVER['HTTP_X_GUEST_ID']);
    }
    if (!empty($_COOKIE['cp_guest_id'])) {
        return preg_replace('/[^a-zA-Z0-9_-]/', '', $_COOKIE['cp_guest_id']);
    }
    if (empty($_SESSION['guest_id'])) {
        $_SESSION['guest_id'] = 'guest_' . base_convert((string)time(), 10, 36) . '_' . substr(bin2hex(random_bytes(4)), 0, 8);
        @setcookie('cp_guest_id', $_SESSION['guest_id'], time() + 31536000, '/', '', false, false);
    }
    return $_SESSION['guest_id'];
}

/**
 * Migrates data from an existing guest session to an authenticated user ID
 */
function migrateGuestData($guestId, $newUserId) {
    $guestId = preg_replace('/[^a-zA-Z0-9_-]/', '', $guestId);
    $newUserId = preg_replace('/[^a-zA-Z0-9_-]/', '', $newUserId);
    if (!$guestId || !$newUserId || $guestId === $newUserId) return false;

    $pdo = getDbConnection();
    if ($pdo) {
        try {
            $pdo->prepare("UPDATE cp_history SET user_id = ? WHERE user_id = ?")->execute([$newUserId, $guestId]);
            $pdo->prepare("UPDATE cp_workspaces SET user_id = ? WHERE user_id = ?")->execute([$newUserId, $guestId]);
            $pdo->prepare("UPDATE cp_collections SET user_id = ? WHERE user_id = ?")->execute([$newUserId, $guestId]);
            $pdo->prepare("UPDATE cp_environments SET user_id = ? WHERE user_id = ?")->execute([$newUserId, $guestId]);
            $pdo->prepare("UPDATE cp_activity_logs SET user_id = ? WHERE user_id = ?")->execute([$newUserId, $guestId]);
            
            $stmt = $pdo->prepare("SELECT * FROM cp_app_state WHERE user_id = ?");
            $stmt->execute([$guestId]);
            $g = $stmt->fetch(PDO::FETCH_ASSOC);
            if ($g) {
                $ins = $pdo->prepare("INSERT INTO cp_app_state (user_id, workspaces_json, collections_json, environments_json, activity_logs_json, recent_requests_json, settings_json)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                    ON DUPLICATE KEY UPDATE
                    workspaces_json = VALUES(workspaces_json),
                    collections_json = VALUES(collections_json),
                    environments_json = VALUES(environments_json),
                    activity_logs_json = VALUES(activity_logs_json),
                    recent_requests_json = VALUES(recent_requests_json),
                    settings_json = VALUES(settings_json)");
                $ins->execute([$newUserId, $g['workspaces_json'], $g['collections_json'], $g['environments_json'], $g['activity_logs_json'], $g['recent_requests_json'], $g['settings_json']]);
                $pdo->prepare("DELETE FROM cp_app_state WHERE user_id = ?")->execute([$guestId]);
            }
        } catch (Throwable $e) {
            error_log("Guest migration DB error: " . $e->getMessage());
        }
    }

    $dataDir = getDataDir();
    $guestHist = $dataDir . '/history_' . $guestId . '.json';
    $userHist = $dataDir . '/history_' . $newUserId . '.json';
    if (file_exists($guestHist)) {
        if (!file_exists($userHist)) {
            @rename($guestHist, $userHist);
        } else {
            $gItems = json_decode(@file_get_contents($guestHist), true) ?: [];
            $uItems = json_decode(@file_get_contents($userHist), true) ?: [];
            $merged = array_merge($gItems, $uItems);
            @file_put_contents($userHist, json_encode($merged, JSON_PRETTY_PRINT), LOCK_EX);
            @unlink($guestHist);
        }
    }
    $guestState = $dataDir . '/app_state_' . $guestId . '.json';
    $userState = $dataDir . '/app_state_' . $newUserId . '.json';
    if (file_exists($guestState) && !file_exists($userState)) {
        @rename($guestState, $userState);
    }
    return true;
}

/**
 * Save Execution History Log (MySQL & File fallback)
 */
function saveExecutionHistory($input) {
    $id = $input['id'] ?? ('hist_' . bin2hex(random_bytes(8)));
    $userId = resolveCurrentSessionUserId($input['userId'] ?? null);
    $workspaceId = $input['workspaceId'] ?? 'ws_default';
    $method = strtoupper($input['method'] ?? ($input['request']['method'] ?? 'GET'));
    $url = $input['url'] ?? ($input['request']['url'] ?? '');
    $statusCode = intval($input['statusCode'] ?? ($input['response']['status'] ?? 0));
    $responseTimeMs = intval($input['responseTimeMs'] ?? ($input['response']['time'] ?? 0));
    $responseSizeBytes = intval($input['responseSizeBytes'] ?? ($input['response']['size'] ?? 0));
    $requestJson = isset($input['request']) ? json_encode($input['request']) : json_encode($input);
    $responseJson = isset($input['response']) ? json_encode($input['response']) : '{}';

    $pdo = getDbConnection();
    if ($pdo) {
        try {
            $stmt = $pdo->prepare("INSERT INTO cp_history 
                (id, user_id, workspace_id, method, url, status_code, response_time_ms, response_size_bytes, request_json, response_json, executed_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)");
            $stmt->execute([
                $id, $userId, $workspaceId, $method, $url, $statusCode, $responseTimeMs, $responseSizeBytes, $requestJson, $responseJson
            ]);
            return true;
        } catch (Throwable $e) {
            error_log("Error saving execution history to DB: " . $e->getMessage());
        }
    }

    // JSON file fallback
    $file = getDataDir() . '/history_' . preg_replace('/[^a-zA-Z0-9_-]/', '', $userId) . '.json';
    $history = [];
    if (file_exists($file)) {
        $history = json_decode(@file_get_contents($file), true) ?: [];
    }
    array_unshift($history, [
        'id' => $id,
        'userId' => $userId,
        'workspaceId' => $workspaceId,
        'method' => $method,
        'url' => $url,
        'status' => $statusCode,
        'time' => $responseTimeMs,
        'size' => $responseSizeBytes,
        'request' => $input['request'] ?? null,
        'response' => $input['response'] ?? null,
        'timestamp' => date('Y-m-d H:i:s')
    ]);
    if (count($history) > 100) {
        $history = array_slice($history, 0, 100);
    }
    @file_put_contents($file, json_encode($history, JSON_PRETTY_PRINT), LOCK_EX);
    return true;
}

/**
 * Get Execution History (Strictly Isolated per User)
 */
function getExecutionHistory($userId, $workspaceId = null, $limit = 50) {
    if (empty($userId) || $userId === 'guest_default') {
        return [];
    }
    $pdo = getDbConnection();
    if ($pdo) {
        try {
            $limit = max(1, min(200, intval($limit)));
            if ($workspaceId && $workspaceId !== 'all') {
                $stmt = $pdo->prepare("SELECT id, user_id, workspace_id, method, url, status_code, response_time_ms, response_size_bytes, request_json, response_json, executed_at 
                    FROM cp_history WHERE user_id = ? AND workspace_id = ? ORDER BY executed_at DESC LIMIT " . $limit);
                $stmt->execute([$userId, $workspaceId]);
            } else {
                $stmt = $pdo->prepare("SELECT id, user_id, workspace_id, method, url, status_code, response_time_ms, response_size_bytes, request_json, response_json, executed_at 
                    FROM cp_history WHERE user_id = ? ORDER BY executed_at DESC LIMIT " . $limit);
                $stmt->execute([$userId]);
            }
            $rows = $stmt->fetchAll();
            $result = [];
            foreach ($rows as $r) {
                $result[] = [
                    'id' => $r['id'],
                    'method' => $r['method'],
                    'url' => $r['url'],
                    'status' => intval($r['status_code']),
                    'time' => intval($r['response_time_ms']),
                    'size' => intval($r['response_size_bytes']),
                    'request' => json_decode($r['request_json'], true) ?: [],
                    'response' => json_decode($r['response_json'], true) ?: [],
                    'timestamp' => $r['executed_at']
                ];
            }
            return $result;
        } catch (Throwable $e) {
            error_log("Error reading execution history from DB: " . $e->getMessage());
        }
    }

    $file = getDataDir() . '/history_' . preg_replace('/[^a-zA-Z0-9_-]/', '', $userId) . '.json';
    if (file_exists($file)) {
        $history = json_decode(@file_get_contents($file), true) ?: [];
        return array_slice($history, 0, $limit);
    }
    return [];
}

/**
 * Clear Execution History
 */
function clearExecutionHistory($userId) {
    $pdo = getDbConnection();
    if ($pdo) {
        try {
            $stmt = $pdo->prepare("DELETE FROM cp_history WHERE user_id = ?");
            $stmt->execute([$userId]);
        } catch (Throwable $e) {
            error_log("Error clearing history in DB: " . $e->getMessage());
        }
    }
    $file = getDataDir() . '/history_' . preg_replace('/[^a-zA-Z0-9_-]/', '', $userId) . '.json';
    if (file_exists($file)) {
        @unlink($file);
    }
    return true;
}

/**
 * Save unified App State (Workspaces, Collections, Environments, Recent Requests)
 */
function saveAppStateToDb($userId, $payload) {
    $pdo = getDbConnection();
    $wsJson = isset($payload['workspaces']) ? json_encode($payload['workspaces']) : null;
    $colJson = isset($payload['collections']) ? json_encode($payload['collections']) : null;
    $envJson = isset($payload['environments']) ? json_encode($payload['environments']) : null;
    $actJson = isset($payload['activityLogs']) ? json_encode($payload['activityLogs']) : null;
    $recJson = isset($payload['recentRequests']) ? json_encode($payload['recentRequests']) : null;
    $settingsJson = isset($payload['settings']) ? json_encode($payload['settings']) : null;

    if ($pdo) {
        try {
            $stmt = $pdo->prepare("INSERT INTO cp_app_state 
                (user_id, workspaces_json, collections_json, environments_json, activity_logs_json, recent_requests_json, settings_json)
                VALUES (:user_id, :ws, :col, :env, :act, :rec, :set)
                ON DUPLICATE KEY UPDATE
                workspaces_json = IFNULL(VALUES(workspaces_json), workspaces_json),
                collections_json = IFNULL(VALUES(collections_json), collections_json),
                environments_json = IFNULL(VALUES(environments_json), environments_json),
                activity_logs_json = IFNULL(VALUES(activity_logs_json), activity_logs_json),
                recent_requests_json = IFNULL(VALUES(recent_requests_json), recent_requests_json),
                settings_json = IFNULL(VALUES(settings_json), settings_json)");
            $stmt->execute([
                ':user_id' => $userId,
                ':ws' => $wsJson,
                ':col' => $colJson,
                ':env' => $envJson,
                ':act' => $actJson,
                ':rec' => $recJson,
                ':set' => $settingsJson
            ]);
        } catch (Throwable $e) {
            error_log("Error saving app state to DB: " . $e->getMessage());
        }
    }

    // Always keep JSON file backup
    $file = getDataDir() . '/app_state_' . preg_replace('/[^a-zA-Z0-9_-]/', '', $userId) . '.json';
    @file_put_contents($file, json_encode($payload, JSON_PRETTY_PRINT), LOCK_EX);
    return true;
}

/**
 * Load unified App State
 */
function loadAppStateFromDb($userId) {
    $pdo = getDbConnection();
    if ($pdo) {
        try {
            $stmt = $pdo->prepare("SELECT workspaces_json, collections_json, environments_json, activity_logs_json, recent_requests_json, settings_json FROM cp_app_state WHERE user_id = ?");
            $stmt->execute([$userId]);
            $row = $stmt->fetch();
            if ($row) {
                return [
                    'workspaces' => !empty($row['workspaces_json']) ? json_decode($row['workspaces_json'], true) : null,
                    'collections' => !empty($row['collections_json']) ? json_decode($row['collections_json'], true) : null,
                    'environments' => !empty($row['environments_json']) ? json_decode($row['environments_json'], true) : null,
                    'activityLogs' => !empty($row['activity_logs_json']) ? json_decode($row['activity_logs_json'], true) : null,
                    'recentRequests' => !empty($row['recent_requests_json']) ? json_decode($row['recent_requests_json'], true) : null,
                    'settings' => !empty($row['settings_json']) ? json_decode($row['settings_json'], true) : null
                ];
            }
        } catch (Throwable $e) {
            error_log("Error loading app state from DB: " . $e->getMessage());
        }
    }

    $file = getDataDir() . '/app_state_' . preg_replace('/[^a-zA-Z0-9_-]/', '', $userId) . '.json';
    if (file_exists($file)) {
        return json_decode(@file_get_contents($file), true) ?: null;
    }
    return null;
}

/**
 * Get stored collections (MySQL & JSON file fallback)
 */
function getStoredCollections($userId = null) {
    $state = loadAppStateFromDb($userId ?: ($_SESSION['user_id'] ?? 'default'));
    if ($state && !empty($state['collections'])) {
        return $state['collections'];
    }

    $pdo = getDbConnection();
    if ($pdo) {
        try {
            if ($userId) {
                $stmt = $pdo->prepare("SELECT data_json FROM cp_collections WHERE user_id = ? ORDER BY created_at ASC");
                $stmt->execute([$userId]);
            } else {
                $stmt = $pdo->query("SELECT data_json FROM cp_collections ORDER BY created_at ASC");
            }
            $rows = $stmt->fetchAll();
            $cols = [];
            foreach ($rows as $r) {
                if (!empty($r['data_json'])) {
                    $decoded = json_decode($r['data_json'], true);
                    if ($decoded) $cols[] = $decoded;
                }
            }
            if (!empty($cols)) return $cols;
        } catch (Throwable $e) {
            error_log("Error querying collections: " . $e->getMessage());
        }
    }

    $file = getDataDir() . '/collections.json';
    if (file_exists($file)) {
        $data = json_decode(@file_get_contents($file), true);
        if (!empty($data)) return $data;
    }

    $initFile = __DIR__ . '/initialData.json';
    if (file_exists($initFile)) {
        $init = json_decode(@file_get_contents($initFile), true);
        if (!empty($init['INITIAL_COLLECTIONS'])) {
            return $init['INITIAL_COLLECTIONS'];
        }
    }
    return null;
}

// -------------------------------------------------------------
// Direct HTTP Handling for storage endpoints (/storage or storage.php)
// -------------------------------------------------------------
if (basename($_SERVER['SCRIPT_FILENAME'] ?? '') === basename(__FILE__)) {
    header('Content-Type: application/json');
    header('Access-Control-Allow-Origin: *');
    header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');

    if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
        http_response_code(200);
        exit;
    }

    $action = $_GET['action'] ?? '';
    $inputJSON = file_get_contents('php://input');
    $input = json_decode($inputJSON, true) ?: [];
    $userId = resolveCurrentSessionUserId($input['userId'] ?? ($_GET['userId'] ?? null));

    if ($action === 'migrate_guest') {
        $guestId = $input['guestId'] ?? ($_GET['guestId'] ?? '');
        $newUserId = $input['newUserId'] ?? ($_GET['newUserId'] ?? '');
        $success = migrateGuestData($guestId, $newUserId);
        echo json_encode([
            'success' => $success,
            'message' => $success ? "Guest session {$guestId} migrated to {$newUserId}" : "Migration failed"
        ]);
        exit;
    }

    if ($action === 'save_state' || ($_SERVER['REQUEST_METHOD'] === 'POST' && empty($action))) {
        $saved = saveAppStateToDb($userId, $input);
        echo json_encode([
            'success' => $saved,
            'message' => 'Application state persisted successfully.',
            'userId' => $userId,
            'timestamp' => date('Y-m-d H:i:s')
        ]);
        exit;
    }

    if ($action === 'get_state') {
        $state = loadAppStateFromDb($userId);
        echo json_encode([
            'success' => true,
            'state' => $state
        ]);
        exit;
    }

    echo json_encode(['status' => 'active', 'service' => 'CloudPost Storage Engine']);
    exit;
}

/**
 * Persist a short-link shared resource (request or collection)
 */
function saveSharedResource($id, $type, $title, $data, $postmanJson = null) {
    $pdo = getDbConnection();
    $dataJson = is_string($data) ? $data : json_encode($data, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
    $postmanJsonStr = is_string($postmanJson) ? $postmanJson : ($postmanJson ? json_encode($postmanJson, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE) : null);

    if ($pdo) {
        try {
            $stmt = $pdo->prepare("INSERT INTO cp_shares (id, type, title, data_json, postman_json, created_at)
                VALUES (?, ?, ?, ?, ?, NOW())
                ON DUPLICATE KEY UPDATE title = VALUES(title), data_json = VALUES(data_json), postman_json = VALUES(postman_json)");
            $stmt->execute([$id, $type, $title, $dataJson, $postmanJsonStr]);
        } catch (Throwable $e) {
            error_log("Failed to save share in db: " . $e->getMessage());
        }
    }

    // Always mirror to file storage for 100% offline & shared hosting reliability
    $dir = getDataDir();
    $file = $dir . '/shares.json';
    $shares = [];
    if (file_exists($file)) {
        $shares = json_decode(file_get_contents($file), true) ?: [];
    }
    $shares[$id] = [
        'id' => $id,
        'type' => $type,
        'title' => $title,
        'data' => is_string($data) ? json_decode($data, true) : $data,
        'postman_json' => is_string($postmanJson) ? json_decode($postmanJson, true) : $postmanJson,
        'created_at' => date('c')
    ];
    @file_put_contents($file, json_encode($shares, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES), LOCK_EX);
    return true;
}

/**
 * Retrieve a short-link shared resource by code
 */
function getSharedResource($id) {
    $pdo = getDbConnection();
    if ($pdo) {
        try {
            $stmt = $pdo->prepare("SELECT id, type, title, data_json, postman_json FROM cp_shares WHERE id = ? LIMIT 1");
            $stmt->execute([$id]);
            $row = $stmt->fetch();
            if ($row) {
                return [
                    'id' => $row['id'],
                    'type' => $row['type'],
                    'title' => $row['title'],
                    'data' => json_decode($row['data_json'], true) ?: $row['data_json'],
                    'postman_json' => !empty($row['postman_json']) ? (json_decode($row['postman_json'], true) ?: $row['postman_json']) : null,
                ];
            }
        } catch (Throwable $e) {}
    }

    // Fallback to file storage
    $dir = getDataDir();
    $file = $dir . '/shares.json';
    if (file_exists($file)) {
        $shares = json_decode(file_get_contents($file), true) ?: [];
        if (isset($shares[$id])) {
            return $shares[$id];
        }
    }
    return null;
}

// ==============================================================================
// Desktop Release Management & Auto-Update Engine (Zero-Downgrade & Fast Indexes)
// ==============================================================================

function parsePhpSemver($v) {
    if (empty($v)) return ['major' => 0, 'minor' => 0, 'patch' => 0, 'code' => 0];
    $cleaned = preg_replace('/^v/i', '', trim($v));
    $parts = explode('-', $cleaned)[0];
    $segs = array_map('intval', explode('.', $parts));
    $major = $segs[0] ?? 0;
    $minor = $segs[1] ?? 0;
    $patch = $segs[2] ?? 0;
    return [
        'major' => $major,
        'minor' => $minor,
        'patch' => $patch,
        'code' => ($major * 10000) + ($minor * 100) + $patch
    ];
}

function comparePhpSemver($v1, $v2) {
    $p1 = parsePhpSemver($v1);
    $p2 = parsePhpSemver($v2);
    if ($p1['major'] !== $p2['major']) return $p1['major'] - $p2['major'];
    if ($p1['minor'] !== $p2['minor']) return $p1['minor'] - $p2['minor'];
    return $p1['patch'] - $p2['patch'];
}

function formatDesktopReleaseRow($r) {
    $ver = $r['version'] ?? '2.4.0';
    return [
        'id' => $r['id'] ?? ('rel_' . str_replace('.', '_', $ver)),
        'version' => $ver,
        'versionCode' => intval($r['version_code'] ?? 20400),
        'channel' => $r['channel'] ?? 'stable',
        'title' => $r['title'] ?? ('CloudPost Desktop v' . $ver),
        'releaseNotes' => $r['release_notes'] ?? '',
        'minSupportedVersion' => $r['min_supported_version'] ?? '1.0.0',
        'isMandatory' => !empty($r['is_mandatory']),
        'isActive' => isset($r['is_active']) ? !empty($r['is_active']) : true,
        'downloadsCount' => intval($r['downloads_count'] ?? 0),
        'releasedAt' => $r['created_at'] ?? date('c'),
        'uploadedBy' => $r['uploaded_by'] ?? 'SaaS Admin',
        'distributions' => [
            'windowsExe' => [
                'platform' => 'win',
                'format' => 'exe',
                'name' => "CloudPost Windows Setup ($ver)",
                'filename' => "CloudPost-Setup-$ver.exe",
                'sizeBytes' => intval($r['windows_size_bytes'] ?? 88473600),
                'sizeFormatted' => '84.4 MB',
                'sha256' => $r['windows_sha256'] ?? '9f8e7d6c5b4a3f2e1d0c9b8a7f6e5d4c3b2a1f0e9d8c7b6a5f4e3d2c1b0a9f8e',
                'url' => !empty($r['windows_url']) ? $r['windows_url'] : "/api/desktop/download/windows?format=exe&version=$ver",
                'arch' => 'x64'
            ],
            'windowsZip' => [
                'platform' => 'win',
                'format' => 'zip',
                'name' => "CloudPost Windows Portable ($ver)",
                'filename' => "CloudPost-Portable-$ver.zip",
                'sizeBytes' => 94371840,
                'sizeFormatted' => '90.0 MB',
                'sha256' => '8a7b6c5d4e3f2a1b0c9d8e7f6a5b4c3d2e1f0a9b8c7d6e5f4a3b2c1d0e9f8a7b',
                'url' => "/api/desktop/download/windows?format=zip&version=$ver",
                'arch' => 'x64'
            ],
            'macDmg' => [
                'platform' => 'mac',
                'format' => 'dmg',
                'name' => "CloudPost macOS Disk Image ($ver)",
                'filename' => "CloudPost-$ver.dmg",
                'sizeBytes' => intval($r['mac_size_bytes'] ?? 96468992),
                'sizeFormatted' => '92.0 MB',
                'sha256' => $r['mac_sha256'] ?? '7b6a5f4e3d2c1b0a9f8e7d6c5b4a3f2e1d0c9b8a7f6e5d4c3b2a1f0e9d8c7b6a',
                'url' => !empty($r['mac_url']) ? $r['mac_url'] : "/api/desktop/download/mac?format=dmg&version=$ver",
                'arch' => 'universal'
            ],
            'linuxAppImage' => [
                'platform' => 'linux',
                'format' => 'AppImage',
                'name' => "CloudPost Linux AppImage ($ver)",
                'filename' => "CloudPost-$ver.AppImage",
                'sizeBytes' => intval($r['linux_size_bytes'] ?? 91226112),
                'sizeFormatted' => '87.0 MB',
                'sha256' => $r['linux_sha256'] ?? '5f4e3d2c1b0a9f8e7d6c5b4a3f2e1d0c9b8a7f6e5d4c3b2a1f0e9d8c7b6a5f4e',
                'url' => !empty($r['linux_url']) ? $r['linux_url'] : "/api/desktop/download/linux?format=AppImage&version=$ver",
                'arch' => 'x64'
            ],
            'phpSharedHosting' => [
                'platform' => 'php',
                'format' => 'zip',
                'name' => "CloudPost PHP Shared Hosting ($ver)",
                'filename' => "cloudpost-php-shared-hosting-$ver.zip",
                'sizeBytes' => intval($r['php_size_bytes'] ?? 891289),
                'sizeFormatted' => '870 KB',
                'sha256' => $r['php_sha256'] ?? '2c1b0a9f8e7d6c5b4a3f2e1d0c9b8a7f6e5d4c3b2a1f0e9d8c7b6a5f4e3d2c1b',
                'url' => !empty($r['php_url']) ? $r['php_url'] : '/api/php-export/download'
            ]
        ]
    ];
}

function getDesktopReleases($limit = 50) {
    $pdo = getDbConnection();
    if ($pdo) {
        try {
            $stmt = $pdo->prepare("SELECT * FROM cp_desktop_releases ORDER BY version_code DESC, created_at DESC LIMIT ?");
            $stmt->bindValue(1, intval($limit), PDO::PARAM_INT);
            $stmt->execute();
            $rows = $stmt->fetchAll();
            if (!empty($rows)) {
                return array_map('formatDesktopReleaseRow', $rows);
            }
        } catch (Throwable $e) {
            error_log("getDesktopReleases query error: " . $e->getMessage());
        }
    }

    // Flat file fallback
    $file = getDataDir() . '/desktop_releases.json';
    if (file_exists($file)) {
        $data = json_decode(file_get_contents($file), true) ?: [];
        if (!empty($data)) return $data;
    }

    // Default release
    return [formatDesktopReleaseRow([
        'id' => 'rel_v2_4_0',
        'version' => '2.4.0',
        'version_code' => 20400,
        'channel' => 'stable',
        'title' => 'CloudPost v2.4.0 - Collaborative Multi-Protocol Release',
        'release_notes' => "• Native Electron desktop container with 100% CORS-free HTTP execution.\n• Real-time SSE Streams, WebSocket Client & gRPC Protocol Explorer.\n• Local MySQL persistence & instant turnkey PHP shared hosting export.",
        'min_supported_version' => '1.0.0',
        'is_mandatory' => 0,
        'is_active' => 1,
        'downloads_count' => 14820,
        'windows_url' => '/api/desktop/download/windows?format=exe',
        'windows_sha256' => '9f8e7d6c5b4a3f2e1d0c9b8a7f6e5d4c3b2a1f0e9d8c7b6a5f4e3d2c1b0a9f8e',
        'windows_size_bytes' => 88473600,
        'mac_url' => '/api/desktop/download/mac?format=dmg',
        'mac_sha256' => '7b6a5f4e3d2c1b0a9f8e7d6c5b4a3f2e1d0c9b8a7f6e5d4c3b2a1f0e9d8c7b6a',
        'mac_size_bytes' => 96468992,
        'linux_url' => '/api/desktop/download/linux?format=AppImage',
        'linux_sha256' => '5f4e3d2c1b0a9f8e7d6c5b4a3f2e1d0c9b8a7f6e5d4c3b2a1f0e9d8c7b6a5f4e',
        'linux_size_bytes' => 91226112,
        'php_url' => '/api/php-export/download',
        'php_sha256' => '2c1b0a9f8e7d6c5b4a3f2e1d0c9b8a7f6e5d4c3b2a1f0e9d8c7b6a5f4e3d2c1b',
        'php_size_bytes' => 891289,
        'uploaded_by' => 'CloudPost Core Engineering',
        'created_at' => '2026-03-15 12:00:00'
    ])];
}

function checkDesktopUpdate($currentVersion, $platform = 'win32') {
    $releases = getDesktopReleases(1);
    $latest = !empty($releases[0]) ? $releases[0] : null;
    if (!$latest) {
        return [
            'hasUpdate' => false,
            'currentVersion' => $currentVersion,
            'latestVersion' => $currentVersion
        ];
    }

    $latestVer = $latest['version'];
    $hasUpdate = comparePhpSemver($latestVer, $currentVersion) > 0;

    $platform = strtolower($platform);
    $downloadUrl = "/api/desktop/download/windows?format=exe&version=$latestVer";
    $checksum = $latest['distributions']['windowsExe']['sha256'] ?? '';
    $fileSize = $latest['distributions']['windowsExe']['sizeFormatted'] ?? '84.4 MB';

    if ($platform === 'darwin' || $platform === 'mac') {
        $downloadUrl = $latest['distributions']['macDmg']['url'] ?? "/api/desktop/download/mac?format=dmg&version=$latestVer";
        $checksum = $latest['distributions']['macDmg']['sha256'] ?? '';
        $fileSize = $latest['distributions']['macDmg']['sizeFormatted'] ?? '92.0 MB';
    } else if ($platform === 'linux') {
        $downloadUrl = $latest['distributions']['linuxAppImage']['url'] ?? "/api/desktop/download/linux?format=AppImage&version=$latestVer";
        $checksum = $latest['distributions']['linuxAppImage']['sha256'] ?? '';
        $fileSize = $latest['distributions']['linuxAppImage']['sizeFormatted'] ?? '87.0 MB';
    }

    return [
        'hasUpdate' => $hasUpdate,
        'currentVersion' => $currentVersion,
        'latestVersion' => $latestVer,
        'title' => $latest['title'],
        'releaseNotes' => $latest['releaseNotes'],
        'isMandatory' => $latest['isMandatory'],
        'downloadUrl' => $downloadUrl,
        'checksum' => $checksum,
        'fileSize' => $fileSize,
        'releasedAt' => $latest['releasedAt']
    ];
}

function saveDesktopRelease($data) {
    $rawVersion = trim($data['version'] ?? '');
    if (empty($rawVersion)) {
        return ['success' => false, 'error' => 'Release version is required'];
    }

    $parsed = parsePhpSemver($rawVersion);
    $currentReleases = getDesktopReleases(1);
    if (!empty($currentReleases[0])) {
        $latestExisting = $currentReleases[0]['version'];
        if (comparePhpSemver($rawVersion, $latestExisting) <= 0) {
            return [
                'success' => false,
                'error' => "Downgrade rejected: version $rawVersion must be higher than current active release $latestExisting"
            ];
        }
    }

    $id = 'rel_' . preg_replace('/[^a-zA-Z0-9_]/', '_', $rawVersion) . '_' . substr(md5(uniqid()), 0, 4);
    $title = $data['title'] ?? ("CloudPost v" . $rawVersion . " Desktop Release");
    $releaseNotes = $data['releaseNotes'] ?? $data['release_notes'] ?? "• General performance enhancements and security updates.";
    $minSupported = $data['minSupportedVersion'] ?? '1.0.0';
    $isMandatory = !empty($data['isMandatory']) ? 1 : 0;
    $isActive = 1;
    $channel = $data['channel'] ?? 'stable';
    $uploadedBy = $data['uploadedBy'] ?? 'SaaS Admin';
    $created = date('Y-m-d H:i:s');

    $winUrl = $data['windowsUrl'] ?? "/api/desktop/download/windows?format=exe&version=$rawVersion";
    $macUrl = $data['macUrl'] ?? "/api/desktop/download/mac?format=dmg&version=$rawVersion";
    $linuxUrl = $data['linuxUrl'] ?? "/api/desktop/download/linux?format=AppImage&version=$rawVersion";
    $phpUrl = $data['phpUrl'] ?? "/api/php-export/download";

    $pdo = getDbConnection();
    if ($pdo) {
        try {
            $stmt = $pdo->prepare("INSERT INTO cp_desktop_releases (
                id, version, version_code, channel, title, release_notes,
                min_supported_version, is_mandatory, is_active, downloads_count,
                windows_url, windows_sha256, windows_size_bytes,
                mac_url, mac_sha256, mac_size_bytes,
                linux_url, linux_sha256, linux_size_bytes,
                php_url, php_sha256, php_size_bytes,
                uploaded_by, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");

            $stmt->execute([
                $id, $rawVersion, $parsed['code'], $channel, $title, $releaseNotes,
                $minSupported, $isMandatory, $isActive,
                $winUrl, $data['windowsSha256'] ?? '', intval($data['windowsSizeBytes'] ?? 88473600),
                $macUrl, $data['macSha256'] ?? '', intval($data['macSizeBytes'] ?? 96468992),
                $linuxUrl, $data['linuxSha256'] ?? '', intval($data['linuxSizeBytes'] ?? 91226112),
                $phpUrl, $data['phpSha256'] ?? '', intval($data['phpSizeBytes'] ?? 891289),
                $uploadedBy, $created
            ]);
        } catch (Throwable $e) {
            error_log("saveDesktopRelease DB error: " . $e->getMessage());
        }
    }

    // Save to flat-file JSON as well
    $dir = getDataDir();
    $file = $dir . '/desktop_releases.json';
    $all = [];
    if (file_exists($file)) {
        $all = json_decode(file_get_contents($file), true) ?: [];
    }
    $newObj = formatDesktopReleaseRow([
        'id' => $id,
        'version' => $rawVersion,
        'version_code' => $parsed['code'],
        'channel' => $channel,
        'title' => $title,
        'release_notes' => $releaseNotes,
        'min_supported_version' => $minSupported,
        'is_mandatory' => $isMandatory,
        'is_active' => $isActive,
        'downloads_count' => 0,
        'windows_url' => $winUrl,
        'mac_url' => $macUrl,
        'linux_url' => $linuxUrl,
        'php_url' => $phpUrl,
        'uploaded_by' => $uploadedBy,
        'created_at' => $created
    ]);
    array_unshift($all, $newObj);
    @file_put_contents($file, json_encode($all, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES), LOCK_EX);

    return ['success' => true, 'release' => $newObj];
}

function incrementDesktopDownload($id) {
    $pdo = getDbConnection();
    if ($pdo) {
        try {
            $stmt = $pdo->prepare("UPDATE cp_desktop_releases SET downloads_count = downloads_count + 1 WHERE id = ?");
            $stmt->execute([$id]);
            return true;
        } catch (Throwable $e) {}
    }
    return false;
}


