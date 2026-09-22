import JSZip from "jszip";
import { getHtaccessRules } from "./phpTemplates/htaccess";
import { getStoragePhpCode } from "./phpTemplates/storagePhp";
import { getRegisterPhpCode } from "./phpTemplates/registerPhp";
import { getSaasUsersPhpCode } from "./phpTemplates/saasUsersPhp";
import { getSaasReportsPhpCode } from "./phpTemplates/saasReportsPhp";
import { getAuthPhpCode } from "./phpTemplates/authPhp";
import { getApiPhpCode } from "./phpTemplates/apiPhp";
import { getConfigPhpCode } from "./phpTemplates/configPhp";
import { getDiagnosticPhpCode } from "./phpTemplates/diagnosticPhp";
import { getIndexPhpCode } from "./phpTemplates/indexPhp";
import { getInstallPhpCode } from "./phpTemplates/installPhp";

export interface PhpProjectFile {
  filename: string;
  description: string;
  language: string;
  code: string;
}

export const PHP_PROJECT_FILES: PhpProjectFile[] = [
  {
    filename: "install.php",
    description: "Automated MySQL Database Installer, Intelligent Schema Alterer & Optimizer",
    language: "php",
    code: getInstallPhpCode()
  },
  {
    filename: "index.php",
    description: "Postman-grade API Studio Workspace, Sandbox, and Landing Suite (Vue 3 + Tailwind)",
    language: "php",
    code: getIndexPhpCode()
  },
  {
    filename: "register.php",
    description: "User Registration, Multi-Tenant Provisioning, and Plan Selection Page",
    language: "php",
    code: getRegisterPhpCode()
  },
  {
    filename: "saas_users.php",
    description: "SaaS Customer 360, Usage Metering, Live Traffic Simulator & Cost Accounting",
    language: "php",
    code: getSaasUsersPhpCode()
  },
  {
    filename: "saas_reports.php",
    description: "SaaS Financial Unit Economics, MRR/ARR Ledger, Cloud Infrastructure Breakdown & CSV Export",
    language: "php",
    code: getSaasReportsPhpCode()
  },
  {
    filename: "api.php",
    description: "cURL HTTP Proxy Engine, SaaS Usage Metering, and Relational History Logger",
    language: "php",
    code: getApiPhpCode()
  },
  {
    filename: "auth.php",
    description: "Authentication, User Session State, SuperAdmin Roles & Registration Handlers",
    language: "php",
    code: getAuthPhpCode()
  },
  {
    filename: "storage.php",
    description: "Self-Healing MySQL + Flat-file JSON Hybrid Persistence & SaaS Schema Auto-Provisioner",
    language: "php",
    code: getStoragePhpCode()
  },
  {
    filename: "config.php",
    description: "Database Credentials & System Configuration (cPanel, Hostinger, XAMPP, LAMP)",
    language: "php",
    code: getConfigPhpCode()
  },
  {
    filename: "diagnostic.php",
    description: "System Health Suite & Live MySQL Database Connection Diagnostic Tool",
    language: "php",
    code: getDiagnosticPhpCode()
  },
  {
    filename: "test.php",
    description: "Quick Diagnostic Alias Endpoint",
    language: "php",
    code: `<?php
/**
 * CloudPost API Studio - Quick Diagnostic Alias
 */
require_once __DIR__ . '/diagnostic.php';
`
  },
  {
    filename: ".htaccess",
    description: "Apache Clean URL Rewrite Rules (.php hidden in address bar) & Asset Security",
    language: "apache",
    code: getHtaccessRules()
  },
  {
    filename: "README.md",
    description: "Step-by-Step Shared Hosting Deployment & Database Guide",
    language: "markdown",
    code: `# CloudPost API Studio — Pure PHP Shared Hosting Deployment Guide

This package contains 100% standalone pure PHP & Vue 3 code that runs on **any shared hosting server** (cPanel, Plesk, Hostinger, GoDaddy, Bluehost, Namecheap, XAMPP, WAMP, LAMP, or custom Apache/Nginx servers) **without requiring Node.js, npm, or build tools**.

---

## 🚀 Clean URLs (No .php in Address Bar)
The included \`.htaccess\` automatically removes \`.php\` extensions:
- **Workspace:** \`https://yourdomain.com/\`
- **User Registration:** \`https://yourdomain.com/register\`
- **SaaS Customer 360:** \`https://yourdomain.com/saas-users\`
- **Financial Reports:** \`https://yourdomain.com/saas-reports\`
- **Diagnostic Tool:** \`https://yourdomain.com/diagnostic\`

All anchor tags are shielded with zero status bar URL display leaks.

---

## 🛠️ Quick Installation (3 Steps)

### Step 1: Upload Files
Upload all files in this directory to your web server:
- For primary domain: upload to \`public_html/\`
- For subdomain (e.g. \`api-studio.yourdomain.com\`): upload to the subdomain folder.

### Step 2: Configure Database Credentials in \`config.php\`
Open \`config.php\` and enter your MySQL database credentials:
\`\`\`php
define('DB_HOST', 'localhost');
define('DB_NAME', 'your_database_name');
define('DB_USER', 'your_database_user');
define('DB_PASS', 'your_database_password');
\`\`\`
*Note: If MySQL is not configured, CloudPost seamlessly falls back to fast JSON file storage in \`data/\`.*

### Step 3: Test System Health
Open **\`https://yourdomain.com/diagnostic\`** in your browser to run automated self-checks:
- Checks PHP version & enabled extensions (cURL, PDO MySQL, JSON, Session)
- Tests write permissions on \`public_html/\` and \`data/\`
- Tests live MySQL database connection and auto-provisions tables:
  - \`cp_users\`
  - \`cp_saas_customers\`
  - \`cp_saas_usage_logs\`
  - \`cp_workspaces\`
  - \`cp_collections\`
  - \`cp_history\`
`
  },
  {
    filename: "manifest.json",
    description: "Web App Manifest for Progressive Web App (PWA) installation",
    language: "json",
    code: `{
  "name": "CloudPost PHP - API Workspace Platform",
  "short_name": "CloudPost",
  "description": "Postman-Compatible API Development, Testing, and Workspace Platform on PHP Shared Hosting",
  "start_url": "index.php",
  "display": "standalone",
  "background_color": "#0f1117",
  "theme_color": "#f97316",
  "orientation": "any",
  "categories": ["developer", "productivity", "utilities"],
  "icons": [
    {
      "src": "icon-192.svg",
      "sizes": "192x192",
      "type": "image/svg+xml",
      "purpose": "any maskable"
    },
    {
      "src": "icon-512.svg",
      "sizes": "512x512",
      "type": "image/svg+xml",
      "purpose": "any maskable"
    }
  ]
}
`
  },
  {
    filename: "sw.js",
    description: "Service Worker for offline caching",
    language: "javascript",
    code: `const CACHE_NAME = 'cloudpost-php-v4';
const STATIC_ASSETS = ['./index.php', './manifest.json', './icon-192.svg', './icon-512.svg'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.map((k) => k !== CACHE_NAME ? caches.delete(k) : null))).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin || url.pathname.endsWith('api.php')) return;

  event.respondWith(
    caches.match(event.request).then((res) => res || fetch(event.request))
  );
});
`
  },
  {
    filename: "icon-192.svg",
    description: "192x192 Vector App Icon",
    language: "xml",
    code: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 192 192" width="192" height="192">
  <defs>
    <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#ff6b2b;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#d9480f;stop-opacity:1" />
    </linearGradient>
    <linearGradient id="grad2" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#ffffff;stop-opacity:0.95" />
      <stop offset="100%" style="stop-color:#e1e4ea;stop-opacity:0.85" />
    </linearGradient>
  </defs>
  <rect width="192" height="192" rx="42" fill="#0f1117" />
  <rect x="8" y="8" width="176" height="176" rx="36" fill="none" stroke="url(#grad1)" stroke-width="4" stroke-opacity="0.6" />
  <circle cx="96" cy="96" r="62" fill="url(#grad1)" />
  <path d="M72 124 L96 60 L120 124 L96 110 Z" fill="url(#grad2)" />
  <circle cx="96" cy="94" r="7" fill="#d9480f" />
  <path d="M60 134 Q96 148 132 134" stroke="#ffffff" stroke-width="4" stroke-linecap="round" fill="none" opacity="0.8" />
</svg>
`
  },
  {
    filename: "icon-512.svg",
    description: "512x512 Vector App Icon",
    language: "xml",
    code: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#ff6b2b;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#d9480f;stop-opacity:1" />
    </linearGradient>
    <linearGradient id="grad2" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#ffffff;stop-opacity:0.95" />
      <stop offset="100%" style="stop-color:#e1e4ea;stop-opacity:0.85" />
    </linearGradient>
  </defs>
  <rect width="512" height="512" rx="110" fill="#0f1117" />
  <rect x="20" y="20" width="472" height="472" rx="96" fill="none" stroke="url(#grad1)" stroke-width="10" stroke-opacity="0.6" />
  <circle cx="256" cy="256" r="165" fill="url(#grad1)" />
  <path d="M192 330 L256 160 L320 330 L256 294 Z" fill="url(#grad2)" />
  <circle cx="256" cy="252" r="18" fill="#d9480f" />
  <path d="M160 358 Q256 394 352 358" stroke="#ffffff" stroke-width="10" stroke-linecap="round" fill="none" opacity="0.8" />
</svg>
`
  }
];

/**
 * Downloads the entire pure PHP project as a single .ZIP file
 */
export async function downloadPhpProjectZip(): Promise<void> {
  const zip = new JSZip();

  PHP_PROJECT_FILES.forEach(file => {
    zip.file(file.filename, file.code);
  });

  const blob = await zip.generateAsync({ type: "blob" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "cloudpost_pure_php_shared_hosting.zip";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Downloads a single PHP file
 */
export function downloadSinglePhpFile(filename: string, code: string): void {
  const blob = new Blob([code], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
