export function getRegisterPhpCode(): string {
  return `<?php
/**
 * CloudPost API Studio - User Self-Registration & Onboarding Portal
 * Clean URL: /register (No .php in address bar)
 * Zero status bar link leaks on hover
 */

if (session_status() === PHP_SESSION_NONE) {
    @session_start();
}

$errorMessage = '';
$successMessage = '';

if (file_exists(__DIR__ . '/config.php')) {
    require_once __DIR__ . '/config.php';
}
if (file_exists(__DIR__ . '/storage.php')) {
    require_once __DIR__ . '/storage.php';
}
if (file_exists(__DIR__ . '/auth.php')) {
    require_once __DIR__ . '/auth.php';
}

// Redirect if already logged in
if (isset($_SESSION['user_id']) && !isset($_GET['force'])) {
    header('Location: index.php?view=studio');
    exit;
}

// Handle POST registration
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $name = trim($_POST['name'] ?? '');
    $email = strtolower(trim($_POST['email'] ?? ''));
    $password = $_POST['password'] ?? '';
    $companyName = trim($_POST['company_name'] ?? '');
    $role = trim($_POST['role'] ?? 'Backend Engineer');
    $plan = strtolower(trim($_POST['plan'] ?? 'pro'));
    $billingCycle = trim($_POST['billing_cycle'] ?? 'monthly');

    if (empty($name) || empty($email) || empty($password)) {
        $errorMessage = 'Please complete all required fields (Name, Email, and Password).';
    } elseif (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        $errorMessage = 'Please provide a valid business email address.';
    } elseif (strlen($password) < 6) {
        $errorMessage = 'Password must be at least 6 characters long.';
    } else {
        $pdo = getDbConnection();
        $userId = 'usr_' . substr(md5(uniqid(mt_rand(), true)), 0, 8);
        $customerId = 'cust_' . substr(md5(uniqid(mt_rand(), true)), 0, 8);
        $workspaceId = 'ws_' . substr(md5(uniqid(mt_rand(), true)), 0, 8);
        $passwordHash = password_hash($password, PASSWORD_DEFAULT);
        $monthlyFee = $plan === 'enterprise' ? 199.00 : ($plan === 'pro' ? 29.00 : 0.00);
        $monthlyQuota = $plan === 'enterprise' ? 10000000 : ($plan === 'pro' ? 1000000 : 100000);

        $savedInDb = false;

        if ($pdo) {
            try {
                // Check if user already exists
                $checkStmt = $pdo->prepare("SELECT id FROM cp_users WHERE email = ?");
                $checkStmt->execute([$email]);
                if ($checkStmt->fetch()) {
                    $errorMessage = 'An account with this email address already exists. Please sign in instead.';
                } else {
                    // 1. Insert User
                    $uStmt = $pdo->prepare("INSERT INTO cp_users (id, name, email, password_hash, role) VALUES (?, ?, ?, ?, 'member')");
                    $uStmt->execute([$userId, $name, $email, $passwordHash]);

                    // 2. Insert SaaS Customer
                    $cStmt = $pdo->prepare("INSERT INTO cp_saas_customers 
                        (id, user_id, name, email, company_name, role, plan, status, monthly_fee, billing_cycle, total_requests, monthly_quota, requests_this_month, data_transfer_mb, total_cost, net_margin, net_margin_percent, health_score, country)
                        VALUES (?, ?, ?, ?, ?, ?, ?, 'active', ?, ?, 0, ?, 0, 0.0, 0.00, ?, 100.00, 100, 'United States')");
                    $cStmt->execute([$customerId, $userId, $name, $email, $companyName, $role, $plan, $monthlyFee, $billingCycle, $monthlyQuota, $monthlyFee]);

                    // 3. Create Default Workspace
                    $wStmt = $pdo->prepare("INSERT INTO cp_workspaces (id, user_id, name, description, type) VALUES (?, ?, ?, ?, 'personal')");
                    $wStmt->execute([$workspaceId, $userId, ($companyName ? $companyName . ' Workspace' : $name . "'s Workspace"), 'Default personal workspace']);

                    $savedInDb = true;
                }
            } catch (Throwable $e) {
                error_log("Registration DB error: " . $e->getMessage());
            }
        }

        if (empty($errorMessage)) {
            // File backup
            $userData = [
                'id' => $userId,
                'name' => $name,
                'email' => $email,
                'password_hash' => $passwordHash,
                'role' => 'member',
                'company_name' => $companyName,
                'plan' => $plan,
                'created_at' => date('Y-m-d H:i:s')
            ];
            @file_put_contents(getDataDir() . "/user_{$userId}.json", json_encode($userData, JSON_PRETTY_PRINT));

            // Log user into session
            $_SESSION['user_id'] = $userId;
            $_SESSION['user_name'] = $name;
            $_SESSION['user_email'] = $email;
            $_SESSION['user_role'] = 'member';
            $_SESSION['customer_id'] = $customerId;
            $_SESSION['plan'] = $plan;

            header('Location: index.php?view=studio&welcome=1');
            exit;
        }
    }
}
?>
<!DOCTYPE html>
<html lang="en" class="dark">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Create Your CloudPost Account & Organization</title>
    <!-- Tailwind CSS CDN -->
    <script src="https://cdn.tailwindcss.com"></script>
    <!-- Lucide Icons -->
    <script src="https://cdn.jsdelivr.net/npm/lucide@latest/dist/umd/lucide.min.js"></script>
    <script>
        if (typeof lucide === 'undefined') {
            document.write('<script src="https://unpkg.com/lucide@latest/dist/umd/lucide.min.js"><\\/script>');
        }
    </script>
    <!-- Vue 3 Global Build -->
    <script src="https://cdn.jsdelivr.net/npm/vue@3/dist/vue.global.prod.js"></script>
    <script>
        if (typeof Vue === 'undefined') {
            document.write('<script src="https://unpkg.com/vue@3/dist/vue.global.prod.js"><\\/script>');
        }
    </script>
    <script>
        tailwind.config = {
            darkMode: 'class',
            theme: {
                extend: {
                    colors: {
                        brand: {
                            50: '#fff7ed',
                            500: '#f97316',
                            600: '#ea580c',
                            700: '#c2410c',
                        }
                    }
                }
            }
        }
    </script>
    <style>
        /* Hide URL display on status bar for hover */
        a { cursor: pointer; }
    </style>
</head>
<body class="bg-zinc-950 text-zinc-100 min-h-screen flex flex-col antialiased selection:bg-orange-500/30 selection:text-orange-200 font-sans">

<div id="app" class="min-h-screen flex flex-col justify-between">

    <!-- Top Navbar with Zero Status Bar Leaks -->
    <nav class="min-h-[64px] py-3.5 border-b border-white/10 bg-zinc-950/90 backdrop-blur-xl px-4 sm:px-8 flex items-center justify-between sticky top-0 z-40 shrink-0" style="min-height: 64px; padding-top: 14px; padding-bottom: 14px;">
        <div class="flex items-center gap-3 cursor-pointer py-1 my-auto" @click="navigate('/')" onmouseover="window.status=''; return true;">
            <div class="w-9 h-9 rounded-xl bg-gradient-to-tr from-orange-500 to-amber-600 flex items-center justify-center shadow-lg shadow-orange-500/25 shrink-0 my-0.5">
                <span class="inline-flex items-center justify-center shrink-0 w-5 h-5 text-white -rotate-12" v-html="renderIcon('send', 'w-5 h-5 text-white')"></span>
            </div>
            <div class="flex items-center gap-2">
                <span class="font-extrabold text-base tracking-tight bg-gradient-to-r from-white via-zinc-200 to-orange-400 bg-clip-text text-transparent">
                    CloudPost
                </span>
                <span class="text-[10px] px-2 py-0.5 rounded-full bg-orange-500/20 text-orange-400 border border-orange-500/30 font-mono font-semibold">
                    Registration
                </span>
            </div>
        </div>

        <div class="flex items-center gap-3">
            <button @click="navigate('/saas-users')" class="text-xs text-zinc-400 hover:text-white px-3 py-1.5 rounded-lg hover:bg-white/5 transition-colors hidden sm:inline-flex items-center gap-1.5" onmouseover="window.status=''; return true;">
                <span class="inline-flex items-center justify-center shrink-0 w-3.5 h-3.5 text-orange-400" v-html="renderIcon('users', 'w-3.5 h-3.5 text-orange-400')"></span>
                <span>SaaS Customers</span>
            </button>
            <button @click="navigate('/saas-reports')" class="text-xs text-zinc-400 hover:text-white px-3 py-1.5 rounded-lg hover:bg-white/5 transition-colors hidden sm:inline-flex items-center gap-1.5" onmouseover="window.status=''; return true;">
                <span class="inline-flex items-center justify-center shrink-0 w-3.5 h-3.5 text-amber-400" v-html="renderIcon('bar-chart-3', 'w-3.5 h-3.5 text-amber-400')"></span>
                <span>Reports</span>
            </button>
            <button @click="navigate('/')" class="text-xs font-semibold text-zinc-300 hover:text-white px-3.5 py-1.5 rounded-lg border border-white/10 hover:bg-white/5 transition-colors" onmouseover="window.status=''; return true;">
                Sign In
            </button>
        </div>
    </nav>

    <!-- Main Registration Wizard Container -->
    <main class="flex-1 max-w-2xl mx-auto w-full px-4 py-8 flex flex-col justify-center">
        <div class="bg-zinc-900/90 border border-white/10 rounded-2xl shadow-2xl overflow-hidden backdrop-blur">
            
            <!-- Wizard Header & Steps -->
            <div class="p-6 border-b border-white/10 bg-zinc-950/60">
                <div class="flex items-center justify-between">
                    <div>
                        <h1 class="text-xl font-bold text-white tracking-tight flex items-center gap-2">
                            <span>Create Your Developer Account</span>
                        </h1>
                        <p class="text-xs text-zinc-400 mt-1">Get immediate access to collaborative API testing, team workspaces, and live cloud sync.</p>
                    </div>
                    <div class="text-right font-mono text-xs text-orange-400 font-bold">
                        Step {{ step }} of 2
                    </div>
                </div>

                <!-- Step Progress Bars -->
                <div class="grid grid-cols-2 gap-2 mt-4">
                    <div class="h-1.5 rounded-full transition-all duration-300" :class="step >= 1 ? 'bg-orange-500' : 'bg-zinc-800'"></div>
                    <div class="h-1.5 rounded-full transition-all duration-300" :class="step >= 2 ? 'bg-orange-500' : 'bg-zinc-800'"></div>
                </div>
            </div>

            <?php if (!empty($errorMessage)): ?>
                <div class="m-6 mb-0 p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2">
                    <span class="inline-flex items-center justify-center shrink-0 w-4 h-4 text-rose-400" v-html="renderIcon('alert-circle', 'w-4 h-4 text-rose-400')"></span>
                    <span><?php echo htmlspecialchars($errorMessage, ENT_QUOTES, 'UTF-8'); ?></span>
                </div>
            <?php endif; ?>

            <!-- Registration Form -->
            <form method="POST" action="register.php" @submit="handleSubmit" class="p-6 sm:p-8 space-y-6">
                
                <!-- STEP 1: Account Credentials -->
                <div v-show="step === 1" class="space-y-4">
                    <div>
                        <label class="block text-xs font-semibold text-zinc-300 mb-1.5">Full Name *</label>
                        <div class="relative">
                            <span class="absolute left-3 top-2.5 text-zinc-500" v-html="renderIcon('user', 'w-4 h-4 text-zinc-500')"></span>
                            <input type="text" name="name" v-model="formData.name" required placeholder="e.g. Alex Rivera" class="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-9 pr-4 py-2.5 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-orange-500">
                        </div>
                    </div>

                    <div>
                        <label class="block text-xs font-semibold text-zinc-300 mb-1.5">Work Email Address *</label>
                        <div class="relative">
                            <span class="absolute left-3 top-2.5 text-zinc-500" v-html="renderIcon('mail', 'w-4 h-4 text-zinc-500')"></span>
                            <input type="email" name="email" v-model="formData.email" required placeholder="alex@company.com" class="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-9 pr-4 py-2.5 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-orange-500">
                        </div>
                    </div>

                    <div>
                        <label class="block text-xs font-semibold text-zinc-300 mb-1.5">Password *</label>
                        <div class="relative">
                            <span class="absolute left-3 top-2.5 text-zinc-500" v-html="renderIcon('lock', 'w-4 h-4 text-zinc-500')"></span>
                            <input :type="showPassword ? 'text' : 'password'" name="password" v-model="formData.password" required placeholder="Minimum 6 characters" class="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-9 pr-10 py-2.5 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-orange-500">
                            <button type="button" @click="showPassword = !showPassword" class="absolute right-3 top-2.5 text-zinc-500 hover:text-zinc-300">
                                <span v-html="renderIcon(showPassword ? 'eye-off' : 'eye', 'w-4 h-4')"></span>
                            </button>
                        </div>
                        
                        <!-- Password Strength Meter -->
                        <div class="mt-2" v-if="formData.password.length > 0">
                            <div class="flex items-center justify-between text-[10px] text-zinc-400 mb-1">
                                <span>Security Strength</span>
                                <span :class="passwordStrengthColor">{{ passwordStrengthLabel }}</span>
                            </div>
                            <div class="h-1 bg-zinc-800 rounded-full overflow-hidden">
                                <div class="h-full transition-all duration-300" :class="passwordStrengthBarColor" :style="{ width: passwordStrengthPercent + '%' }"></div>
                            </div>
                        </div>
                    </div>

                    <div class="pt-4 flex justify-end">
                        <button type="button" @click="goToStep2()" class="px-6 py-2.5 bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white text-xs font-bold rounded-xl shadow-lg shadow-orange-500/20 flex items-center gap-2 transition-all">
                            <span>Continue to Organization & Plan</span>
                            <span v-html="renderIcon('arrow-right', 'w-3.5 h-3.5')"></span>
                        </button>
                    </div>
                </div>

                <!-- STEP 2: Company & Plan Configuration -->
                <div v-show="step === 2" class="space-y-4">
                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label class="block text-xs font-semibold text-zinc-300 mb-1.5">Company / Organization</label>
                            <div class="relative">
                                <span class="absolute left-3 top-2.5 text-zinc-500" v-html="renderIcon('building', 'w-4 h-4 text-zinc-500')"></span>
                                <input type="text" name="company_name" v-model="formData.companyName" placeholder="Acme Technologies" class="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-9 pr-4 py-2.5 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-orange-500">
                            </div>
                        </div>
                        <div>
                            <label class="block text-xs font-semibold text-zinc-300 mb-1.5">Your Role</label>
                            <select name="role" v-model="formData.role" class="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2.5 text-xs text-zinc-100 focus:outline-none focus:border-orange-500">
                                <option value="Backend Engineer">Backend Engineer</option>
                                <option value="Frontend Engineer">Frontend Engineer</option>
                                <option value="Full-Stack Developer">Full-Stack Developer</option>
                                <option value="QA / Automation Engineer">QA / Automation Engineer</option>
                                <option value="Engineering Manager">Engineering Manager</option>
                                <option value="Product Architect">Product Architect</option>
                            </select>
                        </div>
                    </div>

                    <!-- Plan Selection Cards -->
                    <div>
                        <label class="block text-xs font-semibold text-zinc-300 mb-2">Select Your Subscription Tier</label>
                        <input type="hidden" name="plan" :value="formData.plan">
                        <input type="hidden" name="billing_cycle" value="monthly">
                        
                        <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <!-- Free -->
                            <div @click="formData.plan = 'free'" class="p-3.5 rounded-xl border cursor-pointer transition-all flex flex-col justify-between" :class="formData.plan === 'free' ? 'bg-orange-500/10 border-orange-500 text-orange-200' : 'bg-zinc-950/60 border-zinc-800 hover:border-zinc-700 text-zinc-400'">
                                <div>
                                    <div class="flex items-center justify-between">
                                        <span class="text-xs font-bold text-white">Free Dev</span>
                                        <span v-if="formData.plan === 'free'" class="text-orange-400 text-xs">✓</span>
                                    </div>
                                    <div class="text-lg font-black text-white mt-1">$0 <span class="text-[10px] font-normal text-zinc-500">/mo</span></div>
                                    <ul class="mt-2 text-[10px] space-y-1 text-zinc-400">
                                        <li>&bull; 100k API req/mo</li>
                                        <li>&bull; Personal workspaces</li>
                                    </ul>
                                </div>
                            </div>

                            <!-- Pro (Popular) -->
                            <div @click="formData.plan = 'pro'" class="p-3.5 rounded-xl border cursor-pointer transition-all flex flex-col justify-between relative" :class="formData.plan === 'pro' ? 'bg-orange-500/15 border-orange-500 text-orange-200 ring-1 ring-orange-500/40' : 'bg-zinc-950/60 border-zinc-800 hover:border-zinc-700 text-zinc-400'">
                                <span class="absolute -top-2.5 right-3 px-1.5 py-0.2 rounded bg-orange-500 text-white text-[9px] font-extrabold uppercase">Popular</span>
                                <div>
                                    <div class="flex items-center justify-between">
                                        <span class="text-xs font-bold text-white">Pro Team</span>
                                        <span v-if="formData.plan === 'pro'" class="text-orange-400 text-xs">✓</span>
                                    </div>
                                    <div class="text-lg font-black text-white mt-1">$29 <span class="text-[10px] font-normal text-zinc-500">/mo</span></div>
                                    <ul class="mt-2 text-[10px] space-y-1 text-zinc-300">
                                        <li>&bull; 1,000,000 API req/mo</li>
                                        <li>&bull; Real-time cloud sync</li>
                                        <li>&bull; Advanced environments</li>
                                    </ul>
                                </div>
                            </div>

                            <!-- Enterprise -->
                            <div @click="formData.plan = 'enterprise'" class="p-3.5 rounded-xl border cursor-pointer transition-all flex flex-col justify-between" :class="formData.plan === 'enterprise' ? 'bg-orange-500/10 border-orange-500 text-orange-200' : 'bg-zinc-950/60 border-zinc-800 hover:border-zinc-700 text-zinc-400'">
                                <div>
                                    <div class="flex items-center justify-between">
                                        <span class="text-xs font-bold text-white">Enterprise</span>
                                        <span v-if="formData.plan === 'enterprise'" class="text-orange-400 text-xs">✓</span>
                                    </div>
                                    <div class="text-lg font-black text-white mt-1">$199 <span class="text-[10px] font-normal text-zinc-500">/mo</span></div>
                                    <ul class="mt-2 text-[10px] space-y-1 text-zinc-400">
                                        <li>&bull; 10M API req/mo</li>
                                        <li>&bull; Dedicated proxy nodes</li>
                                        <li>&bull; SLA & Audit logs</li>
                                    </ul>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="pt-4 flex items-center justify-between">
                        <button type="button" @click="step = 1" class="px-4 py-2 text-xs font-semibold text-zinc-400 hover:text-white transition-colors">
                            &larr; Back
                        </button>
                        <button type="submit" class="px-7 py-2.5 bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white text-xs font-bold rounded-xl shadow-lg shadow-orange-500/25 flex items-center gap-2 transition-all">
                            <span v-html="renderIcon('check', 'w-4 h-4')"></span>
                            <span>Complete Registration & Launch</span>
                        </button>
                    </div>
                </div>

            </form>
        </div>

        <div class="mt-6 text-center text-xs text-zinc-500">
            Already have an account? <button type="button" @click="navigate('/')" class="text-orange-400 hover:underline font-semibold" onmouseover="window.status=''; return true;">Sign in to Workspace</button>
        </div>
    </main>

    <!-- Clean Footer with No Status Bar Link Leaks -->
    <footer class="border-t border-zinc-900 py-4 px-4 text-center text-xs text-zinc-600">
        CloudPost Collaborative API Studio &bull; Pure PHP Edition &bull; 100% Shared Hosting Compatible
    </footer>

</div>

<script>
const { createApp, ref, computed } = Vue;

createApp({
    setup() {
        const step = ref(1);
        const showPassword = ref(false);
        const formData = ref({
            name: '',
            email: '',
            password: '',
            companyName: '',
            role: 'Backend Engineer',
            plan: 'pro'
        });

        const passwordStrengthPercent = computed(() => {
            const p = formData.value.password;
            if (!p) return 0;
            let score = 0;
            if (p.length >= 6) score += 25;
            if (p.length >= 10) score += 25;
            if (/[A-Z]/.test(p) && /[a-z]/.test(p)) score += 25;
            if (/[0-9]/.test(p) || /[^A-Za-z0-9]/.test(p)) score += 25;
            return score;
        });

        const passwordStrengthLabel = computed(() => {
            const pct = passwordStrengthPercent.value;
            if (pct <= 25) return 'Weak';
            if (pct <= 50) return 'Fair';
            if (pct <= 75) return 'Good';
            return 'Strong';
        });

        const passwordStrengthColor = computed(() => {
            const pct = passwordStrengthPercent.value;
            if (pct <= 25) return 'text-rose-400';
            if (pct <= 50) return 'text-amber-400';
            if (pct <= 75) return 'text-blue-400';
            return 'text-emerald-400 font-bold';
        });

        const passwordStrengthBarColor = computed(() => {
            const pct = passwordStrengthPercent.value;
            if (pct <= 25) return 'bg-rose-500';
            if (pct <= 50) return 'bg-amber-500';
            if (pct <= 75) return 'bg-blue-500';
            return 'bg-emerald-500';
        });

        const renderIcon = (name, className = 'w-4 h-4') => {
            if (typeof lucide !== 'undefined' && lucide.icons && lucide.icons[name]) {
                return lucide.icons[name].toSvg({ class: className });
            }
            return '<svg class="' + className + '" fill="none" stroke="currentColor" viewBox="0 0 24 24"></svg>';
        };

        const goToStep2 = () => {
            if (!formData.value.name.trim() || !formData.value.email.trim() || !formData.value.password) {
                alert('Please fill out all fields before continuing.');
                return;
            }
            if (formData.value.password.length < 6) {
                alert('Password must be at least 6 characters.');
                return;
            }
            step.value = 2;
        };

        const navigate = (path) => {
            // Clean navigation preventing any URL in browser status bar and keeping clean address bar
            if (path === '/') {
                window.location.href = '/';
            } else if (path === '/saas-users') {
                window.location.href = '/saas-users';
            } else if (path === '/saas-reports') {
                window.location.href = '/saas-reports';
            } else {
                window.location.href = path;
            }
        };

        const handleSubmit = (e) => {
            // Standard form submission to register.php
        };

        return {
            step,
            showPassword,
            formData,
            passwordStrengthPercent,
            passwordStrengthLabel,
            passwordStrengthColor,
            passwordStrengthBarColor,
            renderIcon,
            goToStep2,
            navigate,
            handleSubmit
        };
    }
}).mount('#app');
</script>

</body>
</html>
`;
}
