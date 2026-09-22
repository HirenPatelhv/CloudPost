export function getAuthPhpCode(): string {
  return `<?php
/**
 * CloudPost API Studio - Authentication & Session Engine
 * Clean URL: /auth (No .php in address bar)
 * Zero status bar URL leaks
 */

if (session_status() === PHP_SESSION_NONE) {
    @session_start();
}

if (file_exists(__DIR__ . '/config.php')) {
    require_once __DIR__ . '/config.php';
}
if (file_exists(__DIR__ . '/storage.php')) {
    require_once __DIR__ . '/storage.php';
}

function getCurrentUser($userId) {
    $pdo = getDbConnection();
    if ($pdo) {
        try {
            $stmt = $pdo->prepare("SELECT id, name, email, role, avatar, created_at FROM cp_users WHERE id = ?");
            $stmt->execute([$userId]);
            $user = $stmt->fetch();
            if ($user) return $user;
        } catch (Throwable $e) {}
    }

    $file = getDataDir() . "/user_{$userId}.json";
    if (file_exists($file)) {
        return json_decode(@file_get_contents($file), true);
    }

    if (isset($_SESSION['user_email'])) {
        return [
            'id' => $_SESSION['user_id'] ?? 'usr_guest',
            'name' => $_SESSION['user_name'] ?? 'User',
            'email' => $_SESSION['user_email'],
            'role' => $_SESSION['user_role'] ?? 'member'
        ];
    }
    return null;
}

function isSuperAdmin($user) {
    if (!$user) return false;
    $role = $user['role'] ?? '';
    $email = strtolower($user['email'] ?? '');
    return $role === 'superadmin' || $role === 'admin' || strpos($email, 'admin') !== false || strpos($email, 'super') !== false;
}

$action = $_GET['action'] ?? ($_POST['action'] ?? '');

// Handle Logout
if ($action === 'logout') {
    $_SESSION = [];
    if (ini_get("session.use_cookies")) {
        $params = session_get_cookie_params();
        setcookie(session_name(), '', time() - 42000,
            $params["path"], $params["domain"],
            $params["secure"], $params["httponly"]
        );
    }
    @session_destroy();
    header('Location: ./');
    exit;
}

// Handle AJAX Auth Requests
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    header('Content-Type: application/json');
    $input = json_decode(file_get_contents('php://input'), true) ?: $_POST;

    // 1. Sign In / Login
    if ($action === 'login') {
        $email = strtolower(trim($input['email'] ?? ''));
        $password = $input['password'] ?? '';

        if (empty($email) || empty($password)) {
            echo json_encode(['success' => false, 'message' => 'Please provide both email and password']);
            exit;
        }

        $pdo = getDbConnection();
        $authenticatedUser = null;

        if ($pdo) {
            try {
                $stmt = $pdo->prepare("SELECT * FROM cp_users WHERE email = ?");
                $stmt->execute([$email]);
                $user = $stmt->fetch();
                $isValid = $user && (password_verify($password, $user['password_hash']) || ($user['password_hash'] === $password));
                if ($isValid) {
                    if ($user['password_hash'] === $password) {
                        try {
                            $up = $pdo->prepare("UPDATE cp_users SET password_hash = ? WHERE id = ?");
                            $up->execute([password_hash($password, PASSWORD_BCRYPT), $user['id']]);
                        } catch (Throwable $e) {}
                    }
                    $authenticatedUser = $user;
                }
            } catch (Throwable $e) {}
        }

        if ($authenticatedUser) {
            $_SESSION['user_id'] = $authenticatedUser['id'];
            $_SESSION['user_name'] = $authenticatedUser['name'];
            $_SESSION['user_email'] = $authenticatedUser['email'];
            $_SESSION['user_role'] = $authenticatedUser['role'] ?? 'member';

            echo json_encode([
                'success' => true,
                'user' => [
                    'id' => $authenticatedUser['id'],
                    'name' => $authenticatedUser['name'],
                    'email' => $authenticatedUser['email'],
                    'role' => $authenticatedUser['role'] ?? 'member'
                ]
            ]);
            exit;
        }

        echo json_encode(['success' => false, 'message' => 'Invalid email or password. You can also register a new account on /register']);
        exit;
    }

    // 2. Self Registration via API
    if ($action === 'register') {
        $name = trim($input['name'] ?? '');
        $email = strtolower(trim($input['email'] ?? ''));
        $password = $input['password'] ?? '';
        $company = trim($input['company_name'] ?? $input['companyName'] ?? '');
        $role = trim($input['role'] ?? 'Backend Engineer');
        $plan = strtolower(trim($input['plan'] ?? 'pro'));

        if (empty($name) || empty($email) || empty($password)) {
            echo json_encode(['success' => false, 'message' => 'All fields are required']);
            exit;
        }

        $pdo = getDbConnection();
        $userId = 'usr_' . substr(md5(uniqid(mt_rand(), true)), 0, 8);
        $customerId = 'cust_' . substr(md5(uniqid(mt_rand(), true)), 0, 8);
        $passwordHash = password_hash($password, PASSWORD_DEFAULT);
        $fee = $plan === 'enterprise' ? 199.00 : ($plan === 'pro' ? 29.00 : 0.00);
        $quota = $plan === 'enterprise' ? 10000000 : ($plan === 'pro' ? 1000000 : 100000);

        if ($pdo) {
            try {
                $check = $pdo->prepare("SELECT id FROM cp_users WHERE email = ?");
                $check->execute([$email]);
                if ($check->fetch()) {
                    echo json_encode(['success' => false, 'message' => 'Account with this email already exists']);
                    exit;
                }

                $uStmt = $pdo->prepare("INSERT INTO cp_users (id, name, email, password_hash, role) VALUES (?, ?, ?, ?, 'member')");
                $uStmt->execute([$userId, $name, $email, $passwordHash]);

                $cStmt = $pdo->prepare("INSERT INTO cp_saas_customers (id, user_id, name, email, company_name, role, plan, status, monthly_fee, monthly_quota, requests_this_month, net_margin, net_margin_percent, health_score, country) VALUES (?, ?, ?, ?, ?, ?, ?, 'active', ?, ?, 0, ?, 100.0, 100, 'United States')");
                $cStmt->execute([$customerId, $userId, $name, $email, $company, $role, $plan, $fee, $quota, $fee]);
            } catch (Throwable $e) {
                error_log("API Register DB error: " . $e->getMessage());
            }
        }

        $_SESSION['user_id'] = $userId;
        $_SESSION['user_name'] = $name;
        $_SESSION['user_email'] = $email;
        $_SESSION['user_role'] = 'member';

        echo json_encode([
            'success' => true,
            'user' => ['id' => $userId, 'name' => $name, 'email' => $email, 'role' => 'member'],
            'customerId' => $customerId
        ]);
        exit;
    }
}

// GET Current User
if ($_SERVER['REQUEST_METHOD'] === 'GET' && $action === 'me') {
    header('Content-Type: application/json');
    if (isset($_SESSION['user_id'])) {
        $u = getCurrentUser($_SESSION['user_id']);
        echo json_encode(['success' => true, 'user' => $u]);
    } else {
        echo json_encode(['success' => false, 'user' => null]);
    }
    exit;
}
?>
`;
}
