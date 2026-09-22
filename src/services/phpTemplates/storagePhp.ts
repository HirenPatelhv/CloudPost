export function getStoragePhpCode(): string {
  return `<?php
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
            INDEX idx_env_workspace (workspace_id)
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

        // Auto-seed SaaS customers if empty
        seedInitialSaaSCustomers($pdo);

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
            $fee = isset($cust['monthly_fee']) ? floatval($cust['monthly_fee']) : (isset($cust['monthlyFee']) ? floatval($cust['monthlyFee']) : ($plan === 'enterprise' ? 199 : ($plan === 'pro' ? 29 : 0)));
            $quota = $plan === 'enterprise' ? 10000000 : ($plan === 'pro' ? 1000000 : 100000);
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
`;
}
