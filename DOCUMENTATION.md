# CloudPost Technical Architecture & System Documentation

**Version:** 2.4.0 (Unified Standard Across All Apps)  
**Production Domain:** [https://cloudpost.techvisionstudio.in](https://cloudpost.techvisionstudio.in)  
**Platforms:** Web (PWA), Desktop (Windows `.exe`, macOS `.dmg`, Linux `.AppImage`), Turnkey PHP Shared Hosting (cPanel, Hostinger, XAMPP), Node.js / Express Server

---

## 1. Executive Architecture Overview

CloudPost is an enterprise-grade collaborative API development, testing, and workspace platform engineered to be 100% interoperable with the official Postman Collection Schema v2.1.0.

It operates across four synchronized delivery targets:
1. **CloudPost Web App / PWA:** Modern React 18+ Single Page Application with offline caching via Service Worker (`sw.js`) and IndexedDB local synchronization.
2. **CloudPost Desktop Tool:** Electron-powered native container providing raw Node.js socket execution, bypassing browser CORS restrictions, native file dialogs, and automated background update checks.
3. **Turnkey PHP Shared Hosting:** Pure PHP 7.4–8.3+ and MySQL deployment with zero Node.js runtime requirements, fully compatible with Hostinger, cPanel, Plesk, and Apache/LiteSpeed hosting.
4. **CloudPost Backend Server:** High-performance Express.js server providing REST proxies, real-time presence, WebSocket reflection, and SaaS tenant metering.

---

## 2. Central Versioning Guide: Where to Set App Version for All Apps

CloudPost strictly requires that all applications share the exact same version number (**`2.4.0`**). Whenever bumping to a new release (e.g. `2.5.0`), configure the version in the following 4 files:

| Target Platform / App | File Path | Setting / Line | Description |
| :--- | :--- | :--- | :--- |
| **React Web SPA / PWA** | `src/config.ts` | `export const APP_VERSION = '2.4.0';`<br>`export const APP_VERSION_DISPLAY = 'v2.4.0';` | **Single Source of Truth** for UI badges, Navbar, Landing Page, Update banners, and Download modals. |
| **Desktop Tool (Electron)** | `package.json` | `"version": "2.4.0"` | Stamped into compiled Windows `.exe`, macOS `.dmg`, and Linux binaries by `electron-builder`. |
| **Turnkey PHP Hosting** | `php_shared_hosting/config.php` | `define('APP_VERSION', '2.4.0');`<br>`define('APP_VERSION_DISPLAY', 'v2.4.0');` | Governs the PHP web application, database installer header, diagnostic check, and JSON storage API. |
| **Backend Server & Release API** | `server.ts` | `const SERVER_APP_VERSION = "2.4.0";`<br>`DEFAULT_LATEST_DESKTOP_RELEASE.version = "2.4.0";` | Served via `/api/health`, `/api/version`, and the desktop auto-update check endpoint (`/api/desktop/check-update`). |

---

## 3. Database Schema & Query Optimization

CloudPost utilizes an optimized relational schema with composite indexes, connection pooling, and resilient fallbacks.

### Primary MySQL Tables:
- `cp_workspaces`: Workspace entities and access permissions.
- `cp_collections`: Hierarchical collection tree with `workspace_id` foreign reference.
- `cp_requests`: API requests, HTTP headers, authentication configs, pre-request scripts, and test assertions.
- `cp_environments`: Scoped variable environments (Development, Staging, Production, Global).
- `cp_request_history`: Chronological execution log for latency analysis and response diffing.
- `cp_customers`: Multi-tenant SaaS billing, usage limits, and subscription tiers.
- `cp_schema_migrations`: Version tracking for executed database migration scripts.

### Composite Indexing Strategy:
- `idx_req_col_sort` on `cp_requests(collection_id, sort_order)`: Guarantees zero-filesort retrieval of nested folder/request hierarchies.
- `idx_col_ws_sort` on `cp_collections(workspace_id, sort_order)`: Instant workspace switching with sub-millisecond query execution.
- `idx_hist_user_time` on `cp_request_history(user_id, created_at DESC)`: Rapid chronological pagination without table scans.
- `idx_cust_email_plan` on `cp_customers(email, plan, status)`: High-concurrency SaaS authentication and rate-metering lookup.

---

## 4. Security, Clean URLs & Status-Bar Concealment

1. **Clean URLs (No `.php` in Browser Address Bar):**
   - Configured via `php_shared_hosting/.htaccess`.
   - Apache `mod_rewrite` automatically strips `.php` from requests and maps extensionless routes:
     - `/install` → `install.php`
     - `/api` → `api.php`
     - `/diagnostic` → `diagnostic.php`
     - `/saas-users` → `saas_users.php`
     - `/register` → `register.php`
2. **Status-Bar Concealment on Link Hover:**
   - Anchor tags (`<a href="...">`) reveal destination URLs in browser status bars on hover.
   - CloudPost replaces plain links with styled `<button>` components, modal dispatchers, or JavaScript click events, completely concealing URLs from lower status bars.
3. **Sensitive File Protection:**
   - All `.env`, `.sql`, `.log`, and JSON configuration files inside `php_shared_hosting/` are protected with Apache `Require all denied` rules.

---

## 5. Desktop Native Architecture & Auto-Updater

The Desktop Tool (`electron/main.js`) features:
- **CORS-Free Execution:** Native Node.js HTTP/HTTPS agents execute calls directly against target IP/domain endpoints, bypassing web browser sandbox restrictions.
- **Startup Auto-Update Checks:** Queries `GET /api/desktop/check-update?version=2.4.0&platform=win32`.
- **Strict Downgrade Prevention:** Versions lower than or equal to the current build are rejected, preventing corrupting database schemas or rolling back security patches.
