# CloudPost API Studio — Pure PHP Shared Hosting Deployment Guide

This package contains 100% standalone pure PHP code that runs on **any shared hosting server** (cPanel, Plesk, Hostinger, GoDaddy, Bluehost, Namecheap, XAMPP, WAMP, LAMP, or custom Apache/Nginx servers) **without requiring Node.js, npm, or MySQL setup**.

---

## 🚀 Quick Installation (3 Steps)

### Step 1: Upload Files
Upload all files in this directory to your web server:
- For primary domain: upload to `public_html/`
- For subdomain (e.g. `api-studio.yourdomain.com`): upload to the subdomain folder.

### Step 2: Test & Verify System Health (Diagnostic Tool)
Open **`https://yourdomain.com/test.php`** or **`https://yourdomain.com/diagnostic.php`** in your browser to run automated self-checks:
- Checks PHP version & enabled extensions (cURL, PDO, JSON, Session)
- Tests write permissions on `public_html/` and `data/`
- Live tests database connection with credentials in `config.php`
- 1-Click fix for HTTP 500 errors (disables incompatible `.htaccess` rules)

### Step 3: Set Folder Permissions
Ensure the `data/` folder is writable by PHP:
- In File Manager (cPanel / Hostinger hPanel): Right-click `data` -> Permissions -> Set to **755** (or **777**).

### Step 3: Verify Requirements
- **PHP Version**: PHP 7.4, 8.0, 8.1, 8.2, or 8.3.
- **PHP cURL extension**: Enabled by default on 99.9% of shared hosts.

---

## 🌟 Key Features

1. **Guest Mode vs Login Mode**:
   - **Guest Mode**: Works immediately without sign up; executes API calls in-memory with zero server writes.
   - **Logged-In Mode**: Automatically saves collections, requests, and environments in secure JSON files under `data/`.
2. **Built-in cURL Proxy**:
   - Eliminates browser CORS issues for API testing across external endpoints.
3. **Zero MySQL Database Dependency**:
   - File-based JSON storage means zero database configuration required!
