<?php
/**
 * CloudPost API Studio - PHP Auth Handler
 * Supports guest sessions, registered users, and password hashing.
 */
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

require_once __DIR__ . '/config.php';
require_once __DIR__ . '/storage.php';

$action = $_GET['action'] ?? '';

function isSuperAdmin($user) {
    if (!$user) return false;
    if (is_array($user)) {
        if (isset($user['role']) && strtolower($user['role']) === 'superadmin') {
            return true;
        }
        if (isset($user['email'])) {
            $adminEmails = defined('SUPERADMIN_EMAILS') ? SUPERADMIN_EMAILS : ['hirenpatelhv@gmail.com'];
            foreach ($adminEmails as $ae) {
                if (strtolower($user['email']) === strtolower($ae)) {
                    return true;
                }
            }
        }
    }
    return false;
}

function getCleanRedirectUrl($url, $defaultParam = '') {
    if (empty($url) || $url === 'index.php') {
        return './' . ($defaultParam ? '?' . ltrim($defaultParam, '?&') : '');
    }
    $clean = preg_replace('/\.php(\?|$)/', '$1', $url);
    if (empty($clean) || $clean === 'index') {
        $clean = './';
    }
    if ($defaultParam) {
        $clean .= (strpos($clean, '?') !== false ? '&' : '?') . ltrim($defaultParam, '?&');
    }
    return $clean;
}

if ($action === 'login') {
    $email = trim($_POST['email'] ?? '');
    $password = trim($_POST['password'] ?? '');
    $redirect = trim($_POST['redirect'] ?? './');

    if (empty($email) || empty($password)) {
        header('Location: ' . getCleanRedirectUrl($redirect, 'error=missing_credentials'));
        exit;
    }

    $users = getStoredUsers();
    $matchedUser = null;

    foreach ($users as $u) {
        if (strtolower($u['email']) === strtolower($email)) {
            $matchedUser = $u;
            break;
        }
    }

    if ($matchedUser) {
        $isValid = password_verify($password, $matchedUser['password_hash']) || ($matchedUser['password_hash'] === $password);
        if ($isValid) {
            // Auto rehash if was stored plain
            if ($matchedUser['password_hash'] === $password) {
                $matchedUser['password_hash'] = password_hash($password, PASSWORD_BCRYPT);
                saveUser($matchedUser);
            }
            // Auto promote if email is in SUPERADMIN_EMAILS
            if (isSuperAdmin($matchedUser) && ($matchedUser['role'] ?? '') !== 'superadmin') {
                $matchedUser['role'] = 'superadmin';
                saveUser($matchedUser);
            }
            $_SESSION['user_id'] = $matchedUser['id'];
            $_SESSION['user_email'] = $matchedUser['email'];
            $_SESSION['user_role'] = $matchedUser['role'] ?? (isSuperAdmin($matchedUser) ? 'superadmin' : 'member');
            
            header('Location: ' . getCleanRedirectUrl($redirect, 'auth=success'));
            exit;
        } else {
            header('Location: ' . getCleanRedirectUrl($redirect, 'error=invalid_password'));
            exit;
        }
    } else {
        header('Location: ' . getCleanRedirectUrl($redirect, 'error=user_not_found'));
        exit;
    }
}

if ($action === 'register') {
    $email = trim($_POST['email'] ?? '');
    $password = trim($_POST['password'] ?? '');
    $name = trim($_POST['name'] ?? explode('@', $email)[0]);
    $redirect = trim($_POST['redirect'] ?? './');

    if (empty($email) || empty($password)) {
        header('Location: ' . getCleanRedirectUrl($redirect, 'error=missing_credentials'));
        exit;
    }

    $users = getStoredUsers();
    foreach ($users as $u) {
        if (strtolower($u['email']) === strtolower($email)) {
            header('Location: ' . getCleanRedirectUrl($redirect, 'error=user_already_exists'));
            exit;
        }
    }

    $isAdminEmail = false;
    $adminEmails = defined('SUPERADMIN_EMAILS') ? SUPERADMIN_EMAILS : ['hirenpatelhv@gmail.com'];
    foreach ($adminEmails as $ae) {
        if (strtolower($email) === strtolower($ae)) {
            $isAdminEmail = true;
            break;
        }
    }
    $isFirstUser = empty($users);
    $role = ($isAdminEmail || $isFirstUser) ? 'superadmin' : 'member';

    $newUser = [
        'id' => 'usr_' . bin2hex(random_bytes(6)),
        'email' => $email,
        'name' => $name ?: explode('@', $email)[0],
        'password_hash' => password_hash($password, PASSWORD_BCRYPT),
        'role' => $role,
        'created_at' => date('Y-m-d H:i:s')
    ];
    saveUser($newUser);
    $_SESSION['user_id'] = $newUser['id'];
    $_SESSION['user_email'] = $newUser['email'];
    $_SESSION['user_role'] = $newUser['role'];

    header('Location: ' . getCleanRedirectUrl($redirect, 'auth=registered'));
    exit;
}

if ($action === 'logout') {
    $_SESSION = [];
    if (session_id() !== '' || isset($_COOKIE[session_name()])) {
        setcookie(session_name(), '', time() - 3600, '/');
    }
    session_destroy();
    header('Location: ./');
    exit;
}

function getCurrentUser($userId) {
    $users = getStoredUsers();
    foreach ($users as $u) {
        if ($u['id'] === $userId) {
            if (isSuperAdmin($u) && ($u['role'] ?? '') !== 'superadmin') {
                $u['role'] = 'superadmin';
            }
            return $u;
        }
    }
    return null;
}
?>
