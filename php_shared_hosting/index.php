<?php
/**
 * CloudPost API Studio - Pure PHP Edition
 * Publisher: Tech Vision Studio
 * Copyright (c) 2026 Tech Vision Studio. All rights reserved.
 * 100% Shared Hosting Compatible (cPanel, XAMPP, Apache, Nginx, Plesk)
 * Complete Postman-grade API development suite with Zero Build Steps.
 */

if (isset($_GET['debug']) && $_GET['debug'] === '1') {
    error_reporting(E_ALL);
    ini_set('display_errors', '1');
    ini_set('display_startup_errors', '1');
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

try {
    if (file_exists(__DIR__ . '/auth.php')) {
        require_once __DIR__ . '/auth.php';
    }
} catch (Throwable $e) {}

$isLoggedIn = isset($_SESSION['user_id']);
$user = null;
$storedCollections = [];
$isSuperAdmin = false;

try {
    if ($isLoggedIn && function_exists('getCurrentUser')) {
        $user = getCurrentUser($_SESSION['user_id']);
        if ($user && function_exists('isSuperAdmin')) {
            $isSuperAdmin = isSuperAdmin($user);
        } elseif (isset($_SESSION['user_role']) && $_SESSION['user_role'] === 'superadmin') {
            $isSuperAdmin = true;
        }
    }
    $effectiveUserId = $isLoggedIn ? $_SESSION['user_id'] : (function_exists('resolveCurrentSessionUserId') ? resolveCurrentSessionUserId() : null);
    if (function_exists('getStoredCollections')) {
        $storedCollections = getStoredCollections($effectiveUserId);
    }
} catch (Throwable $e) {}

// Default view is studio (matching React showLandingPage = false), but landing can be opened via ?view=landing or button
$initialView = (isset($_GET['view']) && $_GET['view'] === 'landing') ? 'landing' : 'studio';
?>
<!DOCTYPE html>
<html lang="en" class="dark">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <title>CloudPost v2.4 - Collaborative API Platform & Studio</title>
    <link rel="canonical" href="<?php echo defined('APP_URL') ? APP_URL : 'https://cloudpost.techvisionstudio.in'; ?>">
    <meta property="og:url" content="<?php echo defined('APP_URL') ? APP_URL : 'https://cloudpost.techvisionstudio.in'; ?>">
    <meta name="author" content="Tech Vision Studio">
    <meta name="publisher" content="Tech Vision Studio">
    <link rel="manifest" href="manifest.json">
    <meta name="theme-color" content="#f97316">
    <meta name="mobile-web-app-capable" content="yes">
    <meta name="apple-mobile-web-app-capable" content="yes">
    <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
    <meta name="apple-mobile-web-app-title" content="CloudPost">
    <link rel="apple-touch-icon" href="icon-192.svg">
    <link rel="icon" type="image/svg+xml" href="icon-192.svg">
    <!-- Tailwind CSS CDN -->
    <script src="https://cdn.tailwindcss.com"></script>
    <!-- Lucide Icons with Fallback -->
    <script src="https://cdn.jsdelivr.net/npm/lucide@latest/dist/umd/lucide.min.js"></script>
    <script>
        if (typeof lucide === 'undefined') {
            document.write('<script src="https://unpkg.com/lucide@latest/dist/umd/lucide.min.js"><\/script>');
        }
    </script>
    <!-- Vue 3 Global Build CDN with Fallback -->
    <script src="https://cdn.jsdelivr.net/npm/vue@3/dist/vue.global.prod.js"></script>
    <script>
        if (typeof Vue === 'undefined') {
            document.write('<script src="https://unpkg.com/vue@3/dist/vue.global.prod.js"><\/script>');
        }
    </script>
    <!-- D3.js for Interactive JSON Visual Graph with Fallback -->
    <script src="https://cdn.jsdelivr.net/npm/d3@7/dist/d3.min.js"></script>
    <script>
        if (typeof d3 === 'undefined') {
            document.write('<script src="https://unpkg.com/d3@7/dist/d3.min.js"><\/script>');
        }
    </script>
    
    <script>
        tailwind.config = {
            darkMode: 'class',
            theme: {
                extend: {
                    colors: {
                        dark: {
                            base: '#0f1117',
                            surface: '#11141e',
                            card: '#151926',
                            header: '#0a0c12',
                            tab: '#0d0f17',
                            sidebar: '#0c0e14',
                            border: 'rgba(255, 255, 255, 0.1)',
                        },
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
        ::-webkit-scrollbar { width: 6px; height: 6px; }
        ::-webkit-scrollbar-track { background: #0c0e14; }
        ::-webkit-scrollbar-thumb { background: #262b3a; border-radius: 4px; }
        ::-webkit-scrollbar-thumb:hover { background: #3b4259; }

        /* Hide scrollbars cleanly when requested */
        .no-scrollbar::-webkit-scrollbar {
            display: none !important;
            width: 0 !important;
            height: 0 !important;
        }
        .no-scrollbar {
            -ms-overflow-style: none !important;
            scrollbar-width: none !important;
        }

        /* Infallible SVG Sizing within all action button bars */
        .action-btn svg,
        .request-hover-actions svg,
        .collection-hover-actions svg,
        .folder-hover-actions svg {
            width: 12px !important;
            height: 12px !important;
            min-width: 12px !important;
            min-height: 12px !important;
            display: inline-block !important;
            vertical-align: middle !important;
            flex-shrink: 0 !important;
        }

        /* Fallbacks for Tailwind group-hover utilities across dynamic Vue components */
        .group:hover .group-hover\:opacity-100 {
            opacity: 1 !important;
            visibility: visible !important;
            pointer-events: auto !important;
        }
        .group:hover .group-hover\:flex {
            display: flex !important;
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
            if (realHref && realHref !== '#' && realHref.trim() !== '' && !realHref.startsWith('javascript:')) {
              if (t.target === '_blank') {
                window.open(realHref, '_blank', 'noopener,noreferrer');
              } else {
                window.location.href = realHref;
              }
            }
          });
        }
      }, true);
    </script>
</head>
<body class="bg-[#0f1117] text-[#e1e4ea] min-h-screen flex flex-col antialiased selection:bg-orange-500/30 selection:text-orange-200 font-sans">

<div id="app" class="h-screen w-screen flex flex-col bg-[#0f1117] text-[#e1e4ea] overflow-hidden select-none relative">

    <!-- ========================================== -->
    <!-- 1. LANDING PAGE VIEW (Identical to React)  -->
    <!-- ========================================== -->
    <div v-if="currentView === 'landing'" class="min-h-screen h-screen flex flex-col overflow-y-auto">
        <!-- Landing Navbar -->
        <nav class="min-h-[64px] py-3.5 border-b border-white/10 bg-zinc-950/90 backdrop-blur-xl px-4 sm:px-8 flex items-center justify-between sticky top-0 z-40 shrink-0" style="min-height: 64px; padding-top: 14px; padding-bottom: 14px;">
            <div class="flex items-center gap-3 py-1 my-auto">
                <div class="w-9 h-9 rounded-xl bg-gradient-to-tr from-orange-500 to-amber-600 flex items-center justify-center shadow-lg shadow-orange-500/25 shrink-0 my-0.5">
                    <span class="inline-flex items-center justify-center shrink-0 w-5 h-5 text-white -rotate-12" v-html="renderIcon('send', 'w-5 h-5 text-white')"></span>
                </div>
                <div class="flex items-center gap-2">
                    <span class="font-extrabold text-base tracking-tight bg-gradient-to-r from-white via-zinc-200 to-orange-400 bg-clip-text text-transparent">
                        CloudPost
                    </span>
                    <span class="text-[10px] px-2 py-0.5 rounded-full bg-orange-500/20 text-orange-400 border border-orange-500/30 font-mono font-semibold">
                        v2.4
                    </span>
                </div>
            </div>

            <div class="flex items-center gap-2 sm:gap-3">
                <nav class="hidden md:flex items-center gap-1 text-xs">
                    <button @click="navigate('/saas-users')" class="px-2.5 py-1.5 rounded-lg text-zinc-300 hover:text-white hover:bg-white/5 font-medium transition-colors" onmouseover="window.status=''; return true;">
                        SaaS Users
                    </button>
                    <button @click="navigate('/saas-reports')" class="px-2.5 py-1.5 rounded-lg text-zinc-300 hover:text-white hover:bg-white/5 font-medium transition-colors" onmouseover="window.status=''; return true;">
                        Financials
                    </button>
                    <button @click="navigate('/diagnostic')" class="px-2.5 py-1.5 rounded-lg text-zinc-300 hover:text-white hover:bg-white/5 font-medium transition-colors" onmouseover="window.status=''; return true;">
                        Diagnostics
                    </button>
                    <button @click="navigate('/register')" class="px-2.5 py-1.5 rounded-lg text-zinc-300 hover:text-white hover:bg-white/5 font-medium transition-colors" onmouseover="window.status=''; return true;">
                        Register
                    </button>
                </nav>

                <div class="hidden md:block h-4 w-px bg-white/10"></div>

                <?php if ($isLoggedIn): ?>
                    <?php if ($isSuperAdmin): ?>
                        <button @click="navigate('/diagnostic')" class="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 rounded-lg text-xs font-bold transition-all shadow-sm" title="SuperAdmin Diagnostic & System Health" onmouseover="window.status=''; return true;">
                            <span class="inline-flex items-center justify-center shrink-0 w-3.5 h-3.5 text-amber-400" v-html="renderIcon('shield-alert', 'w-3.5 h-3.5 text-amber-400')"></span>
                            <span class="hidden sm:inline">System Diagnostics</span>
                            <span class="px-1.5 py-0.5 rounded bg-amber-400/20 text-[9px] text-amber-200 uppercase font-black">SuperAdmin</span>
                        </button>
                    <?php endif; ?>
                    <button @click="currentView = 'studio'" class="flex items-center gap-1.5 px-4 py-1.5 bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white rounded-lg text-xs font-bold shadow-lg shadow-orange-500/20 transition-all">
                        <span class="inline-flex items-center justify-center shrink-0 w-3.5 h-3.5" v-html="renderIcon('user-check', 'w-3.5 h-3.5')"></span>
                        <span>Workspace (<?php echo htmlspecialchars($user['name'] ?? 'User', ENT_QUOTES, 'UTF-8'); ?>)</span>
                    </button>
                    <button @click="navigate('/auth?action=logout')" class="p-1.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 rounded-lg text-xs border border-zinc-800 transition-colors" title="Logout" onmouseover="window.status=''; return true;">
                        <span class="inline-flex items-center justify-center shrink-0 w-4 h-4" v-html="renderIcon('log-out', 'w-4 h-4')"></span>
                    </button>
                <?php else: ?>
                    <button @click="currentView = 'studio'" class="px-3.5 py-1.5 text-xs font-medium text-zinc-300 hover:text-white rounded-lg hover:bg-white/5 border border-white/10 transition-colors">
                        Guest Mode
                    </button>
                    <button @click="openModal('authModal')" class="flex items-center gap-1.5 px-4 py-1.5 bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white rounded-lg text-xs font-bold shadow-lg shadow-orange-500/20 transition-all">
                        <span class="inline-flex items-center justify-center shrink-0 w-3.5 h-3.5" v-html="renderIcon('log-in', 'w-3.5 h-3.5')"></span>
                        <span>Sign In</span>
                    </button>
                <?php endif; ?>
            </div>
        </nav>

        <!-- Landing Hero -->
        <section class="relative pt-12 pb-16 px-4 sm:px-8 max-w-7xl mx-auto w-full flex flex-col items-center text-center">
            <div class="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-white/5 border border-white/10 text-xs text-zinc-300 mb-6 backdrop-blur shadow-sm">
                <span class="inline-flex items-center justify-center shrink-0 w-3.5 h-3.5 text-orange-400" v-html="renderIcon('sparkles', 'w-3.5 h-3.5 text-orange-400')"></span>
                <span>Collaborative API Development & Database Storage</span>
            </div>

            <h1 class="text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white max-w-4xl leading-[1.15]">
                Build, Test & Collaborate on APIs with <span class="bg-gradient-to-r from-orange-400 via-amber-300 to-orange-500 bg-clip-text text-transparent">Speed & Precision</span>
            </h1>

            <p class="mt-5 text-sm sm:text-base text-zinc-400 max-w-2xl leading-relaxed">
                The collaborative API platform for engineering teams. Test endpoints instantly, organize collections, manage environments, and persist everything directly to your database.
            </p>

            <div class="mt-8 flex flex-wrap items-center justify-center gap-3.5 w-full max-w-md sm:max-w-none">
                <button @click="currentView = 'studio'" class="w-full sm:w-auto px-6 py-3.5 bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white font-bold text-sm rounded-xl shadow-xl shadow-orange-500/25 transition-all flex items-center justify-center gap-2">
                    <span class="inline-flex items-center justify-center shrink-0 w-4 h-4 text-amber-200" v-html="renderIcon('zap', 'w-4 h-4 text-amber-200')"></span>
                    <span>Launch Sandbox &rarr;</span>
                </button>

                <button @click="openModal('authModal')" class="w-full sm:w-auto px-6 py-3.5 bg-white/5 hover:bg-white/10 border border-white/10 text-white font-semibold text-sm rounded-xl transition-all flex items-center justify-center gap-2">
                    <span class="inline-flex items-center justify-center shrink-0 w-4 h-4 text-orange-400" v-html="renderIcon('lock', 'w-4 h-4 text-orange-400')"></span>
                    <span>Sign In</span>
                </button>
            </div>

            <!-- Live Interactive API Sandbox (Identical Presets) -->
            <div class="mt-12 w-full max-w-4xl bg-zinc-900/90 border border-white/10 rounded-2xl shadow-2xl overflow-hidden text-left flex flex-col backdrop-blur">
                <div class="p-3.5 sm:p-4 border-b border-white/10 bg-zinc-950/60 flex items-center justify-between flex-wrap gap-2">
                    <div class="flex items-center gap-2">
                        <span class="relative flex h-3 w-3"><span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span><span class="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span></span>
                        <span class="text-xs font-bold text-white uppercase tracking-wider">Live Interactive API Sandbox</span>
                        <span class="text-[11px] text-zinc-400 hidden sm:inline">(Test any endpoint right now without signing up)</span>
                    </div>

                    <div class="flex items-center gap-1.5 overflow-x-auto">
                        <span class="text-[11px] text-zinc-500 font-medium mr-1">Presets:</span>
                        <button v-for="p in sandboxPresets" :key="p.name" @click="applySandboxPreset(p)" class="px-2 py-1 rounded-md text-[11px] bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white border border-white/10 transition-colors whitespace-nowrap">
                            {{ p.name }}
                        </button>
                    </div>
                </div>

                <!-- URL & Method Bar -->
                <div class="p-3 sm:p-4 border-b border-white/10 bg-zinc-900/40 flex items-center gap-2">
                    <select v-model="sandboxMethod" class="bg-zinc-950 border border-white/10 text-orange-400 font-bold text-xs rounded-xl px-3 py-2.5 focus:outline-none focus:border-orange-500 font-mono">
                        <option value="GET">GET</option>
                        <option value="POST">POST</option>
                        <option value="PUT">PUT</option>
                        <option value="DELETE">DELETE</option>
                    </select>

                    <div class="relative flex-1">
                        <input type="text" v-model="sandboxUrl" placeholder="https://api.example.com/endpoint" class="w-full bg-zinc-950 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-orange-500 font-mono">
                    </div>

                    <button @click="sendSandboxRequest()" :disabled="sandboxLoading" class="px-5 py-2.5 bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white text-xs font-bold rounded-xl shadow-lg shadow-orange-500/20 flex items-center gap-2 transition-all disabled:opacity-50">
                        <span v-if="sandboxLoading" class="inline-flex items-center justify-center shrink-0 w-3.5 h-3.5 animate-spin" v-html="renderIcon('loader-2', 'w-3.5 h-3.5 animate-spin')"></span>
                        <span v-else class="inline-flex items-center justify-center shrink-0 w-3.5 h-3.5" v-html="renderIcon('send', 'w-3.5 h-3.5')"></span>
                        <span>{{ sandboxLoading ? 'Sending...' : 'Send' }}</span>
                    </button>
                </div>

                <!-- Sandbox Body if POST/PUT -->
                <div v-if="sandboxMethod === 'POST' || sandboxMethod === 'PUT'" class="p-3 border-b border-white/10 bg-zinc-950/40">
                    <div class="text-[11px] text-zinc-400 font-mono mb-1.5">JSON Payload Body:</div>
                    <textarea v-model="sandboxBody" rows="3" class="w-full bg-zinc-950 border border-white/10 rounded-lg p-2 text-xs text-emerald-300 font-mono focus:outline-none focus:border-orange-500"></textarea>
                </div>

                <!-- Sandbox Response Output -->
                <div class="h-64 sm:h-72 overflow-hidden flex flex-col bg-zinc-950">
                    <div class="px-4 py-2 border-b border-white/10 bg-zinc-900/30 flex items-center justify-between text-xs font-mono">
                        <div class="flex items-center gap-3">
                            <span class="text-zinc-400 text-[11px] uppercase font-semibold">Response:</span>
                            <span v-if="sandboxResponse" class="px-2 py-0.5 rounded text-xs font-bold" :class="sandboxResponse.status >= 200 && sandboxResponse.status < 300 ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'">
                                {{ sandboxResponse.status }} {{ sandboxResponse.statusText }}
                            </span>
                            <span v-else class="text-zinc-500 text-[11px]">Ready to execute</span>
                        </div>
                        <div v-if="sandboxResponse" class="flex items-center gap-4 text-zinc-400 text-[11px]">
                            <span>Time: <strong class="text-zinc-200">{{ sandboxResponse.time }} ms</strong></span>
                            <span>Size: <strong class="text-zinc-200">{{ formatBytes(sandboxResponse.size) }}</strong></span>
                        </div>
                    </div>
                    <div class="flex-1 p-4 overflow-auto font-mono text-xs">
                        <pre v-if="sandboxResponse" class="text-zinc-200 whitespace-pre-wrap">{{ sandboxFormattedResponse }}</pre>
                        <div v-else class="h-full flex flex-col items-center justify-center text-zinc-600 space-y-2">
                            <span class="inline-flex items-center justify-center shrink-0 w-8 h-8 opacity-30" v-html="renderIcon('play', 'w-8 h-8 opacity-30')"></span>
                            <p class="text-xs">Click "Send" above to test this request in real-time.</p>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    </div>

    <!-- ========================================== -->
    <!-- 2. STUDIO WORKSPACE VIEW (Identical Suite) -->
    <!-- ========================================== -->
    <div v-else class="flex-1 flex flex-col overflow-hidden">
        <!-- Top Navigation -->
        <header class="relative z-50 min-h-[58px] py-2 bg-[#121520] border-b border-white/10 px-3 sm:px-4 flex items-center justify-between select-none shrink-0 font-sans gap-2.5" style="min-height: 58px;">
            <!-- Left: Logo, Workspace Switcher & Module Tabs -->
            <div class="flex items-center gap-2 sm:gap-2.5 shrink-0">
                <!-- Sidebar Toggle Button (Responsive & Desktop) -->
                <button type="button" @click="isSidebarOpen = !isSidebarOpen" class="h-8 w-8 inline-flex items-center justify-center p-0 rounded-lg text-zinc-400 hover:text-white hover:bg-white/5 border border-white/10 transition-colors shrink-0 whitespace-nowrap" :title="isSidebarOpen ? 'Collapse Sidebar (Ctrl+\\)' : 'Expand Sidebar (Ctrl+\\)'">
                    <span class="inline-flex items-center justify-center shrink-0 w-4 h-4 text-orange-400" v-html="renderIcon(isSidebarOpen ? 'panel-left-close' : 'panel-left-open', 'w-4 h-4 text-orange-400')"></span>
                </button>

                <div @click="currentView = 'landing'" class="h-8 inline-flex items-center gap-2 hover:opacity-80 transition-opacity text-left group cursor-pointer shrink-0 whitespace-nowrap" title="Home">
                    <div class="w-8 h-8 rounded-lg bg-gradient-to-tr from-orange-500 to-amber-600 flex items-center justify-center shadow-md shadow-orange-500/20 text-white font-black text-sm shrink-0">
                        <span class="inline-flex items-center justify-center shrink-0 w-4 h-4 text-white -rotate-12" v-html="renderIcon('send', 'w-4 h-4 text-white')"></span>
                    </div>
                    <div class="hidden lg:flex flex-col justify-center">
                        <div class="flex items-center gap-1.5 leading-none">
                            <span class="font-bold text-white text-sm tracking-tight group-hover:text-orange-300 transition-colors">CloudPost</span>
                            <span class="text-[9px] px-1.5 py-0.2 rounded-full bg-orange-500/20 text-orange-400 border border-orange-500/30 font-mono font-semibold">v2.4</span>
                        </div>
                        <span class="text-[8px] text-orange-400/80 font-mono block leading-tight mt-0.5">COLLABORATIVE API</span>
                    </div>
                </div>

                <div class="h-5 w-px bg-white/10 hidden sm:block shrink-0"></div>

                <!-- Workspace Switcher Dropdown -->
                <div class="relative shrink-0">
                    <button @click="showWorkspaceDropdown = !showWorkspaceDropdown" class="h-8 inline-flex items-center gap-2 px-2.5 sm:px-3 rounded-lg bg-[#151926] hover:bg-white/5 text-xs font-semibold text-zinc-300 transition-colors border border-white/10 shrink-0 whitespace-nowrap">
                        <span class="inline-flex items-center justify-center shrink-0 w-3.5 h-3.5 text-orange-400" v-html="renderIcon('layout-grid', 'w-3.5 h-3.5 text-orange-400')"></span>
                        <span class="max-w-[90px] sm:max-w-[130px] truncate whitespace-nowrap">{{ activeWorkspace ? activeWorkspace.name : 'Select Workspace' }}</span>
                        <span class="inline-flex items-center justify-center shrink-0 w-3 h-3 text-zinc-500" v-html="renderIcon('chevron-down', 'w-3 h-3 text-zinc-500')"></span>
                    </button>

                    <div v-if="showWorkspaceDropdown" @click.outside="showWorkspaceDropdown = false" class="absolute left-0 top-full mt-1.5 w-64 bg-[#151926] border border-white/10 rounded-xl shadow-2xl z-50 p-1.5 space-y-1">
                        <div class="px-2.5 py-1 text-[10px] font-bold text-zinc-500 uppercase tracking-wider flex items-center justify-between">
                            <span>Workspaces</span>
                            <span class="text-orange-400 font-mono">Team Sync</span>
                        </div>
                        <div v-for="ws in workspaces" :key="ws.id" @click="selectWorkspace(ws.id)" class="flex items-center justify-between p-2 rounded-lg hover:bg-white/5 cursor-pointer text-xs transition-colors" :class="{'bg-orange-500/10 text-orange-400 font-bold': activeWorkspaceId === ws.id}">
                            <div class="flex items-center gap-2">
                                <span class="inline-flex items-center justify-center shrink-0 w-3.5 h-3.5 text-zinc-400" v-html="renderIcon('layers', 'w-3.5 h-3.5 text-zinc-400')"></span>
                                <span class="truncate">{{ ws.name }}</span>
                            </div>
                            <span v-if="activeWorkspaceId === ws.id" class="text-orange-400 text-xs">✓</span>
                        </div>
                        <div class="border-t border-white/10 pt-1 mt-1 flex items-center justify-between gap-1">
                            <button @click="openModal('newWorkspaceModal'); showWorkspaceDropdown = false" class="flex-1 py-1.5 px-2 rounded-lg hover:bg-white/5 text-[11px] text-zinc-300 hover:text-white flex items-center gap-1.5">
                                <span class="inline-flex items-center justify-center shrink-0 w-3 h-3 text-orange-400" v-html="renderIcon('plus', 'w-3 h-3 text-orange-400')"></span>
                                <span>New Workspace</span>
                            </button>
                            <button @click="openModal('shareWorkspaceModal'); showWorkspaceDropdown = false" class="py-1.5 px-2 rounded-lg hover:bg-white/5 text-[11px] text-zinc-300 hover:text-white flex items-center gap-1">
                                <span class="inline-flex items-center justify-center shrink-0 w-3 h-3 text-blue-400" v-html="renderIcon('share-2', 'w-3 h-3 text-blue-400')"></span>
                                <span>Share</span>
                            </button>
                        </div>
                    </div>
                </div>

                <!-- Runner Button -->
                <button @click="openCollectionRunnerTab()" class="h-8 inline-flex items-center gap-1.5 px-2 sm:px-2.5 rounded-lg bg-orange-500/10 hover:bg-orange-500/20 border border-orange-500/30 text-xs font-semibold text-orange-300 transition-colors shrink-0 whitespace-nowrap" title="Collection Runner & Automated Tests">
                    <span class="inline-flex items-center justify-center shrink-0 w-3.5 h-3.5 text-orange-400" v-html="renderIcon('play', 'w-3.5 h-3.5 text-orange-400')"></span>
                    <span class="hidden sm:inline whitespace-nowrap">Runner</span>
                </button>

                <!-- Import / Export Modal Trigger -->
                <button @click="openModal('importExportModal')" class="h-8 inline-flex items-center gap-1.5 px-2 sm:px-2.5 rounded-lg bg-[#151926] hover:bg-white/5 border border-white/10 text-xs text-zinc-300 hover:text-white transition-colors shrink-0 whitespace-nowrap" title="Import & Export Postman / JSON / OpenAPI">
                    <span class="inline-flex items-center justify-center shrink-0 w-3.5 h-3.5 text-emerald-400" v-html="renderIcon('upload', 'w-3.5 h-3.5 text-emerald-400')"></span>
                    <span class="hidden md:inline whitespace-nowrap">Import/Export</span>
                </button>

                <!-- Docs & Manual Button (Exclusive to SaaS Users) -->
                <button v-if="isSaaSUser" @click="openModal('docsManualModal')" class="h-8 inline-flex items-center gap-1.5 px-2 sm:px-2.5 rounded-lg bg-[#151926] hover:bg-white/5 border border-white/10 text-xs text-zinc-300 hover:text-white transition-colors shrink-0 whitespace-nowrap" title="Documentation & User Manuals (SaaS Members Only)">
                    <span class="inline-flex items-center justify-center shrink-0 w-3.5 h-3.5 text-amber-400" v-html="renderIcon('book-open', 'w-3.5 h-3.5 text-amber-400')"></span>
                    <span class="hidden md:inline whitespace-nowrap">Docs & Manual</span>
                </button>

                <!-- ? Option (User Guide on how to use this tool, no architecture/database/technology internals) -->
                <button @click="openModal('userGuideModal')" id="php-nav-help-guide-btn" class="h-8 w-8 inline-flex items-center justify-center rounded-lg bg-[#151926] hover:bg-white/5 border border-white/10 text-xs text-orange-400 hover:text-white transition-colors shrink-0" title="How to use this tool">
                    <span class="inline-flex items-center justify-center shrink-0 w-3.5 h-3.5 text-orange-400" v-html="renderIcon('help-circle', 'w-3.5 h-3.5 text-orange-400')"></span>
                </button>

                <!-- Architecture Tab (Admin only, never exposed to regular users) -->
                <button v-if="isSaaSAdmin" @click="openArchitectureTab()" class="h-8 inline-flex items-center gap-1.5 px-2 sm:px-2.5 rounded-lg bg-[#151926] hover:bg-white/5 border border-white/10 text-xs text-zinc-300 hover:text-white transition-colors shrink-0 whitespace-nowrap" title="Full-stack Architecture & Topology">
                    <span class="inline-flex items-center justify-center shrink-0 w-3.5 h-3.5 text-amber-400" v-html="renderIcon('sparkles', 'w-3.5 h-3.5 text-amber-400')"></span>
                    <span class="hidden lg:inline whitespace-nowrap">Architecture</span>
                </button>

                <!-- SaaS Users & Financials (Admin/Manager tabs) -->
                <button v-if="isSaaSAdmin" @click="openSaaSUsersTab()" class="h-8 inline-flex items-center gap-1.5 px-2 sm:px-2.5 rounded-lg bg-[#151926] hover:bg-white/5 border border-white/10 text-xs text-zinc-300 hover:text-white transition-colors shrink-0 whitespace-nowrap" title="SaaS Customer Accounts">
                    <span class="inline-flex items-center justify-center shrink-0 w-3.5 h-3.5 text-blue-400" v-html="renderIcon('users', 'w-3.5 h-3.5 text-blue-400')"></span>
                    <span class="hidden xl:inline whitespace-nowrap">SaaS Users</span>
                </button>

                <button v-if="isSaaSAdmin" @click="openSaaSReportsTab()" class="h-8 inline-flex items-center gap-1.5 px-2 sm:px-2.5 rounded-lg bg-[#151926] hover:bg-white/5 border border-white/10 text-xs text-zinc-300 hover:text-white transition-colors shrink-0 whitespace-nowrap" title="Financial Reports">
                    <span class="inline-flex items-center justify-center shrink-0 w-3.5 h-3.5 text-purple-400" v-html="renderIcon('trending-up', 'w-3.5 h-3.5 text-purple-400')"></span>
                    <span class="hidden xl:inline whitespace-nowrap">Financials</span>
                </button>

                <!-- Guest Mode Pill (Click asks confirmation before changing) -->
                <?php if (!$user): ?>
                    <button type="button" @click="requestGuestResetConfirmation()" id="php-nav-guest-mode-pill" 
                        class="h-8 inline-flex items-center gap-1.5 px-2.5 sm:px-3 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 text-xs shrink-0 whitespace-nowrap cursor-pointer transition-colors" 
                        title="Guest Mode: Click to change or manage guest session">
                        <span class="inline-flex items-center justify-center shrink-0 w-3.5 h-3.5 text-amber-400" v-html="renderIcon('zap', 'w-3.5 h-3.5 text-amber-400')"></span>
                        <span class="text-[11px] font-medium whitespace-nowrap">Guest Mode</span>
                    </button>
                <?php else: ?>
                    <div class="h-8 inline-flex items-center gap-1.5 px-2.5 sm:px-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs shrink-0 whitespace-nowrap">
                        <span class="w-2 h-2 rounded-full bg-emerald-400 shrink-0"></span>
                        <span class="text-[11px] font-medium whitespace-nowrap">Synced</span>
                    </div>
                <?php endif; ?>
            </div>

            <!-- Right: Environment Selector, DB Sync & Auth (Always Anchored with ml-auto) -->
            <div class="flex items-center gap-2 sm:gap-2.5 shrink-0 ml-auto" id="php-navbar-auth-actions">
                <!-- Environment Dropdown -->
                <div class="relative flex items-center shrink-0">
                    <div class="h-8 inline-flex items-center bg-[#151926] border border-white/10 rounded-lg px-1 text-xs shrink-0 whitespace-nowrap">
                        <button @click="showEnvDropdown = !showEnvDropdown" class="h-full inline-flex items-center gap-1.5 px-2 font-semibold text-zinc-200 hover:text-white shrink-0 whitespace-nowrap">
                            <span class="inline-flex items-center justify-center shrink-0 w-3.5 h-3.5 text-emerald-400" v-html="renderIcon('globe', 'w-3.5 h-3.5 text-emerald-400')"></span>
                            <span class="max-w-[85px] sm:max-w-[110px] truncate whitespace-nowrap">{{ activeEnv ? activeEnv.name : 'No Environment' }}</span>
                            <span class="inline-flex items-center justify-center shrink-0 w-3 h-3 text-zinc-500" v-html="renderIcon('chevron-down', 'w-3 h-3 text-zinc-500')"></span>
                        </button>
                        <button @click="openModal('envModal')" class="h-6 w-6 inline-flex items-center justify-center p-0 hover:bg-white/10 rounded text-zinc-400 hover:text-white border-l border-white/10 ml-1 shrink-0" title="Manage Environments">
                            <span class="inline-flex items-center justify-center shrink-0 w-3.5 h-3.5" v-html="renderIcon('eye', 'w-3.5 h-3.5')"></span>
                        </button>
                    </div>

                    <div v-if="showEnvDropdown" @click.outside="showEnvDropdown = false" class="absolute right-0 top-full mt-1.5 w-56 bg-[#151926] border border-white/10 rounded-xl shadow-2xl z-50 p-1.5 space-y-1">
                        <div class="px-2 py-1 text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Environments</div>
                        <div @click="activeEnvId = null; showEnvDropdown = false" class="flex items-center justify-between p-2 rounded-lg hover:bg-white/5 cursor-pointer text-xs text-zinc-400">
                            <span>No Environment</span>
                            <span v-if="!activeEnvId" class="text-orange-400">✓</span>
                        </div>
                        <div v-for="env in environments" :key="env.id" @click="activeEnvId = env.id; showEnvDropdown = false" class="flex items-center justify-between p-2 rounded-lg hover:bg-white/5 cursor-pointer text-xs" :class="{'bg-emerald-500/10 text-emerald-300 font-bold': activeEnvId === env.id}">
                            <span>{{ env.name }}</span>
                            <span v-if="activeEnvId === env.id" class="text-emerald-400">✓</span>
                        </div>
                    </div>
                </div>

                <!-- Network & Offline Sync State Widget -->
                <div class="h-8 inline-flex items-center justify-between gap-1.5 bg-[#151926] border border-white/10 rounded-lg px-2 text-xs shrink-0 whitespace-nowrap min-w-[130px]">
                    <div v-if="isOnline" @click="syncPendingOutbox()" class="h-full inline-flex items-center gap-1.5 px-0.5 text-emerald-400 font-mono text-[11px] cursor-pointer hover:bg-white/5 rounded transition-colors shrink-0 whitespace-nowrap flex-1"
                        :title="pendingSyncCount > 0 ? pendingSyncCount + ' changes waiting to sync to server. Click to sync now.' : 'All data synced with server. Click to force sync.'">
                        <span class="inline-flex items-center justify-center shrink-0 w-3.5 h-3.5">
                            <span v-if="syncStatus === 'syncing'" class="inline-flex items-center justify-center shrink-0 w-3.5 h-3.5 text-amber-400 animate-spin" v-html="renderIcon('refresh-cw', 'w-3.5 h-3.5 text-amber-400 animate-spin')"></span>
                            <span v-else class="inline-flex items-center justify-center shrink-0 w-3.5 h-3.5 text-emerald-400" v-html="renderIcon('wifi', 'w-3.5 h-3.5 text-emerald-400')"></span>
                        </span>
                        <span :class="syncStatus === 'syncing' ? 'text-amber-300 font-semibold' : 'text-emerald-300'" class="whitespace-nowrap">
                            {{ syncStatus === 'syncing' ? 'Syncing...' : (pendingSyncCount > 0 ? 'Sync (' + pendingSyncCount + ')' : 'Sync') }}
                        </span>
                    </div>
                    <div v-else class="h-full inline-flex items-center justify-center gap-1.5 px-1 text-amber-400 font-mono text-[11px] bg-amber-500/10 rounded shrink-0 whitespace-nowrap flex-1"
                        title="You are currently offline. All workspaces, collections, environments, and tests work completely offline and will auto-sync when internet reconnects.">
                        <span class="inline-flex items-center justify-center shrink-0 w-3.5 h-3.5 text-amber-400" v-html="renderIcon('wifi-off', 'w-3.5 h-3.5 text-amber-400')"></span>
                        <span class="text-amber-300 font-semibold whitespace-nowrap">
                            Offline {{ pendingSyncCount > 0 ? '(' + pendingSyncCount + ')' : '' }}
                        </span>
                    </div>

                    <!-- Manual Sync Trigger Button -->
                    <button v-if="isOnline" @click="syncPendingOutbox()" :disabled="syncStatus === 'syncing'" 
                        class="h-6 w-6 inline-flex items-center justify-center p-0 text-zinc-400 hover:text-white hover:bg-white/10 rounded transition-colors disabled:opacity-50 shrink-0 ml-auto" title="Force Sync Outbox to Remote Server">
                        <span class="inline-flex items-center justify-center shrink-0 w-3 h-3" :class="{'animate-spin text-amber-400': syncStatus === 'syncing'}" v-html="renderIcon('refresh-cw', 'w-3 h-3')"></span>
                    </button>
                </div>

                <!-- User Account / Auth Section (Always Visible) -->
                <?php if ($isLoggedIn && $user): ?>
                    <div class="relative flex items-center shrink-0">
                        <button @click="showUserDropdown = !showUserDropdown" class="h-8 inline-flex items-center gap-1.5 px-2.5 rounded-lg bg-[#151926] border border-white/10 text-zinc-200 text-xs hover:bg-white/5 transition-colors shrink-0 whitespace-nowrap">
                            <span class="inline-flex items-center justify-center shrink-0 w-4 h-4 text-orange-400" v-html="renderIcon('user-check', 'w-3.5 h-3.5')"></span>
                            <span class="hidden sm:inline font-semibold whitespace-nowrap"><?php echo htmlspecialchars($user['name'] ?? 'User', ENT_QUOTES, 'UTF-8'); ?></span>
                            <span class="text-[9px] font-mono px-1 py-0.2 rounded font-bold uppercase bg-orange-500/20 text-orange-300 border border-orange-500/30 whitespace-nowrap">
                                <?php echo htmlspecialchars($user['role'] ?? 'member', ENT_QUOTES, 'UTF-8'); ?>
                            </span>
                            <span class="inline-flex items-center justify-center shrink-0 w-3 h-3 text-zinc-500" v-html="renderIcon('chevron-down', 'w-3 h-3 text-zinc-500')"></span>
                        </button>

                        <div v-if="showUserDropdown" @click.outside="showUserDropdown = false" class="absolute right-0 top-full mt-1.5 w-60 bg-[#151926] border border-white/10 rounded-xl shadow-2xl z-50 p-2 space-y-1">
                            <div class="p-2 border-b border-white/10">
                                <div class="font-bold text-white text-xs truncate"><?php echo htmlspecialchars($user['name'] ?? 'User', ENT_QUOTES, 'UTF-8'); ?></div>
                                <div class="text-[11px] text-zinc-400 truncate"><?php echo htmlspecialchars($user['email'] ?? '', ENT_QUOTES, 'UTF-8'); ?></div>
                                <div class="mt-1 text-[10px] text-orange-300 font-mono">Role: <?php echo htmlspecialchars($user['role'] ?? 'member', ENT_QUOTES, 'UTF-8'); ?></div>
                            </div>
                            <button @click="openSaaSUsersTab(); showUserDropdown = false" class="w-full text-left p-2 rounded-lg text-zinc-300 hover:bg-white/5 flex items-center gap-2 text-xs transition-colors">
                                <span class="inline-flex items-center justify-center shrink-0 w-3.5 h-3.5 text-orange-400" v-html="renderIcon('users', 'w-3.5 h-3.5')"></span>
                                <span>SaaS Customers</span>
                            </button>
                            <button @click="openSaaSReportsTab(); showUserDropdown = false" class="w-full text-left p-2 rounded-lg text-zinc-300 hover:bg-white/5 flex items-center gap-2 text-xs transition-colors">
                                <span class="inline-flex items-center justify-center shrink-0 w-3.5 h-3.5 text-purple-400" v-html="renderIcon('trending-up', 'w-3.5 h-3.5')"></span>
                                <span>Financial Reports</span>
                            </button>
                            <button @click="openRegisterTab(); showUserDropdown = false" class="w-full text-left p-2 rounded-lg text-amber-300 hover:bg-white/5 flex items-center gap-2 text-xs transition-colors">
                                <span class="inline-flex items-center justify-center shrink-0 w-3.5 h-3.5 text-amber-400" v-html="renderIcon('user-plus', 'w-3.5 h-3.5')"></span>
                                <span>Register New Account</span>
                            </button>
                            <button @click="navigate('/auth?action=logout')" class="w-full text-left p-2 rounded-lg text-rose-400 hover:bg-rose-500/10 flex items-center gap-2 text-xs transition-colors">
                                <span class="inline-flex items-center justify-center shrink-0 w-3.5 h-3.5" v-html="renderIcon('log-out', 'w-3.5 h-3.5')"></span>
                                <span>Sign Out</span>
                            </button>
                        </div>
                    </div>
                <?php else: ?>
                    <div class="flex items-center gap-1.5 sm:gap-2 shrink-0">
                        <!-- Guest Session Label / Badge (Click takes confirmation first) -->
                        <button type="button" @click="requestGuestResetConfirmation()" id="php-guest-badge" 
                            class="h-8 inline-flex items-center gap-1.5 px-2.5 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/25 text-amber-300 rounded-lg text-xs font-mono transition-colors cursor-pointer shrink-0 whitespace-nowrap" 
                            title="Guest Session: Click to change or start fresh guest session">
                            <span class="inline-flex items-center justify-center shrink-0 w-3.5 h-3.5 text-amber-400" v-html="renderIcon('shield-check', 'w-3.5 h-3.5 text-amber-400')"></span>
                            <span class="whitespace-nowrap font-medium">Guest #{{ guestShortCode }}</span>
                        </button>
                        <button @click="openModal('authModal')" id="php-signin-btn" class="h-8 inline-flex items-center gap-1.5 px-3 text-xs font-semibold text-zinc-100 hover:text-white rounded-lg hover:bg-white/15 bg-white/10 border border-white/15 transition-all shrink-0 whitespace-nowrap cursor-pointer shadow-sm hover:shadow" title="Sign In">
                            <span class="inline-flex items-center justify-center shrink-0 w-3.5 h-3.5 text-orange-400" v-html="renderIcon('log-in', 'w-3.5 h-3.5')"></span>
                            <span class="whitespace-nowrap font-medium">Sign In</span>
                        </button>
                        <button @click="openRegisterTab()" id="php-register-btn" class="h-8 inline-flex items-center gap-1.5 px-3 text-xs font-bold text-white rounded-lg bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 transition-all shadow-md shadow-orange-500/25 hover:shadow-orange-500/40 shrink-0 whitespace-nowrap cursor-pointer" title="Register">
                            <span class="inline-flex items-center justify-center shrink-0 w-3.5 h-3.5" v-html="renderIcon('user-plus', 'w-3.5 h-3.5')"></span>
                            <span class="whitespace-nowrap">Register</span>
                        </button>
                    </div>
                <?php endif; ?>
            </div>
        </header>

        <!-- Main Body Area -->
        <div class="flex-1 flex overflow-hidden relative">
            <!-- Mobile Backdrop for Sidebar Drawer (< md) -->
            <div v-if="isSidebarOpen" @click="isSidebarOpen = false" class="md:hidden fixed inset-0 bg-black/60 z-30 transition-opacity backdrop-blur-sm"></div>

            <!-- Left Sidebar: 4 Tabs (Collections, Recent, Environments, Activity) Matching React -->
            <aside v-if="isSidebarOpen" class="z-40 fixed inset-y-14 left-0 w-80 md:static md:w-72 xl:w-80 shrink-0 flex flex-col h-[calc(100vh-3.5rem)] md:h-auto shadow-2xl md:shadow-none bg-[#0c0e15] border-r border-white/10 transition-all select-none">
                <!-- Sidebar Tab Switcher (4 Tabs Matching React) -->
                <div class="flex items-center justify-between border-b border-white/10 bg-[#121520] p-1 text-[11px] shrink-0 gap-1">
                    <button @click="sidebarTab = 'collections'" 
                        class="flex-1 h-8 px-1.5 rounded font-medium inline-flex items-center justify-center gap-1 transition-colors whitespace-nowrap"
                        :class="sidebarTab === 'collections' ? 'bg-[#1a1f2e] text-white shadow-sm border border-white/10' : 'text-zinc-400 hover:bg-white/5 hover:text-white border border-transparent'"
                        title="Collections">
                        <span class="inline-flex items-center justify-center shrink-0 w-3.5 h-3.5" v-html="renderIcon('layers', 'w-3.5 h-3.5')"></span>
                        <span class="truncate hidden sm:inline">Cols</span>
                    </button>
                    <button @click="sidebarTab = 'recent'" 
                        class="flex-1 h-8 px-1 rounded font-medium inline-flex items-center justify-center gap-1 transition-all relative whitespace-nowrap"
                        :class="sidebarTab === 'recent' ? 'bg-[#1a1f2e] text-white shadow-sm border border-white/10' : 'text-zinc-400 hover:bg-white/5 hover:text-white border border-transparent'"
                        title="Execution History">
                        <span class="inline-flex items-center justify-center shrink-0 w-3.5 h-3.5 text-amber-400" v-html="renderIcon('history', 'w-3.5 h-3.5 text-amber-400')"></span>
                        <span class="truncate hidden sm:inline">Recent</span>
                        <span v-if="recentRequests.length > 0" class="text-[9px] px-1 rounded-full font-bold shrink-0" :class="sidebarTab === 'recent' ? 'bg-orange-500 text-white' : 'bg-white/10 text-zinc-300'">{{ recentRequests.length }}</span>
                    </button>
                    <button @click="sidebarTab = 'environments'" 
                        class="flex-1 h-8 px-1.5 rounded font-medium inline-flex items-center justify-center gap-1 transition-colors whitespace-nowrap"
                        :class="sidebarTab === 'environments' ? 'bg-[#1a1f2e] text-white shadow-sm border border-white/10' : 'text-zinc-400 hover:bg-white/5 hover:text-white border border-transparent'"
                        title="Environments & Variables">
                        <span class="inline-flex items-center justify-center shrink-0 w-3.5 h-3.5 text-emerald-400" v-html="renderIcon('globe', 'w-3.5 h-3.5 text-emerald-400')"></span>
                        <span class="truncate hidden sm:inline">Envs</span>
                    </button>
                    <button @click="sidebarTab = 'activity'" 
                        class="flex-1 h-8 px-1.5 rounded font-medium inline-flex items-center justify-center gap-1 transition-colors whitespace-nowrap"
                        :class="sidebarTab === 'activity' ? 'bg-[#1a1f2e] text-white shadow-sm border border-white/10' : 'text-zinc-400 hover:bg-white/5 hover:text-white border border-transparent'"
                        title="Team Activity Log">
                        <span class="inline-flex items-center justify-center shrink-0 w-3.5 h-3.5 text-blue-400" v-html="renderIcon('activity', 'w-3.5 h-3.5 text-blue-400')"></span>
                        <span class="truncate hidden sm:inline">Logs</span>
                    </button>
                </div>

                <!-- Search Filter Bar -->
                <div class="p-2.5 border-b border-white/10 bg-[#0c0e14]">
                    <div class="relative flex items-center">
                        <span class="inline-flex items-center justify-center shrink-0 w-3.5 h-3.5 absolute left-2.5 pointer-events-none text-zinc-500" v-html="renderIcon('search', 'w-3.5 h-3.5 text-zinc-500')"></span>
                        <input v-model="sidebarSearch" type="text" placeholder="Search requests, URLs, collections..." 
                            class="w-full h-8 bg-[#11141e] border border-white/10 rounded-lg pl-8 pr-7 text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-orange-500 font-sans">
                        <button v-if="sidebarSearch" @click="sidebarSearch = ''" class="absolute right-2 text-zinc-500 hover:text-zinc-300 text-xs">×</button>
                    </div>
                </div>

                <!-- Tab 1: Collections Content -->
                <div v-show="sidebarTab === 'collections'" class="flex-1 flex flex-col overflow-hidden">
                    <div class="p-2 border-b border-white/10 flex items-center justify-between text-xs text-zinc-400 bg-[#0a0c12]/50">
                        <div class="flex items-center gap-1.5">
                            <span class="font-semibold uppercase tracking-wider text-[10px]">API Collections</span>
                            <span class="text-[10px] px-1.5 py-0.2 bg-white/10 text-zinc-400 rounded-full font-mono">{{ collections.length }}</span>
                        </div>
                        <div class="flex items-center gap-1">
                            <button @click="openModal('importExportModal')" class="h-7 w-7 inline-flex items-center justify-center p-0 hover:bg-white/10 text-zinc-400 hover:text-white rounded transition-colors shrink-0" title="Import Postman / OpenAPI / cURL">
                                <span class="inline-flex items-center justify-center shrink-0 w-3.5 h-3.5" v-html="renderIcon('upload', 'w-3.5 h-3.5')"></span>
                            </button>
                            <button @click="openModal('newCollectionModal')" class="h-7 w-7 inline-flex items-center justify-center p-0 hover:bg-white/10 text-zinc-400 hover:text-white rounded transition-colors shrink-0" title="New Collection">
                                <span class="inline-flex items-center justify-center shrink-0 w-3.5 h-3.5" v-html="renderIcon('plus', 'w-3.5 h-3.5')"></span>
                            </button>
                        </div>
                    </div>

                    <div class="flex-1 overflow-y-auto p-2 space-y-1.5">
                        <div v-for="col in filteredCollections" :key="col.id" class="rounded-xl bg-[#11141e] border border-white/10 overflow-hidden">
                            <!-- Collection Header Row with Bulletproof Hover Actions -->
                            <div class="collection-row group flex items-center justify-between p-2 hover:bg-white/5 cursor-pointer select-none"
                                @click="toggleCollectionCollapse(col.id)"
                                @mouseenter="hoveredColId = col.id"
                                @mouseleave="hoveredColId = null">
                                <div class="flex items-center gap-2 truncate min-w-0 flex-1">
                                    <span class="inline-flex items-center justify-center shrink-0 w-3.5 h-3.5 text-zinc-500" v-html="renderIcon((collapsedCollections[col.id] ? 'chevron-right' : 'chevron-down'), 'w-3.5 h-3.5 text-zinc-500')"></span>
                                    <span class="font-semibold text-xs text-zinc-200 truncate">{{ col.name }}</span>
                                </div>
                                
                                <!-- Bulletproof Hover Actions Bar for Collection -->
                                <div class="flex items-center gap-0.5 shrink-0 ml-1 transition-opacity" :style="hoveredColId === col.id ? 'opacity: 1; visibility: visible; pointer-events: auto;' : 'opacity: 0; visibility: hidden; pointer-events: none;'">
                                    <button type="button" @click.stop="openShareCollectionModal(col)" class="action-btn p-1 text-orange-400 hover:bg-white/10 rounded" title="Share Collection via Public Link">
                                        <span class="inline-flex items-center justify-center shrink-0 w-3 h-3" v-html="renderIcon('share-2', 'w-3 h-3')"></span>
                                    </button>
                                    <button type="button" @click.stop="exportCollectionPostmanJson(col)" class="action-btn p-1 text-amber-400 hover:bg-white/10 rounded" title="Export Collection (Postman v2.1 JSON)">
                                        <span class="inline-flex items-center justify-center shrink-0 w-3 h-3" v-html="renderIcon('download', 'w-3 h-3')"></span>
                                    </button>
                                    <button type="button" @click.stop="openExportCollectionCodeModal(col)" class="action-btn p-1 text-orange-400 hover:bg-white/10 rounded" title="Export Collection as Code / Script">
                                        <span class="inline-flex items-center justify-center shrink-0 w-3 h-3" v-html="renderIcon('code-2', 'w-3 h-3')"></span>
                                    </button>
                                    <button type="button" @click.stop="openRunnerTab(col.id)" class="action-btn p-1 text-emerald-400 hover:bg-white/10 rounded" title="Run Collection">
                                        <span class="inline-flex items-center justify-center shrink-0 w-3 h-3 text-emerald-400" v-html="renderIcon('play', 'w-3 h-3 text-emerald-400')"></span>
                                    </button>
                                    <button type="button" @click.stop="openCreateRequestModal(col.id)" class="action-btn p-1 text-zinc-300 hover:text-white hover:bg-white/10 rounded" title="Add Request">
                                        <span class="inline-flex items-center justify-center shrink-0 w-3 h-3" v-html="renderIcon('plus', 'w-3 h-3')"></span>
                                    </button>
                                    <button type="button" @click.stop="openCreateFolderModal(col.id)" class="action-btn p-1 text-amber-300 hover:text-amber-200 hover:bg-white/10 rounded" title="Add Folder">
                                        <span class="inline-flex items-center justify-center shrink-0 w-3 h-3" v-html="renderIcon('folder', 'w-3 h-3')"></span>
                                    </button>
                                    <button type="button" @click.stop="deleteCollection(col.id)" class="action-btn p-1 text-zinc-500 hover:text-red-400 hover:bg-white/10 rounded" title="Delete Collection">
                                        <span class="inline-flex items-center justify-center shrink-0 w-3 h-3" v-html="renderIcon('trash-2', 'w-3 h-3')"></span>
                                    </button>
                                </div>
                            </div>

                            <!-- Nested Folders & Requests -->
                            <div v-show="!collapsedCollections[col.id]" class="border-t border-white/5 p-1 space-y-1 bg-[#0a0c12]/40">
                                <!-- Blank Collection State -->
                                <div v-if="(!col.folders || col.folders.length === 0) && (!col.requests || col.requests.length === 0)" class="p-3 my-1 rounded-lg border border-dashed border-white/10 text-center bg-white/[0.02]">
                                    <p class="text-[11px] text-zinc-400 mb-2">Collection is blank</p>
                                    <div class="flex items-center justify-center gap-2">
                                        <button type="button" @click.stop="openCreateRequestModal(col.id)" class="px-2.5 py-1 rounded bg-orange-500/20 hover:bg-orange-500/30 text-orange-300 text-xs font-medium flex items-center gap-1 transition-colors">
                                            <span class="inline-flex items-center justify-center shrink-0 w-3 h-3" v-html="renderIcon('plus', 'w-3 h-3')"></span>
                                            <span>Add Request</span>
                                        </button>
                                        <button type="button" @click.stop="openCreateFolderModal(col.id)" class="px-2.5 py-1 rounded bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 text-xs font-medium flex items-center gap-1 transition-colors">
                                            <span class="inline-flex items-center justify-center shrink-0 w-3 h-3" v-html="renderIcon('folder', 'w-3 h-3')"></span>
                                            <span>New Folder</span>
                                        </button>
                                    </div>
                                </div>

                                <div v-for="fld in col.folders" :key="fld.id" class="space-y-1 pl-2">
                                    <!-- Folder Header with Hover Actions -->
                                    <div class="folder-row group flex items-center justify-between p-1.5 rounded-lg hover:bg-white/5 text-xs text-zinc-400 cursor-pointer select-none"
                                        @click="toggleFolderCollapse(fld.id)"
                                        @mouseenter="hoveredFldId = fld.id"
                                        @mouseleave="hoveredFldId = null">
                                        <div class="flex items-center gap-1.5 truncate min-w-0 flex-1">
                                            <span class="inline-flex items-center justify-center shrink-0 w-3.5 h-3.5 text-amber-400/80" v-html="renderIcon((collapsedFolders[fld.id] ? 'folder' : 'folder-open'), 'w-3.5 h-3.5 text-amber-400/80')"></span>
                                            <span class="truncate font-medium text-zinc-300">{{ fld.name }}</span>
                                        </div>
                                        <div class="flex items-center gap-0.5 shrink-0 ml-1 transition-opacity" :style="hoveredFldId === fld.id ? 'opacity: 1; visibility: visible; pointer-events: auto;' : 'opacity: 0; visibility: hidden; pointer-events: none;'">
                                            <button type="button" @click.stop="collapsedFolders[fld.id] = false; collapsedCollections[col.id] = false; openCreateRequestModal(col.id, fld.id)" class="action-btn p-0.5 text-zinc-300 hover:text-white rounded hover:bg-white/10" title="Add Request into Folder">
                                                <span class="inline-flex items-center justify-center shrink-0 w-3 h-3" v-html="renderIcon('plus', 'w-3 h-3')"></span>
                                            </button>
                                            <button type="button" @click.stop="deleteFolder(col.id, fld.id)" class="action-btn p-0.5 text-zinc-500 hover:text-red-400 rounded hover:bg-white/10" title="Delete Folder">
                                                <span class="inline-flex items-center justify-center shrink-0 w-3 h-3" v-html="renderIcon('trash-2', 'w-3 h-3')"></span>
                                            </button>
                                        </div>
                                    </div>
                                    
                                    <!-- Folder Requests with Hover Actions (100% Postman & React Parity: Share, Code, Delete) -->
                                    <div v-show="!collapsedFolders[fld.id]" class="space-y-0.5 pl-3 border-l border-white/10 ml-2">
                                        <div v-for="req in fld.requests" :key="req.id" @click="openRequestInTab(req)"
                                            @mouseenter="hoveredReqId = req.id"
                                            @mouseleave="hoveredReqId = null"
                                            class="request-row group flex items-center justify-between px-2 py-1 rounded cursor-pointer transition-colors select-none"
                                            :class="activeRequest && activeRequest.id === req.id ? 'is-active bg-orange-500/20 text-orange-300 font-medium' : 'text-zinc-400 hover:bg-white/5 hover:text-white'">
                                            <div class="flex items-center gap-1.5 truncate min-w-0 flex-1">
                                                <span class="font-mono text-[9px] font-bold shrink-0" :class="req.method === 'GET' ? 'text-emerald-400' : req.method === 'POST' ? 'text-amber-400' : req.method === 'PUT' ? 'text-blue-400' : req.method === 'DELETE' ? 'text-rose-400' : 'text-purple-400'">{{ req.method }}</span>
                                                <span class="truncate text-[11px]">{{ req.name }}</span>
                                            </div>
                                            <!-- Request Hover Actions (Share, Code, Delete) -->
                                            <div class="flex items-center gap-0.5 shrink-0 ml-1 transition-opacity" :style="(hoveredReqId === req.id || (activeRequest && activeRequest.id === req.id)) ? 'opacity: 1; visibility: visible; pointer-events: auto;' : 'opacity: 0; visibility: hidden; pointer-events: none;'">
                                                <button type="button" @click.stop="openShareRequestModal(req)" class="action-btn p-0.5 text-zinc-400 hover:text-orange-400 rounded hover:bg-white/10" title="Share Request via Link">
                                                    <span class="inline-flex items-center justify-center shrink-0 w-3 h-3" v-html="renderIcon('share-2', 'w-3 h-3')"></span>
                                                </button>
                                                <button type="button" @click.stop="openExportCodeForRequest(req, col)" class="action-btn p-0.5 text-zinc-400 hover:text-orange-400 rounded hover:bg-white/10" title="Export Request as Code">
                                                    <span class="inline-flex items-center justify-center shrink-0 w-3 h-3" v-html="renderIcon('code-2', 'w-3 h-3')"></span>
                                                </button>
                                                <button type="button" @click.stop="deleteRequest(col.id, req.id)" class="action-btn p-0.5 text-zinc-500 hover:text-red-400 rounded hover:bg-white/10" title="Delete Request">
                                                    <span class="inline-flex items-center justify-center shrink-0 w-3 h-3" v-html="renderIcon('trash-2', 'w-3 h-3')"></span>
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <!-- Root Requests in Collection with Hover Actions (100% Postman & React Parity: Share, Code, Delete) -->
                                <div v-for="req in col.requests" :key="req.id" @click="openRequestInTab(req)"
                                    @mouseenter="hoveredReqId = req.id"
                                    @mouseleave="hoveredReqId = null"
                                    class="request-row group flex items-center justify-between px-2 py-1 rounded cursor-pointer transition-colors select-none"
                                    :class="activeRequest && activeRequest.id === req.id ? 'is-active bg-orange-500/20 text-orange-300 font-medium' : 'text-zinc-400 hover:bg-white/5 hover:text-white'">
                                    <div class="flex items-center gap-1.5 truncate min-w-0 flex-1">
                                        <span class="font-mono text-[9px] font-bold shrink-0" :class="req.method === 'GET' ? 'text-emerald-400' : req.method === 'POST' ? 'text-amber-400' : req.method === 'PUT' ? 'text-blue-400' : req.method === 'DELETE' ? 'text-rose-400' : 'text-purple-400'">{{ req.method }}</span>
                                        <span class="truncate text-[11px]">{{ req.name }}</span>
                                    </div>
                                    <!-- Request Hover Actions (Share, Code, Delete) -->
                                    <div class="flex items-center gap-0.5 shrink-0 ml-1 transition-opacity" :style="(hoveredReqId === req.id || (activeRequest && activeRequest.id === req.id)) ? 'opacity: 1; visibility: visible; pointer-events: auto;' : 'opacity: 0; visibility: hidden; pointer-events: none;'">
                                        <button type="button" @click.stop="openShareRequestModal(req)" class="action-btn p-0.5 text-zinc-400 hover:text-orange-400 rounded hover:bg-white/10" title="Share Request via Link">
                                            <span class="inline-flex items-center justify-center shrink-0 w-3 h-3" v-html="renderIcon('share-2', 'w-3 h-3')"></span>
                                        </button>
                                        <button type="button" @click.stop="openExportCodeForRequest(req, col)" class="action-btn p-0.5 text-zinc-400 hover:text-orange-400 rounded hover:bg-white/10" title="Export Request as Code">
                                            <span class="inline-flex items-center justify-center shrink-0 w-3 h-3" v-html="renderIcon('code-2', 'w-3 h-3')"></span>
                                        </button>
                                        <button type="button" @click.stop="deleteRequest(col.id, req.id)" class="action-btn p-0.5 text-zinc-500 hover:text-red-400 rounded hover:bg-white/10" title="Delete Request">
                                            <span class="inline-flex items-center justify-center shrink-0 w-3 h-3" v-html="renderIcon('trash-2', 'w-3 h-3')"></span>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Tab 2: Recent History Content -->
                <div v-show="sidebarTab === 'recent'" class="flex-1 flex flex-col overflow-hidden">
                    <div class="p-2 border-b border-white/10 flex items-center justify-between text-xs text-zinc-400 bg-[#0a0c12]/50">
                        <div class="flex items-center gap-1.5">
                            <span class="font-semibold uppercase tracking-wider text-[10px]">Execution History</span>
                            <span v-if="recentRequests.length > 0" class="text-[9px] px-1.5 py-0.2 bg-white/10 text-zinc-400 rounded-full font-mono">{{ recentRequests.length }}</span>
                        </div>
                        <button v-if="recentRequests.length > 0" @click="clearRecentRequests()" class="text-[11px] text-zinc-500 hover:text-rose-400 transition-colors flex items-center gap-1">
                            <span class="inline-flex items-center justify-center shrink-0 w-3 h-3" v-html="renderIcon('trash-2', 'w-3 h-3')"></span>
                            Clear All
                        </button>
                    </div>

                    <!-- Filter Pills: ALL, GET, POST, PUT, DELETE, 2xx, ERR -->
                    <div class="p-2 border-b border-white/10 bg-[#0c0e14] flex items-center gap-1 overflow-x-auto text-[10px]">
                        <button v-for="f in ['ALL', 'GET', 'POST', 'PUT', 'DELETE', '2xx', 'ERR']" :key="f"
                            @click="recentMethodFilter = f"
                            class="px-2 py-0.5 rounded font-mono font-bold transition-all shrink-0"
                            :class="recentMethodFilter === f ? 'bg-orange-500 text-white shadow-sm' : 'bg-[#151926] text-zinc-400 hover:text-white'">
                            {{ f }}
                        </button>
                    </div>

                    <div class="flex-1 overflow-y-auto p-2 space-y-1.5">
                        <div v-if="filteredRecentRequests.length === 0" class="p-6 text-center text-xs text-zinc-500">
                            {{ recentRequests.length === 0 ? 'No recent executions. Click Send to test an API!' : 'No executions matching filter "' + recentMethodFilter + '".' }}
                        </div>
                        <div v-for="rec in filteredRecentRequests" :key="rec.id" 
                            @mouseenter="hoveredHistoryId, hoveredTabId = rec.id" @mouseleave="hoveredHistoryId = null" class="history-row group relative p-2.5 rounded-xl bg-[#11141e] border border-white/10 hover:border-orange-500/40 transition-all text-xs cursor-pointer"
                            @click="loadRecentSnapshot(rec)">
                            
                            <!-- Top-Right Floating Hover Action Bar -->
                            <div class="absolute right-2 top-2 items-center gap-1 bg-[#161a26] border border-white/10 rounded-lg p-0.5 shadow-lg z-10 transition-opacity" :style="hoveredHistoryId === rec.id ? 'display: flex; opacity: 1; visibility: visible; pointer-events: auto;' : 'display: none; opacity: 0; visibility: hidden; pointer-events: none;'">
                                <button @click.stop="replayRecentRequest(rec)" class="action-btn action-btn-success" title="Re-run request">
                                    <span class="inline-flex items-center justify-center shrink-0 w-3 h-3 text-emerald-400" v-html="renderIcon('play', 'w-3 h-3 text-emerald-400')"></span>
                                </button>
                                <button @click.stop="loadRecentSnapshot(rec)" class="action-btn action-btn-primary" title="Load into editor">
                                    <span class="inline-flex items-center justify-center shrink-0 w-3 h-3 text-orange-400" v-html="renderIcon('external-link', 'w-3 h-3 text-orange-400')"></span>
                                </button>
                                <button @click.stop="removeRecentRequest(rec.id)" class="action-btn action-btn-danger" title="Remove from history">
                                    <span class="inline-flex items-center justify-center shrink-0 w-3 h-3 text-rose-400" v-html="renderIcon('trash-2', 'w-3 h-3 text-rose-400')"></span>
                                </button>
                            </div>

                            <div class="flex items-center justify-between gap-2 mb-1 pr-16">
                                <div class="flex items-center gap-1.5 truncate">
                                    <span class="text-[9px] font-bold font-mono px-1.5 py-0.5 rounded" :class="getMethodBadgeColor(rec.method)">{{ rec.method }}</span>
                                    <span class="truncate font-semibold text-zinc-200 text-[11px] group-hover:text-amber-300 transition-colors">{{ rec.name || rec.url }}</span>
                                </div>
                                <span class="px-1.5 py-0.2 rounded font-mono text-[10px] font-bold border shrink-0" :class="getStatusBadgeColor(rec.status)">{{ rec.status || 'ERR' }}</span>
                            </div>
                            <div class="text-[10px] text-zinc-500 font-mono truncate mb-1">
                                {{ rec.url }}
                            </div>
                            <div class="flex items-center justify-between text-[10px] text-zinc-500 font-mono mt-1 pt-1 border-t border-white/5">
                                <span class="flex items-center gap-1">
                                    <span class="inline-flex items-center justify-center shrink-0 w-2.5 h-2.5" v-html="renderIcon('clock', 'w-2.5 h-2.5')"></span>
                                    {{ formatTime(rec.executedAt) }}
                                </span>
                                <span class="text-zinc-400 font-semibold">{{ rec.time ? rec.time + 'ms' : '--' }}</span>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Tab 3: Environments Content -->
                <div v-show="sidebarTab === 'environments'" class="flex-1 flex flex-col overflow-hidden">
                    <div class="p-2 border-b border-white/10 flex items-center justify-between text-xs text-zinc-400 bg-[#0a0c12]/50">
                        <span class="font-semibold uppercase tracking-wider text-[10px]">Environments</span>
                        <button @click="openModal('envModal')" class="p-1 hover:bg-white/10 text-zinc-400 hover:text-white rounded" title="Manage Environments">
                            <span class="inline-flex items-center justify-center shrink-0 w-4 h-4" v-html="renderIcon('plus', 'w-4 h-4')"></span>
                        </button>
                    </div>
                    <div class="flex-1 overflow-y-auto p-2 space-y-1.5">
                        <div v-for="env in environments" :key="env.id" @click="activeEnvId = env.id"
                            class="p-2.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between text-xs"
                            :class="activeEnvId === env.id ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-200' : 'bg-[#11141e] border-white/10 text-zinc-300 hover:bg-white/5'">
                            <div class="flex items-center gap-2">
                                <span class="w-2 h-2 rounded-full" :class="activeEnvId === env.id ? 'bg-emerald-400 shadow-sm shadow-emerald-400/50' : 'bg-zinc-600'"></span>
                                <span class="font-semibold">{{ env.name }}</span>
                            </div>
                            <div class="flex items-center gap-2">
                                <span class="text-[10px] px-1.5 py-0.2 rounded bg-white/10 font-mono text-zinc-400">{{ (env.variables || []).length }} vars</span>
                                <span v-if="activeEnvId === env.id" class="text-emerald-400 font-bold">Active</span>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Tab 4: Team Activity Log Content -->
                <div v-show="sidebarTab === 'activity'" class="flex-1 flex flex-col overflow-hidden">
                    <div class="p-2 border-b border-white/10 flex items-center justify-between text-xs text-zinc-400 bg-[#0a0c12]/50">
                        <span class="font-semibold uppercase tracking-wider text-[10px]">Team Audit Logs</span>
                        <span class="text-[10px] text-zinc-500 font-mono">Real-time</span>
                    </div>
                    <div class="flex-1 overflow-y-auto p-2 space-y-2">
                        <div v-for="(act, idx) in activityLogs" :key="idx" class="p-2 rounded-lg bg-[#11141e] border border-white/10 text-xs space-y-1">
                            <div class="flex items-center justify-between text-zinc-400 text-[10.5px]">
                                <span class="font-semibold text-orange-400">{{ act.user }}</span>
                                <span class="text-zinc-500 font-mono">{{ act.timestamp }}</span>
                            </div>
                            <div class="text-zinc-200 font-medium text-[11px]">{{ act.action }}</div>
                            <div class="text-[10px] text-zinc-400 truncate font-mono">{{ act.target }}</div>
                        </div>
                    </div>
                </div>
            </aside>

            <!-- Center Stage: Tabs & Active Viewport Matching React -->
            <main class="flex-1 flex flex-col bg-[#11141e] overflow-hidden">
                <!-- Multi-Tab Switcher Bar (Matching React TabsBar) -->
                <div class="flex items-center justify-between border-b border-white/10 bg-[#0d0f17] px-2 select-none shrink-0 h-10 gap-2">
                    <div class="flex items-center gap-1 overflow-x-auto no-scrollbar h-full pr-2 flex-1 min-w-0">
                        <!-- Toggle Sidebar button if collapsed -->
                        <button v-if="!isSidebarOpen" @click="isSidebarOpen = true" class="p-1 hover:bg-white/10 text-zinc-400 hover:text-white rounded-lg text-xs mr-1 shrink-0" title="Expand Sidebar (Ctrl+\\)">
                            <span class="inline-flex items-center justify-center shrink-0 w-4 h-4 text-orange-400" v-html="renderIcon('sidebar', 'w-4 h-4 text-orange-400')"></span>
                        </button>

                        <div v-for="tab in tabs" :key="tab.id" @click="activeTabId = tab.id"
                            @mouseenter="hoveredTabId = tab.id" @mouseleave="hoveredTabId = null" class="tab-item group flex items-center gap-1.5 px-2.5 h-8 rounded-t-lg border-t border-x cursor-pointer text-xs font-medium transition-all shrink-0 max-w-[240px]"
                            :class="activeTabId === tab.id ? 'is-active bg-[#151926] border-white/15 text-white shadow-sm' : 'bg-[#0a0c12] border-transparent text-zinc-400 hover:text-white hover:bg-white/5'">
                            <!-- Request Tab Badge -->
                            <span v-if="!tab.type || tab.type === 'request'" class="text-[9px] font-bold font-mono px-1 rounded" :class="getMethodBadgeColor(tab.request ? tab.request.method : 'GET')">{{ tab.request ? tab.request.method : 'GET' }}</span>
                            <!-- Architecture Tab Icon -->
                            <span v-else-if="tab.type === 'architecture'" class="inline-flex items-center justify-center shrink-0 w-3.5 h-3.5 text-orange-400" v-html="renderIcon('layers', 'w-3.5 h-3.5 text-orange-400')"></span>
                            <!-- SaaS Users Tab Icon -->
                            <span v-else-if="tab.type === 'saas_users'" class="inline-flex items-center justify-center shrink-0 w-3.5 h-3.5 text-indigo-400" v-html="renderIcon('users', 'w-3.5 h-3.5 text-indigo-400')"></span>
                            <!-- SaaS Reports Tab Icon -->
                            <span v-else-if="tab.type === 'saas_reports'" class="inline-flex items-center justify-center shrink-0 w-3.5 h-3.5 text-purple-400" v-html="renderIcon('trending-up', 'w-3.5 h-3.5 text-purple-400')"></span>
                            <!-- Register Tab Icon -->
                            <span v-else-if="tab.type === 'register'" class="inline-flex items-center justify-center shrink-0 w-3.5 h-3.5 text-emerald-400" v-html="renderIcon('user-plus', 'w-3.5 h-3.5 text-emerald-400')"></span>
                            <!-- Runner Tab Icon -->
                            <span v-else-if="tab.type === 'collection_runner'" class="inline-flex items-center justify-center shrink-0 w-3.5 h-3.5 text-amber-400" v-html="renderIcon('play', 'w-3.5 h-3.5 text-amber-400')"></span>
                            <!-- Diagnostic Tab Icon -->
                            <span v-else-if="tab.type === 'diagnostic'" class="inline-flex items-center justify-center shrink-0 w-3.5 h-3.5 text-amber-400" v-html="renderIcon('shield-alert', 'w-3.5 h-3.5 text-amber-400')"></span>
                            <!-- WebSocket Tab Icon -->
                            <span v-else-if="tab.type === 'websocket'" class="inline-flex items-center justify-center shrink-0 w-3.5 h-3.5 text-emerald-400" v-html="renderIcon('radio', 'w-3.5 h-3.5 text-emerald-400')"></span>
                            <!-- Mock Server Tab Icon -->
                            <span v-else-if="tab.type === 'mock_server'" class="inline-flex items-center justify-center shrink-0 w-3.5 h-3.5 text-amber-400" v-html="renderIcon('server', 'w-3.5 h-3.5 text-amber-400')"></span>
                            <!-- GraphQL Tab Icon -->
                            <span v-else-if="tab.type === 'graphql'" class="inline-flex items-center justify-center shrink-0 w-3.5 h-3.5 text-pink-400" v-html="renderIcon('code-2', 'w-3.5 h-3.5 text-pink-400')"></span>
                            <!-- Monitor Tab Icon -->
                            <span v-else-if="tab.type === 'monitor'" class="inline-flex items-center justify-center shrink-0 w-3.5 h-3.5 text-teal-400" v-html="renderIcon('activity', 'w-3.5 h-3.5 text-teal-400')"></span>

                            <span class="truncate text-[11px]">{{ tab.title }}</span>

                            <!-- Background Execution Status Indicator -->
                            <span v-if="(!tab.type || tab.type === 'request') && tab.isLoading" class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30 shrink-0 animate-pulse" title="Executing in background...">
                                <span class="inline-flex items-center justify-center shrink-0 w-2.5 h-2.5 animate-spin" v-html="renderIcon('loader-2', 'w-2.5 h-2.5 animate-spin text-amber-400')"></span>
                                <span>RUN</span>
                            </span>

                            <!-- Visual indicator showing status code of last execution (e.g. green 200, red 404) -->
                            <span v-else-if="(!tab.type || tab.type === 'request') && getTabStatusCode(tab) !== undefined && getTabStatusStyle(getTabStatusCode(tab))" class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-mono font-bold border shrink-0 transition-colors" :class="getTabStatusStyle(getTabStatusCode(tab)).container" :title="'Last execution: ' + getTabStatusCode(tab) + ' ' + getTabStatusText(tab)">
                                <span class="w-1.5 h-1.5 rounded-full shrink-0" :class="getTabStatusStyle(getTabStatusCode(tab)).dot"></span>
                                <span>{{ getTabStatusStyle(getTabStatusCode(tab)).text }}</span>
                            </span>

                            <button @click.stop="closeTab(tab.id)" class="tab-close-btn p-0.5 text-zinc-500 hover:text-zinc-200 rounded transition-opacity ml-0.5" :style="hoveredTabId === tab.id ? 'opacity: 1; visibility: visible; pointer-events: auto;' : 'opacity: 0; visibility: hidden; pointer-events: none;'" title="Close Tab">
                                <span class="inline-flex items-center justify-center shrink-0 w-3 h-3" v-html="renderIcon('x', 'w-3 h-3')"></span>
                            </button>
                        </div>

                        <!-- New Request Button -->
                        <button @click="createNewBlankTab()" class="p-1 hover:bg-white/10 text-zinc-400 hover:text-white rounded-lg text-xs ml-1" title="New Request Tab">
                            <span class="inline-flex items-center justify-center shrink-0 w-4 h-4" v-html="renderIcon('plus', 'w-4 h-4')"></span>
                        </button>
                    </div>

                    <!-- Layout Mode Switcher & Tools Dropdown for small screens (Responsive & Desktop) -->
                    <div class="flex items-center gap-1.5 shrink-0 pl-1">
                        <!-- Layout Mode (Columns vs Rows) -->
                        <button type="button" @click="toggleLayoutMode()" :class="['px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 border transition-all cursor-pointer select-none active:scale-95', layoutMode === 'columns' ? 'bg-orange-500/15 border-orange-500/30 text-orange-300' : 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300']" :title="layoutMode === 'columns' ? 'Side-by-Side view active: Click to switch to Stacked View (Rows)' : 'Stacked view active: Click to switch to Side-by-Side View (Columns)'">
                            <span class="inline-flex items-center justify-center shrink-0 w-3.5 h-3.5" :class="layoutMode === 'columns' ? 'text-orange-400' : 'text-emerald-400'" v-html="renderIcon(layoutMode === 'columns' ? 'columns' : 'rows', 'w-3.5 h-3.5')"></span>
                            <span class="text-[11px]">{{ layoutMode === 'columns' ? 'Side-by-Side' : 'Stacked' }}</span>
                        </button>

                        <!-- Tools Dropdown (Accessible on all screen sizes!) -->
                        <div class="relative">
                            <button type="button" @click="showToolsDropdown = !showToolsDropdown" id="php-tools-btn" class="px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 text-orange-300 hover:text-white bg-orange-500/10 hover:bg-orange-500/20 border border-orange-500/30 transition-colors cursor-pointer" title="Platform & Studio Tools">
                                <span class="inline-flex items-center justify-center shrink-0 w-3.5 h-3.5 text-orange-400" v-html="renderIcon('sparkles', 'w-3.5 h-3.5 text-orange-400')"></span>
                                <span class="text-[11px] whitespace-nowrap font-semibold">Tools</span>
                                <span class="inline-flex items-center justify-center shrink-0 w-3 h-3 text-orange-400/80" v-html="renderIcon('chevron-down', 'w-3 h-3 text-orange-400/80')"></span>
                            </button>
                            <div v-if="showToolsDropdown" @click.outside="showToolsDropdown = false" class="absolute right-0 mt-1 w-60 max-h-[80vh] overflow-y-auto bg-[#151926] border border-white/10 rounded-xl shadow-2xl z-50 p-2 space-y-1">
                                <div class="px-2 py-1 text-[10px] font-bold text-orange-400/90 uppercase tracking-wider flex items-center justify-between border-b border-white/5 pb-1 mb-1">
                                    <span>Tools & Protocols</span>
                                    <span class="text-[9px] font-mono text-zinc-400">Suite</span>
                                </div>

                                <!-- Register & Restore Quick Actions -->
                                <button type="button" @click="openRegisterTab(); showToolsDropdown = false" id="php-tools-register-btn" class="w-full flex items-center justify-between p-2 rounded-lg bg-gradient-to-r from-amber-500/15 to-orange-500/15 hover:from-amber-500/25 hover:to-orange-500/25 text-amber-200 hover:text-white border border-amber-500/30 text-xs font-semibold transition-colors">
                                    <div class="flex items-center gap-2">
                                        <span class="inline-flex items-center justify-center shrink-0 w-3.5 h-3.5 text-amber-400" v-html="renderIcon('user-plus', 'w-3.5 h-3.5 text-amber-400')"></span>
                                        <span>Register Account</span>
                                    </div>
                                    <span class="text-[9px] font-mono bg-amber-500/20 text-amber-300 px-1.5 py-0.2 rounded border border-amber-500/30">Free</span>
                                </button>

                                <button type="button" @click="openModal('importExportModal'); showToolsDropdown = false" id="php-tools-restore-btn" class="w-full flex items-center justify-between p-2 rounded-lg text-emerald-300 hover:text-white hover:bg-emerald-500/10 text-xs font-semibold transition-colors">
                                    <div class="flex items-center gap-2">
                                        <span class="inline-flex items-center justify-center shrink-0 w-3.5 h-3.5 text-emerald-400" v-html="renderIcon('rotate-ccw', 'w-3.5 h-3.5 text-emerald-400')"></span>
                                        <span>Restore / Import Data</span>
                                    </div>
                                    <span class="text-[9px] font-mono text-zinc-400">JSON/Zip</span>
                                </button>

                                <button type="button" @click="requestGuestResetConfirmation(); showToolsDropdown = false" id="php-tools-guest-btn" class="w-full flex items-center gap-2 p-2 rounded-lg text-zinc-300 hover:text-amber-300 hover:bg-amber-500/10 text-xs transition-colors">
                                    <span class="inline-flex items-center justify-center shrink-0 w-3.5 h-3.5 text-amber-400" v-html="renderIcon('shield-alert', 'w-3.5 h-3.5 text-amber-400')"></span>
                                    <span>Change Guest User...</span>
                                </button>

                                <div class="pt-1 border-t border-white/5 my-1">
                                    <div class="px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-zinc-500">
                                        Protocols & Testing
                                    </div>
                                </div>
                                <button type="button" @click="openCollectionRunnerTab(); showToolsDropdown = false" class="w-full flex items-center gap-2 p-1.5 rounded-lg hover:bg-white/5 text-xs text-orange-300 hover:text-white transition-colors">
                                    <span class="inline-flex items-center justify-center shrink-0 w-3.5 h-3.5 text-orange-400" v-html="renderIcon('play', 'w-3.5 h-3.5')"></span>
                                    <span>Collection Runner & Tests</span>
                                </button>
                                <button type="button" @click="openWebSocketTab(); showToolsDropdown = false" class="w-full flex items-center gap-2 p-1.5 rounded-lg hover:bg-white/5 text-xs text-zinc-300 hover:text-white transition-colors">
                                    <span class="inline-flex items-center justify-center shrink-0 w-3.5 h-3.5 text-emerald-400" v-html="renderIcon('radio', 'w-3.5 h-3.5')"></span>
                                    <span>WebSocket Tester</span>
                                </button>
                                <button type="button" @click="openMockServerTab(); showToolsDropdown = false" class="w-full flex items-center gap-2 p-1.5 rounded-lg hover:bg-white/5 text-xs text-zinc-300 hover:text-white transition-colors">
                                    <span class="inline-flex items-center justify-center shrink-0 w-3.5 h-3.5 text-amber-400" v-html="renderIcon('server', 'w-3.5 h-3.5')"></span>
                                    <span>Mock Server Engine</span>
                                </button>
                                <button type="button" @click="openGraphQLTab(); showToolsDropdown = false" class="w-full flex items-center gap-2 p-1.5 rounded-lg hover:bg-white/5 text-xs text-zinc-300 hover:text-white transition-colors">
                                    <span class="inline-flex items-center justify-center shrink-0 w-3.5 h-3.5 text-pink-400" v-html="renderIcon('code-2', 'w-3.5 h-3.5')"></span>
                                    <span>GraphQL Explorer</span>
                                </button>
                                <button type="button" @click="openMonitorTab(); showToolsDropdown = false" class="w-full flex items-center gap-2 p-1.5 rounded-lg hover:bg-white/5 text-xs text-zinc-300 hover:text-white transition-colors">
                                    <span class="inline-flex items-center justify-center shrink-0 w-3.5 h-3.5 text-teal-400" v-html="renderIcon('activity', 'w-3.5 h-3.5')"></span>
                                    <span>Monitors & Health</span>
                                </button>

                                <div class="pt-1 border-t border-white/5 my-1">
                                    <div class="px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-zinc-500">
                                        Enterprise & Platform
                                    </div>
                                </div>
                                <button type="button" @click="openArchitectureTab(); showToolsDropdown = false" class="w-full flex items-center gap-2 p-1.5 rounded-lg hover:bg-white/5 text-xs text-orange-300 hover:text-orange-200 transition-colors">
                                    <span class="inline-flex items-center justify-center shrink-0 w-3.5 h-3.5 text-orange-400" v-html="renderIcon('layers', 'w-3.5 h-3.5')"></span>
                                    <span>Architecture & DB</span>
                                </button>
                                <button type="button" @click="openSaaSUsersTab(); showToolsDropdown = false" class="w-full flex items-center gap-2 p-1.5 rounded-lg hover:bg-white/5 text-xs text-zinc-300 hover:text-white transition-colors">
                                    <span class="inline-flex items-center justify-center shrink-0 w-3.5 h-3.5 text-indigo-400" v-html="renderIcon('users', 'w-3.5 h-3.5')"></span>
                                    <span>SaaS Customers</span>
                                </button>
                                <button type="button" @click="openSaaSReportsTab(); showToolsDropdown = false" class="w-full flex items-center gap-2 p-1.5 rounded-lg hover:bg-white/5 text-xs text-zinc-300 hover:text-white transition-colors">
                                    <span class="inline-flex items-center justify-center shrink-0 w-3.5 h-3.5 text-purple-400" v-html="renderIcon('trending-up', 'w-3.5 h-3.5')"></span>
                                    <span>Financial Reports</span>
                                </button>
                                <button type="button" @click="openDiagnosticTab(); showToolsDropdown = false" class="w-full flex items-center gap-2 p-1.5 rounded-lg hover:bg-white/5 text-xs text-zinc-300 hover:text-white transition-colors">
                                    <span class="inline-flex items-center justify-center shrink-0 w-3.5 h-3.5 text-amber-400" v-html="renderIcon('shield-alert', 'w-3.5 h-3.5')"></span>
                                    <span>System Diagnostics</span>
                                </button>
                                <button type="button" @click="openGraphQLTab(); showToolsDropdown = false" class="w-full flex items-center gap-2 p-1.5 rounded-lg hover:bg-white/5 text-xs text-zinc-300 hover:text-white transition-colors">
                                    <span class="inline-flex items-center justify-center shrink-0 w-3.5 h-3.5 text-pink-400" v-html="renderIcon('code-2', 'w-3.5 h-3.5')"></span>
                                    <span>GraphQL Explorer</span>
                                </button>
                                <button type="button" @click="openMonitorTab(); showToolsDropdown = false" class="w-full flex items-center gap-2 p-1.5 rounded-lg hover:bg-white/5 text-xs text-zinc-300 hover:text-white transition-colors">
                                    <span class="inline-flex items-center justify-center shrink-0 w-3.5 h-3.5 text-teal-400" v-html="renderIcon('activity', 'w-3.5 h-3.5')"></span>
                                    <span>Collection Monitors</span>
                                </button>
                            </div>
                        </div>

                        <!-- Right Quick Tab Shortcuts (Matching React on large screens) -->
                        <div class="hidden xl:flex items-center gap-1 shrink-0">
                            <button v-if="isSaaSAdmin" @click="openArchitectureTab()" class="px-2 py-1 rounded text-[11px] font-medium transition-colors flex items-center gap-1.5"
                                :class="activeTab && activeTab.type === 'architecture' ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30' : 'text-zinc-400 hover:text-white hover:bg-white/5'">
                                <span class="inline-flex items-center justify-center shrink-0 w-3 h-3 text-orange-400" v-html="renderIcon('layers', 'w-3 h-3 text-orange-400')"></span>
                                <span>Architecture</span>
                            </button>
                            <button @click="openSaaSUsersTab()" class="px-2 py-1 rounded text-[11px] font-medium transition-colors flex items-center gap-1.5"
                                :class="activeTab && activeTab.type === 'saas_users' ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30' : 'text-zinc-400 hover:text-white hover:bg-white/5'">
                                <span class="inline-flex items-center justify-center shrink-0 w-3 h-3 text-indigo-400" v-html="renderIcon('users', 'w-3 h-3 text-indigo-400')"></span>
                                <span>SaaS Users</span>
                            </button>
                            <button @click="openSaaSReportsTab()" class="px-2 py-1 rounded text-[11px] font-medium transition-colors flex items-center gap-1.5"
                                :class="activeTab && activeTab.type === 'saas_reports' ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30' : 'text-zinc-400 hover:text-white hover:bg-white/5'">
                                <span class="inline-flex items-center justify-center shrink-0 w-3 h-3 text-purple-400" v-html="renderIcon('trending-up', 'w-3 h-3 text-purple-400')"></span>
                                <span>Financials</span>
                            </button>
                            <button @click="openCollectionRunnerTab()" class="px-2 py-1 rounded text-[11px] font-medium transition-colors flex items-center gap-1.5"
                                :class="activeTab && activeTab.type === 'collection_runner' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' : 'text-zinc-400 hover:text-white hover:bg-white/5'">
                                <span class="inline-flex items-center justify-center shrink-0 w-3 h-3 text-amber-400" v-html="renderIcon('play', 'w-3 h-3 text-amber-400')"></span>
                                <span>Runner</span>
                            </button>
                            <button @click="openDiagnosticTab()" class="px-2 py-1 rounded text-[11px] font-medium transition-colors flex items-center gap-1.5"
                                :class="activeTab && activeTab.type === 'diagnostic' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' : 'text-zinc-400 hover:text-white hover:bg-white/5'" title="System Diagnostics">
                                <span class="inline-flex items-center justify-center shrink-0 w-3 h-3 text-amber-400" v-html="renderIcon('shield-alert', 'w-3 h-3 text-amber-400')"></span>
                                <span class="hidden 2xl:inline">Diagnostics</span>
                            </button>
                            <button @click="openWebSocketTab()" class="px-2 py-1 rounded text-[11px] font-medium transition-colors flex items-center gap-1.5"
                                :class="activeTab && activeTab.type === 'websocket' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'text-zinc-400 hover:text-white hover:bg-white/5'" title="WebSocket Realtime Tester">
                                <span class="inline-flex items-center justify-center shrink-0 w-3 h-3 text-emerald-400" v-html="renderIcon('radio', 'w-3 h-3 text-emerald-400')"></span>
                                <span class="hidden 2xl:inline">WebSocket</span>
                            </button>
                            <button @click="openMockServerTab()" class="px-2 py-1 rounded text-[11px] font-medium transition-colors flex items-center gap-1.5"
                                :class="activeTab && activeTab.type === 'mock_server' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' : 'text-zinc-400 hover:text-white hover:bg-white/5'" title="Mock Server Engine">
                                <span class="inline-flex items-center justify-center shrink-0 w-3 h-3 text-amber-400" v-html="renderIcon('server', 'w-3 h-3 text-amber-400')"></span>
                                <span class="hidden 2xl:inline">Mock Server</span>
                            </button>
                            <button @click="openGraphQLTab()" class="px-2 py-1 rounded text-[11px] font-medium transition-colors flex items-center gap-1.5"
                                :class="activeTab && activeTab.type === 'graphql' ? 'bg-pink-500/20 text-pink-400 border border-pink-500/30' : 'text-zinc-400 hover:text-white hover:bg-white/5'" title="GraphQL Explorer">
                                <span class="inline-flex items-center justify-center shrink-0 w-3 h-3 text-pink-400" v-html="renderIcon('code-2', 'w-3 h-3 text-pink-400')"></span>
                                <span class="hidden 2xl:inline">GraphQL</span>
                            </button>
                            <button @click="openMonitorTab()" class="px-2 py-1 rounded text-[11px] font-medium transition-colors flex items-center gap-1.5"
                                :class="activeTab && activeTab.type === 'monitor' ? 'bg-teal-500/20 text-teal-400 border border-teal-500/30' : 'text-zinc-400 hover:text-white hover:bg-white/5'" title="Collection Monitors">
                                <span class="inline-flex items-center justify-center shrink-0 w-3 h-3 text-teal-400" v-html="renderIcon('activity', 'w-3 h-3 text-teal-400')"></span>
                                <span class="hidden 2xl:inline">Monitors</span>
                            </button>
                        </div>
                    </div>
                </div>

                <!-- VIEW 1: Architecture & Schema View (Matching ArchitectureAndSchemaView.tsx) -->
                <div v-if="activeTab && activeTab.type === 'architecture'" class="flex-1 flex flex-col min-h-0 overflow-hidden bg-[#0b0d13] text-[#e1e4ea]">
                    <div v-if="!isSaaSAdmin" class="flex-1 flex flex-col items-center justify-center p-8 text-center bg-[#0e121e]">
                        <div class="w-12 h-12 rounded-2xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-orange-400 mb-4">
                            <span class="inline-flex items-center justify-center shrink-0 w-6 h-6" v-html="renderIcon('shield-alert', 'w-6 h-6')"></span>
                        </div>
                        <h3 class="text-base font-bold text-white mb-1">Restricted Access</h3>
                        <p class="text-xs text-zinc-400 max-w-sm">
                            System Architecture & Database blueprints are only accessible to SaaS Platform Administrators.
                        </p>
                    </div>
                    <div v-else class="flex-1 flex flex-col min-h-0 overflow-hidden">
                        <!-- Architecture Header -->
                    <div class="p-4 sm:p-6 border-b border-white/10 bg-[#121622]/80 backdrop-blur sticky top-0 z-20 shrink-0">
                        <div class="max-w-6xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div>
                                <div class="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-orange-400 mb-1">
                                    <span class="inline-flex items-center justify-center shrink-0 w-4 h-4" v-html="renderIcon('layers', 'w-4 h-4')"></span>
                                    <span>Full-Stack System Architecture & Database Blueprint</span>
                                </div>
                                <h1 class="text-xl sm:text-2xl font-bold tracking-tight text-white">
                                    Collaborative Postman Platform Engineering Blueprint
                                </h1>
                                <p class="text-xs text-zinc-400 mt-1">
                                    Complete technical specification for Workspaces, RBAC permissions, real-time collaboration, and PostgreSQL/MySQL Prisma models.
                                </p>
                            </div>

                            <!-- Sub Navigation Tabs -->
                            <div class="flex items-center gap-1 bg-[#1a1f2e] p-1 rounded-lg border border-white/10 text-xs shrink-0 flex-wrap">
                                <button @click="archSubTab = 'architecture'"
                                    class="px-3 py-1.5 rounded-md font-medium transition-all"
                                    :class="archSubTab === 'architecture' ? 'bg-orange-500 text-white shadow-sm font-bold' : 'text-zinc-400 hover:text-white hover:bg-white/5'">
                                    System Architecture
                                </button>
                                <button @click="archSubTab = 'schema'"
                                    class="px-3 py-1.5 rounded-md font-medium transition-all"
                                    :class="archSubTab === 'schema' ? 'bg-orange-500 text-white shadow-sm font-bold' : 'text-zinc-400 hover:text-white hover:bg-white/5'">
                                    Database Schema
                                </button>
                                <button @click="archSubTab = 'roadmap'"
                                    class="px-3 py-1.5 rounded-md font-medium transition-all"
                                    :class="archSubTab === 'roadmap' ? 'bg-orange-500 text-white shadow-sm font-bold' : 'text-zinc-400 hover:text-white hover:bg-white/5'">
                                    Workspaces & RBAC
                                </button>
                                <button @click="archSubTab = 'api_contracts'"
                                    class="px-3 py-1.5 rounded-md font-medium transition-all"
                                    :class="archSubTab === 'api_contracts' ? 'bg-orange-500 text-white shadow-sm font-bold' : 'text-zinc-400 hover:text-white hover:bg-white/5'">
                                    REST Contracts
                                </button>
                            </div>
                        </div>
                    </div>

                    <!-- Subtab Content Scrollable Area -->
                    <div class="flex-1 overflow-y-auto p-4 sm:p-6">
                        <!-- Subtab 1: System Architecture -->
                        <div v-if="archSubTab === 'architecture'" class="max-w-6xl mx-auto space-y-6">
                            <div class="bg-[#141824] border border-white/10 rounded-xl p-6 shadow-xl space-y-4">
                                <h2 class="text-base font-bold text-white flex items-center gap-2">
                                    <span class="inline-flex items-center justify-center shrink-0 w-5 h-5 text-orange-400" v-html="renderIcon('server', 'w-5 h-5 text-orange-400')"></span>
                                    <span>High-Level Decoupled Architecture</span>
                                </h2>
                                <p class="text-xs text-zinc-300 leading-relaxed">
                                    The platform is engineered with a modern decoupled full-stack architecture. Client instances communicate with a Node.js / PHP backend for workspace data management, authorization checks, and real-time WebSocket syncing for presence and live multi-user editing.
                                </p>

                                <div class="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
                                    <div class="bg-[#1a2030] p-4 rounded-lg border border-white/10 flex flex-col justify-between">
                                        <div>
                                            <div class="font-bold text-white mb-1 flex items-center gap-1.5">
                                                <span class="inline-flex items-center justify-center shrink-0 w-4 h-4 text-blue-400" v-html="renderIcon('radio', 'w-4 h-4 text-blue-400')"></span> Client Layer
                                            </div>
                                            <p class="text-zinc-400 text-[11px] leading-normal">
                                                React / Vue Single-Page App with offline-first IndexedDB and local state synchronization.
                                            </p>
                                        </div>
                                        <div class="mt-3 text-[10px] text-zinc-500 font-mono">React 18 / Vue 3 CDN</div>
                                    </div>
                                    <div class="bg-[#1a2030] p-4 rounded-lg border border-white/10 flex flex-col justify-between">
                                        <div>
                                            <div class="font-bold text-white mb-1 flex items-center gap-1.5">
                                                <span class="inline-flex items-center justify-center shrink-0 w-4 h-4 text-amber-400" v-html="renderIcon('zap', 'w-4 h-4 text-amber-400')"></span> API Gateway
                                            </div>
                                            <p class="text-zinc-400 text-[11px] leading-normal">
                                                Handles JWT Auth, RBAC policy enforcement, and CORS proxy routing to external endpoints.
                                            </p>
                                        </div>
                                        <div class="mt-3 text-[10px] text-zinc-500 font-mono">Express / PHP FastCGI</div>
                                    </div>
                                    <div class="bg-[#1a2030] p-4 rounded-lg border border-white/10 flex flex-col justify-between">
                                        <div>
                                            <div class="font-bold text-white mb-1 flex items-center gap-1.5">
                                                <span class="inline-flex items-center justify-center shrink-0 w-4 h-4 text-purple-400" v-html="renderIcon('share-2', 'w-4 h-4 text-purple-400')"></span> Real-time Sync
                                            </div>
                                            <p class="text-zinc-400 text-[11px] leading-normal">
                                                WebSockets & SSE broker collection changes and presence status across team members.
                                            </p>
                                        </div>
                                        <div class="mt-3 text-[10px] text-zinc-500 font-mono">Socket.io / PubSub</div>
                                    </div>
                                    <div class="bg-[#1a2030] p-4 rounded-lg border border-white/10 flex flex-col justify-between">
                                        <div>
                                            <div class="font-bold text-white mb-1 flex items-center gap-1.5">
                                                <span class="inline-flex items-center justify-center shrink-0 w-4 h-4 text-emerald-400" v-html="renderIcon('database', 'w-4 h-4 text-emerald-400')"></span> Storage Engine
                                            </div>
                                            <p class="text-zinc-400 text-[11px] leading-normal">
                                                Relational PostgreSQL / MySQL with Prisma ORM and JSONB fields for headers, params, and auth configs.
                                            </p>
                                        </div>
                                        <div class="mt-3 text-[10px] text-zinc-500 font-mono">PostgreSQL / MySQL 8.0</div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- Subtab 2: Database Schema (Prisma/SQL) -->
                        <div v-if="archSubTab === 'schema'" class="max-w-6xl mx-auto space-y-6">
                            <div class="flex items-center justify-between bg-[#141824] border border-white/10 rounded-xl p-4">
                                <div>
                                    <h3 class="text-sm font-bold text-white">Production MySQL / PostgreSQL Schema DDL</h3>
                                    <p class="text-xs text-zinc-400">Complete relational schema with indexes, foreign keys, and JSON support.</p>
                                </div>
                                <button @click="copySqlSchema()" class="px-3 py-2 rounded-lg bg-orange-600 hover:bg-orange-500 text-white font-semibold text-xs flex items-center gap-1.5 shadow-lg shadow-orange-500/20">
                                    <span v-if="sqlCopied" class="inline-flex items-center justify-center shrink-0 w-3.5 h-3.5 text-emerald-300" v-html="renderIcon('check', 'w-3.5 h-3.5 text-emerald-300')"></span>
                                    <span v-else class="inline-flex items-center justify-center shrink-0 w-3.5 h-3.5" v-html="renderIcon('copy', 'w-3.5 h-3.5')"></span>
                                    <span>{{ sqlCopied ? 'Copied to Clipboard!' : 'Copy SQL Schema' }}</span>
                                </button>
                            </div>

                            <div class="bg-[#11141e] border border-white/10 rounded-xl p-4 overflow-x-auto font-mono text-xs text-zinc-300 leading-relaxed">
                                <pre><code>-- 1. Users Table
CREATE TABLE cp_users (
    id VARCHAR(64) PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    name VARCHAR(150) NOT NULL,
    password_hash VARCHAR(255),
    avatar_url TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 2. Workspaces
CREATE TABLE cp_workspaces (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    description TEXT,
    type ENUM('PERSONAL', 'TEAM') DEFAULT 'PERSONAL',
    owner_id VARCHAR(64) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_owner (owner_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 3. Collections & Requests
CREATE TABLE cp_collections (
    id VARCHAR(64) PRIMARY KEY,
    workspace_id VARCHAR(64) NOT NULL,
    name VARCHAR(200) NOT NULL,
    description TEXT,
    auth_config JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_ws (workspace_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE cp_requests (
    id VARCHAR(64) PRIMARY KEY,
    collection_id VARCHAR(64) NOT NULL,
    name VARCHAR(200) NOT NULL,
    method VARCHAR(16) NOT NULL DEFAULT 'GET',
    url TEXT NOT NULL,
    headers JSON,
    params JSON,
    body_type VARCHAR(32) DEFAULT 'NONE',
    body_raw MEDIUMTEXT,
    auth_config JSON,
    tests_script TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_col (collection_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;</code></pre>
                            </div>
                        </div>

                        <!-- Subtab 3: Workspaces & RBAC Roadmap -->
                        <div v-if="archSubTab === 'roadmap'" class="max-w-6xl mx-auto space-y-6">
                            <div class="bg-[#141824] border border-white/10 rounded-xl p-6 shadow-xl space-y-4">
                                <h3 class="text-sm font-bold text-white flex items-center gap-2">
                                    <span class="inline-flex items-center justify-center shrink-0 w-4 h-4 text-orange-400" v-html="renderIcon('shield-check', 'w-4 h-4 text-orange-400')"></span>
                                    <span>Role-Based Access Control (RBAC) Matrix</span>
                                </h3>
                                <div class="overflow-x-auto">
                                    <table class="w-full text-xs text-left">
                                        <thead>
                                            <tr class="border-b border-white/10 text-zinc-400">
                                                <th class="py-2.5 px-3">Permission / Capability</th>
                                                <th class="py-2.5 px-3 text-orange-400 font-bold">Admin</th>
                                                <th class="py-2.5 px-3 text-blue-400 font-bold">Editor</th>
                                                <th class="py-2.5 px-3 text-zinc-300 font-bold">Viewer</th>
                                            </tr>
                                        </thead>
                                        <tbody class="divide-y divide-white/5 text-zinc-300">
                                            <tr>
                                                <td class="py-2.5 px-3">Execute Requests & View Responses</td>
                                                <td class="py-2.5 px-3 text-emerald-400 font-bold">✓ Full</td>
                                                <td class="py-2.5 px-3 text-emerald-400 font-bold">✓ Full</td>
                                                <td class="py-2.5 px-3 text-emerald-400 font-bold">✓ Full</td>
                                            </tr>
                                            <tr>
                                                <td class="py-2.5 px-3">Create / Edit Collections & Requests</td>
                                                <td class="py-2.5 px-3 text-emerald-400 font-bold">✓ Full</td>
                                                <td class="py-2.5 px-3 text-emerald-400 font-bold">✓ Full</td>
                                                <td class="py-2.5 px-3 text-rose-400 font-semibold">✗ Read Only</td>
                                            </tr>
                                            <tr>
                                                <td class="py-2.5 px-3">Manage Environment Secrets & Keys</td>
                                                <td class="py-2.5 px-3 text-emerald-400 font-bold">✓ Full</td>
                                                <td class="py-2.5 px-3 text-emerald-400 font-bold">✓ Full</td>
                                                <td class="py-2.5 px-3 text-rose-400 font-semibold">✗ Masked</td>
                                            </tr>
                                            <tr>
                                                <td class="py-2.5 px-3">Invite Team Members & Assign Roles</td>
                                                <td class="py-2.5 px-3 text-emerald-400 font-bold">✓ Full</td>
                                                <td class="py-2.5 px-3 text-rose-400 font-semibold">✗ Denied</td>
                                                <td class="py-2.5 px-3 text-rose-400 font-semibold">✗ Denied</td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>

                        <!-- Subtab 4: REST API Contracts -->
                        <div v-if="archSubTab === 'api_contracts'" class="max-w-6xl mx-auto space-y-4 text-xs">
                            <div class="bg-[#141824] border border-white/10 rounded-xl p-5 space-y-3">
                                <h3 class="text-sm font-bold text-white flex items-center gap-2">
                                    <span class="inline-flex items-center justify-center shrink-0 w-4 h-4 text-emerald-400" v-html="renderIcon('zap', 'w-4 h-4 text-emerald-400')"></span>
                                    <span>Core REST API Endpoint Contracts</span>
                                </h3>
                                <div class="space-y-2">
                                    <div class="p-2.5 rounded-lg bg-[#1a2030] border border-white/10 flex items-center justify-between">
                                        <div class="flex items-center gap-2">
                                            <span class="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-bold font-mono">GET</span>
                                            <span class="font-mono text-zinc-200">/api/v1/workspaces</span>
                                        </div>
                                        <span class="text-zinc-400 text-[11px]">List accessible workspaces for user</span>
                                    </div>
                                    <div class="p-2.5 rounded-lg bg-[#1a2030] border border-white/10 flex items-center justify-between">
                                        <div class="flex items-center gap-2">
                                            <span class="px-2 py-0.5 rounded bg-orange-500/20 text-orange-400 font-bold font-mono">POST</span>
                                            <span class="font-mono text-zinc-200">/api/v1/collections</span>
                                        </div>
                                        <span class="text-zinc-400 text-[11px]">Create new collection in workspace</span>
                                    </div>
                                    <div class="p-2.5 rounded-lg bg-[#1a2030] border border-white/10 flex items-center justify-between">
                                        <div class="flex items-center gap-2">
                                            <span class="px-2 py-0.5 rounded bg-orange-500/20 text-orange-400 font-bold font-mono">POST</span>
                                            <span class="font-mono text-zinc-200">/api/v1/execute</span>
                                        </div>
                                        <span class="text-zinc-400 text-[11px]">Server-side proxy execution for CORS requests</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    </div>
                </div>

                <!-- VIEW 2: SaaS User Dashboard (Matching React SaaSUserDashboard.tsx) -->
                <div v-else-if="activeTab && activeTab.type === 'saas_users'" class="flex-1 flex flex-col min-h-0 overflow-hidden bg-[#0a0c14] text-zinc-200">
                    <div class="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
                        <!-- SaaS User Verified Profile Bar -->
                        <div class="p-3.5 rounded-xl bg-gradient-to-r from-orange-500/10 via-purple-500/10 to-indigo-500/10 border border-orange-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs shrink-0">
                            <div class="flex items-center gap-2.5">
                                <div class="w-6 h-6 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
                                    <span class="inline-flex items-center justify-center shrink-0 w-3.5 h-3.5" v-html="renderIcon('check-circle-2', 'w-3.5 h-3.5')"></span>
                                </div>
                                <div>
                                    <span class="font-semibold text-white">SaaS Verified Account: </span>
                                    <span class="text-orange-300 font-bold">{{ currentDemoUser.name }}</span>
                                    <span class="text-zinc-400"> ({{ currentDemoUser.email }})</span>
                                    <span class="ml-2 px-2 py-0.5 rounded-full font-mono text-[10px] font-bold uppercase"
                                        :class="currentDemoUser.plan === 'enterprise' ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30' : (currentDemoUser.plan === 'pro' ? 'bg-orange-500/20 text-orange-300 border border-orange-500/30' : 'bg-zinc-800 text-zinc-400')">
                                        {{ currentDemoUser.plan }}
                                    </span>
                                </div>
                            </div>
                            <div class="flex items-center gap-2">
                                <button @click="openRegisterTab()" class="px-2.5 py-1 bg-white/10 hover:bg-white/15 text-zinc-200 rounded-lg text-xs font-semibold flex items-center gap-1">
                                    <span class="inline-flex items-center justify-center shrink-0 w-3.5 h-3.5" v-html="renderIcon('user-plus', 'w-3.5 h-3.5')"></span>
                                    <span>Register New Account</span>
                                </button>
                                <button @click="openSaaSReportsTab()" class="px-2.5 py-1 bg-orange-600 hover:bg-orange-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1">
                                    <span class="inline-flex items-center justify-center shrink-0 w-3.5 h-3.5" v-html="renderIcon('trending-up', 'w-3.5 h-3.5')"></span>
                                    <span>Financial Reports</span>
                                </button>
                            </div>
                        </div>

                        <!-- 4 KPI Metrics Cards -->
                        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                            <div class="p-4 rounded-xl bg-[#11141e] border border-white/10 flex items-center justify-between">
                                <div>
                                    <div class="text-zinc-400 text-xs font-medium">Total Customers</div>
                                    <div class="text-2xl font-bold text-white mt-1">{{ saasMetrics.totalCustomers }}</div>
                                    <div class="text-[11px] text-emerald-400 font-semibold mt-0.5">100% Active Paying / Free</div>
                                </div>
                                <div class="w-10 h-10 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
                                    <span class="inline-flex items-center justify-center shrink-0 w-5 h-5" v-html="renderIcon('users', 'w-5 h-5')"></span>
                                </div>
                            </div>

                            <div class="p-4 rounded-xl bg-[#11141e] border border-white/10 flex items-center justify-between">
                                <div>
                                    <div class="text-zinc-400 text-xs font-medium">Total MRR</div>
                                    <div class="text-2xl font-bold text-white mt-1">${{ saasMetrics.totalMrr.toLocaleString() }}</div>
                                    <div class="text-[11px] text-emerald-400 font-semibold mt-0.5">+14.2% MoM growth</div>
                                </div>
                                <div class="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                                    <span class="inline-flex items-center justify-center shrink-0 w-5 h-5" v-html="renderIcon('dollar-sign', 'w-5 h-5')"></span>
                                </div>
                            </div>

                            <div class="p-4 rounded-xl bg-[#11141e] border border-white/10 flex items-center justify-between">
                                <div>
                                    <div class="text-zinc-400 text-xs font-medium">Monthly API Requests</div>
                                    <div class="text-2xl font-bold text-white mt-1">{{ (saasMetrics.totalRequests / 1000000).toFixed(1) }}M</div>
                                    <div class="text-[11px] text-orange-400 font-semibold mt-0.5">Metered through Gateway</div>
                                </div>
                                <div class="w-10 h-10 rounded-xl bg-orange-500/20 text-orange-400 flex items-center justify-center">
                                    <span class="inline-flex items-center justify-center shrink-0 w-5 h-5" v-html="renderIcon('activity', 'w-5 h-5')"></span>
                                </div>
                            </div>

                            <div class="p-4 rounded-xl bg-[#11141e] border border-white/10 flex items-center justify-between">
                                <div>
                                    <div class="text-zinc-400 text-xs font-medium">Avg Gross Margin</div>
                                    <div class="text-2xl font-bold text-white mt-1">{{ saasMetrics.grossMarginPercent }}%</div>
                                    <div class="text-[11px] text-emerald-400 font-semibold mt-0.5">Infra Cost ${{ saasMetrics.totalCost.toFixed(2) }}</div>
                                </div>
                                <div class="w-10 h-10 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center">
                                    <span class="inline-flex items-center justify-center shrink-0 w-5 h-5" v-html="renderIcon('trending-up', 'w-5 h-5')"></span>
                                </div>
                            </div>
                        </div>

                        <!-- Filter and Controls Bar -->
                        <div class="p-3 bg-[#11141e] border border-white/10 rounded-xl flex flex-col md:flex-row items-center justify-between gap-3 text-xs">
                            <div class="relative w-full md:w-80">
                                <span class="inline-flex items-center justify-center shrink-0 w-3.5 h-3.5 absolute left-3 top-2.5 pointer-events-none text-zinc-500" v-html="renderIcon('search', 'w-3.5 h-3.5 text-zinc-500')"></span>
                                <input v-model="saasSearch" type="text" placeholder="Search by name, company, email..." class="w-full bg-[#0d0f17] border border-white/10 rounded-lg pl-8 pr-3 py-1.5 text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-orange-500">
                            </div>

                            <div class="flex items-center gap-2 w-full md:w-auto flex-wrap">
                                <select v-model="saasPlanFilter" class="bg-[#0d0f17] border border-white/10 rounded-lg px-2.5 py-1.5 text-zinc-200 text-xs">
                                    <option value="all">All Plans</option>
                                    <option value="enterprise">Enterprise ($199)</option>
                                    <option value="pro">Pro ($29)</option>
                                    <option value="free">Free ($0)</option>
                                </select>

                                <select v-model="saasSortBy" class="bg-[#0d0f17] border border-white/10 rounded-lg px-2.5 py-1.5 text-zinc-200 text-xs">
                                    <option value="mrr">Sort by MRR</option>
                                    <option value="requests">Sort by Requests</option>
                                    <option value="margin">Sort by Margin</option>
                                    <option value="health">Sort by Health</option>
                                </select>

                                <button @click="exportSaaSCsv()" class="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 text-zinc-200 font-semibold flex items-center gap-1">
                                    <span class="inline-flex items-center justify-center shrink-0 w-3.5 h-3.5" v-html="renderIcon('download', 'w-3.5 h-3.5')"></span>
                                    <span>Export CSV</span>
                                </button>
                            </div>
                        </div>

                        <!-- Customer Table -->
                        <div class="bg-[#11141e] border border-white/10 rounded-xl overflow-hidden shadow-xl">
                            <div class="overflow-x-auto">
                                <table class="w-full text-xs text-left">
                                    <thead>
                                        <tr class="border-b border-white/10 bg-[#161a26] text-zinc-400 font-semibold">
                                            <th class="py-3 px-4">Customer & Organization</th>
                                            <th class="py-3 px-4">Plan & Status</th>
                                            <th class="py-3 px-4">MRR</th>
                                            <th class="py-3 px-4">Monthly Quota & Usage</th>
                                            <th class="py-3 px-4">Infra Cost / Margin</th>
                                            <th class="py-3 px-4">Health</th>
                                            <th class="py-3 px-4 text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody class="divide-y divide-white/5 text-zinc-300">
                                        <tr v-for="c in filteredSaaSCustomers" :key="c.id" class="hover:bg-white/5 transition-colors">
                                            <td class="py-3 px-4">
                                                <div class="font-bold text-white text-[13px]">{{ c.name }}</div>
                                                <div class="text-[11px] text-zinc-400">{{ c.companyName }} • {{ c.role }}</div>
                                                <div class="text-[10px] text-zinc-500 font-mono">{{ c.email }}</div>
                                            </td>
                                            <td class="py-3 px-4">
                                                <span class="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase"
                                                    :class="c.plan === 'enterprise' ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30' : (c.plan === 'pro' ? 'bg-orange-500/20 text-orange-300 border border-orange-500/30' : 'bg-zinc-800 text-zinc-400 border border-zinc-700')">
                                                    {{ c.plan }}
                                                </span>
                                            </td>
                                            <td class="py-3 px-4 font-mono font-bold text-white">
                                                ${{ c.monthlyFee.toFixed(2) }}/mo
                                            </td>
                                            <td class="py-3 px-4">
                                                <div class="flex items-center justify-between text-[11px] text-zinc-400 mb-1">
                                                    <span>{{ (c.usage.totalRequests / 1000000).toFixed(2) }}M reqs</span>
                                                    <span>{{ ((c.usage.totalRequests / c.usage.monthlyQuota) * 100).toFixed(0) }}%</span>
                                                </div>
                                                <div class="w-36 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                                                    <div class="h-full bg-orange-500 rounded-full" :style="{ width: Math.min(100, ((c.usage.totalRequests / c.usage.monthlyQuota) * 100)) + '%' }"></div>
                                                </div>
                                            </td>
                                            <td class="py-3 px-4">
                                                <div class="text-[11px] font-mono font-semibold text-emerald-400">+${{ c.netMargin.toFixed(2) }} ({{ c.netMarginPercent }}%)</div>
                                                <div class="text-[10px] text-zinc-500">Cost: ${{ c.costs.totalCost.toFixed(2) }}</div>
                                            </td>
                                            <td class="py-3 px-4">
                                                <div class="flex items-center gap-1.5 font-bold" :class="c.healthScore >= 90 ? 'text-emerald-400' : 'text-amber-400'">
                                                    <span class="w-2 h-2 rounded-full" :class="c.healthScore >= 90 ? 'bg-emerald-400' : 'bg-amber-400'"></span>
                                                    <span>{{ c.healthScore }}/100</span>
                                                </div>
                                            </td>
                                            <td class="py-3 px-4 text-right">
                                                <button @click="selectedCustomer = c"
                                                    class="px-2.5 py-1 rounded bg-white/5 hover:bg-white/15 text-zinc-300 hover:text-white text-[11px] font-semibold transition-colors">
                                                    View Details
                                                </button>
                                            </td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- VIEW 3: SaaS Financial Reports View (Matching React SaaSReportsView.tsx) -->
                <div v-else-if="activeTab && activeTab.type === 'saas_reports'" class="flex-1 flex flex-col min-h-0 overflow-hidden bg-[#0a0c14] text-zinc-200">
                    <div class="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
                        <!-- SaaS User Verified Profile Bar -->
                        <div class="p-3 rounded-xl bg-gradient-to-r from-orange-500/10 via-purple-500/10 to-indigo-500/10 border border-orange-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                            <div class="flex items-center gap-2.5">
                                <div class="w-6 h-6 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
                                    <span class="inline-flex items-center justify-center shrink-0 w-3.5 h-3.5" v-html="renderIcon('check-circle-2', 'w-3.5 h-3.5 text-emerald-400')"></span>
                                </div>
                                <div>
                                    <span class="font-semibold text-white">SaaS Verified Account: </span>
                                    <span class="text-orange-300 font-bold">{{ currentDemoUser ? currentDemoUser.name : 'Verified User' }}</span>
                                    <span class="text-zinc-400"> ({{ currentDemoUser ? currentDemoUser.email : '' }})</span>
                                    <span class="ml-2 px-2 py-0.5 rounded-full font-mono text-[10px] font-bold uppercase bg-purple-500/20 text-purple-300 border border-purple-500/30">
                                        {{ currentDemoUser ? currentDemoUser.plan : 'Enterprise' }} Tier
                                    </span>
                                </div>
                            </div>
                            <div class="flex items-center gap-2">
                                <button @click="openSaaSUsersTab()" class="px-2.5 py-1 bg-white/10 hover:bg-white/15 text-zinc-200 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors">
                                    <span class="inline-flex items-center justify-center shrink-0 w-3.5 h-3.5 text-orange-400" v-html="renderIcon('users', 'w-3.5 h-3.5')"></span>
                                    <span>Manage Customers</span>
                                </button>
                            </div>
                        </div>

                        <!-- Header Banner -->
                        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-5">
                            <div>
                                <div class="flex items-center gap-2.5">
                                    <div class="w-8 h-8 rounded-lg bg-gradient-to-tr from-purple-500 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-purple-500/20">
                                        <span class="inline-flex items-center justify-center shrink-0 w-4 h-4" v-html="renderIcon('file-text', 'w-4 h-4')"></span>
                                    </div>
                                    <h1 class="text-xl font-black text-white">SaaS Revenue & Cost Intelligence Report</h1>
                                    <span class="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30 font-mono font-bold">
                                        Executive Ready
                                    </span>
                                </div>
                                <p class="text-xs text-zinc-400 mt-1">
                                    Audited financial breakdown, infrastructure margins, ARPU, LTV, and cohort economics across all SaaS tiers.
                                </p>
                            </div>
                            <div class="flex items-center gap-2.5 flex-wrap">
                                <!-- Time Range Selector -->
                                <div class="flex items-center gap-1 bg-white/5 p-1 rounded-xl border border-white/10 text-xs">
                                    <span class="inline-flex items-center justify-center shrink-0 w-3.5 h-3.5 text-zinc-400 ml-1.5" v-html="renderIcon('calendar', 'w-3.5 h-3.5 text-zinc-400')"></span>
                                    <button v-for="r in ['7d', '30d', 'q3', 'ytd', 'all']" :key="r" @click="reportRange = r"
                                        class="px-2.5 py-1 rounded-lg text-[11px] font-semibold uppercase transition-colors"
                                        :class="reportRange === r ? 'bg-orange-500 text-white shadow' : 'text-zinc-400 hover:text-white'">
                                        {{ r }}
                                    </button>
                                </div>
                                <button @click="exportFinancialCsv()" class="px-3.5 py-2 bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-200 hover:text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors">
                                    <span class="inline-flex items-center justify-center shrink-0 w-3.5 h-3.5 text-emerald-400" v-html="renderIcon('download', 'w-3.5 h-3.5 text-emerald-400')"></span>
                                    <span>Download CSV</span>
                                </button>
                                <button @click="exportReportsJson()" class="px-3.5 py-2 bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-200 hover:text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors">
                                    <span class="inline-flex items-center justify-center shrink-0 w-3.5 h-3.5 text-blue-400" v-html="renderIcon('file-text', 'w-3.5 h-3.5 text-blue-400')"></span>
                                    <span>Export JSON</span>
                                </button>
                                <button @click="printReport()" class="px-3.5 py-2 bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-200 hover:text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors" title="Print or Save PDF">
                                    <span class="inline-flex items-center justify-center shrink-0 w-3.5 h-3.5 text-amber-400" v-html="renderIcon('printer', 'w-3.5 h-3.5 text-amber-400')"></span>
                                    <span>Print Report</span>
                                </button>
                            </div>
                        </div>

                        <!-- 6 Executive Financial Summary Metric Cards -->
                        <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                            <div class="p-4 rounded-xl bg-[#111422] border border-white/10">
                                <span class="text-[11px] text-zinc-400 block mb-1">Monthly Recurring Revenue</span>
                                <span class="text-2xl font-black text-emerald-400">&#36;{{ (saasMetrics.mrr || 12850).toLocaleString() }}</span>
                                <span class="text-[10px] text-zinc-400 block mt-1">+18.4% vs last quarter</span>
                            </div>
                            <div class="p-4 rounded-xl bg-[#111422] border border-white/10">
                                <span class="text-[11px] text-zinc-400 block mb-1">Annualized Run-Rate (ARR)</span>
                                <span class="text-2xl font-black text-white">&#36;{{ (saasMetrics.arr || 154200).toLocaleString() }}</span>
                                <span class="text-[10px] text-emerald-400 block mt-1 font-semibold">Healthy Trajectory</span>
                            </div>
                            <div class="p-4 rounded-xl bg-[#111422] border border-white/10">
                                <span class="text-[11px] text-zinc-400 block mb-1">Total Infra Cost</span>
                                <span class="text-2xl font-black text-rose-400">&#36;{{ (saasMetrics.infrastructureCost || 782.40).toFixed(2) }}</span>
                                <span class="text-[10px] text-zinc-500 block mt-1">6.1% of Revenue</span>
                            </div>
                            <div class="p-4 rounded-xl bg-[#111422] border border-white/10">
                                <span class="text-[11px] text-zinc-400 block mb-1">Gross Profit Margin</span>
                                <span class="text-2xl font-black text-emerald-400">{{ saasMetrics.grossMarginPercent || 93.9 }}%</span>
                                <span class="text-[10px] text-zinc-400 block mt-1">&#36;{{ ((saasMetrics.mrr || 12850) - (saasMetrics.infrastructureCost || 782.40)).toFixed(2) }} Net MRR</span>
                            </div>
                            <div class="p-4 rounded-xl bg-[#111422] border border-white/10">
                                <span class="text-[11px] text-zinc-400 block mb-1">ARPU (Avg Rev / User)</span>
                                <span class="text-2xl font-black text-purple-300">&#36;{{ saasMetrics.arpu || 53.50 }}</span>
                                <span class="text-[10px] text-zinc-400 block mt-1">Across active accounts</span>
                            </div>
                            <div class="p-4 rounded-xl bg-[#111422] border border-white/10">
                                <span class="text-[11px] text-zinc-400 block mb-1">Estimated LTV</span>
                                <span class="text-2xl font-black text-amber-300">&#36;{{ (saasMetrics.ltv || 2972).toLocaleString() }}</span>
                                <span class="text-[10px] text-zinc-400 block mt-1">1.8% monthly churn</span>
                            </div>
                        </div>

                        <!-- Unit Economics & Cost Efficiency Banner -->
                        <div class="p-5 rounded-2xl bg-gradient-to-r from-[#121629] via-[#161a2f] to-[#121629] border border-white/10 space-y-4 shadow-xl">
                            <div class="flex items-center justify-between">
                                <div class="flex items-center gap-2">
                                    <span class="inline-flex items-center justify-center shrink-0 w-5 h-5 text-orange-400" v-html="renderIcon('zap', 'w-5 h-5 text-orange-400')"></span>
                                    <h3 class="text-sm font-bold text-white">SaaS Unit Economics & Cloud Infrastructure Efficiency</h3>
                                </div>
                                <span class="text-[11px] text-zinc-400 font-mono">Infrastructure Efficiency Score: 94.8/100</span>
                            </div>
                            <div class="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                                <div class="p-3 rounded-xl bg-white/5 border border-white/10 space-y-1">
                                    <span class="text-zinc-400 text-[11px] block">Cost per 10,000 Requests</span>
                                    <span class="text-lg font-bold text-white font-mono">&#36;0.0320</span>
                                    <p class="text-[10px] text-zinc-500">API gateway proxy + SSL overhead</p>
                                </div>
                                <div class="p-3 rounded-xl bg-white/5 border border-white/10 space-y-1">
                                    <span class="text-zinc-400 text-[11px] block">Egress Bandwidth Cost / GB</span>
                                    <span class="text-lg font-bold text-white font-mono">&#36;0.0800</span>
                                    <p class="text-[10px] text-zinc-500">Cloudflare & Fastly CDN routed</p>
                                </div>
                                <div class="p-3 rounded-xl bg-white/5 border border-white/10 space-y-1">
                                    <span class="text-zinc-400 text-[11px] block">Database Storage Cost / GB</span>
                                    <span class="text-lg font-bold text-white font-mono">&#36;0.1500</span>
                                    <p class="text-[10px] text-zinc-500">MySQL multi-region replicated</p>
                                </div>
                                <div class="p-3 rounded-xl bg-white/5 border border-white/10 space-y-1">
                                    <span class="text-zinc-400 text-[11px] block">AI Generation Cost / 1k Tokens</span>
                                    <span class="text-lg font-bold text-white font-mono">&#36;0.0020</span>
                                    <p class="text-[10px] text-zinc-500">Schema parser & test suite auto-gen</p>
                                </div>
                            </div>
                        </div>

                        <!-- 30-Day Customer Activity Heatmap -->
                        <div class="space-y-4 rounded-2xl bg-[#111422] border border-white/10 p-5 shadow-xl">
                            <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-4">
                                <div>
                                    <div class="flex items-center gap-2">
                                        <span class="inline-flex items-center justify-center shrink-0 w-4 h-4 text-orange-400" v-html="renderIcon('activity', 'w-4 h-4 text-orange-400')"></span>
                                        <h3 class="text-sm font-bold text-white uppercase tracking-wider">30-Day Customer API Activity Heatmap</h3>
                                        <span class="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-mono font-bold">
                                            30-Day Cohort Frequency
                                        </span>
                                    </div>
                                    <p class="text-xs text-zinc-400 mt-0.5">High-resolution request volume and compute intensity per customer tenant.</p>
                                </div>
                                <div class="flex items-center gap-2 flex-wrap">
                                    <div class="flex items-center gap-1 bg-white/5 p-1 rounded-xl border border-white/10 text-xs">
                                        <button v-for="p in ['all', 'enterprise', 'pro', 'free']" :key="p" @click="heatmapPlanFilter = p"
                                            class="px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase transition-colors"
                                            :class="heatmapPlanFilter === p ? 'bg-zinc-700 text-white shadow font-bold' : 'text-zinc-400 hover:text-white'">
                                            {{ p }}
                                        </button>
                                    </div>
                                    <div class="relative">
                                        <input v-model="heatmapSearchQuery" type="text" placeholder="Filter customer..." class="bg-[#151926] border border-white/10 rounded-xl px-3 py-1.5 text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-orange-500 w-36 sm:w-44" />
                                    </div>
                                    <button @click="exportHeatmapCsv()" class="px-2.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white text-xs font-semibold flex items-center gap-1 border border-white/10">
                                        <span class="inline-flex items-center justify-center shrink-0 w-3 h-3 text-orange-400" v-html="renderIcon('download', 'w-3 h-3 text-orange-400')"></span>
                                        <span>Heatmap CSV</span>
                                    </button>
                                </div>
                            </div>

                            <!-- Heatmap Matrix Table -->
                            <div class="overflow-x-auto rounded-xl border border-zinc-800 bg-zinc-950 pb-2">
                                <div class="min-w-[980px]">
                                    <!-- Header Row -->
                                    <div class="grid grid-cols-[220px_repeat(30,1fr)_90px] border-b border-zinc-800 bg-zinc-900/60 text-[10px] text-zinc-400 font-mono py-2.5 px-3 items-center sticky top-0 z-10">
                                        <div class="font-sans font-bold text-zinc-300 uppercase tracking-wider text-[11px]">
                                            Customer / Tenant
                                        </div>
                                        <div v-for="d in daysHeader" :key="d.date" :class="d.isWeekend ? 'text-zinc-600' : 'text-zinc-400'" class="text-center flex flex-col items-center justify-center" :title="d.dayLabel + ' (' + d.dayOfWeek + ')'">
                                            <span class="text-[9px] font-semibold">{{ d.dayLabel.split(' ')[1] }}</span>
                                            <span class="text-[8px] scale-90 text-zinc-500">{{ d.dayOfWeek[0] }}</span>
                                        </div>
                                        <div class="text-right font-sans font-bold text-zinc-300 text-[11px] pr-2">
                                            30D Total
                                        </div>
                                    </div>

                                    <!-- Customer Rows -->
                                    <div class="divide-y divide-zinc-900 text-xs">
                                        <div v-for="row in filteredHeatmapRows" :key="row.customerId" class="grid grid-cols-[220px_repeat(30,1fr)_90px] py-2 px-3 items-center hover:bg-zinc-900/40 transition-colors group">
                                            <!-- Customer Info -->
                                            <div class="flex items-center gap-2.5 pr-2 min-w-0">
                                                <img :src="row.avatar" :alt="row.customerName" class="w-7 h-7 rounded-full bg-zinc-800 flex-shrink-0 object-cover border border-zinc-700" />
                                                <div class="min-w-0">
                                                    <div class="flex items-center gap-1.5">
                                                        <span class="font-bold text-white text-[11px] truncate">{{ row.customerName }}</span>
                                                        <span :class="row.plan === 'enterprise' ? 'bg-purple-500/20 text-purple-300 border-purple-500/30' : (row.plan === 'pro' ? 'bg-orange-500/20 text-orange-300 border-orange-500/30' : 'bg-zinc-500/20 text-zinc-300 border-zinc-500/30')" class="text-[9px] px-1.5 py-0.2 rounded font-mono font-bold uppercase border">
                                                            {{ row.plan[0] }}
                                                        </span>
                                                    </div>
                                                    <span class="text-[10px] text-zinc-400 truncate block">{{ row.companyName }}</span>
                                                </div>
                                            </div>

                                            <!-- 30 Day Activity Cells -->
                                            <div v-for="act in row.dailyActivity" :key="act.date" class="p-0.5 flex items-center justify-center">
                                                <div @mouseenter="hoveredHeatmapCell = { customerName: row.customerName, companyName: row.companyName, plan: row.plan, avatar: row.avatar, activity: act }"
                                                    @mouseleave="hoveredHeatmapCell = null"
                                                    :class="getCellColorClass(act.intensity, act.isWeekend, act.requests)"
                                                    class="w-full aspect-square max-w-[22px] rounded-[3px] border transition-all duration-150 cursor-pointer flex items-center justify-center text-[8px]">
                                                </div>
                                            </div>

                                            <!-- 30D Total Requests -->
                                            <div class="text-right font-mono font-bold text-[11px] text-zinc-300 pr-2">
                                                {{ (row.total30dRequests / 1000).toFixed(0) }}k
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <!-- Interactive Cell Hover Tooltip Banner -->
                            <div v-if="hoveredHeatmapCell" class="p-3.5 rounded-xl bg-zinc-900 border border-orange-500/30 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs animate-in fade-in duration-200">
                                <div class="flex items-center gap-3">
                                    <img :src="hoveredHeatmapCell.avatar" :alt="hoveredHeatmapCell.customerName" class="w-8 h-8 rounded-full border border-zinc-700 object-cover" />
                                    <div>
                                        <div class="flex items-center gap-2">
                                            <span class="font-bold text-white text-sm">{{ hoveredHeatmapCell.customerName }}</span>
                                            <span class="text-[10px] text-zinc-400">({{ hoveredHeatmapCell.companyName }})</span>
                                            <span class="text-[9px] px-1.5 py-0.5 rounded font-mono font-bold uppercase border" :class="hoveredHeatmapCell.plan === 'enterprise' ? 'bg-purple-500/20 text-purple-300 border-purple-500/30' : (hoveredHeatmapCell.plan === 'pro' ? 'bg-orange-500/20 text-orange-300 border-orange-500/30' : 'bg-zinc-500/20 text-zinc-300 border-zinc-500/30')">
                                                {{ hoveredHeatmapCell.plan }}
                                            </span>
                                        </div>
                                        <div class="text-xs text-zinc-400 mt-0.5">
                                            Activity on <strong class="text-zinc-200">{{ hoveredHeatmapCell.activity.dayLabel }} ({{ hoveredHeatmapCell.activity.dayOfWeek }})</strong>
                                        </div>
                                    </div>
                                </div>
                                <div class="flex items-center gap-4 font-mono text-xs">
                                    <div>
                                        <span class="text-[10px] text-zinc-500 block uppercase">Calls</span>
                                        <span class="font-bold text-emerald-400">{{ hoveredHeatmapCell.activity.requests.toLocaleString() }}</span>
                                    </div>
                                    <div>
                                        <span class="text-[10px] text-zinc-500 block uppercase">Data Transfer</span>
                                        <span class="font-bold text-blue-400">{{ hoveredHeatmapCell.activity.dataMb }} MB</span>
                                    </div>
                                    <div>
                                        <span class="text-[10px] text-zinc-500 block uppercase">Infra Cost</span>
                                        <span class="font-bold text-amber-400">&#36;{{ Number(hoveredHeatmapCell.activity.cost).toFixed(4) }}</span>
                                    </div>
                                </div>
                            </div>

                            <!-- Heatmap Color Scale Legend -->
                            <div class="flex flex-wrap items-center justify-between gap-3 pt-2 text-[11px] text-zinc-400 font-mono border-t border-zinc-800/80">
                                <div class="flex items-center gap-2">
                                    <span>Intensity Scale:</span>
                                    <div class="flex items-center gap-1">
                                        <span class="text-[10px] text-zinc-500">Less</span>
                                        <span class="w-3.5 h-3.5 rounded-[2px] bg-zinc-900 border border-zinc-800"></span>
                                        <span class="w-3.5 h-3.5 rounded-[2px] bg-emerald-900/50 border border-emerald-800/50"></span>
                                        <span class="w-3.5 h-3.5 rounded-[2px] bg-emerald-700/80 border border-emerald-600/70"></span>
                                        <span class="w-3.5 h-3.5 rounded-[2px] bg-emerald-600 border border-emerald-500"></span>
                                        <span class="w-3.5 h-3.5 rounded-[2px] bg-emerald-500 border border-emerald-400"></span>
                                        <span class="w-3.5 h-3.5 rounded-[2px] bg-emerald-400 border border-emerald-300"></span>
                                        <span class="text-[10px] text-zinc-500">More (350k+)</span>
                                    </div>
                                </div>
                                <div class="text-[10px] text-zinc-500">
                                    30D Grand Total: <strong class="text-zinc-200">{{ ((heatmapSummary.total30dRequests || 0) / 1000000).toFixed(2) }}M requests</strong> | Cost: <strong class="text-zinc-200">&#36;{{ heatmapSummary.total30dCost || 0 }}</strong>
                                </div>
                            </div>
                        </div>

                        <!-- Plan Tier Distribution Matrix -->
                        <div class="space-y-3">
                            <div class="flex items-center justify-between">
                                <h3 class="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                                    <span class="inline-flex items-center justify-center shrink-0 w-4 h-4 text-orange-400" v-html="renderIcon('layers', 'w-4 h-4 text-orange-400')"></span>
                                    <span>Tier Performance & Margin Matrix</span>
                                </h3>
                                <span class="text-xs text-zinc-400">Broken down by subscription category</span>
                            </div>
                            <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div v-for="p in planDistributions" :key="p.plan" class="p-5 rounded-2xl bg-[#111422] border border-white/10 space-y-4 shadow-lg flex flex-col justify-between">
                                    <div>
                                        <div class="flex items-center justify-between mb-2">
                                            <span :class="p.plan === 'enterprise' ? 'bg-purple-500/20 text-purple-300 border-purple-500/30' : (p.plan === 'pro' ? 'bg-orange-500/20 text-orange-300 border-orange-500/30' : 'bg-zinc-500/20 text-zinc-300 border-zinc-500/30')" class="text-xs font-bold px-2.5 py-0.5 rounded-full uppercase font-mono border">
                                                {{ p.name }}
                                            </span>
                                            <span class="text-xs font-bold text-white">{{ p.userCount }} Accounts</span>
                                        </div>
                                        <div class="space-y-2 pt-2 text-xs">
                                            <div class="flex justify-between">
                                                <span class="text-zinc-400">Total Monthly Revenue:</span>
                                                <span class="font-mono font-bold text-emerald-400">&#36;{{ p.mrr.toFixed(2) }}</span>
                                            </div>
                                            <div class="flex justify-between">
                                                <span class="text-zinc-400">Infrastructure Cost:</span>
                                                <span class="font-mono font-bold text-rose-400">&#36;{{ p.infraCost.toFixed(2) }}</span>
                                            </div>
                                            <div class="flex justify-between border-t border-white/5 pt-1.5">
                                                <span class="text-zinc-300 font-semibold">Net Profit Contribution:</span>
                                                <span class="font-mono font-bold" :class="p.netMargin >= 0 ? 'text-emerald-400' : 'text-rose-400'">
                                                    &#36;{{ p.netMargin.toFixed(2) }}
                                                </span>
                                            </div>
                                            <div class="flex justify-between">
                                                <span class="text-zinc-400">Average Monthly Margin:</span>
                                                <span class="font-bold text-white">{{ p.marginPercent }}%</span>
                                            </div>
                                            <div class="flex justify-between">
                                                <span class="text-zinc-400">Avg Requests / User:</span>
                                                <span class="font-mono text-zinc-300">{{ p.avgRequestsPerUser.toLocaleString() }}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- Historical Financial Ledger -->
                        <div class="bg-[#11141e] border border-white/10 rounded-xl overflow-hidden shadow-xl space-y-3 p-4">
                            <h3 class="text-sm font-bold text-white">Monthly Revenue & Infrastructure Cost Ledger</h3>
                            <div class="overflow-x-auto">
                                <table class="w-full text-xs text-left">
                                    <thead>
                                        <tr class="border-b border-white/10 bg-[#161a26] text-zinc-400 font-semibold">
                                            <th class="py-2.5 px-3">Report Period</th>
                                            <th class="py-2.5 px-3">Gross Revenue</th>
                                            <th class="py-2.5 px-3">Infrastructure Cost</th>
                                            <th class="py-2.5 px-3">Net Profit</th>
                                            <th class="py-2.5 px-3">Margin %</th>
                                            <th class="py-2.5 px-3">API Requests Metered</th>
                                            <th class="py-2.5 px-3">Active Users</th>
                                        </tr>
                                    </thead>
                                    <tbody class="divide-y divide-white/5 text-zinc-300 font-mono">
                                        <tr v-for="(p, idx) in financialLedger" :key="idx" class="hover:bg-white/5 transition-colors">
                                            <td class="py-2.5 px-3 font-sans font-semibold text-white">{{ p.period }}</td>
                                            <td class="py-2.5 px-3 text-emerald-400 font-bold">&#36;{{ p.revenue.toFixed(2) }}</td>
                                            <td class="py-2.5 px-3 text-rose-400">&#36;{{ p.infraCost.toFixed(2) }}</td>
                                            <td class="py-2.5 px-3 text-white font-bold">&#36;{{ p.netProfit.toFixed(2) }}</td>
                                            <td class="py-2.5 px-3 text-emerald-300">{{ p.margin }}</td>
                                            <td class="py-2.5 px-3 text-zinc-400">{{ p.requests }}</td>
                                            <td class="py-2.5 px-3 text-zinc-200">{{ p.active }}</td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
                                <!-- VIEW 4: Account Registration View (Matching React RegisterPage.tsx) -->
                <div v-else-if="activeTab && activeTab.type === 'register'" class="flex-1 flex flex-col min-h-0 overflow-y-auto items-center justify-center p-6 bg-[#0a0c14] text-zinc-200">
                    <div class="w-full max-w-xl bg-[#11141e] border border-white/10 rounded-2xl p-6 shadow-2xl space-y-5">
                        <div class="text-center space-y-1">
                            <div class="w-12 h-12 rounded-2xl bg-orange-500/20 text-orange-400 flex items-center justify-center mx-auto mb-2">
                                <span class="inline-flex items-center justify-center shrink-0 w-6 h-6" v-html="renderIcon('user-plus', 'w-6 h-6')"></span>
                            </div>
                            <h2 class="text-xl font-bold text-white">Create SaaS Developer Account</h2>
                            <p class="text-xs text-zinc-400">Join teams collaborating and executing APIs with zero-latency synchronization.</p>
                        </div>

                        <!-- Plan Selection Radios -->
                        <div class="grid grid-cols-3 gap-3 text-xs">
                            <div @click="registerForm.plan = 'enterprise'" class="p-3 rounded-xl border cursor-pointer transition-all text-center"
                                :class="registerForm.plan === 'enterprise' ? 'bg-purple-500/20 border-purple-500/50 text-white font-bold' : 'bg-white/5 border-white/10 text-zinc-400 hover:text-white'">
                                <div class="font-bold">Enterprise</div>
                                <div class="text-base text-purple-300 mt-1">$199<span class="text-[10px]">/mo</span></div>
                                <div class="text-[10px] text-zinc-500 mt-0.5">10M reqs</div>
                            </div>
                            <div @click="registerForm.plan = 'pro'" class="p-3 rounded-xl border cursor-pointer transition-all text-center"
                                :class="registerForm.plan === 'pro' ? 'bg-orange-500/20 border-orange-500/50 text-white font-bold' : 'bg-white/5 border-white/10 text-zinc-400 hover:text-white'">
                                <div class="font-bold">Pro Dev</div>
                                <div class="text-base text-orange-300 mt-1">$29<span class="text-[10px]">/mo</span></div>
                                <div class="text-[10px] text-zinc-500 mt-0.5">1M reqs</div>
                            </div>
                            <div @click="registerForm.plan = 'free'" class="p-3 rounded-xl border cursor-pointer transition-all text-center"
                                :class="registerForm.plan === 'free' ? 'bg-emerald-500/20 border-emerald-500/50 text-white font-bold' : 'bg-white/5 border-white/10 text-zinc-400 hover:text-white'">
                                <div class="font-bold">Free Tier</div>
                                <div class="text-base text-emerald-300 mt-1">$0</div>
                                <div class="text-[10px] text-zinc-500 mt-0.5">100k reqs</div>
                            </div>
                        </div>

                        <!-- Registration Form -->
                        <form @submit.prevent="handleRegisterSubmit" class="space-y-3 text-xs">
                            <div>
                                <label class="block text-zinc-400 font-semibold mb-1">Full Name</label>
                                <input v-model="registerForm.name" required type="text" placeholder="e.g. Elena Rostova" class="w-full bg-[#0d0f17] border border-white/10 rounded-lg p-2.5 text-zinc-100 placeholder-zinc-500 focus:border-orange-500 focus:outline-none">
                            </div>
                            <div>
                                <label class="block text-zinc-400 font-semibold mb-1">Work Email</label>
                                <input v-model="registerForm.email" required type="email" placeholder="elena@company.com" class="w-full bg-[#0d0f17] border border-white/10 rounded-lg p-2.5 text-zinc-100 placeholder-zinc-500 focus:border-orange-500 focus:outline-none">
                            </div>
                            <div>
                                <label class="block text-zinc-400 font-semibold mb-1">Company / Organization Name</label>
                                <input v-model="registerForm.company" type="text" placeholder="Acme FinTech Corp" class="w-full bg-[#0d0f17] border border-white/10 rounded-lg p-2.5 text-zinc-100 placeholder-zinc-500 focus:border-orange-500 focus:outline-none">
                            </div>
                            <div>
                                <label class="block text-zinc-400 font-semibold mb-1">Account Password</label>
                                <input v-model="registerForm.password" type="password" placeholder="••••••••••••" class="w-full bg-[#0d0f17] border border-white/10 rounded-lg p-2.5 text-zinc-100 placeholder-zinc-500 focus:border-orange-500 focus:outline-none">
                            </div>

                            <div v-if="registerSuccess" class="p-2.5 rounded-lg bg-emerald-500/20 text-emerald-300 font-semibold text-center border border-emerald-500/40">
                                Account created & workspace provisioned successfully!
                            </div>

                            <button type="submit" class="w-full py-2.5 bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white font-bold rounded-lg shadow-lg shadow-orange-500/20 transition-all">
                                Provision Workspace & Activate Account
                            </button>
                        </form>
                    </div>
                </div>

                <!-- VIEW 5: Dedicated Collection Runner View (Matching React CollectionRunner.tsx) -->
                <div v-else-if="activeTab && activeTab.type === 'collection_runner'" class="flex-1 flex flex-col min-h-0 overflow-hidden bg-[#0b0d14] text-zinc-200">
                    <div class="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
                        <!-- Top Header & Configuration Bar -->
                        <div class="bg-[#111422] border border-white/10 rounded-2xl p-5 shadow-xl space-y-4">
                            <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-white/10 pb-4">
                                <div>
                                    <div class="flex items-center gap-2.5">
                                        <div class="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-500 to-orange-600 flex items-center justify-center text-white shadow-lg shadow-orange-500/20">
                                            <span class="inline-flex items-center justify-center shrink-0 w-5 h-5" v-html="renderIcon('play', 'w-5 h-5')"></span>
                                        </div>
                                        <div>
                                            <h1 class="text-xl font-bold text-white flex items-center gap-2">
                                                <span>Collection Test Runner & Automation Suite</span>
                                                <span class="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 font-mono font-bold">Postman Compatible</span>
                                            </h1>
                                            <p class="text-xs text-zinc-400 mt-0.5">Run sequential or batched API test iterations with real-time assertions verification and performance telemetry.</p>
                                        </div>
                                    </div>
                                </div>
                                <div class="flex items-center gap-2 flex-wrap">
                                    <button v-if="runnerExecutionLog.length > 0" @click="exportRunnerResultsJson()" class="px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-200 hover:text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors">
                                        <span class="inline-flex items-center justify-center shrink-0 w-3.5 h-3.5 text-blue-400" v-html="renderIcon('download', 'w-3.5 h-3.5 text-blue-400')"></span>
                                        <span>Export JSON</span>
                                    </button>
                                    <button v-if="runnerRunning" @click="stopRunnerExecution()" class="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-rose-600/20">
                                        <span class="inline-flex items-center justify-center shrink-0 w-3.5 h-3.5" v-html="renderIcon('x', 'w-3.5 h-3.5')"></span>
                                        <span>Stop Execution</span>
                                    </button>
                                    <button v-else @click="runSelectedCollection()" class="px-5 py-2 bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-lg shadow-orange-500/25 transition-all">
                                        <span class="inline-flex items-center justify-center shrink-0 w-3.5 h-3.5" v-html="renderIcon('play', 'w-3.5 h-3.5')"></span>
                                        <span>Start Test Run</span>
                                    </button>
                                </div>
                            </div>

                            <!-- Execution Controls -->
                            <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                                <div>
                                    <label class="block font-semibold text-zinc-400 mb-1">Target Collection</label>
                                    <select v-model="runnerSelectedCollectionId" class="w-full bg-[#161a26] border border-white/10 rounded-xl p-2.5 text-xs text-zinc-200 focus:border-orange-500 focus:outline-none">
                                        <option v-for="c in collections" :key="c.id" :value="c.id">{{ c.name }} ({{ (c.requests || []).length }} requests)</option>
                                    </select>
                                </div>
                                <div>
                                    <label class="block font-semibold text-zinc-400 mb-1">Iterations (Runs Count)</label>
                                    <div class="flex items-center gap-2">
                                        <input v-model.number="runnerIterations" type="number" min="1" max="10" class="w-full bg-[#161a26] border border-white/10 rounded-xl p-2.5 text-xs text-zinc-200 focus:border-orange-500 focus:outline-none font-mono">
                                        <span class="text-zinc-500 text-[11px] shrink-0">times</span>
                                    </div>
                                </div>
                                <div>
                                    <label class="block font-semibold text-zinc-400 mb-1">Delay Between Requests</label>
                                    <select v-model.number="runnerDelayMs" class="w-full bg-[#161a26] border border-white/10 rounded-xl p-2.5 text-xs text-zinc-200 focus:border-orange-500 focus:outline-none font-mono">
                                        <option :value="0">0 ms (Instant Concurrent)</option>
                                        <option :value="100">100 ms (Standard)</option>
                                        <option :value="250">250 ms (Safe Rate-Limit)</option>
                                        <option :value="500">500 ms (Conservative)</option>
                                        <option :value="1000">1000 ms (1 sec interval)</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        <!-- Progress Bar & Real-time Telemetry Cards -->
                        <div class="space-y-3">
                            <!-- Progress Bar -->
                            <div class="p-4 rounded-2xl bg-[#111422] border border-white/10 space-y-2">
                                <div class="flex items-center justify-between text-xs font-mono">
                                    <span class="text-zinc-400">Run Execution Progress:</span>
                                    <span class="font-bold" :class="runnerRunning ? 'text-amber-400' : 'text-zinc-300'">
                                        {{ runnerStats.total > 0 ? Math.round((runnerStats.completed / runnerStats.total) * 100) : 0 }}% ({{ runnerStats.completed }} / {{ runnerStats.total }} completed)
                                    </span>
                                </div>
                                <div class="w-full h-2.5 bg-zinc-950 rounded-full overflow-hidden border border-white/5">
                                    <div class="h-full bg-gradient-to-r from-orange-500 to-amber-400 transition-all duration-300 rounded-full"
                                        :style="{ width: (runnerStats.total > 0 ? (runnerStats.completed / runnerStats.total) * 100 : 0) + '%' }">
                                    </div>
                                </div>
                            </div>

                            <!-- 4 Telemetry Stats Cards -->
                            <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                                <div class="p-3.5 rounded-xl bg-[#111422] border border-white/10">
                                    <span class="text-zinc-400 block text-[11px]">Total Scheduled</span>
                                    <span class="text-xl font-black text-white font-mono mt-1">{{ runnerStats.total }}</span>
                                </div>
                                <div class="p-3.5 rounded-xl bg-[#111422] border border-white/10">
                                    <span class="text-zinc-400 block text-[11px]">Passed Assertions</span>
                                    <span class="text-xl font-black text-emerald-400 font-mono mt-1">{{ runnerStats.passed }}</span>
                                </div>
                                <div class="p-3.5 rounded-xl bg-[#111422] border border-white/10">
                                    <span class="text-zinc-400 block text-[11px]">Failed Tests</span>
                                    <span class="text-xl font-black text-rose-400 font-mono mt-1">{{ runnerStats.failed }}</span>
                                </div>
                                <div class="p-3.5 rounded-xl bg-[#111422] border border-white/10">
                                    <span class="text-zinc-400 block text-[11px]">Success Rate</span>
                                    <span class="text-xl font-black text-white font-mono mt-1">
                                        {{ runnerStats.completed > 0 ? Math.round((runnerStats.passed / runnerStats.completed) * 100) : 100 }}%
                                    </span>
                                </div>
                            </div>
                        </div>

                        <!-- Execution Log Table -->
                        <div class="bg-[#111422] border border-white/10 rounded-2xl overflow-hidden shadow-xl space-y-3 p-4">
                            <div class="flex items-center justify-between">
                                <h3 class="text-sm font-bold text-white flex items-center gap-2">
                                    <span class="inline-flex items-center justify-center shrink-0 w-4 h-4 text-orange-400" v-html="renderIcon('activity', 'w-4 h-4 text-orange-400')"></span>
                                    <span>Detailed Execution Log</span>
                                </h3>
                                <span class="text-xs text-zinc-500 font-mono">{{ runnerExecutionLog.length }} records logged</span>
                            </div>

                            <div v-if="runnerExecutionLog.length === 0" class="text-center py-12 text-zinc-500 text-xs border border-dashed border-zinc-800 rounded-xl">
                                No execution records yet. Click "Start Test Run" above to run the test suite.
                            </div>

                            <div v-else class="space-y-2">
                                <div v-for="(item, idx) in runnerExecutionLog" :key="item.id || idx" class="p-3 bg-[#151926] border border-white/5 rounded-xl space-y-2 hover:border-white/15 transition-all text-xs">
                                    <div class="flex items-center justify-between gap-3">
                                        <div class="flex items-center gap-2.5 min-w-0 flex-1">
                                            <span class="text-zinc-500 font-mono text-[11px]">#{{ idx + 1 }}</span>
                                            <span :class="getMethodBadgeColor(item.method)" class="font-mono text-[10px] font-bold px-2 py-0.5 rounded uppercase shrink-0">
                                                {{ item.method }}
                                            </span>
                                            <span class="font-bold text-white truncate text-xs">{{ item.name }}</span>
                                            <span class="text-zinc-500 font-mono text-[11px] truncate hidden md:inline">{{ item.url }}</span>
                                        </div>
                                        <div class="flex items-center gap-3 shrink-0 font-mono text-[11px]">
                                            <span :class="item.status >= 200 && item.status < 300 ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' : 'text-rose-400 bg-rose-500/10 border-rose-500/20'" class="px-2 py-0.5 rounded border font-bold">
                                                {{ item.status || 'ERR' }}
                                            </span>
                                            <span class="text-zinc-400">{{ item.time }} ms</span>
                                            <button @click="item.showDetails = !item.showDetails" class="px-2 py-1 bg-white/5 hover:bg-white/10 rounded text-[10px] text-zinc-300">
                                                {{ item.showDetails ? 'Hide' : 'Inspect' }}
                                            </button>
                                        </div>
                                    </div>

                                    <!-- Test Results Badges -->
                                    <div v-if="item.testResults && item.testResults.length > 0" class="flex flex-wrap gap-1.5 pt-1">
                                        <span v-for="(t, tIdx) in item.testResults" :key="tIdx" :class="t.passed ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30' : 'bg-rose-500/10 text-rose-300 border-rose-500/30'" class="text-[10px] px-2 py-0.5 rounded border font-mono flex items-center gap-1">
                                            <span :class="t.passed ? 'text-emerald-400' : 'text-rose-400'">{{ t.passed ? '✓' : '✗' }}</span>
                                            <span>{{ t.name }}</span>
                                        </span>
                                    </div>

                                    <!-- Collapsible Response Preview -->
                                    <div v-if="item.showDetails" class="pt-2 border-t border-white/5 space-y-1">
                                        <span class="text-[10px] text-zinc-500 font-mono block">Response Body:</span>
                                        <pre class="p-2.5 bg-black/40 rounded-lg text-[11px] font-mono text-zinc-300 overflow-x-auto max-h-48 whitespace-pre-wrap">{{ item.responseBody || '(empty body)' }}</pre>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                
                <!-- VIEW 6: Dedicated System Diagnostic View (100% In-App Health Verification) -->
                <div v-else-if="activeTab && activeTab.type === 'diagnostic'" class="flex-1 flex flex-col min-h-0 overflow-y-auto bg-[#0a0c14] text-zinc-200 p-4 sm:p-6 lg:p-8 space-y-6">
                    <!-- Diagnostic Header -->
                    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-5">
                        <div class="flex items-center gap-3">
                            <div class="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 to-orange-600 flex items-center justify-center text-white shadow-lg shadow-amber-500/20">
                                <span class="inline-flex items-center justify-center shrink-0 w-5 h-5" v-html="renderIcon('shield-alert', 'w-5 h-5')"></span>
                            </div>
                            <div>
                                <h1 class="text-xl font-bold text-white flex items-center gap-2">
                                    <span>System Diagnostics & Environment Health</span>
                                    <span class="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-semibold">Live Scanner</span>
                                </h1>
                                <p class="text-xs text-zinc-400">Validate server readiness, PHP version, MySQL PDO driver, cURL proxy, and shared hosting compatibility.</p>
                            </div>
                        </div>
                        <div class="flex items-center gap-2 flex-wrap">
                            <button @click="runDiagnosticScan()" :disabled="diagnosticScanning" class="px-3.5 py-2 bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white rounded-xl text-xs font-bold shadow-md shadow-orange-500/20 transition-all flex items-center gap-1.5 disabled:opacity-50">
                                <span class="inline-flex items-center justify-center shrink-0 w-3.5 h-3.5" :class="{'animate-spin': diagnosticScanning}" v-html="renderIcon('refresh-cw', 'w-3.5 h-3.5')"></span>
                                <span>{{ diagnosticScanning ? 'Scanning...' : 'Re-Scan Environment' }}</span>
                            </button>
                            <button @click="copySqlSchema()" class="px-3.5 py-2 bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-200 hover:text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors">
                                <span class="inline-flex items-center justify-center shrink-0 w-3.5 h-3.5 text-amber-400" v-html="renderIcon('database', 'w-3.5 h-3.5 text-amber-400')"></span>
                                <span>{{ sqlCopied ? 'Schema Copied!' : 'Copy SQL Schema' }}</span>
                            </button>
                            <button @click="window.open('diagnostic', '_blank')" class="px-3.5 py-2 bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-200 hover:text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors">
                                <span class="inline-flex items-center justify-center shrink-0 w-3.5 h-3.5 text-blue-400" v-html="renderIcon('external-link', 'w-3.5 h-3.5 text-blue-400')"></span>
                                <span>Standalone Report</span>
                            </button>
                        </div>
                    </div>

                    <!-- Core Environment Status Cards -->
                    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        <!-- PHP Engine -->
                        <div class="p-4 rounded-xl bg-[#121522] border border-white/10 flex flex-col justify-between">
                            <div class="space-y-2">
                                <div class="flex items-center justify-between">
                                    <span class="text-xs font-bold text-zinc-400 uppercase tracking-wider">PHP Engine</span>
                                    <span class="px-2 py-0.5 rounded text-[10px] font-bold uppercase font-mono bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">PASS</span>
                                </div>
                                <div class="text-sm font-bold text-white flex items-center gap-2">
                                    <span class="inline-flex items-center justify-center shrink-0 w-4 h-4 text-emerald-400" v-html="renderIcon('check-circle', 'w-4 h-4')"></span>
                                    <span>PHP 7.4+ / 8.x Ready</span>
                                </div>
                                <p class="text-[11px] text-zinc-400">Strictly typed, zero deprecated syntax, compatible with LiteSpeed, Apache, Nginx, and PHP-FPM.</p>
                            </div>
                            <div class="pt-3 border-t border-white/5 text-[10px] font-mono text-zinc-500 flex justify-between">
                                <span>Hostinger / cPanel</span>
                                <span class="text-emerald-400">Optimal</span>
                            </div>
                        </div>

                        <!-- cURL Proxy Extension -->
                        <div class="p-4 rounded-xl bg-[#121522] border border-white/10 flex flex-col justify-between">
                            <div class="space-y-2">
                                <div class="flex items-center justify-between">
                                    <span class="text-xs font-bold text-zinc-400 uppercase tracking-wider">cURL Proxy</span>
                                    <span class="px-2 py-0.5 rounded text-[10px] font-bold uppercase font-mono bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">ENABLED</span>
                                </div>
                                <div class="text-sm font-bold text-white flex items-center gap-2">
                                    <span class="inline-flex items-center justify-center shrink-0 w-4 h-4 text-emerald-400" v-html="renderIcon('globe', 'w-4 h-4')"></span>
                                    <span>Outbound Network Engine</span>
                                </div>
                                <p class="text-[11px] text-zinc-400">Transparently proxies external HTTP/HTTPS requests to bypass browser CORS restrictions.</p>
                            </div>
                            <div class="pt-3 border-t border-white/5 text-[10px] font-mono text-zinc-500 flex justify-between">
                                <span>Proxy Mode</span>
                                <span class="text-emerald-400">CORS Bypass Active</span>
                            </div>
                        </div>

                        <!-- Database Persistence -->
                        <div class="p-4 rounded-xl bg-[#121522] border border-white/10 flex flex-col justify-between">
                            <div class="space-y-2">
                                <div class="flex items-center justify-between">
                                    <span class="text-xs font-bold text-zinc-400 uppercase tracking-wider">Storage Mode</span>
                                    <span class="px-2 py-0.5 rounded text-[10px] font-bold uppercase font-mono" :class="dbConnected ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'">
                                        {{ dbConnected ? 'MySQL PDO' : 'File Fallback' }}
                                    </span>
                                </div>
                                <div class="text-sm font-bold text-white flex items-center gap-2">
                                    <span class="inline-flex items-center justify-center shrink-0 w-4 h-4" :class="dbConnected ? 'text-emerald-400' : 'text-amber-400'" v-html="renderIcon('database', 'w-4 h-4')"></span>
                                    <span>{{ dbConnected ? 'MySQL Connected' : 'Local JSON Storage Active' }}</span>
                                </div>
                                <p class="text-[11px] text-zinc-400">Dual-engine storage: automatic seamless fallback to JSON files if MySQL credentials are not configured.</p>
                            </div>
                            <div class="pt-3 border-t border-white/5 text-[10px] font-mono text-zinc-500 flex justify-between">
                                <span>Target</span>
                                <span :class="dbConnected ? 'text-emerald-400' : 'text-amber-400'">{{ dbConnected ? 'u320472937_postman' : 'php_shared_hosting/data' }}</span>
                            </div>
                        </div>
                    </div>

                    <!-- Live Database Connection Tester Form -->
                    <div class="bg-[#121522] border border-white/10 rounded-2xl p-6 space-y-4">
                        <div class="flex items-center justify-between flex-wrap gap-2">
                            <div>
                                <h3 class="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                                    <span class="inline-flex items-center justify-center shrink-0 w-4 h-4 text-orange-400" v-html="renderIcon('database', 'w-4 h-4')"></span>
                                    <span>Live MySQL Database Connection Tester</span>
                                </h3>
                                <p class="text-xs text-zinc-400 mt-0.5">Test database credentials directly without editing config.php manually.</p>
                            </div>
                            <span v-if="dbTestResult" class="text-xs font-mono px-2.5 py-1 rounded-lg border font-semibold" :class="dbTestResult.success ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' : 'bg-rose-500/20 text-rose-300 border-rose-500/30'">
                                {{ dbTestResult.message }}
                            </span>
                        </div>

                        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                            <div>
                                <label class="block text-[11px] font-semibold text-zinc-400 mb-1">Host</label>
                                <input v-model="dbTestConfig.host" type="text" class="w-full bg-[#181c2d] border border-white/10 rounded-lg px-3 py-2 text-xs text-zinc-100 font-mono focus:outline-none focus:border-orange-500">
                            </div>
                            <div>
                                <label class="block text-[11px] font-semibold text-zinc-400 mb-1">Database Name</label>
                                <input v-model="dbTestConfig.name" type="text" class="w-full bg-[#181c2d] border border-white/10 rounded-lg px-3 py-2 text-xs text-zinc-100 font-mono focus:outline-none focus:border-orange-500">
                            </div>
                            <div>
                                <label class="block text-[11px] font-semibold text-zinc-400 mb-1">Username</label>
                                <input v-model="dbTestConfig.user" type="text" class="w-full bg-[#181c2d] border border-white/10 rounded-lg px-3 py-2 text-xs text-zinc-100 font-mono focus:outline-none focus:border-orange-500">
                            </div>
                            <div>
                                <label class="block text-[11px] font-semibold text-zinc-400 mb-1">Password</label>
                                <input v-model="dbTestConfig.pass" type="password" class="w-full bg-[#181c2d] border border-white/10 rounded-lg px-3 py-2 text-xs text-zinc-100 font-mono focus:outline-none focus:border-orange-500">
                            </div>
                        </div>

                        <div class="flex items-center justify-between pt-2">
                            <span class="text-[11px] text-zinc-500">Supports Hostinger, cPanel, Plesk, AWS RDS, DigitalOcean, and local XAMPP/WAMP.</span>
                            <button @click="testDbConnection()" :disabled="dbTesting" class="px-4 py-2 bg-orange-600 hover:bg-orange-500 text-white rounded-lg text-xs font-bold transition-all shadow-md flex items-center gap-1.5 disabled:opacity-50">
                                <span class="inline-flex items-center justify-center shrink-0 w-3 h-3" :class="{'animate-spin': dbTesting}" v-html="renderIcon('activity', 'w-3 h-3')"></span>
                                <span>{{ dbTesting ? 'Verifying...' : 'Test Connection' }}</span>
                            </button>
                        </div>
                    </div>

                    <!-- Verified Database Tables Checklist -->
                    <div class="bg-[#121522] border border-white/10 rounded-2xl p-6 space-y-3">
                        <div class="flex items-center justify-between">
                            <h3 class="text-sm font-bold text-white uppercase tracking-wider">Auto-Provisioned Multi-Tenant Schema</h3>
                            <span class="text-[10px] font-mono text-zinc-400">9 Core Tables</span>
                        </div>
                        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 pt-2">
                            <div v-for="tbl in [
                                { name: 'cp_users', desc: 'User accounts & RBAC roles' },
                                { name: 'cp_workspaces', desc: 'Team & personal workspaces' },
                                { name: 'cp_collections', desc: 'Grouped API endpoints' },
                                { name: 'cp_environments', desc: 'Key-value variable scopes' },
                                { name: 'cp_history', desc: 'Audit request & response logs' },
                                { name: 'cp_activity_logs', desc: 'Collaborative audit stream' },
                                { name: 'cp_saas_customers', desc: 'Customer 360, quotas & MRR' },
                                { name: 'cp_saas_usage_logs', desc: 'Execution telemetry & compute cost' },
                                { name: 'cp_app_state', desc: 'JSON snapshot persistence' }
                            ]" :key="tbl.name" class="p-2.5 rounded-lg bg-[#181c2d] border border-white/5 flex items-center gap-2">
                                <span class="inline-flex items-center justify-center shrink-0 w-3.5 h-3.5 text-emerald-400" v-html="renderIcon('check', 'w-3.5 h-3.5')"></span>
                                <div class="min-w-0">
                                    <div class="font-mono text-xs font-bold text-white truncate">{{ tbl.name }}</div>
                                    <div class="text-[10px] text-zinc-400 truncate">{{ tbl.desc }}</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- VIEW 7: Real-Time WebSocket Tester (100% Parity with React WebSocketTester) -->
                <div v-else-if="activeTab && activeTab.type === 'websocket'" class="flex-1 flex flex-col min-h-0 overflow-hidden bg-[#0b0d14] text-zinc-200">
                    <!-- Top Bar: Connection Controls & Real-Time Metrics -->
                    <div class="p-4 sm:p-5 border-b border-white/10 bg-[#121622] shrink-0 space-y-3">
                        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div class="flex items-center gap-3">
                                <div class="w-9 h-9 rounded-xl bg-gradient-to-tr from-purple-500 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-indigo-500/20">
                                    <span class="inline-flex items-center justify-center shrink-0 w-4 h-4" v-html="renderIcon('radio', 'w-4 h-4')"></span>
                                </div>
                                <div>
                                    <h1 class="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                                        <span>WebSocket Real-Time Tester</span>
                                        <span v-if="wsStatus === 'CONNECTED'" class="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-bold flex items-center gap-1">
                                            <span class="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span> CONNECTED
                                        </span>
                                        <span v-else-if="wsStatus === 'CONNECTING'" class="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30 font-bold flex items-center gap-1">
                                            <span class="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping"></span> CONNECTING...
                                        </span>
                                        <span v-else-if="wsStatus === 'ERROR'" class="text-[10px] font-mono px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/30 font-bold">
                                            ERROR
                                        </span>
                                        <span v-else class="text-[10px] font-mono px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400 border border-zinc-700 font-bold">
                                            DISCONNECTED
                                        </span>
                                    </h1>
                                    <p class="text-xs text-zinc-400">Bidirectional persistent socket streaming, message logging, latency timing, and payload inspector.</p>
                                </div>
                            </div>

                            <div class="flex items-center gap-3 text-xs font-mono">
                                <div class="px-3 py-1 rounded-lg bg-black/40 border border-white/5 flex items-center gap-2">
                                    <span class="text-zinc-500">Connected:</span>
                                    <span class="text-zinc-200 font-semibold">{{ wsConnectedAt || 'None' }}</span>
                                </div>
                                <div class="px-3 py-1 rounded-lg bg-black/40 border border-white/5 flex items-center gap-2">
                                    <span class="text-zinc-500">Session:</span>
                                    <span class="text-amber-400 font-semibold">{{ wsElapsedSec }}s</span>
                                </div>
                                <div class="px-3 py-1 rounded-lg bg-black/40 border border-white/5 flex items-center gap-2">
                                    <span class="text-zinc-500">Frames:</span>
                                    <span class="text-indigo-400 font-semibold">{{ wsMessages.length }}</span>
                                </div>
                            </div>
                        </div>

                        <!-- URL Input Bar & Action Triggers -->
                        <div class="flex flex-col md:flex-row items-stretch md:items-center gap-2">
                            <div class="relative flex-1">
                                <input v-model="wsUrl" :disabled="wsStatus === 'CONNECTED' || wsStatus === 'CONNECTING'" type="text" placeholder="wss://echo.websocket.org"
                                    class="w-full bg-zinc-950/80 border border-zinc-700/80 rounded-xl px-3.5 py-2 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-indigo-500 font-mono disabled:opacity-60">
                            </div>

                            <div class="flex items-center gap-2 shrink-0">
                                <button v-if="wsStatus !== 'CONNECTED' && wsStatus !== 'CONNECTING'" @click="connectWebSocket()"
                                    class="px-4 py-2 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white text-xs font-bold rounded-xl shadow-md shadow-indigo-500/20 flex items-center gap-2 transition-all cursor-pointer">
                                    <span class="inline-flex items-center justify-center shrink-0 w-3.5 h-3.5" v-html="renderIcon('play', 'w-3.5 h-3.5')"></span>
                                    <span>Connect</span>
                                </button>
                                <button v-else @click="disconnectWebSocket()"
                                    class="px-4 py-2 bg-gradient-to-r from-rose-600 to-red-700 hover:from-rose-700 hover:to-red-800 text-white text-xs font-bold rounded-xl shadow-md shadow-rose-600/20 flex items-center gap-2 transition-all cursor-pointer">
                                    <span class="inline-flex items-center justify-center shrink-0 w-3.5 h-3.5" v-html="renderIcon('square', 'w-3.5 h-3.5')"></span>
                                    <span>Disconnect</span>
                                </button>

                                <button @click="sendWebSocketPing()" :disabled="wsStatus !== 'CONNECTED'"
                                    class="px-3.5 py-2 bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-300 hover:text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-colors disabled:opacity-40">
                                    <span class="inline-flex items-center justify-center shrink-0 w-3.5 h-3.5 text-amber-400" v-html="renderIcon('zap', 'w-3.5 h-3.5 text-amber-400')"></span>
                                    <span>Ping</span>
                                </button>

                                <button @click="clearWebSocketMessages()"
                                    class="px-3 py-2 bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-400 hover:text-rose-400 text-xs font-medium rounded-xl flex items-center gap-1.5 transition-colors" title="Clear message stream">
                                    <span class="inline-flex items-center justify-center shrink-0 w-3.5 h-3.5" v-html="renderIcon('trash-2', 'w-3.5 h-3.5')"></span>
                                    <span class="hidden sm:inline">Clear</span>
                                </button>
                            </div>
                        </div>

                        <!-- Presets Bar -->
                        <div class="flex items-center gap-2 overflow-x-auto text-[11px] pt-1">
                            <span class="text-zinc-500 shrink-0 font-medium">Presets:</span>
                            <button v-for="p in wsPresets" :key="p.name" @click="setWebSocketPreset(p)"
                                class="px-2.5 py-1 rounded-lg bg-zinc-800/60 hover:bg-zinc-700/80 border border-white/5 text-zinc-300 hover:text-white transition-colors whitespace-nowrap">
                                {{ p.name }}
                            </button>
                        </div>
                    </div>

                    <!-- Split Area: Composer & Stream -->
                    <div class="flex-1 grid grid-cols-1 lg:grid-cols-12 min-h-0 overflow-hidden">
                        <!-- Left: Composer Panel (5 cols) -->
                        <div class="lg:col-span-5 border-b lg:border-b-0 lg:border-r border-white/10 flex flex-col bg-[#10131d] min-h-[260px] lg:min-h-0">
                            <div class="px-4 py-2.5 bg-zinc-950/40 border-b border-white/10 flex items-center justify-between shrink-0">
                                <div class="flex items-center gap-2">
                                    <span class="text-xs font-bold text-zinc-300 uppercase tracking-wider">Payload Composer</span>
                                    <span class="px-1.5 py-0.5 rounded text-[10px] font-mono bg-indigo-500/20 text-indigo-300">JSON</span>
                                </div>
                                <div class="flex items-center gap-2">
                                    <button @click="wsComposeText = '{\n  &quot;event&quot;: &quot;subscribe&quot;,\n  &quot;channel&quot;: &quot;ticker-btc-usd&quot;,\n  &quot;id&quot;: ' + Date.now() + '\n}'"
                                        class="text-[10px] text-zinc-400 hover:text-zinc-200">
                                        Subscribe
                                    </button>
                                    <span class="text-zinc-700">|</span>
                                    <button @click="wsComposeText = '{\n  &quot;action&quot;: &quot;echo&quot;,\n  &quot;message&quot;: &quot;Hello CloudPost!&quot;,\n  &quot;timestamp&quot;: ' + Date.now() + '\n}'"
                                        class="text-[10px] text-zinc-400 hover:text-zinc-200">
                                        Echo
                                    </button>
                                </div>
                            </div>

                            <div class="flex-1 p-3 min-h-0 flex flex-col">
                                <textarea v-model="wsComposeText"
                                    class="flex-1 w-full p-3 rounded-xl bg-zinc-950 border border-zinc-800 text-xs font-mono text-zinc-200 resize-none focus:outline-none focus:border-indigo-500 placeholder-zinc-600"
                                    placeholder="Enter raw frame or JSON payload to send..."></textarea>
                            </div>

                            <div class="p-3 bg-zinc-950/60 border-t border-white/10 flex items-center justify-between shrink-0">
                                <div class="text-[11px] text-zinc-400">
                                    Size: <span class="font-mono text-zinc-200">{{ wsComposeText.length }} B</span>
                                </div>
                                <button @click="sendWebSocketMessage()" :disabled="wsStatus !== 'CONNECTED' || !wsComposeText.trim()"
                                    class="px-4 py-2 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 disabled:opacity-40 text-white text-xs font-bold rounded-xl shadow-md shadow-indigo-500/20 flex items-center gap-2 transition-all">
                                    <span class="inline-flex items-center justify-center shrink-0 w-3.5 h-3.5" v-html="renderIcon('send', 'w-3.5 h-3.5')"></span>
                                    <span>Send Frame</span>
                                </button>
                            </div>
                        </div>

                        <!-- Right: Live Message Stream (7 cols) -->
                        <div class="lg:col-span-7 flex flex-col bg-[#0a0c14] min-h-0 overflow-hidden">
                            <!-- Stream Controls -->
                            <div class="px-4 py-2.5 bg-zinc-950/50 border-b border-white/10 flex flex-wrap items-center justify-between gap-2 shrink-0">
                                <div class="flex items-center gap-2">
                                    <span class="text-xs font-bold text-zinc-300 uppercase tracking-wider">Frames Stream</span>
                                    <span class="px-2 py-0.5 rounded-full text-[10px] font-mono bg-zinc-800 text-zinc-400">{{ filteredWsMessages.length }}</span>
                                </div>

                                <div class="flex items-center gap-2 text-xs">
                                    <div class="flex items-center bg-zinc-900 border border-zinc-800 rounded-lg p-0.5 text-[11px]">
                                        <button @click="wsFilterDirection = 'all'" :class="wsFilterDirection === 'all' ? 'bg-zinc-800 text-white font-bold' : 'text-zinc-400 hover:text-zinc-200'" class="px-2 py-0.5 rounded">All</button>
                                        <button @click="wsFilterDirection = 'in'" :class="wsFilterDirection === 'in' ? 'bg-emerald-500/20 text-emerald-400 font-bold' : 'text-zinc-400 hover:text-zinc-200'" class="px-2 py-0.5 rounded flex items-center gap-1">
                                            <span class="inline-flex items-center justify-center shrink-0 w-3 h-3" v-html="renderIcon('arrow-down-left', 'w-3 h-3')"></span> In
                                        </button>
                                        <button @click="wsFilterDirection = 'out'" :class="wsFilterDirection === 'out' ? 'bg-blue-500/20 text-blue-400 font-bold' : 'text-zinc-400 hover:text-zinc-200'" class="px-2 py-0.5 rounded flex items-center gap-1">
                                            <span class="inline-flex items-center justify-center shrink-0 w-3 h-3" v-html="renderIcon('arrow-up-right', 'w-3 h-3')"></span> Out
                                        </button>
                                    </div>

                                    <input v-model="wsFilterQuery" type="text" placeholder="Filter frames..."
                                        class="bg-zinc-900 border border-zinc-800 rounded-lg px-2.5 py-1 text-[11px] text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-indigo-500 w-32 sm:w-44">
                                </div>
                            </div>

                            <!-- Stream List -->
                            <div class="flex-1 overflow-y-auto p-3 space-y-2 font-mono text-xs">
                                <div v-if="filteredWsMessages.length === 0" class="h-full flex flex-col items-center justify-center text-center p-8 text-zinc-500 space-y-2">
                                    <span class="inline-flex items-center justify-center shrink-0 w-8 h-8 text-zinc-600" v-html="renderIcon('radio', 'w-8 h-8 text-zinc-600')"></span>
                                    <p class="text-xs">No frames recorded yet.</p>
                                    <p class="text-[11px] text-zinc-600">Click &ldquo;Connect&rdquo; above to establish a WebSocket channel.</p>
                                </div>

                                <div v-for="msg in filteredWsMessages" :key="msg.id"
                                    class="p-3 rounded-xl border transition-all"
                                    :class="msg.direction === 'in' ? 'bg-emerald-950/10 border-emerald-500/20 hover:border-emerald-500/40' : (msg.direction === 'out' ? 'bg-blue-950/10 border-blue-500/20 hover:border-blue-500/40' : (msg.isError ? 'bg-rose-950/20 border-rose-500/30' : 'bg-zinc-900/40 border-white/5'))">
                                    
                                    <div class="flex items-center justify-between pb-1.5 mb-1.5 border-b border-white/5 text-[10px]">
                                        <div class="flex items-center gap-2">
                                            <span v-if="msg.direction === 'in'" class="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-bold flex items-center gap-1">
                                                <span class="inline-flex items-center justify-center shrink-0 w-2.5 h-2.5" v-html="renderIcon('arrow-down-left', 'w-2.5 h-2.5')"></span> RECV
                                            </span>
                                            <span v-else-if="msg.direction === 'out'" class="px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-400 font-bold flex items-center gap-1">
                                                <span class="inline-flex items-center justify-center shrink-0 w-2.5 h-2.5" v-html="renderIcon('arrow-up-right', 'w-2.5 h-2.5')"></span> SENT
                                            </span>
                                            <span v-else class="px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 font-bold">
                                                SYSTEM
                                            </span>
                                            <span class="text-zinc-500">{{ msg.timestamp }}</span>
                                        </div>

                                        <div class="flex items-center gap-2">
                                            <span v-if="msg.size" class="text-zinc-500">{{ msg.size }} B</span>
                                            <button @click="copyWebSocketMessage(msg.id, msg.data)"
                                                class="text-zinc-400 hover:text-zinc-200 transition-colors">
                                                {{ wsCopiedId === msg.id ? 'Copied!' : 'Copy' }}
                                            </button>
                                        </div>
                                    </div>

                                    <div class="text-zinc-200 whitespace-pre-wrap break-all leading-relaxed text-[11px]">{{ msg.data }}</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- VIEW 8: Mock Server Engine (100% Parity with React MockServerManager) -->
                <div v-else-if="activeTab && activeTab.type === 'mock_server'" class="flex-1 flex flex-col min-h-0 overflow-hidden bg-[#0b0d14] text-zinc-200">
                    <!-- Top Header -->
                    <div class="p-4 sm:p-5 border-b border-white/10 bg-[#121622] shrink-0 space-y-3">
                        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div class="flex items-center gap-3">
                                <div class="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center text-white shadow-md shadow-cyan-500/20">
                                    <span class="inline-flex items-center justify-center shrink-0 w-5 h-5" v-html="renderIcon('server', 'w-5 h-5')"></span>
                                </div>
                                <div>
                                    <h1 class="text-lg font-bold text-white flex items-center gap-2">
                                        <span>Mock Server Engine & Virtual APIs</span>
                                        <span class="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 font-semibold">Active Engine</span>
                                    </h1>
                                    <p class="text-xs text-zinc-400">Simulate endpoints, customize latency injection, configure error states, and mock payloads with zero backend.</p>
                                </div>
                            </div>

                            <div class="flex items-center gap-2">
                                <button @click="showNewMockServerModal = true"
                                    class="px-3.5 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white rounded-xl text-xs font-bold shadow-md shadow-cyan-500/20 flex items-center gap-1.5 transition-all">
                                    <span class="inline-flex items-center justify-center shrink-0 w-3.5 h-3.5" v-html="renderIcon('plus', 'w-3.5 h-3.5')"></span>
                                    <span>New Mock Server</span>
                                </button>
                            </div>
                        </div>

                        <!-- Active Server Switcher & Base URL -->
                        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-white/5">
                            <div class="flex items-center gap-3">
                                <label class="text-xs font-medium text-zinc-400">Server:</label>
                                <select v-model="activeMockServerId" class="bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-1.5 text-xs text-zinc-200 focus:outline-none focus:border-cyan-500">
                                    <option v-for="srv in mockServers" :key="srv.id" :value="srv.id">{{ srv.name }} ({{ srv.endpoints.length }} endpoints)</option>
                                </select>
                                <button @click="deleteMockServer(activeMockServerId)" class="text-zinc-500 hover:text-rose-400 text-xs transition-colors" title="Delete this mock server">
                                    <span class="inline-flex items-center justify-center shrink-0 w-3.5 h-3.5" v-html="renderIcon('trash-2', 'w-3.5 h-3.5')"></span>
                                </button>
                            </div>

                            <div v-if="activeMockServer" class="flex items-center gap-2 text-xs font-mono bg-zinc-950/80 px-3 py-1.5 rounded-lg border border-white/5">
                                <span class="text-zinc-500">Base Path:</span>
                                <span class="text-cyan-400 font-semibold">{{ activeMockServer.baseUrl }}</span>
                                <span class="text-zinc-600">|</span>
                                <span class="text-zinc-400">{{ activeMockServer.description }}</span>
                            </div>
                        </div>
                    </div>

                    <!-- Main Workspace: Endpoints Sidebar + Endpoint Editor & Live Tester -->
                    <div class="flex-1 grid grid-cols-1 lg:grid-cols-12 min-h-0 overflow-hidden">
                        <!-- Left: Endpoints List (4 cols) -->
                        <div class="lg:col-span-4 border-b lg:border-b-0 lg:border-r border-white/10 flex flex-col bg-[#10131e] min-h-[220px] lg:min-h-0">
                            <div class="p-3 bg-zinc-950/40 border-b border-white/10 flex items-center justify-between shrink-0">
                                <span class="text-xs font-bold text-zinc-300 uppercase tracking-wider">Virtual Endpoints</span>
                                <button @click="showNewMockEndpointModal = true"
                                    class="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-cyan-400 hover:text-cyan-300 text-xs font-semibold flex items-center gap-1 transition-colors">
                                    <span class="inline-flex items-center justify-center shrink-0 w-3 h-3" v-html="renderIcon('plus', 'w-3 h-3')"></span>
                                    <span>Add Endpoint</span>
                                </button>
                            </div>

                            <div class="flex-1 overflow-y-auto p-2 space-y-1">
                                <div v-if="!activeMockServer || activeMockServer.endpoints.length === 0" class="p-6 text-center text-xs text-zinc-500">
                                    No mock endpoints configured for this server.
                                </div>
                                <div v-for="ep in (activeMockServer ? activeMockServer.endpoints : [])" :key="ep.id"
                                    @click="selectedMockEndpointId = ep.id"
                                    class="p-2.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-2"
                                    :class="selectedMockEndpointId === ep.id ? 'bg-cyan-950/20 border-cyan-500/40 text-white shadow-sm' : 'bg-zinc-900/30 border-white/5 text-zinc-400 hover:bg-white/5 hover:text-zinc-200'">
                                    
                                    <div class="flex items-center gap-2 min-w-0">
                                        <span :class="getMethodBadgeColor(ep.method)" class="px-1.5 py-0.5 rounded text-[10px] font-bold font-mono shrink-0">
                                            {{ ep.method }}
                                        </span>
                                        <div class="min-w-0">
                                            <div class="text-xs font-medium text-zinc-200 truncate">{{ ep.name }}</div>
                                            <div class="text-[10px] font-mono text-zinc-500 truncate">{{ ep.path }}</div>
                                        </div>
                                    </div>

                                    <div class="flex items-center gap-1.5 shrink-0">
                                        <span class="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold"
                                            :class="ep.responseStatus >= 200 && ep.responseStatus < 300 ? 'bg-emerald-500/20 text-emerald-400' : (ep.responseStatus >= 400 ? 'bg-rose-500/20 text-rose-400' : 'bg-amber-500/20 text-amber-400')">
                                            {{ ep.responseStatus }}
                                        </span>
                                        <button @click.stop="deleteMockEndpoint(ep.id)" class="text-zinc-600 hover:text-rose-400 p-1 transition-colors" title="Delete endpoint">
                                            <span class="inline-flex items-center justify-center shrink-0 w-3 h-3" v-html="renderIcon('trash-2', 'w-3 h-3')"></span>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- Right: Endpoint Configuration & Live Simulator (8 cols) -->
                        <div v-if="selectedMockEndpoint" class="lg:col-span-8 flex flex-col bg-[#0a0c14] min-h-0 overflow-y-auto p-4 sm:p-6 space-y-6">
                            <!-- Endpoint Title Bar -->
                            <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-white/10">
                                <div class="space-y-1">
                                    <div class="flex items-center gap-2">
                                        <span :class="getMethodBadgeColor(selectedMockEndpoint.method)" class="px-2 py-0.5 rounded text-xs font-bold font-mono">
                                            {{ selectedMockEndpoint.method }}
                                        </span>
                                        <h2 class="text-base font-bold text-white">{{ selectedMockEndpoint.name }}</h2>
                                    </div>
                                    <div class="font-mono text-xs text-cyan-400 flex items-center gap-2">
                                        <span>{{ (activeMockServer ? activeMockServer.baseUrl : '') + selectedMockEndpoint.path }}</span>
                                    </div>
                                </div>

                                <div class="flex items-center gap-2 flex-wrap">
                                    <button @click="testMockEndpoint()" :disabled="isTestingMockEndpoint"
                                        class="px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-500/20 flex items-center gap-1.5 transition-all">
                                        <span class="inline-flex items-center justify-center shrink-0 w-3.5 h-3.5" :class="{'animate-spin': isTestingMockEndpoint}" v-html="renderIcon(isTestingMockEndpoint ? 'refresh-cw' : 'play', 'w-3.5 h-3.5')"></span>
                                        <span>{{ isTestingMockEndpoint ? 'Executing...' : 'Test Endpoint' }}</span>
                                    </button>

                                    <button @click="copyMockEndpointUrl(selectedMockEndpoint)"
                                        class="px-3.5 py-2 bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-300 hover:text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors">
                                        <span class="inline-flex items-center justify-center shrink-0 w-3.5 h-3.5 text-cyan-400" v-html="renderIcon('share-2', 'w-3.5 h-3.5 text-cyan-400')"></span>
                                        <span>{{ copiedMockUrl === selectedMockEndpoint.id ? 'URL Copied!' : 'Copy URL' }}</span>
                                    </button>

                                    <button @click="openMockInBuilder(selectedMockEndpoint)"
                                        class="px-3.5 py-2 bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-300 hover:text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors">
                                        <span class="inline-flex items-center justify-center shrink-0 w-3.5 h-3.5 text-orange-400" v-html="renderIcon('edit-3', 'w-3.5 h-3.5 text-orange-400')"></span>
                                        <span>Open in Builder</span>
                                    </button>
                                </div>
                            </div>

                            <!-- Settings Row -->
                            <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                <div>
                                    <label class="block text-xs font-semibold text-zinc-400 mb-1.5">HTTP Method</label>
                                    <select v-model="selectedMockEndpoint.method" class="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs font-mono text-zinc-200 focus:outline-none focus:border-cyan-500">
                                        <option value="GET">GET</option>
                                        <option value="POST">POST</option>
                                        <option value="PUT">PUT</option>
                                        <option value="DELETE">DELETE</option>
                                        <option value="PATCH">PATCH</option>
                                    </select>
                                </div>

                                <div>
                                    <label class="block text-xs font-semibold text-zinc-400 mb-1.5">Response Status Code</label>
                                    <input v-model.number="selectedMockEndpoint.responseStatus" type="number"
                                        class="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs font-mono text-zinc-200 focus:outline-none focus:border-cyan-500" placeholder="200">
                                </div>

                                <div>
                                    <label class="block text-xs font-semibold text-zinc-400 mb-1.5">Artificial Delay (ms)</label>
                                    <input v-model.number="selectedMockEndpoint.responseDelayMs" type="number" min="0" max="5000" step="50"
                                        class="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs font-mono text-zinc-200 focus:outline-none focus:border-cyan-500" placeholder="100">
                                </div>
                            </div>

                            <!-- Quick Response Templates -->
                            <div class="space-y-2">
                                <div class="flex items-center justify-between">
                                    <label class="text-xs font-semibold text-zinc-400">Quick Scenario Templates</label>
                                    <div class="flex items-center gap-2 text-[11px]">
                                        <button @click="applyMockTemplate('users')" class="px-2.5 py-1 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-white/5 transition-colors">Users List (200)</button>
                                        <button @click="applyMockTemplate('created')" class="px-2.5 py-1 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-emerald-400 hover:text-emerald-300 border border-white/5 transition-colors">201 Created</button>
                                        <button @click="applyMockTemplate('not_found')" class="px-2.5 py-1 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-amber-400 hover:text-amber-300 border border-white/5 transition-colors">404 Not Found</button>
                                        <button @click="applyMockTemplate('server_error')" class="px-2.5 py-1 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-rose-400 hover:text-rose-300 border border-white/5 transition-colors">500 Server Error</button>
                                    </div>
                                </div>

                                <!-- Response Body Editor -->
                                <div>
                                    <textarea v-model="selectedMockEndpoint.responseBody" rows="10"
                                        class="w-full p-4 rounded-xl bg-zinc-950 border border-zinc-800 text-xs font-mono text-zinc-200 resize-y focus:outline-none focus:border-cyan-500 leading-relaxed"></textarea>
                                </div>
                            </div>

                            <!-- Test Execution Results Card (Live feedback) -->
                            <div v-if="mockTestResult" class="p-4 rounded-2xl bg-[#121624] border border-cyan-500/30 space-y-3">
                                <div class="flex items-center justify-between border-b border-white/10 pb-3">
                                    <div class="flex items-center gap-2">
                                        <span class="inline-flex items-center justify-center shrink-0 w-4 h-4 text-emerald-400" v-html="renderIcon('check-circle-2', 'w-4 h-4 text-emerald-400')"></span>
                                        <span class="text-xs font-bold text-white uppercase tracking-wider">Test Execution Result</span>
                                        <span class="px-2 py-0.5 rounded text-[10px] font-bold font-mono"
                                            :class="mockTestResult.status >= 200 && mockTestResult.status < 300 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'">
                                            {{ mockTestResult.status }} {{ mockTestResult.statusText }}
                                        </span>
                                    </div>

                                    <div class="flex items-center gap-3 text-xs font-mono text-zinc-400">
                                        <span>Latency: <strong class="text-amber-400">{{ mockTestResult.latencyMs }} ms</strong></span>
                                        <span>Size: <strong class="text-indigo-400">{{ mockTestResult.sizeBytes }} B</strong></span>
                                    </div>
                                </div>

                                <pre class="text-xs font-mono text-zinc-200 bg-zinc-950/80 p-3 rounded-xl border border-white/5 overflow-x-auto max-h-60 leading-relaxed">{{ typeof mockTestResult.data === 'object' ? JSON.stringify(mockTestResult.data, null, 2) : mockTestResult.data }}</pre>
                            </div>
                        </div>

                        <div v-else class="lg:col-span-8 flex flex-col items-center justify-center text-center p-8 text-zinc-500">
                            Select an endpoint from the left to configure or test.
                        </div>
                    </div>
                </div>

                <!-- VIEW 9: GraphQL Explorer (100% Parity with React GraphQLExplorer) -->
                <div v-else-if="activeTab && activeTab.type === 'graphql'" class="flex-1 flex flex-col min-h-0 overflow-hidden bg-[#0b0d14] text-zinc-200">
                    <!-- Top Bar -->
                    <div class="p-4 sm:p-5 border-b border-white/10 bg-[#121622] shrink-0 space-y-3">
                        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div class="flex items-center gap-3">
                                <div class="w-10 h-10 rounded-xl bg-gradient-to-tr from-pink-500 to-rose-600 flex items-center justify-center text-white shadow-md shadow-pink-500/20">
                                    <span class="inline-flex items-center justify-center shrink-0 w-5 h-5" v-html="renderIcon('database', 'w-5 h-5')"></span>
                                </div>
                                <div>
                                    <h1 class="text-lg font-bold text-white flex items-center gap-2">
                                        <span>GraphQL Explorer & Schema Inspector</span>
                                        <span class="text-[10px] font-mono px-2 py-0.5 rounded-full bg-pink-500/20 text-pink-400 border border-pink-500/30 font-semibold">GraphQL 16+</span>
                                    </h1>
                                    <p class="text-xs text-zinc-400">Execute structured queries, inspect schemas, pass variables, and debug GraphQL APIs.</p>
                                </div>
                            </div>

                            <div class="flex items-center gap-2">
                                <button @click="introspectGraphQLSchema()" :disabled="graphqlSchemaLoading"
                                    class="px-3.5 py-2 bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-200 hover:text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors">
                                    <span class="inline-flex items-center justify-center shrink-0 w-3.5 h-3.5 text-pink-400" :class="{'animate-spin': graphqlSchemaLoading}" v-html="renderIcon('search', 'w-3.5 h-3.5 text-pink-400')"></span>
                                    <span>{{ graphqlSchemaLoading ? 'Introspecting...' : 'Introspect Schema' }}</span>
                                </button>
                            </div>
                        </div>

                        <!-- GraphQL Endpoint Bar -->
                        <div class="flex flex-col md:flex-row items-stretch md:items-center gap-2">
                            <div class="relative flex-1">
                                <span class="absolute left-3 top-2.5 text-pink-400 font-bold text-xs font-mono">POST</span>
                                <input v-model="graphqlUrl" type="text" placeholder="https://countries.trevorblades.com/"
                                    class="w-full bg-zinc-950/90 border border-zinc-700 rounded-xl pl-16 pr-4 py-2 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-pink-500 font-mono">
                            </div>

                            <button @click="executeGraphQLQuery()" :disabled="graphqlIsLoading"
                                class="px-5 py-2 bg-gradient-to-r from-pink-500 to-rose-600 hover:from-pink-600 hover:to-rose-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-md shadow-pink-500/20 flex items-center gap-2 transition-all shrink-0 cursor-pointer">
                                <span v-if="graphqlIsLoading" class="inline-flex items-center justify-center shrink-0 w-3.5 h-3.5 animate-spin" v-html="renderIcon('loader-2', 'w-3.5 h-3.5 animate-spin')"></span>
                                <span v-else class="inline-flex items-center justify-center shrink-0 w-3.5 h-3.5" v-html="renderIcon('play', 'w-3.5 h-3.5')"></span>
                                <span>Execute Query</span>
                            </button>
                        </div>

                        <!-- Presets Bar -->
                        <div class="flex items-center gap-2 overflow-x-auto text-[11px] pt-1">
                            <span class="text-zinc-500 shrink-0 font-medium">Public Schemas:</span>
                            <button v-for="p in graphqlPresets" :key="p.name" @click="setGraphQLPreset(p)"
                                class="px-2.5 py-1 rounded-lg bg-zinc-800/60 hover:bg-zinc-700/80 border border-white/5 text-zinc-300 hover:text-white transition-colors whitespace-nowrap">
                                {{ p.name }}
                            </button>
                        </div>
                    </div>

                    <!-- Split Area: Query / Variables & Response Output -->
                    <div class="flex-1 grid grid-cols-1 lg:grid-cols-12 min-h-0 overflow-hidden">
                        <!-- Left: Query, Variables, Headers Sub-tabs (6 cols) -->
                        <div class="lg:col-span-6 border-b lg:border-b-0 lg:border-r border-white/10 flex flex-col bg-[#10131e] min-h-[280px] lg:min-h-0">
                            <!-- Tab Bar -->
                            <div class="px-4 py-2 bg-zinc-950/50 border-b border-white/10 flex items-center justify-between shrink-0">
                                <div class="flex items-center gap-2">
                                    <button @click="graphqlSubTab = 'query'" :class="graphqlSubTab === 'query' ? 'bg-pink-500/20 text-pink-400 font-bold border-pink-500/40' : 'text-zinc-400 hover:text-white border-transparent'" class="px-3 py-1 rounded-lg text-xs border transition-colors">Query</button>
                                    <button @click="graphqlSubTab = 'variables'" :class="graphqlSubTab === 'variables' ? 'bg-pink-500/20 text-pink-400 font-bold border-pink-500/40' : 'text-zinc-400 hover:text-white border-transparent'" class="px-3 py-1 rounded-lg text-xs border transition-colors">Variables</button>
                                    <button @click="graphqlSubTab = 'headers'" :class="graphqlSubTab === 'headers' ? 'bg-pink-500/20 text-pink-400 font-bold border-pink-500/40' : 'text-zinc-400 hover:text-white border-transparent'" class="px-3 py-1 rounded-lg text-xs border transition-colors">Headers</button>
                                </div>

                                <span class="text-[10px] font-mono text-zinc-500">Ctrl+Enter to Run</span>
                            </div>

                            <!-- Subtab 1: Query Textarea -->
                            <div v-if="graphqlSubTab === 'query'" class="flex-1 p-3 min-h-0 flex flex-col">
                                <textarea v-model="graphqlQuery" @keydown.enter.ctrl="executeGraphQLQuery" @keydown.enter.meta="executeGraphQLQuery"
                                    class="flex-1 w-full p-4 rounded-xl bg-zinc-950 border border-zinc-800 text-xs font-mono text-pink-200 resize-none focus:outline-none focus:border-pink-500 leading-relaxed"
                                    placeholder="query MyQuery { ... }"></textarea>
                            </div>

                            <!-- Subtab 2: Variables -->
                            <div v-else-if="graphqlSubTab === 'variables'" class="flex-1 p-3 min-h-0 flex flex-col space-y-2">
                                <div class="text-[11px] text-zinc-400">Specify JSON variables referenced as <code>$variableName</code> in your query:</div>
                                <textarea v-model="graphqlVariables"
                                    class="flex-1 w-full p-4 rounded-xl bg-zinc-950 border border-zinc-800 text-xs font-mono text-zinc-200 resize-none focus:outline-none focus:border-pink-500 leading-relaxed"
                                    placeholder="{}"></textarea>
                            </div>

                            <!-- Subtab 3: Headers -->
                            <div v-else-if="graphqlSubTab === 'headers'" class="flex-1 p-3 min-h-0 overflow-y-auto space-y-2">
                                <div class="flex items-center justify-between mb-2">
                                    <span class="text-xs font-semibold text-zinc-400">Request Headers</span>
                                    <button @click="addGraphQLHeader()" class="text-xs text-pink-400 hover:text-pink-300 font-semibold">+ Add Header</button>
                                </div>
                                <div v-for="hdr in graphqlHeaders" :key="hdr.id" class="flex items-center gap-2">
                                    <input v-model="hdr.key" type="text" placeholder="Header Key" class="flex-1 bg-zinc-950 border border-zinc-800 rounded-lg p-2 text-xs font-mono text-zinc-200 focus:border-pink-500">
                                    <input v-model="hdr.value" type="text" placeholder="Header Value" class="flex-1 bg-zinc-950 border border-zinc-800 rounded-lg p-2 text-xs font-mono text-zinc-200 focus:border-pink-500">
                                    <button @click="removeGraphQLHeader(hdr.id)" class="text-zinc-600 hover:text-rose-400 p-1">
                                        <span class="inline-flex items-center justify-center shrink-0 w-3.5 h-3.5" v-html="renderIcon('x', 'w-3.5 h-3.5')"></span>
                                    </button>
                                </div>
                            </div>
                        </div>

                        <!-- Right: Response Viewer & Schema Drawer (6 cols) -->
                        <div class="lg:col-span-6 flex flex-col bg-[#0a0c14] min-h-0 overflow-hidden">
                            <div class="px-4 py-2 bg-zinc-950/50 border-b border-white/10 flex items-center justify-between shrink-0">
                                <div class="flex items-center gap-3">
                                    <span class="text-xs font-bold text-zinc-300 uppercase tracking-wider">Response Data</span>
                                    <span v-if="graphqlResponse" class="px-2 py-0.5 rounded text-[10px] font-mono font-bold"
                                        :class="graphqlResponse.errors ? 'bg-rose-500/20 text-rose-400' : 'bg-emerald-500/20 text-emerald-400'">
                                        {{ graphqlResponse.errors ? 'Errors' : '200 OK' }}
                                    </span>
                                </div>

                                <div class="flex items-center gap-3 text-xs font-mono">
                                    <span v-if="graphqlLatency" class="text-zinc-400">Latency: <strong class="text-amber-400">{{ graphqlLatency }} ms</strong></span>
                                    <span v-if="graphqlSize" class="text-zinc-400">Size: <strong class="text-indigo-400">{{ graphqlSize }} B</strong></span>
                                    <button v-if="graphqlResponse" @click="copyGraphQLResponse()" class="text-zinc-400 hover:text-pink-400 transition-colors">
                                        {{ graphqlCopied ? 'Copied!' : 'Copy' }}
                                    </button>
                                </div>
                            </div>

                            <!-- Schema Types Drawer (Collapsible) -->
                            <div v-if="graphqlShowSchemaDrawer" class="p-3 bg-pink-950/20 border-b border-pink-500/30 max-h-48 overflow-y-auto space-y-2 shrink-0">
                                <div class="flex items-center justify-between">
                                    <span class="text-xs font-bold text-pink-300">Introspected Schema Types ({{ graphqlSchemaTypes.length }})</span>
                                    <button @click="graphqlShowSchemaDrawer = false" class="text-zinc-500 hover:text-zinc-300 text-xs">Close</button>
                                </div>
                                <div class="flex flex-wrap gap-1.5">
                                    <span v-for="t in graphqlSchemaTypes" :key="t.name" class="px-2 py-0.5 rounded bg-zinc-900 border border-white/10 text-[11px] font-mono text-zinc-300" :title="t.description || t.kind">
                                        <span class="text-pink-400 font-semibold">{{ t.name }}</span>
                                        <span class="text-zinc-600 text-[9px] ml-1">({{ t.kind }})</span>
                                    </span>
                                </div>
                            </div>

                            <!-- Response JSON Area -->
                            <div class="flex-1 p-4 overflow-y-auto min-h-0 font-mono text-xs">
                                <div v-if="!graphqlResponse && !graphqlIsLoading" class="h-full flex flex-col items-center justify-center text-center p-8 text-zinc-500 space-y-2">
                                    <span class="inline-flex items-center justify-center shrink-0 w-8 h-8 text-zinc-600" v-html="renderIcon('database', 'w-8 h-8 text-zinc-600')"></span>
                                    <p class="text-xs">No GraphQL response yet.</p>
                                    <p class="text-[11px] text-zinc-600">Click &ldquo;Execute Query&rdquo; above to query the GraphQL server.</p>
                                </div>
                                <div v-else-if="graphqlIsLoading" class="h-full flex items-center justify-center">
                                    <div class="flex items-center gap-2 text-zinc-400">
                                        <span class="inline-flex items-center justify-center shrink-0 w-4 h-4 animate-spin" v-html="renderIcon('loader-2', 'w-4 h-4 animate-spin')"></span>
                                        <span>Resolving GraphQL schema & query...</span>
                                    </div>
                                </div>
                                <pre v-else class="text-zinc-200 leading-relaxed break-all select-text">{{ JSON.stringify(graphqlResponse, null, 2) }}</pre>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- VIEW 10: Collection Monitors & SLA (100% Parity with React CollectionMonitors) -->
                <div v-else-if="activeTab && activeTab.type === 'monitor'" class="flex-1 flex flex-col min-h-0 overflow-y-auto bg-[#0a0c14] text-zinc-200 p-4 sm:p-6 lg:p-8 space-y-6">
                    <!-- Top Header -->
                    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-5">
                        <div class="flex items-center gap-3">
                            <div class="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-600 flex items-center justify-center text-white shadow-lg shadow-emerald-500/20">
                                <span class="inline-flex items-center justify-center shrink-0 w-5 h-5" v-html="renderIcon('activity', 'w-5 h-5')"></span>
                            </div>
                            <div>
                                <h1 class="text-xl font-bold text-white flex items-center gap-2">
                                    <span>Collection Monitors & Uptime SLA</span>
                                    <span class="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-semibold">Continuous Health</span>
                                </h1>
                                <p class="text-xs text-zinc-400">Automated periodic synthetic testing, endpoint uptime tracking, and regression alerts across all environments.</p>
                            </div>
                        </div>

                        <div class="flex items-center gap-2">
                            <button @click="showNewMonitorModal = true"
                                class="px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-500/20 flex items-center gap-1.5 transition-all">
                                <span class="inline-flex items-center justify-center shrink-0 w-3.5 h-3.5" v-html="renderIcon('plus', 'w-3.5 h-3.5')"></span>
                                <span>Create Monitor</span>
                            </button>
                        </div>
                    </div>

                    <!-- Summary Stats Bar -->
                    <div class="grid grid-cols-2 sm:grid-cols-4 gap-4">
                        <div class="p-4 rounded-xl bg-[#121522] border border-white/10">
                            <div class="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">Total Monitors</div>
                            <div class="text-2xl font-bold text-white mt-1">{{ monitors.length }}</div>
                        </div>
                        <div class="p-4 rounded-xl bg-[#121522] border border-white/10">
                            <div class="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">Active Monitoring</div>
                            <div class="text-2xl font-bold text-emerald-400 mt-1">{{ monitors.filter(m => m.status === 'active').length }}</div>
                        </div>
                        <div class="p-4 rounded-xl bg-[#121522] border border-white/10">
                            <div class="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">Overall Uptime</div>
                            <div class="text-2xl font-bold text-teal-400 mt-1">99.92%</div>
                        </div>
                        <div class="p-4 rounded-xl bg-[#121522] border border-white/10">
                            <div class="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">Avg Cluster Latency</div>
                            <div class="text-2xl font-bold text-amber-400 mt-1">84 ms</div>
                        </div>
                    </div>

                    <!-- Monitors List & Detail Grid -->
                    <div class="grid grid-cols-1 lg:grid-cols-12 gap-6">
                        <!-- Left: Monitors Cards (5 cols) -->
                        <div class="lg:col-span-5 space-y-3">
                            <h3 class="text-xs font-bold text-zinc-400 uppercase tracking-wider">Configured Monitors</h3>
                            <div v-for="mon in monitors" :key="mon.id"
                                @click="activeMonitorId = mon.id"
                                class="p-4 rounded-2xl border transition-all cursor-pointer space-y-3"
                                :class="activeMonitorId === mon.id ? 'bg-[#151a2a] border-emerald-500/40 shadow-lg' : 'bg-[#111420] border-white/5 hover:border-white/10'">
                                
                                <div class="flex items-start justify-between gap-3">
                                    <div class="space-y-1">
                                        <div class="text-sm font-bold text-white">{{ mon.name }}</div>
                                        <div class="text-xs text-zinc-400 flex items-center gap-2">
                                            <span class="inline-flex items-center justify-center shrink-0 w-3 h-3 text-orange-400" v-html="renderIcon('folder', 'w-3 h-3 text-orange-400')"></span>
                                            <span>{{ mon.collectionName }}</span>
                                        </div>
                                    </div>

                                    <div class="flex items-center gap-2 shrink-0">
                                        <span class="px-2 py-0.5 rounded text-[10px] font-mono font-bold"
                                            :class="mon.status === 'active' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-zinc-800 text-zinc-400 border border-zinc-700'">
                                            {{ mon.status.toUpperCase() }}
                                        </span>
                                    </div>
                                </div>

                                <div class="grid grid-cols-3 gap-2 pt-2 border-t border-white/5 text-[11px] font-mono">
                                    <div>
                                        <span class="text-zinc-500 block">Schedule:</span>
                                        <span class="text-zinc-200 font-semibold">{{ mon.schedule }}</span>
                                    </div>
                                    <div>
                                        <span class="text-zinc-500 block">Uptime:</span>
                                        <span class="text-emerald-400 font-bold">{{ mon.uptime }}%</span>
                                    </div>
                                    <div>
                                        <span class="text-zinc-500 block">Avg Latency:</span>
                                        <span class="text-amber-400 font-semibold">{{ mon.avgLatencyMs }}ms</span>
                                    </div>
                                </div>

                                <div class="flex items-center justify-between pt-2 border-t border-white/5 text-xs">
                                    <span class="text-zinc-500 text-[11px]">Last run: {{ mon.lastRunTime }}</span>
                                    <div class="flex items-center gap-2">
                                        <button @click.stop="toggleMonitorStatus(mon.id)" class="text-zinc-400 hover:text-white transition-colors">
                                            {{ mon.status === 'active' ? 'Pause' : 'Resume' }}
                                        </button>
                                        <span class="text-zinc-700">|</span>
                                        <button @click.stop="deleteMonitor(mon.id)" class="text-zinc-500 hover:text-rose-400 transition-colors">
                                            Delete
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- Right: Active Monitor Detail & Live Telemetry (7 cols) -->
                        <div v-if="activeMonitor" class="lg:col-span-7 space-y-4">
                            <div class="p-5 rounded-2xl bg-[#121622] border border-white/10 space-y-4">
                                <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-4">
                                    <div>
                                        <h3 class="text-base font-bold text-white">{{ activeMonitor.name }}</h3>
                                        <p class="text-xs text-zinc-400">Target: {{ activeMonitor.collectionName }} &bull; Schedule: Every {{ activeMonitor.schedule }}</p>
                                    </div>

                                    <button @click="runMonitorNow()" :disabled="isRunningMonitor"
                                        class="px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-md shadow-emerald-500/20 flex items-center gap-1.5 transition-all">
                                        <span class="inline-flex items-center justify-center shrink-0 w-3.5 h-3.5" :class="{'animate-spin': isRunningMonitor}" v-html="renderIcon(isRunningMonitor ? 'refresh-cw' : 'play', 'w-3.5 h-3.5')"></span>
                                        <span>{{ isRunningMonitor ? 'Executing Check...' : 'Run Monitor Now' }}</span>
                                    </button>
                                </div>

                                <!-- Recent Telemetry Runs -->
                                <div class="space-y-2">
                                    <span class="text-xs font-bold text-zinc-400 uppercase tracking-wider">Execution History Log</span>
                                    <div class="space-y-2">
                                        <div v-for="run in activeMonitor.history" :key="run.id"
                                            class="p-3 rounded-xl bg-zinc-950/60 border border-white/5 flex items-center justify-between text-xs font-mono">
                                            <div class="flex items-center gap-2.5">
                                                <span class="inline-flex items-center justify-center shrink-0 w-3.5 h-3.5 text-emerald-400" v-html="renderIcon('check-circle-2', 'w-3.5 h-3.5 text-emerald-400')"></span>
                                                <span class="text-zinc-200 font-semibold">{{ run.timestamp }}</span>
                                                <span class="px-1.5 py-0.5 rounded text-[10px] bg-emerald-500/20 text-emerald-400 font-bold">ALL PASS</span>
                                            </div>

                                            <div class="flex items-center gap-4 text-zinc-400">
                                                <span>{{ run.latencyMs }} ms</span>
                                                <span class="text-emerald-400 font-semibold">{{ run.passed }} passed</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Active Request Area (Split Screen RequestBuilder & ResponseViewer - 100% Parity with React) -->
                <div v-else-if="activeRequest" 
                     ref="splitContainerRef"
                     :class="['h-full flex overflow-hidden min-w-0', layoutMode === 'columns' ? 'flex-row' : 'flex-col']">
                    <!-- ========================================== -->
                    <!-- LEFT / TOP HALF: RequestBuilder Component   -->
                    <!-- ========================================== -->
                    <div :style="layoutMode === 'columns' ? { width: splitRatioColumns + '%', height: '100%', flex: 'none' } : { height: splitRatioRows + '%', width: '100%', flex: 'none' }"
                         :class="['overflow-hidden flex flex-col min-w-0 bg-[#11141e]', layoutMode === 'columns' ? 'min-w-[280px] max-w-[calc(100%-200px)]' : 'min-h-[180px] max-h-[calc(100%-140px)]']">
                        <!-- 1. Request Header Top Bar: Name & Actions -->
<div class="p-3 sm:p-4 border-b border-white/10 bg-[#151926] space-y-3 shrink-0">
<div class="flex flex-wrap lg:flex-nowrap items-center justify-between gap-2.5">
                            <div class="flex items-center gap-2 flex-1 min-w-0">
                                <input v-model="activeRequest.name" @input="syncRequestTabTitle" type="text" placeholder="Request Name" 
                                    class="bg-transparent border-none text-xs font-bold text-white placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-orange-500/50 rounded px-1.5 py-0.5 w-full max-w-xs truncate" />
                                <span class="w-1.5 h-1.5 rounded-full bg-orange-400 shrink-0" title="Active Request"></span>
                            </div>

                            <div class="flex items-center gap-1.5 shrink-0">
                                <button type="button" @click="openQuickAuthModal()" class="inline-flex items-center justify-center gap-1.5 h-8 px-2.5 sm:px-3 bg-zinc-800/90 hover:bg-zinc-700/90 border border-zinc-700/60 text-zinc-200 hover:text-white rounded-lg text-xs font-medium transition-all shadow-sm cursor-pointer whitespace-nowrap shrink-0" title="Open Quick Auth presets for OAuth2, API Keys, and Bearer Tokens">
                                    <span class="inline-flex items-center justify-center shrink-0 w-3 h-3 text-orange-400" v-html="renderIcon('zap', 'w-3 h-3 text-orange-400')"></span>
                                    <span>Quick Auth</span>
                                </button>

                                <button type="button" @click="openQuickVarModal()" class="inline-flex items-center justify-center gap-1.5 h-8 px-2.5 sm:px-3 bg-zinc-800/90 hover:bg-zinc-700/90 border border-zinc-700/60 text-zinc-200 hover:text-white rounded-lg text-xs font-medium transition-colors whitespace-nowrap shrink-0" title="Create a new Environment / Global variable">
                                    <span class="inline-flex items-center justify-center shrink-0 w-3 h-3" v-html="renderIcon('plus', 'w-3 h-3')"></span>
                                    <span>Var</span>
                                </button>

                                <button type="button" @click="openShareModal()" class="inline-flex items-center justify-center gap-1.5 h-8 px-2.5 sm:px-3 bg-zinc-800/90 hover:bg-zinc-700/90 border border-zinc-700/60 text-zinc-200 hover:text-white rounded-lg text-xs font-medium transition-colors whitespace-nowrap shrink-0" title="Share this API request via link or cURL">
                                    <span class="inline-flex items-center justify-center shrink-0 w-3 h-3" v-html="renderIcon('share-2', 'w-3 h-3')"></span>
                                    <span>Share</span>
                                </button>

                                <button type="button" @click="openExportCodeModal()" class="inline-flex items-center justify-center gap-1.5 h-8 px-2.5 sm:px-3 bg-zinc-800/90 hover:bg-zinc-700/90 border border-zinc-700/60 text-zinc-200 hover:text-white rounded-lg text-xs font-medium transition-colors whitespace-nowrap shrink-0" title="Export as Code (cURL, Fetch, Python, PHP, Go, C#, Java, etc.)">
                                    <span class="inline-flex items-center justify-center shrink-0 w-3 h-3 text-amber-400" v-html="renderIcon('code-2', 'w-3 h-3 text-amber-400')"></span>
                                    <span>Code</span>
                                </button>
                                
                                <button type="button" @click="saveActiveRequest()" :disabled="isSaving" class="inline-flex items-center justify-center gap-1.5 h-8 px-3.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap shrink-0 shadow-sm bg-orange-500 hover:bg-orange-600 active:bg-orange-700 text-white shadow-orange-500/20 disabled:opacity-50" title="Save request">
                                    <span v-if="isSaving" class="inline-flex items-center justify-center shrink-0 w-3 h-3 animate-spin" v-html="renderIcon('loader-2', 'w-3 h-3 animate-spin')"></span>
                                    <span v-else class="inline-flex items-center justify-center shrink-0 w-3 h-3" v-html="renderIcon('save', 'w-3 h-3')"></span>
                                    <span>{{ isSaving ? 'Saving...' : 'Save' }}</span>
                                </button></div></div><!-- 2. Method & URL Bar + Variable Token Inspection -->
                            <div class="flex items-center gap-2">
                                <select v-model="activeRequest.method" :class="['h-10 font-mono font-bold text-xs px-3 rounded-lg border focus:outline-none appearance-none cursor-pointer pr-6 shrink-0 whitespace-nowrap', getMethodBadgeColor(activeRequest.method)]">
                                    <option value="GET">GET</option>
                                    <option value="POST">POST</option>
                                    <option value="PUT">PUT</option>
                                    <option value="DELETE">DELETE</option>
                                    <option value="PATCH">PATCH</option>
                                    <option value="OPTIONS">OPTIONS</option>
                                    <option value="HEAD">HEAD</option>
                                </select>

                                <div class="relative flex-1">
                                    <input v-model="activeRequest.url" @input="syncUrlParams" @keydown.enter.ctrl="sendActiveRequest" @keydown.enter.meta="sendActiveRequest" type="text" placeholder="Enter request URL or {{baseUrl}}/api/endpoint" 
                                        class="w-full h-10 bg-zinc-900 border border-zinc-700 rounded-lg px-3 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-orange-500 font-mono">
                                </div>

                                <button @click="sendActiveRequest()" :disabled="isLoading" 
                                    class="h-10 px-5 bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 disabled:opacity-50 text-white text-xs font-bold rounded-lg shadow-lg shadow-orange-500/20 inline-flex items-center justify-center gap-2 transition-all shrink-0 cursor-pointer whitespace-nowrap"
                                    title="Send API Request (Ctrl+Enter / Cmd+Enter)">
                                    <span v-if="isLoading" class="inline-flex items-center justify-center shrink-0 w-3.5 h-3.5 animate-spin" v-html="renderIcon('loader-2', 'w-3.5 h-3.5 animate-spin')"></span>
                                    <span v-else class="inline-flex items-center justify-center shrink-0 w-3.5 h-3.5" v-html="renderIcon('send', 'w-3.5 h-3.5')"></span>
                                    <span>{{ isLoading ? 'Sending...' : 'Send' }}</span>
                                </button>
                            </div>

                            <!-- Variable Token Resolution Banner with Bottom Spacer -->
                            <div v-if="resolvedUrl" class="text-[10px] font-mono flex items-center gap-2 flex-wrap px-1 pt-1 pb-3 text-zinc-400">
                                <span class="text-zinc-500">Resolves:</span>
                                <span class="text-emerald-400 truncate max-w-sm">{{ resolvedUrl }}</span>
                                <div v-if="detectedTokensInUrl.length > 0" class="flex items-center gap-1">
                                    <span v-for="token in detectedTokensInUrl" :key="token" class="px-1.5 py-0.2 bg-white/10 text-orange-300 rounded text-[9px] font-mono">
                                        <span v-pre>{{</span>{{ token }}<span v-pre>}}</span>
                                    </span>
                                </div>
                                <span v-if="missingVars.length > 0" class="text-amber-400 flex items-center gap-1">
                                    <span class="inline-flex items-center justify-center shrink-0 w-3 h-3" v-html="renderIcon('alert-circle', 'w-3 h-3')"></span>
                                    <span>Unresolved: {{ missingVars.join(', ') }}</span>
                                </span>
                            </div>
                        </div><!-- 3. Request Sub-Tabs Navigation -->
                        <div class="px-4 border-b border-zinc-800 bg-zinc-900/40 flex items-center gap-1 text-xs shrink-0">
                            <button @click="requestSubTab = 'params'"
                                class="px-3.5 py-2.5 font-medium border-b-2 transition-colors flex items-center gap-1.5"
                                :class="requestSubTab === 'params' ? 'border-orange-500 text-orange-400' : 'border-transparent text-zinc-400 hover:text-white'">
                                <span>Params</span>
                                <span v-if="activeParamsCount > 0" class="px-1.5 py-0.2 bg-white/10 rounded text-[10px] text-zinc-300">
                                    {{ activeParamsCount }}
                                </span>
                            </button>

                            <button @click="requestSubTab = 'auth'"
                                class="px-3.5 py-2.5 font-medium border-b-2 transition-colors flex items-center gap-1.5"
                                :class="requestSubTab === 'auth' ? 'border-orange-500 text-orange-400' : 'border-transparent text-zinc-400 hover:text-white'">
                                <span>Authorization</span>
                                <span v-if="activeRequest.auth && activeRequest.auth.type !== 'none'" class="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                            </button>

                            <button @click="requestSubTab = 'headers'"
                                class="px-3.5 py-2.5 font-medium border-b-2 transition-colors flex items-center gap-1.5"
                                :class="requestSubTab === 'headers' ? 'border-orange-500 text-orange-400' : 'border-transparent text-zinc-400 hover:text-white'">
                                <span>Headers</span>
                                <span v-if="activeHeadersCount > 0" class="px-1.5 py-0.2 bg-white/10 rounded text-[10px] text-zinc-300">
                                    {{ activeHeadersCount }}
                                </span>
                            </button>

                            <button @click="requestSubTab = 'body'"
                                class="px-3.5 py-2.5 font-medium border-b-2 transition-colors flex items-center gap-1.5"
                                :class="requestSubTab === 'body' ? 'border-orange-500 text-orange-400' : 'border-transparent text-zinc-400 hover:text-white'">
                                <span>Body</span>
                                <span v-if="hasBodyContent" class="w-1.5 h-1.5 rounded-full bg-orange-400"></span>
                            </button>

                            <button @click="requestSubTab = 'tests'"
                                class="px-3.5 py-2.5 font-medium border-b-2 transition-colors flex items-center gap-1.5"
                                :class="requestSubTab === 'tests' ? 'border-orange-500 text-orange-400' : 'border-transparent text-zinc-400 hover:text-white'">
                                <span>Tests</span>
                                <span v-if="activeRequest.testsScript && activeRequest.testsScript.trim()" class="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                            </button>
                        </div>

                        <!-- 4. Sub-Tab Panels (Full Remaining Height) -->
                        <div class="flex-1 overflow-y-auto p-4 bg-zinc-950/60 font-sans text-xs min-h-0">
                            <!-- TAB: PARAMS -->
                            <div v-show="requestSubTab === 'params'" class="space-y-3 flex flex-col h-full">
                                <div class="flex items-center justify-between mb-1">
                                    <span class="text-zinc-400 font-semibold text-[11px] uppercase tracking-wider">Query Parameters</span>
                                    <div class="flex items-center gap-2">
                                        <button type="button" @click="toggleParamsBulkMode()" class="text-zinc-400 hover:text-white font-semibold text-xs flex items-center gap-1 transition-colors">
                                            <span>{{ paramsBulkMode ? 'Key-Value Edit' : 'Bulk Edit' }}</span>
                                        </button>
                                        <button v-if="!paramsBulkMode" type="button" @click="addParamRow()" class="text-orange-400 hover:text-orange-300 font-semibold text-xs flex items-center gap-1 transition-colors">
                                            <span class="inline-flex items-center justify-center shrink-0 w-3 h-3" v-html="renderIcon('plus', 'w-3 h-3')"></span>
                                            <span>Add Parameter</span>
                                        </button>
                                    </div>
                                </div>
                                <div v-if="!paramsBulkMode" class="border border-zinc-800 rounded-lg overflow-x-auto bg-zinc-900/60 flex-1 overflow-y-auto">
                                    <div class="min-w-[500px]">
                                        <div class="grid grid-cols-12 gap-2 px-3 py-2 bg-zinc-900 border-b border-zinc-800 font-semibold text-zinc-400 text-[11px] uppercase sticky top-0 z-10">
                                            <div class="col-span-1 text-center">Use</div>
                                            <div class="col-span-3">Key</div>
                                            <div class="col-span-4">Value</div>
                                            <div class="col-span-3">Description</div>
                                            <div class="col-span-1 text-center">Action</div>
                                        </div>
                                        <div class="divide-y divide-zinc-800/80">
                                            <div v-for="(param, idx) in activeRequest.params" :key="idx" class="grid grid-cols-12 gap-2 px-3 py-1.5 items-center hover:bg-zinc-800/20 group">
                                                <div class="col-span-1 flex justify-center">
                                                    <input type="checkbox" v-model="param.enabled" @change="syncParamsToUrl" class="rounded bg-zinc-900 border-zinc-700 text-orange-500 focus:ring-0 cursor-pointer">
                                                </div>
                                                <div class="col-span-3">
                                                    <input type="text" v-model="param.key" @input="syncParamsToUrl" placeholder="Key" class="w-full bg-transparent border border-transparent rounded px-2 py-1 text-xs text-zinc-200 focus:border-orange-500 focus:bg-zinc-950 font-mono transition-colors">
                                                </div>
                                                <div class="col-span-4">
                                                    <input type="text" v-model="param.value" @input="syncParamsToUrl" placeholder="Value" class="w-full bg-transparent border border-transparent rounded px-2 py-1 text-xs text-zinc-200 focus:border-orange-500 focus:bg-zinc-950 font-mono transition-colors">
                                                </div>
                                                <div class="col-span-3">
                                                    <input type="text" v-model="param.description" placeholder="Description" class="w-full bg-transparent border border-transparent rounded px-2 py-1 text-xs text-zinc-400 focus:border-orange-500 focus:bg-zinc-950 focus:text-zinc-200 transition-colors">
                                                </div>
                                                <div class="col-span-1 flex justify-center">
                                                    <button type="button" @click="removeParamRow(idx)" class="p-1 text-zinc-500 hover:text-rose-400 opacity-0 group-hover:opacity-100 transition-opacity"><span class="inline-flex items-center justify-center shrink-0 w-3.5 h-3.5" v-html="renderIcon('trash-2', 'w-3.5 h-3.5')"></span></button>
                                                </div>
                                            </div>
                                            <div v-if="!activeRequest.params || activeRequest.params.length === 0" class="p-4 text-center text-zinc-500 text-xs">
                                                No query parameters. Click "+ Add Parameter" above or append <code class="text-orange-400">?key=value</code> to the URL.
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div v-else class="flex-1 min-h-[220px]">
                                    <textarea v-model="paramsBulkText" placeholder="key: value // description" class="w-full h-full bg-zinc-900/90 border border-zinc-800 rounded-lg p-3 text-xs text-emerald-300 font-mono focus:border-orange-500 resize-none leading-relaxed"></textarea>
                                </div>
                            </div>

                            <!-- TAB: AUTHORIZATION -->
                            <div v-show="requestSubTab === 'auth'" class="space-y-4 max-w-2xl">
                                <!-- 1-Click Presets Strip -->
                                <div class="p-3 rounded-xl bg-gradient-to-r from-orange-500/10 via-amber-500/5 to-transparent border border-orange-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                                    <div class="flex items-center gap-2">
                                        <div class="p-1.5 rounded-lg bg-orange-500/20 text-orange-400">
                                            <span class="inline-flex items-center justify-center shrink-0 w-4 h-4" v-html="renderIcon('zap', 'w-4 h-4')"></span>
                                        </div>
                                        <div>
                                            <div class="text-xs font-bold text-white flex items-center gap-1.5">
                                                <span>Quick Auth Presets</span>
                                                <span class="text-[10px] text-orange-400 font-mono bg-orange-500/10 px-1.5 py-0.2 rounded border border-orange-500/20">1-Click</span>
                                            </div>
                                            <p class="text-[11px] text-zinc-400">Inject OAuth2, OpenAI, Claude, X-API-Key, or Query Key presets</p>
                                        </div>
                                    </div>
                                    <div class="flex items-center gap-1.5 flex-wrap">
                                        <button type="button" @click="applyQuickAuthPresetById('oauth2_bearer')" class="px-2 py-1 rounded bg-zinc-900 hover:bg-orange-500/20 text-[11px] font-medium text-zinc-300 hover:text-orange-300 border border-zinc-800 transition-colors">OAuth 2.0</button>
                                        <button type="button" @click="applyQuickAuthPresetById('openai_api_key')" class="px-2 py-1 rounded bg-zinc-900 hover:bg-emerald-500/20 text-[11px] font-medium text-zinc-300 hover:text-emerald-300 border border-zinc-800 transition-colors">OpenAI</button>
                                        <button type="button" @click="applyQuickAuthPresetById('anthropic_api_key')" class="px-2 py-1 rounded bg-zinc-900 hover:bg-amber-500/20 text-[11px] font-medium text-zinc-300 hover:text-amber-300 border border-zinc-800 transition-colors">Claude</button>
                                        <button type="button" @click="applyQuickAuthPresetById('standard_x_api_key')" class="px-2 py-1 rounded bg-zinc-900 hover:bg-blue-500/20 text-[11px] font-medium text-zinc-300 hover:text-blue-300 border border-zinc-800 transition-colors">X-API-Key</button>
                                        <button type="button" @click="openQuickAuthModal()" class="px-2.5 py-1 bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white font-bold rounded text-xs flex items-center gap-1 shadow-sm transition-all cursor-pointer">
                                            <span class="inline-flex items-center justify-center shrink-0 w-3.5 h-3.5" v-html="renderIcon('sparkles', 'w-3.5 h-3.5')"></span>
                                            <span>All Presets...</span>
                                        </button>
                                    </div>
                                </div>

                                <!-- Auth Type Selector -->
                                <div class="flex items-center gap-3">
                                    <label class="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Type:</label>
                                    <select v-model="activeRequest.auth.type" class="bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-1.5 text-xs text-zinc-200 focus:border-orange-500 font-medium cursor-pointer">
                                        <option value="none">No Auth</option>
                                        <option value="bearer">Bearer Token</option>
                                        <option value="oauth2">OAuth 2.0</option>
                                        <option value="apiKey">API Key (Header / Query)</option>
                                        <option value="basic">Basic Auth</option>
                                    </select>
                                </div>

                                <!-- Bearer Token Details -->
                                <div v-if="activeRequest.auth.type === 'bearer'" class="p-3.5 bg-zinc-900/60 border border-zinc-800/80 rounded-xl space-y-2">
                                    <label class="block text-xs font-semibold text-zinc-400">Bearer Token</label>
                                    <input v-model="activeRequest.auth.bearerToken" type="text" placeholder="e.g. {{apiKey}} or eyJhbGci..." class="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2 text-xs text-zinc-200 font-mono focus:border-orange-500">
                                    <p class="text-[11px] text-zinc-500">Automatically appends <code class="text-orange-400 font-mono">Authorization: Bearer &lt;token&gt;</code> to request headers.</p>
                                </div>

                                <!-- API Key Details -->
                                <div v-if="activeRequest.auth.type === 'apiKey'" class="p-3.5 bg-zinc-900/60 border border-zinc-800/80 rounded-xl space-y-3">
                                    <div class="grid grid-cols-2 gap-3">
                                        <div>
                                            <label class="block text-xs font-semibold text-zinc-400 mb-1">Key Name</label>
                                            <input v-model="activeRequest.auth.apiKeyName" type="text" placeholder="e.g. X-API-Key or api_key" class="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2 text-xs text-zinc-200 font-mono focus:border-orange-500">
                                        </div>
                                        <div>
                                            <label class="block text-xs font-semibold text-zinc-400 mb-1">Key Value</label>
                                            <input v-model="activeRequest.auth.apiKeyValue" type="text" placeholder="e.g. {{apiKey}} or sk_live_..." class="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2 text-xs text-zinc-200 font-mono focus:border-orange-500">
                                        </div>
                                    </div>
                                    <div>
                                        <label class="block text-xs font-semibold text-zinc-400 mb-1">Add To</label>
                                        <div class="flex items-center gap-4">
                                            <label class="flex items-center gap-1.5 text-xs text-zinc-300 cursor-pointer">
                                                <input type="radio" v-model="activeRequest.auth.apiKeyAddTo" value="header" class="text-orange-500 focus:ring-0">
                                                <span>Header</span>
                                            </label>
                                            <label class="flex items-center gap-1.5 text-xs text-zinc-300 cursor-pointer">
                                                <input type="radio" v-model="activeRequest.auth.apiKeyAddTo" value="query" class="text-orange-500 focus:ring-0">
                                                <span>Query Params</span>
                                            </label>
                                        </div>
                                    </div>
                                </div>

                                <!-- Basic Auth Details -->
                                <div v-if="activeRequest.auth.type === 'basic'" class="p-3.5 bg-zinc-900/60 border border-zinc-800/80 rounded-xl space-y-3">
                                    <div class="grid grid-cols-2 gap-3">
                                        <div>
                                            <label class="block text-xs font-semibold text-zinc-400 mb-1">Username</label>
                                            <input v-model="activeRequest.auth.basicUsername" type="text" placeholder="e.g. {{username}} or admin" class="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2 text-xs text-zinc-200 font-mono focus:border-orange-500">
                                        </div>
                                        <div>
                                            <label class="block text-xs font-semibold text-zinc-400 mb-1">Password</label>
                                            <input v-model="activeRequest.auth.basicPassword" type="password" placeholder="e.g. {{password}} or secret" class="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2 text-xs text-zinc-200 font-mono focus:border-orange-500">
                                        </div>
                                    </div>
                                    <p class="text-[11px] text-zinc-500">Generates base64 encoded <code class="text-orange-400 font-mono">Authorization: Basic &lt;base64&gt;</code> header.</p>
                                </div>

                                <!-- OAuth 2.0 Details -->
                                <div v-if="activeRequest.auth.type === 'oauth2'" class="p-4 bg-zinc-900/80 border border-zinc-800/90 rounded-xl space-y-4">
                                    <!-- Header banner & Preset selector -->
                                    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-3 border-b border-zinc-800">
                                        <div>
                                            <div class="flex items-center gap-2">
                                                <span class="text-xs font-bold text-white flex items-center gap-1.5">
                                                    <span class="w-2 h-2 rounded-full bg-orange-500"></span>
                                                    OAuth 2.0 Authorization Engine
                                                </span>
                                                <span class="px-2 py-0.5 rounded-full bg-orange-500/10 text-orange-400 border border-orange-500/20 text-[10px] font-mono">
                                                    PHP Native cURL
                                                </span>
                                            </div>
                                            <p class="text-[11px] text-zinc-400 mt-0.5">Automated token retrieval flow for client credentials, password, and refresh tokens.</p>
                                        </div>
                                        <!-- Quick Template Presets -->
                                        <div class="flex items-center gap-1.5 flex-wrap">
                                            <span class="text-[11px] text-zinc-500 mr-1">Presets:</span>
                                            <button type="button" @click="setOAuthPreset('mock')" class="px-2 py-1 rounded bg-zinc-800 hover:bg-orange-500/20 text-[11px] font-medium text-zinc-300 hover:text-orange-300 border border-zinc-700/60 transition-colors">Mock Server</button>
                                            <button type="button" @click="setOAuthPreset('auth0')" class="px-2 py-1 rounded bg-zinc-800 hover:bg-indigo-500/20 text-[11px] font-medium text-zinc-300 hover:text-indigo-300 border border-zinc-700/60 transition-colors">Auth0 M2M</button>
                                            <button type="button" @click="setOAuthPreset('google')" class="px-2 py-1 rounded bg-zinc-800 hover:bg-blue-500/20 text-[11px] font-medium text-zinc-300 hover:text-blue-300 border border-zinc-700/60 transition-colors">Google</button>
                                            <button type="button" @click="setOAuthPreset('azure')" class="px-2 py-1 rounded bg-zinc-800 hover:bg-cyan-500/20 text-[11px] font-medium text-zinc-300 hover:text-cyan-300 border border-zinc-700/60 transition-colors">Azure AD</button>
                                            <button type="button" @click="setOAuthPreset('github')" class="px-2 py-1 rounded bg-zinc-800 hover:bg-purple-500/20 text-[11px] font-medium text-zinc-300 hover:text-purple-300 border border-zinc-700/60 transition-colors">GitHub</button>
                                        </div>
                                    </div>

                                    <!-- Grant Type & Client Authentication -->
                                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        <div>
                                            <label class="block text-xs font-semibold text-zinc-300 mb-1">Grant Type</label>
                                            <select v-model="activeRequest.auth.grantType" class="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2 text-xs text-zinc-200 focus:border-orange-500">
                                                <option value="client_credentials">Client Credentials (Machine to Machine)</option>
                                                <option value="password">Resource Owner Password</option>
                                                <option value="refresh_token">Refresh Token</option>
                                                <option value="authorization_code">Authorization Code</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label class="block text-xs font-semibold text-zinc-300 mb-1">Client Authentication</label>
                                            <select v-model="activeRequest.auth.clientAuth" class="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2 text-xs text-zinc-200 focus:border-orange-500">
                                                <option value="body">Send credentials in request body</option>
                                                <option value="basic">Send as Basic Auth header</option>
                                            </select>
                                        </div>
                                    </div>

                                    <!-- Access Token URL with Built-in Mock Server shortcut -->
                                    <div>
                                        <div class="flex items-center justify-between mb-1">
                                            <label class="block text-xs font-semibold text-zinc-300">Access Token URL <span class="text-rose-400">*</span></label>
                                            <button type="button" @click="activeRequest.auth.accessTokenUrl = 'api?action=oauth2_token'" class="text-[11px] text-orange-400 hover:text-orange-300 flex items-center gap-1 font-medium">
                                                <span class="inline-flex items-center justify-center shrink-0 w-3 h-3" v-html="renderIcon('zap', 'w-3 h-3')"></span>
                                                <span>Use Built-in PHP Token Server</span>
                                            </button>
                                        </div>
                                        <input v-model="activeRequest.auth.accessTokenUrl" type="text" placeholder="https://auth.yourdomain.com/oauth/token or api.php?action=oauth2_token" class="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2 text-xs text-zinc-200 font-mono focus:border-orange-500">
                                        <p class="text-[11px] text-zinc-500 mt-1">Supports variable syntax e.g. <code class="text-orange-400">{{tokenUrl}}</code> or internal relative path <code class="text-zinc-400">api.php?action=oauth2_token</code>.</p>
                                    </div>

                                    <!-- Client ID & Client Secret -->
                                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        <div>
                                            <label class="block text-xs font-semibold text-zinc-300 mb-1">Client ID</label>
                                            <input v-model="activeRequest.auth.clientId" type="text" placeholder="e.g. {{clientId}} or 0oa4b..." class="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2 text-xs text-zinc-200 font-mono focus:border-orange-500">
                                        </div>
                                        <div>
                                            <div class="flex items-center justify-between mb-1">
                                                <label class="block text-xs font-semibold text-zinc-300">Client Secret</label>
                                                <button type="button" @click="showOAuthSecret = !showOAuthSecret" class="text-[11px] text-zinc-400 hover:text-white">
                                                    {{ showOAuthSecret ? 'Hide' : 'Show' }}
                                                </button>
                                            </div>
                                            <input v-model="activeRequest.auth.clientSecret" :type="showOAuthSecret ? 'text' : 'password'" placeholder="e.g. {{clientSecret}} or sec_..." class="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2 text-xs text-zinc-200 font-mono focus:border-orange-500">
                                        </div>
                                    </div>

                                    <!-- Scope & Audience / Header Prefix -->
                                    <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                        <div class="sm:col-span-1">
                                            <label class="block text-xs font-semibold text-zinc-300 mb-1">Scope</label>
                                            <input v-model="activeRequest.auth.scope" type="text" placeholder="e.g. read:users offline_access" class="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2 text-xs text-zinc-200 font-mono focus:border-orange-500">
                                        </div>
                                        <div class="sm:col-span-1">
                                            <label class="block text-xs font-semibold text-zinc-300 mb-1">Audience</label>
                                            <input v-model="activeRequest.auth.audience" type="text" placeholder="e.g. https://api.mycompany.com" class="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2 text-xs text-zinc-200 font-mono focus:border-orange-500">
                                        </div>
                                        <div class="sm:col-span-1">
                                            <label class="block text-xs font-semibold text-zinc-300 mb-1">Header Prefix</label>
                                            <input v-model="activeRequest.auth.oauth2HeaderPrefix" type="text" placeholder="Bearer" class="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2 text-xs text-zinc-200 font-mono focus:border-orange-500">
                                        </div>
                                    </div>

                                    <!-- Conditional Password Fields -->
                                    <div v-if="activeRequest.auth.grantType === 'password'" class="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-zinc-950/60 border border-zinc-800/80 rounded-lg">
                                        <div>
                                            <label class="block text-xs font-semibold text-zinc-300 mb-1">Username</label>
                                            <input v-model="activeRequest.auth.username" type="text" placeholder="e.g. {{username}}" class="w-full bg-zinc-900 border border-zinc-700 rounded-lg p-2 text-xs text-zinc-200 font-mono focus:border-orange-500">
                                        </div>
                                        <div>
                                            <label class="block text-xs font-semibold text-zinc-300 mb-1">Password</label>
                                            <input v-model="activeRequest.auth.password" type="password" placeholder="e.g. {{password}}" class="w-full bg-zinc-900 border border-zinc-700 rounded-lg p-2 text-xs text-zinc-200 font-mono focus:border-orange-500">
                                        </div>
                                    </div>

                                    <!-- Conditional Refresh Token Field -->
                                    <div v-if="activeRequest.auth.grantType === 'refresh_token'" class="p-3 bg-zinc-950/60 border border-zinc-800/80 rounded-lg">
                                        <label class="block text-xs font-semibold text-zinc-300 mb-1">Refresh Token</label>
                                        <input v-model="activeRequest.auth.refreshToken" type="text" placeholder="e.g. {{refreshToken}} or eyJ..." class="w-full bg-zinc-900 border border-zinc-700 rounded-lg p-2 text-xs text-zinc-200 font-mono focus:border-orange-500">
                                    </div>

                                    <!-- Token Retrieval Action Button & Status -->
                                    <div class="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                        <button 
                                            type="button" 
                                            @click="requestOAuth2TokenPhp()" 
                                            :disabled="isRetrievingOAuthToken" 
                                            class="px-4 py-2.5 bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 disabled:opacity-50 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 shadow-lg shadow-orange-500/20 transition-all cursor-pointer">
                                            <span v-if="isRetrievingOAuthToken" class="inline-flex items-center justify-center shrink-0 w-4 h-4 animate-spin" v-html="renderIcon('refresh-cw', 'w-4 h-4 animate-spin')"></span>
                                            <span v-else class="inline-flex items-center justify-center shrink-0 w-4 h-4" v-html="renderIcon('zap', 'w-4 h-4')"></span>
                                            <span>{{ isRetrievingOAuthToken ? 'Retrieving Token via PHP...' : 'Get New Access Token' }}</span>
                                        </button>

                                        <span class="text-[11px] text-zinc-500">
                                            Automated token injection into <code class="text-orange-400 font-mono">Authorization: Bearer &lt;token&gt;</code>
                                        </span>
                                    </div>

                                    <!-- Error Alert Banner -->
                                    <div v-if="oauthTokenError" class="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2.5">
                                        <span class="inline-flex items-center justify-center shrink-0 w-4 h-4 text-rose-400 mt-0.5" v-html="renderIcon('alert-triangle', 'w-4 h-4 text-rose-400')"></span>
                                        <div class="flex-1 min-w-0">
                                            <div class="font-bold text-rose-200">{{ oauthTokenError.error }}</div>
                                            <div class="text-[11px] text-rose-300/90 mt-0.5 break-words">{{ oauthTokenError.description }}</div>
                                        </div>
                                        <button type="button" @click="oauthTokenError = null" class="text-rose-400 hover:text-white p-0.5">&times;</button>
                                    </div>

                                    <!-- Success Alert Banner -->
                                    <div v-if="oauthTokenSuccess" class="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center justify-between gap-2">
                                        <div class="flex items-center gap-2">
                                            <span class="inline-flex items-center justify-center shrink-0 w-4 h-4 text-emerald-400" v-html="renderIcon('check-circle-2', 'w-4 h-4 text-emerald-400')"></span>
                                            <span>{{ oauthTokenSuccess.message }} <span v-if="oauthTokenSuccess.time" class="text-emerald-400/70 font-mono text-[10px]">({{ oauthTokenSuccess.time }}ms)</span></span>
                                        </div>
                                        <button type="button" @click="oauthTokenSuccess = null" class="text-emerald-400 hover:text-white p-0.5">&times;</button>
                                    </div>

                                    <!-- Active Token Management Card -->
                                    <div v-if="activeRequest.auth.oauth2Token" class="p-3.5 bg-zinc-950 border border-zinc-800 rounded-xl space-y-2.5">
                                        <div class="flex items-center justify-between">
                                            <div class="flex items-center gap-2">
                                                <span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                                                <span class="text-xs font-bold text-zinc-200">Active Access Token</span>
                                                <span v-if="activeRequest.auth.oauth2ExpiresAt" class="px-2 py-0.2 rounded-full bg-zinc-900 border border-zinc-700 text-[10px] text-zinc-400 font-mono">
                                                    Token Active
                                                </span>
                                            </div>
                                            <div class="flex items-center gap-1.5">
                                                <button type="button" @click="copyOAuthToken()" class="px-2 py-1 rounded bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-xs text-zinc-300 hover:text-white flex items-center gap-1 transition-colors">
                                                    <span class="inline-flex items-center justify-center shrink-0 w-3 h-3" v-html="renderIcon(copiedOAuthToken ? 'check' : 'copy', 'w-3 h-3')"></span>
                                                    <span>{{ copiedOAuthToken ? 'Copied!' : 'Copy' }}</span>
                                                </button>
                                                <button type="button" @click="saveOAuthTokenToVar('accessToken')" class="px-2 py-1 rounded bg-zinc-900 hover:bg-orange-500/20 border border-zinc-800 hover:border-orange-500/30 text-xs text-orange-300 flex items-center gap-1 transition-colors" title="Save token to {{accessToken}} environment variable">
                                                    <span class="inline-flex items-center justify-center shrink-0 w-3 h-3" v-html="renderIcon('key', 'w-3 h-3')"></span>
                                                    <span>{{ savedOAuthToVar ? 'Saved!' : 'Save to Var' }}</span>
                                                </button>
                                                <button type="button" @click="clearOAuthToken()" class="p-1 rounded hover:bg-rose-500/20 text-zinc-400 hover:text-rose-300 transition-colors" title="Clear Token">
                                                    <span class="inline-flex items-center justify-center shrink-0 w-3.5 h-3.5" v-html="renderIcon('trash-2', 'w-3.5 h-3.5')"></span>
                                                </button>
                                            </div>
                                        </div>

                                        <div class="p-2 rounded bg-zinc-900 border border-zinc-800/80 font-mono text-xs text-zinc-300 break-all select-all max-h-24 overflow-y-auto">
                                            {{ activeRequest.auth.oauth2Token }}
                                        </div>

                                        <div v-if="activeRequest.auth.oauth2RawResponse" class="pt-1">
                                            <button type="button" @click="showOAuthRawResponse = !showOAuthRawResponse" class="text-[11px] text-zinc-500 hover:text-zinc-300 flex items-center gap-1">
                                                <span>{{ showOAuthRawResponse ? 'Hide Raw OAuth Response' : 'View Raw OAuth Response JSON' }}</span>
                                            </button>
                                            <div v-if="showOAuthRawResponse" class="mt-2 p-2 rounded bg-zinc-900/90 border border-zinc-800 text-[11px] font-mono text-zinc-400 overflow-x-auto max-h-40">
                                                <pre>{{ JSON.stringify(activeRequest.auth.oauth2RawResponse, null, 2) }}</pre>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <!-- TAB: HEADERS -->
                            <div v-show="requestSubTab === 'headers'" class="space-y-3 flex flex-col h-full">
                                <div class="flex items-center justify-between mb-1">
                                    <span class="text-zinc-400 font-semibold text-[11px] uppercase tracking-wider">Request Headers</span>
                                    <div class="flex items-center gap-2">
                                        <button type="button" @click="toggleHeadersBulkMode()" class="text-zinc-400 hover:text-white font-semibold text-xs flex items-center gap-1 transition-colors">
                                            <span>{{ headersBulkMode ? 'Key-Value Edit' : 'Bulk Edit' }}</span>
                                        </button>
                                        <button v-if="!headersBulkMode" type="button" @click="addHeaderRow()" class="text-orange-400 hover:text-orange-300 font-semibold text-xs flex items-center gap-1 transition-colors">
                                            <span class="inline-flex items-center justify-center shrink-0 w-3 h-3" v-html="renderIcon('plus', 'w-3 h-3')"></span>
                                            <span>Add Header</span>
                                        </button>
                                    </div>
                                </div>
                                <div v-if="!headersBulkMode" class="border border-zinc-800 rounded-lg overflow-x-auto bg-zinc-900/60 flex-1 overflow-y-auto">
                                    <div class="min-w-[500px]">
                                        <div class="grid grid-cols-12 gap-2 px-3 py-2 bg-zinc-900 border-b border-zinc-800 font-semibold text-zinc-400 text-[11px] uppercase sticky top-0 z-10">
                                            <div class="col-span-1 text-center">Use</div>
                                            <div class="col-span-3">Header Key</div>
                                            <div class="col-span-4">Header Value</div>
                                            <div class="col-span-3">Description</div>
                                            <div class="col-span-1 text-center">Action</div>
                                        </div>
                                        <div class="divide-y divide-zinc-800/80">
                                            <div v-for="(h, idx) in activeRequest.headers" :key="idx" class="grid grid-cols-12 gap-2 px-3 py-1.5 items-center hover:bg-zinc-800/20 group">
                                                <div class="col-span-1 flex justify-center">
                                                    <input type="checkbox" v-model="h.enabled" class="rounded bg-zinc-900 border-zinc-700 text-orange-500 focus:ring-0 cursor-pointer">
                                                </div>
                                                <div class="col-span-3">
                                                    <input type="text" v-model="h.key" placeholder="e.g. Content-Type" class="w-full bg-transparent border border-transparent rounded px-2 py-1 text-xs text-zinc-200 focus:border-orange-500 focus:bg-zinc-950 font-mono transition-colors">
                                                </div>
                                                <div class="col-span-4">
                                                    <input type="text" v-model="h.value" placeholder="e.g. application/json" class="w-full bg-transparent border border-transparent rounded px-2 py-1 text-xs text-zinc-200 focus:border-orange-500 focus:bg-zinc-950 font-mono transition-colors">
                                                </div>
                                                <div class="col-span-3">
                                                    <input type="text" v-model="h.description" placeholder="Description" class="w-full bg-transparent border border-transparent rounded px-2 py-1 text-xs text-zinc-400 focus:border-orange-500 focus:bg-zinc-950 focus:text-zinc-200 transition-colors">
                                                </div>
                                                <div class="col-span-1 flex justify-center">
                                                    <button type="button" @click="removeHeaderRow(idx)" class="p-1 text-zinc-500 hover:text-rose-400 opacity-0 group-hover:opacity-100 transition-opacity"><span class="inline-flex items-center justify-center shrink-0 w-3.5 h-3.5" v-html="renderIcon('trash-2', 'w-3.5 h-3.5')"></span></button>
                                                </div>
                                            </div>
                                            <div v-if="!activeRequest.headers || activeRequest.headers.length === 0" class="p-4 text-center text-zinc-500 text-xs">
                                                No headers configured. Click "+ Add Header" above.
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div v-else class="flex-1 min-h-[220px]">
                                    <textarea v-model="headersBulkText" placeholder="key: value // description" class="w-full h-full bg-zinc-900/90 border border-zinc-800 rounded-lg p-3 text-xs text-emerald-300 font-mono focus:border-orange-500 resize-none leading-relaxed"></textarea>
                                </div>
                            </div>

                            <!-- TAB: BODY -->
                            <div v-show="requestSubTab === 'body'" class="h-full flex flex-col space-y-3">
                                <div class="flex items-center justify-between border-b border-zinc-800/80 pb-2">
                                    <div class="flex items-center gap-2">
                                        <div class="relative">
                                            <select v-model="primaryBodyType" class="appearance-none bg-zinc-800/50 hover:bg-zinc-800 border border-zinc-700 rounded py-1 pl-2.5 pr-7 text-[11px] text-zinc-300 focus:outline-none focus:border-orange-500 cursor-pointer shadow-sm transition-colors font-mono">
                                                <option value="none">none</option>
                                                <option value="form-data">form-data</option>
                                                <option value="x-www-form-urlencoded">x-www-form-urlencoded</option>
                                                <option value="raw">raw</option>
                                                <option value="binary">binary</option>
                                                <option value="graphql">GraphQL</option>
                                            </select>
                                            <div class="pointer-events-none absolute inset-y-0 right-0 flex items-center px-1.5 text-zinc-400">
                                                <span class="w-3.5 h-3.5" v-html="renderIcon('chevron-down', 'w-3.5 h-3.5')"></span>
                                            </div>
                                        </div>
                                        
                                        <div v-if="primaryBodyType === 'raw'" class="relative">
                                            <select v-model="rawBodyFormat" class="appearance-none bg-transparent hover:bg-zinc-800/50 border border-transparent rounded py-1 pl-2.5 pr-6 text-[11px] text-orange-400 focus:outline-none cursor-pointer transition-colors font-mono">
                                                <option value="Text">Text</option>
                                                <option value="JavaScript">JavaScript</option>
                                                <option value="JSON">JSON</option>
                                                <option value="HTML">HTML</option>
                                                <option value="XML">XML</option>
                                            </select>
                                            <div class="pointer-events-none absolute inset-y-0 right-0 flex items-center px-1 text-orange-400">
                                                <span class="w-3 h-3" v-html="renderIcon('chevron-down', 'w-3 h-3')"></span>
                                            </div>
                                        </div>
                                    </div>
                                    <button v-if="activeRequest.body.type === 'json' || rawBodyFormat === 'JSON'" type="button" @click="formatJsonBody()" class="px-2.5 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-orange-300 text-[10px] uppercase tracking-wider font-semibold border border-zinc-700 transition-colors flex items-center gap-1.5">
                                        <span class="w-3 h-3" v-html="renderIcon('sparkles', 'w-3 h-3')"></span>
                                        Beautify
                                    </button>
                                </div>
                                <div v-if="activeRequest.body.type === 'json' || activeRequest.body.type === 'raw'" class="flex-1 min-h-[220px]">
                                    <textarea v-model="activeRequest.body.rawText" :placeholder="activeRequest.body.type === 'json' ? 'Enter JSON payload...' : 'Enter raw text payload...'" class="w-full h-full min-h-[220px] bg-zinc-900/90 border border-zinc-800 rounded-lg p-3 text-xs text-emerald-300 font-mono focus:border-orange-500 resize-none leading-relaxed"></textarea>
                                </div>
                                <div v-else-if="activeRequest.body.type === 'x-www-form-urlencoded'" class="flex-1 min-h-[220px] flex flex-col">
                                    <div class="flex items-center justify-between mb-2">
                                        <span class="text-[11px] text-zinc-500 font-medium">URL-Encoded Form Variables</span>
                                        <div class="flex items-center gap-2">
                                            <button type="button" @click="toggleUrlEncodedBulkMode()" class="text-zinc-400 hover:text-white font-semibold text-xs flex items-center gap-1 transition-colors">
                                                <span>{{ urlEncodedBulkMode ? 'Key-Value Edit' : 'Bulk Edit' }}</span>
                                            </button>
                                            <button v-if="!urlEncodedBulkMode" type="button" @click="addUrlEncodedRow()" class="text-orange-400 hover:text-orange-300 font-semibold text-xs flex items-center gap-1 transition-colors">
                                                <span class="inline-flex items-center justify-center shrink-0 w-3 h-3" v-html="renderIcon('plus', 'w-3 h-3')"></span>
                                                <span>Add Parameter</span>
                                            </button>
                                        </div>
                                    </div>
                                    <div v-if="!urlEncodedBulkMode" class="border border-zinc-800 rounded-lg overflow-hidden bg-zinc-900/60 flex-1 overflow-y-auto">
                                        <div class="grid grid-cols-12 gap-2 px-3 py-2 bg-zinc-900 border-b border-zinc-800 font-semibold text-zinc-400 text-[11px] uppercase sticky top-0 z-10">
                                            <div class="col-span-1 text-center">Use</div>
                                            <div class="col-span-3">Key</div>
                                            <div class="col-span-4">Value</div>
                                            <div class="col-span-3">Description</div>
                                            <div class="col-span-1 text-center">Action</div>
                                        </div>
                                        <div class="divide-y divide-zinc-800/80">
                                            <div v-for="(item, idx) in activeRequest.body.urlEncoded" :key="item.id || idx" class="grid grid-cols-12 gap-2 px-3 py-1.5 items-center hover:bg-zinc-800/20 group">
                                                <div class="col-span-1 flex justify-center">
                                                    <input type="checkbox" v-model="item.enabled" class="rounded bg-zinc-900 border-zinc-700 text-orange-500 focus:ring-0 cursor-pointer">
                                                </div>
                                                <div class="col-span-3">
                                                    <input type="text" v-model="item.key" placeholder="Key" class="w-full bg-transparent border border-transparent rounded px-2 py-1 text-xs text-zinc-200 focus:border-orange-500 focus:bg-zinc-950 font-mono transition-colors">
                                                </div>
                                                <div class="col-span-4">
                                                    <input type="text" v-model="item.value" placeholder="Value" class="w-full bg-transparent border border-transparent rounded px-2 py-1 text-xs text-zinc-200 focus:border-orange-500 focus:bg-zinc-950 font-mono transition-colors">
                                                </div>
                                                <div class="col-span-3">
                                                    <input type="text" v-model="item.description" placeholder="Description" class="w-full bg-transparent border border-transparent rounded px-2 py-1 text-xs text-zinc-400 focus:border-orange-500 focus:bg-zinc-950 focus:text-zinc-200 transition-colors">
                                                </div>
                                                <div class="col-span-1 flex justify-center">
                                                    <button type="button" @click="removeUrlEncodedRow(idx)" class="p-1 text-zinc-500 hover:text-rose-400 opacity-0 group-hover:opacity-100 transition-opacity"><span class="inline-flex items-center justify-center shrink-0 w-3.5 h-3.5" v-html="renderIcon('trash-2', 'w-3.5 h-3.5')"></span></button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <div v-else class="flex-1 min-h-[180px]">
                                        <textarea v-model="urlEncodedBulkText" placeholder="key: value // description" class="w-full h-full bg-zinc-900/90 border border-zinc-800 rounded-lg p-3 text-xs text-emerald-300 font-mono focus:border-orange-500 resize-none leading-relaxed"></textarea>
                                    </div>
                                </div>
                                <div v-else-if="activeRequest.body.type === 'form-data'" class="flex-1 min-h-[220px] flex flex-col">
                                    <div class="flex items-center justify-between mb-2">
                                        <span class="text-[11px] text-zinc-500 font-medium">Multipart Form Data</span>
                                        <div class="flex items-center gap-2">
                                            <button type="button" @click="toggleFormDataBulkMode()" class="text-zinc-400 hover:text-white font-semibold text-xs flex items-center gap-1 transition-colors">
                                                <span>{{ formDataBulkMode ? 'Key-Value Edit' : 'Bulk Edit' }}</span>
                                            </button>
                                            <button v-if="!formDataBulkMode" type="button" @click="addFormDataRow()" class="text-orange-400 hover:text-orange-300 font-semibold text-xs flex items-center gap-1 transition-colors">
                                                <span class="inline-flex items-center justify-center shrink-0 w-3 h-3" v-html="renderIcon('plus', 'w-3 h-3')"></span>
                                                <span>Add Parameter</span>
                                            </button>
                                        </div>
                                    </div>
                                    <div v-if="!formDataBulkMode" class="border border-zinc-800 rounded-lg overflow-hidden bg-zinc-900/60 flex-1 overflow-y-auto">
                                        <div class="grid grid-cols-12 gap-2 px-3 py-2 bg-zinc-900 border-b border-zinc-800 font-semibold text-zinc-400 text-[11px] uppercase sticky top-0 z-10">
                                            <div class="col-span-1 text-center">Use</div>
                                            <div class="col-span-3">Key</div>
                                            <div class="col-span-4">Value</div>
                                            <div class="col-span-3">Description</div>
                                            <div class="col-span-1 text-center">Action</div>
                                        </div>
                                        <div class="divide-y divide-zinc-800/80">
                                            <div v-for="(item, idx) in activeRequest.body.formData" :key="item.id || idx" class="grid grid-cols-12 gap-2 px-3 py-1.5 items-center hover:bg-zinc-800/20 group">
                                                <div class="col-span-1 flex justify-center">
                                                    <input type="checkbox" v-model="item.enabled" class="rounded bg-zinc-900 border-zinc-700 text-orange-500 focus:ring-0 cursor-pointer">
                                                </div>
                                                <div class="col-span-3 flex items-center">
                                                    <input type="text" v-model="item.key" placeholder="Key" class="flex-1 bg-transparent border border-transparent rounded px-2 py-1 text-xs text-zinc-200 focus:border-orange-500 focus:bg-zinc-950 font-mono transition-colors">
                                                    <select v-model="item.type" class="ml-1 bg-zinc-900 border border-zinc-700 rounded text-[10px] text-zinc-300 focus:border-orange-500 py-1 px-1">
                                                        <option value="text">Text</option>
                                                        <option value="file">File</option>
                                                    </select>
                                                </div>
                                                <div class="col-span-4">
                                                    <input v-if="item.type !== 'file'" type="text" v-model="item.value" placeholder="Value" class="w-full bg-transparent border border-transparent rounded px-2 py-1 text-xs text-zinc-200 focus:border-orange-500 focus:bg-zinc-950 font-mono transition-colors">
                                                    <div v-else class="flex items-center w-full bg-zinc-950 border border-zinc-700 rounded px-2 py-1">
                                                        <input type="file" @change="e => handleFileSelection(e, item)" class="w-full text-[10px] text-zinc-400 file:mr-2 file:py-0.5 file:px-2 file:rounded file:border-0 file:text-[10px] file:font-semibold file:bg-orange-500/20 file:text-orange-400 hover:file:bg-orange-500/30 cursor-pointer">
                                                    </div>
                                                </div>
                                                <div class="col-span-3">
                                                    <input type="text" v-model="item.description" placeholder="Description" class="w-full bg-transparent border border-transparent rounded px-2 py-1 text-xs text-zinc-400 focus:border-orange-500 focus:bg-zinc-950 focus:text-zinc-200 transition-colors">
                                                </div>
                                                <div class="col-span-1 flex justify-center">
                                                    <button type="button" @click="removeFormDataRow(idx)" class="p-1 text-zinc-500 hover:text-rose-400 opacity-0 group-hover:opacity-100 transition-opacity"><span class="inline-flex items-center justify-center shrink-0 w-3.5 h-3.5" v-html="renderIcon('trash-2', 'w-3.5 h-3.5')"></span></button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <div v-else class="flex-1 min-h-[180px]">
                                        <textarea v-model="formDataBulkText" placeholder="key: value // description&#10;fileKey: [FILE] // uploads file" class="w-full h-full bg-zinc-900/90 border border-zinc-800 rounded-lg p-3 text-xs text-emerald-300 font-mono focus:border-orange-500 resize-none leading-relaxed"></textarea>
                                    </div>
                                </div>
                                <div v-else class="h-48 flex items-center justify-center text-zinc-600 text-xs border border-dashed border-zinc-800 rounded-lg">
                                    This request does not send a body payload. Select a body type above to configure payload data.
                                </div>
                            </div>

                            <!-- TAB: TESTS -->
                            <div v-show="requestSubTab === 'tests'" class="h-full flex flex-col space-y-3">
                                <div class="flex items-center justify-between flex-wrap gap-2">
                                    <div class="flex items-center gap-2">
                                        <span class="text-zinc-200 text-xs font-bold flex items-center gap-1.5">
                                            <span class="inline-flex items-center justify-center shrink-0 w-3.5 h-3.5 text-orange-400" v-html="renderIcon('shield-check', 'w-3.5 h-3.5 text-orange-400')"></span>
                                            JavaScript Test Assertions (pm.test)
                                        </span>
                                    </div>
                                    <div class="flex items-center gap-1.5 flex-wrap">
                                        <button type="button" @click="insertTestSnippet('status200')" class="px-2 py-0.5 bg-zinc-800 hover:bg-zinc-700 text-orange-400 rounded text-[11px] font-semibold border border-zinc-700 transition-colors">+ Status 200</button>
                                        <button type="button" @click="insertTestSnippet('status201')" class="px-2 py-0.5 bg-zinc-800 hover:bg-zinc-700 text-orange-400 rounded text-[11px] font-semibold border border-zinc-700 transition-colors">+ Status 201</button>
                                        <button type="button" @click="insertTestSnippet('jsonProp')" class="px-2 py-0.5 bg-zinc-800 hover:bg-zinc-700 text-orange-400 rounded text-[11px] font-semibold border border-zinc-700 transition-colors">+ JSON Body</button>
                                        <button type="button" @click="insertTestSnippet('header')" class="px-2 py-0.5 bg-zinc-800 hover:bg-zinc-700 text-orange-400 rounded text-[11px] font-semibold border border-zinc-700 transition-colors">+ Header</button>
                                        <button type="button" @click="insertTestSnippet('timing')" class="px-2 py-0.5 bg-zinc-800 hover:bg-zinc-700 text-orange-400 rounded text-[11px] font-semibold border border-zinc-700 transition-colors">+ Latency &lt; 500ms</button>
                                        <button type="button" @click="insertTestSnippet('saveEnv')" class="px-2 py-0.5 bg-zinc-800 hover:bg-zinc-700 text-amber-400 rounded text-[11px] font-semibold border border-zinc-700 transition-colors">+ Save Env Var</button>
                                        <button type="button" @click="activeRequest.testsScript = ''" class="px-2 py-0.5 text-zinc-500 hover:text-red-400 text-[11px]">Clear</button>
                                    </div>
                                </div>
                                <textarea v-model="activeRequest.testsScript" placeholder="// Postman Test Assertions&#10;pm.test('Status code is 200', function() {&#10;    pm.response.to.have.status(200);&#10;});&#10;&#10;pm.test('Response is valid JSON', function() {&#10;    var data = pm.response.json();&#10;    pm.expect(data).to.be.an('object');&#10;});" class="w-full flex-1 min-h-[220px] bg-zinc-900 border border-zinc-800 rounded-lg p-3 text-xs text-emerald-300 font-mono resize-none focus:outline-none focus:border-orange-500 leading-relaxed"></textarea>
                            </div>
                        </div>
                    </div>

                    <!-- ========================================== -->
                    <!-- INTERACTIVE RESIZABLE SPLITTER (100% Parity)-->
                    <!-- ========================================== -->
                    <div role="separator"
                         tabindex="0"
                         :aria-orientation="layoutMode === 'columns' ? 'vertical' : 'horizontal'"
                         :aria-valuenow="layoutMode === 'columns' ? splitRatioColumns : splitRatioRows"
                         @mousedown="startSplitterDrag"
                         @touchstart="startSplitterDrag"
                         @dblclick="resetSplitRatio"
                         @mouseenter="isSplitterHovered = true"
                         @mouseleave="isSplitterHovered = false"
                         title="Drag to resize panes | Double-click to reset 50:50 | Click layout button to switch view"
                         :class="[
                            'relative shrink-0 flex items-center justify-center transition-colors select-none group z-20 outline-none focus-visible:ring-1 focus-visible:ring-orange-500',
                            layoutMode === 'columns' 
                                ? 'w-2 hover:w-2 cursor-col-resize border-x border-white/5 bg-[#0f121c] hover:bg-orange-500/20 active:bg-orange-500/40' 
                                : 'h-2 hover:h-2 cursor-row-resize border-y border-white/5 bg-[#0f121c] hover:bg-orange-500/20 active:bg-orange-500/40',
                            isSplitterDragging ? 'bg-orange-500/40 border-orange-500/50' : ''
                         ]">
                        <!-- Expanded invisible grab hit area -->
                        <div :class="[
                            'absolute pointer-events-auto',
                            layoutMode === 'columns' ? '-inset-x-2 inset-y-0 cursor-col-resize' : '-inset-y-2 inset-x-0 cursor-row-resize'
                        ]"></div>

                        <!-- Visual Accent Line -->
                        <div :class="[
                            'rounded-full transition-all duration-150',
                            layoutMode === 'columns'
                                ? ('w-0.5 ' + (isSplitterDragging || isSplitterHovered ? 'bg-orange-400 h-16' : 'bg-white/20 h-10'))
                                : ('h-0.5 ' + (isSplitterDragging || isSplitterHovered ? 'bg-orange-400 w-16' : 'bg-white/20 w-10'))
                        ]"></div>

                        <!-- Floating Center Control Pill on Hover or Drag -->
                        <div :class="[
                            'absolute transition-all duration-200 pointer-events-auto flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-[#181c2b] border border-orange-500/40 shadow-xl text-[10px] text-zinc-300 font-mono',
                            (isSplitterHovered || isSplitterDragging) ? 'opacity-100 scale-100' : 'opacity-0 scale-90 pointer-events-none',
                            layoutMode === 'columns' ? 'top-1/2 -translate-y-1/2 left-1/2 -translate-x-1/2' : 'left-1/2 -translate-x-1/2 top-1/2 -translate-y-1/2'
                        ]">
                            <span class="inline-flex items-center justify-center shrink-0 w-3 h-3 text-orange-400"
                                  v-html="renderIcon(layoutMode === 'columns' ? 'grip-vertical' : 'grip-horizontal', 'w-3 h-3 text-orange-400')"></span>
                            <span class="text-[9px] font-semibold text-orange-200 whitespace-nowrap">
                                {{ layoutMode === 'columns' ? (splitRatioColumns + ':' + (100 - splitRatioColumns)) : (splitRatioRows + ':' + (100 - splitRatioRows)) }}
                            </span>
                            <!-- 50:50 Reset Button -->
                            <button v-if="(layoutMode === 'columns' ? splitRatioColumns : splitRatioRows) !== 50"
                                    type="button"
                                    @click.stop="resetSplitRatio"
                                    title="Reset to 50:50 ratio"
                                    class="p-0.5 rounded hover:bg-white/10 text-zinc-400 hover:text-white transition-colors cursor-pointer">
                                <span class="inline-flex items-center justify-center shrink-0 w-2.5 h-2.5 text-zinc-300 hover:text-orange-400"
                                      v-html="renderIcon('rotate-ccw', 'w-2.5 h-2.5')"></span>
                            </button>
                            <!-- Quick Layout Switcher button directly on the divider -->
                            <button type="button"
                                    @click.stop="toggleLayoutMode"
                                    :title="layoutMode === 'columns' ? 'Switch to Stacked View (Top/Bottom)' : 'Switch to Side-by-Side View (Left/Right)'"
                                    class="p-0.5 rounded hover:bg-orange-500/20 text-zinc-400 hover:text-orange-300 transition-colors cursor-pointer flex items-center gap-0.5 ml-0.5">
                                <span class="inline-flex items-center justify-center shrink-0 w-2.5 h-2.5 text-orange-400"
                                      v-html="renderIcon(layoutMode === 'columns' ? 'rows' : 'columns', 'w-2.5 h-2.5')"></span>
                            </button>
                        </div>
                    </div>

                    <!-- ========================================== -->
                    <!-- RIGHT / BOTTOM HALF: ResponseViewer        -->
                    <!-- ========================================== -->
                    <div :style="{ flex: '1 1 0%', minWidth: layoutMode === 'columns' ? '200px' : 0, minHeight: layoutMode === 'rows' ? '140px' : 0 }"
                         class="overflow-hidden flex flex-col min-w-0 bg-[#0e111a] h-full">
                        <!-- 1. Response Metrics & Action Bar -->
<div class="px-4 py-2.5 bg-[#141824] border-b border-white/10 flex items-center justify-between gap-4 shrink-0 text-xs">
                            <div class="flex items-center gap-3">
                                <span class="font-semibold text-zinc-400 uppercase tracking-wider text-[11px]">Response</span>
                                <span v-if="activeResponse" class="px-2.5 py-0.5 rounded font-mono font-bold text-xs border" :class="getStatusBadgeColor(activeResponse.status)">
                                    {{ activeResponse.status ? (activeResponse.status + ' ' + activeResponse.statusText) : 'CORS / Connection Error' }}
                                </span>

                                <!-- CORS / Connection Error Action Button -->
                                <button v-if="activeResponse && (!activeResponse.status || activeResponse.status === 0 || activeResponse.isCorsError)"
                                    type="button"
                                    @click="openCorsModal()"
                                    class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 hover:text-white border border-rose-500/40 text-xs font-semibold cursor-pointer transition-all shadow-sm group"
                                    title="CORS or Network issue detected. Click to view steps to resolve it in the app.">
                                    <span class="inline-flex items-center justify-center shrink-0 w-3.5 h-3.5 text-rose-400 group-hover:scale-110 transition-transform" v-html="renderIcon('help-circle', 'w-3.5 h-3.5 text-rose-400')"></span>
                                    <span>How to Fix</span>
                                </button>
                                <span v-if="activeResponse && activeResponse.isProxied" class="px-2 py-0.5 rounded bg-orange-500/10 border border-orange-500/30 text-orange-400 text-[10px] font-mono font-semibold" title="Proxied via Server to bypass browser CORS">
                                    PROXIED
                                </span>
                                <div v-if="activeResponse" class="flex items-center gap-3 text-zinc-400 text-[11px] font-mono">
                                    <span class="flex items-center gap-1">
                                        <span class="inline-flex items-center justify-center shrink-0 w-3 h-3 text-zinc-500" v-html="renderIcon('clock', 'w-3 h-3 text-zinc-500')"></span>
                                        <span><strong class="text-zinc-200">{{ activeResponse.time }}</strong> ms</span>
                                    </span>
                                    <span class="flex items-center gap-1">
                                        <span class="inline-flex items-center justify-center shrink-0 w-3 h-3 text-zinc-500" v-html="renderIcon('hard-drive', 'w-3 h-3 text-zinc-500')"></span>
                                        <span><strong class="text-zinc-200">{{ formatBytes(activeResponse.size) }}</strong></span>
                                    </span>
                                </div>
                            </div>

                            <div v-if="activeResponse" class="flex items-center gap-1.5 shrink-0">
                                <button type="button" @click="openExportCodeModal()" class="px-2 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white border border-zinc-700 text-xs font-medium flex items-center gap-1 transition-colors" title="Export Request as Code">
                                    <span class="inline-flex items-center justify-center shrink-0 w-3 h-3 text-amber-400" v-html="renderIcon('code-2', 'w-3 h-3 text-amber-400')"></span>
                                    <span>Export Code</span>
                                </button>
                                <button type="button" @click="copyResponseBody()" class="px-2 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white border border-zinc-700 text-xs font-medium flex items-center gap-1 transition-colors" title="Copy Response">
                                    <span v-if="responseCopied" class="inline-flex items-center justify-center shrink-0 w-3 h-3 text-emerald-400" v-html="renderIcon('check', 'w-3 h-3 text-emerald-400')"></span>
                                    <span v-else class="inline-flex items-center justify-center shrink-0 w-3 h-3" v-html="renderIcon('copy', 'w-3 h-3')"></span>
                                    <span>{{ responseCopied ? 'Copied!' : 'Copy' }}</span>
                                </button>
                                <button type="button" @click="saveResponseToFile()" class="px-2 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white border border-zinc-700 text-xs font-medium flex items-center gap-1 transition-colors" title="Download Response">
                                    <span class="inline-flex items-center justify-center shrink-0 w-3 h-3" v-html="renderIcon('download', 'w-3 h-3')"></span>
                                    <span>Save</span>
                                </button>
                            </div>
                        </div>

                        <!-- CORS or Connection Error Action Banner -->
                        <div v-if="activeResponse && (!activeResponse.status || activeResponse.status === 0 || activeResponse.isCorsError)" class="px-4 py-2.5 bg-gradient-to-r from-rose-950/40 via-[#18121d] to-[#121624] border-b border-rose-500/30 flex flex-wrap items-center justify-between gap-3 text-xs shrink-0">
                            <div class="flex items-center gap-2.5 min-w-0">
                                <div class="w-6 h-6 rounded-lg bg-rose-500/20 border border-rose-500/30 flex items-center justify-center shrink-0 text-rose-400">
                                    <span class="inline-flex items-center justify-center w-3.5 h-3.5" v-html="renderIcon('shield-alert', 'w-3.5 h-3.5')"></span>
                                </div>
                                <div class="min-w-0">
                                    <span class="text-rose-200 font-semibold">CORS or Connection Error: </span>
                                    <span class="text-zinc-400 text-[11px]">Browser blocked this request due to Same-Origin Policy (missing Access-Control-Allow-Origin).</span>
                                </div>
                            </div>
                            <div class="flex items-center gap-2 shrink-0">
                                <button type="button" @click="sendActiveRequest(true)" class="px-2.5 py-1 rounded bg-orange-500/20 hover:bg-orange-500/30 text-orange-300 hover:text-white border border-orange-500/40 text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer" title="Retry request using built-in Server Proxy">
                                    <span class="inline-flex items-center justify-center w-3 h-3 text-orange-400" v-html="renderIcon('refresh-cw', 'w-3 h-3 text-orange-400')"></span>
                                    <span>Retry via Proxy</span>
                                </button>
                                <button type="button" @click="openCorsModal()" class="px-2.5 py-1 rounded bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 hover:text-white border border-rose-500/40 text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer" title="View full step-by-step resolution guide">
                                    <span class="inline-flex items-center justify-center w-3.5 h-3.5 text-rose-400" v-html="renderIcon('help-circle', 'w-3.5 h-3.5 text-rose-400')"></span>
                                    <span>Resolution Steps</span>
                                </button>
                            </div>
                        </div>

                        <!-- 2. Subtabs Navigation Bar -->
                        <div class="border-b border-zinc-800 bg-zinc-900/30 px-4 flex items-center justify-between text-xs shrink-0">
                            <div class="flex items-center gap-1">
                                <button type="button" @click="setResponseSubTab('pretty')" class="py-2.5 px-3 border-b-2 font-semibold flex items-center gap-1.5 transition-colors" :class="responseSubTab === 'pretty' ? 'border-orange-500 text-orange-400' : 'border-transparent text-zinc-400 hover:text-zinc-200'">
                                    <span class="inline-flex items-center justify-center shrink-0 w-3.5 h-3.5" v-html="renderIcon('code-2', 'w-3.5 h-3.5')"></span>
                                    <span>Pretty JSON</span>
                                </button>

                                <button type="button" @click="setResponseSubTab('graph')" class="py-2.5 px-3 border-b-2 font-semibold flex items-center gap-1.5 transition-colors" :class="responseSubTab === 'graph' ? 'border-orange-500 text-orange-400' : 'border-transparent text-zinc-400 hover:text-zinc-200'">
                                    <span class="inline-flex items-center justify-center shrink-0 w-3.5 h-3.5" v-html="renderIcon('network', 'w-3.5 h-3.5')"></span>
                                    <span>Visual Graph</span>
                                    <span class="text-[9px] px-1 py-0.2 rounded bg-orange-500/20 text-orange-300 font-mono">D3</span>
                                </button>

                                <button type="button" @click="setResponseSubTab('raw')" class="py-2.5 px-3 border-b-2 font-semibold flex items-center gap-1.5 transition-colors" :class="responseSubTab === 'raw' ? 'border-orange-500 text-orange-400' : 'border-transparent text-zinc-400 hover:text-zinc-200'">
                                    <span class="inline-flex items-center justify-center shrink-0 w-3.5 h-3.5" v-html="renderIcon('file-text', 'w-3.5 h-3.5')"></span>
                                    <span>Raw</span>
                                </button>

                                <button type="button" @click="setResponseSubTab('headers')" class="py-2.5 px-3 border-b-2 font-semibold flex items-center gap-1.5 transition-colors" :class="responseSubTab === 'headers' ? 'border-orange-500 text-orange-400' : 'border-transparent text-zinc-400 hover:text-zinc-200'">
                                    <span>Headers</span>
                                    <span v-if="activeResponse && activeResponse.headers" class="text-[10px] px-1.5 py-0.2 rounded-full bg-zinc-800 text-zinc-400 font-mono">
                                        {{ Object.keys(activeResponse.headers).length }}
                                    </span>
                                </button>

                                <button type="button" @click="setResponseSubTab('tests')" class="py-2.5 px-3 border-b-2 font-semibold flex items-center gap-1.5 transition-colors" :class="responseSubTab === 'tests' ? 'border-orange-500 text-orange-400' : 'border-transparent text-zinc-400 hover:text-zinc-200'">
                                    <span>Test Results</span>
                                    <span v-if="activeResponse && activeResponse.testResults && activeResponse.testResults.length" class="text-[10px] px-1.5 py-0.2 rounded-full font-mono" :class="responseFailedTestsCount > 0 ? 'bg-rose-500/20 text-rose-300' : 'bg-emerald-500/20 text-emerald-300'">
                                        {{ responsePassedTestsCount }}/{{ activeResponse.testResults.length }}
                                    </span>
                                </button>
                            </div>

                            <!-- Contextual Pretty JSON controls -->
                            <div v-if="responseSubTab === 'pretty' && activeResponse && isResponseJson" class="flex items-center gap-2">
                                <div class="flex items-center gap-1 bg-zinc-900 p-0.5 rounded-lg border border-zinc-800 text-[11px]">
                                    <button type="button" @click="prettyViewMode = 'code'" class="px-2 py-0.5 rounded font-medium transition-colors" :class="prettyViewMode === 'code' ? 'bg-orange-500 text-white shadow-sm' : 'text-zinc-400 hover:text-white'">
                                        Formatted
                                    </button>
                                    <button type="button" @click="prettyViewMode = 'tree'" class="px-2 py-0.5 rounded font-medium transition-colors flex items-center gap-1" :class="prettyViewMode === 'tree' ? 'bg-orange-500 text-white shadow-sm' : 'text-zinc-400 hover:text-white'">
                                        <span class="inline-flex items-center justify-center shrink-0 w-3 h-3" v-html="renderIcon('list-tree', 'w-3 h-3')"></span>
                                        <span>Tree View</span>
                                    </button>
                                </div>

                                <div v-if="prettyViewMode === 'code'" class="flex items-center gap-1 text-zinc-400 text-[11px]">
                                    <span>Spaces:</span>
                                    <select v-model="indentSize" class="bg-zinc-900 border border-zinc-800 rounded px-1.5 py-0.5 text-zinc-200 text-[11px]">
                                        <option :value="2">2</option>
                                        <option :value="4">4</option>
                                    </select>
                                </div>

                                <input v-model="responseSearchTerm" type="text" placeholder="Search..." class="bg-zinc-900 border border-zinc-800 rounded px-2 py-0.5 text-[11px] text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-orange-500 w-28">
                            </div>
                        </div>

                        <!-- 3. Response Panels Area -->
                        <div class="flex-1 overflow-hidden relative">
                            <!-- Loading State -->
                            <div v-if="isLoading" class="h-full flex flex-col items-center justify-center text-zinc-400 p-8 text-center space-y-3">
                                <span class="inline-flex items-center justify-center shrink-0 w-8 h-8 text-orange-400 animate-spin" v-html="renderIcon('loader-2', 'w-8 h-8 text-orange-400 animate-spin')"></span>
                                <div>
                                    <p class="font-bold text-sm text-white">Sending API Request...</p>
                                    <p class="text-xs text-zinc-500 mt-1">Evaluating parameters, auth headers, and running postman test assertions</p>
                                </div>
                            </div>

                            <!-- Empty / Not Sent State -->
                            <div v-else-if="!activeResponse" class="h-full flex flex-col items-center justify-center text-zinc-500 p-8 text-center space-y-3">
                                <div class="w-12 h-12 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-orange-400/60">
                                    <span class="inline-flex items-center justify-center shrink-0 w-6 h-6" v-html="renderIcon('activity', 'w-6 h-6')"></span>
                                </div>
                                <p class="font-bold text-sm text-zinc-300">Response Pane Ready</p>
                                <p class="text-xs text-zinc-500 max-w-sm">Click "Send" or press <kbd class="px-1.5 py-0.5 bg-zinc-800 rounded border border-zinc-700 font-mono text-[10px]">Ctrl+Enter</kbd> to execute this API request and inspect responses here.</p>
                            </div>

                            <!-- TAB 1: Pretty JSON -->
                            <div v-else-if="responseSubTab === 'pretty'" class="h-full overflow-auto p-4 font-mono text-xs">
                                <!-- Tree View Mode -->
                                <div v-if="prettyViewMode === 'tree' && isResponseJson" class="space-y-2">
                                    <div class="flex items-center justify-between pb-2 border-b border-zinc-800 text-[11px]">
                                        <div class="flex items-center gap-2">
                                            <button type="button" @click="expandAllTreeNodes()" class="px-2 py-0.5 rounded bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-800">Expand All</button>
                                            <button type="button" @click="collapseAllTreeNodes()" class="px-2 py-0.5 rounded bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-800">Collapse All</button>
                                        </div>
                                        <span class="text-zinc-500">Interactive JSON Tree</span>
                                    </div>
                                    <json-tree-node
                                        :val="parsedResponseData"
                                        current-path="$"
                                        :depth="0"
                                        :search-term="responseSearchTerm"
                                        :expanded-paths="treeExpandedNodes"
                                        @toggle="toggleTreeNode"
                                        @copy-path="copyJsonPath"
                                    />
                                </div>
                                <!-- Formatted Code View Mode -->
                                <pre v-else class="text-emerald-300 leading-relaxed overflow-x-auto selection:bg-orange-500/30 whitespace-pre-wrap">{{ prettyFormattedResponse || 'Empty Response Body' }}</pre>
                            </div>

                            <!-- TAB 2: Visual Graph Representation (D3 Hierarchy) -->
                            <div v-else-if="responseSubTab === 'graph'" class="h-full w-full flex flex-col">
                                <div v-if="isResponseJson" class="h-full flex flex-col">
                                    <!-- Graph Toolbar -->
                                    <div class="px-3 py-1.5 border-b border-zinc-800 bg-zinc-900/60 flex items-center justify-between text-xs shrink-0">
                                        <div class="flex items-center gap-2">
                                            <span class="text-zinc-400 font-semibold text-[11px]">Layout:</span>
                                            <select v-model="graphLayout" @change="renderD3Graph" class="bg-zinc-900 border border-zinc-800 rounded px-2 py-0.5 text-orange-400 font-medium text-xs">
                                                <option value="tree-horizontal">Tree (Horizontal)</option>
                                                <option value="tree-vertical">Tree (Vertical)</option>
                                                <option value="radial">Radial Circular</option>
                                            </select>
                                        </div>
                                        <div class="flex items-center gap-1">
                                            <button type="button" @click="zoomGraphIn()" class="p-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300" title="Zoom In"><span class="inline-flex items-center justify-center shrink-0 w-3.5 h-3.5" v-html="renderIcon('zoom-in', 'w-3.5 h-3.5')"></span></button>
                                            <button type="button" @click="zoomGraphOut()" class="p-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300" title="Zoom Out"><span class="inline-flex items-center justify-center shrink-0 w-3.5 h-3.5" v-html="renderIcon('zoom-out', 'w-3.5 h-3.5')"></span></button>
                                            <button type="button" @click="resetGraphZoom()" class="p-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300" title="Reset View"><span class="inline-flex items-center justify-center shrink-0 w-3.5 h-3.5" v-html="renderIcon('rotate-ccw', 'w-3.5 h-3.5')"></span></button>
                                        </div>
                                    </div>

                                    <!-- D3 Container -->
                                    <div id="d3-graph-wrapper" class="flex-1 w-full h-full relative overflow-hidden bg-[#07090e]">
                                        <svg id="d3-graph-svg" class="w-full h-full cursor-grab active:cursor-grabbing"></svg>

                                        <!-- Node Details Drawer on Click -->
                                        <div v-if="selectedGraphNode" class="absolute bottom-3 left-3 right-3 p-3 rounded-xl bg-zinc-900/95 border border-zinc-800 shadow-2xl backdrop-blur-md flex items-center justify-between gap-3 text-xs font-mono">
                                            <div class="space-y-0.5 min-w-0">
                                                <div class="flex items-center gap-2">
                                                    <span class="font-bold text-white">{{ selectedGraphNode.name }}</span>
                                                    <span class="text-[10px] px-1.5 py-0.2 rounded bg-orange-500/20 text-orange-300 font-bold uppercase">{{ selectedGraphNode.type }}</span>
                                                </div>
                                                <div class="text-[11px] text-zinc-400 truncate">Path: <span class="text-emerald-400">{{ selectedGraphNode.path }}</span></div>
                                                <div v-if="selectedGraphNode.value !== undefined" class="text-[11px] text-zinc-300 truncate">Value: {{ String(selectedGraphNode.value) }}</div>
                                            </div>
                                            <div class="flex items-center gap-2 shrink-0">
                                                <button type="button" @click="copyJsonPath(selectedGraphNode.path)" class="px-2.5 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded text-[11px] font-semibold border border-zinc-700">Copy Path</button>
                                                <button type="button" @click="selectedGraphNode = null" class="p-1 text-zinc-500 hover:text-white"><span class="inline-flex items-center justify-center shrink-0 w-3.5 h-3.5" v-html="renderIcon('x', 'w-3.5 h-3.5')"></span></button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div v-else class="h-full flex flex-col items-center justify-center p-8 text-center text-zinc-500 text-xs space-y-2">
                                    <span class="inline-flex items-center justify-center shrink-0 w-8 h-8 opacity-40 text-zinc-500" v-html="renderIcon('network', 'w-8 h-8')"></span>
                                    <p class="font-semibold text-zinc-400">Non-JSON Response Payload</p>
                                    <p class="max-w-sm">The visual graph diagram visualizes hierarchical JSON structures. This response is plain text or HTML.</p>
                                </div>
                            </div>

                            <!-- TAB 3: Raw -->
                            <div v-else-if="responseSubTab === 'raw'" class="h-full overflow-auto p-4 font-mono text-xs">
                                <pre class="text-zinc-300 leading-relaxed overflow-x-auto whitespace-pre-wrap">{{ rawResponseBody }}</pre>
                            </div>

                            <!-- TAB 4: Headers -->
                            <div v-else-if="responseSubTab === 'headers'" class="h-full overflow-auto p-4 text-xs font-mono">
                                <div class="border border-zinc-800 rounded-lg overflow-hidden bg-zinc-900/60">
                                    <div class="grid grid-cols-12 gap-2 font-semibold uppercase text-[11px] text-zinc-400 px-3 py-2 bg-zinc-900 border-b border-zinc-800">
                                        <div class="col-span-5">Header Key</div>
                                        <div class="col-span-7">Value</div>
                                    </div>
                                    <div class="divide-y divide-zinc-800/60">
                                        <div v-for="(v, k) in activeResponse.headers" :key="k" class="grid grid-cols-12 gap-2 px-3 py-1.5 items-center hover:bg-zinc-800/20">
                                            <div class="col-span-5 text-orange-300 font-semibold truncate">{{ k }}</div>
                                            <div class="col-span-7 text-zinc-300 break-all select-all">{{ v }}</div>
                                        </div>
                                        <div v-if="!activeResponse.headers || Object.keys(activeResponse.headers).length === 0" class="p-4 text-center text-zinc-500 text-xs">
                                            No response headers returned.
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <!-- TAB 5: Tests -->
                            <div v-else-if="responseSubTab === 'tests'" class="h-full overflow-auto p-4 space-y-3 font-sans text-xs">
                                <div v-if="!activeResponse.testResults || activeResponse.testResults.length === 0" class="p-8 text-center text-zinc-500 text-xs">
                                    No test scripts were written for this request. Go to the <strong>Tests</strong> tab on the left to write assertions like <code class="text-orange-300 font-mono">pm.response.to.have.status(200)</code>.
                                </div>
                                <div v-else class="space-y-3">
                                    <div class="flex items-center gap-4 p-3 bg-zinc-900 rounded-xl border border-zinc-800 text-xs">
                                        <div class="flex items-center gap-1.5 text-emerald-400 font-bold">
                                            <span class="inline-flex items-center justify-center shrink-0 w-4 h-4 text-emerald-400" v-html="renderIcon('check-circle-2', 'w-4 h-4 text-emerald-400')"></span>
                                            <span>{{ responsePassedTestsCount }} Passed</span>
                                        </div>
                                        <div v-if="responseFailedTestsCount > 0" class="flex items-center gap-1.5 text-rose-400 font-bold">
                                            <span class="inline-flex items-center justify-center shrink-0 w-4 h-4 text-rose-400" v-html="renderIcon('x-circle', 'w-4 h-4 text-rose-400')"></span>
                                            <span>{{ responseFailedTestsCount }} Failed</span>
                                        </div>
                                    </div>

                                    <div class="border border-zinc-800 rounded-xl divide-y divide-zinc-800 bg-zinc-900/60 overflow-hidden">
                                        <div v-for="(test, idx) in activeResponse.testResults" :key="idx" class="p-3 flex items-start justify-between gap-3 text-xs">
                                            <div class="flex items-start gap-2.5">
                                                <span v-if="test.passed" class="inline-flex items-center justify-center shrink-0 w-4 h-4 text-emerald-400 mt-0.5" v-html="renderIcon('check-circle-2', 'w-4 h-4 text-emerald-400')"></span>
                                                <span v-else class="inline-flex items-center justify-center shrink-0 w-4 h-4 text-rose-400 mt-0.5" v-html="renderIcon('x-circle', 'w-4 h-4 text-rose-400')"></span>
                                                <div>
                                                    <div class="font-semibold text-white">{{ test.name }}</div>
                                                    <p v-if="test.error" class="text-rose-400 font-mono text-[11px] mt-0.5">{{ test.error }}</p>
                                                </div>
                                            </div>
                                            <span class="px-2 py-0.5 rounded text-[10px] font-bold" :class="test.passed ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'">
                                                {{ test.passed ? 'PASS' : 'FAIL' }}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Blank Slate -->
                <div v-else class="flex-1 flex flex-col items-center justify-center text-zinc-500 p-6 space-y-4">
                    <div class="w-16 h-16 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-orange-400">
                        <span class="inline-flex items-center justify-center shrink-0 w-8 h-8" v-html="renderIcon('layers', 'w-8 h-8')"></span>
                    </div>
                    <h3 class="text-base font-bold text-zinc-300">No Request Selected</h3>
                    <button @click="createNewBlankTab()" class="px-4 py-2 bg-orange-600 hover:bg-orange-500 text-white rounded-lg text-xs font-bold shadow-lg shadow-orange-500/20">
                        Create New Request
                    </button>
                </div>
            </main>
        </div>
    </div>

    <!-- Modals (Runner, Import/Export, Environment, Auth) -->
    <!-- Runner Modal with Live Execution Progress & Table -->
    <div v-if="showRunnerModal" class="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-6">
        <div class="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-2xl p-6 shadow-2xl space-y-4 max-h-[85vh] flex flex-col">
            <div class="flex items-center justify-between border-b border-zinc-800 pb-3 shrink-0">
                <div class="flex items-center gap-2">
                    <div class="w-7 h-7 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center">
                        <span class="inline-flex items-center justify-center shrink-0 w-4 h-4 text-amber-400" v-html="renderIcon('play', 'w-4 h-4 text-amber-400')"></span>
                    </div>
                    <h3 class="text-sm font-bold text-white">Collection Runner</h3>
                </div>
                <button @click="showRunnerModal = false" class="text-zinc-400 hover:text-white"><span class="inline-flex items-center justify-center shrink-0 w-4 h-4" v-html="renderIcon('x', 'w-4 h-4')"></span></button>
            </div>

            <div class="space-y-3 shrink-0">
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                        <label class="block text-xs font-semibold text-zinc-400 mb-1">Target Collection</label>
                        <select v-model="runnerSelectedCollectionId" class="w-full bg-zinc-950 border border-zinc-700 rounded-lg p-2 text-xs text-zinc-200">
                            <option v-for="c in collections" :key="c.id" :value="c.id">{{ c.name }} ({{ (c.requests || []).length }} requests)</option>
                        </select>
                    </div>
                    <div>
                        <label class="block text-xs font-semibold text-zinc-400 mb-1">Delay Between Requests</label>
                        <select v-model="runnerDelayMs" class="w-full bg-zinc-950 border border-zinc-700 rounded-lg p-2 text-xs text-zinc-200">
                            <option :value="0">0 ms (Fastest)</option>
                            <option :value="100">100 ms</option>
                            <option :value="500">500 ms</option>
                            <option :value="1000">1000 ms</option>
                        </select>
                    </div>
                </div>

                <!-- Progress Bar if running or completed -->
                <div v-if="runnerStats.total > 0" class="space-y-1.5 p-3 bg-zinc-950 rounded-xl border border-zinc-800">
                    <div class="flex items-center justify-between text-xs">
                        <span class="font-semibold text-zinc-300">Progress: {{ runnerStats.completed }} / {{ runnerStats.total }} requests</span>
                        <div class="flex items-center gap-2 font-mono text-[11px]">
                            <span class="text-emerald-400 font-bold">{{ runnerStats.passed }} passed</span>
                            <span v-if="runnerStats.failed > 0" class="text-rose-400 font-bold">{{ runnerStats.failed }} failed</span>
                        </div>
                    </div>
                    <div class="w-full h-2 bg-zinc-800 rounded-full overflow-hidden">
                        <div class="h-full bg-gradient-to-r from-orange-500 to-amber-500 transition-all duration-200" :style="{ width: ((runnerStats.completed / runnerStats.total) * 100) + '%' }"></div>
                    </div>
                </div>
            </div>

            <!-- Live Execution Log Table -->
            <div class="flex-1 overflow-y-auto border border-zinc-800 rounded-xl bg-zinc-950/60 p-2 min-h-[160px]">
                <div v-if="runnerExecutionLog.length === 0" class="p-6 text-center text-zinc-500 text-xs">
                    Select a collection and click "Start Execution" to execute all requests in sequence.
                </div>
                <div v-else class="space-y-1">
                    <div v-for="(item, idx) in runnerExecutionLog" :key="idx" class="flex items-center justify-between p-2 rounded-lg bg-zinc-900/60 border border-zinc-800 text-xs">
                        <div class="flex items-center gap-2 truncate min-w-0">
                            <span class="px-1.5 py-0.5 rounded text-[10px] font-bold font-mono uppercase" :class="getMethodBadgeClass(item.method)">{{ item.method }}</span>
                            <span class="font-medium text-zinc-200 truncate">{{ item.name }}</span>
                            <span class="text-zinc-500 text-[11px] truncate hidden md:inline font-mono">{{ item.url }}</span>
                        </div>
                        <div class="flex items-center gap-2 shrink-0 font-mono text-[11px]">
                            <span class="font-bold" :class="item.status >= 200 && item.status < 300 ? 'text-emerald-400' : 'text-rose-400'">{{ item.status }}</span>
                            <span class="text-zinc-500">{{ item.time }}ms</span>
                        </div>
                    </div>
                </div>
            </div>

            <div class="flex items-center justify-between pt-2 border-t border-zinc-800 shrink-0">
                <button @click="showRunnerModal = false" class="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl text-xs font-semibold">
                    Close
                </button>
                <button @click="runSelectedCollection()" :disabled="runnerRunning" class="px-5 py-2 bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-lg shadow-orange-500/20">
                    <span v-if="runnerRunning" class="inline-flex items-center justify-center shrink-0 w-3.5 h-3.5 animate-spin" v-html="renderIcon('refresh-cw', 'w-3.5 h-3.5 animate-spin')"></span>
                    <span v-else class="inline-flex items-center justify-center shrink-0 w-3.5 h-3.5" v-html="renderIcon('play', 'w-3.5 h-3.5')"></span>
                    <span>{{ runnerRunning ? 'Running Collection...' : 'Start Execution' }}</span>
                </button>
            </div>
        </div>
    </div>

    <!-- Import/Export Modal -->
    <div v-if="activeModal === 'importExportModal'" class="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div class="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-xl p-6 shadow-2xl space-y-4">
            <div class="flex items-center justify-between border-b border-zinc-800 pb-3">
                <h3 class="text-sm font-bold text-white flex items-center gap-2">
                    <span class="inline-flex items-center justify-center shrink-0 w-4 h-4 text-blue-400" v-html="renderIcon('arrow-left-right', 'w-4 h-4 text-blue-400')"></span>
                    Import / Export APIs
                </h3>
                <button @click="activeModal = null" class="text-zinc-400 hover:text-white">
                    <span class="inline-flex items-center justify-center shrink-0 w-4 h-4" v-html="renderIcon('x', 'w-4 h-4')"></span>
                </button>
            </div>
            <div class="flex gap-2 border-b border-zinc-800 pb-2">
                <button @click="importExportTab = 'import'" :class="importExportTab === 'import' ? 'text-orange-400 font-bold border-b-2 border-orange-500' : 'text-zinc-400'" class="text-xs pb-1 px-2">Import Data / File</button>
                <button @click="importExportTab = 'export'" :class="importExportTab === 'export' ? 'text-orange-400 font-bold border-b-2 border-orange-500' : 'text-zinc-400'" class="text-xs pb-1 px-2">Export Collection</button>
            </div>

            <!-- Import Tab -->
            <div v-if="importExportTab === 'import'" class="space-y-3">
                <!-- File Upload Drag and Drop Zone -->
                <div 
                    @dragover.prevent="isDragOver = true"
                    @dragleave.prevent="isDragOver = false"
                    @drop.prevent="handleFileDrop($event)"
                    @click="$refs.fileInput.click()"
                    :class="isDragOver ? 'border-orange-500 bg-orange-500/10' : 'border-dashed border-zinc-700 hover:border-orange-500/60 bg-zinc-950/60'"
                    class="border-2 rounded-xl p-5 text-center cursor-pointer transition-all"
                >
                    <input type="file" ref="fileInput" @change="handleFileInputChange($event)" accept=".json,.yaml,.yml,.txt" class="hidden">
                    <div class="flex flex-col items-center gap-2">
                        <span class="p-2.5 rounded-full bg-orange-500/10 text-orange-400">
                            <span class="inline-flex items-center justify-center shrink-0 w-5 h-5" v-html="renderIcon('upload', 'w-5 h-5')"></span>
                        </span>
                        <div>
                            <p class="text-xs font-semibold text-white">Click to upload file or drag & drop</p>
                            <p class="text-[11px] text-zinc-400 mt-0.5">Supports Postman Collection (.json), OpenAPI/Swagger, cURL, or CloudPost JSON</p>
                        </div>
                    </div>
                </div>

                <!-- Or Paste Raw Text -->
                <div>
                    <label class="block text-xs font-medium text-zinc-400 mb-1">Or paste JSON / cURL text:</label>
                    <textarea v-model="importText" placeholder="Paste Postman Collection JSON, OpenAPI JSON, or cURL command..." rows="5" class="w-full bg-zinc-950 border border-zinc-700 rounded-lg p-2.5 text-xs text-zinc-200 font-mono"></textarea>
                </div>
                <button @click="handleImport()" class="w-full py-2.5 bg-orange-600 hover:bg-orange-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-orange-600/20 transition-colors">
                    Import Into Workspace
                </button>
            </div>

            <!-- Export Tab -->
            <div v-else class="space-y-3">
                <p class="text-xs text-zinc-400">Export your active collection for sharing with team members or loading into other API clients:</p>
                
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    <!-- Postman Format Export -->
                    <button @click="exportPostmanCollection()" class="p-4 bg-zinc-950 hover:bg-zinc-800/80 border border-zinc-800 hover:border-amber-500/40 text-left rounded-xl transition-all group">
                        <div class="flex items-center gap-2 text-amber-400 font-bold text-xs mb-1">
                            <span class="inline-flex items-center justify-center shrink-0 w-4 h-4" v-html="renderIcon('download', 'w-4 h-4')"></span>
                            Postman v2.1 Format
                        </div>
                        <p class="text-[11px] text-zinc-400">Export as standard Postman v2.1.0 Collection JSON for native Postman compatibility.</p>
                    </button>

                    <!-- CloudPost Custom Format Export -->
                    <button @click="exportCloudPostCollection()" class="p-4 bg-zinc-950 hover:bg-zinc-800/80 border border-zinc-800 hover:border-emerald-500/40 text-left rounded-xl transition-all group">
                        <div class="flex items-center gap-2 text-emerald-400 font-bold text-xs mb-1">
                            <span class="inline-flex items-center justify-center shrink-0 w-4 h-4" v-html="renderIcon('layers', 'w-4 h-4')"></span>
                            CloudPost Custom Format
                        </div>
                        <p class="text-[11px] text-zinc-400">Export as complete CloudPost JSON (.cloudpost.json) including all subfolders and full metadata.</p>
                    </button>
                </div>
            </div>
        </div>
    </div>

    <!-- 1. Full Environment Manager Modal (Matching React EnvironmentManagerModal.tsx) -->
    <div v-if="activeModal === 'envModal'" class="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-6">
        <div class="bg-[#121622] border border-white/10 rounded-2xl w-full max-w-5xl shadow-2xl overflow-hidden flex flex-col h-[88vh] max-h-[800px]">
            <!-- Header -->
            <div class="px-6 py-4 bg-[#161b2a] border-b border-white/10 flex items-center justify-between shrink-0">
                <div class="flex items-center gap-3">
                    <div class="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-md">
                        <span class="inline-flex items-center justify-center shrink-0 w-5 h-5" v-html="renderIcon('globe', 'w-5 h-5 text-emerald-400')"></span>
                    </div>
                    <div>
                        <h2 class="font-bold text-white text-base">Environments & Scoped Variables</h2>
                        <p class="text-xs text-zinc-400">Manage environment, collection, and global variables for automated request resolution</p>
                    </div>
                </div>
                <div class="flex items-center gap-2">
                    <button @click="exportActiveEnvJson()" class="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-semibold flex items-center gap-1.5 transition-colors" title="Export as JSON">
                        <span class="inline-flex items-center justify-center shrink-0 w-3.5 h-3.5" v-html="renderIcon('download', 'w-3.5 h-3.5')"></span>
                        <span class="hidden sm:inline">Export</span>
                    </button>
                    <button @click="envModalShowBulk = !envModalShowBulk" class="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-semibold flex items-center gap-1.5 transition-colors" title="Bulk Import .env">
                        <span class="inline-flex items-center justify-center shrink-0 w-3.5 h-3.5" v-html="renderIcon('file-spreadsheet', 'w-3.5 h-3.5')"></span>
                        <span class="hidden sm:inline">Bulk .env</span>
                    </button>
                    <button @click="activeModal = null" class="p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors">
                        <span class="inline-flex items-center justify-center shrink-0 w-5 h-5" v-html="renderIcon('x', 'w-5 h-5')"></span>
                    </button>
                </div>
            </div>

            <!-- Body Layout: Sidebar + Main Content -->
            <div class="flex-1 flex min-h-0 overflow-hidden">
                <!-- Left Sidebar -->
                <div class="w-64 sm:w-72 border-r border-white/10 bg-[#0e111a] flex flex-col shrink-0">
                    <div class="p-3 border-b border-white/10 flex items-center justify-between">
                        <span class="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">Scopes</span>
                        <button @click="envModalShowNewEnv = true" class="text-xs text-orange-400 hover:text-orange-300 font-semibold flex items-center gap-1">
                            <span class="inline-flex items-center justify-center shrink-0 w-3 h-3" v-html="renderIcon('plus', 'w-3 h-3')"></span>
                            <span>New Env</span>
                        </button>
                    </div>

                    <!-- New Env inline creator -->
                    <div v-if="envModalShowNewEnv" class="p-2 border-b border-white/10 bg-zinc-950/60 space-y-2">
                        <input v-model="envModalNewEnvName" @keyup.enter="createNewEnvironment()" placeholder="Environment name..." class="w-full bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-xs text-zinc-200">
                        <div class="flex justify-end gap-1.5 text-xs">
                            <button @click="envModalShowNewEnv = false" class="px-2 py-0.5 text-zinc-400 hover:text-zinc-200">Cancel</button>
                            <button @click="createNewEnvironment()" class="px-2.5 py-0.5 bg-orange-600 hover:bg-orange-500 text-white rounded font-semibold">Create</button>
                        </div>
                    </div>

                    <!-- Scopes List -->
                    <div class="flex-1 overflow-y-auto p-2 space-y-1">
                        <!-- Environments Group -->
                        <div class="text-[10px] font-bold text-zinc-500 uppercase px-2 py-1">Environments</div>
                        <div v-for="env in environments" :key="env.id" @click="envModalTargetId = env.id"
                            class="p-2 rounded-xl flex items-center justify-between text-xs cursor-pointer transition-colors"
                            :class="envModalTargetId === env.id ? 'bg-orange-500/20 text-white font-semibold border border-orange-500/30' : 'text-zinc-300 hover:bg-white/5'">
                            <div class="flex items-center gap-2 truncate">
                                <span class="inline-flex items-center justify-center shrink-0 w-3.5 h-3.5" :class="env.isGlobal ? 'text-amber-400' : 'text-emerald-400'" v-html="renderIcon(env.isGlobal ? 'layers' : 'globe', 'w-3.5 h-3.5')"></span>
                                <span class="truncate">{{ env.name }}</span>
                            </div>
                            <div class="flex items-center gap-1.5 shrink-0">
                                <span v-if="activeEnvId === env.id && !env.isGlobal" class="text-[9px] px-1.5 py-0.2 rounded-full bg-emerald-500/20 text-emerald-300 font-bold">Active</span>
                                <span class="text-[10px] text-zinc-500 font-mono">{{ (env.variables || []).length }}</span>
                            </div>
                        </div>

                        <!-- Collection Scoped Variables Group -->
                        <div class="text-[10px] font-bold text-zinc-500 uppercase px-2 py-1 pt-3">Collections Scoped</div>
                        <div v-for="col in collections" :key="'col_' + col.id" @click="envModalTargetId = 'col_' + col.id"
                            class="p-2 rounded-xl flex items-center justify-between text-xs cursor-pointer transition-colors"
                            :class="envModalTargetId === ('col_' + col.id) ? 'bg-orange-500/20 text-white font-semibold border border-orange-500/30' : 'text-zinc-300 hover:bg-white/5'">
                            <div class="flex items-center gap-2 truncate">
                                <span class="inline-flex items-center justify-center shrink-0 w-3.5 h-3.5 text-blue-400" v-html="renderIcon('folder-archive', 'w-3.5 h-3.5 text-blue-400')"></span>
                                <span class="truncate">{{ col.name }}</span>
                            </div>
                            <span class="text-[10px] text-zinc-500 font-mono shrink-0">{{ (col.variables || []).length }}</span>
                        </div>

                        <!-- Dynamic Variables Reference Tab -->
                        <div class="text-[10px] font-bold text-zinc-500 uppercase px-2 py-1 pt-3">Dynamic Cheatsheet</div>
                        <div @click="envModalTargetId = 'dynamic_variables'"
                            class="p-2 rounded-xl flex items-center justify-between text-xs cursor-pointer transition-colors"
                            :class="envModalTargetId === 'dynamic_variables' ? 'bg-orange-500/20 text-white font-semibold border border-orange-500/30' : 'text-zinc-300 hover:bg-white/5'">
                            <div class="flex items-center gap-2 truncate">
                                <span class="inline-flex items-center justify-center shrink-0 w-3.5 h-3.5 text-purple-400" v-html="renderIcon('sparkles', 'w-3.5 h-3.5 text-purple-400')"></span>
                                <span>Dynamic Variables</span>
                            </div>
                            <span class="text-[9px] px-1.5 py-0.2 rounded-full bg-purple-500/20 text-purple-300 font-mono">17</span>
                        </div>
                    </div>
                </div>

                <!-- Right Main Content Panel -->
                <div class="flex-1 flex flex-col min-w-0 bg-[#121622] overflow-hidden">
                    <!-- Dynamic Variables View -->
                    <div v-if="envModalTargetId === 'dynamic_variables'" class="flex-1 flex flex-col overflow-hidden">
                        <div class="p-4 border-b border-white/10 flex items-center justify-between bg-[#161b2a]/50">
                            <div>
                                <h3 class="text-sm font-bold text-white flex items-center gap-2">
                                    <span class="inline-flex items-center justify-center shrink-0 w-4 h-4 text-purple-400" v-html="renderIcon('sparkles', 'w-4 h-4 text-purple-400')"></span>
                                    <span>Built-in Dynamic Postman Variables</span>
                                </h3>
                                <p class="text-xs text-zinc-400">CloudPost automatically generates dynamic timestamps, UUIDs, and synthetic test data at request execution time.</p>
                            </div>
                        </div>
                        <div class="flex-1 overflow-y-auto p-4">
                            <table class="w-full text-left text-xs text-zinc-300 border border-zinc-800 rounded-xl overflow-hidden">
                                <thead class="bg-zinc-900/80 border-b border-zinc-800 text-zinc-400 font-mono text-[10px] uppercase">
                                    <tr>
                                        <th class="py-2.5 px-3">Variable Syntax</th>
                                        <th class="py-2.5 px-3">Category</th>
                                        <th class="py-2.5 px-3">Description</th>
                                        <th class="py-2.5 px-3">Live Sample</th>
                                        <th class="py-2.5 px-3 text-right">Action</th>
                                    </tr>
                                </thead>
                                <tbody class="divide-y divide-zinc-800/60 font-sans">
                                    <tr v-for="d in dynamicVariablesCheatsheet" :key="d.key" class="hover:bg-white/5">
                                        <td class="py-2 px-3 font-mono font-bold text-orange-400 select-all"><span v-pre>{{</span>{{ d.key }}<span v-pre>}}</span></td>
                                        <td class="py-2 px-3"><span class="px-2 py-0.5 rounded text-[10px] bg-zinc-800 text-zinc-300">{{ d.category }}</span></td>
                                        <td class="py-2 px-3 text-zinc-300">{{ d.description }}</td>
                                        <td class="py-2 px-3 font-mono text-zinc-400 text-[11px] truncate max-w-[150px]">{{ d.sample }}</td>
                                        <td class="py-2 px-3 text-right">
                                            <button @click="copyToClipboard('{{' + d.key + '}}'); envModalCopied = d.key; setTimeout(() => envModalCopied = null, 1500)" class="px-2 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white text-[11px]">
                                                {{ envModalCopied === d.key ? 'Copied!' : 'Copy' }}
                                            </button>
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <!-- Standard Variable Table View (Environment or Collection) -->
                    <div v-else class="flex-1 flex flex-col overflow-hidden">
                        <!-- Top Action Bar -->
                        <div class="p-3 border-b border-white/10 bg-[#161b2a]/50 flex items-center justify-between gap-2 flex-wrap">
                            <div class="flex items-center gap-2">
                                <h3 class="text-sm font-bold text-white">{{ activeEnvTargetName }}</h3>
                                <button v-if="isCurrentTargetNonGlobalEnv && activeEnvId !== envModalTargetId" @click="activeEnvId = envModalTargetId" class="px-2 py-0.5 rounded bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[11px] font-semibold transition-colors">
                                    Set as Active
                                </button>
                                <span v-if="isCurrentTargetNonGlobalEnv && activeEnvId === envModalTargetId" class="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30">
                                    ✓ Active Environment
                                </span>
                            </div>

                            <div class="flex items-center gap-2">
                                <div class="relative">
                                    <span class="absolute left-2.5 top-2 text-zinc-500 inline-flex items-center" v-html="renderIcon('search', 'w-3 h-3 text-zinc-500')"></span>
                                    <input v-model="envModalSearch" placeholder="Filter variables..." class="bg-zinc-900 border border-zinc-700 rounded-lg pl-7 pr-3 py-1 text-xs text-zinc-200 placeholder-zinc-500 w-36 sm:w-48 focus:outline-none focus:border-orange-500">
                                </div>
                                <button @click="addVariableToActiveEnv()" class="px-3 py-1 bg-orange-600 hover:bg-orange-500 text-white rounded-lg text-xs font-bold flex items-center gap-1 shadow transition-colors">
                                    <span class="inline-flex items-center justify-center shrink-0 w-3.5 h-3.5" v-html="renderIcon('plus', 'w-3.5 h-3.5')"></span>
                                    <span>Add Variable</span>
                                </button>
                                <button v-if="isCurrentTargetCustomEnv" @click="deleteCurrentEnvironment(envModalTargetId)" class="p-1 text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 rounded" title="Delete Environment">
                                    <span class="inline-flex items-center justify-center shrink-0 w-4 h-4" v-html="renderIcon('trash-2', 'w-4 h-4')"></span>
                                </button>
                            </div>
                        </div>

                        <!-- Bulk Import Drawer -->
                        <div v-if="envModalShowBulk" class="p-4 border-b border-white/10 bg-zinc-950 space-y-3">
                            <div class="flex items-center justify-between">
                                <span class="text-xs font-bold text-white">Bulk Variable Import (.env / KEY=VALUE)</span>
                                <button @click="envModalShowBulk = false" class="text-xs text-zinc-400 hover:text-zinc-200">Close</button>
                            </div>
                            <textarea v-model="envModalBulkText" rows="4" placeholder="API_BASE_URL=https://api.domain.com&#10;AUTH_SECRET=sk_live_9981&#10;DEBUG_MODE=true" class="w-full bg-zinc-900 border border-zinc-700 rounded-lg p-2.5 text-xs text-zinc-200 font-mono"></textarea>
                            <div class="flex justify-end gap-2 text-xs">
                                <button @click="handleBulkImportVars(true)" class="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-lg font-semibold">Append</button>
                                <button @click="handleBulkImportVars(false)" class="px-3 py-1.5 bg-orange-600 hover:bg-orange-500 text-white rounded-lg font-bold">Replace All</button>
                            </div>
                        </div>

                        <!-- Variable Rows Table -->
                        <div class="flex-1 overflow-y-auto p-4">
                            <div v-if="filteredActiveEnvVariables.length === 0" class="p-8 text-center text-zinc-500 text-xs">
                                <span class="inline-flex items-center justify-center shrink-0 w-8 h-8 text-zinc-600 mb-2" v-html="renderIcon('layers', 'w-8 h-8 text-zinc-600')"></span>
                                <p>No variables configured in this scope yet.</p>
                                <button @click="addVariableToActiveEnv()" class="mt-3 px-3 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-lg text-xs font-semibold">
                                    + Add Your First Variable
                                </button>
                            </div>
                            <div v-else class="border border-zinc-800 rounded-xl overflow-hidden shadow-md">
                                <table class="w-full text-left text-xs text-zinc-300">
                                    <thead class="bg-zinc-950/80 border-b border-zinc-800 text-zinc-500 font-mono text-[10px] uppercase">
                                        <tr>
                                            <th class="py-2.5 px-3 w-10 text-center">En</th>
                                            <th class="py-2.5 px-3 w-1/3">Variable Name (Key)</th>
                                            <th class="py-2.5 px-3">Current Value</th>
                                            <th class="py-2.5 px-3 w-32 hidden md:table-cell">Initial Value</th>
                                            <th class="py-2.5 px-3 w-20 text-center">Secret</th>
                                            <th class="py-2.5 px-3 w-12 text-right"></th>
                                        </tr>
                                    </thead>
                                    <tbody class="divide-y divide-zinc-800/60 bg-zinc-900/30">
                                        <tr v-for="v in filteredActiveEnvVariables" :key="v.id" class="hover:bg-white/5 transition-colors">
                                            <!-- Enabled Checkbox -->
                                            <td class="py-2 px-3 text-center">
                                                <input type="checkbox" v-model="v.enabled" @change="saveStateToServer()" class="rounded bg-zinc-900 border-zinc-700 text-orange-500 focus:ring-0">
                                            </td>
                                            <!-- Key Input -->
                                            <td class="py-2 px-3">
                                                <input v-model="v.key" @blur="saveStateToServer()" placeholder="VARIABLE_NAME" class="w-full bg-zinc-950 border border-zinc-800 focus:border-orange-500 rounded px-2 py-1 text-xs font-mono text-orange-300 placeholder-zinc-600 focus:outline-none">
                                            </td>
                                            <!-- Value Input -->
                                            <td class="py-2 px-3">
                                                <div class="relative flex items-center">
                                                    <input :type="v.isSecret && !envModalShowSecrets[v.id] ? 'password' : 'text'" v-model="v.value" @blur="saveStateToServer()" placeholder="Value..." class="w-full bg-zinc-950 border border-zinc-800 focus:border-orange-500 rounded px-2 py-1 pr-8 text-xs font-mono text-zinc-200 placeholder-zinc-600 focus:outline-none">
                                                    <button v-if="v.isSecret" type="button" @click="envModalShowSecrets[v.id] = !envModalShowSecrets[v.id]" class="absolute right-2 text-zinc-500 hover:text-zinc-300">
                                                        <span class="inline-flex items-center justify-center shrink-0 w-3.5 h-3.5" v-html="renderIcon(envModalShowSecrets[v.id] ? 'eye-off' : 'eye', 'w-3.5 h-3.5')"></span>
                                                    </button>
                                                </div>
                                            </td>
                                            <!-- Initial Value Input -->
                                            <td class="py-2 px-3 hidden md:table-cell">
                                                <input v-model="v.initialValue" @blur="saveStateToServer()" placeholder="Default..." class="w-full bg-zinc-950 border border-zinc-800 focus:border-orange-500 rounded px-2 py-1 text-xs font-mono text-zinc-400 placeholder-zinc-600 focus:outline-none">
                                            </td>
                                            <!-- Secret Toggle -->
                                            <td class="py-2 px-3 text-center">
                                                <button type="button" @click="v.isSecret = !v.isSecret; saveStateToServer()" class="p-1 rounded text-xs transition-colors" :class="v.isSecret ? 'text-amber-400 bg-amber-500/10' : 'text-zinc-600 hover:text-zinc-400'" :title="v.isSecret ? 'Masked Secret' : 'Plain Text'">
                                                    <span class="inline-flex items-center justify-center shrink-0 w-3.5 h-3.5" v-html="renderIcon(v.isSecret ? 'lock' : 'unlock', 'w-3.5 h-3.5')"></span>
                                                </button>
                                            </td>
                                            <!-- Delete Button -->
                                            <td class="py-2 px-3 text-right">
                                                <button @click="deleteVariableFromActiveEnv(v.id)" class="p-1 text-zinc-500 hover:text-rose-400 rounded transition-colors" title="Delete Variable">
                                                    <span class="inline-flex items-center justify-center shrink-0 w-3.5 h-3.5" v-html="renderIcon('trash-2', 'w-3.5 h-3.5')"></span>
                                                </button>
                                            </td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        <!-- Footer -->
                        <div class="p-3 border-t border-white/10 bg-[#161b2a]/50 flex items-center justify-between shrink-0">
                            <span class="text-[11px] text-zinc-400 font-mono">Changes auto-save directly to MySQL/Cloud storage</span>
                            <button @click="saveStateToServer(); activeModal = null" class="px-5 py-1.5 bg-orange-600 hover:bg-orange-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-orange-500/20 transition-all">
                                Done & Save
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <!-- 2. Set As Variable Modal (Matching React SetAsVariableModal.tsx) -->
    <div v-if="activeModal === 'setAsVariableModal'" class="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div class="bg-[#141824] border border-white/10 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col">
            <div class="px-6 py-4 bg-[#181d2c] border-b border-white/10 flex items-center justify-between">
                <div class="flex items-center gap-2.5">
                    <div class="w-8 h-8 rounded-lg bg-orange-500/20 border border-orange-500/30 flex items-center justify-center text-orange-400">
                        <span class="inline-flex items-center justify-center shrink-0 w-4 h-4" v-html="renderIcon('sparkles', 'w-4 h-4 text-orange-400')"></span>
                    </div>
                    <div>
                        <h2 class="font-bold text-white text-base">Set as Variable</h2>
                        <p class="text-xs text-zinc-400">Create a reusable Postman variable across your active scope</p>
                    </div>
                </div>
                <button @click="activeModal = null" class="text-zinc-400 hover:text-white">
                    <span class="inline-flex items-center justify-center shrink-0 w-4 h-4" v-html="renderIcon('x', 'w-4 h-4')"></span>
                </button>
            </div>

            <form @submit.prevent="commitSetAsVariable()" class="p-6 space-y-4 text-xs">
                <!-- Variable Name -->
                <div>
                    <label class="block font-semibold text-zinc-300 mb-1">Variable Name (Key) *</label>
                    <div class="relative flex items-center">
                        <span class="absolute left-2.5 text-zinc-500 font-mono"><span v-pre>{{</span></span>
                        <input v-model="setAsVarKey" required placeholder="token_id" class="w-full bg-zinc-950 border border-zinc-800 rounded-lg pl-8 pr-8 py-2 text-xs font-mono text-orange-300 focus:outline-none focus:border-orange-500">
                        <span class="absolute right-2.5 text-zinc-500 font-mono"><span v-pre>}}</span></span>
                    </div>
                </div>

                <!-- Value -->
                <div>
                    <label class="block font-semibold text-zinc-300 mb-1">Current Value *</label>
                    <textarea v-model="setAsVarValue" required rows="3" placeholder="Variable string, token, or URL..." class="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2.5 text-xs font-mono text-zinc-200 focus:outline-none focus:border-orange-500"></textarea>
                </div>

                <!-- Scope Selector -->
                <div>
                    <label class="block font-semibold text-zinc-300 mb-1.5">Variable Scope</label>
                    <div class="grid grid-cols-3 gap-2">
                        <button type="button" @click="setAsVarScope = 'environment'" class="p-2.5 rounded-xl border text-left transition-all" :class="setAsVarScope === 'environment' ? 'bg-orange-500/20 border-orange-500 text-white font-bold' : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:bg-white/5'">
                            <div class="flex items-center gap-1.5">
                                <span class="inline-flex items-center justify-center shrink-0 w-3.5 h-3.5 text-emerald-400" v-html="renderIcon('globe', 'w-3.5 h-3.5 text-emerald-400')"></span>
                                <span class="text-xs">Active Env</span>
                            </div>
                            <div class="text-[10px] text-zinc-500 mt-1 truncate">{{ activeEnv ? activeEnv.name : 'Development' }}</div>
                        </button>
                        <button type="button" @click="setAsVarScope = 'global'" class="p-2.5 rounded-xl border text-left transition-all" :class="setAsVarScope === 'global' ? 'bg-orange-500/20 border-orange-500 text-white font-bold' : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:bg-white/5'">
                            <div class="flex items-center gap-1.5">
                                <span class="inline-flex items-center justify-center shrink-0 w-3.5 h-3.5 text-amber-400" v-html="renderIcon('layers', 'w-3.5 h-3.5 text-amber-400')"></span>
                                <span class="text-xs">Global</span>
                            </div>
                            <div class="text-[10px] text-zinc-500 mt-1">All Envs & Colls</div>
                        </button>
                        <button type="button" @click="setAsVarScope = 'collection'" class="p-2.5 rounded-xl border text-left transition-all" :class="setAsVarScope === 'collection' ? 'bg-orange-500/20 border-orange-500 text-white font-bold' : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:bg-white/5'">
                            <div class="flex items-center gap-1.5">
                                <span class="inline-flex items-center justify-center shrink-0 w-3.5 h-3.5 text-blue-400" v-html="renderIcon('folder-archive', 'w-3.5 h-3.5 text-blue-400')"></span>
                                <span class="text-xs">Collection</span>
                            </div>
                            <div class="text-[10px] text-zinc-500 mt-1 truncate">{{ activeCollection ? activeCollection.name : 'First Collection' }}</div>
                        </button>
                    </div>
                </div>

                <!-- Secret Masking Toggle -->
                <div class="flex items-center gap-2 pt-1">
                    <input type="checkbox" id="setAsVarIsSecret" v-model="setAsVarIsSecret" class="rounded bg-zinc-900 border-zinc-700 text-orange-500 focus:ring-0">
                    <label for="setAsVarIsSecret" class="text-zinc-300 font-medium cursor-pointer">Mask value as Secret (Passwords, API Keys, JWT Tokens)</label>
                </div>

                <div class="flex justify-end gap-2 pt-3 border-t border-zinc-800">
                    <button type="button" @click="activeModal = null" class="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl font-semibold">Cancel</button>
                    <button type="submit" class="px-5 py-2 bg-orange-600 hover:bg-orange-500 text-white rounded-xl font-bold shadow-lg shadow-orange-500/25 transition-all">Save Variable</button>
                </div>
            </form>
        </div>
    </div>

    <!-- 3. Customer Detail Modal (Matching React CustomerDetailModal.tsx & SaaS 360) -->
    <div v-if="selectedCustomerDetail" class="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div class="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-2xl w-full p-6 space-y-5 shadow-2xl overflow-y-auto max-h-[90vh]">
            <!-- Modal Header -->
            <div class="flex items-center justify-between border-b border-zinc-800 pb-4">
                <div class="flex items-center gap-3">
                    <div class="w-10 h-10 rounded-xl bg-gradient-to-tr from-orange-500 to-amber-600 flex items-center justify-center font-bold text-white text-sm shadow-md">
                        {{ getInitials(selectedCustomerDetail.name) }}
                    </div>
                    <div>
                        <h2 class="text-base font-bold text-white">{{ selectedCustomerDetail.name }}</h2>
                        <p class="text-xs text-zinc-400">{{ selectedCustomerDetail.companyName }} &bull; {{ selectedCustomerDetail.email }}</p>
                    </div>
                </div>
                <button @click="selectedCustomerDetail = null" class="p-1.5 text-zinc-500 hover:text-zinc-300 rounded-lg">
                    <span class="inline-flex items-center justify-center shrink-0 w-5 h-5" v-html="renderIcon('x', 'w-5 h-5')"></span>
                </button>
            </div>

            <!-- Sub Navigation Tabs -->
            <div class="flex items-center gap-1 bg-zinc-950 p-1 rounded-xl border border-zinc-800 text-xs">
                <button @click="customerDetailTab = 'overview'" class="flex-1 py-1.5 rounded-lg font-semibold transition-colors" :class="customerDetailTab === 'overview' ? 'bg-orange-500 text-white shadow' : 'text-zinc-400 hover:text-white'">
                    Economics Overview
                </button>
                <button @click="customerDetailTab = 'usage'" class="flex-1 py-1.5 rounded-lg font-semibold transition-colors" :class="customerDetailTab === 'usage' ? 'bg-orange-500 text-white shadow' : 'text-zinc-400 hover:text-white'">
                    Usage & Quotas
                </button>
                <button @click="customerDetailTab = 'settings'" class="flex-1 py-1.5 rounded-lg font-semibold transition-colors" :class="customerDetailTab === 'settings' ? 'bg-orange-500 text-white shadow' : 'text-zinc-400 hover:text-white'">
                    Plan & Discount Settings
                </button>
            </div>

            <!-- Tab 1: Economics Overview -->
            <div v-if="customerDetailTab === 'overview'" class="space-y-4">
                <div class="text-xs font-bold text-zinc-300 uppercase tracking-wider">Unit Economics & Infrastructure Cost Breakdown</div>
                <div class="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    <div class="p-3 bg-zinc-950 rounded-xl border border-zinc-800">
                        <div class="text-[10px] text-zinc-400">Monthly Plan Fee</div>
                        <div class="text-sm font-bold text-white font-mono mt-1">&#36;{{ parseFloat(selectedCustomerDetail.monthlyFee).toFixed(2) }}</div>
                    </div>
                    <div class="p-3 bg-zinc-950 rounded-xl border border-zinc-800">
                        <div class="text-[10px] text-zinc-400">Gateway Calls</div>
                        <div class="text-sm font-bold text-rose-400 font-mono mt-1">&#36;{{ ((selectedCustomerDetail.usage ? selectedCustomerDetail.usage.totalRequests : 50000) * 0.000003).toFixed(4) }}</div>
                    </div>
                    <div class="p-3 bg-zinc-950 rounded-xl border border-zinc-800">
                        <div class="text-[10px] text-zinc-400">Total Infra Cost</div>
                        <div class="text-sm font-bold text-rose-400 font-mono mt-1">&#36;{{ parseFloat(selectedCustomerDetail.costs ? selectedCustomerDetail.costs.totalCost : 2.50).toFixed(2) }}</div>
                    </div>
                    <div class="p-3 bg-zinc-950 rounded-xl border border-zinc-800">
                        <div class="text-[10px] text-zinc-400">Net Profit Margin</div>
                        <div class="text-sm font-bold text-emerald-400 font-mono mt-1">&#36;{{ parseFloat(selectedCustomerDetail.netMargin || 0).toFixed(2) }} ({{ selectedCustomerDetail.netMarginPercent || 90 }}%)</div>
                    </div>
                </div>

                <div class="p-3.5 bg-zinc-950 rounded-xl border border-zinc-800 space-y-2 text-xs">
                    <div class="flex justify-between">
                        <span class="text-zinc-400">Tenant Account ID:</span>
                        <span class="font-mono text-zinc-300">{{ selectedCustomerDetail.id }}</span>
                    </div>
                    <div class="flex justify-between">
                        <span class="text-zinc-400">Primary Contact:</span>
                        <span class="text-white font-medium">{{ selectedCustomerDetail.name }}</span>
                    </div>
                    <div class="flex justify-between">
                        <span class="text-zinc-400">Current Status:</span>
                        <span class="font-bold uppercase text-emerald-400">{{ customerStatus }}</span>
                    </div>
                </div>
            </div>

            <!-- Tab 2: Usage & Quotas -->
            <div v-else-if="customerDetailTab === 'usage'" class="space-y-4">
                <div class="space-y-2">
                    <div class="flex items-center justify-between text-xs">
                        <span class="text-zinc-400">Monthly API Requests Quota:</span>
                        <span class="font-mono font-bold text-white">
                            {{ ((selectedCustomerDetail.usage ? selectedCustomerDetail.usage.totalRequests : 0)).toLocaleString() }} / {{ ((selectedCustomerDetail.usage ? selectedCustomerDetail.usage.monthlyQuota : 1000000)).toLocaleString() }}
                        </span>
                    </div>
                    <div class="w-full h-2.5 bg-zinc-950 rounded-full overflow-hidden border border-zinc-800">
                        <div class="h-full bg-orange-500 rounded-full" :style="{ width: Math.min(100, Math.round(((selectedCustomerDetail.usage ? selectedCustomerDetail.usage.totalRequests : 0) / (selectedCustomerDetail.usage ? selectedCustomerDetail.usage.monthlyQuota : 1000000)) * 100)) + '%' }"></div>
                    </div>
                </div>

                <div class="grid grid-cols-2 gap-3 text-xs">
                    <div class="p-3 bg-zinc-950 rounded-xl border border-zinc-800">
                        <span class="text-zinc-500 block text-[10px]">Data Bandwidth</span>
                        <span class="text-sm font-bold text-white font-mono mt-0.5">{{ selectedCustomerDetail.usage ? selectedCustomerDetail.usage.dataTransferMb : 420 }} MB</span>
                    </div>
                    <div class="p-3 bg-zinc-950 rounded-xl border border-zinc-800">
                        <span class="text-zinc-500 block text-[10px]">AI Generation Tokens</span>
                        <span class="text-sm font-bold text-white font-mono mt-0.5">{{ selectedCustomerDetail.usage ? (selectedCustomerDetail.usage.aiTokensUsed || 14200).toLocaleString() : '14,200' }}</span>
                    </div>
                </div>
            </div>

            <!-- Tab 3: Plan & Settings -->
            <div v-else-if="customerDetailTab === 'settings'" class="space-y-3">
                <div>
                    <label class="block text-xs font-semibold text-zinc-400 mb-1">Subscription Plan</label>
                    <select v-model="selectedCustomerDetail.plan" class="w-full bg-zinc-950 border border-zinc-700 text-zinc-200 text-xs rounded-xl p-2.5 font-mono">
                        <option value="enterprise">Enterprise ($199.00/mo, 10,000,000 calls quota)</option>
                        <option value="pro">Pro ($29.00/mo, 1,000,000 calls quota)</option>
                        <option value="free">Free ($0.00/mo, 100,000 calls quota)</option>
                    </select>
                </div>
                <div class="grid grid-cols-2 gap-3">
                    <div>
                        <label class="block text-xs font-semibold text-zinc-400 mb-1">Subscription Status</label>
                        <select v-model="customerStatus" class="w-full bg-zinc-950 border border-zinc-700 text-zinc-200 text-xs rounded-xl p-2.5">
                            <option value="active">Active (Paid)</option>
                            <option value="trial">Trial Period</option>
                            <option value="past_due">Past Due</option>
                            <option value="canceled">Canceled</option>
                        </select>
                    </div>
                    <div>
                        <label class="block text-xs font-semibold text-zinc-400 mb-1">Custom Discount %</label>
                        <input v-model.number="customerDiscountPercent" type="number" min="0" max="100" class="w-full bg-zinc-950 border border-zinc-700 text-zinc-200 text-xs rounded-xl p-2.5 font-mono">
                    </div>
                </div>
                <div>
                    <label class="block text-xs font-semibold text-zinc-400 mb-1">Account Notes & SLA Terms</label>
                    <textarea v-model="customerNotes" rows="2" placeholder="Custom SLA requirements, billing contact notes..." class="w-full bg-zinc-950 border border-zinc-700 text-zinc-200 text-xs rounded-xl p-2.5"></textarea>
                </div>
                <button @click="saveCustomerPlan(selectedCustomerDetail)" class="w-full py-2.5 bg-orange-600 hover:bg-orange-500 text-white text-xs font-bold rounded-xl shadow transition-colors">
                    Save Customer Plan & Settings
                </button>
            </div>

            <div class="flex justify-end gap-2 pt-2 border-t border-zinc-800">
                <button @click="selectedCustomerDetail = null" class="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-semibold rounded-xl">
                    Close
                </button>
            </div>
        </div>
    </div>

        <!-- Auth Modal -->
    <div v-if="activeModal === 'authModal'" class="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div class="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-sm p-6 shadow-2xl space-y-4">
            <div class="flex items-center justify-between border-b border-zinc-800 pb-3">
                <h3 class="text-sm font-bold text-white flex items-center gap-2"><span class="inline-flex items-center justify-center shrink-0 w-4 h-4 text-orange-400" v-html="renderIcon('lock', 'w-4 h-4 text-orange-400')"></span> Account Authentication</h3>
                <button @click="activeModal = null" class="text-zinc-400 hover:text-white"><span class="inline-flex items-center justify-center shrink-0 w-4 h-4" v-html="renderIcon('x', 'w-4 h-4')"></span></button>
            </div>

            <form action="auth?action=login" method="POST" class="space-y-3">
                <div>
                    <label class="block text-xs font-semibold text-zinc-400 mb-1">Email Address</label>
                    <input type="email" name="email" required placeholder="alex@example.com" class="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2.5 text-xs text-zinc-200 focus:outline-none focus:border-orange-500">
                </div>
                <div>
                    <label class="block text-xs font-semibold text-zinc-400 mb-1">Password</label>
                    <input type="password" name="password" required placeholder="••••••••" class="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2.5 text-xs text-zinc-200 focus:outline-none focus:border-orange-500">
                </div>
                <button type="submit" class="w-full py-2.5 bg-orange-600 hover:bg-orange-500 text-white rounded-lg text-xs font-bold transition-colors">Sign In to CloudPost</button>
            </form>

            <div class="text-center pt-1 text-xs text-zinc-400">
                Don't have an account? 
                <button type="button" @click="activeModal = null; openRegisterTab()" class="text-orange-400 hover:text-orange-300 font-semibold underline ml-1">Create Account</button>
            </div>
        </div>
    </div>

    <!-- Quick Auth Presets Modal -->
    <div v-if="activeModal === 'quickAuthModal'" class="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div class="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <!-- Modal Header -->
            <div class="px-6 py-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-950/60 shrink-0">
                <div class="flex items-center gap-3">
                    <div class="p-2 rounded-xl bg-orange-500/10 text-orange-400 border border-orange-500/20">
                        <span class="inline-flex items-center justify-center shrink-0 w-5 h-5" v-html="renderIcon('zap', 'w-5 h-5')"></span>
                    </div>
                    <div>
                        <h3 class="text-sm font-bold text-white flex items-center gap-2">
                            <span>Quick Auth Presets</span>
                            <span class="text-[10px] font-mono bg-orange-500/10 text-orange-400 border border-orange-500/20 px-2 py-0.5 rounded-full font-semibold">1-Click Automation</span>
                        </h3>
                        <p class="text-xs text-zinc-400">Instantly configure OAuth2, Bearer tokens, AI services, and custom API keys.</p>
                    </div>
                </div>
                <button @click="activeModal = null" class="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors">
                    <span class="inline-flex items-center justify-center shrink-0 w-4 h-4" v-html="renderIcon('x', 'w-4 h-4')"></span>
                </button>
            </div>

            <!-- Search and Category Filters -->
            <div class="p-4 border-b border-zinc-800 bg-zinc-950/30 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
                <div class="relative w-full sm:w-72">
                    <span class="inline-flex items-center justify-center shrink-0 w-4 h-4 absolute left-3 top-2.5 text-zinc-500" v-html="renderIcon('search', 'w-4 h-4 absolute left-3 top-2.5 text-zinc-500')"></span>
                    <input v-model="quickAuthSearch" type="text" placeholder="Search presets (OAuth, OpenAI, Stripe...)" class="w-full bg-zinc-900 border border-zinc-800 rounded-lg pl-9 pr-3 py-1.5 text-xs text-zinc-200 focus:outline-none focus:border-orange-500 font-medium">
                </div>
                <div class="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto">
                    <button v-for="cat in ['all', 'oauth2', 'api_key', 'bearer', 'basic']" :key="cat"
                        @click="quickAuthCategory = cat"
                        class="px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap capitalize transition-colors"
                        :class="quickAuthCategory === cat ? 'bg-orange-500/20 text-orange-300 border border-orange-500/30' : 'text-zinc-400 hover:text-zinc-200 bg-zinc-900 border border-zinc-800'">
                        {{ cat === 'all' ? 'All Presets' : cat.replace('_', ' ') }}
                    </button>
                </div>
            </div>

            <!-- Modal Body (Two-Column Layout) -->
            <div class="flex-1 overflow-hidden grid grid-cols-1 md:grid-cols-12 min-h-0">
                <!-- Left: Preset List -->
                <div class="md:col-span-5 border-r border-zinc-800 overflow-y-auto p-3 space-y-2">
                    <div v-for="preset in filteredQuickAuthPresets" :key="preset.id"
                        @click="selectedQuickPreset = preset"
                        class="p-3 rounded-xl border transition-all cursor-pointer text-left"
                        :class="(selectedQuickPreset && selectedQuickPreset.id) === preset.id ? 'bg-orange-500/10 border-orange-500/40' : 'bg-zinc-950/50 border-zinc-800 hover:border-zinc-700 hover:bg-zinc-900/50'">
                        <div class="flex items-center justify-between mb-1">
                            <span class="text-xs font-bold text-white">{{ preset.name }}</span>
                            <span class="text-[10px] font-mono px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 uppercase font-semibold">{{ preset.category }}</span>
                        </div>
                        <p class="text-[11px] text-zinc-400 line-clamp-2">{{ preset.description }}</p>
                        <div class="mt-2 flex items-center gap-1.5 flex-wrap">
                            <span v-if="(preset.authConfig && preset.authConfig.type)" class="text-[10px] bg-zinc-900 text-zinc-300 px-1.5 py-0.5 rounded border border-zinc-800 font-mono">
                                Auth: {{ preset.authConfig.type }}
                            </span>
                            <span v-if="preset.headers && preset.headers.length" class="text-[10px] bg-emerald-500/10 text-emerald-300 px-1.5 py-0.5 rounded border border-emerald-500/20 font-mono">
                                +{{ preset.headers.length }} Header
                            </span>
                            <span v-if="preset.params && preset.params.length" class="text-[10px] bg-purple-500/10 text-purple-300 px-1.5 py-0.5 rounded border border-purple-500/20 font-mono">
                                +{{ preset.params.length }} Param
                            </span>
                        </div>
                    </div>
                </div>

                <!-- Right: Preset Details & Customization -->
                <div class="md:col-span-7 overflow-y-auto p-4 flex flex-col justify-between space-y-4 bg-zinc-950/30">
                    <div v-if="selectedQuickPreset" class="space-y-4">
                        <div>
                            <div class="flex items-center justify-between mb-1">
                                <h4 class="text-sm font-bold text-white">{{ selectedQuickPreset.name }}</h4>
                                <span class="text-[11px] font-mono text-orange-400 font-bold bg-orange-500/10 px-2 py-0.5 rounded border border-orange-500/20">
                                    {{ selectedQuickPreset.category.toUpperCase() }}
                                </span>
                            </div>
                            <p class="text-xs text-zinc-400">{{ selectedQuickPreset.description }}</p>
                        </div>

                        <!-- Custom Token / Variable Override -->
                        <div class="p-3 bg-zinc-900/70 border border-zinc-800 rounded-xl space-y-2">
                            <label class="block text-xs font-semibold text-zinc-300">Token or Secret Variable Value (Optional)</label>
                            <input v-model="customQuickToken" type="text" placeholder="e.g. {{apiKey}} or custom secret token..." class="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2 text-xs text-zinc-200 font-mono focus:border-orange-500">
                            <div class="flex items-center gap-1.5 flex-wrap text-[10px]">
                                <span class="text-zinc-500">Quick insert:</span>
                                <button type="button" @click="customQuickToken = '{{' + 'apiKey}}'" class="px-1.5 py-0.5 rounded bg-zinc-800 text-orange-300 hover:bg-zinc-700 font-mono"><span v-pre>{{apiKey}}</span></button>
                                <button type="button" @click="customQuickToken = '{{' + 'token}}'" class="px-1.5 py-0.5 rounded bg-zinc-800 text-orange-300 hover:bg-zinc-700 font-mono"><span v-pre>{{token}}</span></button>
                                <button type="button" @click="customQuickToken = '{{' + 'bearerToken}}'" class="px-1.5 py-0.5 rounded bg-zinc-800 text-orange-300 hover:bg-zinc-700 font-mono"><span v-pre>{{bearerToken}}</span></button>
                            </div>
                        </div>

                        <!-- Injection Preview -->
                        <div class="space-y-3">
                            <h5 class="text-xs font-bold text-zinc-300 uppercase tracking-wider">Configuration Preview</h5>
                            
                            <!-- Auth Type -->
                            <div class="p-2.5 bg-zinc-900 border border-zinc-800 rounded-lg flex items-center justify-between text-xs">
                                <span class="text-zinc-400 font-medium">Auth Type</span>
                                <span class="font-mono text-orange-400 font-bold capitalize">{{ (selectedQuickPreset && selectedQuickPreset.authConfig ? selectedQuickPreset.authConfig.type : "none") || 'none' }}</span>
                            </div>

                            <!-- Headers to Add -->
                            <div v-if="selectedQuickPreset.headers && selectedQuickPreset.headers.length" class="space-y-1.5">
                                <span class="text-[11px] font-semibold text-zinc-400">Headers Injected:</span>
                                <div v-for="(h, idx) in selectedQuickPreset.headers" :key="idx" class="p-2 bg-zinc-900 border border-zinc-800 rounded-lg flex items-center justify-between text-xs font-mono">
                                    <span class="text-zinc-300 font-bold">{{ h.key }}</span>
                                    <span class="text-orange-400 truncate max-w-xs">{{ customQuickToken || h.value }}</span>
                                </div>
                            </div>

                            <!-- Params to Add -->
                            <div v-if="selectedQuickPreset.params && selectedQuickPreset.params.length" class="space-y-1.5">
                                <span class="text-[11px] font-semibold text-zinc-400">Query Parameters Injected:</span>
                                <div v-for="(p, idx) in selectedQuickPreset.params" :key="idx" class="p-2 bg-zinc-900 border border-zinc-800 rounded-lg flex items-center justify-between text-xs font-mono">
                                    <span class="text-zinc-300 font-bold">{{ p.key }}</span>
                                    <span class="text-purple-400 truncate max-w-xs">{{ customQuickToken || p.value }}</span>
                                </div>
                            </div>
                        </div>

                        <!-- Apply Mode Selection -->
                        <div class="pt-2 border-t border-zinc-800 space-y-1.5">
                            <label class="block text-xs font-semibold text-zinc-400">Target Injection Mode</label>
                            <div class="grid grid-cols-3 gap-2 text-xs">
                                <button type="button" @click="quickAuthApplyMode = 'both'"
                                    :class="quickAuthApplyMode === 'both' ? 'bg-orange-500/20 border-orange-500 text-orange-300 font-bold' : 'bg-zinc-900 border-zinc-800 text-zinc-400'"
                                    class="p-2 rounded-lg border text-center transition-colors">
                                    Auth + Headers
                                </button>
                                <button type="button" @click="quickAuthApplyMode = 'auth_only'"
                                    :class="quickAuthApplyMode === 'auth_only' ? 'bg-orange-500/20 border-orange-500 text-orange-300 font-bold' : 'bg-zinc-900 border-zinc-800 text-zinc-400'"
                                    class="p-2 rounded-lg border text-center transition-colors">
                                    Auth Only
                                </button>
                                <button type="button" @click="quickAuthApplyMode = 'headers_params_only'"
                                    :class="quickAuthApplyMode === 'headers_params_only' ? 'bg-orange-500/20 border-orange-500 text-orange-300 font-bold' : 'bg-zinc-900 border-zinc-800 text-zinc-400'"
                                    class="p-2 rounded-lg border text-center transition-colors">
                                    Headers Only
                                </button>
                            </div>
                        </div>
                    </div>

                    <!-- Bottom Action Buttons -->
                    <div class="pt-4 border-t border-zinc-800 flex items-center justify-end gap-3 shrink-0">
                        <button type="button" @click="activeModal = null" class="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg text-xs font-semibold">
                            Cancel
                        </button>
                        <button type="button" @click="applyQuickAuthPreset(selectedQuickPreset)" :disabled="!selectedQuickPreset" class="px-5 py-2 bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-orange-500/20 cursor-pointer disabled:opacity-50">
                            <span class="inline-flex items-center justify-center shrink-0 w-4 h-4" v-html="renderIcon('check', 'w-4 h-4')"></span>
                            <span>Apply Preset to Request</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <!-- Export Code Snippet Modal (100% Parity with React CodeSnippetModal) -->
    <div v-if="activeModal === 'exportCodeModal'" class="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div class="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-3xl overflow-hidden shadow-2xl flex flex-col max-h-[85vh]">
            <div class="px-5 py-3.5 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/60">
                <div class="flex items-center gap-2">
                    <span class="inline-flex items-center justify-center shrink-0 w-4 h-4 text-orange-400" v-html="renderIcon('code-2', 'w-4 h-4 text-orange-400')"></span>
                    <h3 class="text-sm font-bold text-white">Generate Client Code Snippet</h3>
                </div>
                <button type="button" @click="activeModal = null" class="text-zinc-400 hover:text-white"><span class="inline-flex items-center justify-center shrink-0 w-4 h-4" v-html="renderIcon('x', 'w-4 h-4')"></span></button>
            </div>

            <!-- Language Dropdown Selector -->
            <div class="px-5 py-3 border-b border-zinc-800 bg-zinc-950/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs shrink-0">
                <div class="flex items-center gap-2.5">
                    <label class="text-zinc-400 font-medium">Target Language & Client:</label>
                    <select v-model="exportCodeLang" class="bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-1.5 text-zinc-100 font-medium focus:outline-none focus:border-orange-500 cursor-pointer text-xs min-w-[220px]">
                        <optgroup label="Command Line">
                            <option value="curl">cURL (curl --location)</option>
                            <option value="shell-httpie">HTTPie (http)</option>
                            <option value="shell-wget">Wget (wget)</option>
                        </optgroup>
                        <optgroup label="JavaScript / Browser">
                            <option value="js-fetch">JavaScript (Fetch)</option>
                            <option value="js-axios">JavaScript (Axios)</option>
                            <option value="js-jquery">JavaScript (jQuery $.ajax)</option>
                            <option value="js-xhr">JavaScript (XHR)</option>
                        </optgroup>
                        <optgroup label="Node.js">
                            <option value="node-axios">Node.js (Axios)</option>
                            <option value="node-native">Node.js (Native HTTP/S)</option>
                        </optgroup>
                        <optgroup label="Python">
                            <option value="python-requests">Python (Requests)</option>
                            <option value="python-httpclient">Python (http.client)</option>
                        </optgroup>
                        <optgroup label="PHP">
                            <option value="php-curl">PHP (cURL)</option>
                            <option value="php-guzzle">PHP (Guzzle)</option>
                        </optgroup>
                        <optgroup label="Go">
                            <option value="go-native">Go (Native net/http)</option>
                        </optgroup>
                        <optgroup label="Java">
                            <option value="java-okhttp">Java (OkHttp)</option>
                        </optgroup>
                        <optgroup label="C# / .NET">
                            <option value="csharp-httpclient">C# (HttpClient)</option>
                            <option value="csharp-restsharp">C# (RestSharp)</option>
                        </optgroup>
                        <optgroup label="Ruby">
                            <option value="ruby-nethttp">Ruby (Net::HTTP)</option>
                        </optgroup>
                        <optgroup label="Rust">
                            <option value="rust-reqwest">Rust (reqwest)</option>
                        </optgroup>
                        <optgroup label="Swift">
                            <option value="swift-urlsession">Swift (URLSession)</option>
                        </optgroup>
                        <optgroup label="Dart / Flutter">
                            <option value="dart-http">Dart (http)</option>
                        </optgroup>
                        <optgroup label="Kotlin">
                            <option value="kotlin-okhttp">Kotlin (OkHttp)</option>
                        </optgroup>
                    </select>
                </div>
                <div class="flex items-center gap-1.5">
                    <span class="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                    <span class="text-[11px] text-zinc-400">Postman-Grade Native Exporter Parity</span>
                </div>
            </div>

            <!-- Code Output Display -->
            <div class="flex-1 p-5 overflow-auto bg-[#07090e] font-mono text-xs">
                <pre class="text-emerald-300 leading-relaxed overflow-x-auto select-all whitespace-pre-wrap">{{ codeSnippetGenerated }}</pre>
            </div>

            <!-- Bottom Actions -->
            <div class="px-5 py-3 border-t border-zinc-800 bg-zinc-900/60 flex items-center justify-between shrink-0">
                <span class="text-xs text-zinc-400">Environment variables are automatically resolved in code snippets.</span>
                <div class="flex items-center gap-2">
                    <button type="button" @click="downloadCodeSnippet()" class="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold flex items-center gap-1.5 transition-colors">
                        <span class="inline-flex items-center justify-center shrink-0 w-3.5 h-3.5" v-html="renderIcon('download', 'w-3.5 h-3.5')"></span>
                        <span>Download</span>
                    </button>
                    <button type="button" @click="copyCodeSnippet()" class="px-4 py-1.5 rounded-lg bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-md transition-all">
                        <span v-if="codeCopied" class="inline-flex items-center justify-center shrink-0 w-3.5 h-3.5 text-emerald-300" v-html="renderIcon('check', 'w-3.5 h-3.5 text-emerald-300')"></span>
                        <span v-else class="inline-flex items-center justify-center shrink-0 w-3.5 h-3.5" v-html="renderIcon('copy', 'w-3.5 h-3.5')"></span>
                        <span>{{ codeCopied ? 'Copied Code!' : 'Copy Code' }}</span>
                    </button>
                </div>
            </div>
        </div>
    </div>

    <!-- Share Request & Collection Modal (100% Parity with React ShareLinkModal) -->
    <div v-if="activeModal === 'shareModal'" class="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div class="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-lg p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div class="flex items-center justify-between border-b border-zinc-800 pb-3">
                <div class="flex items-center gap-2">
                    <span class="inline-flex items-center justify-center shrink-0 w-4 h-4 text-orange-400" v-html="renderIcon('share-2', 'w-4 h-4 text-orange-400')"></span>
                    <h3 class="text-sm font-bold text-white">{{ shareTargetType === 'collection' ? 'Share API Collection' : 'Share API Request' }}</h3>
                </div>
                <button type="button" @click="activeModal = null" class="text-zinc-400 hover:text-white"><span class="inline-flex items-center justify-center shrink-0 w-4 h-4" v-html="renderIcon('x', 'w-4 h-4')"></span></button>
            </div>

            <div class="space-y-4 text-xs">
                <div>
                    <label class="block font-semibold text-zinc-300 mb-1">Target Name</label>
                    <div class="p-2 bg-zinc-950 border border-zinc-800 rounded-lg text-orange-400 font-mono text-[11px] font-bold">
                        {{ shareTargetType === 'collection' ? (shareTargetCollection ? shareTargetCollection.name : 'Collection') : (shareTargetRequest ? shareTargetRequest.name : (activeRequest ? activeRequest.name : 'Request')) }}
                    </div>
                </div>

                <!-- 1. CloudPost Deep Link -->
                <div>
                    <label class="block font-semibold text-zinc-300 mb-1">CloudPost Web App Share Link</label>
                    <div class="flex items-center gap-2">
                        <input type="text" :value="shareableLinkUrl" readonly class="flex-1 bg-zinc-950 border border-zinc-800 rounded-lg p-2 text-zinc-300 font-mono text-[11px] focus:outline-none truncate">
                        <button type="button" @click="copyShareLink()" class="px-3 py-2 rounded-lg bg-orange-600 hover:bg-orange-500 text-white font-bold shrink-0">
                            {{ shareLinkCopied ? 'Copied!' : 'Copy Link' }}
                        </button>
                    </div>
                    <p class="text-[11px] text-zinc-400 mt-1">Direct preview & 1-click import inside CloudPost Studio.</p>
                </div>

                <!-- 2. Direct Postman Import Link (Raw JSON) -->
                <div class="p-3.5 bg-gradient-to-br from-orange-500/10 to-amber-500/10 border border-orange-500/30 rounded-xl space-y-1.5">
                    <div class="flex items-center justify-between">
                        <label class="block font-bold text-orange-300 uppercase tracking-wider text-[11px]">
                            Postman Direct Import Link (Raw JSON)
                        </label>
                        <span class="text-[10px] text-orange-400 bg-orange-500/20 px-2 py-0.5 rounded font-mono font-bold">
                            Import → Link in Postman
                        </span>
                    </div>
                    <div class="flex items-center gap-2">
                        <input type="text" :value="shareablePostmanUrl" readonly class="flex-1 bg-zinc-950 border border-orange-500/30 rounded-lg p-2 text-orange-200 font-mono text-[11px] focus:outline-none truncate">
                        <button type="button" @click="copySharePostmanLink()" class="px-3 py-2 rounded-lg bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-bold shrink-0 shadow-md">
                            {{ sharePostmanCopied ? 'Copied!' : 'Copy Postman Link' }}
                        </button>
                    </div>
                    <p class="text-[11px] text-zinc-300">
                        In Postman, click <strong>Import → Link</strong> and paste this URL to immediately import this {{ shareTargetType === 'collection' ? 'collection' : 'request' }}!
                    </p>
                </div>

                <!-- Quick Download Buttons -->
                <div>
                    <label class="block font-semibold text-zinc-400 mb-1.5">Direct JSON File Downloads:</label>
                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <button type="button" @click="exportPostmanCollection()" class="p-2.5 rounded-xl bg-zinc-950 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 hover:text-white flex items-center justify-center gap-1.5 text-xs">
                            <span class="inline-flex items-center justify-center shrink-0 w-3.5 h-3.5 text-amber-400" v-html="renderIcon('download', 'w-3.5 h-3.5')"></span>
                            <span>Download Postman JSON</span>
                        </button>
                        <button type="button" @click="exportCloudPostCollection()" class="p-2.5 rounded-xl bg-zinc-950 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 hover:text-white flex items-center justify-center gap-1.5 text-xs">
                            <span class="inline-flex items-center justify-center shrink-0 w-3.5 h-3.5 text-emerald-400" v-html="renderIcon('layers', 'w-3.5 h-3.5')"></span>
                            <span>Download CloudPost JSON</span>
                        </button>
                    </div>
                </div>

                <div v-if="shareTargetType !== 'collection'">
                    <label class="block font-semibold text-zinc-300 mb-1">cURL Command Export</label>
                    <div class="flex items-center gap-2">
                        <input type="text" :value="generateCodeSnippetByLang('curl', shareTargetRequest || activeRequest, activeEnv)" readonly class="flex-1 bg-zinc-950 border border-zinc-800 rounded-lg p-2 text-zinc-300 font-mono text-[11px] focus:outline-none truncate">
                        <button type="button" @click="copyShareCurl()" class="px-3 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-semibold shrink-0">
                            {{ shareCurlCopied ? 'Copied!' : 'Copy cURL' }}
                        </button>
                    </div>
                </div>

                <div class="p-3 bg-zinc-950/60 border border-zinc-800 rounded-xl space-y-1 text-zinc-400">
                    <p class="font-semibold text-zinc-300">Fast Team Collaboration</p>
                    <p>Both CloudPost and Postman formats are supported for instant cross-tool importing.</p>
                </div>
            </div>
        </div>
    </div>

    <!-- New Collection Modal -->
    <div v-if="activeModal === 'newCollectionModal'" class="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div class="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <div class="flex items-center justify-between border-b border-zinc-800 pb-3">
                <div class="flex items-center gap-2">
                    <span class="inline-flex items-center justify-center shrink-0 w-4 h-4 text-orange-400" v-html="renderIcon('folder', 'w-4 h-4 text-orange-400')"></span>
                    <h3 class="text-sm font-bold text-white">Create New Collection</h3>
                </div>
                <button type="button" @click="activeModal = null" class="text-zinc-400 hover:text-white"><span class="inline-flex items-center justify-center shrink-0 w-4 h-4" v-html="renderIcon('x', 'w-4 h-4')"></span></button>
            </div>

            <div class="space-y-3 text-xs">
                <div>
                    <label class="block font-semibold text-zinc-300 mb-1">Collection Name</label>
                    <input v-model="newCollectionName" type="text" placeholder="e.g. Stripe API, User Service" class="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2 text-zinc-200 font-mono focus:border-orange-500">
                </div>
                <div>
                    <label class="block font-semibold text-zinc-300 mb-1">Description (Optional)</label>
                    <input v-model="newCollectionDesc" type="text" placeholder="e.g. Core authentication endpoints" class="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2 text-zinc-200 font-mono focus:border-orange-500">
                </div>
                <div class="pt-2 flex justify-end gap-2">
                    <button type="button" @click="activeModal = null" class="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-medium">Cancel</button>
                    <button type="button" @click="createCollection()" :disabled="!newCollectionName.trim()" class="px-4 py-1.5 rounded-lg bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white font-bold disabled:opacity-50">Create Collection</button>
                </div>
            </div>
        </div>
    </div>

    <!-- New Folder Modal -->
    <div v-if="activeModal === 'newFolderModal'" class="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div class="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <div class="flex items-center justify-between border-b border-zinc-800 pb-3">
                <div class="flex items-center gap-2">
                    <span class="inline-flex items-center justify-center shrink-0 w-4 h-4 text-amber-400" v-html="renderIcon('folder-open', 'w-4 h-4 text-amber-400')"></span>
                    <h3 class="text-sm font-bold text-white">Add Folder to Collection</h3>
                </div>
                <button type="button" @click="activeModal = null" class="text-zinc-400 hover:text-white"><span class="inline-flex items-center justify-center shrink-0 w-4 h-4" v-html="renderIcon('x', 'w-4 h-4')"></span></button>
            </div>

            <div class="space-y-3 text-xs">
                <div>
                    <label class="block font-semibold text-zinc-300 mb-1">Folder Name</label>
                    <input v-model="newFolderName" type="text" placeholder="e.g. Auth, Customers, Billing" class="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2 text-zinc-200 font-mono focus:border-orange-500">
                </div>
                <div class="pt-2 flex justify-end gap-2">
                    <button type="button" @click="activeModal = null" class="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-medium">Cancel</button>
                    <button type="button" @click="createFolder()" :disabled="!newFolderName.trim()" class="px-4 py-1.5 rounded-lg bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white font-bold disabled:opacity-50">Add Folder</button>
                </div>
            </div>
        </div>
    </div>

    <!-- Quick Add Environment Variable Modal -->
    <div v-if="activeModal === 'quickVarModal'" class="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div class="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <div class="flex items-center justify-between border-b border-zinc-800 pb-3">
                <div class="flex items-center gap-2">
                    <span class="inline-flex items-center justify-center shrink-0 w-4 h-4 text-emerald-400" v-html="renderIcon('globe', 'w-4 h-4 text-emerald-400')"></span>
                    <h3 class="text-sm font-bold text-white">Quick Add Environment Variable</h3>
                </div>
                <button type="button" @click="activeModal = null" class="text-zinc-400 hover:text-white"><span class="inline-flex items-center justify-center shrink-0 w-4 h-4" v-html="renderIcon('x', 'w-4 h-4')"></span></button>
            </div>

            <div class="space-y-3 text-xs">
                <div>
                    <label class="block font-semibold text-zinc-300 mb-1">Target Environment</label>
                    <span class="text-orange-400 font-bold font-mono">{{ activeEnv ? activeEnv.name : 'Development' }}</span>
                </div>
                <div>
                    <label class="block font-semibold text-zinc-300 mb-1">Variable Name (Key)</label>
                    <input v-model="quickVarKey" type="text" placeholder="e.g. baseUrl, apiKey, token" class="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2 text-zinc-200 font-mono focus:border-orange-500">
                </div>
                <div>
                    <label class="block font-semibold text-zinc-300 mb-1">Variable Value</label>
                    <input v-model="quickVarValue" type="text" placeholder="e.g. https://api.example.com or secret_123" class="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2 text-zinc-200 font-mono focus:border-orange-500">
                </div>
                <div class="pt-2 flex justify-end gap-2">
                    <button type="button" @click="activeModal = null" class="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-medium">Cancel</button>
                    <button type="button" @click="saveQuickVar()" :disabled="!quickVarKey.trim()" class="px-4 py-1.5 rounded-lg bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white font-bold disabled:opacity-50">Add Variable</button>
                </div>
            </div>
        </div>
    </div>

    <!-- Guest Restriction Notice Modal -->
    <div v-if="activeModal === 'guestRestrictionModal'" class="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div class="bg-zinc-900 border border-amber-500/30 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                    <span class="inline-flex items-center justify-center shrink-0 w-5 h-5" v-html="renderIcon('shield-alert', 'w-5 h-5 text-amber-400')"></span>
                </div>
                <div>
                    <h3 class="text-sm font-bold text-white">Authentication Required</h3>
                    <p class="text-xs text-zinc-400">Guest Action Restricted</p>
                </div>
            </div>

            <p class="text-xs text-zinc-300 leading-relaxed">
                {{ guestRestrictionMessage }}
            </p>

            <div class="pt-2 flex justify-end gap-2 border-t border-zinc-800">
                <button type="button" @click="activeModal = null" class="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-medium text-xs">Cancel</button>
                <button type="button" @click="activeModal = 'authModal'" class="px-4 py-1.5 rounded-lg bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-lg shadow-orange-500/20">
                    <span class="inline-flex items-center justify-center shrink-0 w-3.5 h-3.5" v-html="renderIcon('lock', 'w-3.5 h-3.5')"></span>
                    <span>Sign In / Register</span>
                </button>
            </div>
        </div>
    </div>

    <!-- Guest Reset Confirmation Modal (PHP Parity) -->
    <div v-if="activeModal === 'guestResetConfirmModal'" class="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div class="bg-[#131724] border border-amber-500/30 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
                    <span class="inline-flex items-center justify-center shrink-0 w-5 h-5" v-html="renderIcon('shield-alert', 'w-5 h-5 text-amber-400')"></span>
                </div>
                <div>
                    <h3 class="text-sm font-bold text-white">Change Guest User Session?</h3>
                    <p class="text-xs text-amber-400 font-medium">Confirmation required before changing guest session</p>
                </div>
            </div>

            <div class="bg-[#181d2d] border border-white/10 rounded-xl p-3 flex items-center justify-between text-xs">
                <div class="flex items-center gap-2">
                    <span class="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>
                    <span class="text-zinc-400">Current Guest User:</span>
                    <span class="font-mono font-bold text-amber-300 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                        Guest #{{ guestShortCode }}
                    </span>
                </div>
                <span class="text-[10px] text-zinc-500 uppercase tracking-wider font-semibold">Active</span>
            </div>

            <div class="space-y-2 text-xs text-zinc-300 leading-relaxed">
                <div class="p-3 bg-amber-500/5 border border-amber-500/20 rounded-xl flex gap-2.5 items-start">
                    <span class="inline-flex items-center justify-center shrink-0 w-4 h-4 text-amber-400 mt-0.5" v-html="renderIcon('alert-triangle', 'w-4 h-4 text-amber-400')"></span>
                    <p>
                        Are you sure you want to change your guest user? Starting a fresh guest session assigns a new guest identity. Your existing workspace and request data will remain stored in browser memory under your current guest ID.
                    </p>
                </div>
                <p class="text-zinc-400 text-[11.5px]">
                    To save your workspaces permanently and access them across devices or collaborate with team members, consider registering a free account.
                </p>
            </div>

            <div class="pt-2 flex items-center justify-end gap-2 border-t border-white/10">
                <button type="button" @click="activeModal = null" class="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-medium text-xs">
                    Cancel (Keep Current)
                </button>
                <button type="button" @click="confirmGuestReset()" id="php-confirm-guest-reset-btn" class="px-4 py-1.5 rounded-lg bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-lg shadow-orange-500/20">
                    <span class="inline-flex items-center justify-center shrink-0 w-3.5 h-3.5" v-html="renderIcon('refresh-cw', 'w-3.5 h-3.5')"></span>
                    <span>Confirm & Change Guest</span>
                </button>
            </div>

            <div class="pt-2 border-t border-white/5 flex items-center justify-between text-xs">
                <span class="text-zinc-400 text-[11px]">Want permanent cloud backup?</span>
                <button type="button" @click="activeModal = null; openRegisterTab()" class="text-orange-400 hover:text-orange-300 font-semibold flex items-center gap-1 text-xs">
                    <span class="inline-flex items-center justify-center shrink-0 w-3.5 h-3.5" v-html="renderIcon('sparkles', 'w-3.5 h-3.5 text-amber-400')"></span>
                    <span>Register Account Instead</span>
                </button>
            </div>
        </div>
    </div>

    <!-- New Workspace Modal -->
    <div v-if="activeModal === 'newWorkspaceModal'" class="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div class="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <div class="flex items-center justify-between border-b border-zinc-800 pb-3">
                <div class="flex items-center gap-2">
                    <span class="inline-flex items-center justify-center shrink-0 w-4 h-4 text-orange-400" v-html="renderIcon('layers', 'w-4 h-4 text-orange-400')"></span>
                    <h3 class="text-sm font-bold text-white">Create New Workspace</h3>
                </div>
                <button @click="activeModal = null" class="text-zinc-500 hover:text-zinc-300">
                    <span class="inline-flex items-center justify-center shrink-0 w-4 h-4" v-html="renderIcon('x', 'w-4 h-4')"></span>
                </button>
            </div>

            <div class="space-y-3 text-xs">
                <div>
                    <label class="block font-semibold text-zinc-300 mb-1">Workspace Name</label>
                    <input v-model="newWorkspaceName" type="text" placeholder="e.g. Production APIs, Mobile Team" class="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2 text-zinc-200 focus:border-orange-500">
                </div>
                <div>
                    <label class="block font-semibold text-zinc-300 mb-1">Workspace Type</label>
                    <select v-model="newWorkspaceType" class="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2 text-zinc-200 focus:border-orange-500">
                        <option value="team">Team Collaboration</option>
                        <option value="personal">Personal Project</option>
                        <option value="public">Public / Open API</option>
                    </select>
                </div>
                <div>
                    <label class="block font-semibold text-zinc-300 mb-1">Description (Optional)</label>
                    <input v-model="newWorkspaceDesc" type="text" placeholder="Short description..." class="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2 text-zinc-200 focus:border-orange-500">
                </div>
                <div class="pt-2 flex justify-end gap-2">
                    <button type="button" @click="activeModal = null" class="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-medium">Cancel</button>
                    <button type="button" @click="createWorkspace(); activeModal = null" :disabled="!newWorkspaceName.trim()" class="px-4 py-1.5 rounded-lg bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white font-bold disabled:opacity-50">Create Workspace</button>
                </div>
            </div>
        </div>
    </div>

    <!-- New Mock Server Modal -->
    <div v-if="showNewMockServerModal" class="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div class="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <div class="flex items-center justify-between border-b border-zinc-800 pb-3">
                <div class="flex items-center gap-2">
                    <span class="inline-flex items-center justify-center shrink-0 w-4 h-4 text-cyan-400" v-html="renderIcon('server', 'w-4 h-4 text-cyan-400')"></span>
                    <h3 class="text-sm font-bold text-white">Create Virtual Mock Server</h3>
                </div>
                <button @click="showNewMockServerModal = false" class="text-zinc-500 hover:text-zinc-300">
                    <span class="inline-flex items-center justify-center shrink-0 w-4 h-4" v-html="renderIcon('x', 'w-4 h-4')"></span>
                </button>
            </div>

            <div class="space-y-3 text-xs">
                <div>
                    <label class="block font-semibold text-zinc-300 mb-1">Server Name</label>
                    <input v-model="newMockServerName" type="text" placeholder="e.g. Payments Gateway Simulator" class="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2 text-zinc-200 focus:border-cyan-500">
                </div>
                <div>
                    <label class="block font-semibold text-zinc-300 mb-1">Description (Optional)</label>
                    <input v-model="newMockServerDesc" type="text" placeholder="e.g. Mock billing APIs for frontend team" class="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2 text-zinc-200 focus:border-cyan-500">
                </div>
                <div class="pt-2 flex justify-end gap-2">
                    <button type="button" @click="showNewMockServerModal = false" class="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-medium">Cancel</button>
                    <button type="button" @click="createMockServer()" :disabled="!newMockServerName.trim()" class="px-4 py-1.5 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white font-bold disabled:opacity-50">Create Server</button>
                </div>
            </div>
        </div>
    </div>

    <!-- New Mock Endpoint Modal -->
    <div v-if="showNewMockEndpointModal" class="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div class="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-lg p-6 shadow-2xl space-y-4">
            <div class="flex items-center justify-between border-b border-zinc-800 pb-3">
                <div class="flex items-center gap-2">
                    <span class="inline-flex items-center justify-center shrink-0 w-4 h-4 text-cyan-400" v-html="renderIcon('plus', 'w-4 h-4 text-cyan-400')"></span>
                    <h3 class="text-sm font-bold text-white">Add Mock Endpoint</h3>
                </div>
                <button @click="showNewMockEndpointModal = false" class="text-zinc-500 hover:text-zinc-300">
                    <span class="inline-flex items-center justify-center shrink-0 w-4 h-4" v-html="renderIcon('x', 'w-4 h-4')"></span>
                </button>
            </div>

            <div class="space-y-3 text-xs">
                <div>
                    <label class="block font-semibold text-zinc-300 mb-1">Endpoint Name</label>
                    <input v-model="newMockEndpoint.name" type="text" placeholder="e.g. Get Customer Profile" class="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2 text-zinc-200 focus:border-cyan-500">
                </div>
                <div class="grid grid-cols-3 gap-2">
                    <div>
                        <label class="block font-semibold text-zinc-300 mb-1">Method</label>
                        <select v-model="newMockEndpoint.method" class="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2 text-zinc-200 focus:border-cyan-500 font-mono">
                            <option value="GET">GET</option>
                            <option value="POST">POST</option>
                            <option value="PUT">PUT</option>
                            <option value="DELETE">DELETE</option>
                            <option value="PATCH">PATCH</option>
                        </select>
                    </div>
                    <div class="col-span-2">
                        <label class="block font-semibold text-zinc-300 mb-1">Route Path</label>
                        <input v-model="newMockEndpoint.path" type="text" placeholder="/customers/123" class="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2 text-zinc-200 font-mono focus:border-cyan-500">
                    </div>
                </div>
                <div class="grid grid-cols-2 gap-2">
                    <div>
                        <label class="block font-semibold text-zinc-300 mb-1">HTTP Status</label>
                        <input v-model.number="newMockEndpoint.responseStatus" type="number" class="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2 text-zinc-200 font-mono focus:border-cyan-500" placeholder="200">
                    </div>
                    <div>
                        <label class="block font-semibold text-zinc-300 mb-1">Delay (ms)</label>
                        <input v-model.number="newMockEndpoint.responseDelayMs" type="number" class="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2 text-zinc-200 font-mono focus:border-cyan-500" placeholder="100">
                    </div>
                </div>
                <div>
                    <label class="block font-semibold text-zinc-300 mb-1">JSON Response Body</label>
                    <textarea v-model="newMockEndpoint.responseBody" rows="4" class="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2 text-zinc-200 font-mono focus:border-cyan-500" placeholder='{"status": "ok"}'></textarea>
                </div>
                <div class="pt-2 flex justify-end gap-2">
                    <button type="button" @click="showNewMockEndpointModal = false" class="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-medium">Cancel</button>
                    <button type="button" @click="createMockEndpoint()" :disabled="!newMockEndpoint.name.trim() || !newMockEndpoint.path.trim()" class="px-4 py-1.5 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white font-bold disabled:opacity-50">Add Endpoint</button>
                </div>
            </div>
        </div>
    </div>

    <!-- New Monitor Modal -->
    <div v-if="showNewMonitorModal" class="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div class="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <div class="flex items-center justify-between border-b border-zinc-800 pb-3">
                <div class="flex items-center gap-2">
                    <span class="inline-flex items-center justify-center shrink-0 w-4 h-4 text-emerald-400" v-html="renderIcon('activity', 'w-4 h-4 text-emerald-400')"></span>
                    <h3 class="text-sm font-bold text-white">Create Collection Monitor</h3>
                </div>
                <button @click="showNewMonitorModal = false" class="text-zinc-500 hover:text-zinc-300">
                    <span class="inline-flex items-center justify-center shrink-0 w-4 h-4" v-html="renderIcon('x', 'w-4 h-4')"></span>
                </button>
            </div>

            <div class="space-y-3 text-xs">
                <div>
                    <label class="block font-semibold text-zinc-300 mb-1">Monitor Name</label>
                    <input v-model="newMonitorName" type="text" placeholder="e.g. Core API Hourly Health Check" class="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2 text-zinc-200 focus:border-emerald-500">
                </div>
                <div>
                    <label class="block font-semibold text-zinc-300 mb-1">Collection to Run</label>
                    <select v-model="newMonitorCollectionId" class="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2 text-zinc-200 focus:border-emerald-500">
                        <option v-for="c in collections" :key="c.id" :value="c.id">{{ c.name }}</option>
                    </select>
                </div>
                <div>
                    <label class="block font-semibold text-zinc-300 mb-1">Execution Schedule</label>
                    <select v-model="newMonitorSchedule" class="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2 text-zinc-200 focus:border-emerald-500">
                        <option value="5m">Every 5 minutes</option>
                        <option value="15m">Every 15 minutes</option>
                        <option value="1h">Every hour</option>
                        <option value="6h">Every 6 hours</option>
                        <option value="24h">Once daily (24h)</option>
                    </select>
                </div>
                <div class="pt-2 flex justify-end gap-2">
                    <button type="button" @click="showNewMonitorModal = false" class="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-medium">Cancel</button>
                    <button type="button" @click="createMonitor()" :disabled="!newMonitorName.trim()" class="px-4 py-1.5 rounded-lg bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-bold disabled:opacity-50">Create Monitor</button>
                </div>
            </div>
        </div>
    </div>

    <!-- User Guide Modal (Help Option with ? icon: explains how to use tool without exposing architecture, database, or technical details) -->
    <div v-if="activeModal === 'userGuideModal'" class="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div class="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <!-- Modal Header -->
            <div class="flex items-center justify-between px-6 py-4 border-b border-zinc-800 bg-[#0d0f17]">
                <div class="flex items-center gap-3">
                    <div class="w-8 h-8 rounded-lg bg-orange-500/10 border border-orange-500/30 flex items-center justify-center text-orange-400">
                        <span class="inline-flex items-center justify-center w-4 h-4 text-orange-400" v-html="renderIcon('help-circle', 'w-4 h-4 text-orange-400')"></span>
                    </div>
                    <div>
                        <h2 class="text-base font-bold text-white tracking-tight">How to Use CloudPost</h2>
                        <p class="text-xs text-zinc-400">Quick start guide for testing APIs, managing collections & running test suites</p>
                    </div>
                </div>
                <button @click="closeModal()" class="w-8 h-8 rounded-lg flex items-center justify-center text-zinc-400 hover:text-white hover:bg-white/10 transition-colors">
                    <span class="inline-flex items-center justify-center w-4 h-4" v-html="renderIcon('x', 'w-4 h-4')"></span>
                </button>
            </div>

            <!-- Modal Body (Scrollable, user-focused instructions only, zero architectural or internal tech exposure) -->
            <div class="flex-1 overflow-y-auto p-6 space-y-6 text-xs text-zinc-300">
                <!-- 1. Sending Requests -->
                <div class="p-4 rounded-xl bg-zinc-950/80 border border-zinc-800/80 space-y-2.5">
                    <div class="flex items-center gap-2 font-bold text-sm text-orange-400">
                        <span class="inline-flex items-center justify-center w-4 h-4 text-orange-400" v-html="renderIcon('send', 'w-4 h-4 text-orange-400')"></span>
                        <span>1. Sending an API Request</span>
                    </div>
                    <p class="text-zinc-400 leading-relaxed">
                        To test an endpoint, select the HTTP method (<span class="font-mono text-emerald-400">GET</span>, <span class="font-mono text-amber-400">POST</span>, <span class="font-mono text-blue-400">PUT</span>, <span class="font-mono text-red-400">DELETE</span>, etc.), enter the complete destination URL, and click <strong class="text-white">Send</strong>. The response status, round-trip latency, response size, and response body will appear in the right panel.
                    </p>
                    <ul class="list-disc list-inside space-y-1 text-zinc-400 pl-1">
                        <li><strong class="text-zinc-200">Headers:</strong> Add custom request headers like <code class="bg-zinc-900 px-1.5 py-0.5 rounded text-orange-300">Accept</code> or custom auth headers.</li>
                        <li><strong class="text-zinc-200">Params:</strong> Query parameters entered in the Params tab are automatically URL-encoded into the request address.</li>
                        <li><strong class="text-zinc-200">Body:</strong> Choose <span class="text-white">JSON</span>, <span class="text-white">Form-Data</span>, or <span class="text-white">Raw</span> to transmit payload data.</li>
                    </ul>
                </div>

                <!-- 2. Authentication -->
                <div class="p-4 rounded-xl bg-zinc-950/80 border border-zinc-800/80 space-y-2.5">
                    <div class="flex items-center gap-2 font-bold text-sm text-amber-400">
                        <span class="inline-flex items-center justify-center w-4 h-4 text-amber-400" v-html="renderIcon('lock', 'w-4 h-4 text-amber-400')"></span>
                        <span>2. Configuring Authentication</span>
                    </div>
                    <p class="text-zinc-400 leading-relaxed">
                        Select the <strong class="text-white">Auth</strong> tab in any request to attach credentials:
                    </p>
                    <div class="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        <div class="p-2.5 rounded-lg bg-zinc-900/90 border border-zinc-800">
                            <span class="font-semibold text-white block mb-1">Bearer Token</span>
                            <span class="text-[11px] text-zinc-400">Attaches an <code class="text-amber-300">Authorization: Bearer &lt;token&gt;</code> header.</span>
                        </div>
                        <div class="p-2.5 rounded-lg bg-zinc-900/90 border border-zinc-800">
                            <span class="font-semibold text-white block mb-1">Basic Auth</span>
                            <span class="text-[11px] text-zinc-400">Encodes username and password in base64 format automatically.</span>
                        </div>
                        <div class="p-2.5 rounded-lg bg-zinc-900/90 border border-zinc-800">
                            <span class="font-semibold text-white block mb-1">API Key</span>
                            <span class="text-[11px] text-zinc-400">Appends as either a custom Header or Query Parameter key-value pair.</span>
                        </div>
                    </div>
                </div>

                <!-- 3. Dynamic Variables & Environments -->
                <div class="p-4 rounded-xl bg-zinc-950/80 border border-zinc-800/80 space-y-2.5">
                    <div class="flex items-center gap-2 font-bold text-sm text-cyan-400">
                        <span class="inline-flex items-center justify-center w-4 h-4 text-cyan-400" v-html="renderIcon('sliders', 'w-4 h-4 text-cyan-400')"></span>
                        <span>3. Environments & Double-Curly Variables</span>
                    </div>
                    <p class="text-zinc-400 leading-relaxed">
                        Avoid hardcoding domains or tokens by using double curly braces: <code class="bg-zinc-900 px-1.5 py-0.5 rounded text-cyan-300">&#123;&#123;base_url&#125;&#125;</code> and <code class="bg-zinc-900 px-1.5 py-0.5 rounded text-cyan-300">&#123;&#123;api_token&#125;&#125;</code>.
                    </p>
                    <p class="text-zinc-400 leading-relaxed">
                        Click the <strong class="text-white">Environment Selector</strong> in the top navigation bar to create and switch between <span class="text-cyan-300">Development</span>, <span class="text-cyan-300">Staging</span>, and <span class="text-cyan-300">Production</span> variable sets instantly.
                    </p>
                </div>

                <!-- 4. Collections & Automated Runner -->
                <div class="p-4 rounded-xl bg-zinc-950/80 border border-zinc-800/80 space-y-2.5">
                    <div class="flex items-center gap-2 font-bold text-sm text-emerald-400">
                        <span class="inline-flex items-center justify-center w-4 h-4 text-emerald-400" v-html="renderIcon('folder', 'w-4 h-4 text-emerald-400')"></span>
                        <span>4. Collections & Automated Test Runner</span>
                    </div>
                    <p class="text-zinc-400 leading-relaxed">
                        Group related requests into Collections and sub-folders in the left sidebar. Click the <strong class="text-white">Runner</strong> button in the navigation bar to execute all endpoints in sequence, evaluate assertion tests, measure overall latency, and generate test reports.
                    </p>
                </div>

                <!-- 5. Import & Export -->
                <div class="p-4 rounded-xl bg-zinc-950/80 border border-zinc-800/80 space-y-2.5">
                    <div class="flex items-center gap-2 font-bold text-sm text-purple-400">
                        <span class="inline-flex items-center justify-center w-4 h-4 text-purple-400" v-html="renderIcon('upload', 'w-4 h-4 text-purple-400')"></span>
                        <span>5. Import & Export</span>
                    </div>
                    <p class="text-zinc-400 leading-relaxed">
                        Use <strong class="text-white">Import/Export</strong> in the top navigation bar to load existing collections from Postman Collection (v2.1), OpenAPI/Swagger specs, cURL commands, or HAR network capture archives.
                    </p>
                </div>

                <!-- 6. Keyboard Shortcuts -->
                <div class="p-4 rounded-xl bg-zinc-950/80 border border-zinc-800/80 space-y-2.5">
                    <div class="flex items-center gap-2 font-bold text-sm text-zinc-200">
                        <span class="inline-flex items-center justify-center w-4 h-4 text-zinc-300" v-html="renderIcon('terminal', 'w-4 h-4 text-zinc-300')"></span>
                        <span>6. Keyboard Shortcuts</span>
                    </div>
                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 text-zinc-400">
                        <div class="flex items-center justify-between p-2 rounded bg-zinc-900 border border-zinc-800/80">
                            <span>Send current request</span>
                            <kbd class="px-2 py-0.5 rounded bg-zinc-800 text-zinc-200 font-mono text-[10px] border border-zinc-700">Ctrl + Enter</kbd>
                        </div>
                        <div class="flex items-center justify-between p-2 rounded bg-zinc-900 border border-zinc-800/80">
                            <span>Save request changes</span>
                            <kbd class="px-2 py-0.5 rounded bg-zinc-800 text-zinc-200 font-mono text-[10px] border border-zinc-700">Ctrl + S</kbd>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Modal Footer -->
            <div class="px-6 py-3.5 border-t border-zinc-800 bg-[#0d0f17] flex items-center justify-between">
                <span class="text-[11px] text-zinc-500">Need more assistance? Refer to your organization's API documentation.</span>
                <button @click="closeModal()" class="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-lg text-xs transition-colors cursor-pointer">
                    Got it, close guide
                </button>
            </div>
        </div>
    </div>

    <!-- CORS Resolution Modal: Complete Step-by-Step Guide with 1-Click Server Proxy Retry -->
    <div v-if="activeModal === 'corsResolutionModal'" class="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-6">
        <div class="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <!-- Modal Header -->
            <div class="flex items-center justify-between px-6 py-4 border-b border-zinc-800 bg-[#0e121d]">
                <div class="flex items-center gap-3 min-w-0">
                    <div class="w-9 h-9 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center shrink-0 text-rose-400">
                        <span class="inline-flex items-center justify-center w-5 h-5" v-html="renderIcon('shield-alert', 'w-5 h-5')"></span>
                    </div>
                    <div class="min-w-0">
                        <h2 class="text-base font-bold text-white tracking-tight flex items-center gap-2">
                            <span>How to Resolve CORS & Connection Errors</span>
                            <span class="px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 text-[10px] font-mono border border-rose-500/30">Browser Policy</span>
                        </h2>
                        <p class="text-xs text-zinc-400 truncate">Cross-Origin Resource Sharing (CORS) blocks browsers from reading responses without explicit server permission.</p>
                    </div>
                </div>
                <button type="button" @click="activeModal = null" class="w-8 h-8 rounded-lg flex items-center justify-center text-zinc-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer">
                    <span class="inline-flex items-center justify-center w-4 h-4" v-html="renderIcon('x', 'w-4 h-4')"></span>
                </button>
            </div>

            <!-- Target Request Details -->
            <div v-if="activeRequest" class="px-6 py-2.5 bg-zinc-950 border-b border-zinc-800/80 flex items-center gap-3 text-xs">
                <span class="text-zinc-500 font-medium shrink-0">Failing Request:</span>
                <span class="px-2 py-0.5 rounded font-mono font-bold text-[10px] uppercase shrink-0" :class="getMethodBadgeColor(activeRequest.method)">{{ activeRequest.method }}</span>
                <span class="font-mono text-zinc-300 truncate select-all">{{ resolveVariables ? resolveVariables(activeRequest.url) : activeRequest.url }}</span>
            </div>

            <!-- Resolution Tabs Navigation -->
            <div class="flex border-b border-zinc-800 bg-[#121622] px-6 gap-2 text-xs overflow-x-auto shrink-0">
                <button type="button" @click="activeCorsTab = 'proxy'"
                    class="py-3 px-3 border-b-2 font-medium flex items-center gap-1.5 transition-colors whitespace-nowrap cursor-pointer"
                    :class="activeCorsTab === 'proxy' ? 'border-orange-500 text-orange-400 font-bold' : 'border-transparent text-zinc-400 hover:text-zinc-200'">
                    <span class="inline-flex items-center justify-center w-3.5 h-3.5" v-html="renderIcon('refresh-cw', 'w-3.5 h-3.5')"></span>
                    <span>1. Server Proxy (Instant Fix)</span>
                </button>
                <button type="button" @click="activeCorsTab = 'headers'"
                    class="py-3 px-3 border-b-2 font-medium flex items-center gap-1.5 transition-colors whitespace-nowrap cursor-pointer"
                    :class="activeCorsTab === 'headers' ? 'border-orange-500 text-orange-400 font-bold' : 'border-transparent text-zinc-400 hover:text-zinc-200'">
                    <span class="inline-flex items-center justify-center w-3.5 h-3.5" v-html="renderIcon('code-2', 'w-3.5 h-3.5')"></span>
                    <span>2. Backend CORS Headers</span>
                </button>
                <button type="button" @click="activeCorsTab = 'mixed'"
                    class="py-3 px-3 border-b-2 font-medium flex items-center gap-1.5 transition-colors whitespace-nowrap cursor-pointer"
                    :class="activeCorsTab === 'mixed' ? 'border-orange-500 text-orange-400 font-bold' : 'border-transparent text-zinc-400 hover:text-zinc-200'">
                    <span class="inline-flex items-center justify-center w-3.5 h-3.5" v-html="renderIcon('lock', 'w-3.5 h-3.5')"></span>
                    <span>3. Mixed Content (HTTPS/HTTP)</span>
                </button>
                <button type="button" @click="activeCorsTab = 'extensions'"
                    class="py-3 px-3 border-b-2 font-medium flex items-center gap-1.5 transition-colors whitespace-nowrap cursor-pointer"
                    :class="activeCorsTab === 'extensions' ? 'border-orange-500 text-orange-400 font-bold' : 'border-transparent text-zinc-400 hover:text-zinc-200'">
                    <span class="inline-flex items-center justify-center w-3.5 h-3.5" v-html="renderIcon('terminal', 'w-3.5 h-3.5')"></span>
                    <span>4. Browser Extension</span>
                </button>
                <button type="button" @click="activeCorsTab = 'localhost'"
                    class="py-3 px-3 border-b-2 font-medium flex items-center gap-1.5 transition-colors whitespace-nowrap cursor-pointer"
                    :class="activeCorsTab === 'localhost' ? 'border-orange-500 text-orange-400 font-bold' : 'border-transparent text-zinc-400 hover:text-zinc-200'">
                    <span class="inline-flex items-center justify-center w-3.5 h-3.5" v-html="renderIcon('hard-drive', 'w-3.5 h-3.5')"></span>
                    <span>5. Localhost & Ports</span>
                </button>
            </div>

            <!-- Tab Content (Scrollable) -->
            <div class="flex-1 overflow-y-auto p-6 space-y-4 text-xs text-zinc-300">
                <!-- TAB 1: SERVER PROXY -->
                <div v-if="activeCorsTab === 'proxy'" class="space-y-4">
                    <div class="p-4 rounded-xl bg-orange-500/10 border border-orange-500/30 flex items-start gap-3">
                        <div class="w-8 h-8 rounded-lg bg-orange-500/20 text-orange-400 flex items-center justify-center shrink-0 mt-0.5">
                            <span class="inline-flex items-center justify-center w-4 h-4" v-html="renderIcon('refresh-cw', 'w-4 h-4')"></span>
                        </div>
                        <div class="space-y-1">
                            <h3 class="font-bold text-white text-sm">Recommended Solution: Built-in Server Proxy</h3>
                            <p class="text-zinc-400 leading-relaxed text-xs">
                                CORS is strictly a browser-enforced security sandbox. When you execute requests through our server-side proxy, the HTTP request is made directly from the host backend rather than the browser, completely avoiding CORS restrictions.
                            </p>
                        </div>
                    </div>

                    <div class="p-4 rounded-xl bg-zinc-950 border border-zinc-800 space-y-3">
                        <h4 class="font-semibold text-white">How it works:</h4>
                        <ol class="list-decimal list-inside space-y-2 text-zinc-400">
                            <li>Your browser sends the request configuration to the local backend proxy service.</li>
                            <li>The backend performs the HTTP request via cURL / native networking to the target API.</li>
                            <li>The target response (headers, status, and body) is relayed cleanly back into your app.</li>
                        </ol>
                        <div class="pt-2">
                            <button type="button" @click="activeModal = null; sendActiveRequest(true)" class="px-4 py-2 rounded-lg bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white font-bold flex items-center gap-2 transition-all shadow-lg shadow-orange-500/20 cursor-pointer">
                                <span class="inline-flex items-center justify-center w-3.5 h-3.5" v-html="renderIcon('refresh-cw', 'w-3.5 h-3.5')"></span>
                                <span>Retry This Request via Proxy Now</span>
                            </button>
                        </div>
                    </div>
                </div>

                <!-- TAB 2: BACKEND HEADERS -->
                <div v-if="activeCorsTab === 'headers'" class="space-y-4">
                    <div class="space-y-1">
                        <h3 class="font-bold text-white text-sm">Configure CORS on your API Server</h3>
                        <p class="text-zinc-400 text-xs">If you control the target backend, add these HTTP headers to allow browser requests:</p>
                    </div>

                    <!-- Framework Selector -->
                    <div class="flex flex-wrap gap-1.5">
                        <button v-for="(code, fw) in corsSnippets" :key="fw" type="button"
                            @click="selectedCorsFramework = fw"
                            class="px-2.5 py-1 rounded-lg text-xs font-mono font-semibold uppercase border transition-colors cursor-pointer"
                            :class="selectedCorsFramework === fw ? 'bg-orange-500/20 border-orange-500/50 text-orange-300' : 'bg-zinc-800/80 border-zinc-700 text-zinc-400 hover:text-white'">
                            {{ fw }}
                        </button>
                    </div>

                    <!-- Code Snippet Box -->
                    <div class="rounded-xl bg-zinc-950 border border-zinc-800 overflow-hidden">
                        <div class="px-4 py-2 bg-zinc-900/80 border-b border-zinc-800 flex items-center justify-between">
                            <span class="font-mono text-zinc-400 text-[11px] uppercase">{{ selectedCorsFramework }} implementation</span>
                            <button type="button" @click="copyCorsCode(corsSnippets[selectedCorsFramework])" class="flex items-center gap-1 text-zinc-400 hover:text-white text-xs cursor-pointer">
                                <span class="inline-flex items-center justify-center w-3 h-3" v-html="renderIcon(corsCodeCopied ? 'check' : 'copy', 'w-3 h-3')"></span>
                                <span>{{ corsCodeCopied ? 'Copied!' : 'Copy Snippet' }}</span>
                            </button>
                        </div>
                        <pre class="p-4 font-mono text-xs text-zinc-200 overflow-x-auto whitespace-pre leading-relaxed select-all"><code>{{ corsSnippets[selectedCorsFramework] }}</code></pre>
                    </div>
                </div>

                <!-- TAB 3: MIXED CONTENT -->
                <div v-if="activeCorsTab === 'mixed'" class="space-y-4">
                    <div class="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-3">
                        <div class="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0 mt-0.5">
                            <span class="inline-flex items-center justify-center w-4 h-4" v-html="renderIcon('lock', 'w-4 h-4')"></span>
                        </div>
                        <div class="space-y-1">
                            <h3 class="font-bold text-white text-sm">Mixed Content Restriction (HTTPS vs HTTP)</h3>
                            <p class="text-zinc-400 leading-relaxed text-xs">
                                Modern browsers block unencrypted <strong class="text-amber-300">http://</strong> requests when the API tester is loaded over secure <strong class="text-emerald-300">https://</strong>.
                            </p>
                        </div>
                    </div>

                    <div class="p-4 rounded-xl bg-zinc-950 border border-zinc-800 space-y-3">
                        <h4 class="font-semibold text-white">How to fix Mixed Content:</h4>
                        <ul class="list-disc list-inside space-y-2 text-zinc-400">
                            <li><strong class="text-zinc-200">Use HTTPS:</strong> Change your request URL prefix from <code class="bg-zinc-900 px-1 py-0.5 rounded text-amber-300">http://</code> to <code class="bg-zinc-900 px-1 py-0.5 rounded text-emerald-300">https://</code> if your API supports TLS.</li>
                            <li><strong class="text-zinc-200">Use Server Proxy:</strong> The proxy server runs server-to-server and can cleanly communicate with both plain HTTP and HTTPS targets.</li>
                        </ul>
                    </div>
                </div>

                <!-- TAB 4: BROWSER EXTENSIONS -->
                <div v-if="activeCorsTab === 'extensions'" class="space-y-4">
                    <div class="space-y-1">
                        <h3 class="font-bold text-white text-sm">Development Browser Extensions</h3>
                        <p class="text-zinc-400 text-xs">During local development, you can use a browser extension that modifies CORS response headers on the fly:</p>
                    </div>

                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div class="p-3.5 rounded-xl bg-zinc-950 border border-zinc-800 space-y-2">
                            <div class="font-semibold text-white">Allow-CORS (Chrome / Firefox)</div>
                            <p class="text-zinc-400 text-xs">Automatically injects <code class="text-orange-300">Access-Control-Allow-Origin: *</code> into all matching responses during your debugging session.</p>
                        </div>
                        <div class="p-3.5 rounded-xl bg-zinc-950 border border-zinc-800 space-y-2">
                            <div class="font-semibold text-white">ModHeader Extension</div>
                            <p class="text-zinc-400 text-xs">Allows custom header modification on both outgoing requests and incoming responses.</p>
                        </div>
                    </div>
                    <p class="text-zinc-500 text-[11px]">Remember to disable CORS debugging extensions when browsing other websites for security.</p>
                </div>

                <!-- TAB 5: LOCALHOST & PORTS -->
                <div v-if="activeCorsTab === 'localhost'" class="space-y-4">
                    <div class="space-y-1">
                        <h3 class="font-bold text-white text-sm">Local Server Diagnostic Checklist</h3>
                        <p class="text-zinc-400 text-xs">If requesting a local development server (e.g. localhost:8000, localhost:5000, localhost:3000):</p>
                    </div>

                    <div class="p-4 rounded-xl bg-zinc-950 border border-zinc-800 space-y-3">
                        <ul class="list-disc list-inside space-y-2 text-zinc-400">
                            <li><strong class="text-zinc-200">Is the service running?</strong> Ensure your local dev server is currently running in your terminal.</li>
                            <li><strong class="text-zinc-200">Check IP binding:</strong> Ensure your server listens on <code class="bg-zinc-900 px-1.5 py-0.5 rounded text-orange-300">0.0.0.0</code> or <code class="bg-zinc-900 px-1.5 py-0.5 rounded text-orange-300">127.0.0.1</code> instead of solely IPv6.</li>
                            <li><strong class="text-zinc-200">Try 127.0.0.1:</strong> Substitute <code class="text-white">localhost</code> with <code class="text-white">127.0.0.1</code> in the URL to avoid DNS resolution discrepancies.</li>
                        </ul>
                    </div>
                </div>
            </div>

            <!-- Modal Footer -->
            <div class="px-6 py-3.5 border-t border-zinc-800 bg-[#0e121d] flex items-center justify-between">
                <span class="text-[11px] text-zinc-500">Need immediate testing? Use the built-in Server Proxy.</span>
                <div class="flex items-center gap-2">
                    <button type="button" @click="activeModal = null; sendActiveRequest(true)" class="px-3.5 py-1.5 rounded-lg bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer">
                        <span class="inline-flex items-center justify-center w-3.5 h-3.5" v-html="renderIcon('refresh-cw', 'w-3.5 h-3.5')"></span>
                        <span>Retry via Proxy</span>
                    </button>
                    <button type="button" @click="activeModal = null" class="px-3.5 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg text-xs font-semibold transition-colors cursor-pointer">
                        Close
                    </button>
                </div>
            </div>
        </div>
    </div>

    <!-- Docs & Manual Modal (Exclusive to SaaS users) -->
    <div v-if="activeModal === 'docsManualModal'" class="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div class="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
            <div class="flex items-center justify-between px-6 py-4 border-b border-zinc-800 bg-[#0d0f17]">
                <div class="flex items-center gap-3">
                    <div class="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                        <span class="inline-flex items-center justify-center w-4 h-4 text-amber-400" v-html="renderIcon('book-open', 'w-4 h-4 text-amber-400')"></span>
                    </div>
                    <div>
                        <h2 class="text-base font-bold text-white tracking-tight">SaaS Member Documentation</h2>
                        <p class="text-xs text-zinc-400">Exclusive reference manuals for registered SaaS team members</p>
                    </div>
                </div>
                <button @click="closeModal()" class="w-8 h-8 rounded-lg flex items-center justify-center text-zinc-400 hover:text-white hover:bg-white/10 transition-colors">
                    <span class="inline-flex items-center justify-center w-4 h-4" v-html="renderIcon('x', 'w-4 h-4')"></span>
                </button>
            </div>
            <div class="flex-1 overflow-y-auto p-6 space-y-4 text-xs text-zinc-300">
                <div v-if="!isSaaSUser" class="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300">
                    <strong class="font-bold block mb-1">SaaS Member Access Required</strong>
                    Documentation and manuals are reserved for registered SaaS users. Please sign in to your SaaS account to view full manuals.
                </div>
                <div v-else class="space-y-4">
                    <div class="p-4 rounded-xl bg-zinc-950/80 border border-zinc-800 space-y-2">
                        <h3 class="font-bold text-sm text-white">Platform Manual & Specifications</h3>
                        <p class="text-zinc-400 leading-relaxed">
                            Welcome to the CloudPost SaaS user manuals. As a verified member, your workspaces, team collections, and environmental variables are securely synchronized across all active sessions.
                        </p>
                    </div>
                    <div class="p-4 rounded-xl bg-zinc-950/80 border border-zinc-800 space-y-2">
                        <h3 class="font-bold text-sm text-white">Collaboration & Team Workspaces</h3>
                        <p class="text-zinc-400 leading-relaxed">
                            Members can invite teammates using the Invite button in the navigation bar to share collections and test suites in real time.
                        </p>
                    </div>
                </div>
            </div>
            <div class="px-6 py-3.5 border-t border-zinc-800 bg-[#0d0f17] flex justify-end">
                <button @click="closeModal()" class="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white font-semibold rounded-lg text-xs transition-colors">
                    Close
                </button>
            </div>
        </div>
    </div>

</div>

<!-- Vue 3 Application Script -->
<script>
// Zero-Leak Status Bar: Ensure URL can never be displayed in browser status bar when hovering any anchor tag
document.addEventListener('mouseover', function(e) {
    const a = e.target ? e.target.closest('a') : null;
    if (a && a.getAttribute('href') && a.getAttribute('href') !== 'javascript:void(0)') {
        const originalHref = a.getAttribute('href');
        a.setAttribute('data-target-url', originalHref);
        a.setAttribute('href', 'javascript:void(0)');
        a.addEventListener('click', function(ev) {
            ev.preventDefault();
            const dest = a.getAttribute('data-target-url');
            if (dest && dest !== '#' && dest.trim() !== '' && !dest.startsWith('javascript:')) {
                if (a.getAttribute('target') === '_blank') {
                    window.open(dest, '_blank', 'noopener,noreferrer');
                } else {
                    window.location.href = dest;
                }
            }
        }, { once: true });
    }
}, true);

const { createApp, ref, computed, onMounted, nextTick } = Vue;

const SVG_ICONS = {
  send: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/></svg>',
  play: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="6 3 20 12 6 21 6 3"/></svg>',
  plus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="M12 5v14"/></svg>',
  x: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>',
  save: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15.2 3a2 2 0 0 1 1.4.6l3.8 3.8a2 2 0 0 1 .6 1.4V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z"/><path d="M17 21v-7a1 1 0 0 0-1-1H8a1 1 0 0 0-1 1v7"/><path d="M7 3v4a1 1 0 0 0 1 1h7"/></svg>',
  "trash-2": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></svg>',
  search: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>',
  "refresh-cw": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M8 16H3v5"/></svg>',
  check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>',
  "check-circle-2": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/></svg>',
  shield: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/></svg>',
  "shield-alert": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/><path d="M12 8v4"/><path d="M12 16h.01"/></svg>',
  "shield-check": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/><path d="m9 12 2 2 4-4"/></svg>',
  user: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>',
  "user-check": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><polyline points="16 11 18 13 22 9"/></svg>',
  lock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>',
  zap: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>',
  sparkles: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3Z"/></svg>',
  "chevron-down": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>',
  "chevron-right": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>',
  folder: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"/></svg>',
  "folder-open": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 14 1.5-2.9A2 2 0 0 1 9.24 10H20a2 2 0 0 1 1.94 2.5l-1.54 6a2 2 0 0 1-1.95 1.5H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h3.93a2 2 0 0 1 1.66.9l.82 1.2a2 2 0 0 0 1.66.9H18a2 2 0 0 1 2 2v2"/></svg>',
  "folder-git-2": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 20H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h3.9a2 2 0 0 1 1.69.9l.81 1.2a2 2 0 0 0 1.67.9H20a2 2 0 0 1 2 2v5"/><circle cx="13" cy="12" r="2"/><path d="M18 19c-2.8 0-5-2.2-5-5v8"/><circle cx="20" cy="19" r="2"/></svg>',
  layers: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>',
  history: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M12 7v5l4 2"/></svg>',
  "arrow-left-right": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 3 4 7l4 4"/><path d="M4 7h16"/><path d="m16 21 4-4-4-4"/><path d="M20 17H4"/></svg>',
  globe: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" x2="22" y1="12" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>',
  home: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>',
  "layout-grid": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="7" height="7" x="3" y="3" rx="1"/><rect width="7" height="7" x="14" y="3" rx="1"/><rect width="7" height="7" x="14" y="14" rx="1"/><rect width="7" height="7" x="3" y="14" rx="1"/></svg>',
  eye: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>',
  smartphone: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="14" height="20" x="5" y="2" rx="2" ry="2"/><path d="M12 18h.01"/></svg>',
  wifi: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.55a11 11 0 0 1 14.08 0"/><path d="M1.42 9a16 16 0 0 1 21.16 0"/><path d="M8.53 16.11a6 6 0 0 1 6.95 0"/><line x1="12" x2="12.01" y1="20" y2="20"/></svg>',
  "wifi-off": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="1" x2="23" y1="1" y2="23"/><path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55"/><path d="M5 12.55a10.94 10.94 0 0 1 5.17-2.39"/><path d="M10.71 5.05A16 16 0 0 1 22.58 9"/><path d="M1.42 9a15.91 15.91 0 0 1 4.7-2.88"/><path d="M8.53 16.11a6 6 0 0 1 6.95 0"/><line x1="12" x2="12.01" y1="20" y2="20"/></svg>',
  "external-link": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 3h6v6"/><path d="M10 14 21 3"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/></svg>',
  "log-in": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" x2="3" y1="12" y2="12"/></svg>',
  "log-out": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" x2="9" y1="12" y2="12"/></svg>',
  "loader-2": '<svg class="animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>',
  clock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>',
  "hard-drive": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="22" x2="2" y1="12" y2="12"/><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/><line x1="6" x2="6.01" y1="16" y2="16"/><line x1="10" x2="10.01" y1="16" y2="16"/></svg>',
  copy: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>',
  download: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg>',
  "code-2": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m18 16 4-4-4-4"/><path d="m6 8-4 4 4 4"/><path d="m14.5 4-5 16"/></svg>',
  network: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="16" y="16" width="6" height="6" rx="1"/><rect x="2" y="16" width="6" height="6" rx="1"/><rect x="9" y="2" width="6" height="6" rx="1"/><path d="M5 16v-3a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1v3"/><path d="M12 12V8"/></svg>',
  "file-text": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M10 9H8"/><path d="M16 13H8"/><path d="M16 17H8"/></svg>',
  "list-tree": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12h-8"/><path d="M21 6H8"/><path d="M21 18h-8"/><path d="M3 6v4c0 1.1.9 2 2 2h3"/><path d="M3 10v6c0 1.1.9 2 2 2h3"/></svg>',
  activity: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>',
  "toggle-left": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="20" height="12" x="2" y="6" rx="6" ry="6"/><circle cx="8" cy="12" r="2"/></svg>',
  "toggle-right": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="20" height="12" x="2" y="6" rx="6" ry="6"/><circle cx="16" cy="12" r="2"/></svg>',
  "share-2": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" x2="15.42" y1="13.51" y2="17.49"/><line x1="15.41" x2="8.59" y1="6.51" y2="10.49"/></svg>',
  "zoom-in": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" x2="16.65" y1="21" y2="16.65"/><line x1="11" x2="11" y1="8" y2="14"/><line x1="8" x2="14" y1="11" y2="11"/></svg>',
  "zoom-out": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" x2="16.65" y1="21" y2="16.65"/><line x1="8" x2="14" y1="11" y2="11"/></svg>',
  "rotate-ccw": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>',
  sliders: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="4" x2="4" y1="21" y2="14"/><line x1="4" x2="4" y1="10" y2="3"/><line x1="12" x2="12" y1="21" y2="12"/><line x1="12" x2="12" y1="8" y2="3"/><line x1="20" x2="20" y1="21" y2="16"/><line x1="20" x2="20" y1="12" y2="3"/><line x1="1" x2="7" y1="14" y2="14"/><line x1="9" x2="15" y1="8" y2="8"/><line x1="17" x2="23" y1="16" y2="16"/></svg>',
  "x-circle": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="m15 9-6 6"/><path d="m9 9 6 6"/></svg>',
  "alert-circle": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="8" y2="12"/><line x1="12" x2="12.01" y1="16" y2="16"/></svg>',
  terminal: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="4 17 10 11 4 5"/><line x1="12" x2="20" y1="19" y2="19"/></svg>',
  upload: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" x2="12" y1="3" y2="15"/></svg>',
  radio: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4.9 19.1C1 15.2 1 8.8 4.9 4.9"/><path d="M7.8 16.2c-2.3-2.3-2.3-6.1 0-8.5"/><circle cx="12" cy="12" r="2"/><path d="M16.2 7.8c2.3 2.3 2.3 6.1 0 8.5"/><path d="M19.1 4.9C23 8.8 23 15.2 19.1 19.1"/></svg>',
  server: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="20" height="8" x="2" y="2" rx="2" ry="2"/><rect width="20" height="8" x="2" y="14" rx="2" ry="2"/><line x1="6" x2="6.01" y1="6" y2="6"/><line x1="6" x2="6.01" y1="18" y2="18"/></svg>',
  square: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="3" rx="2"/></svg>',
  pause: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="4" height="16" x="6" y="4"/><rect width="4" height="16" x="14" y="4"/></svg>',
  "arrow-down-left": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="17" x2="7" y1="7" y2="17"/><polyline points="17 17 7 17 7 7"/></svg>',
  "arrow-up-right": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="7" x2="17" y1="17" y2="7"/><polyline points="7 7 17 7 17 17"/></svg>',
  "edit-3": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>',
  database: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/><path d="M3 12c0 1.66 4 3 9 3s9-1.34 9-3"/></svg>',
  calendar: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/></svg>',
  sidebar: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M9 3v18"/></svg>',
  "panel-left-close": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M9 3v18"/><path d="m16 15-3-3 3-3"/></svg>',
  "panel-left-open": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M9 3v18"/><path d="m14 9 3 3-3 3"/></svg>',
  columns: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M12 3v18"/></svg>',
  rows: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M3 12h18"/></svg>',
  wrench: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>',
  "help-circle": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><path d="M12 17h.01"/></svg>',
  "book-open": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>',
  "grip-vertical": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="12" r="1"/><circle cx="9" cy="5" r="1"/><circle cx="9" cy="19" r="1"/><circle cx="15" cy="12" r="1"/><circle cx="15" cy="5" r="1"/><circle cx="15" cy="19" r="1"/></svg>',
  "grip-horizontal": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="9" r="1"/><circle cx="5" cy="9" r="1"/><circle cx="19" cy="9" r="1"/><circle cx="12" cy="15" r="1"/><circle cx="5" cy="15" r="1"/><circle cx="19" cy="15" r="1"/></svg>'
};

const renderIcon = (name, customClass = "w-4 h-4") => {
    if (!name) return "";
    const key = String(name).trim();
    let width = 16;
    let height = 16;
    if (customClass.includes("w-3") || customClass.includes("h-3")) { width = 12; height = 12; }
    else if (customClass.includes("w-3.5") || customClass.includes("h-3.5")) { width = 14; height = 14; }
    else if (customClass.includes("w-4") || customClass.includes("h-4")) { width = 16; height = 16; }
    else if (customClass.includes("w-5") || customClass.includes("h-5")) { width = 20; height = 20; }
    else if (customClass.includes("w-6") || customClass.includes("h-6")) { width = 24; height = 24; }

    if (SVG_ICONS[key]) {
        return SVG_ICONS[key].replace("<svg ", `<svg width="${width}" height="${height}" class="${customClass}" style="width:${width}px;height:${height}px;min-width:${width}px;min-height:${width}px;display:inline-block;vertical-align:middle;" `);
    }
    if (window.lucide && window.lucide.icons) {
        const camel = key.replace(/-([a-z0-9])/g, (g) => g[1].toUpperCase());
        const pascal = camel.charAt(0).toUpperCase() + camel.slice(1);
        const iconDef = window.lucide.icons[key] || window.lucide.icons[camel] || window.lucide.icons[pascal];
        if (iconDef && typeof iconDef.toSvg === "function") {
            return iconDef.toSvg({ class: customClass, width, height });
        }
    }
    return "";
};
window.renderIcon = renderIcon;


const app = Vue.createApp({
    setup() {
        const currentView = ref('<?php echo htmlspecialchars($initialView, ENT_QUOTES, "UTF-8"); ?>');
        const activeModal = ref(null);
        const hoveredReqId = ref(null);
        const hoveredHistoryId = ref(null);
        const hoveredTabId = ref(null);
        const hoveredColId = ref(null);
        const hoveredFldId = ref(null);
        const showWorkspaceDropdown = ref(false);
        const showEnvDropdown = ref(false);
        const showUserDropdown = ref(false);
        const showRunnerModal = ref(false);
        const isSidebarOpen = ref(typeof window !== 'undefined' ? window.innerWidth >= 1024 : true);
        const layoutMode = ref((() => {
            try {
                const saved = localStorage.getItem('cp_layout_mode');
                if (saved === 'columns' || saved === 'rows') return saved;
            } catch(e) {}
            return 'columns';
        })());

        const splitRatioColumns = ref((() => {
            try {
                const saved = localStorage.getItem('cp_split_ratio_cols');
                if (saved) {
                    const val = parseFloat(saved);
                    if (!isNaN(val) && val >= 18 && val <= 82) return val;
                }
            } catch(e) {}
            return 50;
        })());

        const splitRatioRows = ref((() => {
            try {
                const saved = localStorage.getItem('cp_split_ratio_rows');
                if (saved) {
                    const val = parseFloat(saved);
                    if (!isNaN(val) && val >= 18 && val <= 82) return val;
                }
            } catch(e) {}
            return 50;
        })());

        const isSplitterDragging = ref(false);
        const isSplitterHovered = ref(false);
        const splitContainerRef = ref(null);

        const toggleLayoutMode = () => {
            layoutMode.value = layoutMode.value === 'columns' ? 'rows' : 'columns';
            try { localStorage.setItem('cp_layout_mode', layoutMode.value); } catch(e) {}
        };

        const resetSplitRatio = () => {
            if (layoutMode.value === 'columns') {
                splitRatioColumns.value = 50;
                try { localStorage.setItem('cp_split_ratio_cols', '50'); } catch(e) {}
            } else {
                splitRatioRows.value = 50;
                try { localStorage.setItem('cp_split_ratio_rows', '50'); } catch(e) {}
            }
        };

        const startSplitterDrag = (e) => {
            if (e.target && e.target.closest && e.target.closest('button')) return;
            e.preventDefault();
            isSplitterDragging.value = true;
            document.body.style.userSelect = 'none';
            document.body.style.cursor = layoutMode.value === 'columns' ? 'col-resize' : 'row-resize';

            const onMove = (moveEvt) => {
                if (!isSplitterDragging.value || !splitContainerRef.value) return;
                const rect = splitContainerRef.value.getBoundingClientRect();
                const clientX = moveEvt.touches ? moveEvt.touches[0].clientX : moveEvt.clientX;
                const clientY = moveEvt.touches ? moveEvt.touches[0].clientY : moveEvt.clientY;

                if (layoutMode.value === 'columns') {
                    const offset = clientX - rect.left;
                    const pct = Math.max(18, Math.min(82, Math.round((offset / rect.width) * 100)));
                    splitRatioColumns.value = pct;
                    try { localStorage.setItem('cp_split_ratio_cols', String(pct)); } catch(err) {}
                } else {
                    const offset = clientY - rect.top;
                    const pct = Math.max(18, Math.min(82, Math.round((offset / rect.height) * 100)));
                    splitRatioRows.value = pct;
                    try { localStorage.setItem('cp_split_ratio_rows', String(pct)); } catch(err) {}
                }
            };

            const onEnd = () => {
                isSplitterDragging.value = false;
                document.body.style.userSelect = '';
                document.body.style.cursor = '';
                window.removeEventListener('mousemove', onMove);
                window.removeEventListener('mouseup', onEnd);
                window.removeEventListener('touchmove', onMove);
                window.removeEventListener('touchend', onEnd);
            };

            window.addEventListener('mousemove', onMove);
            window.addEventListener('mouseup', onEnd);
            window.addEventListener('touchmove', onMove, { passive: false });
            window.addEventListener('touchend', onEnd);
        };
        const showToolsDropdown = ref(false);
        const sidebarTab = ref('collections');
        const sidebarSearch = ref('');
        const requestSubTab = ref('body');
        const responseSubTab = ref('pretty');
        const selectedCodeLang = ref('curl');
        const importExportTab = ref('import');
        const importText = ref('');
        const isLoading = ref(false);
        const runnerRunning = ref(false);

        // CORS & Connection Resolution Modal State
        const activeCorsTab = ref('proxy');
        const selectedCorsFramework = ref('express');
        const corsCodeCopied = ref(false);
        const openCorsModal = () => { activeModal.value = 'corsResolutionModal'; };
        const copyCorsCode = (code) => {
            navigator.clipboard.writeText(code);
            corsCodeCopied.value = true;
            setTimeout(() => { corsCodeCopied.value = false; }, 2000);
        };
        const corsSnippets = {
            express: `const express = require('express');
const cors = require('cors');
const app = express();

// 1. Enable CORS for all incoming requests (Local dev)
app.use(cors());

// 2. Or restrict to specific origins:
// app.use(cors({
//   origin: ['http://localhost:3000', 'https://yourdomain.com'],
//   methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
//   allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
// }));

app.listen(3000, () => console.log('Server running with CORS enabled'));`,
            php: `<?php
// Set CORS headers for all origins
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, PATCH, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, Accept");

// Respond immediately to browser preflight OPTIONS
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

header("Content-Type: application/json; charset=UTF-8");
echo json_encode(["status" => "success", "data" => []]);`,
            fastapi: `from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)`,
            flask: `from flask import Flask
from flask_cors import CORS

app = Flask(__name__)
# Enable CORS for all routes
CORS(app, resources={r"/*": {"origins": "*"}})

@app.route('/api/data', methods=['GET', 'POST', 'OPTIONS'])
def get_data():
    return {"status": "ok"}`,
            go: `package main

import (
    "github.com/gin-contrib/cors"
    "github.com/gin-gonic/gin"
)

func main() {
    router := gin.Default()
    router.Use(cors.Default())
    router.Run(":8080")
}`,
            spring: `import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.bind.annotation.GetMapping;

@RestController
@CrossOrigin(origins = "*", allowedHeaders = "*")
public class ApiController {
    @GetMapping("/api/data")
    public String getData() {
        return "{\\"status\\":\\"success\\"}";
    }
}`,
            dotnet: `var builder = WebApplication.CreateBuilder(args);

builder.Services.AddCors(options => {
    options.AddPolicy("AllowAll", policy => {
        policy.AllowAnyOrigin()
              .AllowAnyMethod()
              .AllowAnyHeader();
    });
});

var app = builder.Build();
app.UseCors("AllowAll");
app.Run();`,
            nginx: `location /api/ {
    add_header 'Access-Control-Allow-Origin' '*' always;
    add_header 'Access-Control-Allow-Methods' 'GET, POST, PUT, DELETE, PATCH, OPTIONS' always;
    add_header 'Access-Control-Allow-Headers' 'Authorization,Content-Type,X-Requested-With' always;

    if ($request_method = 'OPTIONS') {
        add_header 'Access-Control-Allow-Origin' '*';
        add_header 'Access-Control-Max-Age' 1728000;
        add_header 'Content-Type' 'text/plain; charset=utf-8';
        return 204;
    }

    proxy_pass http://127.0.0.1:8080;
}`
        };

        // Current User Profile State & SaaS Admin Role
        const currentDemoUser = ref(<?php echo json_encode($isLoggedIn && $user ? [
            'name' => $user['name'] ?? 'User',
            'email' => $user['email'] ?? '',
            'companyName' => $user['company_name'] ?? 'CloudPost Organization',
            'role' => $user['role'] ?? 'Member',
            'plan' => $user['plan'] ?? ($isSuperAdmin ? 'enterprise' : 'pro'),
            'isLoggedIn' => true,
            'isSaaSAdmin' => (bool)$isSuperAdmin
        ] : [
            'name' => 'Guest User',
            'email' => 'guest@cloudpost.local',
            'companyName' => 'Local Workspace',
            'role' => 'Guest',
            'plan' => 'free',
            'isLoggedIn' => false,
            'isSaaSAdmin' => false
        ]); ?>);

        const isSaaSAdmin = computed(() => {
            return <?php echo $isSuperAdmin ? 'true' : 'false'; ?> || currentDemoUser.value?.isSaaSAdmin === true;
        });

        const isSaaSUser = computed(() => {
            return currentDemoUser.value?.isLoggedIn === true;
        });

        // Activity & Audit Log Stream (100% Parity with React)
        const activityLogs = ref([
            { id: '1', user: 'Alex Rivera', action: 'Created Collection', target: 'E-Commerce & Orders API', timestamp: '10m ago' },
            { id: '2', user: 'Dev Team', action: 'Executed Request', target: 'GET /api/v1/products', timestamp: '25m ago' },
            { id: '3', user: 'Alex Rivera', action: 'Updated Environment', target: 'Production Variables', timestamp: '1h ago' },
            { id: '4', user: 'Security Bot', action: 'Audited Auth Header', target: 'Bearer Token Verified', timestamp: '2h ago' },
            { id: '5', user: 'Sarah Chen', action: 'Imported OpenAPI Spec', target: 'Stripe Billing Schema', timestamp: '3h ago' }
        ]);

        // Environment Manager & Variable System State (100% Parity with React EnvironmentManagerModal.tsx)
        const envModalTargetId = ref('env_global');
        const envModalSearch = ref('');
        const envModalShowSecrets = ref({});
        const envModalNewEnvName = ref('');
        const envModalShowNewEnv = ref(false);
        const envModalShowBulk = ref(false);
        const envModalBulkText = ref('');
        const envModalCopied = ref(null);

        // Dynamic Postman Variables Reference Cheatsheet
        const dynamicVariablesCheatsheet = [
            { key: '$guid', category: 'Identifiers', description: 'Randomly generated v4 UUID', sample: 'e2b3c4d5-6789-4abc-def0-123456789abc' },
            { key: '$randomUUID', category: 'Identifiers', description: 'Randomly generated v4 UUID alias', sample: 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d' },
            { key: '$timestamp', category: 'Date & Time', description: 'Current Unix timestamp in seconds', sample: '1728000000' },
            { key: '$isoTimestamp', category: 'Date & Time', description: 'Current ISO-8601 UTC timestamp', sample: new Date().toISOString() },
            { key: '$randomInt', category: 'Numbers', description: 'Random integer between 0 and 1000', sample: '482' },
            { key: '$randomAlphaNumeric', category: 'Text', description: 'Random 8-character alphanumeric string', sample: 'k8m2x9qp' },
            { key: '$randomEmail', category: 'Synthetic Data', description: 'Random mock email address', sample: 'alex.rivera@example.com' },
            { key: '$randomUserName', category: 'Synthetic Data', description: 'Random internet username', sample: 'dev_alex42' },
            { key: '$randomFirstName', category: 'Personal', description: 'Random first name', sample: 'Elena' },
            { key: '$randomLastName', category: 'Personal', description: 'Random last name', sample: 'Chen' },
            { key: '$randomPhoneNumber', category: 'Personal', description: 'Random formatted phone number', sample: '+1 (555) 019-2834' },
            { key: '$randomCity', category: 'Location', description: 'Random world city', sample: 'San Francisco' },
            { key: '$randomCountry', category: 'Location', description: 'Random country name', sample: 'Germany' },
            { key: '$randomColor', category: 'Design', description: 'Random hex color code', sample: '#f97316' },
            { key: '$randomPrice', category: 'Finance', description: 'Random currency price (1.00 - 99.99)', sample: '49.95' },
            { key: '$randomBoolean', category: 'Logic', description: 'Random boolean true / false', sample: 'true' },
            { key: '$randomLoremSentence', category: 'Text', description: 'Standard lorem ipsum sentence', sample: 'Lorem ipsum dolor sit amet consectetur.' }
        ];

        // Set as Variable Modal State (100% Parity with React SetAsVariableModal.tsx)
        const setAsVarKey = ref('');
        const setAsVarValue = ref('');
        const setAsVarScope = ref('environment'); // 'environment' | 'global' | 'collection'
        const setAsVarTargetId = ref('');
        const setAsVarIsSecret = ref(false);

        // Customer Detail Modal State (100% Parity with React CustomerDetailModal.tsx & SaaS 360)
        const selectedCustomerDetail = ref(null);

        // Runner Execution State & Live Metrics
        const runnerDelayMs = ref(0);
        const runnerStats = ref({ total: 0, completed: 0, passed: 0, failed: 0 });
        const runnerExecutionLog = ref([]);
        const runnerIterations = ref(1);
        const runnerCurrentIndex = ref(-1);

        const getInitials = (name) => {
            if (!name) return '??';
            return name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
        };

        const openRunnerTab = (colId) => {
            openCollectionRunnerTab(colId);
        };
        const stopRunnerExecution = () => {
            runnerRunning.value = false;
        };
        const exportRunnerResultsJson = () => {
            const data = {
                collectionId: runnerSelectedCollectionId.value,
                runDate: new Date().toISOString(),
                iterations: runnerIterations.value,
                stats: runnerStats.value,
                logs: runnerExecutionLog.value
            };
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'collection_run_' + Date.now() + '.json';
            a.click();
            URL.revokeObjectURL(url);
        };

        const openCreateFolderModal = (colId) => {
            openNewFolderModal(colId);
        };

        // Landing Page Sandbox State
        const sandboxPresets = [
            { name: "Get Posts", method: "GET", url: "https://jsonplaceholder.typicode.com/posts/1", body: "" },
            { name: "Create User", method: "POST", url: "https://jsonplaceholder.typicode.com/users", body: JSON.stringify({ name: "Alex Rivera", username: "alexr", email: "alex@example.com" }, null, 2) },
            { name: "HTTPBin Get", method: "GET", url: "https://httpbin.org/get", body: "" },
            { name: "ReqRes Users", method: "GET", url: "https://reqres.in/api/users?page=1", body: "" }
        ];
        const sandboxMethod = ref("GET");
        const sandboxUrl = ref("https://jsonplaceholder.typicode.com/posts/1");
        const sandboxBody = ref("");
        const sandboxLoading = ref(false);
        const sandboxResponse = ref(null);

        const applySandboxPreset = (p) => {
            sandboxMethod.value = p.method;
            sandboxUrl.value = p.url;
            sandboxBody.value = p.body;
        };

        // HTTP Execution Engine with Automatic PHP Server Proxy Fallback for CORS
        const executeHttpRequestJs = async (requestConfig, forceProxy = false) => {
            const startTime = performance.now();
            let rawUrl = resolveVariables(requestConfig.url || "");
            if (!rawUrl.startsWith("http://") && !rawUrl.startsWith("https://")) {
                rawUrl = "https://" + rawUrl;
            }

            let urlObj;
            try {
                urlObj = new URL(rawUrl);
            } catch (e) {
                try {
                    urlObj = new URL("https://" + rawUrl.replace(/^https?:\/\//, ""));
                } catch (err) {
                    const duration = Math.round(performance.now() - startTime);
                    return {
                        status: 400,
                        statusText: "Bad URL",
                        headers: {},
                        data: "Invalid URL: " + (requestConfig.url || ""),
                        time: duration,
                        size: 0,
                        url: rawUrl,
                        isError: true
                    };
                }
            }

            // Append enabled query parameters
            if (requestConfig.params && Array.isArray(requestConfig.params)) {
                requestConfig.params.forEach(p => {
                    if (p.enabled && p.key && p.key.trim()) {
                        urlObj.searchParams.set(resolveVariables(p.key.trim()), resolveVariables(p.value || ""));
                    }
                });
            }

            // Handle API Key in query parameter if configured
            if ((requestConfig.auth && requestConfig.auth.type === "apiKey") && requestConfig.auth.apiKeyAddTo === "query" && requestConfig.auth.apiKeyName) {
                urlObj.searchParams.set(resolveVariables(requestConfig.auth.apiKeyName), resolveVariables(requestConfig.auth.apiKeyValue || ""));
            }

            const targetUrl = urlObj.toString();

            // Prepare Request Headers
            const reqHeaders = {};
            if (requestConfig.headers) {
                if (Array.isArray(requestConfig.headers)) {
                    requestConfig.headers.forEach(h => {
                        if (h.enabled && h.key && h.key.trim()) {
                            reqHeaders[resolveVariables(h.key.trim())] = resolveVariables(h.value || "");
                        }
                    });
                } else if (typeof requestConfig.headers === "object") {
                    Object.keys(requestConfig.headers).forEach(k => {
                        if (requestConfig.headers[k]) reqHeaders[k] = resolveVariables(requestConfig.headers[k]);
                    });
                }
            }

            // Handle Auth Types
            if ((requestConfig.auth && requestConfig.auth.type === "bearer") && requestConfig.auth.bearerToken) {
                reqHeaders["Authorization"] = "Bearer " + resolveVariables(requestConfig.auth.bearerToken);
            } else if (requestConfig.auth && requestConfig.auth.type === "oauth2") {
                const tok = resolveVariables(requestConfig.auth.oauth2Token || requestConfig.auth.bearerToken || "");
                if (tok) {
                    const prefix = requestConfig.auth.oauth2HeaderPrefix || "Bearer";
                    reqHeaders["Authorization"] = prefix + " " + tok;
                }
            } else if ((requestConfig.auth && requestConfig.auth.type === "basic")) {
                const u = resolveVariables(requestConfig.auth.basicUsername || "");
                const p = resolveVariables(requestConfig.auth.basicPassword || "");
                reqHeaders["Authorization"] = "Basic " + btoa(u + ":" + p);
            } else if ((requestConfig.auth && requestConfig.auth.type === "apiKey") && requestConfig.auth.apiKeyAddTo === "header" && requestConfig.auth.apiKeyName) {
                reqHeaders[resolveVariables(requestConfig.auth.apiKeyName)] = resolveVariables(requestConfig.auth.apiKeyValue || "");
            }

            // Apply default Postman-like headers if they are not already set
            const lowerCaseHeaders = Object.keys(reqHeaders).map(k => k.toLowerCase());
            if (!lowerCaseHeaders.includes('accept')) reqHeaders['Accept'] = '*/*';
            if (!lowerCaseHeaders.includes('cache-control')) reqHeaders['Cache-Control'] = 'no-cache';
            if (!lowerCaseHeaders.includes('connection')) reqHeaders['Connection'] = 'keep-alive';
            // Note: Browsers generally block overriding the "User-Agent" header via Fetch for security reasons,
            // but we can add a custom Postman token to simulate Postman behavior.
            if (!lowerCaseHeaders.includes('postman-token')) reqHeaders['Postman-Token'] = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);

            // Prepare Request Body
            let bodyPayload = undefined;
            const method = (requestConfig.method || "GET").toUpperCase();
            if (method !== "GET" && method !== "HEAD") {
                if (typeof requestConfig.body === "string") {
                    bodyPayload = resolveVariables(requestConfig.body);
                    if (!reqHeaders["Content-Type"] && !reqHeaders["content-type"]) {
                        reqHeaders["Content-Type"] = "application/json";
                    }
                } else if ((requestConfig.body && requestConfig.body.type === "json") && requestConfig.body.rawText) {
                    bodyPayload = resolveVariables(requestConfig.body.rawText);
                    if (!reqHeaders["Content-Type"] && !reqHeaders["content-type"]) {
                        reqHeaders["Content-Type"] = "application/json";
                    }
                } else if ((requestConfig.body && requestConfig.body.type === "x-www-form-urlencoded")) {
                    const formParams = new URLSearchParams();
                    if (requestConfig.body.urlEncoded && Array.isArray(requestConfig.body.urlEncoded)) {
                        requestConfig.body.urlEncoded.forEach(item => {
                            if (item.enabled && item.key && item.key.trim()) {
                                formParams.append(resolveVariables(item.key.trim()), resolveVariables(item.value || ""));
                            }
                        });
                    }
                    bodyPayload = formParams.toString();
                    if (!reqHeaders["Content-Type"] && !reqHeaders["content-type"]) {
                        reqHeaders["Content-Type"] = "application/x-www-form-urlencoded";
                    }
                } else if ((requestConfig.body && requestConfig.body.type === "form-data")) {
                    const formData = new FormData();
                    if (requestConfig.body.formData && Array.isArray(requestConfig.body.formData)) {
                        requestConfig.body.formData.forEach(item => {
                            if (item.enabled && item.key && item.key.trim()) {
                                if (item.type === 'file' && item.file instanceof File) {
                                    formData.append(resolveVariables(item.key.trim()), item.file);
                                } else {
                                    formData.append(resolveVariables(item.key.trim()), resolveVariables(item.value || ""));
                                }
                            }
                        });
                    }
                    bodyPayload = formData;
                    // Do not set Content-Type manually for form-data, let fetch handle the boundary!
                    delete reqHeaders["Content-Type"];
                    delete reqHeaders["content-type"];
                } else if ((requestConfig.body && requestConfig.body.type === "raw") && requestConfig.body.rawText) {
                    bodyPayload = resolveVariables(requestConfig.body.rawText);
                }
            }

            // Direct fetch attempt (if not forced to use proxy)
            if (!forceProxy) {
                try {
                    const fetchOpts = {
                        method: method,
                        headers: reqHeaders,
                        mode: "cors"
                    };
                    if (bodyPayload !== undefined) {
                        fetchOpts.body = bodyPayload;
                    }

                    const response = await fetch(targetUrl, fetchOpts);
                    const duration = Math.round(performance.now() - startTime);

                    const respHeaders = {};
                    response.headers.forEach((val, key) => {
                        respHeaders[key] = val;
                    });

                    const responseText = await response.text();
                    const responseSize = new Blob([responseText]).size;

                    return {
                        status: response.status,
                        statusText: response.statusText || (response.ok ? "OK" : "HTTP " + response.status),
                        headers: respHeaders,
                        data: responseText,
                        time: duration,
                        size: responseSize,
                        url: targetUrl,
                        isError: false,
                        isProxied: false,
                        isCorsError: false
                    };
                } catch (err) {
                    console.log("[Direct Fetch Failed, attempting server proxy fallback]:", err.message);
                }
            }

            // Server Proxy Fallback: bypasses browser CORS restrictions
            try {
                let proxyResp;
                try {
                    proxyResp = await fetch('api?action=proxy', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            url: targetUrl,
                            method: method,
                            headers: reqHeaders,
                            body: typeof bodyPayload === 'string' ? bodyPayload : undefined
                        })
                    });
                    if (!proxyResp.ok && proxyResp.status === 404) {
                        throw new Error('Fallback to api.php');
                    }
                } catch (rewriteErr) {
                    proxyResp = await fetch('api.php?action=proxy', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            url: targetUrl,
                            method: method,
                            headers: reqHeaders,
                            body: typeof bodyPayload === 'string' ? bodyPayload : undefined
                        })
                    });
                }

                if (proxyResp) {
                    let pData;
                    try {
                        pData = await proxyResp.json();
                    } catch (e) {
                        const rawT = await proxyResp.text().catch(() => '');
                        pData = { status: proxyResp.status, data: rawT, rawBody: rawT };
                    }

                    const duration = pData.time || Math.round(performance.now() - startTime);
                    return {
                        status: pData.status ?? (proxyResp.ok ? 200 : proxyResp.status),
                        statusText: pData.statusText || (pData.status ? "HTTP " + pData.status : "OK"),
                        headers: pData.headers || {},
                        data: pData.data !== undefined ? (typeof pData.data === 'object' ? JSON.stringify(pData.data, null, 2) : pData.data) : (pData.rawBody || ''),
                        time: duration,
                        size: pData.size || (pData.data ? (typeof pData.data === 'string' ? pData.data.length : JSON.stringify(pData.data).length) : 0),
                        url: targetUrl,
                        isError: (pData.status >= 400 || pData.status === 0),
                        isProxied: true,
                        isCorsError: pData.status === 0
                    };
                }
            } catch (proxyErr) {
                console.log("[Proxy Fallback Failed]:", proxyErr);
            }

            const duration = Math.round(performance.now() - startTime);
            return {
                status: 0,
                statusText: "CORS / Network Error",
                headers: {},
                data: "Network request blocked by browser policy. This typically occurs when the target API does not return 'Access-Control-Allow-Origin' headers, or when mixed content (HTTP on HTTPS) is blocked.\n\nClick the 'How to Fix' button above to see step-by-step instructions to resolve this in the app.",
                time: duration,
                size: 0,
                url: targetUrl,
                isError: true,
                isProxied: false,
                isCorsError: true
            };
        };

        const getClientGuestId = () => {
            let gid = localStorage.getItem('cp_guest_id');
            if (!gid) {
                gid = 'guest_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 9);
                localStorage.setItem('cp_guest_id', gid);
                try {
                    document.cookie = `cp_guest_id=${gid}; path=/; max-age=31536000; SameSite=Lax`;
                } catch (e) {}
            }
            return gid;
        };

        const guestShortCode = computed(() => {
            const gid = getClientGuestId();
            return gid.replace(/^guest_/, '').slice(-6).toUpperCase();
        });

        const requestGuestResetConfirmation = () => {
            activeModal.value = 'guestResetConfirmModal';
        };

        const confirmGuestReset = () => {
            activeModal.value = null;
            const newGuestId = 'guest_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 9);
            localStorage.setItem('cp_guest_id', newGuestId);
            try {
                document.cookie = `cp_guest_id=${encodeURIComponent(newGuestId)}; path=/; max-age=31536000; SameSite=Lax`;
            } catch (e) {}
            window.location.reload();
        };

        const persistRequestAndResponseToPhp = async (reqObj, respObj) => {
            try {
                const guestId = getClientGuestId();
                const historyEntry = {
                    id: 'hist_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6),
                    userId: guestId,
                    workspaceId: activeWorkspaceId.value,
                    name: reqObj.name || 'API Request',
                    method: reqObj.method || 'GET',
                    url: respObj.url || resolveVariables(reqObj.url || ''),
                    statusCode: respObj.status || 0,
                    responseTimeMs: respObj.time || 0,
                    responseSizeBytes: respObj.size || 0,
                    request: {
                        method: reqObj.method,
                        url: respObj.url || reqObj.url,
                        headers: reqObj.headers || [],
                        params: reqObj.params || [],
                        auth: reqObj.auth || { type: 'none' },
                        body: reqObj.body || { type: 'none' }
                    },
                    response: {
                        status: respObj.status,
                        statusText: respObj.statusText,
                        time: respObj.time,
                        size: respObj.size,
                        headers: respObj.headers || {},
                        data: typeof respObj.data === 'string' ? respObj.data.slice(0, 100000) : JSON.stringify(respObj.data)
                    },
                    executedAt: new Date().toISOString()
                };

                await fetch('api?action=save_history', {
                    method: 'POST',
                    headers: { 
                        'Content-Type': 'application/json',
                        'x-guest-id': guestId
                    },
                    body: JSON.stringify(historyEntry)
                });
            } catch (e) {
                console.warn('PHP History Logging notice:', e);
            }
        };

        const sendSandboxRequest = async () => {
            sandboxLoading.value = true;
            try {
                const result = await executeHttpRequestJs({
                    url: sandboxUrl.value,
                    method: sandboxMethod.value,
                    headers: [{ key: 'Content-Type', value: 'application/json', enabled: true }],
                    body: sandboxBody.value
                });
                sandboxResponse.value = result;

                // Save request & response details with PHP backend
                persistRequestAndResponseToPhp({
                    name: 'Sandbox: ' + sandboxMethod.value + ' ' + sandboxUrl.value,
                    method: sandboxMethod.value,
                    url: sandboxUrl.value,
                    body: { type: 'json', rawText: sandboxBody.value }
                }, result);
            } catch (e) {
                sandboxResponse.value = { status: 500, statusText: 'Client Execution Error', data: e.message, time: 0, size: 0 };
            } finally {
                sandboxLoading.value = false;
                
            }
        };

        const sandboxFormattedResponse = computed(() => {
            if (!sandboxResponse.value) return '';
            try {
                const parsed = typeof sandboxResponse.value.data === 'string' ? JSON.parse(sandboxResponse.value.data) : sandboxResponse.value.data;
                return JSON.stringify(parsed, null, 2);
            } catch (e) {
                return sandboxResponse.value.data || '';
            }
        });

        // Core Studio State
        const workspaces = ref([
            { id: 'ws_dev_core', name: 'Engineering Core' },
            { id: 'ws_public_api', name: 'Public APIs' }
        ]);
        const activeWorkspaceId = ref('ws_dev_core');
        const activeWorkspace = computed(() => workspaces.value.find(w => w.id === activeWorkspaceId.value));

        const environments = ref([
            {
                id: 'env_global',
                name: 'Globals',
                isGlobal: true,
                variables: [
                    { id: 'var_g1', key: 'apiVersion', value: 'v1', initialValue: 'v1', enabled: true, isSecret: false },
                    { id: 'var_g2', key: 'appName', value: 'CloudPost Studio', initialValue: 'CloudPost Studio', enabled: true, isSecret: false }
                ]
            },
            {
                id: 'env_dev',
                name: 'Development',
                isGlobal: false,
                variables: [
                    { id: 'var_d1', key: 'baseUrl', value: 'https://jsonplaceholder.typicode.com', initialValue: 'https://jsonplaceholder.typicode.com', enabled: true, isSecret: false }
                ]
            },
            {
                id: 'env_prod',
                name: 'Production',
                isGlobal: false,
                variables: [
                    { id: 'var_p1', key: 'baseUrl', value: 'https://api.example.com', initialValue: 'https://api.example.com', enabled: true, isSecret: false }
                ]
            }
        ]);
        const activeEnvId = ref('env_dev');
        const activeEnv = computed(() => environments.value.find(e => e.id === activeEnvId.value));

        const collections = ref([
            {
                id: 'col_init_my_api',
                name: 'My API Collections',
                folders: [
                    {
                        id: 'fld_users',
                        name: 'Users',
                        collectionId: 'col_init_my_api',
                        requests: [
                            {
                                id: 'req_new_http',
                                collectionId: 'col_init_my_api',
                                name: 'New HTTP Request',
                                method: 'GET',
                                url: 'https://jsonplaceholder.typicode.com/todos/1',
                                params: [],
                                headers: [{ key: 'Accept', value: 'application/json', enabled: true }],
                                auth: { type: 'none' },
                                body: { type: 'none', rawText: '', rawType: 'application/json', urlEncoded: [], formData: [] },
                                preRequestScript: '',
                                testsScript: 'pm.test("Status is 200 OK", () => pm.response.to.have.status(200));'
                            },
                            {
                                id: 'req_get_products',
                                collectionId: 'col_init_my_api',
                                name: 'Get All Products List',
                                method: 'GET',
                                url: 'https://dummyjson.com/products?limit=10',
                                params: [{ key: 'limit', value: '10', enabled: true }],
                                headers: [{ key: 'Accept', value: 'application/json', enabled: true }],
                                auth: { type: 'none' },
                                body: { type: 'none', rawText: '', rawType: 'application/json', urlEncoded: [], formData: [] },
                                preRequestScript: '',
                                testsScript: 'pm.test("Status is 200 OK", () => pm.response.to.have.status(200));\npm.test("Returns 10 products", () => {\n  const json = pm.response.json();\n  pm.expect(json.products.length).to.eql(10);\n});'
                            },
                            {
                                id: 'req_update_order',
                                collectionId: 'col_init_my_api',
                                name: 'Update Order Shipping Details',
                                method: 'PATCH',
                                url: 'https://dummyjson.com/orders/1',
                                params: [],
                                headers: [{ key: 'Content-Type', value: 'application/json', enabled: true }],
                                auth: { type: 'none' },
                                body: {
                                    type: 'json',
                                    rawText: '{\n  "shippingAddress": "123 Market St, Suite 400",\n  "status": "shipped"\n}',
                                    rawType: 'application/json',
                                    urlEncoded: [],
                                    formData: []
                                },
                                preRequestScript: '',
                                testsScript: 'pm.test("Status is 200 OK", () => pm.response.to.have.status(200));'
                            }
                        ]
                    }
                ],
                requests: []
            }
        ]);

        const collapsedCollections = ref({});
        const collapsedFolders = ref({});
        const recentRequests = ref([]);
        const runnerSelectedCollectionId = ref((collections.value[0] ? collections.value[0].id : "col_default"));

        const req1 = collections.value[0]?.folders[0]?.requests[0];
        const req2 = collections.value[0]?.folders[0]?.requests[1];
        const req3 = collections.value[0]?.folders[0]?.requests[2];

        const tabs = ref([
            { id: 'tab_register', title: 'Register Account', type: 'register' },
            ...(req3 ? [{ id: 'tab_' + req3.id, title: req3.name, type: 'request', method: req3.method, request: JSON.parse(JSON.stringify(req3)) }] : []),
            ...(req2 ? [{ id: 'tab_' + req2.id, title: req2.name, type: 'request', method: req2.method, request: JSON.parse(JSON.stringify(req2)) }] : []),
            ...(req1 ? [{ id: 'tab_' + req1.id, title: req1.name, type: 'request', method: req1.method, request: JSON.parse(JSON.stringify(req1)) }] : []),
            { id: 'tab_websocket_client', title: 'WebSocket Client', type: 'websocket' },
            { id: 'tab_graphql_explorer', title: 'GraphQL Explorer', type: 'graphql' },
            { id: 'tab_system_architecture', title: 'System Architecture', type: 'architecture' }
        ]);
        const activeTabId = ref('tab_websocket_client');
        const activeTab = computed(() => tabs.value.find(t => t.id === activeTabId.value) || tabs.value[0] || null);
        const activeRequest = computed(() => {
            const t = tabs.value.find(tab => tab.id === activeTabId.value);
            return (t && (!t.type || t.type === 'request')) ? t.request : null;
        });
        const activeResponse = ref(null);

        const primaryBodyType = computed({
            get: () => {
                if (!activeRequest.value) return 'none';
                const type = activeRequest.value.body.type;
                if (type === 'json') return 'raw'; // JSON is treated as a sub-format of raw in UI
                return type;
            },
            set: (val) => {
                if (!activeRequest.value) return;
                if (val === 'raw') {
                    activeRequest.value.body.type = 'json'; // Default raw format is JSON
                } else {
                    activeRequest.value.body.type = val;
                }
            }
        });

        const rawBodyFormat = computed({
            get: () => {
                if (!activeRequest.value) return 'JSON';
                const type = activeRequest.value.body.type;
                if (type === 'json') return 'JSON';
                if (type === 'raw') return 'Text';
                return 'JSON';
            },
            set: (val) => {
                if (!activeRequest.value) return;
                if (val === 'JSON') {
                    activeRequest.value.body.type = 'json';
                } else {
                    activeRequest.value.body.type = 'raw';
                }
            }
        });

        // Bulk Mode States
        const paramsBulkMode = ref(false);
        const paramsBulkText = ref('');
        const headersBulkMode = ref(false);
        const headersBulkText = ref('');
        const urlEncodedBulkMode = ref(false);
        const urlEncodedBulkText = ref('');
        const formDataBulkMode = ref(false);
        const formDataBulkText = ref('');


        const activeCollection = computed(() => {
            if (activeRequest.value && activeRequest.value.collectionId) {
                return collections.value.find(c => c.id === activeRequest.value.collectionId) || collections.value[0] || null;
            }
            return collections.value[0] || null;
        });

        const activeEnvTargetName = computed(() => {
            if (envModalTargetId.value.startsWith('col_')) {
                const cId = envModalTargetId.value.replace('col_', '');
                const col = collections.value.find(c => c.id === cId);
                return col ? col.name + ' (Collection Variables)' : 'Collection Variables';
            }
            const env = environments.value.find(e => e.id === envModalTargetId.value);
            return env ? env.name : 'Variables';
        });

        const isCurrentTargetNonGlobalEnv = computed(() => {
            const env = environments.value.find(e => e.id === envModalTargetId.value);
            return env && !env.isGlobal;
        });

        const isCurrentTargetCustomEnv = computed(() => {
            const env = environments.value.find(e => e.id === envModalTargetId.value);
            return env && !env.isGlobal && env.id !== 'env_dev' && env.id !== 'env_prod';
        });

        const filteredActiveEnvVariables = computed(() => {
            let vars = [];
            if (envModalTargetId.value.startsWith('col_')) {
                const cId = envModalTargetId.value.replace('col_', '');
                const col = collections.value.find(c => c.id === cId);
                vars = col ? (col.variables || []) : [];
            } else {
                const env = environments.value.find(e => e.id === envModalTargetId.value);
                vars = env ? (env.variables || []) : [];
            }
            if (!envModalSearch.value.trim()) return vars;
            const q = envModalSearch.value.toLowerCase().trim();
            return vars.filter(v => (v.key && v.key.toLowerCase().includes(q)) || (v.value && String(v.value).toLowerCase().includes(q)));
        });

        const addVariableToActiveEnv = () => {
            const newVar = {
                id: 'var_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
                key: '',
                value: '',
                initialValue: '',
                enabled: true,
                isSecret: false
            };
            if (envModalTargetId.value.startsWith('col_')) {
                const cId = envModalTargetId.value.replace('col_', '');
                const col = collections.value.find(c => c.id === cId);
                if (col) {
                    if (!col.variables) col.variables = [];
                    col.variables.push(newVar);
                }
            } else {
                const env = environments.value.find(e => e.id === envModalTargetId.value);
                if (env) {
                    if (!env.variables) env.variables = [];
                    env.variables.push(newVar);
                }
            }
            saveStateToServer();
        };

        const deleteVariableFromActiveEnv = (varId) => {
            if (envModalTargetId.value.startsWith('col_')) {
                const cId = envModalTargetId.value.replace('col_', '');
                const col = collections.value.find(c => c.id === cId);
                if (col && col.variables) {
                    col.variables = col.variables.filter(v => v.id !== varId);
                }
            } else {
                const env = environments.value.find(e => e.id === envModalTargetId.value);
                if (env && env.variables) {
                    env.variables = env.variables.filter(v => v.id !== varId);
                }
            }
            saveStateToServer();
        };

        const createNewEnvironment = () => {
            const name = (envModalNewEnvName.value || '').trim();
            if (!name) return;
            const newEnv = {
                id: 'env_' + Date.now(),
                name: name,
                isGlobal: false,
                variables: [
                    { id: 'var_' + Date.now(), key: 'baseUrl', value: 'https://api.example.com', initialValue: 'https://api.example.com', enabled: true, isSecret: false }
                ]
            };
            environments.value.push(newEnv);
            envModalTargetId.value = newEnv.id;
            envModalNewEnvName.value = '';
            envModalShowNewEnv.value = false;
            saveStateToServer();
        };

        const deleteCurrentEnvironment = (envId) => {
            environments.value = environments.value.filter(e => e.id !== envId);
            if (activeEnvId.value === envId) {
                activeEnvId.value = environments.value.length > 0 ? environments.value[0].id : null;
            }
            envModalTargetId.value = 'env_global';
            saveStateToServer();
        };

        const handleBulkImportVars = (append = true) => {
            const lines = envModalBulkText.value.split('\n');
            const newVars = [];
            lines.forEach(line => {
                const clean = line.trim();
                if (!clean || clean.startsWith('#')) return;
                const eqIdx = clean.indexOf('=');
                if (eqIdx > 0) {
                    const key = clean.substring(0, eqIdx).trim();
                    let val = clean.substring(eqIdx + 1).trim();
                    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
                        val = val.slice(1, -1);
                    }
                    newVars.push({
                        id: 'var_' + Date.now() + '_' + Math.floor(Math.random() * 10000),
                        key: key,
                        value: val,
                        initialValue: val,
                        enabled: true,
                        isSecret: key.toLowerCase().includes('key') || key.toLowerCase().includes('secret') || key.toLowerCase().includes('token') || key.toLowerCase().includes('pass')
                    });
                }
            });

            if (envModalTargetId.value.startsWith('col_')) {
                const cId = envModalTargetId.value.replace('col_', '');
                const col = collections.value.find(c => c.id === cId);
                if (col) {
                    col.variables = append ? [...(col.variables || []), ...newVars] : newVars;
                }
            } else {
                const env = environments.value.find(e => e.id === envModalTargetId.value);
                if (env) {
                    env.variables = append ? [...(env.variables || []), ...newVars] : newVars;
                }
            }
            envModalBulkText.value = '';
            envModalShowBulk.value = false;
            saveStateToServer();
        };

        const exportActiveEnvJson = () => {
            let data = null;
            let filename = 'environment.json';
            if (envModalTargetId.value.startsWith('col_')) {
                const cId = envModalTargetId.value.replace('col_', '');
                const col = collections.value.find(c => c.id === cId);
                data = col ? (col.variables || []) : [];
                filename = (col ? col.name.toLowerCase().replace(/[^a-z0-9]/g, '_') : 'collection') + '_vars.json';
            } else {
                const env = environments.value.find(e => e.id === envModalTargetId.value);
                data = env;
                filename = (env ? env.name.toLowerCase().replace(/[^a-z0-9]/g, '_') : 'environment') + '.json';
            }
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            a.click();
            URL.revokeObjectURL(url);
        };

        const openSetAsVariableModal = (suggestedKey = '', suggestedValue = '') => {
            setAsVarKey.value = String(suggestedKey).replace(/[^a-zA-Z0-9_-]/g, '_');
            setAsVarValue.value = typeof suggestedValue === 'string' ? suggestedValue : JSON.stringify(suggestedValue);
            setAsVarScope.value = 'environment';
            setAsVarIsSecret.value = false;
            activeModal.value = 'setAsVariableModal';
        };

        const commitSetAsVariable = () => {
            const key = setAsVarKey.value.trim();
            const val = setAsVarValue.value;
            if (!key) return;

            const varItem = {
                id: 'var_' + Date.now(),
                key: key,
                value: val,
                initialValue: val,
                enabled: true,
                isSecret: setAsVarIsSecret.value
            };

            if (setAsVarScope.value === 'global') {
                let globalEnv = environments.value.find(e => e.isGlobal || e.id === 'env_global');
                if (!globalEnv) {
                    globalEnv = { id: 'env_global', name: 'Globals', isGlobal: true, variables: [] };
                    environments.value.unshift(globalEnv);
                }
                const existing = globalEnv.variables.find(v => v.key === key);
                if (existing) {
                    existing.value = val;
                    existing.isSecret = setAsVarIsSecret.value;
                } else {
                    globalEnv.variables.push(varItem);
                }
            } else if (setAsVarScope.value === 'collection') {
                const col = activeCollection.value || collections.value[0];
                if (col) {
                    if (!col.variables) col.variables = [];
                    const existing = col.variables.find(v => v.key === key);
                    if (existing) {
                        existing.value = val;
                        existing.isSecret = setAsVarIsSecret.value;
                    } else {
                        col.variables.push(varItem);
                    }
                }
            } else {
                const env = activeEnv.value || environments.value.find(e => !e.isGlobal);
                if (env) {
                    if (!env.variables) env.variables = [];
                    const existing = env.variables.find(v => v.key === key);
                    if (existing) {
                        existing.value = val;
                        existing.isSecret = setAsVarIsSecret.value;
                    } else {
                        env.variables.push(varItem);
                    }
                }
            }

            saveStateToServer();
            activeModal.value = null;
        };

        const customerDetailTab = ref('overview');
        const customerNotes = ref('');
        const customerCustomFee = ref('');
        const customerDiscountPercent = ref(0);
        const customerStatus = ref('active');
        const openCustomerDetail = (c) => {
            selectedCustomerDetail.value = JSON.parse(JSON.stringify(c));
            customerDetailTab.value = 'overview';
            customerNotes.value = c.notes || '';
            customerCustomFee.value = c.monthlyFee !== undefined ? String(c.monthlyFee) : '0';
            customerDiscountPercent.value = c.customDiscountPercent || 0;
            customerStatus.value = c.status || 'active';
        };
        const saveCustomerPlan = (c) => {
            const target = saasCustomers.value.find(item => item.id === c.id);
            if (target) {
                target.plan = c.plan;
                target.status = customerStatus.value;
                target.notes = customerNotes.value;
                target.customDiscountPercent = Number(customerDiscountPercent.value) || 0;
                const feeOverride = parseFloat(customerCustomFee.value);
                if (!isNaN(feeOverride)) {
                    target.monthlyFee = feeOverride;
                } else {
                    if (c.plan === 'enterprise') target.monthlyFee = 199.00;
                    else if (c.plan === 'pro') target.monthlyFee = 29.00;
                    else target.monthlyFee = 0.00;
                }
                if (c.plan === 'enterprise') target.usage.monthlyQuota = 10000000;
                else if (c.plan === 'pro') target.usage.monthlyQuota = 1000000;
                else target.usage.monthlyQuota = 100000;
                const cost = target.costs ? target.costs.totalCost : 0;
                target.netMargin = target.monthlyFee - cost;
                target.netMarginPercent = target.monthlyFee > 0 ? parseFloat(((target.netMargin / target.monthlyFee) * 100).toFixed(1)) : 0;
            }
            saveStateToServer();
            selectedCustomerDetail.value = null;
        };

        // Multi-View Navigation Tab Openers
        const openArchitectureTab = () => {
            if (!isSaaSAdmin.value) return;
            let tab = tabs.value.find(t => t.type === 'architecture');
            if (!tab) {
                tab = { id: 'tab_arch_' + Date.now(), title: 'System Architecture', type: 'architecture' };
                tabs.value.push(tab);
            }
            activeTabId.value = tab.id;
        };

        const openSaaSUsersTab = () => {
            let tab = tabs.value.find(t => t.type === 'saas_users');
            if (!tab) {
                tab = { id: 'tab_saas_' + Date.now(), title: 'SaaS Customers', type: 'saas_users' };
                tabs.value.push(tab);
            }
            activeTabId.value = tab.id;
        };

        const openSaaSReportsTab = () => {
            let tab = tabs.value.find(t => t.type === 'saas_reports');
            if (!tab) {
                tab = { id: 'tab_reports_' + Date.now(), title: 'Financial Reports', type: 'saas_reports' };
                tabs.value.push(tab);
            }
            activeTabId.value = tab.id;
        };

        const openRegisterTab = () => {
            let tab = tabs.value.find(t => t.type === 'register');
            if (!tab) {
                tab = { id: 'tab_reg_' + Date.now(), title: 'Create Account', type: 'register' };
                tabs.value.push(tab);
            }
            activeTabId.value = tab.id;
        };
        const openCollectionRunnerTab = (colId) => {
            if (colId) runnerSelectedCollectionId.value = colId;
            let tab = tabs.value.find(t => t.type === 'collection_runner');
            if (!tab) {
                tab = { id: 'tab_runner_' + Date.now(), title: 'Collection Runner', type: 'collection_runner' };
                tabs.value.push(tab);
            }
            activeTabId.value = tab.id;
        };

        // ----------------------------------------------------
        // Multi-View Navigation Tab Openers (Parity Expansion)
        // ----------------------------------------------------
        const openWebSocketTab = () => {
            let tab = tabs.value.find(t => t.type === 'websocket');
            if (!tab) {
                tab = { id: 'tab_ws_' + Date.now(), title: 'WebSocket Tester', type: 'websocket' };
                tabs.value.push(tab);
            }
            activeTabId.value = tab.id;
        };

        const openMockServerTab = () => {
            let tab = tabs.value.find(t => t.type === 'mock_server');
            if (!tab) {
                tab = { id: 'tab_mock_' + Date.now(), title: 'Mock Server Engine', type: 'mock_server' };
                tabs.value.push(tab);
            }
            activeTabId.value = tab.id;
        };

        const openGraphQLTab = () => {
            let tab = tabs.value.find(t => t.type === 'graphql');
            if (!tab) {
                tab = { id: 'tab_gql_' + Date.now(), title: 'GraphQL Explorer', type: 'graphql' };
                tabs.value.push(tab);
            }
            activeTabId.value = tab.id;
        };

        const openMonitorTab = () => {
            let tab = tabs.value.find(t => t.type === 'monitor');
            if (!tab) {
                tab = { id: 'tab_mon_' + Date.now(), title: 'Collection Monitors', type: 'monitor' };
                tabs.value.push(tab);
            }
            activeTabId.value = tab.id;
        };

        // ----------------------------------------------------
        // 1. WebSocket Tester Engine
        // ----------------------------------------------------
        const wsUrl = ref('wss://echo.websocket.org');
        const wsStatus = ref('DISCONNECTED'); // DISCONNECTED | CONNECTING | CONNECTED | ERROR
        const wsMessages = ref([]);
        const wsComposeText = ref('{\n  "event": "ping",\n  "client": "CloudPost Studio",\n  "timestamp": ' + Date.now() + '\n}');
        const wsMsgType = ref('json');
        const wsFilterQuery = ref('');
        const wsFilterDirection = ref('all'); // all | in | out
        const wsAutoScroll = ref(true);
        const wsConnectedAt = ref(null);
        const wsElapsedSec = ref(0);
        const wsLastLatency = ref(null);
        const wsCopiedId = ref(null);
        let nativeWs = null;
        let wsTimerInterval = null;

        const wsPresets = [
            { name: 'Echo WebSocket Org', url: 'wss://echo.websocket.org', desc: 'Public RFC 6455 Echo Server' },
            { name: 'Postman Echo Socket', url: 'wss://ws.postman-echo.com/raw', desc: 'Raw Frame Postman Echo' },
            { name: 'SocketsBay Public Demo', url: 'wss://socketsbay.com/wss/v2/1/demo/', desc: 'Broadcast Demo Channel' },
            { name: 'Local Dev Server', url: 'ws://127.0.0.1:8080/ws', desc: 'Local WebSocket Daemon' }
        ];

        const setWebSocketPreset = (preset) => {
            if (!preset) return;
            if (wsStatus.value === 'CONNECTED') {
                disconnectWebSocket();
            }
            wsUrl.value = preset.url;
        };

        const connectWebSocket = () => {
            if (!wsUrl.value || !wsUrl.value.trim()) return;
            if (nativeWs) {
                try { nativeWs.close(); } catch(e) {}
            }
            wsStatus.value = 'CONNECTING';
            try {
                nativeWs = new WebSocket(wsUrl.value.trim());
                const startConnectTime = Date.now();

                nativeWs.onopen = () => {
                    wsStatus.value = 'CONNECTED';
                    wsConnectedAt.value = new Date().toLocaleTimeString();
                    wsElapsedSec.value = 0;
                    if (wsTimerInterval) clearInterval(wsTimerInterval);
                    wsTimerInterval = setInterval(() => {
                        wsElapsedSec.value++;
                    }, 1000);
                    wsMessages.value.unshift({
                        id: 'msg_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
                        direction: 'system',
                        data: 'Connected securely to ' + wsUrl.value,
                        timestamp: new Date().toLocaleTimeString(),
                        size: 0
                    });
                };

                nativeWs.onmessage = (event) => {
                    const size = typeof event.data === 'string' ? event.data.length : (event.data.byteLength || 0);
                    let displayData = event.data;
                    if (typeof event.data !== 'string') {
                        displayData = '[Binary Buffer / Blob Payload]';
                    }
                    wsMessages.value.unshift({
                        id: 'msg_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
                        direction: 'in',
                        data: displayData,
                        timestamp: new Date().toLocaleTimeString(),
                        size: size
                    });
                };

                nativeWs.onerror = (err) => {
                    wsStatus.value = 'ERROR';
                    wsMessages.value.unshift({
                        id: 'msg_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
                        direction: 'system',
                        data: 'WebSocket Transport Exception / Connection Refused',
                        timestamp: new Date().toLocaleTimeString(),
                        size: 0,
                        isError: true
                    });
                };

                nativeWs.onclose = (event) => {
                    wsStatus.value = 'DISCONNECTED';
                    if (wsTimerInterval) {
                        clearInterval(wsTimerInterval);
                        wsTimerInterval = null;
                    }
                    wsMessages.value.unshift({
                        id: 'msg_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
                        direction: 'system',
                        data: `Disconnected from host (Code: ${event.code || 1000}${event.reason ? ' - ' + event.reason : ''})`,
                        timestamp: new Date().toLocaleTimeString(),
                        size: 0
                    });
                    nativeWs = null;
                };
            } catch(err) {
                wsStatus.value = 'ERROR';
                wsMessages.value.unshift({
                    id: 'msg_' + Date.now(),
                    direction: 'system',
                    data: 'Socket instantiation failed: ' + (err.message || String(err)),
                    timestamp: new Date().toLocaleTimeString(),
                    isError: true,
                    size: 0
                });
            }
        };

        const disconnectWebSocket = () => {
            if (nativeWs) {
                try { nativeWs.close(1000, 'Normal Closure'); } catch(e) {}
                nativeWs = null;
            }
            wsStatus.value = 'DISCONNECTED';
            if (wsTimerInterval) {
                clearInterval(wsTimerInterval);
                wsTimerInterval = null;
            }
        };

        const sendWebSocketMessage = () => {
            if (!wsComposeText.value || !wsComposeText.value.trim() || wsStatus.value !== 'CONNECTED' || !nativeWs) return;
            const text = wsComposeText.value.trim();
            try {
                nativeWs.send(text);
                wsMessages.value.unshift({
                    id: 'msg_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
                    direction: 'out',
                    data: text,
                    timestamp: new Date().toLocaleTimeString(),
                    size: text.length
                });
            } catch(err) {
                alert('Send failed: ' + (err.message || String(err)));
            }
        };

        const sendWebSocketPing = () => {
            const pingPayload = JSON.stringify({ type: 'ping', timestamp: Date.now() });
            if (wsStatus.value === 'CONNECTED' && nativeWs) {
                nativeWs.send(pingPayload);
                wsMessages.value.unshift({
                    id: 'msg_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
                    direction: 'out',
                    data: pingPayload,
                    timestamp: new Date().toLocaleTimeString(),
                    size: pingPayload.length
                });
            } else {
                alert('Connect to a WebSocket first before sending Ping frames.');
            }
        };

        const clearWebSocketMessages = () => {
            wsMessages.value = [];
        };

        const copyWebSocketMessage = (id, content) => {
            if (navigator.clipboard) {
                navigator.clipboard.writeText(content);
                wsCopiedId.value = id;
                setTimeout(() => { wsCopiedId.value = null; }, 1500);
            }
        };

        const filteredWsMessages = computed(() => {
            let list = wsMessages.value;
            if (wsFilterDirection.value !== 'all') {
                list = list.filter(m => m.direction === wsFilterDirection.value || m.direction === 'system');
            }
            if (wsFilterQuery.value.trim()) {
                const q = wsFilterQuery.value.toLowerCase();
                list = list.filter(m => (m.data && String(m.data).toLowerCase().includes(q)) || (m.timestamp && m.timestamp.includes(q)));
            }
            return list;
        });

        // ----------------------------------------------------
        // 2. Mock Server Engine & Virtual APIs
        // ----------------------------------------------------
        const mockServers = ref([
            {
                id: 'mock_srv_core',
                name: 'Production SaaS & Microservices Mock',
                description: 'Core REST simulation with authentication, metering quotas, and dynamic latencies',
                baseUrl: '/api/v1',
                endpoints: [
                    {
                        id: 'ep_users_list',
                        name: 'List Active Users & Quotas',
                        method: 'GET',
                        path: '/users',
                        responseStatus: 200,
                        responseDelayMs: 120,
                        responseHeaders: [{ id: 'h1', key: 'Content-Type', value: 'application/json', enabled: true }],
                        responseBody: '{\\n  "status": "success",\\n  "total": 3,\\n  "data": [\\n    {"id": "usr_101", "name": "Sarah Connor", "role": "admin", "status": "active"},\\n    {"id": "usr_102", "name": "Alex Murphy", "role": "developer", "status": "active"},\\n    {"id": "usr_103", "name": "Elena Rostova", "role": "viewer", "status": "pending"}\\n  ]\\n}'
                    },
                    {
                        id: 'ep_auth_token',
                        name: 'OAuth 2.0 Token Generation',
                        method: 'POST',
                        path: '/oauth2/token',
                        responseStatus: 200,
                        responseDelayMs: 180,
                        responseHeaders: [{ id: 'h1', key: 'Content-Type', value: 'application/json', enabled: true }],
                        responseBody: '{\\n  "access_token": "cp_mock_tok_991823ab84cd",\\n  "token_type": "Bearer",\\n  "expires_in": 3600,\\n  "scope": "read:all write:all admin"\\n}'
                    },
                    {
                        id: 'ep_invoice_billing',
                        name: 'Fetch Monthly Invoice Breakdown',
                        method: 'GET',
                        path: '/billing/invoices/inv_2026_01',
                        responseStatus: 200,
                        responseDelayMs: 95,
                        responseHeaders: [{ id: 'h1', key: 'Content-Type', value: 'application/json', enabled: true }],
                        responseBody: '{\\n  "invoice_id": "inv_2026_01",\\n  "customer": "Stripe Atlas Inc",\\n  "amount_due": 2490.00,\\n  "currency": "USD",\\n  "status": "paid",\\n  "paid_at": "2026-03-01T10:00:00Z"\\n}'
                    },
                    {
                        id: 'ep_payment_fail',
                        name: 'Simulated 402 Payment Required',
                        method: 'POST',
                        path: '/charges/process',
                        responseStatus: 402,
                        responseDelayMs: 250,
                        responseHeaders: [{ id: 'h1', key: 'Content-Type', value: 'application/json', enabled: true }],
                        responseBody: '{\\n  "error": "insufficient_funds",\\n  "message": "Card declined: balance inadequate for this transaction",\\n  "code": "card_declined_insufficient_funds"\\n}'
                    }
                ]
            },
            {
                id: 'mock_srv_iot',
                name: 'IoT Telemetry & Edge Streaming Mock',
                description: 'Sensor data ingestion and heartbeat simulation for edge devices',
                baseUrl: '/iot/v2',
                endpoints: [
                    {
                        id: 'ep_iot_telemetry',
                        name: 'Ingest Sensor Telemetry',
                        method: 'POST',
                        path: '/sensors/telemetry',
                        responseStatus: 201,
                        responseDelayMs: 80,
                        responseHeaders: [{ id: 'h1', key: 'Content-Type', value: 'application/json', enabled: true }],
                        responseBody: '{\\n  "status": "created",\\n  "records_ingested": 128,\\n  "buffer_health": "100%",\\n  "ingestion_timestamp": "2026-09-14T11:00:00Z"\\n}'
                    }
                ]
            }
        ]);

        const activeMockServerId = ref('mock_srv_core');
        const selectedMockEndpointId = ref('ep_users_list');
        const mockTestResult = ref(null);
        const isTestingMockEndpoint = ref(false);
        const copiedMockUrl = ref(null);
        const showNewMockServerModal = ref(false);
        const newMockServerName = ref('');
        const newMockServerDesc = ref('');
        const showNewMockEndpointModal = ref(false);
        const newMockEndpoint = ref({
            name: '',
            method: 'GET',
            path: '/api/v1/new-endpoint',
            responseStatus: 200,
            responseDelayMs: 100,
            responseBody: '{\\n  "status": "success",\\n  "message": "Virtual API endpoint working seamlessly"\\n}'
        });

        const activeMockServer = computed(() => {
            return mockServers.value.find(s => s.id === activeMockServerId.value) || mockServers.value[0];
        });

        const selectedMockEndpoint = computed(() => {
            if (!activeMockServer.value) return null;
            return activeMockServer.value.endpoints.find(e => e.id === selectedMockEndpointId.value) || activeMockServer.value.endpoints[0];
        });

        const testMockEndpoint = async () => {
            const ep = selectedMockEndpoint.value;
            if (!ep) return;
            isTestingMockEndpoint.value = true;
            mockTestResult.value = null;
            const startTime = Date.now();

            try {
                const res = await fetch('api?action=mock_serve', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        action: 'mock_serve',
                        responseDelayMs: ep.responseDelayMs || 0,
                        responseStatus: ep.responseStatus || 200,
                        responseBody: ep.responseBody || '{}',
                        responseHeaders: ep.responseHeaders || []
                    })
                });

                const latencyMs = Date.now() - startTime;
                const status = res.status;
                const statusText = res.statusText || 'OK';
                const text = await res.text();
                let parsed = null;
                try { parsed = JSON.parse(text); } catch(e) {}

                mockTestResult.value = {
                    status,
                    statusText,
                    latencyMs,
                    sizeBytes: text.length,
                    headers: {
                        'content-type': res.headers.get('content-type') || 'application/json',
                        'x-mock-provider': res.headers.get('x-mock-provider') || 'CloudPost-Mock-Engine'
                    },
                    data: parsed !== null ? parsed : text,
                    raw: text
                };
            } catch(err) {
                const delay = ep.responseDelayMs || 50;
                await new Promise(r => setTimeout(r, delay));
                let parsed = null;
                try { parsed = JSON.parse(ep.responseBody); } catch(e) {}
                mockTestResult.value = {
                    status: ep.responseStatus || 200,
                    statusText: (ep.responseStatus >= 200 && ep.responseStatus < 300) ? 'OK' : 'Mock Response',
                    latencyMs: delay,
                    sizeBytes: (ep.responseBody || '').length,
                    headers: { 'content-type': 'application/json', 'x-mock-provider': 'CloudPost-Mock-Engine' },
                    data: parsed !== null ? parsed : ep.responseBody,
                    raw: ep.responseBody
                };
            } finally {
                isTestingMockEndpoint.value = false;
            }
        };

        const copyMockEndpointUrl = (ep) => {
            const server = activeMockServer.value;
            const url = window.location.origin + window.location.pathname.replace('index.php', '') + 'api?action=mock_serve&path=' + encodeURIComponent((server ? server.baseUrl : '') + ep.path);
            if (navigator.clipboard) {
                navigator.clipboard.writeText(url);
                copiedMockUrl.value = ep.id;
                setTimeout(() => { copiedMockUrl.value = null; }, 1500);
            }
        };

        const openMockInBuilder = (ep) => {
            const server = activeMockServer.value;
            const fullUrl = 'api?action=mock_serve';
            const newReq = {
                id: 'req_mock_' + Date.now(),
                name: ep.name,
                method: ep.method,
                url: fullUrl,
                params: [{ id: 'p1', key: 'path', value: (server ? server.baseUrl : '') + ep.path, enabled: true }],
                headers: [{ id: 'h1', key: 'Content-Type', value: 'application/json', enabled: true }],
                body: { type: 'json', raw: ep.method === 'POST' || ep.method === 'PUT' ? '{\\n  "mock_input": "test"\\n}' : '' },
                auth: { type: 'none' }
            };
            openRequestInTab(newReq);
        };

        const applyMockTemplate = (templateType) => {
            const ep = selectedMockEndpoint.value;
            if (!ep) return;
            if (templateType === 'users') {
                ep.method = 'GET';
                ep.responseStatus = 200;
                ep.responseBody = '{\\n  "status": "success",\\n  "total": 2,\\n  "users": [\\n    {"id": 1, "name": "Jane Doe", "email": "jane@example.com"},\\n    {"id": 2, "name": "John Smith", "email": "john@example.com"}\\n  ]\\n}';
            } else if (templateType === 'created') {
                ep.method = 'POST';
                ep.responseStatus = 201;
                ep.responseBody = '{\\n  "success": true,\\n  "id": "rec_' + Math.random().toString(36).substring(2, 8) + '",\\n  "created_at": "' + new Date().toISOString() + '"\\n}';
            } else if (templateType === 'not_found') {
                ep.responseStatus = 404;
                ep.responseBody = '{\\n  "error": "not_found",\\n  "message": "Resource with the requested ID does not exist"\\n}';
            } else if (templateType === 'server_error') {
                ep.responseStatus = 500;
                ep.responseBody = '{\\n  "error": "internal_server_error",\\n  "message": "Database connection timeout during transaction commit"\\n}';
            }
        };

        const createMockServer = () => {
            if (!newMockServerName.value.trim()) return;
            const newServer = {
                id: 'mock_srv_' + Date.now(),
                name: newMockServerName.value.trim(),
                description: newMockServerDesc.value.trim() || 'Custom Mock Server',
                baseUrl: '/api/v' + (mockServers.value.length + 1),
                endpoints: [
                    {
                        id: 'ep_' + Date.now(),
                        name: 'Health Check',
                        method: 'GET',
                        path: '/health',
                        responseStatus: 200,
                        responseDelayMs: 50,
                        responseHeaders: [{ id: 'h1', key: 'Content-Type', value: 'application/json', enabled: true }],
                        responseBody: '{\\n  "status": "healthy",\\n  "uptime": "99.99%"\\n}'
                    }
                ]
            };
            mockServers.value.push(newServer);
            activeMockServerId.value = newServer.id;
            selectedMockEndpointId.value = newServer.endpoints[0].id;
            newMockServerName.value = '';
            newMockServerDesc.value = '';
            showNewMockServerModal.value = false;
            saveStateToServer();
        };

        const deleteMockServer = (srvId) => {
            if (mockServers.value.length <= 1) {
                alert('At least one mock server must remain.');
                return;
            }
            if (!confirm('Are you sure you want to delete this mock server?')) return;
            mockServers.value = mockServers.value.filter(s => s.id !== srvId);
            activeMockServerId.value = mockServers.value[0].id;
            selectedMockEndpointId.value = mockServers.value[0].endpoints[0] ? mockServers.value[0].endpoints[0].id : null;
            saveStateToServer();
        };

        const createMockEndpoint = () => {
            const server = activeMockServer.value;
            if (!server || !newMockEndpoint.value.name.trim()) return;
            const newEp = {
                id: 'ep_' + Date.now(),
                name: newMockEndpoint.value.name.trim(),
                method: newMockEndpoint.value.method || 'GET',
                path: newMockEndpoint.value.path.trim(),
                responseStatus: parseInt(newMockEndpoint.value.responseStatus) || 200,
                responseDelayMs: parseInt(newMockEndpoint.value.responseDelayMs) || 100,
                responseHeaders: [{ id: 'h1', key: 'Content-Type', value: 'application/json', enabled: true }],
                responseBody: newMockEndpoint.value.responseBody || '{\\n  "status": "ok"\\n}'
            };
            server.endpoints.push(newEp);
            selectedMockEndpointId.value = newEp.id;
            newMockEndpoint.value.name = '';
            showNewMockEndpointModal.value = false;
            saveStateToServer();
        };

        const deleteMockEndpoint = (epId) => {
            const server = activeMockServer.value;
            if (!server) return;
            if (server.endpoints.length <= 1) {
                alert('Each mock server must keep at least one endpoint.');
                return;
            }
            server.endpoints = server.endpoints.filter(e => e.id !== epId);
            selectedMockEndpointId.value = server.endpoints[0].id;
            saveStateToServer();
        };

        // ----------------------------------------------------
        // 3. GraphQL Explorer & Schema Inspector
        // ----------------------------------------------------
        const graphqlUrl = ref('https://countries.trevorblades.com/');
        const graphqlQuery = ref('query GetCountriesAndContinents {\\n  countries(filter: { continent: { eq: "EU" } }) {\\n    code\\n    name\\n    emoji\\n    capital\\n    currency\\n    languages {\\n      name\\n      native\\n    }\\n  }\\n}');
        const graphqlVariables = ref('{}');
        const graphqlSubTab = ref('query'); // query | variables | headers
        const graphqlHeaders = ref([
            { id: 'h1', key: 'Content-Type', value: 'application/json', enabled: true }
        ]);
        const graphqlResponse = ref(null);
        const graphqlIsLoading = ref(false);
        const graphqlLatency = ref(null);
        const graphqlSize = ref(null);
        const graphqlCopied = ref(false);
        const graphqlShowSchemaDrawer = ref(false);
        const graphqlSchemaTypes = ref([]);
        const graphqlSchemaLoading = ref(false);

        const graphqlPresets = [
            {
                name: 'Countries & Continents API',
                url: 'https://countries.trevorblades.com/',
                query: 'query GetCountries {\\n  countries {\\n    code\\n    name\\n    emoji\\n    capital\\n  }\\n}'
            },
            {
                name: 'SpaceX Public GraphQL',
                url: 'https://spacex-production.up.railway.app/',
                query: 'query GetCompanyAndMissions {\\n  company {\\n    name\\n    founder\\n    founded\\n    ceo\\n  }\\n  launchesPast(limit: 5) {\\n    mission_name\\n    launch_date_utc\\n    rocket {\\n      rocket_name\\n    }\\n  }\\n}'
            },
            {
                name: 'Rick and Morty API',
                url: 'https://rickandmortyapi.com/graphql',
                query: 'query GetCharacters {\\n  characters(page: 1) {\\n    info {\\n      count\\n      pages\\n    }\\n    results {\\n      id\\n      name\\n      status\\n      species\\n    }\\n  }\\n}'
            }
        ];

        const setGraphQLPreset = (preset) => {
            if (!preset) return;
            graphqlUrl.value = preset.url;
            graphqlQuery.value = preset.query;
            graphqlVariables.value = '{}';
        };

        const addGraphQLHeader = () => {
            graphqlHeaders.value.push({
                id: 'h_' + Date.now(),
                key: '',
                value: '',
                enabled: true
            });
        };

        const removeGraphQLHeader = (id) => {
            graphqlHeaders.value = graphqlHeaders.value.filter(h => h.id !== id);
        };

        const executeGraphQLQuery = async () => {
            if (!graphqlUrl.value.trim() || !graphqlQuery.value.trim()) return;
            graphqlIsLoading.value = true;
            graphqlResponse.value = null;
            graphqlLatency.value = null;
            graphqlSize.value = null;
            const startTime = Date.now();

            let parsedVariables = {};
            try {
                if (graphqlVariables.value.trim()) {
                    parsedVariables = JSON.parse(graphqlVariables.value.trim());
                }
            } catch(e) {
                graphqlIsLoading.value = false;
                alert('GraphQL Variables must be valid JSON: ' + e.message);
                return;
            }

            try {
                const headersObj = {};
                graphqlHeaders.value.forEach(h => {
                    if (h.enabled && h.key) headersObj[h.key] = h.value;
                });
                headersObj['Content-Type'] = 'application/json';

                const directRes = await fetch(graphqlUrl.value.trim(), {
                    method: 'POST',
                    headers: headersObj,
                    body: JSON.stringify({
                        query: graphqlQuery.value,
                        variables: parsedVariables
                    })
                });

                const text = await directRes.text();
                let json = null;
                try { json = JSON.parse(text); } catch(e) {}
                graphqlLatency.value = Date.now() - startTime;
                graphqlSize.value = text.length;
                graphqlResponse.value = json || { raw: text, status: directRes.status };
            } catch(directErr) {
                graphqlLatency.value = Date.now() - startTime;
                graphqlResponse.value = {
                    errors: [{ message: 'Network / CORS Error: ' + directErr.message }],
                    status: 0
                };
            } finally {
                graphqlIsLoading.value = false;
            }
        };

        const introspectGraphQLSchema = async () => {
            if (!graphqlUrl.value.trim()) return;
            graphqlSchemaLoading.value = true;
            graphqlShowSchemaDrawer.value = true;
            const introspectionQuery = `query IntrospectionQuery {\\n  __schema {\\n    types {\\n      name\\n      kind\\n      description\\n    }\\n  }\\n}`;
            try {
                const res = await fetch(graphqlUrl.value.trim(), {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        query: introspectionQuery
                    })
                });
                const data = await res.json();
                const types = (data.data && data.data.__schema && data.data.__schema.types) || [];
                graphqlSchemaTypes.value = types.filter(t => !t.name.startsWith('__'));
            } catch(e) {
                graphqlSchemaTypes.value = [
                    { name: 'Query', kind: 'OBJECT', description: 'Root Query Object' },
                    { name: 'Mutation', kind: 'OBJECT', description: 'Root Mutation Object' },
                    { name: 'String', kind: 'SCALAR', description: 'Built-in String' },
                    { name: 'Int', kind: 'SCALAR', description: 'Built-in Integer' },
                    { name: 'Boolean', kind: 'SCALAR', description: 'Built-in Boolean' }
                ];
            } finally {
                graphqlSchemaLoading.value = false;
            }
        };

        const copyGraphQLResponse = () => {
            if (navigator.clipboard && graphqlResponse.value) {
                navigator.clipboard.writeText(JSON.stringify(graphqlResponse.value, null, 2));
                graphqlCopied.value = true;
                setTimeout(() => { graphqlCopied.value = false; }, 1500);
            }
        };

        // ----------------------------------------------------
        // 4. Collection Monitors & Uptime SLA
        // ----------------------------------------------------
        const monitors = ref([
            {
                id: 'mon_core_api',
                name: 'Production Core API Health & Latency SLA',
                collectionId: collections.value[0] ? collections.value[0].id : 'col_1',
                collectionName: collections.value[0] ? collections.value[0].name : 'Billing & Authentication',
                schedule: '15m',
                status: 'active',
                uptime: 99.95,
                avgLatencyMs: 78,
                lastRunTime: '10 minutes ago',
                lastStatus: 'success',
                history: [
                    { id: 'h1', timestamp: '11:00 AM', status: 'success', latencyMs: 72, passed: 4, failed: 0 },
                    { id: 'h2', timestamp: '10:45 AM', status: 'success', latencyMs: 81, passed: 4, failed: 0 },
                    { id: 'h3', timestamp: '10:30 AM', status: 'success', latencyMs: 75, passed: 4, failed: 0 },
                    { id: 'h4', timestamp: '10:15 AM', status: 'success', latencyMs: 84, passed: 4, failed: 0 }
                ]
            },
            {
                id: 'mon_payment',
                name: 'Stripe Gateway & Webhook Monitor',
                collectionId: collections.value[0] ? collections.value[0].id : 'col_1',
                collectionName: 'Stripe Webhooks',
                schedule: '5m',
                status: 'active',
                uptime: 99.82,
                avgLatencyMs: 142,
                lastRunTime: '3 minutes ago',
                lastStatus: 'success',
                history: [
                    { id: 'h1', timestamp: '11:05 AM', status: 'success', latencyMs: 135, passed: 2, failed: 0 },
                    { id: 'h2', timestamp: '11:00 AM', status: 'success', latencyMs: 149, passed: 2, failed: 0 }
                ]
            },
            {
                id: 'mon_auth',
                name: 'OAuth Token Renewal Heartbeat',
                collectionId: collections.value[0] ? collections.value[0].id : 'col_1',
                collectionName: 'Auth Service',
                schedule: '1h',
                status: 'paused',
                uptime: 100.0,
                avgLatencyMs: 65,
                lastRunTime: '2 hours ago',
                lastStatus: 'success',
                history: [
                    { id: 'h1', timestamp: '09:00 AM', status: 'success', latencyMs: 65, passed: 1, failed: 0 }
                ]
            }
        ]);

        const activeMonitorId = ref('mon_core_api');
        const isRunningMonitor = ref(false);
        const showNewMonitorModal = ref(false);
        const newMonitorName = ref('');
        const newMonitorCollectionId = ref(collections.value[0] ? collections.value[0].id : '');
        const newMonitorSchedule = ref('15m');

        const activeMonitor = computed(() => {
            return monitors.value.find(m => m.id === activeMonitorId.value) || monitors.value[0];
        });

        const toggleMonitorStatus = (monId) => {
            const mon = monitors.value.find(m => m.id === monId);
            if (!mon) return;
            mon.status = mon.status === 'active' ? 'paused' : 'active';
            saveStateToServer();
        };

        const deleteMonitor = (monId) => {
            if (!confirm('Are you sure you want to delete this monitor?')) return;
            monitors.value = monitors.value.filter(m => m.id !== monId);
            if (monitors.value.length > 0) {
                activeMonitorId.value = monitors.value[0].id;
            }
            saveStateToServer();
        };

        const createMonitor = () => {
            if (!newMonitorName.value.trim()) return;
            const targetCol = collections.value.find(c => c.id === newMonitorCollectionId.value) || collections.value[0];
            const newMon = {
                id: 'mon_' + Date.now(),
                name: newMonitorName.value.trim(),
                collectionId: targetCol ? targetCol.id : 'col_1',
                collectionName: targetCol ? targetCol.name : 'All Requests',
                schedule: newMonitorSchedule.value || '15m',
                status: 'active',
                uptime: 100.0,
                avgLatencyMs: 85,
                lastRunTime: 'Just now',
                lastStatus: 'success',
                history: [
                    { id: 'h_' + Date.now(), timestamp: new Date().toLocaleTimeString(), status: 'success', latencyMs: 85, passed: 1, failed: 0 }
                ]
            };
            monitors.value.push(newMon);
            activeMonitorId.value = newMon.id;
            newMonitorName.value = '';
            showNewMonitorModal.value = false;
            saveStateToServer();
        };

        const runMonitorNow = async () => {
            const mon = activeMonitor.value;
            if (!mon) return;
            isRunningMonitor.value = true;
            const startTime = Date.now();

            await new Promise(r => setTimeout(r, 650));
            const latency = Math.floor(Math.random() * 40) + 60;
            const run = {
                id: 'h_' + Date.now(),
                timestamp: new Date().toLocaleTimeString(),
                status: 'success',
                latencyMs: latency,
                passed: 4,
                failed: 0
            };
            mon.history.unshift(run);
            if (mon.history.length > 10) mon.history.pop();
            mon.lastRunTime = 'Just now';
            mon.lastStatus = 'success';
            mon.avgLatencyMs = Math.round((mon.avgLatencyMs + latency) / 2);
            isRunningMonitor.value = false;
            saveStateToServer();
        };

        // ----------------------------------------------------
        // 5. Workspace Management
        // ----------------------------------------------------
        const newWorkspaceName = ref('');
        const newWorkspaceType = ref('team');
        const newWorkspaceDesc = ref('');

        const createWorkspace = () => {
            if (!currentDemoUser.value || !currentDemoUser.value.isLoggedIn) {
                promptGuestRestriction('Guest users cannot create new workspaces. Please sign in or register.');
                return;
            }
            if (!newWorkspaceName.value.trim()) return;
            const newWs = {
                id: 'ws_' + Date.now(),
                name: newWorkspaceName.value.trim(),
                type: newWorkspaceType.value,
                description: newWorkspaceDesc.value.trim(),
                collections: []
            };
            workspaces.value.push(newWs);
            activeWorkspaceId.value = newWs.id;
            newWorkspaceName.value = '';
            newWorkspaceDesc.value = '';
            activeModal.value = null;
            saveStateToServer();
        };

        // Architecture View State
        const archSubTab = ref('architecture');
        const sqlCopied = ref(false);
        const copySqlSchema = () => {
            const sql = `-- Production PostgreSQL / MySQL Schema for CloudPost\nCREATE TABLE cp_users (\n    id VARCHAR(64) PRIMARY KEY,\n    email VARCHAR(255) NOT NULL UNIQUE,\n    name VARCHAR(150) NOT NULL,\n    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP\n);\n\nCREATE TABLE cp_workspaces (\n    id VARCHAR(64) PRIMARY KEY,\n    name VARCHAR(200) NOT NULL,\n    owner_id VARCHAR(64) NOT NULL,\n    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP\n);\n\nCREATE TABLE cp_collections (\n    id VARCHAR(64) PRIMARY KEY,\n    workspace_id VARCHAR(64) NOT NULL,\n    name VARCHAR(200) NOT NULL,\n    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP\n);\n\nCREATE TABLE cp_requests (\n    id VARCHAR(64) PRIMARY KEY,\n    collection_id VARCHAR(64) NOT NULL,\n    name VARCHAR(200) NOT NULL,\n    method VARCHAR(16) NOT NULL DEFAULT 'GET',\n    url TEXT NOT NULL,\n    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP\n);`;
            if (navigator.clipboard) {
                navigator.clipboard.writeText(sql);
                sqlCopied.value = true;
                setTimeout(() => { sqlCopied.value = false; }, 2000);
            }
        };

        const switchToDemoUser = () => {};

        const openDiagnosticTab = () => {
            let tab = tabs.value.find(t => t.type === 'diagnostic');
            if (!tab) {
                tab = { id: 'tab_diag_' + Date.now(), title: 'System Diagnostics', type: 'diagnostic' };
                tabs.value.push(tab);
            }
            activeTabId.value = tab.id;
        };

        const diagnosticScanning = ref(false);
        const dbConnected = ref(true);
        const dbTesting = ref(false);
        const dbTestResult = ref(null);
        const dbTestConfig = ref({
            host: 'localhost',
            name: 'u320472937_postman',
            user: 'u320472937_postman',
            pass: 'Micr0@112233'
        });

        const runDiagnosticScan = async () => {
            diagnosticScanning.value = true;
            try {
                const res = await fetch('diagnostic?format=json');
                if (res.ok) {
                    const data = await res.json();
                    if (data.dbConnected !== undefined) {
                        dbConnected.value = data.dbConnected;
                    }
                }
            } catch (e) {
                console.log('Diagnostic fetch error:', e);
            }
            diagnosticScanning.value = false;
        };

        const testDbConnection = async () => {
            dbTesting.value = true;
            dbTestResult.value = null;
            try {
                const formData = new FormData();
                formData.append('test_db', '1');
                formData.append('db_host', dbTestConfig.value.host);
                formData.append('db_name', dbTestConfig.value.name);
                formData.append('db_user', dbTestConfig.value.user);
                formData.append('db_pass', dbTestConfig.value.pass);

                const res = await fetch('diagnostic', {
                    method: 'POST',
                    body: formData
                });
                if (res.ok) {
                    dbTestResult.value = { success: true, message: 'Connection Verified to MySQL!' };
                    dbConnected.value = true;
                } else {
                    dbTestResult.value = { success: false, message: 'Connection Test Failed (HTTP ' + res.status + ')' };
                }
            } catch (e) {
                dbTestResult.value = { success: false, message: 'Network or configuration error: ' + (e.message || 'Check host') };
            }
            dbTesting.value = false;
        };

        const saasSearch = ref('');
        const saasPlanFilter = ref('all');
        const saasSortBy = ref('mrr');
        const saasCustomers = ref([
            {
                id: 'cust_1',
                name: 'Sarah Jenkins',
                email: 'sarah@fintech-scale.io',
                companyName: 'FinScale Global',
                role: 'Lead Architect',
                plan: 'enterprise',
                monthlyFee: 199.00,
                usage: { totalRequests: 8420000, monthlyQuota: 10000000 },
                costs: { totalCost: 26.94 },
                netMargin: 172.06,
                netMarginPercent: 86.5,
                healthScore: 98
            },
            {
                id: 'cust_2',
                name: 'Marcus Vance',
                email: 'marcus@devstream.tech',
                companyName: 'DevStream Cloud',
                role: 'VP Engineering',
                plan: 'enterprise',
                monthlyFee: 199.00,
                usage: { totalRequests: 9150000, monthlyQuota: 10000000 },
                costs: { totalCost: 29.28 },
                netMargin: 169.72,
                netMarginPercent: 85.3,
                healthScore: 95
            },
            {
                id: 'cust_3',
                name: 'Elena Rostova',
                email: 'elena@quantum-api.org',
                companyName: 'Quantum Logistics',
                role: 'Senior Backend Dev',
                plan: 'pro',
                monthlyFee: 29.00,
                usage: { totalRequests: 870000, monthlyQuota: 1000000 },
                costs: { totalCost: 2.78 },
                netMargin: 26.22,
                netMarginPercent: 90.4,
                healthScore: 92
            },
            {
                id: 'cust_4',
                name: 'David Chen',
                email: 'david@byteforge.dev',
                companyName: 'ByteForge AI',
                role: 'Founder & CTO',
                plan: 'pro',
                monthlyFee: 29.00,
                usage: { totalRequests: 640000, monthlyQuota: 1000000 },
                costs: { totalCost: 2.05 },
                netMargin: 26.95,
                netMarginPercent: 92.9,
                healthScore: 89
            },
            {
                id: 'cust_5',
                name: 'Amina Al-Sayed',
                email: 'amina@nexus-health.co',
                companyName: 'Nexus Health',
                role: 'Integration Specialist',
                plan: 'pro',
                monthlyFee: 29.00,
                usage: { totalRequests: 420000, monthlyQuota: 1000000 },
                costs: { totalCost: 1.34 },
                netMargin: 27.66,
                netMarginPercent: 95.4,
                healthScore: 91
            },
            {
                id: 'cust_6',
                name: 'Carlos Ruiz',
                email: 'carlos@openstack-hub.io',
                companyName: 'OpenStack Hub',
                role: 'DevOps Engineer',
                plan: 'free',
                monthlyFee: 0.00,
                usage: { totalRequests: 62000, monthlyQuota: 100000 },
                costs: { totalCost: 0.20 },
                netMargin: -0.20,
                netMarginPercent: 0,
                healthScore: 84
            }
        ]);

        const filteredSaaSCustomers = computed(() => {
            let list = saasCustomers.value.filter(c => {
                const matchesPlan = saasPlanFilter.value === 'all' || c.plan === saasPlanFilter.value;
                const q = saasSearch.value.toLowerCase().trim();
                const matchesQuery = !q || c.name.toLowerCase().includes(q) || c.companyName.toLowerCase().includes(q) || c.email.toLowerCase().includes(q);
                return matchesPlan && matchesQuery;
            });
            if (saasSortBy.value === 'mrr') {
                list.sort((a, b) => b.monthlyFee - a.monthlyFee);
            } else if (saasSortBy.value === 'requests') {
                list.sort((a, b) => b.usage.totalRequests - a.usage.totalRequests);
            } else if (saasSortBy.value === 'margin') {
                list.sort((a, b) => b.netMargin - a.netMargin);
            } else if (saasSortBy.value === 'health') {
                list.sort((a, b) => b.healthScore - a.healthScore);
            }
            return list;
        });

        const saasMetrics = computed(() => {
            const totalCustomers = saasCustomers.value.length;
            const totalMrr = saasCustomers.value.reduce((sum, c) => sum + c.monthlyFee, 0);
            const totalRequests = saasCustomers.value.reduce((sum, c) => sum + c.usage.totalRequests, 0);
            const totalCost = saasCustomers.value.reduce((sum, c) => sum + c.costs.totalCost, 0);
            const totalNet = totalMrr - totalCost;
            const grossMarginPercent = totalMrr > 0 ? ((totalNet / totalMrr) * 100).toFixed(1) : '94.2';
            const payingUsers = saasCustomers.value.filter(c => c.monthlyFee > 0);
            const arpu = payingUsers.length > 0 ? (totalMrr / payingUsers.length).toFixed(2) : '97.00';
            const ltv = payingUsers.length > 0 ? Math.round((totalMrr / payingUsers.length) * 24) : 2328;
            return {
                totalCustomers,
                totalMrr,
                totalRequests,
                totalCost,
                grossMarginPercent,
                arpu,
                ltv
            };
        });

        const financialLedger = ref([
            { period: '2026-08 (Current)', revenue: 485.00, infraCost: 62.59, netProfit: 422.41, margin: '87.1%', requests: '19.4M', active: 6 },
            { period: '2026-07', revenue: 427.00, infraCost: 55.10, netProfit: 371.90, margin: '87.1%', requests: '17.1M', active: 5 },
            { period: '2026-06', revenue: 398.00, infraCost: 51.34, netProfit: 346.66, margin: '87.1%', requests: '15.9M', active: 5 },
            { period: '2026-05', revenue: 340.00, infraCost: 43.86, netProfit: 296.14, margin: '87.1%', requests: '13.6M', active: 4 },
            { period: '2026-04', revenue: 228.00, infraCost: 29.41, netProfit: 198.59, margin: '87.1%', requests: '9.1M', active: 3 }
        ]);

        // SaaS 30-Day Heatmap & Unit Economics Engine (100% Parity with React SaaSReportsView)
        const heatmapViewMode = ref('matrix');
        const heatmapPlanFilter = ref('all');
        const heatmapSearchQuery = ref('');
        const hoveredHeatmapCell = ref(null);
        const reportRange = ref('30d');

        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

        const compute30DayHeatmap = (customersList) => {
            const baseDate = new Date(Date.UTC(2026, 7, 25));
            const dates = [];
            for (let i = 29; i >= 0; i--) {
                const d = new Date(baseDate.getTime() - i * 24 * 60 * 60 * 1000);
                const dayOfWeek = dayNames[d.getUTCDay()];
                const isWeekend = d.getUTCDay() === 0 || d.getUTCDay() === 6;
                const dateStr = d.getUTCFullYear() + '-' + String(d.getUTCMonth() + 1).padStart(2, '0') + '-' + String(d.getUTCDate()).padStart(2, '0');
                const dayLabel = monthNames[d.getUTCMonth()] + ' ' + d.getUTCDate();
                let weight = 1.1;
                if (dayOfWeek === 'Tue' || dayOfWeek === 'Wed' || dayOfWeek === 'Thu') weight = 1.35;
                else if (dayOfWeek === 'Mon') weight = 1.15;
                else if (dayOfWeek === 'Fri') weight = 0.95;
                else if (isWeekend) weight = 0.32;
                dates.push({ date: dateStr, dayLabel: dayLabel, dayOfWeek: dayOfWeek, isWeekend: isWeekend, weight: weight });
            }

            let grandTotalReqs = 0;
            let grandTotalCost = 0;
            const dailyTotals = dates.map(d => ({ date: d.date, dayLabel: d.dayLabel, dayOfWeek: d.dayOfWeek, requests: 0, cost: 0 }));

            const rows = (customersList || []).map(c => {
                let custTotal = 0;
                let peakDay = 0;
                let peakDate = '';
                const baseMultiplier = c.plan === 'enterprise' ? 180000 : (c.plan === 'pro' ? 35000 : 3500);
                const dailyActivity = dates.map((d, idx) => {
                    const seed = (c.id.charCodeAt(c.id.length - 1) * 37 + idx * 19) % 100 / 100;
                    const requests = Math.round(baseMultiplier * d.weight * (0.8 + seed * 0.4));
                    const dataMb = Number(((requests * 2.4) / 1024).toFixed(2));
                    const cost = Number((requests * 0.0000045 + (dataMb / 1024) * 0.08).toFixed(4));
                    let intensity = 0;
                    if (requests > 250000) intensity = 5;
                    else if (requests > 100000) intensity = 4;
                    else if (requests > 35000) intensity = 3;
                    else if (requests > 8000) intensity = 2;
                    else if (requests > 500) intensity = 1;

                    if (requests > peakDay) {
                        peakDay = requests;
                        peakDate = d.date;
                    }
                    custTotal += requests;
                    dailyTotals[idx].requests += requests;
                    dailyTotals[idx].cost += cost;

                    return {
                        date: d.date,
                        dayLabel: d.dayLabel,
                        dayOfWeek: d.dayOfWeek,
                        isWeekend: d.isWeekend,
                        requests: requests,
                        dataMb: dataMb,
                        cost: cost,
                        intensity: intensity
                    };
                });

                grandTotalReqs += custTotal;
                return {
                    customerId: c.id,
                    customerName: c.name,
                    companyName: c.companyName || 'Acme Tenant',
                    email: c.email,
                    plan: c.plan,
                    avatar: c.avatar || ('https://api.dicebear.com/7.x/bottts/svg?seed=' + encodeURIComponent(c.email)),
                    total30dRequests: custTotal,
                    peakDayRequests: peakDay,
                    peakDayDate: peakDate,
                    avgDailyRequests: Math.round(custTotal / 30),
                    dailyActivity: dailyActivity
                };
            });

            let peakDayTotal = 0;
            let peakDayObj = { date: '', dayLabel: '', totalRequests: 0 };
            dailyTotals.forEach(dt => {
                grandTotalCost += dt.cost;
                if (dt.requests > peakDayTotal) {
                    peakDayTotal = dt.requests;
                    peakDayObj = { date: dt.date, dayLabel: dt.dayLabel, totalRequests: dt.requests };
                }
            });

            return {
                daysHeader: dates,
                heatmapRows: rows,
                summary: {
                    total30dRequests: grandTotalReqs,
                    total30dCost: Number(grandTotalCost.toFixed(2)),
                    avgDailyRequests: Math.round(grandTotalReqs / 30),
                    peakDay: peakDayObj,
                    dailyTotals: dailyTotals
                }
            };
        };

        const heatmapComputedData = computed(() => compute30DayHeatmap(saasCustomers.value));
        const daysHeader = computed(() => heatmapComputedData.value.daysHeader);
        const heatmapRows = computed(() => heatmapComputedData.value.heatmapRows);
        const heatmapSummary = computed(() => heatmapComputedData.value.summary);

        const filteredHeatmapRows = computed(() => {
            return heatmapRows.value.filter(row => {
                const matchesPlan = heatmapPlanFilter.value === 'all' || row.plan === heatmapPlanFilter.value;
                const q = heatmapSearchQuery.value.toLowerCase().trim();
                const matchesSearch = !q || row.customerName.toLowerCase().includes(q) || row.companyName.toLowerCase().includes(q);
                return matchesPlan && matchesSearch;
            });
        });

        const getCellColorClass = (intensity, isWeekend, requests) => {
            if (!requests || requests === 0) {
                return isWeekend ? 'bg-zinc-900/60 border-zinc-800/40' : 'bg-zinc-900 border-zinc-800/60';
            }
            if (intensity === 5) return 'bg-emerald-400 border-emerald-300 text-zinc-950 font-bold';
            if (intensity === 4) return 'bg-emerald-500 border-emerald-400 text-zinc-950';
            if (intensity === 3) return 'bg-emerald-600 border-emerald-500 text-white';
            if (intensity === 2) return 'bg-emerald-700/80 border-emerald-600/70 text-zinc-200';
            return 'bg-emerald-900/50 border-emerald-800/50 text-zinc-400';
        };

        const exportHeatmapCsv = () => {
            if (filteredHeatmapRows.value.length === 0) return;
            const header = ['Customer', 'Company', 'Plan', 'Total 30D Requests', 'Avg Daily Requests', 'Peak Day Date', 'Peak Day Requests'];
            const rows = filteredHeatmapRows.value.map(r => [
                '"' + r.customerName + '"', '"' + r.companyName + '"', r.plan, r.total30dRequests, r.avgDailyRequests, r.peakDayDate, r.peakDayRequests
            ]);
            const csvContent = 'data:text/csv;charset=utf-8,' + [header.join(','), ...rows.map(e => e.join(','))].join('\n');
            const encodedUri = encodeURI(csvContent);
            const link = document.createElement('a');
            link.setAttribute('href', encodedUri);
            link.setAttribute('download', 'saas_heatmap_30d_' + heatmapPlanFilter.value + '.csv');
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        };

        const exportReportsJson = () => {
            const data = {
                generatedAt: new Date().toISOString(),
                metrics: saasMetrics.value,
                planDistributions: planDistributions.value,
                ledger: financialLedger.value,
                heatmapSummary: heatmapSummary.value
            };
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'saas_executive_report_' + Date.now() + '.json';
            a.click();
            URL.revokeObjectURL(url);
        };

        const printReport = () => {
            window.print();
        };

        const planDistributions = computed(() => {
            const plans = [
                { plan: 'enterprise', name: 'Enterprise Tier' },
                { plan: 'pro', name: 'Pro Tier' },
                { plan: 'free', name: 'Free Dev Tier' }
            ];
            return plans.map(p => {
                const list = saasCustomers.value.filter(c => c.plan === p.plan);
                const count = list.length;
                const mrr = list.reduce((sum, c) => sum + (parseFloat(c.monthlyFee) || 0), 0);
                const infra = list.reduce((sum, c) => sum + (parseFloat(c.costs && c.costs.totalCost) || 0), 0);
                const netMargin = mrr - infra;
                const marginPct = mrr > 0 ? Number(((netMargin / mrr) * 100).toFixed(1)) : 0;
                const totalReqs = list.reduce((sum, c) => sum + ((c.usage && c.usage.totalRequests) || 0), 0);
                const avgReqs = count > 0 ? Math.round(totalReqs / count) : 0;
                return {
                    plan: p.plan,
                    name: p.name,
                    userCount: count,
                    mrr: mrr,
                    infraCost: infra,
                    netMargin: netMargin,
                    marginPercent: marginPct,
                    avgRequestsPerUser: avgReqs
                };
            });
        });

        const registerForm = ref({
            plan: 'enterprise',
            name: '',
            email: '',
            company: '',
            password: ''
        });
        const registerSuccess = ref(false);
        const handleRegisterSubmit = () => {
            const newCust = {
                id: 'cust_' + Date.now(),
                name: registerForm.value.name,
                email: registerForm.value.email,
                companyName: registerForm.value.company || 'Enterprise Team',
                role: 'Admin',
                plan: registerForm.value.plan,
                monthlyFee: registerForm.value.plan === 'enterprise' ? 199.00 : (registerForm.value.plan === 'pro' ? 29.00 : 0.00),
                usage: { totalRequests: 0, monthlyQuota: registerForm.value.plan === 'enterprise' ? 10000000 : (registerForm.value.plan === 'pro' ? 1000000 : 100000) },
                costs: { totalCost: 0.00 },
                netMargin: registerForm.value.plan === 'enterprise' ? 199.00 : (registerForm.value.plan === 'pro' ? 29.00 : 0.00),
                netMarginPercent: 100,
                healthScore: 100
            };
            saasCustomers.value.unshift(newCust);
            currentDemoUser.value = {
                name: newCust.name,
                email: newCust.email,
                companyName: newCust.companyName,
                role: 'Admin',
                plan: newCust.plan
            };
            registerSuccess.value = true;
            setTimeout(() => {
                registerSuccess.value = false;
                openSaaSUsersTab();
            }, 1000);
        };

        const exportSaaSCsv = () => {
            let csv = 'ID,Name,Email,Company,Role,Plan,MRR,Requests,InfraCost,NetMargin,Health\n';
            saasCustomers.value.forEach(c => {
                csv += `"${c.id}","${c.name}","${c.email}","${c.companyName}","${c.role}","${c.plan}",${c.monthlyFee},${c.usage.totalRequests},${c.costs.totalCost},${c.netMargin},${c.healthScore}\n`;
            });
            const blob = new Blob([csv], { type: 'text/csv' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'cloudpost-saas-customers.csv';
            a.click();
            URL.revokeObjectURL(url);
        };

        const exportFinancialCsv = () => {
            let csv = 'Period,GrossRevenue,InfraCost,NetProfit,Margin,Requests,ActiveUsers\n';
            financialLedger.value.forEach(p => {
                csv += `"${p.period}",${p.revenue},${p.infraCost},${p.netProfit},"${p.margin}","${p.requests}",${p.active}\n`;
            });
            const blob = new Blob([csv], { type: 'text/csv' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'cloudpost-financial-ledger.csv';
            a.click();
            URL.revokeObjectURL(url);
        };

        // Sidebar filtering
        const filteredCollections = computed(() => {
            if (!sidebarSearch.value) return collections.value;
            const q = sidebarSearch.value.toLowerCase();
            return collections.value.filter(c => c.name.toLowerCase().includes(q));
        });
        const recentMethodFilter = ref('ALL');
        const filteredRecentRequests = computed(() => {
            let list = recentRequests.value || [];
            if (recentMethodFilter.value !== 'ALL') {
                if (recentMethodFilter.value === '2xx') {
                    list = list.filter(r => r.status >= 200 && r.status < 300);
                } else if (recentMethodFilter.value === 'ERR') {
                    list = list.filter(r => !r.status || r.status >= 400 || r.status === 0);
                } else {
                    list = list.filter(r => (r.method || '').toUpperCase() === recentMethodFilter.value);
                }
            }
            if (!sidebarSearch.value) return list;
            const q = sidebarSearch.value.toLowerCase().trim();
            return list.filter(r => ((r.name || '') + ' ' + (r.url || '')).toLowerCase().includes(q));
        });

        const removeRecentRequest = (id) => {
            recentRequests.value = recentRequests.value.filter(r => r.id !== id);
            saveStateToServer();
        };

        // Request execution - 100% Pure Client-Side JavaScript with Server Proxy Fallback
        const sendActiveRequest = async (forceProxy = false) => {
            if (!activeRequest.value) return;
            isLoading.value = true;
            const targetTab = tabs.value.find(t => t.id === activeTabId.value || (t.request && t.request.id === activeRequest.value.id));
            if (targetTab) {
                targetTab.isLoading = true;
            }
            try {
                const result = await executeHttpRequestJs(activeRequest.value, forceProxy);
                result.testResults = runPostmanAssertions(activeRequest.value.testsScript, result);
                activeResponse.value = result;
                if (targetTab) {
                    targetTab.isLoading = false;
                    targetTab.lastStatus = result.status;
                    targetTab.lastStatusText = result.statusText;
                }

                // 1. Auto-save modifications into matching collection so user changes are never lost
                if (activeRequest.value.collectionId) {
                    for (const col of collections.value) {
                        if (col.id === activeRequest.value.collectionId) {
                            if (col.requests) {
                                const idx = col.requests.findIndex(r => r.id === activeRequest.value.id);
                                if (idx !== -1) col.requests[idx] = JSON.parse(JSON.stringify(activeRequest.value));
                            }
                            if (col.folders) {
                                for (const fld of col.folders) {
                                    if (fld.requests) {
                                        const idx = fld.requests.findIndex(r => r.id === activeRequest.value.id);
                                        if (idx !== -1) fld.requests[idx] = JSON.parse(JSON.stringify(activeRequest.value));
                                    }
                                }
                            }
                        }
                    }
                }

                // 2. Track in Recent Requests with full request/response snapshots
                recentRequests.value.unshift({
                    id: 'rec_' + Date.now(),
                    name: activeRequest.value.name,
                    method: activeRequest.value.method,
                    url: result.url || resolveVariables(activeRequest.value.url),
                    status: result.status,
                    time: result.time,
                    executedAt: new Date().toISOString(),
                    requestSnapshot: JSON.parse(JSON.stringify(activeRequest.value)),
                    responseSnapshot: result
                });

                if (recentRequests.value.length > 50) {
                    recentRequests.value = recentRequests.value.slice(0, 50);
                }

                // 3. Save request and response details with central database and local cache
                await persistRequestAndResponseToPhp(activeRequest.value, result);
                saveStateToServer();
            } catch (err) {
                activeResponse.value = { status: 500, statusText: 'Execution Error', data: err.message, time: 0, size: 0, isError: true };
                if (targetTab) {
                    targetTab.isLoading = false;
                    targetTab.lastStatus = 500;
                    targetTab.lastStatusText = 'Execution Error';
                }
            } finally {
                isLoading.value = false;
                if (targetTab) {
                    targetTab.isLoading = false;
                }
            }
        };

        const dynamicGenerators = {
            '$guid': () => 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
                const r = Math.random() * 16 | 0;
                return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
            }),
            '$randomUUID': () => 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
                const r = Math.random() * 16 | 0;
                return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
            }),
            '$timestamp': () => Math.floor(Date.now() / 1000).toString(),
            '$isoTimestamp': () => new Date().toISOString(),
            '$randomInt': () => Math.floor(Math.random() * 1000).toString(),
            '$randomAlphaNumeric': () => Math.random().toString(36).substring(2, 10),
            '$randomEmail': () => 'user_' + Math.floor(Math.random() * 9999) + '@example.com',
            '$randomUserName': () => 'alex_' + Math.floor(Math.random() * 999),
            '$randomFirstName': () => ['Alex', 'Sarah', 'Marcus', 'Elena', 'David', 'Amina'][Math.floor(Math.random() * 6)],
            '$randomLastName': () => ['Rivera', 'Chen', 'Vance', 'Rostova', 'Jenkins', 'Al-Sayed'][Math.floor(Math.random() * 6)],
            '$randomPhoneNumber': () => '+1 (' + Math.floor(Math.random()*899+100) + ') 555-' + Math.floor(Math.random()*8999+1000),
            '$randomCity': () => ['San Francisco', 'New York', 'London', 'Berlin', 'Tokyo', 'Singapore'][Math.floor(Math.random() * 6)],
            '$randomCountry': () => ['United States', 'Germany', 'United Kingdom', 'Japan', 'Canada'][Math.floor(Math.random() * 5)],
            '$randomColor': () => '#' + Math.floor(Math.random()*16777215).toString(16).padStart(6, '0'),
            '$randomPrice': () => (Math.random() * 99 + 1).toFixed(2),
            '$randomBoolean': () => Math.random() > 0.5 ? 'true' : 'false',
            '$randomLoremSentence': () => 'Lorem ipsum dolor sit amet consectetur adipiscing elit.'
        };

        const resolveVariables = (str) => {
            if (!str) return '';
            let result = String(str);

            // 1. Dynamic Postman-style variables: {{$guid}}, {{$timestamp}}, etc.
            Object.keys(dynamicGenerators).forEach(dKey => {
                const token = '{{' + dKey + '}}';
                if (result.includes(token)) {
                    result = result.split(token).join(dynamicGenerators[dKey]());
                }
            });

            // 2. Global variables from env_global
            const globalEnv = environments.value.find(e => e.isGlobal || e.id === 'env_global');
            if (globalEnv && globalEnv.variables) {
                globalEnv.variables.filter(v => v.enabled !== false && v.key).forEach(v => {
                    result = result.split('{{' + v.key + '}}').join(v.value !== undefined ? v.value : '');
                });
            }

            // 3. Collection variables from active collection
            if (activeCollection.value && activeCollection.value.variables) {
                activeCollection.value.variables.filter(v => v.enabled !== false && v.key).forEach(v => {
                    result = result.split('{{' + v.key + '}}').join(v.value !== undefined ? v.value : '');
                });
            }

            // 4. Active environment variables (highest user-defined priority)
            if (activeEnv.value && activeEnv.value.variables) {
                activeEnv.value.variables.filter(v => v.enabled !== false && v.key).forEach(v => {
                    result = result.split('{{' + v.key + '}}').join(v.value !== undefined ? v.value : '');
                });
            }

            return result;
        };

        // Request Tab Title Syncing
        const syncRequestTabTitle = () => {
            if (!activeRequest.value) return;
            const tab = tabs.value.find(t => t.id === activeTabId.value);
            if (tab) {
                tab.title = activeRequest.value.name || 'Untitled Request';
            }
        };

        // Header & Parameter Badges
        const activeParamsCount = computed(() => {
            if (!activeRequest.value || !activeRequest.value.params) return 0;
            return activeRequest.value.params.filter(p => p.enabled && p.key && p.key.trim()).length;
        });

        const activeHeadersCount = computed(() => {
            if (!activeRequest.value || !activeRequest.value.headers) return 0;
            return activeRequest.value.headers.filter(h => h.enabled && h.key && h.key.trim()).length;
        });

        const hasBodyContent = computed(() => {
            if (!activeRequest.value || !activeRequest.value.body) return false;
            if (activeRequest.value.body.type === 'none') return false;
            if (activeRequest.value.body.type === 'json' || activeRequest.value.body.type === 'raw') {
                return Boolean(activeRequest.value.body.rawText && activeRequest.value.body.rawText.trim());
            }
            if (activeRequest.value.body.type === 'x-www-form-urlencoded') {
                return Boolean(activeRequest.value.body.urlEncoded && activeRequest.value.body.urlEncoded.some(item => item.enabled && item.key));
            }
            return false;
        });

        const detectedTokensInUrl = computed(() => {
            if (!activeRequest.value || !activeRequest.value.url) return [];
            const matches = activeRequest.value.url.match(/\{\{([^}]+)\}\}/g) || [];
            return [...new Set(matches.map(m => m.replace(/[{}]/g, '')))];
        });

        const resolvedUrl = computed(() => {
            if (!activeRequest.value) return '';
            return resolveVariables(activeRequest.value.url);
        });

        const missingVars = computed(() => {
            if (!detectedTokensInUrl.value.length || !activeEnv.value) return detectedTokensInUrl.value;
            const envKeys = (activeEnv.value.variables || []).map(v => v.key);
            return detectedTokensInUrl.value.filter(tok => !envKeys.includes(tok));
        });

        // Response State & Mode Controls
        const prettyViewMode = ref('code');
        const indentSize = ref(2);
        const responseSearchTerm = ref('');
        const treeExpandedNodes = ref({});
        const responseCopied = ref(false);

        const isResponseJson = computed(() => {
            if (!activeResponse.value || !activeResponse.value.data) return false;
            if (typeof activeResponse.value.data === 'object') return true;
            try {
                const parsed = JSON.parse(activeResponse.value.data);
                return typeof parsed === 'object' && parsed !== null;
            } catch (e) {
                return false;
            }
        });

        const parsedResponseData = computed(() => {
            if (!activeResponse.value || !activeResponse.value.data) return null;
            if (typeof activeResponse.value.data === 'object') return activeResponse.value.data;
            try {
                return JSON.parse(activeResponse.value.data);
            } catch (e) {
                return null;
            }
        });

        const prettyFormattedResponse = computed(() => {
            if (!activeResponse.value) return '';
            if (parsedResponseData.value) {
                try {
                    return JSON.stringify(parsedResponseData.value, null, indentSize.value);
                } catch (e) {
                    return String(activeResponse.value.data);
                }
            }
            return typeof activeResponse.value.data === 'string' ? activeResponse.value.data : JSON.stringify(activeResponse.value.data, null, indentSize.value);
        });

        const rawResponseBody = computed(() => {
            if (!activeResponse.value) return '';
            if (typeof activeResponse.value.data === 'string') return activeResponse.value.data;
            try {
                return JSON.stringify(activeResponse.value.data);
            } catch (e) {
                return String(activeResponse.value.data);
            }
        });

        const responsePassedTestsCount = computed(() => {
            if (!activeResponse.value || !activeResponse.value.testResults) return 0;
            return activeResponse.value.testResults.filter(t => t.passed).length;
        });

        const responseFailedTestsCount = computed(() => {
            if (!activeResponse.value || !activeResponse.value.testResults) return 0;
            return activeResponse.value.testResults.filter(t => !t.passed).length;
        });

        const toggleTreeNode = (path) => {
            treeExpandedNodes.value[path] = treeExpandedNodes.value[path] === false ? true : false;
        };

        const expandAllTreeNodes = () => {
            treeExpandedNodes.value = {};
        };

        const collapseAllTreeNodes = () => {
            if (!parsedResponseData.value) return;
            const newExpanded = {};
            const traverse = (obj, p = '$') => {
                newExpanded[p] = false;
                if (obj && typeof obj === 'object') {
                    const isArr = Array.isArray(obj);
                    Object.keys(obj).forEach(k => {
                        traverse(obj[k], isArr ? `${p}[${k}]` : `${p}.${k}`);
                    });
                }
            };
            traverse(parsedResponseData.value);
            treeExpandedNodes.value = newExpanded;
        };

        const copyJsonPath = (path) => {
            if (navigator.clipboard) {
                navigator.clipboard.writeText(path);
            }
        };

        const copyResponseBody = () => {
            const text = prettyViewMode.value === 'code' ? prettyFormattedResponse.value : rawResponseBody.value;
            if (navigator.clipboard && text) {
                navigator.clipboard.writeText(text);
                responseCopied.value = true;
                setTimeout(() => { responseCopied.value = false; }, 2000);
            }
        };

        const saveResponseToFile = () => {
            if (!activeResponse.value) return;
            const content = prettyFormattedResponse.value || rawResponseBody.value;
            const ext = isResponseJson.value ? 'json' : 'txt';
            const blob = new Blob([content], { type: isResponseJson.value ? 'application/json' : 'text/plain' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `response_${Date.now()}.${ext}`;
            a.click();
            URL.revokeObjectURL(url);
        };

        // D3 Visual Hierarchy Graph Rendering
        const graphLayout = ref('tree-horizontal');
        const selectedGraphNode = ref(null);
        let d3SvgZoom = null;

        const transformToD3Tree = (data, name = 'response', path = '$') => {
            if (data === null) return { name: `${name}: null`, path, type: 'null', children: [] };
            if (typeof data !== 'object') return { name: `${name}: ${String(data)}`, path, type: typeof data, children: [] };
            const isArr = Array.isArray(data);
            const keys = Object.keys(data);
            const children = keys.map(k => {
                const childPath = isArr ? `${path}[${k}]` : `${path}.${k}`;
                return transformToD3Tree(data[k], isArr ? `[${k}]` : k, childPath);
            });
            return {
                name: isArr ? `${name} [${keys.length}]` : `${name} {${keys.length}}`,
                path,
                type: isArr ? 'array' : 'object',
                children
            };
        };

        const renderD3Graph = () => {
            if (!window.d3 || !isResponseJson.value) return;
            const svgEl = document.getElementById('d3-graph-svg');
            if (!svgEl) return;

            const d3 = window.d3;
            d3.select(svgEl).selectAll('*').remove();

            const width = svgEl.clientWidth || 600;
            const height = svgEl.clientHeight || 400;

            const data = parsedResponseData.value;
            if (!data) return;

            const rootData = transformToD3Tree(data, activeRequest.value ? activeRequest.value.name : 'Response');
            const root = d3.hierarchy(rootData);

            const g = d3.select(svgEl).append('g').attr('class', 'main-group');

            d3SvgZoom = d3.zoom().scaleExtent([0.1, 4]).on('zoom', (event) => {
                g.attr('transform', event.transform);
            });
            d3.select(svgEl).call(d3SvgZoom);

            if (graphLayout.value === 'radial') {
                const radius = Math.min(width, height) / 2 - 40;
                const treeLayout = d3.tree().size([2 * Math.PI, Math.max(radius, 80)]).separation((a, b) => (a.parent == b.parent ? 1 : 2) / a.depth);
                treeLayout(root);

                g.selectAll('.link')
                    .data(root.links())
                    .join('path')
                    .attr('class', 'link')
                    .attr('fill', 'none')
                    .attr('stroke', '#3f3f46')
                    .attr('stroke-width', 1.5)
                    .attr('d', d3.linkRadial().angle(d => d.x).radius(d => d.y));

                const node = g.selectAll('.node')
                    .data(root.descendants())
                    .join('g')
                    .attr('class', 'node')
                    .attr('transform', d => `rotate(${d.x * 180 / Math.PI - 90}) translate(${d.y},0)`)
                    .on('click', (event, d) => {
                        selectedGraphNode.value = {
                            name: d.data.name,
                            depth: d.depth,
                            type: d.data.type || 'node',
                            path: d.data.path || '$'
                        };
                    });

                node.append('circle')
                    .attr('r', d => d.children ? 5 : 3.5)
                    .attr('fill', d => d.children ? '#f97316' : '#10b981')
                    .attr('stroke', '#18181b')
                    .attr('stroke-width', 1.5);

                node.append('text')
                    .attr('dy', '0.31em')
                    .attr('x', d => d.x < Math.PI === !d.children ? 8 : -8)
                    .attr('text-anchor', d => d.x < Math.PI === !d.children ? 'start' : 'end')
                    .attr('transform', d => d.x >= Math.PI ? 'rotate(180)' : null)
                    .text(d => d.data.name.length > 25 ? d.data.name.substring(0, 22) + '...' : d.data.name)
                    .attr('fill', '#d4d4d8')
                    .attr('font-size', '10px')
                    .attr('font-family', 'ui-monospace, monospace');

                d3.select(svgEl).call(d3SvgZoom.transform, d3.zoomIdentity.translate(width / 2, height / 2).scale(0.85));

            } else if (graphLayout.value === 'tree-vertical') {
                const treeLayout = d3.tree().nodeSize([120, 80]);
                treeLayout(root);

                g.selectAll('.link')
                    .data(root.links())
                    .join('path')
                    .attr('class', 'link')
                    .attr('fill', 'none')
                    .attr('stroke', '#3f3f46')
                    .attr('stroke-width', 1.5)
                    .attr('d', d3.linkVertical().x(d => d.x).y(d => d.y));

                const node = g.selectAll('.node')
                    .data(root.descendants())
                    .join('g')
                    .attr('class', 'node')
                    .attr('transform', d => `translate(${d.x},${d.y})`)
                    .on('click', (event, d) => {
                        selectedGraphNode.value = {
                            name: d.data.name,
                            depth: d.depth,
                            type: d.data.type || 'node',
                            path: d.data.path || '$'
                        };
                    });

                node.append('circle')
                    .attr('r', d => d.children ? 6 : 4)
                    .attr('fill', d => d.children ? '#f97316' : '#10b981')
                    .attr('stroke', '#18181b')
                    .attr('stroke-width', 1.5);

                node.append('text')
                    .attr('dy', '1.4em')
                    .attr('text-anchor', 'middle')
                    .text(d => d.data.name.length > 20 ? d.data.name.substring(0, 18) + '...' : d.data.name)
                    .attr('fill', '#d4d4d8')
                    .attr('font-size', '10px')
                    .attr('font-family', 'ui-monospace, monospace');

                d3.select(svgEl).call(d3SvgZoom.transform, d3.zoomIdentity.translate(width / 2, 40).scale(0.85));

            } else {
                const treeLayout = d3.tree().nodeSize([32, 160]);
                treeLayout(root);

                g.selectAll('.link')
                    .data(root.links())
                    .join('path')
                    .attr('class', 'link')
                    .attr('fill', 'none')
                    .attr('stroke', '#3f3f46')
                    .attr('stroke-width', 1.5)
                    .attr('d', d3.linkHorizontal().x(d => d.y).y(d => d.x));

                const node = g.selectAll('.node')
                    .data(root.descendants())
                    .join('g')
                    .attr('class', 'node')
                    .attr('transform', d => `translate(${d.y},${d.x})`)
                    .on('click', (event, d) => {
                        selectedGraphNode.value = {
                            name: d.data.name,
                            depth: d.depth,
                            type: d.data.type || 'node',
                            path: d.data.path || '$'
                        };
                    });

                node.append('circle')
                    .attr('r', d => d.children ? 5 : 3.5)
                    .attr('fill', d => d.children ? '#f97316' : '#10b981')
                    .attr('stroke', '#18181b')
                    .attr('stroke-width', 1.5);

                node.append('text')
                    .attr('dy', '0.31em')
                    .attr('x', d => d.children ? -8 : 8)
                    .attr('text-anchor', d => d.children ? 'end' : 'start')
                    .text(d => d.data.name.length > 24 ? d.data.name.substring(0, 22) + '...' : d.data.name)
                    .attr('fill', '#d4d4d8')
                    .attr('font-size', '10px')
                    .attr('font-family', 'ui-monospace, monospace');

                d3.select(svgEl).call(d3SvgZoom.transform, d3.zoomIdentity.translate(80, height / 2).scale(0.85));
            }
        };

        const zoomGraphIn = () => {
            if (!d3SvgZoom || !window.d3) return;
            window.d3.select('#d3-graph-svg').transition().duration(250).call(d3SvgZoom.scaleBy, 1.3);
        };

        const zoomGraphOut = () => {
            if (!d3SvgZoom || !window.d3) return;
            window.d3.select('#d3-graph-svg').transition().duration(250).call(d3SvgZoom.scaleBy, 0.7);
        };

        const resetGraphZoom = () => {
            renderD3Graph();
        };

        const setResponseSubTab = (tab) => {
            responseSubTab.value = tab;
            if (tab === 'graph') {
                nextTick(() => {
                    renderD3Graph();
                });
            }
        };

        // Multi-Language Code Snippet Generator
        const exportCodeLang = ref('curl');
        const codeCopied = ref(false);
        const shareLinkCopied = ref(false);
        const shareCurlCopied = ref(false);
        const quickVarKey = ref('');
        const quickVarValue = ref('');

        const generateCodeSnippetByLang = (lang, req, env) => {
            if (!req) return '';

            // Helper to interpolate variables (Global -> Collection -> Environment)
            const interpolate = (str) => {
                if (!str) return '';
                let result = str;
                // Interpolate from globalEnv
                if (typeof globalEnv !== 'undefined' && globalEnv && globalEnv.variables) {
                    globalEnv.variables.filter(v => v.enabled !== false && v.key).forEach(v => {
                        result = result.split('{{' + v.key + '}}').join(v.value !== undefined ? v.value : '');
                    });
                }
                // Interpolate from activeCollection
                const col = typeof activeCollection !== 'undefined' && activeCollection && activeCollection.value ? activeCollection.value : null;
                if (col && col.variables) {
                    col.variables.filter(v => v.enabled !== false && v.key).forEach(v => {
                        result = result.split('{{' + v.key + '}}').join(v.value !== undefined ? v.value : '');
                    });
                }
                // Interpolate from env
                if (env && env.variables) {
                    env.variables.filter(v => v.enabled !== false && v.key).forEach(v => {
                        result = result.split('{{' + v.key + '}}').join(v.value !== undefined ? v.value : '');
                    });
                }
                return result;
            };

            const url = interpolate(req.url || '');

            // Build full URL with query parameters
            let fullUrl = url;
            const enabledParams = (req.params || []).filter(p => p.enabled && p.key && p.key.trim());
            if (enabledParams.length > 0) {
                const queryStr = enabledParams.map(p => {
                    const k = encodeURIComponent(interpolate(p.key));
                    const v = encodeURIComponent(interpolate(p.value || ''));
                    return `${k}=${v}`;
                }).join('&');
                if (queryStr) {
                    fullUrl += (fullUrl.includes('?') ? '&' : '?') + queryStr;
                }
            }

            const headers = {};
            if (req.headers) {
                req.headers.forEach(h => {
                    if (h.enabled && h.key && h.key.trim()) {
                        headers[interpolate(h.key)] = interpolate(h.value || '');
                    }
                });
            }

            // Auth resolution
            if (req.auth) {
                if (req.auth.type === 'bearer' && req.auth.bearerToken) {
                    headers['Authorization'] = `Bearer ${interpolate(req.auth.bearerToken)}`;
                } else if (req.auth.type === 'oauth2') {
                    const rawTok = req.auth.oauth2Token || req.auth.bearerToken || '';
                    if (rawTok) {
                        const prefix = req.auth.oauth2HeaderPrefix || 'Bearer';
                        headers['Authorization'] = `${prefix} ${interpolate(rawTok)}`;
                    }
                } else if (req.auth.type === 'basic' && req.auth.basicUsername) {
                    const u = interpolate(req.auth.basicUsername);
                    const p = interpolate(req.auth.basicPassword || '');
                    headers['Authorization'] = `Basic ${btoa(`${u}:${p}`)}`;
                } else if (req.auth.type === 'apiKey' && req.auth.apiKeyAddTo === 'header' && req.auth.apiKeyName) {
                    headers[interpolate(req.auth.apiKeyName)] = interpolate(req.auth.apiKeyValue || '');
                } else if (req.auth.type === 'apiKey' && req.auth.apiKeyAddTo === 'query' && req.auth.apiKeyName) {
                    const k = encodeURIComponent(interpolate(req.auth.apiKeyName));
                    const v = encodeURIComponent(interpolate(req.auth.apiKeyValue || ''));
                    fullUrl += (fullUrl.includes('?') ? '&' : '?') + `${k}=${v}`;
                }
            }

            const method = (req.method || 'GET').toUpperCase();

            // Body resolution
            let hasBody = false;
            let bodyRaw = '';
            let bodyJsonObj = null;
            let bodyType = 'none';

            if (method !== 'GET' && method !== 'HEAD' && req.body && req.body.type !== 'none') {
                bodyType = req.body.type || 'none';
                if (bodyType === 'json' && req.body.rawText) {
                    bodyRaw = interpolate(req.body.rawText);
                    hasBody = true;
                    try {
                        bodyJsonObj = JSON.parse(bodyRaw);
                    } catch (e) {
                        bodyJsonObj = null;
                    }
                    if (!headers['Content-Type'] && !headers['content-type']) {
                        headers['Content-Type'] = 'application/json';
                    }
                } else if (req.body.rawText) {
                    bodyRaw = interpolate(req.body.rawText);
                    hasBody = true;
                }
            }

            switch (lang) {
                // Command Line / Shell
                case 'curl': {
                    let cmd = `curl --location --request ${method} '${fullUrl}'`;
                    Object.entries(headers).forEach(([k, v]) => {
                        cmd += ` \\\n  --header '${k}: ${v.replace(/'/g, "'\\''")}'`;
                    });
                    if (hasBody) {
                        cmd += ` \\\n  --data-raw '${bodyRaw.replace(/'/g, "'\\''")}'`;
                    }
                    return cmd;
                }
                case 'shell-httpie': {
                    const headerArgs = Object.entries(headers).map(([k, v]) => `'${k}:${v}'`).join(' \\\n  ');
                    let dataArg = '';
                    if (hasBody) {
                        if (bodyJsonObj) {
                            dataArg = ` \\\n  --json '${JSON.stringify(bodyJsonObj).replace(/'/g, "'\\''")}'`;
                        } else {
                            dataArg = ` \\\n  --raw '${bodyRaw.replace(/'/g, "'\\''")}'`;
                        }
                    }
                    return `http ${method} '${fullUrl}'${headerArgs ? ' \\\n  ' + headerArgs : ''}${dataArg}`;
                }
                case 'shell-wget': {
                    const headerArgs = Object.entries(headers).map(([k, v]) => `--header="${k}: ${v.replace(/"/g, '\\"')}"`).join(' \\\n  ');
                    let bodyArg = '';
                    if (hasBody) {
                        bodyArg = ` \\\n  --post-data='${bodyRaw.replace(/'/g, "'\\''")}'`;
                    }
                    return `wget --method=${method} \\\n  ${headerArgs ? headerArgs + ' \\\n  ' : ''}--output-document=- \\\n  '${fullUrl}'${bodyArg}`;
                }

                // JavaScript Browser
                case 'js-fetch': {
                    const headerStatements = Object.entries(headers).map(([k, v]) => `myHeaders.append("${k}", "${v.replace(/"/g, '\\"')}");`).join('\n');
                    const headersBlock = headerStatements ? `const myHeaders = new Headers();\n${headerStatements}\n\n` : '';
                    let bodyBlock = '';
                    if (hasBody) {
                        bodyBlock = `,\n  body: ${bodyJsonObj ? `JSON.stringify(${JSON.stringify(bodyJsonObj, null, 2).replace(/\n/g, '\n  ')})` : JSON.stringify(bodyRaw)}`;
                    }
                    return `${headersBlock}const requestOptions = {
  method: "${method}",
  headers: ${headerStatements ? 'myHeaders' : '{}'}${bodyBlock},
  redirect: "follow"
};

fetch("${fullUrl}", requestOptions)
  .then((response) => response.text())
  .then((result) => console.log(result))
  .catch((error) => console.error("Error:", error));`;
                }
                case 'js-axios': {
                    let dataDecl = '';
                    let dataProp = '';
                    if (hasBody) {
                        dataDecl = `const data = ${bodyJsonObj ? JSON.stringify(bodyJsonObj, null, 2) : JSON.stringify(bodyRaw)};\n\n`;
                        dataProp = `\n  data: data,`;
                    }
                    return `${dataDecl}const config = {
  method: '${method.toLowerCase()}',
  maxBodyLength: Infinity,
  url: '${fullUrl}',
  headers: ${JSON.stringify(headers, null, 2).replace(/\n/g, '\n  ')},${dataProp}
};

axios.request(config)
  .then((response) => {
    console.log(JSON.stringify(response.data));
  })
  .catch((error) => {
    console.error("Error:", error);
  });`;
                }
                case 'js-jquery': {
                    let bodySettings = '';
                    if (hasBody) {
                        bodySettings = `,\n  "data": ${JSON.stringify(bodyRaw)}`;
                    }
                    return `const settings = {
  "url": "${fullUrl}",
  "method": "${method}",
  "timeout": 0,
  "headers": ${JSON.stringify(headers, null, 2).replace(/\n/g, '\n  ')}${bodySettings}
};

$.ajax(settings).done(function (response) {
  console.log(response);
}).fail(function (jqXHR, textStatus, errorThrown) {
  console.error(textStatus, errorThrown);
});`;
                }
                case 'js-xhr': {
                    const headerStatements = Object.entries(headers)
                        .map(([k, v]) => `xhr.setRequestHeader("${k}", "${v.replace(/"/g, '\\"')}");`)
                        .join('\n');
                    const sendParam = hasBody ? JSON.stringify(bodyRaw) : 'null';
                    return `const xhr = new XMLHttpRequest();
xhr.withCredentials = true;

xhr.addEventListener("readystatechange", function () {
  if (this.readyState === 4) {
    console.log(this.responseText);
  }
});

xhr.open("${method}", "${fullUrl}");
${headerStatements}

xhr.send(${sendParam});`;
                }

                // Node.js
                case 'node-axios': {
                    let dataDecl = 'let data = "";';
                    if (hasBody) {
                        dataDecl = `let data = JSON.stringify(${bodyJsonObj ? JSON.stringify(bodyJsonObj) : JSON.stringify(bodyRaw)});`;
                    }
                    return `const axios = require('axios');
${dataDecl}

const config = {
  method: '${method.toLowerCase()}',
  maxBodyLength: Infinity,
  url: '${fullUrl}',
  headers: ${JSON.stringify(headers, null, 2).replace(/\n/g, '\n  ')},
  data: data
};

axios.request(config)
  .then((response) => {
    console.log(JSON.stringify(response.data));
  })
  .catch((error) => {
    console.error(error);
  });`;
                }
                case 'node-native': {
                    const isHttps = fullUrl.startsWith('https');
                    const mod = isHttps ? 'https' : 'http';
                    let pathAndQuery = '/';
                    let host = 'localhost';
                    let port = isHttps ? 443 : 80;
                    try {
                        const parsed = new URL(fullUrl.startsWith('http') ? fullUrl : `http://${fullUrl}`);
                        host = parsed.hostname;
                        pathAndQuery = parsed.pathname + parsed.search;
                        port = parsed.port ? parseInt(parsed.port) : (isHttps ? 443 : 80);
                    } catch (e) {}
                    const postDataBlock = hasBody ? `const postData = JSON.stringify(${bodyJsonObj ? JSON.stringify(bodyJsonObj) : JSON.stringify(bodyRaw)});\n` : '';
                    const finalHeaders = { ...headers };
                    if (hasBody) {
                        finalHeaders['Content-Length'] = 'Buffer.byteLength(postData)';
                    }
                    return `const ${mod} = require('follow-redirects').${mod};
const fs = require('fs');

${postDataBlock}const options = {
  'method': '${method}',
  'hostname': '${host}',
  'port': ${port},
  'path': '${pathAndQuery}',
  'headers': ${JSON.stringify(finalHeaders, null, 4).replace(/"Buffer\.byteLength\(postData\)"/g, 'Buffer.byteLength(postData)')},
  'maxRedirects': 20
};

const req = ${mod}.request(options, function (res) {
  const chunks = [];

  res.on("data", function (chunk) {
    chunks.push(chunk);
  });

  res.on("end", function () {
    const body = Buffer.concat(chunks);
    console.log(body.toString());
  });

  res.on("error", function (error) {
    console.error(error);
  });
});

${hasBody ? 'req.write(postData);\n' : ''}req.end();`;
                }

                // Python
                case 'python-requests': {
                    let payloadBlock = 'payload = {}';
                    if (hasBody) {
                        payloadBlock = `payload = json.dumps(${bodyJsonObj ? JSON.stringify(bodyJsonObj, null, 4) : JSON.stringify(bodyRaw)})`;
                    }
                    return `import requests
import json

url = "${fullUrl}"

${payloadBlock}
headers = ${JSON.stringify(headers, null, 4)}

response = requests.request("${method}", url, headers=headers, data=payload)

print(f"Status: {response.status_code}")
print(response.text)`;
                }
                case 'python-httpclient': {
                    const isHttps = fullUrl.startsWith('https');
                    let host = 'localhost';
                    let path = '/';
                    try {
                        const parsed = new URL(fullUrl.startsWith('http') ? fullUrl : `http://${fullUrl}`);
                        host = parsed.host;
                        path = parsed.pathname + parsed.search;
                    } catch (e) {}
                    const payload = hasBody ? JSON.stringify(bodyRaw) : "''";
                    return `import http.client
import json

conn = http.client.${isHttps ? 'HTTPSConnection' : 'HTTPConnection'}("${host}")
payload = ${payload}
headers = ${JSON.stringify(headers, null, 4)}

conn.request("${method}", "${path}", payload, headers)
res = conn.getresponse()
data = res.read()

print(f"Status: {res.status} {res.reason}")
print(data.decode("utf-8"))`;
                }

                // PHP
                case 'php-curl': {
                    const headerArray = Object.entries(headers).map(([k, v]) => `  '${k}: ${v.replace(/'/g, "\\'")}'`);
                    let postFields = '';
                    if (hasBody) {
                        postFields = `\n  CURLOPT_POSTFIELDS => ${JSON.stringify(bodyRaw)},`;
                    }
                    return '<' + '?php\n' + `

$curl = curl_init();

curl_setopt_array($curl, array(
  CURLOPT_URL => '${fullUrl}',
  CURLOPT_RETURNTRANSFER => true,
  CURLOPT_ENCODING => '',
  CURLOPT_MAXREDIRS => 10,
  CURLOPT_TIMEOUT => 0,
  CURLOPT_FOLLOWLOCATION => true,
  CURLOPT_HTTP_VERSION => CURL_HTTP_VERSION_1_1,
  CURLOPT_CUSTOMREQUEST => '${method}',${postFields}
  CURLOPT_HTTPHEADER => array(
${headerArray.join(',\n')}
  ),
));

$response = curl_exec($curl);
$err = curl_error($curl);

curl_close($curl);

if ($err) {
  echo "cURL Error #:" . $err;
} else {
  echo $response;
}
`;
                }
                case 'php-guzzle': {
                    const headerArray = Object.entries(headers).map(([k, v]) => `    '${k}' => '${v.replace(/'/g, "\\'")}'`);
                    return '<' + '?php\n' + `
require_once 'vendor/autoload.php';

use GuzzleHttp\\Client;
use GuzzleHttp\\Psr7\\Request;

$client = new Client();
$headers = [
${headerArray.join(',\n')}
];
${hasBody ? `$body = ${JSON.stringify(bodyRaw)};\n` : ''}$request = new Request('${method}', '${fullUrl}', $headers${hasBody ? ', $body' : ''});
$res = $client->sendAsync($request)->wait();
echo $res->getBody();
`;
                }

                // Go
                case 'go-native': {
                    let bodyReader = 'nil';
                    let payloadDef = '';
                    if (hasBody) {
                        payloadDef = `  payload := strings.NewReader(${JSON.stringify(bodyRaw)})\n`;
                        bodyReader = 'payload';
                    }
                    const headerStatements = Object.entries(headers)
                        .map(([k, v]) => `  req.Header.Add("${k}", "${v.replace(/"/g, '\\"')}")`)
                        .join('\n');
                    return `package main

import (
  "fmt"
  "strings"
  "net/http"
  "io"
)

func main() {
  url := "${fullUrl}"
  method := "${method}"

${payloadDef}  client := &http.Client{}
  req, err := http.NewRequest(method, url, ${bodyReader})
  if err != nil {
    fmt.Println(err)
    return
  }
${headerStatements}

  res, err := client.Do(req)
  if err != nil {
    fmt.Println(err)
    return
  }
  defer res.Body.Close()

  body, err := io.ReadAll(res.Body)
  if err != nil {
    fmt.Println(err)
    return
  }
  fmt.Println(string(body))
}`;
                }

                // Java
                case 'java-okhttp': {
                    let mediaType = 'MediaType.parse("text/plain")';
                    const contentType = headers['Content-Type'] || headers['content-type'] || '';
                    if (contentType.includes('json')) {
                        mediaType = 'MediaType.parse("application/json")';
                    }
                    let bodyDef = '';
                    if (hasBody) {
                        bodyDef = `    MediaType mediaType = ${mediaType};\n    RequestBody body = RequestBody.create(mediaType, ${JSON.stringify(bodyRaw)});\n`;
                    } else if (['POST', 'PUT', 'PATCH'].includes(method)) {
                        bodyDef = `    RequestBody body = RequestBody.create(null, new byte[0]);\n`;
                    }
                    const headerAdders = Object.entries(headers)
                        .map(([k, v]) => `      .addHeader("${k}", "${v.replace(/"/g, '\\"')}")`)
                        .join('\n');
                    return `import okhttp3.*;
import java.io.IOException;

public class Main {
  public static void main(String[] args) throws IOException {
    OkHttpClient client = new OkHttpClient().newBuilder().build();
${bodyDef}    Request request = new Request.Builder()
      .url("${fullUrl}")
      .method("${method}", ${hasBody || ['POST', 'PUT', 'PATCH'].includes(method) ? 'body' : 'null'})
${headerAdders}
      .build();

    Response response = client.newCall(request).execute();
    System.out.println(response.body().string());
  }
}`;
                }

                // C# / .NET
                case 'csharp-httpclient': {
                    const headerAdders = Object.entries(headers)
                        .filter(([k]) => k.toLowerCase() !== 'content-type')
                        .map(([k, v]) => `request.Headers.Add("${k}", "${v.replace(/"/g, '\\"')}");`)
                        .join('\n');
                    let contentBlock = '';
                    if (hasBody) {
                        const contentType = headers['Content-Type'] || headers['content-type'] || 'text/plain';
                        contentBlock = `var content = new StringContent(${JSON.stringify(bodyRaw)}, null, "${contentType}");\nrequest.Content = content;\n`;
                    }
                    const cleanMethod = method === 'DELETE' ? 'Delete' : method === 'PUT' ? 'Put' : method === 'POST' ? 'Post' : method === 'PATCH' ? 'Patch' : 'Get';
                    return `using System;
using System.Net.Http;
using System.Threading.Tasks;

class Program
{
  static async Task Main(string[] args)
  {
    var client = new HttpClient();
    var request = new HttpRequestMessage(HttpMethod.${cleanMethod}, "${fullUrl}");
${headerAdders ? '    ' + headerAdders + '\n' : ''}${contentBlock ? '    ' + contentBlock.replace(/\n/g, '\n    ') : ''}    var response = await client.SendAsync(request);
    response.EnsureSuccessStatusCode();
    Console.WriteLine(await response.Content.ReadAsStringAsync());
  }
}`;
                }
                case 'csharp-restsharp': {
                    const headerAdders = Object.entries(headers)
                        .map(([k, v]) => `request.AddHeader("${k}", "${v.replace(/"/g, '\\"')}");`)
                        .join('\n');
                    let bodyBlock = '';
                    if (hasBody) {
                        bodyBlock = `request.AddStringBody(${JSON.stringify(bodyRaw)}, DataFormat.Json);\n`;
                    }
                    return `using RestSharp;
using System;

var options = new RestClientOptions("${fullUrl}")
{
  MaxTimeout = -1,
};
var client = new RestClient(options);
var request = new RestRequest("", Method.${method});
${headerAdders}
${bodyBlock}RestResponse response = await client.ExecuteAsync(request);
Console.WriteLine(response.Content);`;
                }

                // Ruby
                case 'ruby-nethttp': {
                    const headerSetters = Object.entries(headers)
                        .map(([k, v]) => `request["${k}"] = "${v.replace(/"/g, '\\"')}"`)
                        .join('\n');
                    let bodySetter = '';
                    if (hasBody) {
                        bodySetter = `request.body = ${JSON.stringify(bodyRaw)}\n`;
                    }
                    const reqClass = method === 'POST' ? 'Post' : method === 'PUT' ? 'Put' : method === 'DELETE' ? 'Delete' : method === 'PATCH' ? 'Patch' : 'Get';
                    return `require "uri"
require "json"
require "net/http"

url = URI("${fullUrl}")

https = Net::HTTP.new(url.host, url.port)
https.use_ssl = true if url.scheme == "https"

request = Net::HTTP::${reqClass}.new(url)
${headerSetters}
${bodySetter}
response = https.request(request)
puts response.read_body`;
                }

                // Rust
                case 'rust-reqwest': {
                    const headerChains = Object.entries(headers)
                        .map(([k, v]) => `        .header("${k}", "${v.replace(/"/g, '\\"')}")`)
                        .join('\n');
                    let bodyChain = '';
                    if (hasBody) {
                        bodyChain = `\n        .body(${JSON.stringify(bodyRaw)})`;
                    }
                    return `#[tokio::main]
async fn main() -> Result<(), Box<dyn std.error::Error>> {
    let client = reqwest::Client::builder()
        .build()?;

    let res = client
        .${method.toLowerCase()}("${fullUrl}")
${headerChains}${bodyChain}
        .send()
        .await?;

    println!("Status: {}", res.status());
    let body = res.text().await?;
    println!("Body: {}", body);

    Ok(())
}`;
                }

                // Swift
                case 'swift-urlsession': {
                    const headerSetters = Object.entries(headers)
                        .map(([k, v]) => `request.addValue("${v.replace(/"/g, '\\"')}", forHTTPHeaderField: "${k}")`)
                        .join('\n');
                    let bodySetter = '';
                    if (hasBody) {
                        bodySetter = `let postData = ${JSON.stringify(bodyRaw)}.data(using: .utf8)\nrequest.httpBody = postData\n`;
                    }
                    return `import Foundation
#if canImport(FoundationNetworking)
import FoundationNetworking
#endif

var semaphore = DispatchSemaphore(value: 0)

var request = URLRequest(url: URL(string: "${fullUrl}")!, timeoutInterval: Double.infinity)
${headerSetters}
request.httpMethod = "${method}"
${bodySetter}
let task = URLSession.shared.dataTask(with: request) { data, response, error in 
  guard let data = data else {
    print(String(describing: error))
    semaphore.signal()
    return
  }
  print(String(data: data, encoding: .utf8)!)
  semaphore.signal()
}

task.resume()
semaphore.wait()`;
                }

                // Dart / Flutter
                case 'dart-http': {
                    const headersObj = Object.entries(headers)
                        .map(([k, v]) => `    '${k}': '${v.replace(/'/g, "\\'")}',`)
                        .join('\n');
                    let bodySetter = '';
                    if (hasBody) {
                        bodySetter = `  request.body = ${JSON.stringify(bodyRaw)};\n`;
                    }
                    return `import 'package:http/http.dart' as http;

void main() async {
  var headers = {
${headersObj}
  };
  var request = http.Request('${method}', Uri.parse('${fullUrl}'));
${bodySetter}  request.headers.addAll(headers);

  http.StreamedResponse response = await request.send();

  if (response.statusCode == 200) {
    print(await response.stream.bytesToString());
  } else {
    print(response.reasonPhrase);
  }
}`;
                }

                // Kotlin
                case 'kotlin-okhttp': {
                    const headerAdders = Object.entries(headers)
                        .map(([k, v]) => `  .addHeader("${k}", "${v.replace(/"/g, '\\"')}")`)
                        .join('\n');
                    let bodyDef = '';
                    if (hasBody) {
                        bodyDef = `val mediaType = "application/json; charset=utf-8".toMediaType()\nval body = ${JSON.stringify(bodyRaw)}.toRequestBody(mediaType)\n`;
                    }
                    return `import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody

fun main() {
  val client = OkHttpClient()
  ${bodyDef}val request = Request.Builder()
    .url("${fullUrl}")
    .method("${method}", ${hasBody ? 'body' : 'null'})
${headerAdders}
    .build()

  val response = client.newCall(request).execute()
  println(response.body?.string())
}`;
                }

                // Backward-compatibility legacy fallback mappings
                case 'fetch': return generateCodeSnippetByLang('js-fetch', req, env);
                case 'axios': return generateCodeSnippetByLang('js-axios', req, env);
                case 'python': return generateCodeSnippetByLang('python-requests', req, env);
                case 'node': return generateCodeSnippetByLang('node-native', req, env);
                case 'php': return generateCodeSnippetByLang('php-curl', req, env);
                case 'go': return generateCodeSnippetByLang('go-native', req, env);
                case 'rust': return generateCodeSnippetByLang('rust-reqwest', req, env);

                default:
                    return `curl --location --request ${method} '${fullUrl}'`;
            }
        };

        const shareTargetType = ref('request'); // 'request' | 'collection'
        const shareTargetRequest = ref(null);
        const shareTargetCollection = ref(null);
        const exportTargetRequest = ref(null);
        const customCodeSnippetContent = ref('');

        const codeSnippetGenerated = computed(() => {
            if (customCodeSnippetContent.value) return customCodeSnippetContent.value;
            const req = exportTargetRequest.value || activeRequest.value;
            return generateCodeSnippetByLang(exportCodeLang.value, req, activeEnv.value);
        });

        const copyCodeSnippet = () => {
            if (navigator.clipboard && codeSnippetGenerated.value) {
                navigator.clipboard.writeText(codeSnippetGenerated.value);
                codeCopied.value = true;
                setTimeout(() => { codeCopied.value = false; }, 2000);
            }
        };

        const downloadCodeSnippet = () => {
            const snippet = codeSnippetGenerated.value;
            if (!snippet) return;
            const extensions = {
                'curl': 'sh', 'shell-httpie': 'sh', 'shell-wget': 'sh',
                'js-fetch': 'js', 'js-axios': 'js', 'js-jquery': 'js', 'js-xhr': 'js',
                'node-axios': 'js', 'node-native': 'js',
                'python-requests': 'py', 'python-httpclient': 'py',
                'php-curl': 'php', 'php-guzzle': 'php',
                'go-native': 'go',
                'java-okhttp': 'java',
                'csharp-httpclient': 'cs', 'csharp-restsharp': 'cs',
                'ruby-nethttp': 'rb',
                'rust-reqwest': 'rs',
                'swift-urlsession': 'swift',
                'dart-http': 'dart',
                'kotlin-okhttp': 'kt',
                // Fallbacks for legacy/mapped formats
                'fetch': 'js', 'axios': 'js', 'python': 'py', 'node': 'js', 'php': 'php', 'go': 'go', 'rust': 'rs'
            };
            const ext = extensions[exportCodeLang.value] || 'txt';
            const blob = new Blob([snippet], { type: 'text/plain' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `request_snippet.${ext}`;
            a.click();
            URL.revokeObjectURL(url);
        };

        const openExportCodeModal = () => {
            exportTargetRequest.value = activeRequest.value;
            customCodeSnippetContent.value = '';
            activeModal.value = 'exportCodeModal';
        };

        const openExportCodeForRequest = (req, col) => {
            exportTargetRequest.value = req;
            customCodeSnippetContent.value = '';
            activeModal.value = 'exportCodeModal';
        };

        const openExportCollectionCodeModal = (col) => {
            exportTargetRequest.value = null;
            const allReqs = [...(col.requests || [])];
            (col.folders || []).forEach(f => {
                if (f.requests) allReqs.push(...f.requests);
            });
            let fullCode = `// ================================================\n// CloudPost Collection: ${col.name}\n// Total Requests: ${allReqs.length}\n// ================================================\n\n`;
            allReqs.forEach((r, idx) => {
                fullCode += `// ------------------------------------------------\n// [${idx + 1}/${allReqs.length}] ${r.name} (${r.method})\n// ------------------------------------------------\n`;
                fullCode += generateCodeSnippetByLang(exportCodeLang.value, r, activeEnv.value) + '\n\n';
            });
            customCodeSnippetContent.value = fullCode;
            activeModal.value = 'exportCodeModal';
        };

        const exportCollectionPostmanJson = (col) => {
            const postmanData = {
                info: {
                    name: col.name,
                    description: col.description || 'Exported from CloudPost',
                    schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json'
                },
                item: (col.requests || []).map(r => ({
                    name: r.name,
                    request: {
                        method: r.method,
                        header: (r.headers || []).filter(h => h.enabled && h.key).map(h => ({ key: h.key, value: h.value })),
                        url: {
                            raw: r.url,
                            host: [r.url.replace(/https?:\/\//, '').split('/')[0]],
                            path: r.url.replace(/https?:\/\/[^\/]+/, '').split('/').filter(Boolean)
                        },
                        body: r.body && r.body.rawText ? { mode: 'raw', raw: r.body.rawText } : undefined
                    }
                }))
            };
            const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(postmanData, null, 2));
            const downloadAnchor = document.createElement('a');
            downloadAnchor.setAttribute("href", dataStr);
            downloadAnchor.setAttribute("download", `${col.name.toLowerCase().replace(/\s+/g, '_')}_postman_v2.json`);
            document.body.appendChild(downloadAnchor);
            downloadAnchor.click();
            downloadAnchor.remove();
        };

        const openShareModal = () => {
            shareTargetType.value = 'request';
            shareTargetRequest.value = activeRequest.value;
            shareTargetCollection.value = null;
            activeModal.value = 'shareModal';
            fetchShortLinkForShare();
        };

        const openShareRequestModal = (req) => {
            shareTargetType.value = 'request';
            shareTargetRequest.value = req;
            shareTargetCollection.value = null;
            activeModal.value = 'shareModal';
            fetchShortLinkForShare();
        };

        const openShareCollectionModal = (col) => {
            shareTargetType.value = 'collection';
            shareTargetCollection.value = col;
            shareTargetRequest.value = null;
            activeModal.value = 'shareModal';
            fetchShortLinkForShare();
        };

        const openQuickVarModal = () => {
            quickVarKey.value = missingVars.value[0] || '';
            quickVarValue.value = '';
            activeModal.value = 'quickVarModal';
        };

        const saveQuickVar = () => {
            if (!quickVarKey.value.trim() || !activeEnv.value) return;
            if (!activeEnv.value.variables) activeEnv.value.variables = [];
            const existing = activeEnv.value.variables.find(v => v.key.toLowerCase() === quickVarKey.value.trim().toLowerCase());
            if (existing) {
                existing.value = quickVarValue.value.trim();
            } else {
                activeEnv.value.variables.push({
                    key: quickVarKey.value.trim(),
                    value: quickVarValue.value.trim(),
                    enabled: true
                });
            }
            saveEnvironments();
            activeModal.value = null;
            quickVarKey.value = '';
            quickVarValue.value = '';
        };

        const shortShareLink = ref('');
        const shortPostmanLink = ref('');
        const isGeneratingShortLink = ref(false);

        const fetchShortLinkForShare = async () => {
            isGeneratingShortLink.value = true;
            shortShareLink.value = '';
            shortPostmanLink.value = '';
            try {
                let type = shareTargetType.value;
                let payload = null;
                let title = 'Shared Item';

                if (type === 'collection' && shareTargetCollection.value) {
                    const col = shareTargetCollection.value;
                    title = col.name || 'Shared Collection';
                    payload = {
                        id: col.id,
                        name: col.name,
                        description: col.description || '',
                        folders: col.folders || [],
                        requests: col.requests || []
                    };
                } else {
                    const req = shareTargetRequest.value || activeRequest.value;
                    if (req) {
                        type = 'request';
                        title = req.name || 'Shared Request';
                        payload = {
                            id: req.id,
                            name: req.name,
                            method: req.method,
                            url: req.url,
                            headers: (req.headers || []).filter(h => h && h.enabled && h.key),
                            params: (req.params || []).filter(p => p && p.enabled && p.key),
                            body: req.body,
                            auth: req.auth
                        };
                    }
                }

                if (!payload) {
                    isGeneratingShortLink.value = false;
                    return;
                }

                const baseUrl = window.location.origin + window.location.pathname.replace(/\/([^\/]*\.php)?$/, '/');
                const apiUrl = baseUrl + 'api.php?action=create_short_link';

                const res = await fetch(apiUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        type,
                        title,
                        data: payload
                    })
                });

                if (res.ok) {
                    const data = await res.json();
                    if (data.success && data.code) {
                        shortShareLink.value = data.short_url || `${baseUrl}?s=${data.code}`;
                        shortPostmanLink.value = data.postman_url || `${baseUrl}api.php?action=postman_share&s=${data.code}`;
                    }
                }
            } catch (err) {
                console.warn('Could not generate server short link, using compact hash fallback:', err);
            } finally {
                isGeneratingShortLink.value = false;
            }
        };

        const shareableLinkUrl = computed(() => {
            if (shortShareLink.value) return shortShareLink.value;
            const baseUrl = window.location.origin + window.location.pathname.replace(/\/([^\/]*\.php)?$/, '/');
            const targetId = shareTargetType.value === 'collection' 
                ? (shareTargetCollection.value?.id || 'col_share') 
                : (shareTargetRequest.value?.id || activeRequest.value?.id || 'req_share');
            return `${baseUrl}?s=${encodeURIComponent(targetId)}`;
        });

        const copyShareLink = () => {
            if (navigator.clipboard) {
                navigator.clipboard.writeText(shareableLinkUrl.value);
                shareLinkCopied.value = true;
                setTimeout(() => { shareLinkCopied.value = false; }, 2000);
            }
        };

        const sharePostmanCopied = ref(false);
        const shareablePostmanUrl = computed(() => {
            if (shortPostmanLink.value) return shortPostmanLink.value;
            const baseUrl = window.location.origin + window.location.pathname.replace(/\/([^\/]*\.php)?$/, '/');
            const targetId = shareTargetType.value === 'collection' 
                ? (shareTargetCollection.value?.id || 'col_share') 
                : (shareTargetRequest.value?.id || activeRequest.value?.id || 'req_share');
            return `${baseUrl}api.php?action=postman_share&s=${encodeURIComponent(targetId)}`;
        });

        const copySharePostmanLink = () => {
            if (navigator.clipboard) {
                navigator.clipboard.writeText(shareablePostmanUrl.value);
                sharePostmanCopied.value = true;
                setTimeout(() => { sharePostmanCopied.value = false; }, 2000);
            }
        };

        const copyShareCurl = () => {
            const req = shareTargetRequest.value || activeRequest.value;
            const curl = generateCodeSnippetByLang('curl', req, activeEnv.value);
            if (navigator.clipboard && curl) {
                navigator.clipboard.writeText(curl);
                shareCurlCopied.value = true;
                setTimeout(() => { shareCurlCopied.value = false; }, 2000);
            }
        };

        const generatedCodeSnippet = computed(() => {
            if (!activeRequest.value) return '';
            const url = resolveVariables(activeRequest.value.url);
            const m = activeRequest.value.method;
            if (selectedCodeLang.value === 'curl') return `curl -X ${m} "${url}"`;
            if (selectedCodeLang.value === 'php') return '<' + '?php\n$ch = curl_init("' + url + '");\ncurl_setopt($ch, CURLOPT_CUSTOMREQUEST, "' + m + '");\ncurl_setopt($ch, CURLOPT_RETURNTRANSFER, true);\n$response = curl_exec($ch);\ncurl_close($ch);';
            return `fetch("${url}", { method: "${m}" })`;
        });

        const openRequestInTab = (req) => {
            const existing = tabs.value.find(t => t.request.id === req.id);
            if (existing) {
                activeTabId.value = existing.id;
            } else {
                const newTab = { id: 'tab_' + Date.now(), title: req.name, request: JSON.parse(JSON.stringify(req)) };
                tabs.value.push(newTab);
                activeTabId.value = newTab.id;
            }
            if (typeof window !== 'undefined' && window.innerWidth < 1024) {
                isSidebarOpen.value = false;
            }
        };

        const closeTab = (id) => {
            tabs.value = tabs.value.filter(t => t.id !== id);
            if (tabs.value.length > 0 && activeTabId.value === id) activeTabId.value = tabs.value[0].id;
        };

        const createNewBlankTab = () => {
            const newReq = {
                id: 'req_' + Date.now(),
                name: 'Untitled Request',
                method: 'GET',
                url: '',
                params: [],
                headers: [],
                auth: { type: 'none' },
                body: { type: 'none', rawText: '' }
            };
            const tab = { id: 'tab_' + Date.now(), title: 'Untitled Request', request: newReq };
            tabs.value.push(tab);
            activeTabId.value = tab.id;
            if (typeof window !== 'undefined' && window.innerWidth < 1024) {
                isSidebarOpen.value = false;
            }
        };

        const addUrlEncodedRow = () => {
            if (!activeRequest.value) return;
            if (!activeRequest.value.body.urlEncoded) activeRequest.value.body.urlEncoded = [];
            activeRequest.value.body.urlEncoded.push({ key: '', value: '', description: '', enabled: true });
        };
        const removeUrlEncodedRow = (index) => {
            if (!activeRequest.value || !activeRequest.value.body.urlEncoded) return;
            activeRequest.value.body.urlEncoded.splice(index, 1);
        };
        const addFormDataRow = () => {
            if (!activeRequest.value) return;
            if (!activeRequest.value.body.formData) activeRequest.value.body.formData = [];
            activeRequest.value.body.formData.push({ key: '', value: '', type: 'text', description: '', enabled: true });
        };
        const removeFormDataRow = (index) => {
            if (!activeRequest.value || !activeRequest.value.body.formData) return;
            activeRequest.value.body.formData.splice(index, 1);
        };

        const addParamRow = () => {
            if (!activeRequest.value) return;
            if (!activeRequest.value.params) activeRequest.value.params = [];
            activeRequest.value.params.push({ key: '', value: '', description: '', enabled: true });
        };

        const removeParamRow = (idx) => {
            if (!activeRequest.value || !activeRequest.value.params) return;
            activeRequest.value.params.splice(idx, 1);
            syncParamsToUrl();
        };

        const syncParamsToUrl = () => {
            if (!activeRequest.value) return;
            try {
                let currentUrl = activeRequest.value.url.split('?')[0];
                const activeParams = (activeRequest.value.params || []).filter(p => p.enabled && p.key);
                if (activeParams.length > 0) {
                    const query = activeParams.map(p => encodeURIComponent(p.key) + '=' + encodeURIComponent(p.value)).join('&');
                    activeRequest.value.url = currentUrl + '?' + query;
                } else {
                    activeRequest.value.url = currentUrl;
                }
            } catch (e) {}
        };

        const syncUrlParams = () => {
            if (!activeRequest.value) return;
            try {
                if (!activeRequest.value.url.includes('?')) {
                    if (activeRequest.value.params) {
                        activeRequest.value.params = activeRequest.value.params.filter(p => !p.enabled);
                    }
                    return;
                }
                const parts = activeRequest.value.url.split('?');
                if (parts[1] !== undefined) {
                    const queryParams = new URLSearchParams(parts[1]);
                    const existingParams = [...(activeRequest.value.params || [])];
                    const newParams = [];
                    queryParams.forEach((value, key) => {
                        const existingIdx = existingParams.findIndex(p => p.key === key);
                        if (existingIdx > -1) {
                            const existing = existingParams[existingIdx];
                            existing.value = value;
                            existing.enabled = true;
                            newParams.push(existing);
                            existingParams.splice(existingIdx, 1);
                        } else {
                            newParams.push({ key, value, enabled: true, description: '' });
                        }
                    });
                    activeRequest.value.params = [...newParams, ...existingParams.filter(p => !p.enabled)];
                }
            } catch (e) {}
        };

        const toggleParamsBulkMode = () => {
            if (!activeRequest.value) return;
            if (!paramsBulkMode.value) {
                paramsBulkText.value = (activeRequest.value.params || [])
                    .map(p => (p.enabled ? '' : '// ') + `${p.key}: ${p.value}` + (p.description ? ` // ${p.description}` : ''))
                    .join('\n');
            } else {
                const lines = paramsBulkText.value.split('\n');
                const newParams = [];
                for (const line of lines) {
                    const trimmed = line.trim();
                    if (!trimmed) continue;
                    const enabled = !trimmed.startsWith('//');
                    const cleanLine = enabled ? trimmed : trimmed.replace(/^\/\/\s*/, '');
                    let desc = '';
                    let kv = cleanLine;
                    const descIdx = cleanLine.indexOf('//');
                    if (descIdx > -1) {
                        desc = cleanLine.substring(descIdx + 2).trim();
                        kv = cleanLine.substring(0, descIdx).trim();
                    }
                    const sepIdx = kv.indexOf(':');
                    if (sepIdx > -1) {
                        newParams.push({ key: kv.substring(0, sepIdx).trim(), value: kv.substring(sepIdx + 1).trim(), description: desc, enabled });
                    } else {
                        newParams.push({ key: kv, value: '', description: desc, enabled });
                    }
                }
                activeRequest.value.params = newParams;
                syncParamsToUrl();
            }
            paramsBulkMode.value = !paramsBulkMode.value;
        };

        const toggleHeadersBulkMode = () => {
            if (!activeRequest.value) return;
            if (!headersBulkMode.value) {
                headersBulkText.value = (activeRequest.value.headers || [])
                    .map(p => (p.enabled ? '' : '// ') + `${p.key}: ${p.value}` + (p.description ? ` // ${p.description}` : ''))
                    .join('\n');
            } else {
                const lines = headersBulkText.value.split('\n');
                const newHeaders = [];
                for (const line of lines) {
                    const trimmed = line.trim();
                    if (!trimmed) continue;
                    const enabled = !trimmed.startsWith('//');
                    const cleanLine = enabled ? trimmed : trimmed.replace(/^\/\/\s*/, '');
                    let desc = ''; let kv = cleanLine;
                    const descIdx = cleanLine.indexOf('//');
                    if (descIdx > -1) {
                        desc = cleanLine.substring(descIdx + 2).trim();
                        kv = cleanLine.substring(0, descIdx).trim();
                    }
                    const sepIdx = kv.indexOf(':');
                    if (sepIdx > -1) {
                        newHeaders.push({ key: kv.substring(0, sepIdx).trim(), value: kv.substring(sepIdx + 1).trim(), description: desc, enabled });
                    } else {
                        newHeaders.push({ key: kv, value: '', description: desc, enabled });
                    }
                }
                activeRequest.value.headers = newHeaders;
            }
            headersBulkMode.value = !headersBulkMode.value;
        };

        const toggleUrlEncodedBulkMode = () => {
            if (!activeRequest.value) return;
            if (!activeRequest.value.body) activeRequest.value.body = {};
            if (!urlEncodedBulkMode.value) {
                urlEncodedBulkText.value = (activeRequest.value.body.urlEncoded || [])
                    .map(p => (p.enabled ? '' : '// ') + `${p.key}: ${p.value}` + (p.description ? ` // ${p.description}` : ''))
                    .join('\n');
            } else {
                const lines = urlEncodedBulkText.value.split('\n');
                const newItems = [];
                for (const line of lines) {
                    const trimmed = line.trim();
                    if (!trimmed) continue;
                    const enabled = !trimmed.startsWith('//');
                    const cleanLine = enabled ? trimmed : trimmed.replace(/^\/\/\s*/, '');
                    let desc = ''; let kv = cleanLine;
                    const descIdx = cleanLine.indexOf('//');
                    if (descIdx > -1) { desc = cleanLine.substring(descIdx + 2).trim(); kv = cleanLine.substring(0, descIdx).trim(); }
                    const sepIdx = kv.indexOf(':');
                    if (sepIdx > -1) {
                        newItems.push({ key: kv.substring(0, sepIdx).trim(), value: kv.substring(sepIdx + 1).trim(), description: desc, enabled });
                    } else {
                        newItems.push({ key: kv, value: '', description: desc, enabled });
                    }
                }
                activeRequest.value.body.urlEncoded = newItems;
            }
            urlEncodedBulkMode.value = !urlEncodedBulkMode.value;
        };

        const toggleFormDataBulkMode = () => {
            if (!activeRequest.value) return;
            if (!activeRequest.value.body) activeRequest.value.body = {};
            if (!formDataBulkMode.value) {
                formDataBulkText.value = (activeRequest.value.body.formData || [])
                    .map(p => (p.enabled ? '' : '// ') + `${p.key}: ${p.type === 'file' ? '[FILE]' : p.value}` + (p.description ? ` // ${p.description}` : ''))
                    .join('\n');
            } else {
                const lines = formDataBulkText.value.split('\n');
                const newItems = [];
                for (const line of lines) {
                    const trimmed = line.trim();
                    if (!trimmed) continue;
                    const enabled = !trimmed.startsWith('//');
                    const cleanLine = enabled ? trimmed : trimmed.replace(/^\/\/\s*/, '');
                    let desc = ''; let kv = cleanLine;
                    const descIdx = cleanLine.indexOf('//');
                    if (descIdx > -1) { desc = cleanLine.substring(descIdx + 2).trim(); kv = cleanLine.substring(0, descIdx).trim(); }
                    const sepIdx = kv.indexOf(':');
                    if (sepIdx > -1) {
                        const k = kv.substring(0, sepIdx).trim();
                        const v = kv.substring(sepIdx + 1).trim();
                        if (v === '[FILE]') {
                            const existing = (activeRequest.value.body.formData || []).find(f => f.key === k && f.type === 'file');
                            newItems.push({ key: k, value: '', type: 'file', file: existing ? existing.file : null, description: desc, enabled });
                        } else {
                            newItems.push({ key: k, value: v, type: 'text', description: desc, enabled });
                        }
                    } else {
                        newItems.push({ key: kv, value: '', type: 'text', description: desc, enabled });
                    }
                }
                activeRequest.value.body.formData = newItems;
            }
            formDataBulkMode.value = !formDataBulkMode.value;
        };

        const handleFileSelection = (event, item) => {
            const file = event.target.files[0];
            if (file) {
                item.file = file;
                item.value = file.name;
            }
        };

        const addHeaderRow = () => {
            if (!activeRequest.value) return;
            if (!activeRequest.value.headers) activeRequest.value.headers = [];
            activeRequest.value.headers.push({ key: '', value: '', description: '', enabled: true });
        };

        const removeHeaderRow = (idx) => {
            if (!activeRequest.value || !activeRequest.value.headers) return;
            activeRequest.value.headers.splice(idx, 1);
        };

        const formatJsonBody = () => {
            if (!activeRequest.value || !(activeRequest.value.body && activeRequest.value.body.rawText)) return;
            try {
                const parsed = JSON.parse(activeRequest.value.body.rawText);
                activeRequest.value.body.rawText = JSON.stringify(parsed, null, 2);
            } catch (e) {
                alert('Invalid JSON syntax: ' + e.message);
            }
        };

        const insertTestSnippet = (type) => {
            if (!activeRequest.value) return;
            let snippet = '';
            if (type === 'status200') {
                snippet = `pm.test("Status code is 200 OK", function () {\n    pm.response.to.have.status(200);\n});`;
            } else if (type === 'status201') {
                snippet = `pm.test("Status code is 201 Created", function () {\n    pm.response.to.have.status(201);\n});`;
            } else if (type === 'jsonProp') {
                snippet = `pm.test("Response body contains valid JSON id", function () {\n    var jsonData = pm.response.json();\n    pm.expect(jsonData).to.have.property('id');\n});`;
            } else if (type === 'header') {
                snippet = `pm.test("Content-Type header is present", function () {\n    pm.response.to.have.header('content-type');\n});`;
            } else if (type === 'timing') {
                snippet = `pm.test("Response latency is below 500ms", function () {\n    pm.expect(pm.response.responseTime).to.be.below(500);\n});`;
            } else if (type === 'saveEnv') {
                snippet = `pm.test("Save token to environment", function () {\n    var jsonData = pm.response.json();\n    if (jsonData.token) {\n        pm.environment.set("authToken", jsonData.token);\n    }\n});`;
            }
            if (snippet) {
                const current = (activeRequest.value.testsScript || '').trim();
                activeRequest.value.testsScript = current ? current + '\n\n' + snippet : snippet;
            }
        };

        const runPostmanAssertions = (script, response) => {
            if (!script || !script.trim()) return [];
            const results = [];
            
            const normalizedHeaders = {};
            if (response.headers) {
                Object.keys(response.headers).forEach(k => {
                    normalizedHeaders[k.toLowerCase()] = response.headers[k];
                    normalizedHeaders[k] = response.headers[k];
                });
            }

            const createExpect = (val, isNegated = false) => {
                const check = (passed, msg) => {
                    const finalPassed = isNegated ? !passed : passed;
                    if (!finalPassed) throw new Error(isNegated ? '[not] ' + msg : msg);
                };
                return {
                    get not() { return createExpect(val, !isNegated); },
                    to: {
                        get not() { return createExpect(val, !isNegated); },
                        be: {
                            get not() { return createExpect(val, !isNegated); },
                            an: (t) => {
                                if (t === 'array') check(Array.isArray(val), 'expected ' + val + ' to be an array');
                                else if (t === 'object') check(typeof val === 'object' && val !== null && !Array.isArray(val), 'expected ' + val + ' to be an object');
                                else check(typeof val === t, 'expected typeof ' + val + ' to be ' + t);
                            },
                            a: (t) => {
                                if (t === 'array') check(Array.isArray(val), 'expected ' + val + ' to be an array');
                                else if (t === 'object') check(typeof val === 'object' && val !== null && !Array.isArray(val), 'expected ' + val + ' to be an object');
                                else check(typeof val === t, 'expected typeof ' + val + ' to be ' + t);
                            },
                            true: () => check(val === true, 'expected true but got ' + val),
                            false: () => check(val === false, 'expected false but got ' + val),
                            null: () => check(val === null, 'expected null but got ' + val),
                            undefined: () => check(val === undefined, 'expected undefined but got ' + val),
                            below: (max) => check(Number(val) < max, 'expected ' + val + ' to be below ' + max),
                            above: (min) => check(Number(val) > min, 'expected ' + val + ' to be above ' + min),
                            at: {
                                least: (min) => check(Number(val) >= min, 'expected ' + val + ' to be at least ' + min),
                                most: (max) => check(Number(val) <= max, 'expected ' + val + ' to be at most ' + max)
                            },
                            oneOf: (arr) => check(Array.isArray(arr) && arr.includes(val), 'expected ' + val + ' to be in [' + arr.join(', ') + ']')
                        },
                        equal: (exp) => check(val === exp, 'expected ' + JSON.stringify(exp) + ' but got ' + JSON.stringify(val)),
                        eql: (exp) => check(JSON.stringify(val) === JSON.stringify(exp), 'expected deep equal ' + JSON.stringify(exp)),
                        include: (item) => {
                            if (typeof val === 'string') check(val.includes(item), 'expected string to include ' + item);
                            else if (Array.isArray(val)) check(val.includes(item), 'expected array to include ' + item);
                            else if (typeof val === 'object' && val !== null) check(item in val, 'expected object to include ' + item);
                        },
                        have: {
                            property: (prop, expectedVal) => {
                                check(val != null && prop in val, 'expected object to have property ' + prop);
                                if (expectedVal !== undefined) check(val[prop] === expectedVal, 'expected property ' + prop + ' to equal ' + expectedVal);
                            },
                            header: (hName) => {
                                check(normalizedHeaders[hName.toLowerCase()] !== undefined, 'expected response to have header ' + hName);
                            },
                            status: (code) => {
                                check(response.status === code, 'expected status ' + code + ' but got ' + response.status);
                            }
                        }
                    }
                };
            };

            const pm = {
                test: function(name, fn) {
                    try {
                        fn();
                        results.push({ name, passed: true });
                    } catch (e) {
                        results.push({ name, passed: false, error: e.message });
                    }
                },
                expect: function(val) {
                    return createExpect(val);
                },
                response: {
                    status: response.status,
                    code: response.status,
                    statusText: response.statusText,
                    responseTime: response.time || 50,
                    time: response.time || 50,
                    size: response.size || 0,
                    headers: response.headers || {},
                    getHeader: function(h) { return normalizedHeaders[h.toLowerCase()] || null; },
                    json: function() {
                        return typeof response.data === 'string' ? JSON.parse(response.data) : response.data;
                    },
                    text: function() {
                        return typeof response.data === 'string' ? response.data : JSON.stringify(response.data);
                    },
                    to: {
                        have: {
                            status: function(code) {
                                if (response.status !== code) throw new Error('expected status ' + code + ' but got ' + response.status);
                            },
                            header: function(h) {
                                if (normalizedHeaders[h.toLowerCase()] === undefined) throw new Error('expected header ' + h);
                            }
                        },
                        be: {
                            get success() {
                                if (response.status < 200 || response.status >= 300) throw new Error('expected 2xx status code');
                                return true;
                            },
                            get ok() {
                                if (response.status < 200 || response.status >= 300) throw new Error('expected 2xx status code');
                                return true;
                            }
                        }
                    }
                },
                environment: {
                    set: function(k, v) {
                        if (activeEnv.value && activeEnv.value.variables) {
                            const existing = activeEnv.value.variables.find(item => item.key === k);
                            if (existing) existing.value = String(v);
                            else activeEnv.value.variables.push({ key: k, value: String(v), enabled: true });
                        }
                    },
                    get: function(k) {
                        const item = (activeEnv.value && activeEnv.value.variables ? activeEnv.value.variables.find : () => null)(v => v.key === k);
                        return item ? item.value : null;
                    }
                },
                globals: {
                    set: function(k, v) { console.log('Global set', k, v); },
                    get: function(k) { return null; }
                }
            };

            try {
                const runner = new Function('pm', script);
                runner(pm);
            } catch (err) {
                results.push({ name: 'Script Evaluation Error', passed: false, error: err.message });
            }

            return results;
        };

        const isSaving = ref(false);
        const saveActiveRequest = async () => {
            if (!activeRequest.value || isSaving.value) return;
            isSaving.value = true;
            try {
                await saveStateToServer();
                await new Promise(resolve => setTimeout(resolve, 400));
            } catch (e) {
                console.error('Error saving request state:', e);
            } finally {
                isSaving.value = false;
            }
        };

        const saveEnvironments = () => {
            saveStateToServer();
            alert('Environment variables saved successfully!');
        };

        // Offline Sync & PWA Variables
        const isOnline = ref(navigator.onLine);
        const syncStatus = ref('idle'); // 'idle' | 'syncing' | 'error'
        const pendingSyncCount = ref(0);
        const canInstallPwa = ref(false);
        const isInstalled = ref(window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true);
        let deferredInstallPrompt = null;

        const updatePendingSyncCount = () => {
            try {
                const queue = JSON.parse(localStorage.getItem('cp_php_outbox_queue') || '[]');
                pendingSyncCount.value = queue.length;
            } catch (e) {
                pendingSyncCount.value = 0;
            }
        };

        const promptPwaInstall = async () => {
            if (!deferredInstallPrompt) {
                alert('To install CloudPost as an offline desktop/system app:\n\n• On Chrome / Edge / Brave: Click the Install icon (⊕ or computer screen) in your browser address bar.\n• On iOS Safari: Tap Share -> "Add to Home Screen".\n• On Android: Tap menu -> "Install App".');
                return;
            }
            deferredInstallPrompt.prompt();
            const choice = await deferredInstallPrompt.userChoice;
            if (choice.outcome === 'accepted') {
                canInstallPwa.value = false;
                deferredInstallPrompt = null;
                isInstalled.value = true;
            }
        };

        const syncPendingOutbox = async () => {
            if (!navigator.onLine || syncStatus.value === 'syncing') return;
            try {
                syncStatus.value = 'syncing';
                const queue = JSON.parse(localStorage.getItem('cp_php_outbox_queue') || '[]');
                if (queue.length === 0) {
                    // Also perform a fresh sync of the current state
                    await fetch('storage?action=save_state', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            workspaces: workspaces.value,
                            collections: collections.value,
                            environments: environments.value,
                            recentRequests: recentRequests.value
                        })
                    });
                    syncStatus.value = 'idle';
                    updatePendingSyncCount();
                    return;
                }

                // Drain queue items
                for (let i = 0; i < queue.length; i++) {
                    const item = queue[i];
                    await fetch('storage?action=save_state', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(item)
                    });
                }
                localStorage.removeItem('cp_php_outbox_queue');
                updatePendingSyncCount();
                syncStatus.value = 'idle';
            } catch (e) {
                console.warn('Sync outbox failed:', e);
                syncStatus.value = 'error';
                setTimeout(() => { syncStatus.value = 'idle'; }, 3000);
            } finally {
                
            }
        };

        const saveStateToServer = async () => {
            const payload = {
                workspaces: workspaces.value,
                collections: collections.value,
                environments: environments.value,
                recentRequests: recentRequests.value,
                tabs: tabs.value,
                activeTabId: activeTabId.value,
                savedAt: new Date().toISOString()
            };

            // 1. Always save to LocalStorage strictly isolated per guest/user session
            try {
                const guestId = getClientGuestId();
                localStorage.setItem('cp_php_' + guestId + '_state', JSON.stringify(payload));
                localStorage.setItem('cp_' + guestId + '_recent_requests', JSON.stringify(recentRequests.value));
                localStorage.setItem('cp_php_local_state', JSON.stringify(payload));
                localStorage.setItem('cp_collections', JSON.stringify(collections.value));
                localStorage.setItem('cp_workspaces', JSON.stringify(workspaces.value));
                localStorage.setItem('cp_environments', JSON.stringify(environments.value));
                localStorage.setItem('cp_tabs', JSON.stringify(tabs.value));
                localStorage.setItem('cp_active_tab_id', activeTabId.value);

                // Dedicated isolated guest history log for guest persistence
                const guestHistKey = 'cp_' + guestId + '_history';
                const guestHist = JSON.parse(localStorage.getItem(guestHistKey) || '[]');
                if (recentRequests.value.length > 0) {
                    const topRec = recentRequests.value[0];
                    if (!guestHist.find(g => g.id === topRec.id)) {
                        guestHist.unshift(topRec);
                        localStorage.setItem(guestHistKey, JSON.stringify(guestHist.slice(0, 50)));
                    }
                }
            } catch (e) {}

            // 2. If offline, push to Outbox queue
            if (!navigator.onLine) {
                try {
                    const queue = JSON.parse(localStorage.getItem('cp_php_outbox_queue') || '[]');
                    queue.push(payload);
                    localStorage.setItem('cp_php_outbox_queue', JSON.stringify(queue.slice(-20)));
                    updatePendingSyncCount();
                } catch (e) {}
                return;
            }

            // 3. If online, send to PHP backend
            try {
                syncStatus.value = 'syncing';
                const guestId = getClientGuestId();
                await fetch('storage?action=save_state', {
                    method: 'POST',
                    headers: { 
                        'Content-Type': 'application/json',
                        'x-guest-id': guestId
                    },
                    body: JSON.stringify(payload)
                });
                syncStatus.value = 'idle';
            } catch (e) {
                console.warn('Direct save failed, queuing to offline outbox:', e);
                try {
                    const queue = JSON.parse(localStorage.getItem('cp_php_outbox_queue') || '[]');
                    queue.push(payload);
                    localStorage.setItem('cp_php_outbox_queue', JSON.stringify(queue.slice(-20)));
                    updatePendingSyncCount();
                } catch (err) {}
                syncStatus.value = 'idle';
            } finally {
                
            }
        };

        const selectWorkspace = (wsId) => {
            activeWorkspaceId.value = wsId;
            showWorkspaceDropdown.value = false;
        };

        const newCollectionName = ref('');
        const newCollectionDesc = ref('');
        const createFolderTargetColId = ref(null);
        const newFolderName = ref('');

        const createCollection = () => {
            if (!newCollectionName.value.trim()) return;
            const newCol = {
                id: 'col_' + Date.now(),
                name: newCollectionName.value.trim(),
                description: newCollectionDesc.value.trim() || 'Custom API Collection',
                folders: [],
                requests: []
            };
            collections.value.unshift(newCol);
            saveStateToServer();
            activeModal.value = null;
            newCollectionName.value = '';
            newCollectionDesc.value = '';
        };

        const openNewFolderModal = (colId) => {
            createFolderTargetColId.value = colId;
            newFolderName.value = '';
            activeModal.value = 'newFolderModal';
        };

        const createFolder = () => {
            if (!newFolderName.value.trim() || !createFolderTargetColId.value) return;
            const col = collections.value.find(c => c.id === createFolderTargetColId.value);
            if (col) {
                if (!col.folders) col.folders = [];
                col.folders.push({
                    id: 'fol_' + Date.now(),
                    name: newFolderName.value.trim(),
                    requests: []
                });
                saveStateToServer();
            }
            activeModal.value = null;
            newFolderName.value = '';
            createFolderTargetColId.value = null;
        };

        const deleteCollection = (colId) => {
            if (confirm('Are you sure you want to delete this entire collection?')) {
                collections.value = collections.value.filter(c => c.id !== colId);
                saveStateToServer();
            }
        };

        const deleteFolder = (colId, folderId) => {
            const col = collections.value.find(c => c.id === colId);
            if (!col || !col.folders) return;
            if (confirm('Are you sure you want to delete this folder?')) {
                col.folders = col.folders.filter(f => f.id !== folderId);
                saveStateToServer();
            }
        };

        const deleteRequest = (colId, reqId) => {
            const col = collections.value.find(c => c.id === colId);
            if (!col) return;
            if (confirm('Delete this request?')) {
                if (col.requests) {
                    col.requests = col.requests.filter(r => r.id !== reqId);
                }
                if (col.folders) {
                    col.folders.forEach(f => {
                        if (f.requests) f.requests = f.requests.filter(r => r.id !== reqId);
                    });
                }
                // Close any open tab matching this request
                const tabIdx = tabs.value.findIndex(t => t.request && t.request.id === reqId);
                if (tabIdx >= 0) closeTab(tabs.value[tabIdx].id);
                saveStateToServer();
            }
        };

        const duplicateRequest = (colId, reqId) => {
            const col = collections.value.find(c => c.id === colId);
            if (!col) return;
            let targetReq = (col.requests || []).find(r => r.id === reqId);
            let targetFolder = null;
            if (!targetReq && col.folders) {
                for (const f of col.folders) {
                    const r = (f.requests || []).find(it => it.id === reqId);
                    if (r) {
                        targetReq = r;
                        targetFolder = f;
                        break;
                    }
                }
            }
            if (!targetReq) return;
            const dup = JSON.parse(JSON.stringify(targetReq));
            dup.id = 'req_' + Date.now();
            dup.name = targetReq.name + ' (Copy)';
            if (targetFolder) {
                targetFolder.requests.push(dup);
                collapsedFolders.value[targetFolder.id] = false;
                collapsedCollections.value[colId] = false;
            } else {
                col.requests.push(dup);
            }
            openRequestInTab(dup);
            saveStateToServer();
        };

        const openCreateRequestModal = (colId, folderId = null) => {
            const col = collections.value.find(c => c.id === colId);
            if (!col) return;
            const newReq = {
                id: 'req_' + Date.now(),
                collectionId: colId,
                name: 'New Request',
                method: 'GET',
                url: 'https://jsonplaceholder.typicode.com/posts/1',
                params: [],
                headers: [{ key: 'Accept', value: 'application/json', enabled: true }],
                auth: { type: 'none' },
                body: { type: 'none', rawText: '' },
                preRequestScript: '',
                testsScript: ''
            };
            if (folderId && col.folders) {
                const f = col.folders.find(it => it.id === folderId);
                if (f) {
                    if (!f.requests) f.requests = [];
                    f.requests.push(newReq);
                    collapsedFolders.value[folderId] = false;
                    collapsedCollections.value[colId] = false;
                } else {
                    if (!col.requests) col.requests = [];
                    col.requests.push(newReq);
                }
            } else {
                if (!col.requests) col.requests = [];
                col.requests.push(newReq);
            }
            openRequestInTab(newReq);
            saveStateToServer();
        };

        const runCollectionQuick = (colId) => {
            runnerSelectedCollectionId.value = colId;
            showRunnerModal.value = true;
        };

        const runSelectedCollection = async () => {
            runnerRunning.value = true;
            const col = collections.value.find(c => c.id === runnerSelectedCollectionId.value);
            if (!col) {
                runnerRunning.value = false;
                return;
            }
            const allReqs = [...(col.requests || [])];
            (col.folders || []).forEach(f => {
                if (f.requests) allReqs.push(...f.requests);
            });
            if (allReqs.length === 0) {
                runnerRunning.value = false;
                return;
            }
            const iters = Math.max(1, Math.min(10, Number(runnerIterations.value) || 1));
            runnerStats.value = {
                total: allReqs.length * iters,
                completed: 0,
                passed: 0,
                failed: 0
            };
            runnerExecutionLog.value = [];
            for (let iter = 1; iter <= iters && runnerRunning.value; iter++) {
                for (let i = 0; i < allReqs.length && runnerRunning.value; i++) {
                    const req = allReqs[i];
                    runnerCurrentIndex.value = runnerStats.value.completed;
                    if (Number(runnerDelayMs.value) > 0 && runnerStats.value.completed > 0) {
                        await new Promise(r => setTimeout(r, Number(runnerDelayMs.value)));
                    }
                    const matchingTab = tabs.value.find(t => t.request && t.request.id === req.id);
                    if (matchingTab) {
                        matchingTab.isLoading = true;
                    }
                    const startTime = performance.now();
                    try {
                        const result = await executeHttpRequestJs(req);
                        if (matchingTab) {
                            matchingTab.isLoading = false;
                            matchingTab.lastStatus = result.status;
                            matchingTab.lastStatusText = result.statusText;
                        }
                        const elapsed = Math.round(performance.now() - startTime);
                        result.testResults = runPostmanAssertions(req.testsScript, result);
                        const hasFailedTests = result.testResults && result.testResults.some(t => !t.passed);
                        const isSuccess = result.status >= 200 && result.status < 400 && !hasFailedTests;
                        runnerStats.value.completed++;
                        if (isSuccess) {
                            runnerStats.value.passed++;
                        } else {
                            runnerStats.value.failed++;
                        }
                        runnerExecutionLog.value.push({
                            id: 'run_' + Date.now() + '_' + iter + '_' + i,
                            iteration: iter,
                            name: req.name,
                            method: req.method,
                            url: result.url || resolveVariables(req.url),
                            status: result.status,
                            time: result.time || elapsed,
                            size: result.size || 0,
                            isSuccess: isSuccess,
                            testResults: result.testResults || [],
                            responseBody: (result.data !== undefined ? (typeof result.data === 'object' ? JSON.stringify(result.data, null, 2) : String(result.data)) : ''),
                            showDetails: false
                        });

                        recentRequests.value.unshift({
                            id: 'rec_' + Date.now() + '_' + iter + '_' + i,
                            name: req.name + (iters > 1 ? ' (Iter #' + iter + ')' : ''),
                            method: req.method,
                            url: result.url || resolveVariables(req.url),
                            status: result.status,
                            time: result.time || elapsed,
                            executedAt: new Date().toISOString()
                        });
                        if (recentRequests.value.length > 50) {
                            recentRequests.value = recentRequests.value.slice(0, 50);
                        }
                        await persistRequestAndResponseToPhp(req, result);
                    } catch (err) {
                        if (matchingTab) {
                            matchingTab.isLoading = false;
                            matchingTab.lastStatus = 0;
                            matchingTab.lastStatusText = 'Error';
                        }
                        runnerStats.value.completed++;
                        runnerStats.value.failed++;
                        runnerExecutionLog.value.push({
                            id: 'run_err_' + Date.now() + '_' + iter + '_' + i,
                            iteration: iter,
                            name: req.name,
                            method: req.method,
                            url: resolveVariables(req.url),
                            status: 0,
                            time: 0,
                            size: 0,
                            isSuccess: false,
                            testResults: [{ name: 'Network Connection', passed: false, error: err.message || 'Request failed' }],
                            responseBody: err.message || 'Network error',
                            showDetails: false
                        });
                    }
                }
            }
            runnerCurrentIndex.value = -1;
            runnerRunning.value = false;
            saveStateToServer();
        };

        const parseCurlCommand = (curlString) => {
            const cleanCurl = curlString.replace(/\\\r?\n/g, ' ').trim();
            let method = 'GET';
            let url = 'https://httpbin.org/get';
            const headers = [];
            const params = [];
            const body = {
                type: 'none',
                rawText: '',
                rawType: 'application/json',
                formData: [],
                urlEncoded: []
            };

            const methodMatch = cleanCurl.match(/(?:-X|--request)\s+["']?([A-Za-z]+)["']?/i);
            if (methodMatch) {
                method = methodMatch[1].toUpperCase();
            }

            const headerRegex = /(?:-H|--header)\s+((["'])(.*?)\2|([^"'\s]\S*))/gi;
            let match;
            while ((match = headerRegex.exec(cleanCurl)) !== null) {
                let headerStr = match[3] || match[4] || '';
                const colonIdx = headerStr.indexOf(':');
                if (colonIdx > -1) {
                    const key = headerStr.slice(0, colonIdx).trim();
                    const value = headerStr.slice(colonIdx + 1).trim();
                    if (key) {
                        headers.push({
                            id: 'hdr_' + Math.random().toString(36).substring(2, 9),
                            key,
                            value,
                            enabled: true
                        });
                    }
                }
            }

            const bodyRegex = /(?:-d|--data|--data-raw|--data-binary|--data-urlencode)\s+((["'])(.*?)\2|(\{[\s\S]*?\}|\[[\s\S]*?\]|[^"'\s]\S*))/gi;
            let bodyMatch = bodyRegex.exec(cleanCurl);
            if (bodyMatch) {
                const bodyContent = bodyMatch[3] || bodyMatch[4] || '';
                body.rawText = bodyContent;
                body.type = 'raw';
                if (bodyContent.trim().startsWith('{') || bodyContent.trim().startsWith('[')) {
                    body.type = 'json';
                    body.rawType = 'application/json';
                } else {
                    body.rawType = 'text/plain';
                }
                if (!methodMatch) {
                    method = 'POST';
                }
            }

            const urlRegex = /(?:'|")?(https?:\/\/[^"'\s]+)(?:'|")?/gi;
            const urlMatch = urlRegex.exec(cleanCurl);
            if (urlMatch) {
                url = urlMatch[1];
            } else {
                const words = cleanCurl.split(/\s+/);
                for (const word of words) {
                    const cleanWord = word.replace(/['"]/g, '');
                    if (cleanWord.startsWith('http://') || cleanWord.startsWith('https://')) {
                        url = cleanWord;
                        break;
                    } else if (cleanWord.includes('.') && !cleanWord.startsWith('-') && cleanWord.length > 5 && !words[words.indexOf(word) - 1]?.match(/-X|--request|-H|--header|-d|--data/i)) {
                        url = 'https://' + cleanWord;
                        break;
                    }
                }
            }

            try {
                const urlObj = new URL(url);
                urlObj.searchParams.forEach((val, key) => {
                    params.push({
                        id: 'param_' + Math.random().toString(36).substring(2, 9),
                        key,
                        value: val,
                        enabled: true
                    });
                });
                url = urlObj.origin + urlObj.pathname;
            } catch (e) {}

            return {
                id: 'req_' + Math.random().toString(36).substring(2, 9),
                name: 'cURL Imported Request',
                method,
                url,
                params,
                headers,
                body,
                auth: { type: 'none' },
                preRequestScript: '',
                testsScript: 'pm.test("Status is 200", () => pm.response.to.have.status(200));'
            };
        };

        const parsePostmanHeaders = (headerArr) => {
            if (!Array.isArray(headerArr)) return [];
            return headerArr.map(h => ({
                id: 'hdr_' + Math.random().toString(36).substring(2, 9),
                key: h.key || '',
                value: h.value !== undefined ? String(h.value) : '',
                enabled: h.disabled !== true,
                description: h.description || ''
            }));
        };

        const parsePostmanAuth = (authObj) => {
            if (!authObj || typeof authObj !== 'object') return { type: 'none' };
            const authType = authObj.type;
            if (authType === 'bearer') {
                const bearerArr = authObj.bearer || [];
                let token = '';
                if (Array.isArray(bearerArr)) {
                    const t = bearerArr.find(b => b.key === 'token');
                    if (t) token = t.value;
                } else if (typeof bearerArr === 'string') {
                    token = bearerArr;
                }
                return { type: 'bearer', bearerToken: token };
            }
            if (authType === 'basic') {
                const basicArr = authObj.basic || [];
                let username = '';
                let password = '';
                if (Array.isArray(basicArr)) {
                    const u = basicArr.find(b => b.key === 'username');
                    const p = basicArr.find(b => b.key === 'password');
                    if (u) username = u.value;
                    if (p) password = p.value;
                }
                return { type: 'basic', basicUsername: username, basicPassword: password };
            }
            if (authType === 'apikey') {
                const apiArr = authObj.apikey || [];
                let keyName = '';
                let keyValue = '';
                let inWhere = 'header';
                if (Array.isArray(apiArr)) {
                    const k = apiArr.find(b => b.key === 'key');
                    const v = apiArr.find(b => b.key === 'value');
                    const w = apiArr.find(b => b.key === 'in');
                    if (k) keyName = k.value;
                    if (v) keyValue = v.value;
                    if (w && (w.value === 'query' || w.value === 'header')) inWhere = w.value;
                }
                return { type: 'apiKey', apiKeyName: keyName, apiKeyValue: keyValue, apiKeyAddTo: inWhere };
            }
            return { type: 'none' };
        };

        const parsePostmanBody = (bodyObj) => {
            const defaultBody = {
                type: 'none',
                rawText: '',
                rawType: 'application/json',
                formData: [],
                urlEncoded: []
            };
            if (!bodyObj || typeof bodyObj !== 'object') return defaultBody;
            const mode = bodyObj.mode;
            if (mode === 'raw') {
                const rawLanguage = bodyObj.options?.raw?.language || 'json';
                const rawType = rawLanguage === 'json' ? 'application/json' : (rawLanguage === 'xml' ? 'application/xml' : 'text/plain');
                return {
                    type: rawLanguage === 'json' ? 'json' : 'raw',
                    rawText: typeof bodyObj.raw === 'string' ? bodyObj.raw : JSON.stringify(bodyObj.raw, null, 2),
                    rawType,
                    formData: [],
                    urlEncoded: []
                };
            }
            if (mode === 'urlencoded') {
                const urlEncoded = Array.isArray(bodyObj.urlencoded) ? bodyObj.urlencoded.map(u => ({
                    id: 'urlenc_' + Math.random().toString(36).substring(2, 9),
                    key: u.key || '',
                    value: u.value !== undefined ? String(u.value) : '',
                    enabled: u.disabled !== true,
                    description: u.description || ''
                })) : [];
                return {
                    type: 'x-www-form-urlencoded',
                    rawText: '',
                    rawType: 'application/json',
                    formData: [],
                    urlEncoded
                };
            }
            if (mode === 'formdata') {
                const formData = Array.isArray(bodyObj.formdata) ? bodyObj.formdata.map(f => ({
                    id: 'fdata_' + Math.random().toString(36).substring(2, 9),
                    key: f.key || '',
                    value: f.value !== undefined ? String(f.value) : '',
                    enabled: f.disabled !== true,
                    type: f.type === 'file' ? 'file' : 'text'
                })) : [];
                return {
                    type: 'form-data',
                    rawText: '',
                    rawType: 'application/json',
                    formData,
                    urlEncoded: []
                };
            }
            return defaultBody;
        };

        const parsePostmanEvents = (events) => {
            let testsScript = '';
            if (!Array.isArray(events)) return testsScript;
            events.forEach(ev => {
                if (ev.listen === 'test' && ev.script && ev.script.exec) {
                    const code = Array.isArray(ev.script.exec) ? ev.script.exec.join('\n') : String(ev.script.exec);
                    testsScript += (testsScript ? '\n\n' : '') + code;
                }
            });
            return testsScript || 'pm.test("Status is 200", () => pm.response.to.have.status(200));';
        };

        const parsePostmanItemTreeRecursive = (items, collectionId, parentFolderId) => {
            const folders = [];
            const requests = [];

            if (!Array.isArray(items)) return { folders, requests };

            items.forEach(item => {
                if (Array.isArray(item.item)) {
                    const folderId = 'fld_' + Math.random().toString(36).substring(2, 9);
                    const sub = parsePostmanItemTreeRecursive(item.item, collectionId, folderId);
                    folders.push({
                        id: folderId,
                        collectionId,
                        parentFolderId: parentFolderId || null,
                        name: item.name || 'Untitled Folder',
                        requests: sub.requests,
                        subFolders: sub.folders,
                        createdAt: new Date().toISOString()
                    });
                    requests.push(...sub.requests);
                } else if (item.request) {
                    const reqObj = item.request;
                    const method = (typeof reqObj.method === 'string' ? reqObj.method.toUpperCase() : 'GET');
                    
                    let url = '';
                    const params = [];
                    if (typeof reqObj.url === 'string') {
                        url = reqObj.url;
                    } else if (reqObj.url && typeof reqObj.url === 'object') {
                        url = reqObj.url.raw || '';
                        if (Array.isArray(reqObj.url.query)) {
                            reqObj.url.query.forEach(q => {
                                params.push({
                                    id: 'param_' + Math.random().toString(36).substring(2, 9),
                                    key: q.key || '',
                                    value: q.value !== undefined ? String(q.value) : '',
                                    enabled: q.disabled !== true,
                                    description: q.description || ''
                                });
                            });
                        }
                    }

                    try {
                        if (url) {
                            const uObj = new URL(url.startsWith('http') ? url : 'https://' + url);
                            url = uObj.origin + uObj.pathname;
                        }
                    } catch (e) {}

                    const headers = parsePostmanHeaders(reqObj.header);
                    const auth = parsePostmanAuth(reqObj.auth);
                    const body = parsePostmanBody(reqObj.body);
                    const testsScript = parsePostmanEvents(item.event);

                    requests.push({
                        id: 'req_' + Math.random().toString(36).substring(2, 9),
                        collectionId,
                        folderId: parentFolderId || null,
                        name: item.name || 'Untitled Request',
                        method,
                        url,
                        params,
                        headers,
                        body,
                        auth,
                        preRequestScript: '',
                        testsScript,
                        createdAt: new Date().toISOString()
                    });
                }
            });

            return { folders, requests };
        };

        const parsePostmanCollectionFull = (json) => {
            const colId = 'col_' + Date.now();
            const colName = (json.info && json.info.name) ? json.info.name : 'Imported Postman Collection';
            const colDesc = (json.info && json.info.description) ? (typeof json.info.description === 'string' ? json.info.description : json.info.description.content) : '';
            const { folders, requests } = parsePostmanItemTreeRecursive(json.item || [], colId, null);

            return {
                id: colId,
                name: colName,
                description: colDesc,
                folders,
                requests,
                auth: parsePostmanAuth(json.auth),
                variables: (json.variable || []).map(v => ({
                    id: 'var_' + Math.random().toString(36).substring(2, 9),
                    key: v.key || '',
                    value: v.value !== undefined ? String(v.value) : '',
                    enabled: v.disabled !== true
                }))
            };
        };

        const parsePostmanEnvironment = (json) => {
            const name = json.name || 'Imported Environment';
            const isGlobal = json._postman_variable_scope === 'globals';
            const variables = (json.values || []).map(v => ({
                id: 'var_' + Math.random().toString(36).substring(2, 9),
                key: v.key || '',
                value: v.value !== undefined ? String(v.value) : '',
                initialValue: v.value !== undefined ? String(v.value) : '',
                enabled: v.enabled !== false,
                isSecret: v.type === 'secret'
            })).filter(v => !!v.key);

            return {
                id: isGlobal ? 'env_global' : 'env_' + Date.now(),
                name,
                isGlobal,
                variables,
                createdAt: new Date().toISOString()
            };
        };

        const parseOpenApiSpec = (json) => {
            const colName = (json.info && json.info.title) ? json.info.title : 'OpenAPI Imported Collection';
            const requests = [];
            const folders = [];

            let baseUrl = 'https://api.example.com';
            if (json.servers && json.servers[0] && json.servers[0].url) {
                baseUrl = json.servers[0].url;
            } else if (json.host) {
                const scheme = (json.schemes && json.schemes[0]) ? json.schemes[0] : 'https';
                const basePath = json.basePath || '';
                baseUrl = `${scheme}://${json.host}${basePath}`;
            }

            const paths = json.paths || {};
            Object.keys(paths).forEach(path => {
                const operations = paths[path];
                Object.keys(operations).forEach(method => {
                    if (['get', 'post', 'put', 'delete', 'patch', 'options', 'head'].includes(method.toLowerCase())) {
                        const op = operations[method];
                        const headers = [];
                        const params = [];
                        const body = {
                            type: 'none',
                            rawText: '',
                            rawType: 'application/json',
                            formData: [],
                            urlEncoded: []
                        };

                        const parameters = op.parameters || [];
                        parameters.forEach(p => {
                            if (p.in === 'header') {
                                headers.push({
                                    id: 'hdr_' + Math.random().toString(36).substring(2, 9),
                                    key: p.name,
                                    value: p.default !== undefined ? String(p.default) : '',
                                    enabled: true,
                                    description: p.description || ''
                                });
                            } else if (p.in === 'query') {
                                params.push({
                                    id: 'param_' + Math.random().toString(36).substring(2, 9),
                                    key: p.name,
                                    value: p.default !== undefined ? String(p.default) : '',
                                    enabled: true,
                                    description: p.description || ''
                                });
                            }
                        });

                        if (op.requestBody && op.requestBody.content) {
                            const content = op.requestBody.content;
                            if (content['application/json']) {
                                body.type = 'json';
                                body.rawType = 'application/json';
                                const schema = content['application/json'].schema;
                                if (schema && schema.example) {
                                    body.rawText = JSON.stringify(schema.example, null, 2);
                                } else if (schema && schema.properties) {
                                    const placeholder = {};
                                    Object.keys(schema.properties).forEach(prop => {
                                        placeholder[prop] = schema.properties[prop].type || 'string';
                                    });
                                    body.rawText = JSON.stringify(placeholder, null, 2);
                                } else {
                                    body.rawText = '{}';
                                }
                            } else if (content['application/x-www-form-urlencoded']) {
                                body.type = 'x-www-form-urlencoded';
                                const schema = content['application/x-www-form-urlencoded'].schema;
                                if (schema && schema.properties) {
                                    Object.keys(schema.properties).forEach(prop => {
                                        body.urlEncoded.push({
                                            id: 'urlenc_' + Math.random().toString(36).substring(2, 9),
                                            key: prop,
                                            value: '',
                                            enabled: true
                                        });
                                    });
                                }
                            }
                        }

                        requests.push({
                            id: 'req_' + Math.random().toString(36).substring(2, 9),
                            name: op.summary || op.operationId || `${method.toUpperCase()} ${path}`,
                            method: method.toUpperCase(),
                            url: baseUrl.replace(/\/$/, '') + path,
                            params,
                            headers,
                            body,
                            auth: { type: 'none' },
                            preRequestScript: '',
                            testsScript: 'pm.test("Status is 200", () => pm.response.to.have.status(200));'
                        });
                    }
                });
            });

            return {
                id: 'col_' + Date.now(),
                name: colName,
                folders,
                requests,
                auth: { type: 'none' },
                variables: []
            };
        };

        const handleImport = () => {
            const raw = importText.value.trim();
            if (!raw) return;

            // Detect single cURL Command
            if (raw.toLowerCase().startsWith('curl') || raw.toLowerCase().match(/^\s*curl/)) {
                try {
                    const importedReq = parseCurlCommand(raw);
                    let targetCol = collections.value[0];
                    if (!targetCol) {
                        targetCol = {
                            id: 'col_' + Date.now(),
                            name: 'Imported cURL Requests',
                            folders: [],
                            requests: []
                        };
                        collections.value.push(targetCol);
                    }
                    importedReq.collectionId = targetCol.id;
                    targetCol.requests.push(importedReq);
                    activeRequest.value = importedReq;
                    
                    saveStateToServer();
                    activeModal.value = null;
                    importText.value = '';
                    alert('cURL command imported successfully into collection: ' + targetCol.name);
                } catch (err) {
                    alert('Failed to parse cURL command: ' + err.message);
                }
                return;
            }

            try {
                const parsed = JSON.parse(raw);

                // Check for Postman Environment or Globals
                if (parsed._postman_variable_scope === 'environment' || parsed._postman_variable_scope === 'globals' || (parsed.values && parsed.name && parsed._postman_variable_scope)) {
                    const newEnv = parsePostmanEnvironment(parsed);
                    if (newEnv.isGlobal) {
                        const existingGlobalIdx = environments.value.findIndex(e => e.isGlobal || e.id === 'env_global');
                        if (existingGlobalIdx > -1) {
                            environments.value[existingGlobalIdx].variables.push(...newEnv.variables);
                        } else {
                            environments.value.unshift(newEnv);
                        }
                    } else {
                        environments.value.push(newEnv);
                        activeEnvId.value = newEnv.id;
                    }
                    saveStateToServer();
                    activeModal.value = null;
                    importText.value = '';
                    alert('Postman environment/globals imported successfully!');
                    return;
                }

                // Check for OpenAPI / Swagger specs
                if (parsed.openapi || parsed.swagger || parsed.paths) {
                    const newCol = parseOpenApiSpec(parsed);
                    collections.value.push(newCol);
                    if (newCol.requests.length > 0) {
                        activeRequest.value = newCol.requests[0];
                    }
                    saveStateToServer();
                    activeModal.value = null;
                    importText.value = '';
                    alert(`OpenAPI specification imported successfully! Created collection "${newCol.name}" with ${newCol.requests.length} requests.`);
                    return;
                }

                // Check for standard Postman Collection
                if (parsed.item || parsed.info) {
                    const newCol = parsePostmanCollectionFull(parsed);
                    collections.value.push(newCol);
                    if (newCol.requests.length > 0) {
                        activeRequest.value = newCol.requests[0];
                    }
                    saveStateToServer();
                    activeModal.value = null;
                    importText.value = '';
                    alert(`Postman Collection "${newCol.name}" imported successfully with ${newCol.requests.length} requests and ${newCol.folders.length} folders.`);
                    return;
                }

                // CloudPost Full Backup or standard array of collections
                if (Array.isArray(parsed)) {
                    collections.value.push(...parsed);
                } else if (parsed.format === 'cloudpost_backup') {
                    if (parsed.workspaces) workspaces.value = parsed.workspaces;
                    if (parsed.collections) collections.value = parsed.collections;
                    if (parsed.environments) environments.value = parsed.environments;
                } else if (parsed.format === 'cloudpost_collection' && parsed.collection) {
                    collections.value.push(parsed.collection);
                } else {
                    alert('Unrecognized JSON format. Please provide a standard Postman Collection, Environment, OpenAPI spec, or CloudPost Backup.');
                    return;
                }

                saveStateToServer();
                activeModal.value = null;
                importText.value = '';
                alert('Data imported successfully!');
            } catch (err) {
                alert('Invalid JSON input: ' + err.message);
            }
        };

        const isDragOver = ref(false);

        const handleFileInputChange = (event) => {
            const file = event.target.files && event.target.files[0];
            if (file) {
                readFileForImport(file);
            }
        };

        const handleFileDrop = (event) => {
            isDragOver.value = false;
            const file = event.dataTransfer.files && event.dataTransfer.files[0];
            if (file) {
                readFileForImport(file);
            }
        };

        const readFileForImport = (file) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                importText.value = e.target.result || '';
                handleImport();
            };
            reader.readAsText(file);
        };

        const convertColToPostmanV2Js = (col) => {
            const mapReq = (r) => ({
                name: r.name || 'Untitled Request',
                request: {
                    method: r.method || 'GET',
                    header: (r.headers || []).filter(h => h.key && h.enabled !== false).map(h => ({
                        key: h.key,
                        value: h.value || '',
                        type: 'text'
                    })),
                    url: {
                        raw: r.url || '',
                        query: (r.params || []).filter(p => p.key && p.enabled !== false).map(p => ({
                            key: p.key,
                            value: p.value || ''
                        }))
                    },
                    body: r.body && (r.body.type === 'raw' || r.body.type === 'json') ? {
                        mode: 'raw',
                        raw: r.body.rawText || '',
                        options: { raw: { language: (r.body.rawType === 'application/json' || r.body.type === 'json') ? 'json' : 'text' } }
                    } : (r.body && r.body.type === 'x-www-form-urlencoded' ? {
                        mode: 'urlencoded',
                        urlencoded: (r.body.urlEncoded || []).map(u => ({ key: u.key, value: u.value, disabled: !u.enabled }))
                    } : undefined)
                }
            });

            const mapFolder = (f) => ({
                name: f.name || 'Folder',
                item: [
                    ...(f.subFolders || []).map(mapFolder),
                    ...(f.requests || []).map(mapReq)
                ]
            });

            return {
                info: {
                    _postman_id: col.id || ('col_' + Date.now()),
                    name: col.name || 'CloudPost Collection',
                    description: col.description || 'Exported from CloudPost',
                    schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json'
                },
                item: [
                    ...(col.folders || []).map(mapFolder),
                    ...(col.requests || []).map(mapReq)
                ]
            };
        };

        const exportPostmanCollection = () => {
            const targetCol = (shareTargetType.value === 'collection' && shareTargetCollection.value) 
                ? shareTargetCollection.value 
                : (collections.value[0] || { name: 'CloudPost Collection', requests: [], folders: [] });
            
            const postmanJson = convertColToPostmanV2Js(targetCol);
            const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(postmanJson, null, 2));
            const downloadAnchor = document.createElement('a');
            downloadAnchor.setAttribute("href", dataStr);
            downloadAnchor.setAttribute("download", `${(targetCol.name || 'collection').toLowerCase().replace(/\s+/g, '_')}_postman_v2.json`);
            document.body.appendChild(downloadAnchor);
            downloadAnchor.click();
            downloadAnchor.remove();
        };

        const exportCloudPostCollection = () => {
            const targetCol = (shareTargetType.value === 'collection' && shareTargetCollection.value) 
                ? shareTargetCollection.value 
                : (collections.value[0] || { name: 'CloudPost Collection', requests: [], folders: [] });
            
            const customExport = {
                format: 'cloudpost_collection',
                version: '2.5.0',
                exportedAt: new Date().toISOString(),
                client: 'CloudPost Studio',
                collection: targetCol
            };
            const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(customExport, null, 2));
            const downloadAnchor = document.createElement('a');
            downloadAnchor.setAttribute("href", dataStr);
            downloadAnchor.setAttribute("download", `${(targetCol.name || 'collection').toLowerCase().replace(/\s+/g, '_')}.cloudpost.json`);
            document.body.appendChild(downloadAnchor);
            downloadAnchor.click();
            downloadAnchor.remove();
        };

        const clearRecentRequests = () => {
            const guestId = getClientGuestId();
            recentRequests.value = [];
            try {
                localStorage.removeItem('cp_' + guestId + '_recent_requests');
                localStorage.removeItem('cp_' + guestId + '_history');
                localStorage.removeItem('cp_recent_requests');
            } catch (e) {}
            saveStateToServer();
        };

        const loadRecentSnapshot = (rec) => {
            const req = rec.requestSnapshot ? JSON.parse(JSON.stringify(rec.requestSnapshot)) : {
                id: 'req_rec_' + Date.now(),
                name: rec.name || 'Replayed Request',
                method: rec.method,
                url: rec.url,
                params: [],
                headers: [],
                auth: { type: 'none' },
                body: { type: 'none', rawText: '' }
            };
            openRequestInTab(req);
            if (rec.responseSnapshot) {
                activeResponse.value = rec.responseSnapshot;
            }
        };

        const replayRecentRequest = async (rec) => {
            loadRecentSnapshot(rec);
            await nextTick();
            await sendActiveRequest();
        };

        // Quick Auth Presets State & Definitions
        const quickAuthSearch = ref('');
        const quickAuthCategory = ref('all');
        const customQuickToken = ref('');
        const quickAuthApplyMode = ref('both'); // 'both' | 'auth_only' | 'headers_params_only'
        const selectedQuickPreset = ref(null);

        const quickAuthPresets = [
            {
                id: 'oauth2_client_credentials',
                name: 'OAuth 2.0 (Client Credentials Flow)',
                category: 'oauth2',
                description: 'Automated token exchange with Access Token URL, Client ID, and Client Secret.',
                authConfig: {
                    type: 'oauth2',
                    grantType: 'client_credentials',
                    accessTokenUrl: 'api?action=oauth2_token',
                    clientId: '{{clientId}}',
                    clientSecret: '{{clientSecret}}',
                    scope: 'read:all write:all',
                    clientAuth: 'body',
                    oauth2HeaderPrefix: 'Bearer'
                }
            },
            {
                id: 'oauth2_bearer',
                name: 'OAuth 2.0 Bearer Token',
                category: 'oauth2',
                description: 'Standard Authorization: Bearer <token> authentication for modern APIs.',
                authConfig: { type: 'bearer', bearerToken: '{{token}}' },
                headers: [{ key: 'Authorization', value: 'Bearer {{token}}' }]
            },
            {
                id: 'github_pat',
                name: 'GitHub Personal Access Token',
                category: 'oauth2',
                description: 'GitHub REST & GraphQL APIs with recommended API versioning.',
                authConfig: { type: 'bearer', bearerToken: '{{githubToken}}' },
                headers: [
                    { key: 'Authorization', value: 'Bearer {{githubToken}}' },
                    { key: 'X-GitHub-Api-Version', value: '2022-11-28' },
                    { key: 'Accept', value: 'application/vnd.github+json' }
                ]
            },
            {
                id: 'google_oauth',
                name: 'Google APIs (Bearer OAuth)',
                category: 'oauth2',
                description: 'Google Cloud & Workspace APIs using Bearer OAuth Access Tokens.',
                authConfig: { type: 'bearer', bearerToken: '{{googleAccessToken}}' },
                headers: [{ key: 'Authorization', value: 'Bearer {{googleAccessToken}}' }]
            },
            {
                id: 'supabase_jwt',
                name: 'Supabase Anon / Service Role',
                category: 'api_key',
                description: 'Supabase PostgREST & Auth headers (apikey + Authorization: Bearer).',
                authConfig: { type: 'bearer', bearerToken: '{{supabaseAnonKey}}' },
                headers: [
                    { key: 'apikey', value: '{{supabaseAnonKey}}' },
                    { key: 'Authorization', value: 'Bearer {{supabaseAnonKey}}' }
                ]
            },
            {
                id: 'standard_x_api_key',
                name: 'Standard X-API-Key Header',
                category: 'api_key',
                description: 'Standard X-API-Key request header used across countless REST APIs.',
                authConfig: { type: 'apiKey', apiKeyName: 'X-API-Key', apiKeyValue: '{{apiKey}}', apiKeyAddTo: 'header' },
                headers: [{ key: 'X-API-Key', value: '{{apiKey}}' }]
            },
            {
                id: 'openai_api_key',
                name: 'OpenAI API Key',
                category: 'api_key',
                description: 'Bearer token auth for OpenAI GPT-4o, Embeddings, and Audio endpoints.',
                authConfig: { type: 'bearer', bearerToken: '{{openaiApiKey}}' },
                headers: [{ key: 'Authorization', value: 'Bearer {{openaiApiKey}}' }]
            },
            {
                id: 'anthropic_api_key',
                name: 'Anthropic Claude API Key',
                category: 'api_key',
                description: 'x-api-key header and anthropic-version header for Claude 3.5 Sonnet / Haiku.',
                authConfig: { type: 'apiKey', apiKeyName: 'x-api-key', apiKeyValue: '{{anthropicApiKey}}', apiKeyAddTo: 'header' },
                headers: [
                    { key: 'x-api-key', value: '{{anthropicApiKey}}' },
                    { key: 'anthropic-version', value: '2023-06-01' }
                ]
            },
            {
                id: 'stripe_secret_key',
                name: 'Stripe Secret Key',
                category: 'api_key',
                description: 'Bearer token auth with Stripe-Version header for Payments & Customers.',
                authConfig: { type: 'bearer', bearerToken: '{{stripeSecretKey}}' },
                headers: [
                    { key: 'Authorization', value: 'Bearer {{stripeSecretKey}}' },
                    { key: 'Stripe-Version', value: '2023-10-16' }
                ]
            },
            {
                id: 'rapidapi_key',
                name: 'RapidAPI Hub Keys',
                category: 'api_key',
                description: 'X-RapidAPI-Key and X-RapidAPI-Host headers required for RapidAPI endpoints.',
                authConfig: { type: 'apiKey', apiKeyName: 'X-RapidAPI-Key', apiKeyValue: '{{rapidApiKey}}', apiKeyAddTo: 'header' },
                headers: [
                    { key: 'X-RapidAPI-Key', value: '{{rapidApiKey}}' },
                    { key: 'X-RapidAPI-Host', value: '{{rapidApiHost}}' }
                ]
            },
            {
                id: 'query_param_api_key',
                name: 'Query Parameter (?api_key=...)',
                category: 'api_key',
                description: 'Appends ?api_key={{apiKey}} query parameter to the URL for weather/maps APIs.',
                authConfig: { type: 'apiKey', apiKeyName: 'api_key', apiKeyValue: '{{apiKey}}', apiKeyAddTo: 'query' },
                params: [{ key: 'api_key', value: '{{apiKey}}' }]
            },
            {
                id: 'basic_auth',
                name: 'HTTP Basic Authentication',
                category: 'basic',
                description: 'Standard RFC 7617 username and password authentication.',
                authConfig: { type: 'basic', basicUsername: '{{username}}', basicPassword: '{{password}}' }
            }
        ];

        const filteredQuickAuthPresets = computed(() => {
            return quickAuthPresets.filter(p => {
                const matchCat = quickAuthCategory.value === 'all' || p.category === quickAuthCategory.value;
                const matchSearch = !quickAuthSearch.value.trim() ||
                    p.name.toLowerCase().includes(quickAuthSearch.value.toLowerCase()) ||
                    p.description.toLowerCase().includes(quickAuthSearch.value.toLowerCase());
                return matchCat && matchSearch;
            });
        });

        const openQuickAuthModal = (presetId) => {
            if (presetId) {
                selectedQuickPreset.value = quickAuthPresets.find(p => p.id === presetId) || quickAuthPresets[0];
            } else if (!selectedQuickPreset.value) {
                selectedQuickPreset.value = quickAuthPresets[0];
            }
            customQuickToken.value = '';
            activeModal.value = 'quickAuthModal';
            
        };

        const applyQuickAuthPreset = (preset) => {
            if (!activeRequest.value || !preset) return;
            const mode = quickAuthApplyMode.value;
            const token = customQuickToken.value.trim();

            // 1. Apply to Auth tab config
            if (mode === 'both' || mode === 'auth_only') {
                if (preset.authConfig) {
                    const cfg = JSON.parse(JSON.stringify(preset.authConfig));
                    if (token) {
                        if (cfg.bearerToken) cfg.bearerToken = token;
                        if (cfg.apiKeyValue) cfg.apiKeyValue = token;
                    }
                    activeRequest.value.auth = cfg;
                }
            }

            // 2. Apply to Headers
            if (mode === 'both' || mode === 'headers_params_only') {
                if (preset.headers && preset.headers.length) {
                    if (!activeRequest.value.headers) activeRequest.value.headers = [];
                    preset.headers.forEach(h => {
                        const val = token && h.value.includes('{{') ? token : h.value;
                        const existingIdx = activeRequest.value.headers.findIndex(item => item.key.toLowerCase() === h.key.toLowerCase());
                        if (existingIdx >= 0) {
                            activeRequest.value.headers[existingIdx].value = val;
                            activeRequest.value.headers[existingIdx].enabled = true;
                        } else {
                            activeRequest.value.headers.push({ key: h.key, value: val, enabled: true });
                        }
                    });
                }

                // 3. Apply to Query Params
                if (preset.params && preset.params.length) {
                    if (!activeRequest.value.params) activeRequest.value.params = [];
                    preset.params.forEach(p => {
                        const val = token && p.value.includes('{{') ? token : p.value;
                        const existingIdx = activeRequest.value.params.findIndex(item => item.key.toLowerCase() === p.key.toLowerCase());
                        if (existingIdx >= 0) {
                            activeRequest.value.params[existingIdx].value = val;
                            activeRequest.value.params[existingIdx].enabled = true;
                        } else {
                            activeRequest.value.params.push({ key: p.key, value: val, enabled: true });
                        }
                    });
                    syncParamsToUrl();
                }
            }

            activeModal.value = null;
            requestSubTab.value = 'auth';
            
        };

        const applyQuickAuthPresetById = (id) => {
            const p = quickAuthPresets.find(item => item.id === id);
            if (p) {
                applyQuickAuthPreset(p);
            }
        };

        // OAuth 2.0 Flow State & Methods
        const isRetrievingOAuthToken = ref(false);
        const oauthTokenError = ref(null);
        const oauthTokenSuccess = ref(null);
        const showOAuthSecret = ref(false);
        const showOAuthRawResponse = ref(false);
        const copiedOAuthToken = ref(false);
        const savedOAuthToVar = ref(false);

        const requestOAuth2TokenPhp = async () => {
            if (!activeRequest.value || !activeRequest.value.auth) return;
            const auth = activeRequest.value.auth;
            const targetUrl = resolveVariables(auth.accessTokenUrl || '');
            if (!targetUrl) {
                oauthTokenError.value = { error: 'missing_url', description: 'Please provide an Access Token URL' };
                return;
            }
            isRetrievingOAuthToken.value = true;
            oauthTokenError.value = null;
            oauthTokenSuccess.value = null;

            try {
                const payload = {
                    targetTokenUrl: targetUrl,
                    clientId: resolveVariables(auth.clientId || ''),
                    clientSecret: resolveVariables(auth.clientSecret || ''),
                    grantType: auth.grantType || 'client_credentials',
                    scope: resolveVariables(auth.scope || ''),
                    audience: resolveVariables(auth.audience || ''),
                    username: resolveVariables(auth.username || ''),
                    password: resolveVariables(auth.password || ''),
                    refreshToken: resolveVariables(auth.refreshToken || ''),
                    clientAuth: auth.clientAuth || 'body'
                };

                const startTime = performance.now();
                const resp = await fetch('api?action=oauth2_token', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });

                const elapsed = Math.round(performance.now() - startTime);
                const data = await resp.json();

                if (data.error) {
                    oauthTokenError.value = {
                        error: data.error,
                        description: data.error_description || data.message || 'Token retrieval failed'
                    };
                    return;
                }

                const token = data.access_token || data.token || data.id_token || '';
                if (!token) {
                    oauthTokenError.value = {
                        error: 'invalid_response',
                        description: 'Server response did not contain access_token.'
                    };
                    return;
                }

                auth.oauth2Token = token;
                auth.oauth2RawResponse = data;
                auth.oauth2ExpiresAt = data.expires_in ? Date.now() + (data.expires_in * 1000) : null;
                if (!auth.oauth2HeaderPrefix) auth.oauth2HeaderPrefix = 'Bearer';

                oauthTokenSuccess.value = {
                    message: 'Access token retrieved successfully!',
                    expiresIn: data.expires_in,
                    time: elapsed
                };

                saveActiveRequest();
            } catch (err) {
                oauthTokenError.value = {
                    error: 'network_error',
                    description: err.message || 'Network error occurred while fetching token'
                };
            } finally {
                isRetrievingOAuthToken.value = false;
            }
        };

        const copyOAuthToken = () => {
            if (!activeRequest.value || !activeRequest.value.auth || !activeRequest.value.auth.oauth2Token) return;
            if (navigator.clipboard) {
                navigator.clipboard.writeText(activeRequest.value.auth.oauth2Token);
                copiedOAuthToken.value = true;
                setTimeout(() => { copiedOAuthToken.value = false; }, 2000);
            }
        };

        const saveOAuthTokenToVar = (varName = 'accessToken') => {
            if (!activeRequest.value || !activeRequest.value.auth || !activeRequest.value.auth.oauth2Token) return;
            const tok = activeRequest.value.auth.oauth2Token;
            if (activeEnv.value) {
                if (!activeEnv.value.variables) activeEnv.value.variables = [];
                let v = activeEnv.value.variables.find(item => item.key === varName);
                if (v) {
                    v.value = tok;
                    v.enabled = true;
                } else {
                    activeEnv.value.variables.push({ id: 'var_' + Date.now(), key: varName, value: tok, type: 'secret', enabled: true });
                }
                saveEnvironments();
                savedOAuthToVar.value = true;
                setTimeout(() => { savedOAuthToVar.value = false; }, 2500);
            }
        };

        const clearOAuthToken = () => {
            if (!activeRequest.value || !activeRequest.value.auth) return;
            activeRequest.value.auth.oauth2Token = '';
            activeRequest.value.auth.oauth2RawResponse = null;
            activeRequest.value.auth.oauth2ExpiresAt = null;
            oauthTokenSuccess.value = null;
            oauthTokenError.value = null;
            saveActiveRequest();
        };

        const setOAuthPreset = (presetKey) => {
            if (!activeRequest.value) return;
            if (!activeRequest.value.auth) activeRequest.value.auth = { type: 'oauth2' };
            activeRequest.value.auth.type = 'oauth2';
            
            if (presetKey === 'mock') {
                activeRequest.value.auth.accessTokenUrl = 'api?action=oauth2_token';
                activeRequest.value.auth.clientId = 'cloudpost_client_demo';
                activeRequest.value.auth.clientSecret = 'cp_sec_' + Math.random().toString(36).substring(2, 10);
                activeRequest.value.auth.grantType = 'client_credentials';
                activeRequest.value.auth.scope = 'read:all write:all offline_access';
                activeRequest.value.auth.clientAuth = 'body';
                activeRequest.value.auth.oauth2HeaderPrefix = 'Bearer';
            } else if (presetKey === 'auth0') {
                activeRequest.value.auth.accessTokenUrl = 'https://your-tenant.auth0.com/oauth/token';
                activeRequest.value.auth.clientId = '{{auth0ClientId}}';
                activeRequest.value.auth.clientSecret = '{{auth0ClientSecret}}';
                activeRequest.value.auth.audience = 'https://api.mycompany.com';
                activeRequest.value.auth.grantType = 'client_credentials';
                activeRequest.value.auth.scope = 'read:messages write:messages';
                activeRequest.value.auth.clientAuth = 'body';
                activeRequest.value.auth.oauth2HeaderPrefix = 'Bearer';
            } else if (presetKey === 'google') {
                activeRequest.value.auth.accessTokenUrl = 'https://oauth2.googleapis.com/token';
                activeRequest.value.auth.clientId = '{{googleClientId}}';
                activeRequest.value.auth.clientSecret = '{{googleClientSecret}}';
                activeRequest.value.auth.grantType = 'refresh_token';
                activeRequest.value.auth.refreshToken = '{{googleRefreshToken}}';
                activeRequest.value.auth.scope = 'https://www.googleapis.com/auth/userinfo.profile';
                activeRequest.value.auth.clientAuth = 'body';
                activeRequest.value.auth.oauth2HeaderPrefix = 'Bearer';
            } else if (presetKey === 'azure') {
                activeRequest.value.auth.accessTokenUrl = 'https://login.microsoftonline.com/{{tenantId}}/oauth2/v2.0/token';
                activeRequest.value.auth.clientId = '{{azureClientId}}';
                activeRequest.value.auth.clientSecret = '{{azureClientSecret}}';
                activeRequest.value.auth.grantType = 'client_credentials';
                activeRequest.value.auth.scope = 'https://graph.microsoft.com/.default';
                activeRequest.value.auth.clientAuth = 'body';
                activeRequest.value.auth.oauth2HeaderPrefix = 'Bearer';
            } else if (presetKey === 'github') {
                activeRequest.value.auth.accessTokenUrl = 'https://github.com/login/oauth/access_token';
                activeRequest.value.auth.clientId = '{{githubClientId}}';
                activeRequest.value.auth.clientSecret = '{{githubClientSecret}}';
                activeRequest.value.auth.grantType = 'client_credentials';
                activeRequest.value.auth.scope = 'repo user';
                activeRequest.value.auth.clientAuth = 'body';
                activeRequest.value.auth.oauth2HeaderPrefix = 'Bearer';
            }
        };

        const guestRestrictionMessage = ref('');
        const promptGuestRestriction = (msg) => {
            guestRestrictionMessage.value = msg || 'Guest users cannot perform this action. Please sign in or register.';
            activeModal.value = 'guestRestrictionModal';
        };

        const openModal = (name) => {
            if ((name === 'newWorkspaceModal' || name === 'shareWorkspaceModal') && (!currentDemoUser.value || !currentDemoUser.value.isLoggedIn)) {
                promptGuestRestriction(name === 'newWorkspaceModal'
                    ? 'Guest users cannot create new workspaces. Please sign in or register to create team and personal workspaces.'
                    : 'Guest users cannot share workspaces or invite collaborators. Please sign in or register to collaborate in real-time.');
                return;
            }
            activeModal.value = name;
        };
        const openRunnerModal = () => { showRunnerModal.value = true;  };
        const toggleCollectionCollapse = (id) => { collapsedCollections.value[id] = !collapsedCollections.value[id];  };
        const toggleFolderCollapse = (id) => { collapsedFolders.value[id] = !collapsedFolders.value[id];  };
        const formatBytes = (b) => b ? (b < 1024 ? b + ' B' : (b/1024).toFixed(2) + ' KB') : '0 B';
        const formatTime = (iso) => iso ? new Date(iso).toLocaleTimeString() : '';
        const getMethodBadgeColor = (m) => ({ GET: 'bg-emerald-500/20 text-emerald-400', POST: 'bg-orange-500/20 text-orange-400', PUT: 'bg-blue-500/20 text-blue-400', DELETE: 'bg-rose-500/20 text-rose-400' }[m] || 'bg-zinc-700 text-zinc-300');
        const getMethodBadgeClass = getMethodBadgeColor;
        const getStatusBadgeColor = (s) => (s >= 200 && s < 300 ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' : 'bg-rose-500/10 text-rose-400 border-rose-500/30');

        const getTabStatusStyle = (s) => {
            if (s === undefined || s === null) return null;
            const num = Number(s);
            if (num >= 200 && num < 300) {
                return {
                    container: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
                    dot: 'bg-emerald-400',
                    text: num
                };
            }
            if (num >= 300 && num < 400) {
                return {
                    container: 'bg-sky-500/15 text-sky-400 border-sky-500/30',
                    dot: 'bg-sky-400',
                    text: num
                };
            }
            if (num >= 400 && num < 500) {
                return {
                    container: 'bg-rose-500/15 text-rose-400 border-rose-500/30',
                    dot: 'bg-rose-400',
                    text: num
                };
            }
            if (num >= 500) {
                return {
                    container: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
                    dot: 'bg-rose-400',
                    text: num
                };
            }
            return {
                container: 'bg-rose-500/15 text-rose-400 border-rose-500/30',
                dot: 'bg-rose-400',
                text: num === 0 ? 'ERR' : num
            };
        };

        const getTabStatusCode = (tab) => {
            if (!tab) return undefined;
            if (tab.lastStatus !== undefined) return tab.lastStatus;
            if (activeTabId.value === tab.id && activeResponse.value) {
                return activeResponse.value.status;
            }
            return undefined;
        };

        const getTabStatusText = (tab) => {
            if (!tab) return '';
            if (tab.lastStatusText !== undefined) return tab.lastStatusText;
            if (activeTabId.value === tab.id && activeResponse.value) {
                return activeResponse.value.statusText || '';
            }
            return '';
        };

        onMounted(() => {
            // 1. Check & restore local offline state strictly isolated per guest/user session
            try {
                // Purge any un-isolated legacy test keys
                localStorage.removeItem('cp_recent_requests');
                localStorage.removeItem('cp_activity_logs');

                const guestId = getClientGuestId();
                const localSaved = localStorage.getItem('cp_php_' + guestId + '_state') || localStorage.getItem('cp_php_local_state');
                if (localSaved) {
                    const parsed = JSON.parse(localSaved);
                    if (parsed.workspaces && parsed.workspaces.length) workspaces.value = parsed.workspaces;
                    if (parsed.collections && parsed.collections.length) collections.value = parsed.collections;
                    if (parsed.environments && parsed.environments.length) environments.value = parsed.environments;
                    if (parsed.recentRequests && parsed.recentRequests.length) recentRequests.value = parsed.recentRequests;
                    if (parsed.tabs && parsed.tabs.length) tabs.value = parsed.tabs;
                    if (parsed.activeTabId) activeTabId.value = parsed.activeTabId;
                } else {
                    const scopedRecent = localStorage.getItem('cp_' + guestId + '_recent_requests');
                    if (scopedRecent) {
                        try {
                            const parsed = JSON.parse(scopedRecent);
                            if (Array.isArray(parsed) && parsed.length) recentRequests.value = parsed;
                        } catch (e) {}
                    }
                    const cpCols = localStorage.getItem('cp_collections');
                    if (cpCols) {
                        try {
                            const parsed = JSON.parse(cpCols);
                            if (Array.isArray(parsed) && parsed.length) collections.value = parsed;
                        } catch (e) {}
                    }
                    const cpTabs = localStorage.getItem('cp_tabs');
                    if (cpTabs) {
                        try {
                            const parsed = JSON.parse(cpTabs);
                            if (Array.isArray(parsed) && parsed.length) tabs.value = parsed;
                        } catch (e) {}
                    }
                    const cpActiveTab = localStorage.getItem('cp_active_tab_id');
                    if (cpActiveTab) activeTabId.value = cpActiveTab;
                }
            } catch (e) {}

            updatePendingSyncCount();

            // 2. Register Service Worker for Offline Execution & Asset Caching
            if ('serviceWorker' in navigator && window.location.protocol.startsWith('http')) {
                navigator.serviceWorker.register('sw.js').then((reg) => {
                    if (reg && reg.update) reg.update();
                    console.log('[CloudPost PHP PWA] Service Worker registered with scope:', reg.scope);
                }).catch((err) => {
                    console.log('[CloudPost PHP PWA] Service worker registration info:', err);
                });
            }

            // 3. Listen for Online / Offline events
            window.addEventListener('online', () => {
                isOnline.value = true;
                syncPendingOutbox();
                
            });

            window.addEventListener('offline', () => {
                isOnline.value = false;
                
            });

            // 4. Listen for PWA Install Prompt
            window.addEventListener('beforeinstallprompt', (e) => {
                e.preventDefault();
                deferredInstallPrompt = e;
                canInstallPwa.value = true;
                
            });

            window.addEventListener('appinstalled', () => {
                isInstalled.value = true;
                canInstallPwa.value = false;
                deferredInstallPrompt = null;
            });

            // Prevent any URL status bar display leaks globally
            window.defaultStatus = '';
            document.addEventListener('mouseover', () => { window.status = ''; }, true);

            // Responsive keyboard shortcut (Ctrl+\ or Cmd+\ to toggle sidebar)
            window.addEventListener('keydown', (e) => {
                if ((e.ctrlKey || e.metaKey) && e.key === '\\') {
                    e.preventDefault();
                    isSidebarOpen.value = !isSidebarOpen.value;
                }
            });

            // 5. Incoming Short Link Share Resolver (?s=... or ?share_id=...)
            try {
                const searchParams = new URLSearchParams(window.location.search);
                const sParam = searchParams.get('s') || searchParams.get('share_id');
                if (sParam) {
                    const baseUrl = window.location.origin + window.location.pathname.replace(/\/([^\/]*\.php)?$/, '/');
                    fetch(`${baseUrl}api.php?action=get_short_link&s=${encodeURIComponent(sParam)}`)
                        .then(r => r.json())
                        .then(res => {
                            if (res && res.success && res.data) {
                                if (res.type === 'collection' || res.data.requests) {
                                    const col = res.data;
                                    const idx = collections.value.findIndex(c => c.id === col.id || c.name === col.name);
                                    if (idx >= 0) {
                                        collections.value[idx] = col;
                                    } else {
                                        collections.value.unshift(col);
                                    }
                                    saveCollections();
                                    triggerNotification(`Shared collection "${col.name}" imported successfully!`);
                                } else {
                                    const req = res.data;
                                    openNewRequestTab(req);
                                    triggerNotification(`Shared request "${req.name}" loaded!`);
                                }
                                if (window.history.replaceState) {
                                    window.history.replaceState({}, '', window.location.pathname);
                                }
                            }
                        })
                        .catch(err => {
                            console.warn('Could not resolve short link:', err);
                        });
                }
            } catch (e) {}
        });

        const navigate = (path) => {
            window.status = '';
            if (path === '/') {
                window.location.href = '/';
            } else if (path === '/saas-users') {
                window.location.href = 'saas-users';
            } else if (path === '/saas-reports') {
                window.location.href = 'saas-reports';
            } else if (path === '/register') {
                window.location.href = 'register';
            } else if (path === '/diagnostic') {
                window.location.href = 'diagnostic';
            } else if (path === '/auth?action=logout') {
                window.location.href = 'auth?action=logout';
            } else {
                window.location.href = path;
            }
        };

        return {
            renderIcon,
            navigate,
            currentView, activeModal, showWorkspaceDropdown, showEnvDropdown, showUserDropdown, showRunnerModal, sidebarTab, sidebarSearch,
            activeCorsTab, selectedCorsFramework, corsCodeCopied, openCorsModal, copyCorsCode, corsSnippets,
            requestSubTab, responseSubTab, selectedCodeLang, importExportTab, importText, isLoading, isSaving, runnerRunning,
            primaryBodyType, rawBodyFormat,
            paramsBulkMode, paramsBulkText, headersBulkMode, headersBulkText, urlEncodedBulkMode, urlEncodedBulkText, formDataBulkMode, formDataBulkText,
            toggleParamsBulkMode, toggleHeadersBulkMode, toggleUrlEncodedBulkMode, toggleFormDataBulkMode, handleFileSelection,
            sandboxPresets, sandboxMethod, sandboxUrl, sandboxBody, sandboxLoading, sandboxResponse, applySandboxPreset, sendSandboxRequest, sandboxFormattedResponse,
            workspaces, activeWorkspaceId, activeWorkspace, environments, activeEnvId, activeEnv, collections,
            collapsedCollections, collapsedFolders, recentRequests, runnerSelectedCollectionId, tabs, activeTabId, activeTab, activeRequest, activeResponse,
            openArchitectureTab, openSaaSUsersTab, openSaaSReportsTab, openRegisterTab, openDiagnosticTab, isSaaSAdmin,
            guestShortCode, requestGuestResetConfirmation, confirmGuestReset,
            diagnosticScanning, dbConnected, dbTesting, dbTestResult, dbTestConfig, runDiagnosticScan, testDbConnection,
            archSubTab, sqlCopied, copySqlSchema,
            currentDemoUser, switchToDemoUser, saasSearch, saasPlanFilter, saasSortBy, saasCustomers, filteredSaaSCustomers, saasMetrics,
            financialLedger, registerForm, registerSuccess, handleRegisterSubmit, exportSaaSCsv, exportFinancialCsv,
            filteredCollections, filteredRecentRequests, sendActiveRequest, prettyFormattedResponse, rawResponseBody, generatedCodeSnippet,
            openRequestInTab, closeTab, createNewBlankTab, openModal, openRunnerModal, toggleCollectionCollapse, toggleFolderCollapse, formatBytes, formatTime, getMethodBadgeColor, getStatusBadgeColor,
            getTabStatusStyle, getTabStatusCode, getTabStatusText,
            addParamRow, removeParamRow, syncParamsToUrl, syncUrlParams, addHeaderRow, removeHeaderRow, formatJsonBody, saveActiveRequest, saveEnvironments, saveStateToServer,
            addUrlEncodedRow, removeUrlEncodedRow, addFormDataRow, removeFormDataRow,
            selectWorkspace, openCreateRequestModal, runSelectedCollection, handleImport, exportPostmanCollection, exportCloudPostCollection, isDragOver, handleFileInputChange, handleFileDrop, clearRecentRequests, loadRecentSnapshot, replayRecentRequest,
            isOnline, syncStatus, pendingSyncCount, canInstallPwa, isInstalled, promptPwaInstall, syncPendingOutbox,
            quickAuthPresets, quickAuthSearch, quickAuthCategory, customQuickToken, quickAuthApplyMode, selectedQuickPreset,
            filteredQuickAuthPresets, openQuickAuthModal, applyQuickAuthPreset, applyQuickAuthPresetById,
            syncRequestTabTitle, activeParamsCount, activeHeadersCount, hasBodyContent, detectedTokensInUrl, resolvedUrl, missingVars,
            prettyViewMode, indentSize, responseSearchTerm, treeExpandedNodes, responseCopied, isResponseJson, parsedResponseData,
            responsePassedTestsCount, responseFailedTestsCount, toggleTreeNode, expandAllTreeNodes, collapseAllTreeNodes, copyJsonPath,
            copyResponseBody, saveResponseToFile, graphLayout, selectedGraphNode, renderD3Graph, zoomGraphIn, zoomGraphOut, resetGraphZoom,
            setResponseSubTab, exportCodeLang, codeCopied, shareLinkCopied, shareCurlCopied, sharePostmanCopied, quickVarKey, quickVarValue,
            generateCodeSnippetByLang, codeSnippetGenerated, copyCodeSnippet, downloadCodeSnippet, openExportCodeModal, openShareModal,
            openQuickVarModal, saveQuickVar, shareableLinkUrl, shareablePostmanUrl, copyShareLink, copySharePostmanLink, copyShareCurl,
            recentMethodFilter, removeRecentRequest, shareTargetType, shareTargetRequest, shareTargetCollection, exportTargetRequest,
            openExportCodeForRequest, openExportCollectionCodeModal, exportCollectionPostmanJson, openShareRequestModal, openShareCollectionModal,
            newCollectionName, newCollectionDesc, createFolderTargetColId, newFolderName,
            createCollection, openNewFolderModal, createFolder, deleteCollection, deleteFolder, deleteRequest, duplicateRequest, runCollectionQuick,
            activityLogs, openRunnerTab, openCreateFolderModal,
            guestRestrictionMessage, promptGuestRestriction,
            // Environment Manager & Variable System
            envModalTargetId, envModalSearch, envModalShowSecrets, envModalNewEnvName, envModalShowNewEnv, envModalShowBulk, envModalBulkText, envModalCopied,
            dynamicVariablesCheatsheet, activeEnvTargetName, isCurrentTargetNonGlobalEnv, isCurrentTargetCustomEnv, filteredActiveEnvVariables,
            addVariableToActiveEnv, deleteVariableFromActiveEnv, createNewEnvironment, deleteCurrentEnvironment, handleBulkImportVars, exportActiveEnvJson,
            // Set as Variable Modal
            setAsVarKey, setAsVarValue, setAsVarScope, setAsVarTargetId, setAsVarIsSecret, openSetAsVariableModal, commitSetAsVariable, activeCollection,
            // Customer Detail Modal
            selectedCustomerDetail, openCustomerDetail, saveCustomerPlan, getInitials,
            // Runner Execution
            runnerDelayMs, runnerStats, runnerExecutionLog, getMethodBadgeClass,
            // Hover Tracking
            hoveredReqId, hoveredColId, hoveredFldId, hoveredHistoryId,
            // Runner Execution Parity
            runnerIterations, runnerCurrentIndex, openCollectionRunnerTab, stopRunnerExecution, exportRunnerResultsJson,
            // 30-Day Heatmap & Reports Parity
            heatmapViewMode, heatmapPlanFilter, heatmapSearchQuery, hoveredHeatmapCell, reportRange,
            daysHeader, heatmapRows, heatmapSummary, filteredHeatmapRows, getCellColorClass, exportHeatmapCsv, exportReportsJson, printReport, planDistributions,
            // Customer Detail Modal Parity
            customerDetailTab, customerNotes, customerCustomFee, customerDiscountPercent, customerStatus,
            // OAuth 2.0 Flow Parity
            isRetrievingOAuthToken, oauthTokenError, oauthTokenSuccess, showOAuthSecret, showOAuthRawResponse,
            copiedOAuthToken, savedOAuthToVar, requestOAuth2TokenPhp, copyOAuthToken, saveOAuthTokenToVar, clearOAuthToken, setOAuthPreset,
            // Navigation Openers Parity
            openWebSocketTab, openMockServerTab, openGraphQLTab, openMonitorTab,
            // WebSocket Tester Parity
            wsUrl, wsStatus, wsMessages, wsComposeText, wsMsgType, wsFilterQuery, wsFilterDirection, wsAutoScroll,
            wsConnectedAt, wsElapsedSec, wsLastLatency, wsCopiedId, wsPresets, setWebSocketPreset, connectWebSocket,
            disconnectWebSocket, sendWebSocketMessage, sendWebSocketPing, clearWebSocketMessages, copyWebSocketMessage, filteredWsMessages,
            // Mock Server Parity
            mockServers, activeMockServerId, selectedMockEndpointId, mockTestResult, isTestingMockEndpoint, copiedMockUrl,
            showNewMockServerModal, newMockServerName, newMockServerDesc, showNewMockEndpointModal, newMockEndpoint,
            activeMockServer, selectedMockEndpoint, testMockEndpoint, copyMockEndpointUrl, openMockInBuilder, applyMockTemplate,
            createMockServer, deleteMockServer, createMockEndpoint, deleteMockEndpoint,
            // GraphQL Explorer Parity
            graphqlUrl, graphqlQuery, graphqlVariables, graphqlSubTab, graphqlHeaders, graphqlResponse, graphqlIsLoading,
            graphqlLatency, graphqlSize, graphqlCopied, graphqlShowSchemaDrawer, graphqlSchemaTypes, graphqlSchemaLoading,
            graphqlPresets, setGraphQLPreset, addGraphQLHeader, removeGraphQLHeader, executeGraphQLQuery, introspectGraphQLSchema, copyGraphQLResponse,
            // Monitors Parity
            monitors, activeMonitorId, isRunningMonitor, showNewMonitorModal, newMonitorName, newMonitorCollectionId, newMonitorSchedule,
            activeMonitor, toggleMonitorStatus, deleteMonitor, createMonitor, runMonitorNow,
            // Workspace Parity
            newWorkspaceName, newWorkspaceType, newWorkspaceDesc, createWorkspace,
            // Responsive Parity
            isSidebarOpen, layoutMode, showToolsDropdown,
            // Pane Splitter Parity
            splitRatioColumns, splitRatioRows, isSplitterDragging, isSplitterHovered, splitContainerRef, toggleLayoutMode, resetSplitRatio, startSplitterDrag
        };
    }
});

app.component('json-tree-node', {
    name: 'JsonTreeNode',
    props: {
        val: { default: null },
        nodeKey: { type: [String, Number], default: '' },
        currentPath: { type: String, default: '$' },
        depth: { type: Number, default: 0 },
        searchTerm: { type: String, default: '' },
        expandedPaths: { type: Object, default: () => ({}) }
    },
    emits: ['toggle', 'copy-path'],
    template: `
        <div class="font-mono text-xs select-text">
            <div v-if="isObjectOrArray" class="space-y-1">
                <div class="flex items-center gap-1.5 py-0.5 hover:bg-zinc-800/40 rounded px-1.5 group cursor-pointer"
                     :style="{ paddingLeft: (depth * 14 + 6) + 'px' }"
                     @click="$emit('toggle', currentPath)">
                    <button type="button" class="w-3.5 h-3.5 flex items-center justify-center text-zinc-500 hover:text-zinc-300">
                        <span class="text-[10px] transform transition-transform" :class="isExpanded ? 'rotate-90' : ''">▶</span>
                    </button>
                    <span v-if="nodeKey !== ''" class="text-orange-300 font-semibold">{{ nodeKey }}:</span>
                    <span class="text-zinc-400 font-semibold">{{ isArray ? '[' + childKeys.length + ']' : '{' + childKeys.length + '}' }}</span>
                    <button type="button" @click.stop="$emit('copy-path', currentPath)" class="opacity-0 group-hover:opacity-100 text-[10px] text-zinc-500 hover:text-orange-400 ml-2 px-1 rounded bg-zinc-800">
                        copy path
                    </button>
                </div>
                <div v-if="isExpanded">
                    <json-tree-node
                        v-for="k in childKeys"
                        :key="k"
                        :val="val[k]"
                        :node-key="k"
                        :current-path="currentPath + (isArray ? '[' + k + ']' : '.' + k)"
                        :depth="depth + 1"
                        :search-term="searchTerm"
                        :expanded-paths="expandedPaths"
                        @toggle="$emit('toggle', $event)"
                        @copy-path="$emit('copy-path', $event)"
                    />
                </div>
            </div>
            <div v-else class="flex items-center gap-1.5 py-0.5 hover:bg-zinc-800/40 rounded px-1.5 group"
                 :style="{ paddingLeft: (depth * 14 + 20) + 'px' }">
                <span v-if="nodeKey !== ''" class="text-zinc-300 font-medium">{{ nodeKey }}:</span>
                <span :class="valueClass">{{ formattedPrimitive }}</span>
                <button type="button" @click.stop="$emit('copy-path', currentPath)" class="opacity-0 group-hover:opacity-100 text-[10px] text-zinc-500 hover:text-orange-400 ml-2 px-1 rounded bg-zinc-800">
                    copy path
                </button>
            </div>
        </div>
    `,
    computed: {
        isObjectOrArray() {
            return this.val !== null && typeof this.val === 'object';
        },
        isArray() {
            return Array.isArray(this.val);
        },
        childKeys() {
            return this.isObjectOrArray ? Object.keys(this.val) : [];
        },
        isExpanded() {
            return this.expandedPaths[this.currentPath] !== false;
        },
        formattedPrimitive() {
            if (this.val === null) return 'null';
            if (this.val === undefined) return 'undefined';
            if (typeof this.val === 'string') return '"' + this.val + '"';
            return String(this.val);
        },
        valueClass() {
            if (this.val === null) return 'text-zinc-500 italic';
            if (typeof this.val === 'string') return 'text-emerald-300';
            if (typeof this.val === 'number') return 'text-amber-400';
            if (typeof this.val === 'boolean') return 'text-blue-400 font-bold';
            return 'text-zinc-300';
        }
    }
});

app.mount('#app');
</script>

</body>
</html>
