# CloudPost User Manual & Operations Guide

**Application Version:** 2.4.0 (Unified Standard)  
**Applicable Clients:** CloudPost Desktop (Windows, macOS, Linux), CloudPost Web & PWA, and CloudPost PHP Shared Hosting.

---

## Chapter 1: Quickstart & First API Request

### 1.1 Creating and Sending a Request
1. Open CloudPost.
2. Click the **+** (New Request Tab) in the top tab bar, or click **New Request** in the left sidebar.
3. Select your HTTP Method: `GET`, `POST`, `PUT`, `DELETE`, `PATCH`, `HEAD`, or `OPTIONS`.
4. Enter your endpoint URL (e.g. `https://api.github.com/users/octocat` or `{{baseUrl}}/api/v1/users`).
5. Configure your payload:
   - **Params:** Key-value URL query parameters.
   - **Headers:** HTTP headers (e.g., `Content-Type: application/json`).
   - **Body:** Raw JSON, XML, Form-Data, or Binary payloads.
   - **Auth:** Bearer Token, Basic Auth, API Key, or OAuth 2.0.
6. Click **Send** (or press `Ctrl + Enter` / `Cmd + Enter`).
7. Inspect the formatted response body, HTTP status codes, headers, and latency metrics.

### 1.2 Isolated Guest Sessions
- CloudPost provides fully functional guest sandboxes with zero mandatory sign-up.
- Each guest is assigned a private session ID and a 6-digit shortcode.
- All collections and environments persist in your browser's local cache.
- To migrate your data to a permanent account, click **Sign In / Register** in the top navigation bar.

---

## Chapter 2: Desktop Tool Manual (Windows, macOS, Linux)

### 2.1 Installing CloudPost Desktop
- **Windows:** Download and run `CloudPost-2.4.0-Setup.exe` (NSIS installer) or extract `CloudPost-2.4.0-win-portable.zip`.
- **macOS:** Open `CloudPost-2.4.0-mac-arm64.dmg` (Apple Silicon) or `CloudPost-2.4.0-mac-x64.dmg` (Intel) and drag CloudPost into your `Applications` folder.
- **Linux:** Make `CloudPost-2.4.0.AppImage` executable (`chmod +x`) or install via `sudo dpkg -i cloudpost_2.4.0_amd64.deb`.

### 2.2 Advantages of Desktop Native Mode
1. **Zero CORS Restrictions:** Browsers block requests to private LANs, self-signed certificates, or domains without CORS headers. The desktop app executes requests via native Node.js sockets, connecting directly to any IP or domain.
2. **Direct Socket Performance:** Native low-latency socket networking with no proxy delays.
3. **Background Auto-Updater:** Checks for verified updates on startup. You can also manually trigger an update check via the menu: `CloudPost → Check for Updates...`.

### 2.3 Keyboard Shortcuts
- `Ctrl + Enter` / `Cmd + Enter`: Send current API request.
- `Ctrl + S` / `Cmd + S`: Save active request changes to collection.
- `Ctrl + T` / `Cmd + T`: Open a fresh API request tab.
- `Ctrl + W` / `Cmd + W`: Close the active tab.
- `Ctrl + E` / `Cmd + E`: Open Import / Export modal.

---

## Chapter 3: Web Application & PWA Installation

1. Navigate to **https://cloudpost.techvisionstudio.in** in Chrome, Edge, Safari, or Brave.
2. Click the **Install** icon in your browser's address bar (or menu → *Install CloudPost*).
3. The application will launch as a standalone desktop/mobile app with offline caching enabled.

---

## Chapter 4: Turnkey PHP Shared Hosting Manual

### 4.1 Deployment Steps (Hostinger / cPanel / XAMPP)
1. Download the `cloudpost_shared_hosting_v2.4.0.zip` package.
2. Extract the files into your web root (e.g. `public_html/`).
3. Open `config.php` and configure your database credentials:
   ```php
   define('DB_HOST', 'localhost');
   define('DB_NAME', 'your_cpanel_db');
   define('DB_USER', 'your_cpanel_user');
   define('DB_PASS', 'YourPassword123');
   define('APP_VERSION', '2.4.0');
   ```
4. In your browser, navigate to:
   `https://yourdomain.com/install`
5. The 1-click wizard automatically creates the database tables, composite indexes, and initial collections.

---

## Chapter 5: Multi-Protocol Studio Manual

- **WebSocket Tester:** Connect to `ws://` and `wss://` endpoints. Send JSON frames and inspect real-time server messages.
- **Server-Sent Events (SSE):** Stream LLM tokens, stock feeds, and notifications with automatic reconnection.
- **GraphQL Explorer:** Run queries and mutations with schema introspection and automatic documentation lookup.
- **gRPC Protocol Explorer:** Test strongly-typed gRPC services and binary RPC channels.
- **Mock Server:** Spin up mock endpoints in your workspace for prototyping frontend apps before backend completion.

---

## Chapter 6: Postman v2.1 Import & Export

### 6.1 Importing from Postman
1. In CloudPost, click **Import** in the sidebar or top navigation bar.
2. Drag and drop any official Postman Collection JSON (`v2.1.0` or `v2.0.0`), Postman Environment JSON, or OpenAPI spec.
3. CloudPost parses and preserves all folders, requests, headers, variables, and test scripts.

### 6.2 Exporting to Postman
1. Right-click any collection in the sidebar (or click the collection dropdown).
2. Select **Export Collection → Postman v2.1 JSON**.
3. Open Postman, click **Import**, and select the exported file.
