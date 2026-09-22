<?php
/**
 * CloudPost API Studio - SaaS Customer 360 & Cost Metering Hub
 * Clean URL: /saas-users (No .php in address bar)
 * Zero status bar link leaks
 * Multi-Tenant Usage Metering, Live Simulation, Health Scoring & Infrastructure Cost Accounting
 */

if (isset($_GET['debug']) && $_GET['debug'] === '1') {
    error_reporting(E_ALL);
    ini_set('display_errors', '1');
} else {
    error_reporting(0);
    ini_set('display_errors', '0');
}

if (session_status() === PHP_SESSION_NONE) {
    @session_start();
}

try {
    if (file_exists(__DIR__ . '/config.php')) {
        require_once __DIR__ . '/config.php';
    }
} catch (Throwable $e) {}

try {
    if (file_exists(__DIR__ . '/storage.php')) {
        require_once __DIR__ . '/storage.php';
    }
} catch (Throwable $e) {}

// Handle AJAX actions (Simulation, Customer Creation, Plan Updates)
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_SERVER['CONTENT_TYPE']) && strpos($_SERVER['CONTENT_TYPE'], 'application/json') !== false) {
    header('Content-Type: application/json; charset=utf-8');
    $input = json_decode(file_get_contents('php://input'), true) ?: [];
    $action = $input['action'] ?? '';

    $db = getDbConnection();
    if ($db) {
        ensureDatabaseTables($db);
    }

    if ($action === 'simulate_traffic') {
        $customerId = $input['customer_id'] ?? '';
        $injections = (int)($input['injections'] ?? 5000);
        $dataMb = ($injections * 2.5) / 1024;
        $costIncurred = $injections * 0.0000045; // $0.045 per 10k calls

        if ($db && $customerId) {
            try {
                $stmt = $db->prepare("
                    UPDATE cp_saas_customers
                    SET total_requests = total_requests + :req,
                        requests_this_month = requests_this_month + :req,
                        data_transfer_mb = data_transfer_mb + :mb,
                        total_cost = total_cost + :cost,
                        net_margin = monthly_fee - total_cost,
                        last_active_at = CURRENT_TIMESTAMP
                    WHERE id = :cid
                ");
                $stmt->execute([
                    ':req' => $injections,
                    ':mb' => $dataMb,
                    ':cost' => $costIncurred,
                    ':cid' => $customerId
                ]);
                echo json_encode(['success' => true, 'message' => "Successfully injected {$injections} API requests into customer account."]);
                exit;
            } catch (Throwable $e) {
                echo json_encode(['success' => false, 'error' => $e->getMessage()]);
                exit;
            }
        }
        echo json_encode(['success' => true, 'message' => "Simulated {$injections} calls (local memory mode)"]);
        exit;
    }

    if ($action === 'create_customer') {
        $name = trim($input['name'] ?? '');
        $email = trim($input['email'] ?? '');
        $company = trim($input['company'] ?? 'Tech Co');
        $plan = $input['plan'] ?? 'pro';
        $role = $input['role'] ?? 'Backend Engineer';

        $fee = 0.00; // 100% Free of Cost
        $quota = 999999999; // Zero rate limit - Unlimited requests
        $cid = 'cust_' . bin2hex(random_bytes(6));

        if ($db && $email) {
            try {
                $stmt = $db->prepare("
                    INSERT INTO cp_saas_customers (
                        id, name, email, company_name, role, plan, status, monthly_fee,
                        total_requests, monthly_quota, requests_this_month, data_transfer_mb,
                        total_cost, net_margin, net_margin_percent, health_score, country
                    ) VALUES (
                        :id, :name, :email, :company, :role, :plan, 'active', :fee,
                        100, :quota, 100, 5.0, 0.05, :margin, 98.0, 100, 'United States'
                    )
                ");
                $stmt->execute([
                    ':id' => $cid,
                    ':name' => $name ?: 'SaaS Customer',
                    ':email' => $email,
                    ':company' => $company,
                    ':role' => $role,
                    ':plan' => $plan,
                    ':fee' => $fee,
                    ':quota' => $quota,
                    ':margin' => max(0, $fee - 0.05)
                ]);
                echo json_encode(['success' => true, 'id' => $cid, 'message' => 'Customer registered successfully.']);
                exit;
            } catch (Throwable $e) {
                echo json_encode(['success' => false, 'error' => $e->getMessage()]);
                exit;
            }
        }
        echo json_encode(['success' => true, 'id' => $cid, 'message' => 'Customer created (cache mode).']);
        exit;
    }

    if ($action === 'update_plan') {
        $customerId = $input['customer_id'] ?? '';
        $newPlan = $input['plan'] ?? 'pro';
        $newFee = 0.00; // 100% Free of Cost
        $newQuota = 999999999; // Zero rate limit - Unlimited requests

        if ($db && $customerId) {
            try {
                $stmt = $db->prepare("
                    UPDATE cp_saas_customers
                    SET plan = :plan,
                        monthly_fee = :fee,
                        monthly_quota = :quota,
                        net_margin = :fee - total_cost
                    WHERE id = :cid
                ");
                $stmt->execute([':plan' => $newPlan, ':fee' => $newFee, ':quota' => $newQuota, ':cid' => $customerId]);
                echo json_encode(['success' => true, 'message' => "Customer subscription updated to {$newPlan}."]);
                exit;
            } catch (Throwable $e) {
                echo json_encode(['success' => false, 'error' => $e->getMessage()]);
                exit;
            }
        }
        echo json_encode(['success' => true, 'message' => 'Plan updated.']);
        exit;
    }

    echo json_encode(['success' => false, 'error' => 'Unknown action']);
    exit;
}

// Fetch all SaaS customers with active metric aggregations
function getSaaSCustomersList() {
    $db = getDbConnection();
    if ($db) {
        try {
            ensureDatabaseTables($db);
            $stmt = $db->query("SELECT * FROM cp_saas_customers ORDER BY monthly_fee DESC, total_requests DESC");
            $rows = $stmt->fetchAll();
            if (!empty($rows)) {
                return $rows;
            }
        } catch (Throwable $e) {}
    }

    // Default Seed Dataset
    return [
        [
            'id' => 'cust_hiren_hv',
            'name' => 'Hiren Patel',
            'email' => 'hirenpatelhv@gmail.com',
            'company_name' => 'CloudPost SaaS Enterprise',
            'role' => 'Workspace Architect & SuperAdmin',
            'plan' => 'enterprise',
            'status' => 'active',
            'monthly_fee' => 199.00,
            'total_requests' => 1250000,
            'monthly_quota' => 10000000,
            'requests_this_month' => 1250000,
            'data_transfer_mb' => 48500.00,
            'total_cost' => 14.20,
            'net_margin' => 184.80,
            'net_margin_percent' => 92.86,
            'health_score' => 100,
            'country' => 'United States',
            'registered_at' => '2026-09-17 04:00:00'
        ]
    ];
}

$customers = getSaaSCustomersList();
?>
<!DOCTYPE html>
<html lang="en" class="dark">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <title>SaaS Customer 360 & Cost Metering Hub - CloudPost</title>
    <!-- Tailwind CSS CDN -->
    <script src="https://cdn.tailwindcss.com"></script>
    <!-- Lucide Icons -->
    <script src="https://cdn.jsdelivr.net/npm/lucide@latest/dist/umd/lucide.min.js"></script>
    <script>
        if (typeof lucide === 'undefined') {
            document.write('<script src="https://unpkg.com/lucide@latest/dist/umd/lucide.min.js"><\/script>');
        }
    </script>
    <!-- Vue 3 Global Build -->
    <script src="https://cdn.jsdelivr.net/npm/vue@3/dist/vue.global.prod.js"></script>
    <script>
        if (typeof Vue === 'undefined') {
            document.write('<script src="https://unpkg.com/vue@3/dist/vue.global.prod.js"><\/script>');
        }
    </script>
    <style>
        ::-webkit-scrollbar { width: 5px; height: 5px; }
        ::-webkit-scrollbar-track { background: #09090b; }
        ::-webkit-scrollbar-thumb { background: #27272a; border-radius: 4px; }
        ::-webkit-scrollbar-thumb:hover { background: #3f3f46; }
        a { cursor: pointer; }
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
<body class="bg-zinc-950 text-zinc-100 min-h-screen flex flex-col antialiased selection:bg-orange-500/30 selection:text-orange-200 font-sans">

<div id="app" class="flex flex-col min-h-screen">

    <!-- Global Header with Zero Status Bar URL Leaks -->
    <header class="min-h-[64px] py-3.5 border-b border-white/10 bg-zinc-950/90 backdrop-blur-xl px-4 sm:px-8 flex items-center justify-between sticky top-0 z-40 shrink-0" style="min-height: 64px; padding-top: 14px; padding-bottom: 14px;">
        <div class="flex items-center gap-3 cursor-pointer py-1 my-auto" @click="navigate('/')" onmouseover="window.status=''; return true;">
            <div class="w-9 h-9 rounded-xl bg-gradient-to-tr from-orange-500 to-amber-600 flex items-center justify-center shadow-lg shadow-orange-500/25 shrink-0 my-0.5">
                <span class="inline-flex items-center justify-center shrink-0 w-5 h-5 text-white" v-html="renderIcon('users', 'w-5 h-5 text-white')"></span>
            </div>
            <div>
                <span class="font-extrabold text-base tracking-tight bg-gradient-to-r from-white via-zinc-200 to-orange-400 bg-clip-text text-transparent">
                    CloudPost SaaS Customer 360
                </span>
                <span class="text-[10px] px-2 py-0.5 ml-2 rounded-full bg-orange-500/20 text-orange-400 border border-orange-500/30 font-mono font-semibold">
                    Multi-Tenant Hub
                </span>
            </div>
        </div>

        <div class="flex items-center gap-2 sm:gap-3">
            <button @click="navigate('/saas-reports')" class="px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-xs font-semibold border border-zinc-800 flex items-center gap-1.5 transition-colors" onmouseover="window.status=''; return true;">
                <span class="inline-flex items-center justify-center shrink-0 w-3.5 h-3.5 text-amber-400" v-html="renderIcon('bar-chart-3', 'w-3.5 h-3.5 text-amber-400')"></span>
                <span class="hidden md:inline">Financial Reports</span>
            </button>

            <button @click="navigate('/register')" class="px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-xs font-semibold border border-zinc-800 flex items-center gap-1.5 transition-colors" onmouseover="window.status=''; return true;">
                <span class="inline-flex items-center justify-center shrink-0 w-3.5 h-3.5 text-emerald-400" v-html="renderIcon('user-plus', 'w-3.5 h-3.5 text-emerald-400')"></span>
                <span class="hidden md:inline">Register User</span>
            </button>

            <button @click="navigate('/')" class="px-3.5 py-1.5 bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white rounded-lg text-xs font-bold shadow-lg shadow-orange-500/20 transition-all flex items-center gap-1.5" onmouseover="window.status=''; return true;">
                <span class="inline-flex items-center justify-center shrink-0 w-3.5 h-3.5" v-html="renderIcon('send', 'w-3.5 h-3.5')"></span>
                <span>API Workspace</span>
            </button>
        </div>
    </header>

    <!-- Main Content Body -->
    <main class="flex-1 max-w-7xl mx-auto w-full p-4 sm:p-6 lg:p-8 space-y-6">

        <!-- SaaS Exclusivity Gate (Shown when isSaaSUser is false) -->
        <div v-if="!isSaaSUser" class="py-10 max-w-4xl mx-auto space-y-8 animate-fadeIn">
            <div class="text-center space-y-3">
                <div class="inline-flex items-center justify-center p-3 rounded-2xl bg-orange-500/10 border border-orange-500/30 text-orange-400 shadow-xl shadow-orange-500/10 mb-2">
                    <span v-html="renderIcon('lock', 'w-8 h-8 text-orange-400')"></span>
                </div>
                <div class="inline-block px-3 py-1 rounded-full bg-orange-500/10 border border-orange-500/30 text-orange-400 font-mono text-xs font-bold uppercase tracking-wider">
                    Restricted Access &bull; SaaS Subscribers Only
                </div>
                <h1 class="text-3xl sm:text-4xl font-black text-white tracking-tight">SaaS Customer 360 Hub</h1>
                <p class="text-sm text-zinc-400 max-w-xl mx-auto">
                    Customer quota metering, live traffic cost simulations, and health monitoring are available exclusively to CloudPost SaaS subscribers.
                </p>
            </div>


            <!-- 3 Plan Comparison Cards -->
            <div class="grid grid-cols-1 md:grid-cols-3 gap-5">
                <div class="bg-zinc-900/90 border border-white/10 rounded-2xl p-6 space-y-4 hover:border-zinc-700 transition-all flex flex-col justify-between">
                    <div class="space-y-2">
                        <span class="text-xs font-mono font-bold text-zinc-400 uppercase">Community Starter</span>
                        <div class="text-3xl font-black text-emerald-400 font-mono">&#36;0<span class="text-xs text-zinc-400 font-normal">/ free</span></div>
                        <p class="text-xs text-zinc-400">Essential API collections, basic request inspection, and local testing.</p>
                        <ul class="text-xs text-zinc-400 space-y-1.5 pt-2 border-t border-white/5">
                            <li class="flex items-center gap-2"><span class="text-emerald-400">&bull;</span> Unlimited API calls</li>
                            <li class="flex items-center gap-2"><span class="text-emerald-400">&bull;</span> Fast direct execution</li>
                        </ul>
                    </div>
                    <button @click="switchPersona('free')" class="w-full py-2.5 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl text-xs font-bold transition-all">
                        Simulate Community Tier
                    </button>
                </div>

                <div class="bg-zinc-900/90 border-2 border-emerald-500/50 rounded-2xl p-6 space-y-4 shadow-xl shadow-emerald-500/10 flex flex-col justify-between relative">
                    <div class="absolute -top-3 right-6 px-2.5 py-0.5 rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-[10px] font-bold uppercase tracking-wider">
                        Free Access
                    </div>
                    <div class="space-y-2">
                        <span class="text-xs font-mono font-bold text-emerald-400 uppercase">Pro Developer</span>
                        <div class="text-3xl font-black text-emerald-400 font-mono">&#36;0<span class="text-xs text-zinc-400 font-normal">/ free</span></div>
                        <p class="text-xs text-zinc-400">Full customer quota metering, traffic simulator, and team workspaces.</p>
                        <ul class="text-xs text-zinc-400 space-y-1.5 pt-2 border-t border-white/5">
                            <li class="flex items-center gap-2"><span class="text-emerald-400">&bull;</span> Unlimited calls/mo</li>
                            <li class="flex items-center gap-2"><span class="text-emerald-400">&bull;</span> Real-time cost metering</li>
                            <li class="flex items-center gap-2"><span class="text-emerald-400">&bull;</span> Multi-tenant simulation</li>
                        </ul>
                    </div>
                    <button @click="switchPersona('pro')" class="w-full py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-emerald-500/25 transition-all">
                        Simulate Pro SaaS Tier
                    </button>
                </div>

                <div class="bg-zinc-900/90 border border-purple-500/30 rounded-2xl p-6 space-y-4 hover:border-purple-500/50 transition-all flex flex-col justify-between">
                    <div class="space-y-2">
                        <span class="text-xs font-mono font-bold text-purple-400 uppercase">Enterprise</span>
                        <div class="text-3xl font-black text-emerald-400 font-mono">&#36;0<span class="text-xs text-zinc-400 font-normal">/ free</span></div>
                        <p class="text-xs text-zinc-400">Unlimited API scaling, unit economics auditing, and dedicated clusters.</p>
                        <ul class="text-xs text-zinc-400 space-y-1.5 pt-2 border-t border-white/5">
                            <li class="flex items-center gap-2"><span class="text-purple-400">&bull;</span> Unlimited API executions</li>
                            <li class="flex items-center gap-2"><span class="text-purple-400">&bull;</span> Quota & margin alerts</li>
                            <li class="flex items-center gap-2"><span class="text-purple-400">&bull;</span> Dedicated DB clusters</li>
                        </ul>
                    </div>
                    <button @click="switchPersona('enterprise')" class="w-full py-2.5 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-bold transition-all">
                        Simulate Enterprise Tier
                    </button>
                </div>
            </div>

            <!-- Quick Action Links -->
            <div class="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4 border-t border-white/10">
                <button @click="navigate('/register')" class="px-6 py-2.5 bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white text-xs font-bold rounded-xl shadow-lg transition-all" onmouseover="window.status=''; return true;">
                    Register SaaS Account
                </button>
                <button @click="navigate('/')" class="px-6 py-2.5 bg-zinc-900 hover:bg-zinc-800 border border-white/10 text-zinc-300 hover:text-white text-xs font-bold rounded-xl transition-all" onmouseover="window.status=''; return true;">
                    Return to API Studio
                </button>
            </div>
        </div>

        <!-- Full SaaS Users Content (Shown when isSaaSUser is true) -->
        <div v-else class="space-y-6 animate-fadeIn">

            <!-- Verified SaaS Account Ribbon & Persona Switcher -->
            <div class="bg-gradient-to-r from-zinc-900 via-zinc-900/90 to-zinc-900 border border-white/10 rounded-2xl p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-xl">
                <div class="flex items-center gap-3">
                    <div class="relative">
                        <img :src="currentSaaSUser?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80'" class="w-10 h-10 rounded-xl object-cover border border-white/20">
                        <span class="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-emerald-500 border-2 border-zinc-950 rounded-full"></span>
                    </div>
                    <div>
                        <div class="flex items-center gap-2">
                            <span class="font-bold text-white text-sm">{{ currentSaaSUser?.name || 'SaaS User' }}</span>
                            <span class="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase"
                                :class="currentSaaSUser?.plan === 'enterprise' ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30' : (currentSaaSUser?.plan === 'pro' ? 'bg-orange-500/20 text-orange-300 border border-orange-500/30' : 'bg-zinc-800 text-zinc-300 border border-zinc-700')">
                                {{ currentSaaSUser?.plan || 'PRO' }} SUBSCRIBER
                            </span>
                        </div>
                        <div class="text-xs text-zinc-400 flex items-center gap-2 mt-0.5">
                            <span>{{ currentSaaSUser?.companyName || 'CloudPost Enterprise Labs' }}</span>
                            <span>&bull;</span>
                            <span class="text-emerald-400 font-medium">SaaS Features Unlocked</span>
                        </div>
                    </div>
                </div>

                <div class="flex flex-wrap items-center gap-2">
                    <button @click="simulateGuest" class="px-2.5 py-1 text-xs rounded-lg bg-rose-500/10 text-rose-300 hover:bg-rose-500/20 border border-rose-500/30 font-mono transition-colors" title="Test SaaS Gated Lock Screen">
                        Test Gate (Guest)
                    </button>
                </div>
            </div>

            <!-- Top Header & Actions -->
            <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 class="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">SaaS Customer & Infrastructure Accounting</h1>
                    <p class="text-xs sm:text-sm text-zinc-400 mt-1">Track customer API consumption, compute runtime, gateway overhead, margins, and account health.</p>
                </div>

                <div class="flex items-center gap-2">
                    <button @click="exportCsv()" class="px-3.5 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-200 hover:text-white text-xs font-bold flex items-center gap-1.5 transition-colors shadow-sm" onmouseover="window.status=''; return true;">
                        <span class="inline-flex items-center justify-center shrink-0 w-3.5 h-3.5 text-emerald-400" v-html="renderIcon('download', 'w-3.5 h-3.5 text-emerald-400')"></span>
                        <span>Export CSV</span>
                    </button>

                    <button @click="showAddModal = true" class="px-3.5 py-2 rounded-xl bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white text-xs font-bold shadow-lg shadow-orange-500/20 flex items-center gap-1.5 transition-all" onmouseover="window.status=''; return true;">
                        <span class="inline-flex items-center justify-center shrink-0 w-3.5 h-3.5" v-html="renderIcon('plus', 'w-3.5 h-3.5')"></span>
                        <span>Add Customer</span>
                    </button>
                </div>
            </div>

            <!-- 6 Executive KPI Metric Cards -->
            <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
                <div class="p-4 rounded-2xl bg-zinc-900/90 border border-white/10 shadow-lg backdrop-blur">
                    <div class="text-[11px] font-semibold text-zinc-400">Total Accounts</div>
                    <div class="text-xl font-bold text-white mt-1">{{ totalCustomers }}</div>
                    <div class="text-[10px] text-emerald-400 mt-1 font-mono flex items-center gap-1">
                        <span>{{ activeCustomers }} Active</span>
                    </div>
                </div>

                <div class="p-4 rounded-2xl bg-zinc-900/90 border border-white/10 shadow-lg backdrop-blur">
                    <div class="text-[11px] font-semibold text-zinc-400">Monthly Revenue (MRR)</div>
                    <div class="text-xl font-bold text-orange-400 mt-1 font-mono">&#36;{{ formatCurrency(totalMrr) }}</div>
                    <div class="text-[10px] text-zinc-500 mt-1 font-mono">ARR: &#36;{{ formatCurrency(totalMrr * 12) }}</div>
                </div>

                <div class="p-4 rounded-2xl bg-zinc-900/90 border border-white/10 shadow-lg backdrop-blur">
                    <div class="text-[11px] font-semibold text-zinc-400">Incurred Cloud Cost</div>
                    <div class="text-xl font-bold text-rose-400 mt-1 font-mono">&#36;{{ formatCurrency(totalInfraCost) }}</div>
                    <div class="text-[10px] text-zinc-500 mt-1 font-mono">~&#36;0.05 / 10k calls</div>
                </div>

                <div class="p-4 rounded-2xl bg-zinc-900/90 border border-white/10 shadow-lg backdrop-blur">
                    <div class="text-[11px] font-semibold text-zinc-400">Net Profit Margin</div>
                    <div class="text-xl font-bold text-emerald-400 mt-1 font-mono">&#36;{{ formatCurrency(totalNetProfit) }}</div>
                    <div class="text-[10px] text-emerald-400 mt-1 font-mono">{{ totalNetProfitPercent }}% margin</div>
                </div>

                <div class="p-4 rounded-2xl bg-zinc-900/90 border border-white/10 shadow-lg backdrop-blur">
                    <div class="text-[11px] font-semibold text-zinc-400">API Calls Processed</div>
                    <div class="text-xl font-bold text-white mt-1 font-mono">{{ formatNumber(totalRequests) }}</div>
                    <div class="text-[10px] text-blue-400 mt-1 font-mono">{{ totalDataMb.toFixed(1) }} MB transferred</div>
                </div>

                <div class="p-4 rounded-2xl bg-zinc-900/90 border border-white/10 shadow-lg backdrop-blur">
                    <div class="text-[11px] font-semibold text-zinc-400">Avg Health Score</div>
                    <div class="text-xl font-bold text-emerald-400 mt-1 font-mono">{{ avgHealthScore }} / 100</div>
                    <div class="text-[10px] text-zinc-500 mt-1">Operational & SLA OK</div>
                </div>
            </div>

        <!-- Filter & Search Toolbar -->
        <div class="p-4 bg-zinc-900/80 border border-white/10 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-3 shadow-lg">
            <div class="flex items-center gap-2 w-full md:w-80">
                <div class="relative w-full">
                    <span class="absolute left-3 top-2.5 inline-flex items-center justify-center shrink-0 w-4 h-4 text-zinc-500" v-html="renderIcon('search', 'w-4 h-4 text-zinc-500')"></span>
                    <input type="text" v-model="searchQuery" placeholder="Search by name, email, company..." class="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-9 pr-3.5 py-2 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-orange-500 font-mono">
                </div>
            </div>

            <div class="flex items-center gap-2 w-full md:w-auto overflow-x-auto">
                <select v-model="planFilter" class="bg-zinc-950 border border-zinc-800 text-zinc-300 text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-orange-500 font-mono">
                    <option value="all">All Subscription Plans</option>
                    <option value="enterprise">Enterprise Tier ($199/mo)</option>
                    <option value="pro">Pro Developer ($29/mo)</option>
                    <option value="free">Free Starter ($0/mo)</option>
                </select>

                <select v-model="statusFilter" class="bg-zinc-950 border border-zinc-800 text-zinc-300 text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-orange-500 font-mono">
                    <option value="all">All Account Statuses</option>
                    <option value="active">Active Accounts</option>
                    <option value="trial">Trialing</option>
                    <option value="suspended">Suspended</option>
                </select>
            </div>
        </div>

        <!-- SaaS Customers Master Table -->
        <div class="bg-zinc-900/90 border border-white/10 rounded-2xl shadow-xl overflow-hidden backdrop-blur">
            <div class="overflow-x-auto">
                <table class="w-full text-left text-xs text-zinc-300">
                    <thead class="bg-zinc-950/60 border-b border-zinc-800 text-zinc-500 font-mono text-[10px] uppercase">
                        <tr>
                            <th class="py-3 px-4">Customer & Organization</th>
                            <th class="py-3 px-4">Plan & MRR</th>
                            <th class="py-3 px-4">API Quota / Volume</th>
                            <th class="py-3 px-4">Infra Cost</th>
                            <th class="py-3 px-4">Net Margin</th>
                            <th class="py-3 px-4">Health</th>
                            <th class="py-3 px-4 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-zinc-800/60">
                        <tr v-for="c in filteredCustomers" :key="c.id" class="hover:bg-zinc-800/40 transition-colors">
                            <!-- Customer Details -->
                            <td class="py-3.5 px-4">
                                <div class="flex items-center gap-3">
                                    <div class="w-9 h-9 rounded-xl bg-gradient-to-tr from-orange-500 to-amber-600 flex items-center justify-center font-bold text-white text-xs shadow-md shrink-0">
                                        {{ getInitials(c.name) }}
                                    </div>
                                    <div class="min-w-0">
                                        <div class="font-bold text-zinc-100 truncate flex items-center gap-1.5">
                                            <span>{{ c.name }}</span>
                                            <span class="text-[10px] font-mono text-zinc-500">({{ c.role || 'Member' }})</span>
                                        </div>
                                        <div class="text-[11px] text-zinc-400 truncate">{{ c.company_name || 'Individual Developer' }} &bull; <span class="text-zinc-500">{{ c.email }}</span></div>
                                    </div>
                                </div>
                            </td>

                            <!-- Plan & MRR -->
                            <td class="py-3.5 px-4">
                                <div class="flex items-center gap-1.5">
                                    <span class="px-2 py-0.5 rounded text-[10px] font-bold uppercase font-mono border" :class="getPlanBadgeColor(c.plan)">
                                        {{ c.plan }}
                                    </span>
                                </div>
                                <div class="text-xs font-mono font-bold text-orange-400 mt-1">&#36;{{ parseFloat(c.monthly_fee).toFixed(2) }} <span class="text-[9px] font-normal text-zinc-500">/mo</span></div>
                            </td>

                            <!-- API Quota & Volume -->
                            <td class="py-3.5 px-4">
                                <div class="flex items-center justify-between text-[11px] font-mono text-zinc-300">
                                    <span>{{ formatNumber(c.total_requests) }} calls</span>
                                    <span class="text-zinc-500">{{ Math.round((c.total_requests / (c.monthly_quota || 1000000)) * 100) }}%</span>
                                </div>
                                <div class="w-32 sm:w-40 h-1.5 bg-zinc-800 rounded-full mt-1.5 overflow-hidden">
                                    <div class="h-full rounded-full transition-all" :class="getQuotaProgressColor(c.total_requests, c.monthly_quota)" :style="{ width: Math.min(100, Math.round((c.total_requests / (c.monthly_quota || 1000000)) * 100)) + '%' }"></div>
                                </div>
                                <div class="text-[10px] text-zinc-500 font-mono mt-1">{{ parseFloat(c.data_transfer_mb || 0).toFixed(1) }} MB transfer</div>
                            </td>

                            <!-- Infra Unit Cost -->
                            <td class="py-3.5 px-4 font-mono">
                                <div class="text-xs font-bold text-rose-400">&#36;{{ parseFloat(c.total_cost || 0).toFixed(4) }}</div>
                                <div class="text-[10px] text-zinc-500">Compute + Network</div>
                            </td>

                            <!-- Net Margin -->
                            <td class="py-3.5 px-4 font-mono">
                                <div class="text-xs font-bold text-emerald-400">&#36;{{ parseFloat(c.net_margin || (c.monthly_fee - c.total_cost)).toFixed(2) }}</div>
                                <div class="text-[10px]" :class="parseFloat(c.net_margin_percent) >= 80 ? 'text-emerald-400' : 'text-amber-400'">{{ parseFloat(c.net_margin_percent || 90).toFixed(1) }}% profit</div>
                            </td>

                            <!-- Health -->
                            <td class="py-3.5 px-4">
                                <div class="flex items-center gap-1.5">
                                    <span class="w-2 h-2 rounded-full" :class="getHealthDotColor(c.health_score)"></span>
                                    <span class="font-mono text-xs font-bold text-zinc-200">{{ c.health_score }}</span>
                                </div>
                            </td>

                            <!-- Actions -->
                            <td class="py-3.5 px-4 text-right">
                                <div class="flex items-center justify-end gap-1.5">
                                    <button @click="openSimulateModal(c)" class="px-2 py-1 rounded bg-zinc-800 hover:bg-orange-500/20 text-zinc-300 hover:text-orange-400 border border-zinc-700 text-[11px] font-semibold flex items-center gap-1 transition-colors" title="Simulate Real-Time Traffic & Measure Cost" onmouseover="window.status=''; return true;">
                                        <span class="inline-flex items-center justify-center shrink-0 w-3 h-3 text-amber-400" v-html="renderIcon('zap', 'w-3 h-3 text-amber-400')"></span>
                                        <span class="hidden sm:inline">Simulate</span>
                                    </button>
                                    <button @click="openDetailModal(c)" class="px-2 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-[11px] font-semibold border border-zinc-700 transition-colors" onmouseover="window.status=''; return true;">
                                        Details
                                    </button>
                                </div>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>

        </div> <!-- End of v-else SaaS content wrapper -->

    </main>

    <!-- MODAL 1: Customer Deep Dive 360 (100% 3-Tab Parity with React CustomerDetailModal.tsx) -->
    <div v-if="selectedCustomer" class="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
        <div class="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-3xl w-full p-6 space-y-5 shadow-2xl overflow-y-auto max-h-[92vh]">
            <!-- Header -->
            <div class="flex items-center justify-between border-b border-zinc-800 pb-4">
                <div class="flex items-center gap-3">
                    <div class="w-11 h-11 rounded-xl bg-gradient-to-tr from-orange-500 to-amber-600 flex items-center justify-center font-bold text-white text-sm shadow-md font-mono">
                        {{ getInitials(selectedCustomer.name) }}
                    </div>
                    <div>
                        <div class="flex items-center gap-2">
                            <h2 class="text-base font-bold text-white">{{ selectedCustomer.name }}</h2>
                            <span class="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase font-mono" :class="selectedCustomer.plan === 'enterprise' ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30' : (selectedCustomer.plan === 'pro' ? 'bg-orange-500/20 text-orange-300 border border-orange-500/30' : 'bg-zinc-800 text-zinc-400')">
                                {{ selectedCustomer.plan }}
                            </span>
                        </div>
                        <p class="text-xs text-zinc-400">{{ selectedCustomer.company_name || selectedCustomer.company }} &bull; {{ selectedCustomer.email }}</p>
                    </div>
                </div>
                <button @click="selectedCustomer = null" class="p-1.5 text-zinc-400 hover:text-white rounded-lg transition-colors">
                    <span v-html="renderIcon('x', 'w-5 h-5')"></span>
                </button>
            </div>

            <!-- Tab Switcher Navigation -->
            <div class="flex items-center gap-2 border-b border-zinc-800 pb-2">
                <button @click="customerDetailTab = 'overview'" class="px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5" :class="customerDetailTab === 'overview' ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30' : 'text-zinc-400 hover:text-white hover:bg-zinc-800'">
                    <span v-html="renderIcon('activity', 'w-3.5 h-3.5')"></span>
                    <span>Overview & Unit Economics</span>
                </button>
                <button @click="customerDetailTab = 'usage'" class="px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5" :class="customerDetailTab === 'usage' ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30' : 'text-zinc-400 hover:text-white hover:bg-zinc-800'">
                    <span v-html="renderIcon('database', 'w-3.5 h-3.5')"></span>
                    <span>Usage & Quotas</span>
                </button>
                <button @click="customerDetailTab = 'settings'" class="px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5" :class="customerDetailTab === 'settings' ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30' : 'text-zinc-400 hover:text-white hover:bg-zinc-800'">
                    <span v-html="renderIcon('settings', 'w-3.5 h-3.5')"></span>
                    <span>Plan & Overrides</span>
                </button>
            </div>

            <!-- TAB 1: Overview & Unit Economics -->
            <div v-if="customerDetailTab === 'overview'" class="space-y-4">
                <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div class="p-3.5 bg-zinc-950 rounded-xl border border-zinc-800">
                        <div class="text-[10px] text-zinc-400 font-semibold uppercase">Monthly MRR</div>
                        <div class="text-base font-bold text-white font-mono mt-1">&#36;{{ parseFloat(selectedCustomer.monthly_fee).toFixed(2) }}</div>
                        <div class="text-[10px] text-zinc-500 mt-0.5">Billed monthly</div>
                    </div>
                    <div class="p-3.5 bg-zinc-950 rounded-xl border border-zinc-800">
                        <div class="text-[10px] text-zinc-400 font-semibold uppercase">Cloud Infra Cost</div>
                        <div class="text-base font-bold text-rose-400 font-mono mt-1">&#36;{{ parseFloat(selectedCustomer.total_cost || 0).toFixed(4) }}</div>
                        <div class="text-[10px] text-zinc-500 mt-0.5">&#36;0.0000045/req</div>
                    </div>
                    <div class="p-3.5 bg-zinc-950 rounded-xl border border-zinc-800">
                        <div class="text-[10px] text-zinc-400 font-semibold uppercase">Net Margin</div>
                        <div class="text-base font-bold text-emerald-400 font-mono mt-1">&#36;{{ parseFloat(selectedCustomer.net_margin || (selectedCustomer.monthly_fee - (selectedCustomer.total_cost || 0))).toFixed(2) }}</div>
                        <div class="text-[10px] text-emerald-500/80 mt-0.5">Gross profit</div>
                    </div>
                    <div class="p-3.5 bg-zinc-950 rounded-xl border border-zinc-800">
                        <div class="text-[10px] text-zinc-400 font-semibold uppercase">Health Score</div>
                        <div class="text-base font-bold text-amber-400 font-mono mt-1">{{ selectedCustomer.health_score || 95 }}/100</div>
                        <div class="text-[10px] text-zinc-500 mt-0.5">Telemetry healthy</div>
                    </div>
                </div>

                <div class="p-4 bg-zinc-950 rounded-xl border border-zinc-800 space-y-2">
                    <div class="text-xs font-bold text-zinc-300">Customer Metadata</div>
                    <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                        <div><span class="text-zinc-500">Country:</span> <span class="text-zinc-200 font-medium">{{ selectedCustomer.country || 'Global' }}</span></div>
                        <div><span class="text-zinc-500">Status:</span> <span class="text-emerald-400 font-bold uppercase text-[10px] px-1.5 py-0.5 bg-emerald-500/20 rounded">{{ selectedCustomer.status || 'active' }}</span></div>
                        <div><span class="text-zinc-500">Member Since:</span> <span class="text-zinc-200 font-mono">{{ (selectedCustomer.registered_at || 'Recent').substring(0, 10) }}</span></div>
                    </div>
                </div>
            </div>

            <!-- TAB 2: Usage & Quotas -->
            <div v-else-if="customerDetailTab === 'usage'" class="space-y-4">
                <div class="p-4 bg-zinc-950 rounded-xl border border-zinc-800 space-y-3">
                    <div class="flex items-center justify-between text-xs">
                        <span class="font-bold text-zinc-300">Monthly Quota Consumption</span>
                        <span class="font-mono text-zinc-400">{{ (selectedCustomer.total_requests || 0).toLocaleString() }} / {{ (selectedCustomer.monthly_quota || 1000000).toLocaleString() }} reqs</span>
                    </div>
                    <div class="w-full h-2.5 bg-zinc-900 rounded-full overflow-hidden border border-zinc-800">
                        <div class="h-full bg-gradient-to-r from-orange-500 to-amber-500 rounded-full transition-all" :style="{ width: Math.min(100, Math.round(((selectedCustomer.total_requests || 0) / (selectedCustomer.monthly_quota || 1000000)) * 100)) + '%' }"></div>
                    </div>
                    <div class="flex items-center justify-between text-[11px] text-zinc-500">
                        <span>{{ Math.min(100, Math.round(((selectedCustomer.total_requests || 0) / (selectedCustomer.monthly_quota || 1000000)) * 100)) }}% utilized</span>
                        <span>Resets in 18 days</span>
                    </div>
                </div>

                <div class="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    <div class="p-3 bg-zinc-950 rounded-xl border border-zinc-800">
                        <div class="text-[10px] text-zinc-400 font-semibold uppercase">Avg Latency</div>
                        <div class="text-sm font-bold text-white font-mono mt-1">{{ selectedCustomer.avg_latency_ms || 42 }} ms</div>
                    </div>
                    <div class="p-3 bg-zinc-950 rounded-xl border border-zinc-800">
                        <div class="text-[10px] text-zinc-400 font-semibold uppercase">Error Rate</div>
                        <div class="text-sm font-bold text-emerald-400 font-mono mt-1">{{ selectedCustomer.error_rate_percent || '0.00' }}%</div>
                    </div>
                    <div class="p-3 bg-zinc-950 rounded-xl border border-zinc-800">
                        <div class="text-[10px] text-zinc-400 font-semibold uppercase">Data Transfer</div>
                        <div class="text-sm font-bold text-white font-mono mt-1">{{ parseFloat(selectedCustomer.data_transfer_mb || 48.5).toFixed(1) }} MB</div>
                    </div>
                </div>
            </div>

            <!-- TAB 3: Plan & Overrides -->
            <div v-else-if="customerDetailTab === 'settings'" class="space-y-4">
                <div class="p-4 bg-zinc-950 rounded-xl border border-zinc-800 space-y-4">
                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label class="block text-xs font-semibold text-zinc-400 mb-1">Assigned Plan Tier</label>
                            <select v-model="selectedCustomer.plan" class="w-full bg-zinc-900 border border-zinc-700 text-zinc-200 text-xs rounded-xl px-3 py-2.5 font-mono">
                                <option value="enterprise">Enterprise ($199/mo, 10M calls)</option>
                                <option value="pro">Pro ($29/mo, 1M calls)</option>
                                <option value="free">Free ($0/mo, 100k calls)</option>
                            </select>
                        </div>
                        <div>
                            <label class="block text-xs font-semibold text-zinc-400 mb-1">Custom Monthly Fee ($ USD)</label>
                            <input v-model="customerCustomFee" type="number" step="0.01" class="w-full bg-zinc-900 border border-zinc-700 text-zinc-200 text-xs rounded-xl px-3 py-2 font-mono">
                        </div>
                    </div>
                    <div>
                        <label class="block text-xs font-semibold text-zinc-400 mb-1">Account Notes & SLA Terms</label>
                        <textarea v-model="customerNotes" rows="2" placeholder="Custom SLA requirements, billing contact notes..." class="w-full bg-zinc-900 border border-zinc-700 text-zinc-200 text-xs rounded-xl p-2.5"></textarea>
                    </div>
                </div>
            </div>

            <!-- Footer Actions -->
            <div class="flex items-center justify-between pt-2 border-t border-zinc-800">
                <div class="text-[11px] text-zinc-500">Changes apply to next billing cycle.</div>
                <div class="flex items-center gap-2">
                    <button @click="selectedCustomer = null" class="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-semibold rounded-xl transition-colors">
                        Cancel
                    </button>
                    <button @click="saveCustomerPlan(selectedCustomer)" class="px-4 py-2 bg-orange-600 hover:bg-orange-500 text-white text-xs font-bold rounded-xl shadow transition-colors flex items-center gap-1.5">
                        <span v-html="renderIcon('check', 'w-3.5 h-3.5')"></span>
                        <span>Save Changes</span>
                    </button>
                </div>
            </div>
        </div>
    </div>

    <!-- MODAL 2: Simulate Live Traffic & Calculate Costs -->
    <div v-if="simulatorCustomer" class="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
        <div class="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-md w-full p-6 space-y-5 shadow-2xl">
            <div class="flex items-center justify-between border-b border-zinc-800 pb-3">
                <div class="flex items-center gap-2">
                    <span class="inline-flex items-center justify-center shrink-0 w-4 h-4 text-amber-400" v-html="renderIcon('zap', 'w-4 h-4 text-amber-400')"></span>
                    <h2 class="text-sm font-bold text-white">Live API Traffic Simulator</h2>
                </div>
                <button @click="simulatorCustomer = null" class="text-zinc-500 hover:text-zinc-300">&times;</button>
            </div>

            <p class="text-xs text-zinc-400">Inject high-volume synthetic API requests to benchmark proxy latency, database cost metering, and margin updates.</p>

            <div class="space-y-3">
                <label class="block text-xs font-semibold text-zinc-300">Invocations to Inject</label>
                <div class="grid grid-cols-3 gap-2">
                    <button @click="simBatch = 5000" class="py-2 rounded-xl border text-xs font-mono font-bold" :class="simBatch === 5000 ? 'bg-orange-500/20 border-orange-500 text-orange-300' : 'bg-zinc-950 border-zinc-800 text-zinc-400'">5,000 req</button>
                    <button @click="simBatch = 50000" class="py-2 rounded-xl border text-xs font-mono font-bold" :class="simBatch === 50000 ? 'bg-orange-500/20 border-orange-500 text-orange-300' : 'bg-zinc-950 border-zinc-800 text-zinc-400'">50,000 req</button>
                    <button @click="simBatch = 500000" class="py-2 rounded-xl border text-xs font-mono font-bold" :class="simBatch === 500000 ? 'bg-orange-500/20 border-orange-500 text-orange-300' : 'bg-zinc-950 border-zinc-800 text-zinc-400'">500,000 req</button>
                </div>
            </div>

            <div class="p-3 bg-zinc-950 rounded-xl border border-zinc-800 space-y-1.5 text-xs font-mono">
                <div class="flex justify-between text-zinc-400">
                    <span>Estimated Gateway Cost:</span>
                    <span class="text-rose-400">+&#36;{{ (simBatch * 0.0002).toFixed(3) }}</span>
                </div>
                <div class="flex justify-between text-zinc-400">
                    <span>Estimated Data Bandwidth:</span>
                    <span class="text-blue-400">+{{ ((simBatch * 2) / 1024).toFixed(1) }} MB</span>
                </div>
            </div>

            <div class="flex justify-end gap-2 pt-2">
                <button @click="simulatorCustomer = null" class="px-4 py-2 text-xs font-semibold text-zinc-400 hover:text-white">Cancel</button>
                <button @click="executeSimulation()" :disabled="simulating" class="px-5 py-2 bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white text-xs font-bold rounded-xl shadow-lg shadow-orange-500/20 flex items-center gap-2 transition-all disabled:opacity-50">
                    <span>{{ simulating ? 'Injecting Traffic...' : 'Execute Traffic Injection' }}</span>
                </button>
            </div>
        </div>
    </div>

    <!-- MODAL 3: Add Customer -->
    <div v-if="showAddModal" class="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
        <div class="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div class="flex items-center justify-between border-b border-zinc-800 pb-3">
                <h2 class="text-sm font-bold text-white">Add SaaS Enterprise / Team Customer</h2>
                <button @click="showAddModal = false" class="p-1 text-zinc-500 hover:text-zinc-300">
                    <span v-html="renderIcon('x', 'w-5 h-5')"></span>
                </button>
            </div>

            <form @submit.prevent="submitAddCustomer()" class="space-y-3">
                <div>
                    <label class="block text-xs font-medium text-zinc-400 mb-1">Customer Full Name</label>
                    <input type="text" v-model="newCustomer.name" required class="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-zinc-200 focus:outline-none focus:border-orange-500">
                </div>
                <div>
                    <label class="block text-xs font-medium text-zinc-400 mb-1">Work Email</label>
                    <input type="email" v-model="newCustomer.email" required class="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-zinc-200 focus:outline-none focus:border-orange-500">
                </div>
                <div>
                    <label class="block text-xs font-medium text-zinc-400 mb-1">Company / Organization</label>
                    <input type="text" v-model="newCustomer.company" class="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-zinc-200 focus:outline-none focus:border-orange-500">
                </div>
                <div>
                    <label class="block text-xs font-medium text-zinc-400 mb-1">Subscription Plan Tier</label>
                    <select v-model="newCustomer.plan" class="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-zinc-200 focus:outline-none focus:border-orange-500 font-mono">
                        <option value="pro">Pro Developer ($29/mo)</option>
                        <option value="enterprise">Enterprise Tier ($199/mo)</option>
                        <option value="free">Free Starter ($0/mo)</option>
                    </select>
                </div>

                <div class="flex justify-end gap-2 pt-3">
                    <button type="button" @click="showAddModal = false" class="px-4 py-2 text-xs font-semibold text-zinc-400 hover:text-white">Cancel</button>
                    <button type="submit" class="px-5 py-2 bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white text-xs font-bold rounded-xl shadow-lg transition-all">
                        Create Account
                    </button>
                </div>
            </form>
        </div>
    </div>

</div>

<script>
const { createApp, ref, computed, onMounted } = Vue;

createApp({
    setup() {
        const customers = ref(<?php echo json_encode($customers); ?>);
        const searchQuery = ref('');
        const planFilter = ref('all');
        const statusFilter = ref('all');
        const selectedCustomer = ref(null);
        const simulatorCustomer = ref(null);
        const simBatch = ref(5000);
        const simulating = ref(false);
        const showAddModal = ref(false);
        const newCustomer = ref({ name: '', email: '', company: '', plan: 'pro', role: 'Backend Developer' });

        // SaaS User Authentication & Gating State
        const isGuest = ref(false);
        const currentSaaSUser = ref(<?php echo json_encode($isLoggedIn && $user ? [
            'id' => $user['id'] ?? 'usr_current',
            'name' => $user['name'] ?? 'User',
            'email' => $user['email'] ?? '',
            'avatar' => 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80',
            'plan' => $user['plan'] ?? ($isSuperAdmin ? 'enterprise' : 'pro'),
            'isSaaSUser' => true,
            'companyName' => $user['company_name'] ?? 'CloudPost Organization',
            'roleTitle' => $user['role'] ?? 'Developer'
        ] : [
            'id' => 'usr_guest',
            'name' => 'Guest User',
            'email' => 'guest@cloudpost.local',
            'avatar' => 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80',
            'plan' => 'free',
            'isSaaSUser' => false,
            'companyName' => 'Local Sandbox',
            'roleTitle' => 'Guest'
        ]); ?>);

        const isSaaSUser = computed(() => {
            return !isGuest.value && !!currentSaaSUser.value && (currentSaaSUser.value.isSaaSUser !== false);
        });

        const switchPersona = () => {};

        const simulateGuest = () => {
            isGuest.value = true;
            try {
                localStorage.removeItem('cp_auth_user');
            } catch(e) {}
        };

        onMounted(() => {
            try {
                const stored = localStorage.getItem('cp_auth_user');
                if (stored) {
                    const parsed = JSON.parse(stored);
                    if (parsed && parsed.email) {
                        currentSaaSUser.value = parsed;
                        isGuest.value = false;
                    }
                }
            } catch(e) {}

            // Global URL status bar suppression
            window.defaultStatus = '';
            document.addEventListener('mouseover', function() {
                window.status = '';
            }, true);
        });

        const renderIcon = (name, className = 'w-4 h-4') => {
            if (typeof lucide !== 'undefined' && lucide.icons && lucide.icons[name]) {
                return lucide.icons[name].toSvg({ class: className });
            }
            return '<svg class="' + className + '" fill="none" stroke="currentColor" viewBox="0 0 24 24"></svg>';
        };

        const totalCustomers = computed(() => customers.value.length);
        const activeCustomers = computed(() => customers.value.filter(c => c.status === 'active').length);
        const totalMrr = computed(() => customers.value.reduce((acc, c) => acc + parseFloat(c.monthly_fee || 0), 0));
        const totalInfraCost = computed(() => customers.value.reduce((acc, c) => acc + parseFloat(c.total_cost || 0), 0));
        const totalNetProfit = computed(() => totalMrr.value - totalInfraCost.value);
        const totalNetProfitPercent = computed(() => totalMrr.value > 0 ? ((totalNetProfit.value / totalMrr.value) * 100).toFixed(1) : 0);
        const totalRequests = computed(() => customers.value.reduce((acc, c) => acc + parseInt(c.total_requests || 0, 10), 0));
        const totalDataMb = computed(() => customers.value.reduce((acc, c) => acc + parseFloat(c.data_transfer_mb || 0), 0));
        const avgHealthScore = computed(() => {
            if (customers.value.length === 0) return 100;
            const sum = customers.value.reduce((acc, c) => acc + parseInt(c.health_score || 95, 10), 0);
            return Math.round(sum / customers.value.length);
        });

        const filteredCustomers = computed(() => {
            return customers.value.filter(c => {
                const matchSearch = !searchQuery.value ||
                    (c.name && c.name.toLowerCase().includes(searchQuery.value.toLowerCase())) ||
                    (c.email && c.email.toLowerCase().includes(searchQuery.value.toLowerCase())) ||
                    (c.company_name && c.company_name.toLowerCase().includes(searchQuery.value.toLowerCase()));
                const matchPlan = planFilter.value === 'all' || c.plan === planFilter.value;
                const matchStatus = statusFilter.value === 'all' || c.status === statusFilter.value;
                return matchSearch && matchPlan && matchStatus;
            });
        });

        const formatCurrency = (val) => parseFloat(val || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        const formatNumber = (val) => parseInt(val || 0, 10).toLocaleString('en-US');
        const getInitials = (name) => {
            if (!name) return 'CP';
            return name.split(' ').map(p => p[0]).join('').substring(0, 2).toUpperCase();
        };

        const getPlanBadgeColor = (plan) => {
            if (plan === 'enterprise') return 'bg-purple-500/10 text-purple-400 border-purple-500/20';
            if (plan === 'pro') return 'bg-orange-500/10 text-orange-400 border-orange-500/20';
            return 'bg-zinc-800 text-zinc-400 border-zinc-700';
        };

        const getQuotaProgressColor = (used, quota) => {
            const pct = (used / (quota || 1000000)) * 100;
            if (pct >= 90) return 'bg-rose-500';
            if (pct >= 70) return 'bg-amber-500';
            return 'bg-emerald-500';
        };

        const getHealthDotColor = (score) => {
            if (score >= 90) return 'bg-emerald-500';
            if (score >= 70) return 'bg-amber-500';
            return 'bg-rose-500';
        };

        const navigate = (path) => {
            // Clean extension-free URL routing adapted for robust relative subdirectories
            if (path === '/saas-users') window.location.href = 'saas_users.php';
            else if (path === '/saas-reports') window.location.href = 'saas_reports.php';
            else if (path === '/register') window.location.href = 'register.php';
            else if (path === '/') window.location.href = 'index.php';
            else window.location.href = path;
        };

        const customerDetailTab = ref('overview');
        const customerNotes = ref('');
        const customerCustomFee = ref(29);
        const customerDiscountPercent = ref(0);
        const openDetailModal = (c) => { 
            selectedCustomer.value = { ...c }; 
            customerDetailTab.value = 'overview';
            customerNotes.value = c.notes || 'VIP SLA enterprise agreement on file.';
            customerCustomFee.value = parseFloat(c.monthly_fee) || 29;
            customerDiscountPercent.value = 0;
        };
        const openSimulateModal = (c) => { simulatorCustomer.value = c; simBatch.value = 50000; };

        const executeSimulation = async () => {
            if (!simulatorCustomer.value) return;
            simulating.value = true;
            try {
                const res = await fetch('saas_users.php', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        action: 'simulate_traffic',
                        customer_id: simulatorCustomer.value.id,
                        injections: simBatch.value
                    })
                });
                const data = await res.json();
                if (data.success) {
                    const cust = customers.value.find(c => c.id === simulatorCustomer.value.id);
                    if (cust) {
                        cust.total_requests = parseInt(cust.total_requests || 0, 10) + simBatch.value;
                        cust.total_cost = parseFloat(cust.total_cost || 0) + (simBatch.value * 0.0000045);
                        cust.net_margin = parseFloat(cust.monthly_fee) - cust.total_cost;
                    }
                    simulatorCustomer.value = null;
                }
            } catch (e) {
                alert('Traffic simulation error: ' + e.message);
            } finally {
                simulating.value = false;
            }
        };

        const saveCustomerPlan = async (c) => {
            try {
                const res = await fetch('saas_users.php', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        action: 'update_plan',
                        customer_id: c.id,
                        plan: c.plan
                    })
                });
                const data = await res.json();
                if (data.success) {
                    window.location.reload();
                }
            } catch (e) {
                alert('Failed to save plan: ' + e.message);
            }
        };

        const submitAddCustomer = async () => {
            try {
                const res = await fetch('saas_users.php', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        action: 'create_customer',
                        name: newCustomer.value.name,
                        email: newCustomer.value.email,
                        company: newCustomer.value.company,
                        plan: newCustomer.value.plan
                    })
                });
                const data = await res.json();
                if (data.success) {
                    window.location.reload();
                }
            } catch (e) {
                alert('Failed to create customer: ' + e.message);
            }
        };

        const exportCsv = () => {
            const headers = ['ID', 'Name', 'Email', 'Company', 'Plan', 'Status', 'Monthly Fee', 'Total Requests', 'Infra Cost', 'Net Margin', 'Health Score'];
            const rows = filteredCustomers.value.map(c => [
                c.id, '"' + (c.name || '') + '"', c.email, '"' + (c.company_name || '') + '"', c.plan, c.status, c.monthly_fee, c.total_requests, c.total_cost, c.net_margin, c.health_score
            ]);
            const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
            const encodedUri = encodeURI(csvContent);
            const link = document.createElement('a');
            link.setAttribute('href', encodedUri);
            link.setAttribute('download', 'cloudpost_saas_customers.csv');
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        };

        return {
            customers,
            searchQuery,
            planFilter,
            statusFilter,
            selectedCustomer, customerDetailTab, customerNotes, customerCustomFee, customerDiscountPercent,
            simulatorCustomer,
            simBatch,
            simulating,
            showAddModal,
            newCustomer,
            isGuest,
            currentSaaSUser,
            isSaaSUser,
            switchPersona,
            simulateGuest,
            totalCustomers,
            activeCustomers,
            totalMrr,
            totalInfraCost,
            totalNetProfit,
            totalNetProfitPercent,
            totalRequests,
            totalDataMb,
            avgHealthScore,
            filteredCustomers,
            renderIcon,
            formatCurrency,
            formatNumber,
            getInitials,
            getPlanBadgeColor,
            getQuotaProgressColor,
            getHealthDotColor,
            navigate,
            openDetailModal,
            openSimulateModal,
            executeSimulation,
            saveCustomerPlan,
            submitAddCustomer,
            exportCsv
        };
    }
}).mount('#app');
</script>

</body>
</html>
