<?php
/**
 * CloudPost API Studio - System Diagnostic & Database Health Verification
 * Clean URL: /diagnostic (No .php in address bar)
 * Zero status bar link leaks
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

$tests = [];

// 1. PHP Version
$phpVersion = phpversion();
$phpOk = version_compare($phpVersion, '7.4.0', '>=');
$tests[] = [
    'title' => 'PHP Engine Version',
    'status' => $phpOk ? 'pass' : 'fail',
    'detail' => "Current: PHP $phpVersion (Requires PHP 7.4+ or 8.x)",
    'help' => $phpOk ? 'Optimal' : 'Update PHP version in your hosting control panel.'
];

// 2. cURL Extension
$curlOk = extension_loaded('curl');
$tests[] = [
    'title' => 'PHP cURL Extension',
    'status' => $curlOk ? 'pass' : 'fail',
    'detail' => $curlOk ? 'Enabled and active' : 'Disabled (Required for proxying API calls)',
    'help' => $curlOk ? 'Optimal' : 'Enable php-curl extension in cPanel / PHP selector.'
];

// 3. PDO MySQL Extension
$pdoOk = extension_loaded('pdo_mysql');
$tests[] = [
    'title' => 'PDO MySQL Driver',
    'status' => $pdoOk ? 'pass' : 'warning',
    'detail' => $pdoOk ? 'Enabled (Full MySQL persistence active)' : 'Disabled (Falling back to file JSON storage)',
    'help' => $pdoOk ? 'Optimal' : 'Enable pdo_mysql in hosting PHP settings.'
];

// 4. Data Directory Permissions
$dataDir = getDataDir();
$dirWritable = is_writable($dataDir);
$tests[] = [
    'title' => 'Local Data Directory Write Access',
    'status' => $dirWritable ? 'pass' : 'fail',
    'detail' => $dirWritable ? "Writable at $dataDir" : "Permission Denied on $dataDir",
    'help' => $dirWritable ? 'Optimal' : 'Set directory permissions to 755 or 777 in file manager.'
];

// 5. Live Database Connection & SaaS Tables Check
$pdo = getDbConnection();
$dbConnected = false;
$saasTableFound = false;

if ($pdo) {
    try {
        $stmt = $pdo->query("SELECT 1");
        if ($stmt) {
            $dbConnected = true;
            $tableStmt = $pdo->query("SHOW TABLES LIKE 'cp_saas_customers'");
            if ($tableStmt->fetch()) {
                $saasTableFound = true;
            }
        }
    } catch (Throwable $e) {}
}

$tests[] = [
    'title' => 'MySQL Cloud Database Connection',
    'status' => $dbConnected ? 'pass' : 'warning',
    'detail' => $dbConnected ? 'Successfully connected with credentials in config.php' : 'Could not connect (Operating in file fallback mode)',
    'help' => $dbConnected ? ($saasTableFound ? 'Connected & SaaS tables verified' : 'Connected') : 'Check DB_HOST, DB_NAME, DB_USER, DB_PASS in config.php.'
];

// Test DB form
$testDbResult = null;
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['test_db'])) {
    $h = trim($_POST['db_host'] ?? 'localhost');
    $n = trim($_POST['db_name'] ?? '');
    $u = trim($_POST['db_user'] ?? '');
    $p = trim($_POST['db_pass'] ?? '');

    try {
        $testPdo = new PDO("mysql:host=$h;dbname=$n;charset=utf8mb4", $u, $p, [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]);
        $testDbResult = ['success' => true, 'message' => "Success: Connected to MySQL database '$n' on '$h'!"];
    } catch (Throwable $e) {
        $testDbResult = ['success' => false, 'message' => "Connection Failed: " . $e->getMessage()];
    }
}
?>
<!DOCTYPE html>
<html lang="en" class="dark">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>CloudPost System Diagnostic & Health Suite</title>
    <!-- Tailwind CSS CDN -->
    <script src="https://cdn.tailwindcss.com"></script>
    <script src="https://cdn.jsdelivr.net/npm/lucide@latest/dist/umd/lucide.min.js"></script>
    <style>a { cursor: pointer; }</style>
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
<body class="bg-zinc-950 text-zinc-100 min-h-screen antialiased font-sans p-4 sm:p-8 selection:bg-orange-500/30">

<div class="max-w-4xl mx-auto space-y-6">

    <!-- Header -->
    <div class="flex items-center justify-between border-b border-zinc-800 pb-4">
        <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 to-orange-600 flex items-center justify-center font-bold text-white text-lg shadow-lg">
                ⚡
            </div>
            <div>
                <h1 class="text-xl font-bold text-white">System Diagnostics & Environment Health</h1>
                <p class="text-xs text-zinc-400">Server environment readiness and database persistence checks.</p>
            </div>
        </div>
        <div class="flex items-center gap-2">
            <button onclick="window.location.href='/'" class="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-semibold rounded-lg transition-colors" onmouseover="window.status=''; return true;">
                Studio
            </button>
            <button onclick="window.location.href='/saas-users'" class="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-semibold rounded-lg transition-colors" onmouseover="window.status=''; return true;">
                SaaS Users
            </button>
            <button onclick="window.location.href='/saas-reports'" class="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-semibold rounded-lg transition-colors" onmouseover="window.status=''; return true;">
                Reports
            </button>
            <button onclick="window.location.href='/register'" class="px-3 py-1.5 bg-orange-600 hover:bg-orange-500 text-white text-xs font-bold rounded-lg transition-colors" onmouseover="window.status=''; return true;">
                Register
            </button>
        </div>
    </div>

    <!-- Diagnostic Checks Grid -->
    <div class="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-3">
        <h2 class="text-sm font-bold text-white uppercase tracking-wider mb-4">Core Environment Verification</h2>
        <div class="space-y-2.5">
            <?php foreach ($tests as $t): ?>
                <div class="p-3.5 rounded-xl bg-zinc-950 border border-zinc-800/80 flex items-center justify-between flex-wrap gap-2">
                    <div>
                        <div class="flex items-center gap-2">
                            <span class="px-2 py-0.5 rounded text-[10px] font-bold uppercase font-mono <?php echo $t['status'] === 'pass' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : ($t['status'] === 'warning' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'); ?>">
                                <?php echo $t['status']; ?>
                            </span>
                            <span class="text-xs font-bold text-zinc-200"><?php echo htmlspecialchars($t['title']); ?></span>
                        </div>
                        <p class="text-[11px] text-zinc-400 font-mono mt-1"><?php echo htmlspecialchars($t['detail']); ?></p>
                    </div>
                    <div class="text-[11px] text-zinc-500">
                        <?php echo htmlspecialchars($t['help']); ?>
                    </div>
                </div>
            <?php endforeach; ?>
        </div>
    </div>

    <!-- Database Connection Tester -->
    <div class="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-4">
        <h2 class="text-sm font-bold text-white uppercase tracking-wider">Live Database Connection Tester</h2>
        <p class="text-xs text-zinc-400">Test MySQL database credentials directly from your shared hosting environment:</p>

        <?php if ($testDbResult): ?>
            <div class="p-3 rounded-xl border text-xs font-mono <?php echo $testDbResult['success'] ? 'bg-emerald-950/60 border-emerald-700 text-emerald-300' : 'bg-rose-950/60 border-rose-700 text-rose-300'; ?>">
                <?php echo htmlspecialchars($testDbResult['message']); ?>
            </div>
        <?php endif; ?>

        <form method="POST" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            <input type="hidden" name="test_db" value="1">
            <div>
                <label class="block text-[11px] font-medium text-zinc-400 mb-1">Host</label>
                <input type="text" name="db_host" value="<?php echo htmlspecialchars($_POST['db_host'] ?? (defined('DB_HOST') ? DB_HOST : 'localhost')); ?>" class="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-xs text-zinc-200 focus:outline-none focus:border-orange-500">
            </div>
            <div>
                <label class="block text-[11px] font-medium text-zinc-400 mb-1">Database Name</label>
                <input type="text" name="db_name" value="<?php echo htmlspecialchars($_POST['db_name'] ?? (defined('DB_NAME') ? DB_NAME : 'u320472937_postman')); ?>" class="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-xs text-zinc-200 focus:outline-none focus:border-orange-500">
            </div>
            <div>
                <label class="block text-[11px] font-medium text-zinc-400 mb-1">User</label>
                <input type="text" name="db_user" value="<?php echo htmlspecialchars($_POST['db_user'] ?? (defined('DB_USER') ? DB_USER : 'u320472937_postman')); ?>" class="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-xs text-zinc-200 focus:outline-none focus:border-orange-500">
            </div>
            <div>
                <label class="block text-[11px] font-medium text-zinc-400 mb-1">Password</label>
                <input type="password" name="db_pass" value="<?php echo htmlspecialchars($_POST['db_pass'] ?? (defined('DB_PASS') ? DB_PASS : 'Micr0@112233')); ?>" class="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-xs text-zinc-200 focus:outline-none focus:border-orange-500">
            </div>
            <div class="flex items-end">
                <button type="submit" class="w-full px-4 py-2 bg-orange-600 hover:bg-orange-500 text-white rounded-lg text-xs font-bold transition-colors" onmouseover="window.status=''; return true;">
                    Test Connection
                </button>
            </div>
        </form>
    </div>

</div>

</body>
</html>
