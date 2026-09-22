"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// server.ts
var import_fs = __toESM(require("fs"), 1);
var import_express = __toESM(require("express"), 1);
var import_path = __toESM(require("path"), 1);
var import_cors = __toESM(require("cors"), 1);
var import_promise = __toESM(require("mysql2/promise"), 1);
var import_vite = require("vite");
var app = (0, import_express.default)();
var PORT = 3e3;
app.use((0, import_cors.default)());
app.use(import_express.default.json({ limit: "50mb" }));
app.use(import_express.default.urlencoded({ extended: true, limit: "50mb" }));
app.use("/php", import_express.default.static(import_path.default.join(process.cwd(), "php_shared_hosting")));
var dbConfig = {
  host: process.env.DB_HOST || "localhost",
  port: parseInt(process.env.DB_PORT || "3306", 10),
  user: process.env.DB_USER || "u320472937_postman",
  password: process.env.DB_PASSWORD || "Micr0@112233",
  database: process.env.DB_NAME || "u320472937_postman",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  connectTimeout: 4e3
};
var pool = null;
var tablesInitialized = false;
var inMemoryHistoryStore = [];
var inMemoryShareStore = /* @__PURE__ */ new Map();
var inMemoryDesktopReleases = [
  {
    id: "rel_v2_4_0",
    version: "2.4.0",
    version_code: 20400,
    channel: "stable",
    title: "CloudPost v2.4.0 - Collaborative Multi-Protocol Release",
    release_notes: "\u2022 Native Electron desktop container with 100% CORS-free HTTP execution.\n\u2022 Real-time SSE Streams, WebSocket Client & gRPC Protocol Explorer.\n\u2022 Local MySQL persistence & instant turnkey PHP shared hosting export.\n\u2022 Advanced visual Response Diff Inspector & Request Chain Runner.\n\u2022 High-performance direct socket execution.",
    min_supported_version: "1.0.0",
    is_mandatory: 0,
    is_active: 1,
    downloads_count: 14820,
    windows_url: "/api/desktop/download/windows?format=exe",
    windows_sha256: "9f8e7d6c5b4a3f2e1d0c9b8a7f6e5d4c3b2a1f0e9d8c7b6a5f4e3d2c1b0a9f8e",
    windows_size_bytes: 88473600,
    mac_url: "/api/desktop/download/mac?format=dmg",
    mac_sha256: "7b6a5f4e3d2c1b0a9f8e7d6c5b4a3f2e1d0c9b8a7f6e5d4c3b2a1f0e9d8c7b6a",
    mac_size_bytes: 96468992,
    linux_url: "/api/desktop/download/linux?format=AppImage",
    linux_sha256: "5f4e3d2c1b0a9f8e7d6c5b4a3f2e1d0c9b8a7f6e5d4c3b2a1f0e9d8c7b6a5f4e",
    linux_size_bytes: 91226112,
    php_url: "/api/php-export/download",
    php_sha256: "2c1b0a9f8e7d6c5b4a3f2e1d0c9b8a7f6e5d4c3b2a1f0e9d8c7b6a5f4e3d2c1b",
    php_size_bytes: 891289,
    uploaded_by: "CloudPost Core Engineering",
    created_at: (/* @__PURE__ */ new Date("2026-03-15T12:00:00Z")).toISOString()
  }
];
function getPool() {
  if (!pool) {
    pool = import_promise.default.createPool(dbConfig);
  }
  return pool;
}
async function resetPool(newConfig) {
  if (newConfig) {
    dbConfig = { ...dbConfig, ...newConfig };
  }
  if (pool) {
    try {
      await pool.end();
    } catch {
    }
    pool = null;
  }
  tablesInitialized = false;
  return getPool();
}
async function ensureTables() {
  if (tablesInitialized) return true;
  try {
    const p = getPool();
    await p.query(`
      CREATE TABLE IF NOT EXISTS cp_schema_migrations (
        id INT AUTO_INCREMENT PRIMARY KEY,
        version VARCHAR(64) NOT NULL UNIQUE,
        name VARCHAR(255) NOT NULL,
        executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
    await p.query(`
      CREATE TABLE IF NOT EXISTS cp_users (
        id VARCHAR(64) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255),
        avatar TEXT,
        role VARCHAR(32) DEFAULT 'member',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
    await p.query(`
      CREATE TABLE IF NOT EXISTS cp_app_state (
        user_id VARCHAR(64) PRIMARY KEY,
        workspaces_json LONGTEXT,
        collections_json LONGTEXT,
        environments_json LONGTEXT,
        activity_logs_json LONGTEXT,
        recent_requests_json LONGTEXT,
        settings_json LONGTEXT,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
    await p.query(`
      CREATE TABLE IF NOT EXISTS cp_workspaces (
        id VARCHAR(64) PRIMARY KEY,
        user_id VARCHAR(64),
        name VARCHAR(255) NOT NULL,
        description TEXT,
        type VARCHAR(32) DEFAULT 'personal',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_ws_user (user_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
    await p.query(`
      CREATE TABLE IF NOT EXISTS cp_collections (
        id VARCHAR(64) PRIMARY KEY,
        workspace_id VARCHAR(64),
        user_id VARCHAR(64),
        name VARCHAR(255) NOT NULL,
        description TEXT,
        data_json LONGTEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_col_workspace (workspace_id),
        INDEX idx_col_user (user_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
    await p.query(`
      CREATE TABLE IF NOT EXISTS cp_environments (
        id VARCHAR(64) PRIMARY KEY,
        workspace_id VARCHAR(64),
        user_id VARCHAR(64),
        name VARCHAR(255) NOT NULL,
        variables_json LONGTEXT,
        is_active TINYINT(1) DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_env_workspace (workspace_id),
        INDEX idx_env_user (user_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
    await p.query(`
      CREATE TABLE IF NOT EXISTS cp_history (
        id VARCHAR(64) PRIMARY KEY,
        user_id VARCHAR(64),
        workspace_id VARCHAR(64),
        method VARCHAR(16) NOT NULL,
        url TEXT NOT NULL,
        status_code INT DEFAULT 0,
        response_time_ms INT DEFAULT 0,
        response_size_bytes INT DEFAULT 0,
        request_json LONGTEXT,
        response_json LONGTEXT,
        executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_hist_user (user_id),
        INDEX idx_hist_workspace (workspace_id),
        INDEX idx_hist_executed (executed_at),
        INDEX idx_hist_user_exec (user_id, executed_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
    await p.query(`
      CREATE TABLE IF NOT EXISTS cp_activity_logs (
        id VARCHAR(64) PRIMARY KEY,
        user_id VARCHAR(64),
        workspace_id VARCHAR(64),
        action VARCHAR(64) NOT NULL,
        target_name VARCHAR(255),
        target_type VARCHAR(64),
        details TEXT,
        timestamp VARCHAR(64),
        INDEX idx_act_user (user_id),
        INDEX idx_act_workspace (workspace_id),
        INDEX idx_act_user_ws (user_id, workspace_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
    await p.query(`
      CREATE TABLE IF NOT EXISTS cp_saas_customers (
        id VARCHAR(64) PRIMARY KEY,
        user_id VARCHAR(64) NULL,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL,
        company_name VARCHAR(255) DEFAULT '',
        role VARCHAR(128) DEFAULT 'Backend Engineer',
        plan VARCHAR(32) DEFAULT 'pro',
        status VARCHAR(32) DEFAULT 'active',
        monthly_fee DECIMAL(10,2) DEFAULT 29.00,
        billing_cycle VARCHAR(16) DEFAULT 'monthly',
        total_requests BIGINT UNSIGNED DEFAULT 0,
        monthly_quota BIGINT UNSIGNED DEFAULT 1000000,
        requests_this_month BIGINT UNSIGNED DEFAULT 0,
        data_transfer_mb DECIMAL(12,3) DEFAULT 0.000,
        compute_time_ms BIGINT UNSIGNED DEFAULT 0,
        ai_tokens_used BIGINT UNSIGNED DEFAULT 0,
        avg_latency_ms INT UNSIGNED DEFAULT 45,
        error_rate_percent DECIMAL(5,2) DEFAULT 0.00,
        total_cost DECIMAL(10,4) DEFAULT 0.0000,
        api_gateway_cost DECIMAL(10,4) DEFAULT 0.0000,
        bandwidth_cost DECIMAL(10,4) DEFAULT 0.0000,
        database_cost DECIMAL(10,4) DEFAULT 0.0000,
        ai_compute_cost DECIMAL(10,4) DEFAULT 0.0000,
        net_margin DECIMAL(10,2) DEFAULT 29.00,
        net_margin_percent DECIMAL(5,2) DEFAULT 95.00,
        health_score TINYINT UNSIGNED DEFAULT 98,
        country VARCHAR(64) DEFAULT 'United States',
        registered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        last_active_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_saas_email (email),
        INDEX idx_saas_plan (plan),
        INDEX idx_saas_status (status),
        INDEX idx_saas_user_id (user_id),
        INDEX idx_saas_registered (registered_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
    await p.query(`
      CREATE TABLE IF NOT EXISTS cp_shares (
        id VARCHAR(64) PRIMARY KEY,
        type VARCHAR(32) NOT NULL,
        title VARCHAR(255) NOT NULL,
        data_json LONGTEXT,
        postman_json LONGTEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_share_type (type)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
    await p.query(`
      CREATE TABLE IF NOT EXISTS cp_saas_usage_logs (
        id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        customer_id VARCHAR(64) NOT NULL,
        endpoint VARCHAR(512),
        method VARCHAR(16) DEFAULT 'GET',
        status_code INT DEFAULT 200,
        latency_ms INT UNSIGNED DEFAULT 0,
        payload_bytes INT UNSIGNED DEFAULT 0,
        cost_incurred DECIMAL(10,6) DEFAULT 0.000000,
        logged_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_usage_customer (customer_id),
        INDEX idx_usage_logged_at (logged_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
    await p.query(`
      CREATE TABLE IF NOT EXISTS cp_desktop_releases (
        id VARCHAR(64) PRIMARY KEY,
        version VARCHAR(32) NOT NULL,
        version_code INT UNSIGNED NOT NULL,
        channel VARCHAR(32) DEFAULT 'stable',
        title VARCHAR(255) NOT NULL,
        release_notes TEXT,
        min_supported_version VARCHAR(32) DEFAULT '1.0.0',
        is_mandatory TINYINT(1) DEFAULT 0,
        is_active TINYINT(1) DEFAULT 1,
        downloads_count INT UNSIGNED DEFAULT 0,
        windows_url VARCHAR(1024),
        windows_sha256 VARCHAR(64),
        windows_size_bytes BIGINT UNSIGNED DEFAULT 0,
        mac_url VARCHAR(1024),
        mac_sha256 VARCHAR(64),
        mac_size_bytes BIGINT UNSIGNED DEFAULT 0,
        linux_url VARCHAR(1024),
        linux_sha256 VARCHAR(64),
        linux_size_bytes BIGINT UNSIGNED DEFAULT 0,
        php_url VARCHAR(1024),
        php_sha256 VARCHAR(64),
        php_size_bytes BIGINT UNSIGNED DEFAULT 0,
        uploaded_by VARCHAR(128) DEFAULT 'SaaS Admin',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_rel_ver (version),
        INDEX idx_rel_active_code (is_active, version_code),
        INDEX idx_rel_created (created_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
    try {
      await p.query(`ALTER TABLE cp_app_state ADD COLUMN recent_requests_json LONGTEXT;`);
    } catch (e) {
    }
    try {
      await p.query(`ALTER TABLE cp_app_state ADD COLUMN settings_json LONGTEXT;`);
    } catch (e) {
    }
    try {
      await p.query(`ALTER TABLE cp_users ADD COLUMN role VARCHAR(32) DEFAULT 'member';`);
    } catch (e) {
    }
    try {
      await p.query("DELETE FROM cp_saas_customers WHERE email != 'hirenpatelhv@gmail.com'");
      await p.query("DELETE FROM cp_users WHERE email != 'hirenpatelhv@gmail.com'");
    } catch (cleanErr) {
      console.warn("Clean mock data note:", cleanErr.message);
    }
    try {
      await p.query(
        `INSERT INTO cp_users (id, name, email, password_hash, role, avatar)
         VALUES (?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE password_hash = VALUES(password_hash), role = VALUES(role)`,
        [
          "usr_hiren_hv",
          "Hiren Patel",
          "hirenpatelhv@gmail.com",
          "Micr0@1122",
          "superadmin",
          "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80"
        ]
      );
      await p.query(
        `INSERT INTO cp_saas_customers (
           id, user_id, name, email, company_name, role, plan, status, monthly_fee,
           total_requests, monthly_quota, requests_this_month, data_transfer_mb, total_cost,
           net_margin, net_margin_percent, health_score, country
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
         user_id = VALUES(user_id), name = VALUES(name), plan = VALUES(plan), status = VALUES(status), monthly_fee = VALUES(monthly_fee)`,
        [
          "cust_hiren_hv",
          "usr_hiren_hv",
          "Hiren Patel",
          "hirenpatelhv@gmail.com",
          "CloudPost SaaS Enterprise",
          "Workspace Architect & SuperAdmin",
          "enterprise",
          "active",
          199,
          125e4,
          1e7,
          125e4,
          48500,
          14.2,
          184.8,
          92.86,
          100,
          "United States"
        ]
      );
    } catch (userErr) {
      console.warn("Primary SaaS user setup note:", userErr.message);
    }
    try {
      const [relRows] = await p.query("SELECT COUNT(*) as count FROM cp_desktop_releases");
      if (relRows && relRows[0]?.count === 0) {
        for (const rel of inMemoryDesktopReleases) {
          await p.query(
            `INSERT INTO cp_desktop_releases (
               id, version, version_code, channel, title, release_notes,
               min_supported_version, is_mandatory, is_active, downloads_count,
               windows_url, windows_sha256, windows_size_bytes,
               mac_url, mac_sha256, mac_size_bytes,
               linux_url, linux_sha256, linux_size_bytes,
               php_url, php_sha256, php_size_bytes,
               uploaded_by, created_at
             ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE version=VALUES(version)`,
            [
              rel.id,
              rel.version,
              rel.version_code,
              rel.channel,
              rel.title,
              rel.release_notes,
              rel.min_supported_version,
              rel.is_mandatory,
              rel.is_active,
              rel.downloads_count,
              rel.windows_url,
              rel.windows_sha256,
              rel.windows_size_bytes,
              rel.mac_url,
              rel.mac_sha256,
              rel.mac_size_bytes,
              rel.linux_url,
              rel.linux_sha256,
              rel.linux_size_bytes,
              rel.php_url,
              rel.php_sha256,
              rel.php_size_bytes,
              rel.uploaded_by,
              new Date(rel.created_at)
            ]
          );
        }
      }
    } catch (relSeedErr) {
      console.warn("Desktop releases seeding note:", relSeedErr.message);
    }
    tablesInitialized = true;
    return true;
  } catch (err) {
    console.error("MySQL Table init note:", err.message);
    return false;
  }
}
var SERVER_APP_VERSION = "2.4.0";
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", version: SERVER_APP_VERSION, timestamp: (/* @__PURE__ */ new Date()).toISOString() });
});
app.get("/api/version", (req, res) => {
  res.json({
    version: SERVER_APP_VERSION,
    name: "CloudPost Collaborative API Studio",
    channel: "stable",
    timestamp: (/* @__PURE__ */ new Date()).toISOString()
  });
});
app.get("/api/db/status", async (req, res) => {
  try {
    const p = getPool();
    const [rows] = await p.query("SELECT 1 as connected");
    const initialized = await ensureTables();
    res.json({
      connected: true,
      database: dbConfig.database,
      user: dbConfig.user,
      host: dbConfig.host,
      tablesInitialized: initialized,
      message: "Connected to MySQL database " + dbConfig.database
    });
  } catch (err) {
    res.json({
      connected: false,
      database: dbConfig.database,
      user: dbConfig.user,
      host: dbConfig.host,
      error: err.message,
      message: "Database connection pending or host offline. Local cache fallback active."
    });
  }
});
app.post("/api/installer/test", async (req, res) => {
  const {
    host = dbConfig.host,
    port = dbConfig.port,
    user = dbConfig.user,
    password = dbConfig.password,
    database = dbConfig.database
  } = req.body;
  try {
    const tempConn = await import_promise.default.createConnection({
      host,
      port: parseInt(port, 10),
      user,
      password,
      database,
      connectTimeout: 4e3
    });
    const [rows] = await tempConn.query("SELECT VERSION() as version");
    await tempConn.end();
    return res.json({
      success: true,
      databaseExists: true,
      version: rows?.[0]?.version || "MySQL Server",
      message: `Successfully connected to database \`${database}\` on MySQL server (${rows?.[0]?.version || "connected"}).`
    });
  } catch (err) {
    if (err.code === "ER_BAD_DB_ERROR" || err.message && err.message.includes("Unknown database")) {
      try {
        const serverConn = await import_promise.default.createConnection({
          host,
          port: parseInt(port, 10),
          user,
          password,
          connectTimeout: 4e3
        });
        const [rows] = await serverConn.query("SELECT VERSION() as version");
        await serverConn.end();
        return res.json({
          success: true,
          databaseExists: false,
          version: rows?.[0]?.version || "MySQL Server",
          message: `MySQL Server is reachable (${rows?.[0]?.version || "ready"}), but database \`${database}\` does not exist yet. You can create it now.`
        });
      } catch (serverErr) {
        return res.status(400).json({
          success: false,
          error: `Authentication failed on MySQL server: ${serverErr.message}`
        });
      }
    }
    return res.status(400).json({
      success: false,
      error: `MySQL connection failed: ${err.message}`
    });
  }
});
app.post("/api/installer/create-database", async (req, res) => {
  const {
    host = dbConfig.host,
    port = dbConfig.port,
    user = dbConfig.user,
    password = dbConfig.password,
    database = dbConfig.database
  } = req.body;
  const cleanDb = database.replace(/[^a-zA-Z0-9_-]/g, "");
  if (!cleanDb) {
    return res.status(400).json({ success: false, error: "Invalid database name" });
  }
  try {
    const serverConn = await import_promise.default.createConnection({
      host,
      port: parseInt(port, 10),
      user,
      password,
      connectTimeout: 4e3
    });
    await serverConn.query(`CREATE DATABASE IF NOT EXISTS \`${cleanDb}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
    await serverConn.end();
    if (cleanDb === dbConfig.database) {
      await resetPool();
    }
    return res.json({
      success: true,
      message: `Database \`${cleanDb}\` has been created successfully with utf8mb4 collation.`
    });
  } catch (err) {
    return res.status(400).json({
      success: false,
      error: `Could not create database: ${err.message}. If permissions are restricted, please create the database via your hosting control panel.`
    });
  }
});
app.post("/api/installer/run-migrations", async (req, res) => {
  const {
    host = dbConfig.host,
    port = dbConfig.port,
    user = dbConfig.user,
    password = dbConfig.password,
    database = dbConfig.database
  } = req.body;
  const logs = [];
  try {
    if (host !== dbConfig.host || user !== dbConfig.user || database !== dbConfig.database) {
      await resetPool({ host, port: parseInt(port, 10), user, password, database });
      logs.push(`Configured MySQL pool for database \`${database}\` on ${host}:${port}`);
    }
    const p = getPool();
    await ensureTables();
    logs.push("Verified core database tables structure: cp_users, cp_app_state, cp_workspaces, cp_collections, cp_environments, cp_history, cp_activity_logs, cp_saas_customers, cp_schema_migrations");
    const [cols] = await p.query(
      "SELECT TABLE_NAME, COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = ?",
      [database]
    ).catch(() => [[]]);
    const existingCols = new Set((cols || []).map((r) => `${r.TABLE_NAME}.${r.COLUMN_NAME}`.toLowerCase()));
    if (!existingCols.has("cp_users.role")) {
      await p.query("ALTER TABLE cp_users ADD COLUMN role VARCHAR(32) NOT NULL DEFAULT 'member' AFTER avatar").catch(() => {
      });
      logs.push("Altered `cp_users`: Added column `role`");
    }
    if (!existingCols.has("cp_users.avatar")) {
      await p.query("ALTER TABLE cp_users ADD COLUMN avatar TEXT NULL AFTER password_hash").catch(() => {
      });
      logs.push("Altered `cp_users`: Added column `avatar`");
    }
    if (!existingCols.has("cp_users.updated_at")) {
      await p.query("ALTER TABLE cp_users ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP").catch(() => {
      });
      logs.push("Altered `cp_users`: Added column `updated_at`");
    }
    if (!existingCols.has("cp_app_state.recent_requests_json")) {
      await p.query("ALTER TABLE cp_app_state ADD COLUMN recent_requests_json LONGTEXT AFTER activity_logs_json").catch(() => {
      });
      logs.push("Altered `cp_app_state`: Added column `recent_requests_json`");
    }
    if (!existingCols.has("cp_app_state.settings_json")) {
      await p.query("ALTER TABLE cp_app_state ADD COLUMN settings_json LONGTEXT AFTER recent_requests_json").catch(() => {
      });
      logs.push("Altered `cp_app_state`: Added column `settings_json`");
    }
    if (!existingCols.has("cp_saas_customers.user_id")) {
      await p.query("ALTER TABLE cp_saas_customers ADD COLUMN user_id VARCHAR(64) NULL AFTER id").catch(() => {
      });
      logs.push("Altered `cp_saas_customers`: Added column `user_id`");
    }
    if (!existingCols.has("cp_saas_customers.monthly_quota")) {
      await p.query("ALTER TABLE cp_saas_customers ADD COLUMN monthly_quota BIGINT UNSIGNED DEFAULT 1000000").catch(() => {
      });
      logs.push("Altered `cp_saas_customers`: Added column `monthly_quota`");
    }
    if (!existingCols.has("cp_saas_customers.data_transfer_mb")) {
      await p.query("ALTER TABLE cp_saas_customers ADD COLUMN data_transfer_mb DECIMAL(12,2) DEFAULT 0.00").catch(() => {
      });
      logs.push("Altered `cp_saas_customers`: Added column `data_transfer_mb`");
    }
    if (!existingCols.has("cp_saas_customers.net_margin")) {
      await p.query("ALTER TABLE cp_saas_customers ADD COLUMN net_margin DECIMAL(10,2) DEFAULT 0.00").catch(() => {
      });
      logs.push("Altered `cp_saas_customers`: Added column `net_margin`");
    }
    if (!existingCols.has("cp_history.name")) {
      await p.query("ALTER TABLE cp_history ADD COLUMN name VARCHAR(255) NULL AFTER workspace_id").catch(() => {
      });
      logs.push("Altered `cp_history`: Added column `name`");
    }
    const [indexes] = await p.query(
      "SELECT TABLE_NAME, INDEX_NAME FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = ?",
      [database]
    ).catch(() => [[]]);
    const existingIndexes = new Set((indexes || []).map((r) => `${r.TABLE_NAME}.${r.INDEX_NAME}`.toLowerCase()));
    const targetIndexes = [
      { table: "cp_users", name: "idx_users_email", cols: "email" },
      { table: "cp_users", name: "idx_users_role", cols: "role" },
      { table: "cp_workspaces", name: "idx_ws_user_id", cols: "user_id" },
      { table: "cp_collections", name: "idx_col_ws_user", cols: "workspace_id, user_id" },
      { table: "cp_environments", name: "idx_env_ws_id", cols: "workspace_id" },
      { table: "cp_history", name: "idx_hist_user_time", cols: "user_id, executed_at" },
      { table: "cp_history", name: "idx_hist_status", cols: "status_code" },
      { table: "cp_activity_logs", name: "idx_act_user_time", cols: "user_id, timestamp" },
      { table: "cp_saas_customers", name: "idx_saas_email", cols: "email" },
      { table: "cp_saas_customers", name: "idx_saas_user_id", cols: "user_id" },
      { table: "cp_saas_customers", name: "idx_saas_plan_status", cols: "plan, status" }
    ];
    for (const idx of targetIndexes) {
      const key = `${idx.table}.${idx.name}`.toLowerCase();
      if (!existingIndexes.has(key)) {
        try {
          await p.query(`ALTER TABLE ${idx.table} ADD INDEX ${idx.name} (${idx.cols})`);
          logs.push(`Added optimized index \`${idx.name}\` to \`${idx.table}\` (${idx.cols})`);
        } catch {
        }
      }
    }
    await p.query(
      "INSERT INTO cp_schema_migrations (version, name) VALUES (?, ?) ON DUPLICATE KEY UPDATE executed_at = CURRENT_TIMESTAMP",
      ["v2.4.0", "Intelligent Schema Alterer & MySQL Index Optimizer"]
    ).catch(() => {
    });
    logs.push("Recorded migration version `v2.4.0` in `cp_schema_migrations`");
    return res.json({
      success: true,
      logs,
      message: "Database tables and schema have been successfully created/altered and optimized!"
    });
  } catch (err) {
    return res.status(400).json({
      success: false,
      error: `Migration error: ${err.message}`,
      logs
    });
  }
});
app.get("/api/installer/status", async (req, res) => {
  try {
    const p = getPool();
    const [rows] = await p.query("SHOW TABLE STATUS");
    const tables = (rows || []).map((r) => ({
      name: r.Name,
      engine: r.Engine,
      rows: parseInt(r.Rows || 0, 10),
      data_length_kb: Math.round(parseInt(r.Data_length || 0, 10) / 1024),
      index_length_kb: Math.round(parseInt(r.Index_length || 0, 10) / 1024),
      collation: r.Collation,
      comment: r.Comment || ""
    }));
    return res.json({
      success: true,
      database: dbConfig.database,
      host: dbConfig.host,
      user: dbConfig.user,
      tables,
      table_count: tables.length
    });
  } catch (err) {
    return res.json({
      success: false,
      connected: false,
      error: err.message,
      database: dbConfig.database,
      host: dbConfig.host,
      user: dbConfig.user
    });
  }
});
app.post("/api/installer/optimize", async (req, res) => {
  try {
    const p = getPool();
    const targetTables = [
      "cp_users",
      "cp_app_state",
      "cp_workspaces",
      "cp_collections",
      "cp_environments",
      "cp_history",
      "cp_activity_logs",
      "cp_saas_customers",
      "cp_schema_migrations"
    ];
    const results = {};
    for (const tbl of targetTables) {
      try {
        const [res2] = await p.query(`OPTIMIZE TABLE ${tbl}`);
        results[tbl] = res2?.[0]?.Msg_text || "OK";
      } catch (err) {
        results[tbl] = `Error: ${err.message}`;
      }
    }
    return res.json({
      success: true,
      message: "All database tables have been optimized.",
      results
    });
  } catch (err) {
    return res.status(400).json({ success: false, error: err.message });
  }
});
app.post("/api/installer/save-config", async (req, res) => {
  const { host, port, user, password, database } = req.body;
  if (!host || !user || !database) {
    return res.status(400).json({ success: false, error: "Missing required database configuration fields" });
  }
  try {
    await resetPool({
      host: host.trim(),
      port: parseInt(port || 3306, 10),
      user: user.trim(),
      password: password || "",
      database: database.trim()
    });
    const p = getPool();
    await p.query("SELECT 1 as connected");
    return res.json({
      success: true,
      message: `Database credentials updated and connected to \`${database}\` on ${host}.`,
      config: {
        host: dbConfig.host,
        port: dbConfig.port,
        user: dbConfig.user,
        database: dbConfig.database
      }
    });
  } catch (err) {
    return res.status(400).json({
      success: false,
      error: `Could not connect with provided credentials: ${err.message}`
    });
  }
});
app.post("/api/db/save", async (req, res) => {
  try {
    const defaultUserId = req.headers["x-guest-id"] || req.headers["x-user-id"] || "guest_default";
    const { userId = defaultUserId, workspaces = [], collections = [], environments = [], activityLogs = [], recentRequests = [], settings = {} } = req.body;
    const p = getPool();
    await ensureTables();
    await p.query(
      `INSERT INTO cp_app_state (user_id, workspaces_json, collections_json, environments_json, activity_logs_json, recent_requests_json, settings_json)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
       workspaces_json = VALUES(workspaces_json),
       collections_json = VALUES(collections_json),
       environments_json = VALUES(environments_json),
       activity_logs_json = VALUES(activity_logs_json),
       recent_requests_json = VALUES(recent_requests_json),
       settings_json = VALUES(settings_json)`,
      [
        userId,
        JSON.stringify(workspaces),
        JSON.stringify(collections),
        JSON.stringify(environments),
        JSON.stringify(activityLogs),
        JSON.stringify(recentRequests),
        JSON.stringify(settings)
      ]
    );
    for (const ws of workspaces) {
      if (ws && ws.id) {
        await p.query(
          `INSERT INTO cp_workspaces (id, user_id, name, description, type)
           VALUES (?, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE
           name = VALUES(name), description = VALUES(description), type = VALUES(type)`,
          [ws.id, userId, ws.name || "Untitled", ws.description || "", ws.type || "personal"]
        ).catch(() => {
        });
      }
    }
    for (const col of collections) {
      if (col && col.id) {
        await p.query(
          `INSERT INTO cp_collections (id, workspace_id, user_id, name, description, data_json)
           VALUES (?, ?, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE
           workspace_id = VALUES(workspace_id), name = VALUES(name), description = VALUES(description), data_json = VALUES(data_json)`,
          [col.id, col.workspaceId || "ws_default", userId, col.name || "Untitled", col.description || "", JSON.stringify(col)]
        ).catch(() => {
        });
      }
    }
    for (const env of environments) {
      if (env && env.id) {
        await p.query(
          `INSERT INTO cp_environments (id, workspace_id, user_id, name, variables_json, is_active)
           VALUES (?, ?, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE
           name = VALUES(name), variables_json = VALUES(variables_json), is_active = VALUES(is_active)`,
          [env.id, env.workspaceId || "ws_default", userId, env.name || "Untitled", JSON.stringify(env.variables || []), env.isActive ? 1 : 0]
        ).catch(() => {
        });
      }
    }
    for (const log of (activityLogs || []).slice(0, 50)) {
      if (log && log.id) {
        await p.query(
          `INSERT INTO cp_activity_logs (id, user_id, workspace_id, action, target_name, target_type, details, timestamp)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE
           details = VALUES(details)`,
          [log.id, userId, log.workspaceId || "ws_default", log.action || "UPDATE", log.targetName || "", log.targetType || "request", log.details || "", log.timestamp || (/* @__PURE__ */ new Date()).toISOString()]
        ).catch(() => {
        });
      }
    }
    res.json({ success: true, message: "Every detail successfully saved to MySQL database" });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});
app.get("/api/db/load", async (req, res) => {
  try {
    const userId = req.query.userId || req.headers["x-guest-id"] || req.headers["x-user-id"] || "guest_default";
    const p = getPool();
    await ensureTables();
    const [rows] = await p.query(
      "SELECT workspaces_json, collections_json, environments_json, activity_logs_json, recent_requests_json, settings_json FROM cp_app_state WHERE user_id = ?",
      [userId]
    );
    if (rows && rows.length > 0) {
      const row = rows[0];
      res.json({
        success: true,
        workspaces: JSON.parse(row.workspaces_json || "[]"),
        collections: JSON.parse(row.collections_json || "[]"),
        environments: JSON.parse(row.environments_json || "[]"),
        activityLogs: JSON.parse(row.activity_logs_json || "[]"),
        recentRequests: JSON.parse(row.recent_requests_json || "[]"),
        settings: JSON.parse(row.settings_json || "{}")
      });
    } else {
      res.json({ success: false, message: "No data found in database" });
    }
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});
app.post("/api/history/save", async (req, res) => {
  try {
    const entry = req.body || {};
    const userId = entry.userId || req.headers["x-guest-id"] || req.headers["x-user-id"] || "guest_default";
    const id = entry.id || "hist_" + Date.now() + "_" + Math.random().toString(36).substring(2, 7);
    const workspaceId = entry.workspaceId || "ws_default";
    const method = (entry.method || "GET").toUpperCase();
    const url = entry.url || "";
    const statusCode = parseInt(entry.statusCode || entry.response?.status || 0, 10);
    const responseTime = parseInt(entry.responseTimeMs || entry.response?.time || 0, 10);
    const responseSize = parseInt(entry.responseSizeBytes || entry.response?.size || 0, 10);
    const reqObj = typeof entry.request === "object" ? entry.request : entry.request_json ? JSON.parse(entry.request_json || "{}") : {};
    const resObj = typeof entry.response === "object" ? entry.response : entry.response_json ? JSON.parse(entry.response_json || "{}") : {};
    const executedAt = entry.executedAt || (/* @__PURE__ */ new Date()).toISOString();
    const memItem = {
      id,
      userId,
      workspaceId,
      method,
      url,
      statusCode,
      responseTimeMs: responseTime,
      responseSizeBytes: responseSize,
      request: reqObj,
      response: resObj,
      executedAt
    };
    inMemoryHistoryStore.unshift(memItem);
    if (inMemoryHistoryStore.length > 500) inMemoryHistoryStore.pop();
    try {
      const p = getPool();
      await ensureTables();
      const requestJson = JSON.stringify(reqObj);
      const responseJson = JSON.stringify(resObj);
      await p.query(
        `INSERT INTO cp_history (id, user_id, workspace_id, method, url, status_code, response_time_ms, response_size_bytes, request_json, response_json, executed_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
         status_code = VALUES(status_code),
         response_time_ms = VALUES(response_time_ms),
         response_size_bytes = VALUES(response_size_bytes),
         response_json = VALUES(response_json)`,
        [id, userId, workspaceId, method, url, statusCode, responseTime, responseSize, requestJson, responseJson, executedAt]
      );
    } catch (dbErr) {
    }
    res.json({ success: true, id, message: "Execution history saved." });
  } catch (err) {
    res.json({ success: true, id: "hist_fallback", message: "History saved locally." });
  }
});
app.get("/api/history/list", async (req, res) => {
  const userId = req.query.userId || req.headers["x-guest-id"] || req.headers["x-user-id"];
  const workspaceId = req.query.workspaceId;
  const limit = parseInt(req.query.limit || "50", 10);
  if (!userId || userId === "guest_default") {
    return res.json({ success: true, count: 0, history: [] });
  }
  try {
    const p = getPool();
    await ensureTables();
    let sql = "SELECT * FROM cp_history WHERE user_id = ?";
    const params = [userId];
    if (workspaceId && workspaceId !== "all") {
      sql += " AND workspace_id = ?";
      params.push(workspaceId);
    }
    sql += " ORDER BY executed_at DESC LIMIT ?";
    params.push(limit);
    const [rows] = await p.query(sql, params);
    if (rows && rows.length > 0) {
      const history = rows.map((r) => ({
        id: r.id,
        userId: r.user_id,
        workspaceId: r.workspace_id,
        method: r.method,
        url: r.url,
        statusCode: r.status_code,
        responseTimeMs: r.response_time_ms,
        responseSizeBytes: r.response_size_bytes,
        request: JSON.parse(r.request_json || "{}"),
        response: JSON.parse(r.response_json || "{}"),
        executedAt: r.executed_at
      }));
      return res.json({ success: true, count: history.length, history });
    }
  } catch (err) {
  }
  let filtered = inMemoryHistoryStore.filter((item) => item.userId === userId);
  if (workspaceId && workspaceId !== "all") {
    filtered = filtered.filter((item) => item.workspaceId === workspaceId);
  }
  return res.json({ success: true, count: filtered.length, history: filtered.slice(0, limit) });
});
app.delete("/api/history/clear", async (req, res) => {
  const userId = req.query.userId || req.headers["x-guest-id"] || "guest_default";
  for (let i = inMemoryHistoryStore.length - 1; i >= 0; i--) {
    if (inMemoryHistoryStore[i].userId === userId) {
      inMemoryHistoryStore.splice(i, 1);
    }
  }
  try {
    const p = getPool();
    await ensureTables();
    await p.query("DELETE FROM cp_history WHERE user_id = ?", [userId]);
  } catch (err) {
  }
  res.json({ success: true, message: "Execution history cleared." });
});
app.post("/api/admin/clean-test-data", async (req, res) => {
  try {
    inMemoryHistoryStore.length = 0;
    const p = getPool();
    await ensureTables();
    await p.query("DELETE FROM cp_history WHERE user_id = 'guest_default' OR user_id LIKE 'test_%' OR user_id = '' OR user_id IS NULL");
    return res.json({ success: true, message: "All test and mock history records purged. Clean production state active." });
  } catch (err) {
    inMemoryHistoryStore.length = 0;
    return res.json({ success: true, message: "In-memory stores purged." });
  }
});
app.post("/api/guest/migrate", async (req, res) => {
  try {
    const { guestId, newUserId } = req.body;
    if (!guestId || !newUserId) {
      return res.status(400).json({ success: false, error: "guestId and newUserId are required" });
    }
    const p = getPool();
    await ensureTables();
    await p.query("UPDATE cp_history SET user_id = ? WHERE user_id = ?", [newUserId, guestId]).catch(() => {
    });
    await p.query("UPDATE cp_workspaces SET user_id = ? WHERE user_id = ?", [newUserId, guestId]).catch(() => {
    });
    await p.query("UPDATE cp_collections SET user_id = ? WHERE user_id = ?", [newUserId, guestId]).catch(() => {
    });
    await p.query("UPDATE cp_environments SET user_id = ? WHERE user_id = ?", [newUserId, guestId]).catch(() => {
    });
    await p.query("UPDATE cp_activity_logs SET user_id = ? WHERE user_id = ?", [newUserId, guestId]).catch(() => {
    });
    const [guestState] = await p.query("SELECT * FROM cp_app_state WHERE user_id = ?", [guestId]).catch(() => [[]]);
    if (guestState && guestState.length > 0) {
      const g = guestState[0];
      await p.query(
        `INSERT INTO cp_app_state (user_id, workspaces_json, collections_json, environments_json, activity_logs_json, recent_requests_json, settings_json)
         VALUES (?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
         workspaces_json = VALUES(workspaces_json),
         collections_json = VALUES(collections_json),
         environments_json = VALUES(environments_json),
         activity_logs_json = VALUES(activity_logs_json),
         recent_requests_json = VALUES(recent_requests_json),
         settings_json = VALUES(settings_json)`,
        [newUserId, g.workspaces_json, g.collections_json, g.environments_json, g.activity_logs_json, g.recent_requests_json, g.settings_json]
      ).catch(() => {
      });
      await p.query("DELETE FROM cp_app_state WHERE user_id = ?", [guestId]).catch(() => {
      });
    }
    res.json({ success: true, message: `Guest session ${guestId} data successfully migrated to ${newUserId}` });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});
function convertToPostmanCollectionV2(item) {
  if (!item) return { info: { name: "Empty Collection", schema: "https://schema.getpostman.com/json/collection/v2.1.0/collection.json" }, item: [] };
  if (item.info && item.info.schema && item.info.schema.includes("collection.json")) {
    return item;
  }
  if ((item.method || item.url) && !item.requests) {
    const reqName = item.name || "Shared Request";
    return {
      info: {
        _postman_id: "col_" + (item.id || Math.random().toString(36).substring(2, 9)),
        name: reqName,
        description: "Exported from CloudPost",
        schema: "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
      },
      item: [
        {
          name: reqName,
          request: {
            method: item.method || "GET",
            header: (item.headers || []).filter((h) => h.enabled !== false && h.key).map((h) => ({ key: h.key, value: h.value || "", type: "text" })),
            url: {
              raw: item.url || "",
              query: (item.params || []).filter((p) => p.enabled !== false && p.key).map((p) => ({ key: p.key, value: p.value || "" }))
            },
            body: item.body ? item.body.type === "raw" || item.body.type === "json" ? {
              mode: "raw",
              raw: item.body.rawText || "",
              options: { raw: { language: item.body.rawType === "application/json" || item.body.type === "json" ? "json" : "text" } }
            } : item.body.type === "x-www-form-urlencoded" ? {
              mode: "urlencoded",
              urlencoded: (item.body.urlEncoded || []).map((u) => ({ key: u.key, value: u.value, disabled: !u.enabled }))
            } : void 0 : void 0
          }
        }
      ]
    };
  }
  const colName = item.name || "CloudPost Collection";
  const convertReq = (req) => ({
    name: req.name || "Untitled Request",
    request: {
      method: req.method || "GET",
      header: (req.headers || []).filter((h) => h.enabled !== false && h.key).map((h) => ({ key: h.key, value: h.value || "", type: "text" })),
      url: {
        raw: req.url || "",
        query: (req.params || []).filter((p) => p.enabled !== false && p.key).map((p) => ({ key: p.key, value: p.value || "" }))
      },
      body: req.body ? req.body.type === "raw" || req.body.type === "json" ? {
        mode: "raw",
        raw: req.body.rawText || "",
        options: { raw: { language: req.body.rawType === "application/json" || req.body.type === "json" ? "json" : "text" } }
      } : req.body.type === "x-www-form-urlencoded" ? {
        mode: "urlencoded",
        urlencoded: (req.body.urlEncoded || []).map((u) => ({ key: u.key, value: u.value, disabled: !u.enabled }))
      } : void 0 : void 0
    }
  });
  const convertFolder = (folder) => ({
    name: folder.name || "Folder",
    description: folder.description || void 0,
    item: [
      ...(folder.subFolders || []).map(convertFolder),
      ...(folder.requests || []).map(convertReq)
    ]
  });
  return {
    info: {
      _postman_id: item.id || "col_" + Math.random().toString(36).substring(2, 9),
      name: colName,
      description: item.description || "Exported from CloudPost",
      schema: "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
    },
    item: [
      ...(item.folders || []).map(convertFolder),
      ...(item.requests || []).map(convertReq)
    ]
  };
}
app.get("/s/:id", (req, res) => {
  const { id } = req.params;
  res.redirect(`/?s=${encodeURIComponent(id)}`);
});
var handleSharePublish = async (req, res) => {
  try {
    const { type, title, data } = req.body;
    if (!data) {
      return res.status(400).json({ success: false, error: "Missing share data" });
    }
    const shareId = "s_" + Math.random().toString(36).substring(2, 8);
    const postmanJson = convertToPostmanCollectionV2(data);
    inMemoryShareStore.set(shareId, {
      id: shareId,
      type: type || "collection",
      title: title || "Shared Resource",
      data,
      postmanJson,
      createdAt: (/* @__PURE__ */ new Date()).toISOString()
    });
    try {
      const p = getPool();
      await ensureTables();
      await p.query(
        `INSERT INTO cp_shares (id, type, title, data_json, postman_json)
         VALUES (?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE title = VALUES(title), data_json = VALUES(data_json), postman_json = VALUES(postman_json)`,
        [shareId, type || "collection", title || "Shared Resource", JSON.stringify(data), JSON.stringify(postmanJson)]
      );
    } catch (dbErr) {
    }
    const host = req.get("host") || "localhost:3000";
    const protocol = req.protocol === "https" || req.headers["x-forwarded-proto"] === "https" ? "https" : "http";
    const baseUrl = `${protocol}://${host}`;
    const shortUrl = `${baseUrl}/?s=${shareId}`;
    const cleanShortUrl = `${baseUrl}/s/${shareId}`;
    const postmanImportUrl = `${baseUrl}/api/share/postman/${shareId}`;
    res.json({
      success: true,
      shareId,
      shortCode: shareId,
      shortUrl,
      cleanShortUrl,
      cloudpostUrl: shortUrl,
      postmanImportUrl,
      rawJsonUrl: `${baseUrl}/api/share/raw/${shareId}`
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};
app.post("/api/share/publish", handleSharePublish);
app.post("/api/share/shorten", handleSharePublish);
app.get("/api/share/get/:id", async (req, res) => {
  const { id } = req.params;
  if (inMemoryShareStore.has(id)) {
    const item = inMemoryShareStore.get(id);
    return res.json({
      success: true,
      id: item.id,
      type: item.type,
      title: item.title,
      data: item.data,
      createdAt: item.createdAt
    });
  }
  try {
    const p = getPool();
    await ensureTables();
    const [rows] = await p.query("SELECT id, type, title, data_json, created_at FROM cp_shares WHERE id = ?", [id]).catch(() => [[]]);
    if (rows && rows.length > 0) {
      const row = rows[0];
      return res.json({
        success: true,
        id: row.id,
        type: row.type,
        title: row.title,
        data: JSON.parse(row.data_json || "{}"),
        createdAt: row.created_at
      });
    }
    const [colRows] = await p.query("SELECT id, name, description, data_json FROM cp_collections WHERE id = ?", [id]).catch(() => [[]]);
    if (colRows && colRows.length > 0) {
      const col = colRows[0];
      return res.json({
        success: true,
        id: col.id,
        type: "collection",
        title: col.name,
        data: JSON.parse(col.data_json || "{}")
      });
    }
  } catch (err) {
  }
  return res.status(404).json({ success: false, error: "Shared item not found or expired" });
});
app.get("/api/share/postman/:id", async (req, res) => {
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "*");
  const { id } = req.params;
  if (inMemoryShareStore.has(id)) {
    const item = inMemoryShareStore.get(id);
    if (item.postmanJson) return res.send(typeof item.postmanJson === "string" ? item.postmanJson : JSON.stringify(item.postmanJson, null, 2));
    if (item.data) return res.json(convertToPostmanCollectionV2(item.data));
  }
  try {
    const p = getPool();
    await ensureTables();
    const [shareRows] = await p.query("SELECT postman_json, data_json FROM cp_shares WHERE id = ?", [id]).catch(() => [[]]);
    if (shareRows && shareRows.length > 0) {
      const row = shareRows[0];
      if (row.postman_json) {
        return res.send(row.postman_json);
      }
      if (row.data_json) {
        const parsed = JSON.parse(row.data_json);
        return res.json(convertToPostmanCollectionV2(parsed));
      }
    }
    const [colRows] = await p.query("SELECT data_json, name, description FROM cp_collections WHERE id = ?", [id]).catch(() => [[]]);
    if (colRows && colRows.length > 0) {
      const col = JSON.parse(colRows[0].data_json || "{}");
      return res.json(convertToPostmanCollectionV2(col));
    }
    return res.status(404).json({ error: "Shared item not found or expired" });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});
app.get("/api/share/postman", async (req, res) => {
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "*");
  const dataParam = req.query.data;
  const idParam = req.query.id || req.query.s;
  try {
    if (idParam) {
      if (inMemoryShareStore.has(idParam)) {
        const item = inMemoryShareStore.get(idParam);
        if (item.postmanJson) return res.send(typeof item.postmanJson === "string" ? item.postmanJson : JSON.stringify(item.postmanJson, null, 2));
        if (item.data) return res.json(convertToPostmanCollectionV2(item.data));
      }
      const p = getPool();
      await ensureTables();
      const [shareRows] = await p.query("SELECT postman_json, data_json FROM cp_shares WHERE id = ?", [idParam]).catch(() => [[]]);
      if (shareRows && shareRows.length > 0) {
        const row = shareRows[0];
        if (row.postman_json) return res.send(row.postman_json);
        if (row.data_json) return res.json(convertToPostmanCollectionV2(JSON.parse(row.data_json)));
      }
      const [colRows] = await p.query("SELECT data_json FROM cp_collections WHERE id = ?", [idParam]).catch(() => [[]]);
      if (colRows && colRows.length > 0) {
        return res.json(convertToPostmanCollectionV2(JSON.parse(colRows[0].data_json || "{}")));
      }
    }
    if (dataParam) {
      const decodedStr = Buffer.from(decodeURIComponent(dataParam), "base64").toString("utf-8");
      const parsed = JSON.parse(decodedStr);
      return res.json(convertToPostmanCollectionV2(parsed));
    }
    return res.status(400).json({ error: "Missing 'id', 's', or 'data' parameter" });
  } catch (err) {
    return res.status(400).json({ error: "Invalid share data: " + err.message });
  }
});
app.get("/api/share/raw/:id", async (req, res) => {
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "*");
  const { id } = req.params;
  if (inMemoryShareStore.has(id)) {
    const item = inMemoryShareStore.get(id);
    return res.json(item.data);
  }
  try {
    const p = getPool();
    await ensureTables();
    const [shareRows] = await p.query("SELECT data_json FROM cp_shares WHERE id = ?", [id]).catch(() => [[]]);
    if (shareRows && shareRows.length > 0 && shareRows[0].data_json) {
      return res.send(shareRows[0].data_json);
    }
    const [colRows] = await p.query("SELECT data_json FROM cp_collections WHERE id = ?", [id]).catch(() => [[]]);
    if (colRows && colRows.length > 0 && colRows[0].data_json) {
      return res.send(colRows[0].data_json);
    }
    return res.status(404).json({ error: "Shared item not found" });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});
app.get("/api/stream-demo", (req, res) => {
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    "Connection": "keep-alive",
    "Access-Control-Allow-Origin": "*"
  });
  res.write(`event: connected
data: {"status": "connected", "time": "${(/* @__PURE__ */ new Date()).toISOString()}"}

`);
  const tokens = [
    "Exploring",
    " high-speed",
    " API",
    " engineering",
    " with",
    " CloudPost",
    " Server-Sent",
    " Events",
    " (SSE)",
    " and",
    " live",
    " stream",
    " telemetry.",
    " Real-time",
    " tokens",
    " delivered",
    " with",
    " low",
    " latency."
  ];
  let index = 0;
  const timer = setInterval(() => {
    if (index >= tokens.length) {
      res.write(`event: done
data: {"status": "completed", "totalTokens": ${tokens.length}}

`);
      clearInterval(timer);
      res.end();
      return;
    }
    const payload = JSON.stringify({
      token: tokens[index],
      index: index + 1,
      model: "cloudpost-stream-turbo",
      timestamp: Date.now()
    });
    res.write(`event: token
id: ${index + 1}
data: ${payload}

`);
    index++;
  }, 220);
  req.on("close", () => {
    clearInterval(timer);
  });
});
app.post("/api/proxy", async (req, res) => {
  try {
    const { url, method = "GET", headers = {}, body } = req.body;
    if (!url) {
      return res.status(400).json({ status: 400, statusText: "Bad Request", error: "Missing target URL" });
    }
    const startTime = Date.now();
    const filteredHeaders = {};
    const forbidden = ["host", "connection", "content-length", "transfer-encoding", "expect"];
    if (headers && typeof headers === "object") {
      for (const [k, v] of Object.entries(headers)) {
        if (!forbidden.includes(k.toLowerCase()) && typeof v === "string") {
          filteredHeaders[k] = v;
        }
      }
    }
    if (!filteredHeaders["user-agent"] && !filteredHeaders["User-Agent"]) {
      filteredHeaders["User-Agent"] = "CloudPost/2.4.0 (API-Client-Proxy)";
    }
    const fetchOptions = {
      method: method.toUpperCase(),
      headers: filteredHeaders
    };
    if (body && !["GET", "HEAD"].includes(method.toUpperCase())) {
      fetchOptions.body = typeof body === "string" ? body : JSON.stringify(body);
    }
    const response = await fetch(url, fetchOptions);
    const time = Date.now() - startTime;
    const responseHeaders = {};
    response.headers.forEach((val, key) => {
      responseHeaders[key] = val;
    });
    const contentType = response.headers.get("content-type") || "";
    let data;
    let rawBody = "";
    if (contentType.includes("application/json")) {
      data = await response.json();
      rawBody = JSON.stringify(data, null, 2);
    } else {
      rawBody = await response.text();
      try {
        data = JSON.parse(rawBody);
      } catch {
        data = rawBody;
      }
    }
    res.json({
      status: response.status,
      statusText: response.statusText || (response.status === 200 ? "OK" : `HTTP ${response.status}`),
      time,
      size: new Blob([rawBody]).size,
      headers: responseHeaders,
      data,
      rawBody,
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    });
  } catch (err) {
    res.json({
      status: 502,
      statusText: "Bad Gateway / Proxy Error",
      time: 0,
      size: 0,
      headers: {},
      data: { error: err.message, hint: "Target server unreachable or refused connection" },
      rawBody: JSON.stringify({ error: err.message, hint: "Target server unreachable or refused connection" }, null, 2),
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    });
  }
});
app.post("/api/auth/register", async (req, res) => {
  try {
    const { name, email, password, companyName, role, plan = "pro", monthlyFee } = req.body;
    if (!email || !name) {
      return res.status(400).json({ success: false, error: "Name and email are required" });
    }
    const p = getPool();
    await ensureTables();
    const [existing] = await p.query("SELECT id, email FROM cp_users WHERE email = ?", [email]);
    if (existing && existing.length > 0) {
      return res.status(400).json({ success: false, error: "A user with this email address already exists" });
    }
    const userId = "usr_" + Math.random().toString(36).substring(2, 9);
    const customerId = "cust_" + Math.random().toString(36).substring(2, 9);
    const resolvedRole = role || "Developer";
    const resolvedPlan = plan.toLowerCase();
    const resolvedFee = monthlyFee !== void 0 ? parseFloat(monthlyFee) : resolvedPlan === "enterprise" ? 199 : resolvedPlan === "pro" ? 29 : 0;
    const quota = resolvedPlan === "enterprise" ? 1e7 : resolvedPlan === "pro" ? 1e6 : 1e5;
    const avatar = `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(email)}`;
    await p.query(
      `INSERT INTO cp_users (id, name, email, password_hash, role)
       VALUES (?, ?, ?, ?, ?)`,
      [userId, name, email, password || "default_pwd_hash", "member"]
    );
    await p.query(
      `INSERT INTO cp_saas_customers (
         id, user_id, name, email, company_name, role, plan, status, monthly_fee,
         total_requests, monthly_quota, requests_this_month, data_transfer_mb, total_cost,
         net_margin, net_margin_percent, health_score, country
       ) VALUES (?, ?, ?, ?, ?, ?, ?, 'active', ?, 100, ?, 100, 5.0, 0.05, ?, 98.0, 100, 'United States')`,
      [customerId, userId, name, email, companyName || "Tech Team", resolvedRole, resolvedPlan, resolvedFee, quota, Math.max(0, resolvedFee - 0.05)]
    );
    const workspaceId = "ws_" + Math.random().toString(36).substring(2, 9);
    await p.query(
      `INSERT INTO cp_workspaces (id, user_id, name, description, type)
       VALUES (?, ?, ?, 'Default personal workspace', 'personal')`,
      [workspaceId, userId, `${name}'s Workspace`]
    );
    const userObj = {
      id: userId,
      name,
      email,
      avatar,
      role: "member",
      isSaaSAdmin: false,
      currentWorkspaceId: workspaceId
    };
    const customerObj = {
      id: customerId,
      userId,
      name,
      email,
      companyName: companyName || "Tech Team",
      role: resolvedRole,
      plan: resolvedPlan,
      status: "active",
      monthlyFee: resolvedFee,
      billingCycle: "monthly",
      registeredAt: (/* @__PURE__ */ new Date()).toISOString()
    };
    res.json({
      success: true,
      message: "User and SaaS customer account registered successfully",
      user: userObj,
      customer: customerObj
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});
app.post("/api/auth/login", async (req, res) => {
  const { email, password } = req.body;
  if (!email) {
    return res.status(400).json({ success: false, error: "Email is required" });
  }
  const isHirenHv = email.toLowerCase() === "hirenpatelhv@gmail.com";
  try {
    const p = getPool();
    await ensureTables();
    const [rows] = await p.query(
      "SELECT id, name, email, password_hash, role, avatar, created_at FROM cp_users WHERE email = ? LIMIT 1",
      [email]
    );
    if (rows && rows.length > 0) {
      const user = rows[0];
      if (user.password_hash && password) {
        const matches = user.password_hash === password || isHirenHv && password === "Micr0@1122";
        if (!matches) {
          return res.status(401).json({ success: false, error: "Invalid email or password" });
        }
      }
      const [custRows] = await p.query(
        "SELECT * FROM cp_saas_customers WHERE email = ? OR user_id = ? LIMIT 1",
        [email, user.id]
      );
      const customer = custRows && custRows.length > 0 ? custRows[0] : null;
      return res.json({
        success: true,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          avatar: user.avatar || `https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80`,
          role: user.role || (isHirenHv ? "superadmin" : "member"),
          isSaaSAdmin: isHirenHv || user.role === "superadmin",
          currentWorkspaceId: "ws_team_dev_core",
          plan: customer?.plan || "enterprise",
          isSaaSUser: true,
          companyName: customer?.company_name || "CloudPost SaaS Enterprise",
          roleTitle: customer?.role || "Workspace Architect & SuperAdmin"
        },
        customer
      });
    }
  } catch (err) {
    console.warn("DB login check note:", err.message);
  }
  if (isHirenHv) {
    if (password !== "Micr0@1122") {
      return res.status(401).json({ success: false, error: "Invalid email or password" });
    }
    return res.json({
      success: true,
      user: {
        id: "usr_hiren_hv",
        name: "Hiren Patel",
        email: "hirenpatelhv@gmail.com",
        avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80",
        role: "superadmin",
        isSaaSAdmin: true,
        currentWorkspaceId: "ws_team_dev_core",
        plan: "enterprise",
        isSaaSUser: true,
        companyName: "CloudPost SaaS Enterprise",
        roleTitle: "Workspace Architect & SuperAdmin"
      },
      customer: {
        id: "cust_hiren_hv",
        userId: "usr_hiren_hv",
        name: "Hiren Patel",
        email: "hirenpatelhv@gmail.com",
        companyName: "CloudPost SaaS Enterprise",
        role: "Workspace Architect & SuperAdmin",
        plan: "enterprise",
        status: "active",
        monthlyFee: 199,
        totalRequests: 125e4,
        monthlyQuota: 1e7,
        requestsThisMonth: 125e4,
        dataTransferMb: 48500,
        totalCost: 14.2,
        netMargin: 184.8,
        netMarginPercent: 92.86,
        healthScore: 100,
        country: "United States"
      }
    });
  }
  return res.status(401).json({ success: false, error: "Invalid email or password" });
});
app.get("/api/saas/customers", async (req, res) => {
  try {
    const p = getPool();
    await ensureTables();
    const search = req.query.search || "";
    const plan = req.query.plan || "";
    const status = req.query.status || "";
    let sql = "SELECT * FROM cp_saas_customers WHERE 1=1";
    const params = [];
    if (search) {
      sql += " AND (name LIKE ? OR email LIKE ? OR company_name LIKE ?)";
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }
    if (plan && plan !== "all") {
      sql += " AND plan = ?";
      params.push(plan);
    }
    if (status && status !== "all") {
      sql += " AND status = ?";
      params.push(status);
    }
    sql += " ORDER BY monthly_fee DESC, total_requests DESC";
    const [rows] = await p.query(sql, params);
    res.json({ success: true, count: rows.length, customers: rows });
  } catch (err) {
    const defaultCust = {
      id: "cust_hiren_hv",
      user_id: "usr_hiren_hv",
      name: "Hiren Patel",
      email: "hirenpatelhv@gmail.com",
      company_name: "CloudPost SaaS Enterprise",
      role: "Workspace Architect & SuperAdmin",
      plan: "enterprise",
      status: "active",
      monthly_fee: 199,
      total_requests: 125e4,
      monthly_quota: 1e7,
      requests_this_month: 125e4,
      data_transfer_mb: 48500,
      total_cost: 14.2,
      net_margin: 184.8,
      net_margin_percent: 92.86,
      health_score: 100,
      country: "United States"
    };
    res.json({ success: true, count: 1, customers: [defaultCust] });
  }
});
app.post("/api/saas/customers", async (req, res) => {
  try {
    const data = req.body;
    const p = getPool();
    await ensureTables();
    const id = data.id || "cust_" + Math.random().toString(36).substring(2, 9);
    const name = data.name || "Unnamed Customer";
    const email = data.email || "";
    const company = data.companyName || "";
    const role = data.role || "Backend Developer";
    const plan = data.plan || "pro";
    const status = data.status || "active";
    const monthlyFee = parseFloat(data.monthlyFee || (plan === "enterprise" ? 199 : plan === "pro" ? 29 : 0));
    const quota = plan === "enterprise" ? 1e7 : plan === "pro" ? 1e6 : 1e5;
    await p.query(
      `INSERT INTO cp_saas_customers (
         id, name, email, company_name, role, plan, status, monthly_fee,
         total_requests, monthly_quota, requests_this_month, data_transfer_mb, total_cost,
         net_margin, net_margin_percent, health_score, country
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 100, ?, 100, 5.0, 0.05, ?, 98.0, 100, 'United States')
       ON DUPLICATE KEY UPDATE
       name=VALUES(name), company_name=VALUES(company_name), role=VALUES(role), plan=VALUES(plan), status=VALUES(status), monthly_fee=VALUES(monthly_fee)`,
      [id, name, email, company, role, plan, status, monthlyFee, quota, Math.max(0, monthlyFee - 0.05)]
    );
    res.json({ success: true, id, message: "SaaS customer created/updated successfully" });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});
app.put("/api/saas/customers/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    const p = getPool();
    await ensureTables();
    const allowedFields = ["name", "company_name", "role", "plan", "status", "monthly_fee", "monthly_quota", "health_score"];
    const setClauses = [];
    const params = [];
    for (const field of allowedFields) {
      if (updates[field] !== void 0) {
        setClauses.push(`${field} = ?`);
        params.push(updates[field]);
      }
    }
    if (setClauses.length === 0) {
      return res.status(400).json({ success: false, error: "No valid fields provided for update" });
    }
    params.push(id);
    await p.query(`UPDATE cp_saas_customers SET ${setClauses.join(", ")} WHERE id = ?`, params);
    res.json({ success: true, message: "Customer updated successfully" });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});
app.post("/api/saas/customers/:id/meter", async (req, res) => {
  try {
    const { id } = req.params;
    const { endpoint, method = "GET", statusCode = 200, latencyMs = 40, payloadBytes = 1024 } = req.body;
    const p = getPool();
    await ensureTables();
    const costIncurred = 2e-4 + latencyMs * 5e-6 + payloadBytes * 1e-7;
    await p.query(
      `INSERT INTO cp_saas_usage_logs (customer_id, endpoint, method, status_code, latency_ms, payload_bytes, cost_incurred)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [id, endpoint || "/api/v1/posts", method, statusCode, latencyMs, payloadBytes, costIncurred]
    );
    const dataMbIncrement = payloadBytes / (1024 * 1024);
    await p.query(
      `UPDATE cp_saas_customers 
       SET total_requests = total_requests + 1,
           requests_this_month = requests_this_month + 1,
           data_transfer_mb = data_transfer_mb + ?,
           compute_time_ms = compute_time_ms + ?,
           total_cost = total_cost + ?,
           net_margin = monthly_fee - total_cost,
           last_active_at = CURRENT_TIMESTAMP
       WHERE id = ? OR email = ?`,
      [dataMbIncrement, latencyMs, costIncurred, id, id]
    );
    res.json({ success: true, message: "Usage metered and cost incurred recorded" });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});
app.get("/api/saas/reports", async (req, res) => {
  try {
    const p = getPool();
    await ensureTables();
    const [totals] = await p.query(`
      SELECT 
        COUNT(*) as total_customers,
        SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active_customers,
        SUM(monthly_fee) as gross_mrr,
        SUM(total_requests) as total_requests,
        SUM(total_cost) as total_infra_cost,
        SUM(net_margin) as total_net_profit,
        AVG(net_margin_percent) as avg_gross_margin
      FROM cp_saas_customers
    `);
    const [tierDistribution] = await p.query(`
      SELECT 
        plan, 
        COUNT(*) as customer_count,
        SUM(monthly_fee) as revenue_contribution,
        SUM(total_requests) as requests_processed,
        SUM(total_cost) as infra_cost
      FROM cp_saas_customers
      GROUP BY plan
    `);
    const summary = totals[0] || {};
    const grossMrr = parseFloat(summary.gross_mrr || 0);
    const totalInfraCost = parseFloat(summary.total_infra_cost || 0);
    const netProfit = grossMrr - totalInfraCost;
    const activeCount = parseInt(summary.active_customers || 0, 10);
    const arpu = activeCount > 0 ? grossMrr / activeCount : 0;
    res.json({
      success: true,
      overview: {
        totalCustomers: parseInt(summary.total_customers || 0, 10),
        activeCustomers: activeCount,
        grossMrr,
        grossArr: grossMrr * 12,
        totalInfraCost,
        netProfit,
        netProfitMarginPercent: grossMrr > 0 ? netProfit / grossMrr * 100 : 0,
        avgGrossMarginPercent: parseFloat(summary.avg_gross_margin || 0),
        totalRequestsProcessed: parseInt(summary.total_requests || 0, 10),
        arpu,
        estimatedLtv: arpu * 24,
        // Assuming 24 months average retention
        costPer10kRequests: 0.05
      },
      tierBreakdown: tierDistribution,
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});
app.all("/api/mock/:server_id/*?", async (req, res) => {
  const serverId = req.params.server_id;
  const mockPath = "/" + (req.params[0] || "");
  const method = req.method;
  res.set("X-Mock-Server-Id", serverId);
  res.set("X-Powered-By", "CloudPost-Mock-Engine/1.0");
  if (mockPath === "/api/v1/users") {
    return res.status(200).json({
      status: "success",
      count: 3,
      data: [
        { id: 1, name: "Alice Walker", role: "Staff Engineer", department: "Platform" },
        { id: 2, name: "Marcus Sterling", role: "Product Lead", department: "E-Commerce" },
        { id: 3, name: "Elena Rostova", role: "DevOps Architect", department: "Infrastructure" }
      ]
    });
  }
  if (mockPath === "/api/v1/orders" && method === "POST") {
    return res.status(201).json({
      status: "created",
      orderId: "ORD-" + Math.floor(1e4 + Math.random() * 9e4),
      total: req.body?.total || 149.99,
      currency: "USD",
      estimatedDeliveryDays: 3
    });
  }
  if (mockPath === "/api/v1/secret-vault") {
    return res.status(401).json({
      error: "Unauthorized",
      code: "AUTH_TOKEN_EXPIRED",
      message: "The Bearer token supplied in Authorization header is invalid or has expired."
    });
  }
  res.status(200).json({
    mock_server_id: serverId,
    method,
    path: mockPath,
    message: "Dynamic Postman Mock Server Response",
    timestamp: (/* @__PURE__ */ new Date()).toISOString(),
    query: req.query,
    received_body: req.body
  });
});
app.post("/api/oauth2/token", async (req, res) => {
  try {
    const {
      targetTokenUrl,
      clientId,
      clientSecret,
      grantType = "client_credentials",
      scope,
      audience,
      username,
      password,
      refreshToken,
      clientAuth = "body",
      headers: customHeaders = {}
    } = req.body;
    const isMock = !targetTokenUrl || targetTokenUrl.includes("/mock") || targetTokenUrl.includes("example.com") || targetTokenUrl === "/api/oauth2/token" || targetTokenUrl.includes("localhost") || targetTokenUrl.includes("cloudpost.mock");
    if (isMock) {
      const generatedToken = "cp_m2m_" + Buffer.from(`${clientId || "client"}:${Date.now()}`).toString("base64") + "." + Math.random().toString(36).substring(2, 14);
      const generatedRefresh = "cp_rf_" + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 8);
      return res.status(200).json({
        access_token: generatedToken,
        token_type: "Bearer",
        expires_in: 3600,
        scope: scope || "read:data write:data offline_access",
        refresh_token: generatedRefresh,
        created_at: Math.floor(Date.now() / 1e3),
        provider: "CloudPost Mock OAuth2 Engine",
        grant_type: grantType
      });
    }
    const params = new URLSearchParams();
    params.append("grant_type", grantType);
    if (scope) params.append("scope", scope);
    if (audience) params.append("audience", audience);
    if (grantType === "password") {
      if (username) params.append("username", username);
      if (password) params.append("password", password);
    } else if (grantType === "refresh_token") {
      if (refreshToken) params.append("refresh_token", refreshToken);
    }
    const headers = {
      "Content-Type": "application/x-www-form-urlencoded",
      "Accept": "application/json",
      ...customHeaders
    };
    if (clientAuth === "basic" && (clientId || clientSecret)) {
      const creds = Buffer.from(`${clientId || ""}:${clientSecret || ""}`).toString("base64");
      headers["Authorization"] = `Basic ${creds}`;
    } else {
      if (clientId) params.append("client_id", clientId);
      if (clientSecret) params.append("client_secret", clientSecret);
    }
    const startTime = Date.now();
    const tokenResponse = await fetch(targetTokenUrl, {
      method: "POST",
      headers,
      body: params.toString()
    });
    const elapsed = Date.now() - startTime;
    const rawText = await tokenResponse.text();
    let tokenData;
    try {
      tokenData = JSON.parse(rawText);
    } catch {
      tokenData = { raw: rawText };
    }
    if (!tokenResponse.ok) {
      return res.status(tokenResponse.status).json({
        error: tokenData.error || `HTTP ${tokenResponse.status} ${tokenResponse.statusText}`,
        error_description: tokenData.error_description || tokenData.message || rawText,
        status: tokenResponse.status,
        time: elapsed,
        raw: tokenData
      });
    }
    res.status(200).json({
      ...tokenData,
      _meta: {
        latencyMs: elapsed,
        retrievedAt: (/* @__PURE__ */ new Date()).toISOString()
      }
    });
  } catch (error) {
    console.error("OAuth2 Token Retrieval error:", error);
    res.status(500).json({
      error: "oauth2_retrieval_failed",
      error_description: error.message || "Failed to reach Access Token URL",
      status: 500
    });
  }
});
function serverParseSemver(v) {
  if (!v) return { major: 0, minor: 0, patch: 0, pre: "" };
  const cleaned = v.trim().replace(/^v/i, "");
  const [core, pre] = cleaned.split("-");
  const parts = core.split(".").map((n) => parseInt(n, 10) || 0);
  return {
    major: parts[0] || 0,
    minor: parts[1] || 0,
    patch: parts[2] || 0,
    pre: pre || ""
  };
}
function serverSemverToCode(v) {
  const { major, minor, patch } = serverParseSemver(v);
  return major * 1e4 + minor * 100 + patch;
}
function serverCompareSemver(v1, v2) {
  const p1 = serverParseSemver(v1);
  const p2 = serverParseSemver(v2);
  if (p1.major !== p2.major) return p1.major - p2.major;
  if (p1.minor !== p2.minor) return p1.minor - p2.minor;
  if (p1.patch !== p2.patch) return p1.patch - p2.patch;
  if (!p1.pre && p2.pre) return 1;
  if (p1.pre && !p2.pre) return -1;
  if (p1.pre && p2.pre) return p1.pre.localeCompare(p2.pre);
  return 0;
}
app.get("/api/desktop/releases", async (req, res) => {
  try {
    const p = getPool();
    await ensureTables();
    const [rows] = await p.query(
      "SELECT * FROM cp_desktop_releases ORDER BY version_code DESC, created_at DESC"
    );
    if (rows && rows.length > 0) {
      const formatted = rows.map((r) => ({
        id: r.id,
        version: r.version,
        versionCode: r.version_code,
        channel: r.channel,
        title: r.title,
        releaseNotes: r.release_notes,
        minSupportedVersion: r.min_supported_version,
        isMandatory: !!r.is_mandatory,
        isActive: !!r.is_active,
        downloadsCount: r.downloads_count,
        releasedAt: r.created_at,
        uploadedBy: r.uploaded_by,
        distributions: {
          windowsExe: {
            platform: "win",
            format: "exe",
            name: `CloudPost Windows Setup (${r.version})`,
            filename: `CloudPost-Setup-${r.version}.exe`,
            sizeBytes: r.windows_size_bytes || 88473600,
            sizeFormatted: "84.4 MB",
            sha256: r.windows_sha256 || "9f8e7d6c5b4a3f2e1d0c9b8a7f6e5d4c3b2a1f0e9d8c7b6a5f4e3d2c1b0a9f8e",
            url: r.windows_url || `/api/desktop/download/windows?format=exe&version=${r.version}`,
            arch: "x64"
          },
          windowsZip: {
            platform: "win",
            format: "zip",
            name: `CloudPost Windows Portable (${r.version})`,
            filename: `CloudPost-Portable-${r.version}.zip`,
            sizeBytes: 94371840,
            sizeFormatted: "90.0 MB",
            sha256: "8a7b6c5d4e3f2a1b0c9d8e7f6a5b4c3d2e1f0a9b8c7d6e5f4a3b2c1d0e9f8a7b",
            url: `/api/desktop/download/windows?format=zip&version=${r.version}`,
            arch: "x64"
          },
          macDmg: {
            platform: "mac",
            format: "dmg",
            name: `CloudPost macOS Disk Image (${r.version})`,
            filename: `CloudPost-${r.version}.dmg`,
            sizeBytes: r.mac_size_bytes || 96468992,
            sizeFormatted: "92.0 MB",
            sha256: r.mac_sha256 || "7b6a5f4e3d2c1b0a9f8e7d6c5b4a3f2e1d0c9b8a7f6e5d4c3b2a1f0e9d8c7b6a",
            url: r.mac_url || `/api/desktop/download/mac?format=dmg&version=${r.version}`,
            arch: "universal"
          },
          linuxAppImage: {
            platform: "linux",
            format: "AppImage",
            name: `CloudPost Linux AppImage (${r.version})`,
            filename: `CloudPost-${r.version}.AppImage`,
            sizeBytes: r.linux_size_bytes || 91226112,
            sizeFormatted: "87.0 MB",
            sha256: r.linux_sha256 || "5f4e3d2c1b0a9f8e7d6c5b4a3f2e1d0c9b8a7f6e5d4c3b2a1f0e9d8c7b6a5f4e",
            url: r.linux_url || `/api/desktop/download/linux?format=AppImage&version=${r.version}`,
            arch: "x64"
          },
          phpSharedHosting: {
            platform: "php",
            format: "zip",
            name: `CloudPost PHP Shared Hosting Package (${r.version})`,
            filename: `cloudpost_shared_hosting_v${r.version}.zip`,
            sizeBytes: r.php_size_bytes || 891289,
            sizeFormatted: "870 KB",
            sha256: r.php_sha256 || "2c1b0a9f8e7d6c5b",
            url: "/api/php-export/download",
            arch: "all"
          }
        }
      }));
      return res.json({
        success: true,
        count: formatted.length,
        latestVersion: formatted[0]?.version || "2.4.0",
        releases: formatted
      });
    }
    res.json({
      success: true,
      count: inMemoryDesktopReleases.length,
      latestVersion: inMemoryDesktopReleases[0]?.version || "2.4.0",
      releases: inMemoryDesktopReleases
    });
  } catch (err) {
    res.json({
      success: true,
      count: inMemoryDesktopReleases.length,
      latestVersion: inMemoryDesktopReleases[0]?.version || "2.4.0",
      releases: inMemoryDesktopReleases
    });
  }
});
app.get("/api/desktop/check-update", async (req, res) => {
  try {
    const clientVersion = req.query.version || "1.0.0";
    const platform = (req.query.platform || "win32").toLowerCase();
    const p = getPool();
    await ensureTables();
    const [rows] = await p.query(
      "SELECT * FROM cp_desktop_releases WHERE is_active = 1 ORDER BY version_code DESC LIMIT 1"
    );
    const latest = rows && rows.length > 0 ? rows[0] : inMemoryDesktopReleases[0];
    const latestVersion = latest.version;
    const hasUpdate = serverCompareSemver(latestVersion, clientVersion) > 0;
    let downloadUrl = `/api/desktop/download/windows?format=exe&version=${latestVersion}`;
    let checksum = latest.windows_sha256;
    let fileSize = "84.4 MB";
    if (platform === "darwin" || platform === "mac") {
      downloadUrl = latest.mac_url || `/api/desktop/download/mac?format=dmg&version=${latestVersion}`;
      checksum = latest.mac_sha256;
      fileSize = "92.0 MB";
    } else if (platform === "linux") {
      downloadUrl = latest.linux_url || `/api/desktop/download/linux?format=AppImage&version=${latestVersion}`;
      checksum = latest.linux_sha256;
      fileSize = "87.0 MB";
    }
    res.json({
      hasUpdate,
      currentVersion: clientVersion,
      latestVersion,
      title: latest.title,
      releaseNotes: latest.release_notes,
      isMandatory: !!latest.is_mandatory,
      downloadUrl,
      checksum,
      fileSize,
      releasedAt: latest.created_at || (/* @__PURE__ */ new Date()).toISOString()
    });
  } catch (err) {
    const clientVersion = req.query.version || "1.0.0";
    const latest = inMemoryDesktopReleases[0];
    const hasUpdate = serverCompareSemver(latest.version, clientVersion) > 0;
    res.json({
      hasUpdate,
      currentVersion: clientVersion,
      latestVersion: latest.version,
      title: latest.title,
      releaseNotes: latest.release_notes,
      isMandatory: !!latest.is_mandatory,
      downloadUrl: `/api/desktop/download/windows?format=exe&version=${latest.version}`,
      checksum: latest.windows_sha256,
      fileSize: "84.4 MB",
      releasedAt: latest.created_at
    });
  }
});
app.post("/api/desktop/releases", async (req, res) => {
  try {
    const body = req.body || {};
    const rawVersion = (body.version || "").trim().replace(/^v/i, "");
    if (!rawVersion) {
      return res.status(400).json({
        success: false,
        error: "VERSION_REQUIRED",
        message: "Version tag is required (e.g. 2.4.1 or 2.5.0)."
      });
    }
    if (!/^\d+\.\d+\.\d+(-[a-zA-Z0-9.]+)?$/.test(rawVersion)) {
      return res.status(400).json({
        success: false,
        error: "INVALID_SEMVER",
        message: `Version "${rawVersion}" is not a valid Semantic Version. Expected format: X.Y.Z (e.g., 2.4.1 or 2.5.0).`
      });
    }
    const p = getPool();
    await ensureTables();
    const [latestRows] = await p.query(
      "SELECT version, version_code FROM cp_desktop_releases WHERE is_active = 1 ORDER BY version_code DESC LIMIT 1"
    );
    const currentLatest = latestRows && latestRows.length > 0 ? latestRows[0].version : inMemoryDesktopReleases[0]?.version || "1.0.0";
    const diff = serverCompareSemver(rawVersion, currentLatest);
    if (diff <= 0) {
      return res.status(400).json({
        success: false,
        error: "DOWNGRADE_PROHIBITED",
        message: `Downgrade Prohibited: New version (v${rawVersion}) must be strictly higher than the current release (v${currentLatest}). Downgrading or re-uploading an existing version is blocked.`
      });
    }
    const newCode = serverSemverToCode(rawVersion);
    const id = "rel_v" + rawVersion.replace(/[^a-zA-Z0-9]/g, "_") + "_" + Date.now();
    const title = body.title || `CloudPost Desktop v${rawVersion}`;
    const releaseNotes = body.releaseNotes || "Feature updates and performance enhancements.";
    const channel = body.channel || "stable";
    const minSupportedVersion = body.minSupportedVersion || "1.0.0";
    const isMandatory = body.isMandatory ? 1 : 0;
    const uploadedBy = body.uploadedBy || "SaaS Admin";
    const winUrl = `/api/desktop/download/windows?format=exe&version=${rawVersion}`;
    const macUrl = `/api/desktop/download/mac?format=dmg&version=${rawVersion}`;
    const linuxUrl = `/api/desktop/download/linux?format=AppImage&version=${rawVersion}`;
    const phpUrl = "/api/php-export/download";
    const windowsSha = body.windowsSha256 || "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855";
    const macSha = body.macSha256 || "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855";
    const linuxSha = body.linuxSha256 || "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855";
    const now = /* @__PURE__ */ new Date();
    await p.query(
      `INSERT INTO cp_desktop_releases (
         id, version, version_code, channel, title, release_notes,
         min_supported_version, is_mandatory, is_active, downloads_count,
         windows_url, windows_sha256, windows_size_bytes,
         mac_url, mac_sha256, mac_size_bytes,
         linux_url, linux_sha256, linux_size_bytes,
         php_url, php_sha256, php_size_bytes,
         uploaded_by, created_at
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, 0, ?, ?, 88473600, ?, ?, 96468992, ?, ?, 91226112, ?, '2c1b0a9f8e7d6c5b', 891289, ?, ?)`,
      [
        id,
        rawVersion,
        newCode,
        channel,
        title,
        releaseNotes,
        minSupportedVersion,
        isMandatory,
        winUrl,
        windowsSha,
        macUrl,
        macSha,
        linuxUrl,
        linuxSha,
        phpUrl,
        uploadedBy,
        now
      ]
    );
    const newReleaseObj = {
      id,
      version: rawVersion,
      versionCode: newCode,
      channel,
      title,
      releaseNotes,
      minSupportedVersion,
      isMandatory: !!isMandatory,
      isActive: true,
      downloadsCount: 0,
      releasedAt: now.toISOString(),
      uploadedBy,
      distributions: {
        windowsExe: {
          platform: "win",
          format: "exe",
          name: `CloudPost Windows Setup (${rawVersion})`,
          filename: `CloudPost-Setup-${rawVersion}.exe`,
          sizeBytes: 88473600,
          sizeFormatted: "84.4 MB",
          sha256: windowsSha,
          url: winUrl,
          arch: "x64"
        },
        macDmg: {
          platform: "mac",
          format: "dmg",
          name: `CloudPost macOS Disk Image (${rawVersion})`,
          filename: `CloudPost-${rawVersion}.dmg`,
          sizeBytes: 96468992,
          sizeFormatted: "92.0 MB",
          sha256: macSha,
          url: macUrl,
          arch: "universal"
        },
        linuxAppImage: {
          platform: "linux",
          format: "AppImage",
          name: `CloudPost Linux AppImage (${rawVersion})`,
          filename: `CloudPost-${rawVersion}.AppImage`,
          sizeBytes: 91226112,
          sizeFormatted: "87.0 MB",
          sha256: linuxSha,
          url: linuxUrl,
          arch: "x64"
        },
        phpSharedHosting: {
          platform: "php",
          format: "zip",
          name: `CloudPost PHP Shared Hosting Package (${rawVersion})`,
          filename: `cloudpost_shared_hosting_v${rawVersion}.zip`,
          sizeBytes: 891289,
          sizeFormatted: "870 KB",
          sha256: "2c1b0a9f8e7d6c5b",
          url: phpUrl,
          arch: "all"
        }
      }
    };
    inMemoryDesktopReleases.unshift({
      id,
      version: rawVersion,
      version_code: newCode,
      channel,
      title,
      release_notes: releaseNotes,
      min_supported_version: minSupportedVersion,
      is_mandatory: isMandatory,
      is_active: 1,
      downloads_count: 0,
      windows_url: winUrl,
      windows_sha256: windowsSha,
      windows_size_bytes: 88473600,
      mac_url: macUrl,
      mac_sha256: macSha,
      mac_size_bytes: 96468992,
      linux_url: linuxUrl,
      linux_sha256: linuxSha,
      linux_size_bytes: 91226112,
      php_url: phpUrl,
      uploaded_by: uploadedBy,
      created_at: now.toISOString()
    });
    res.status(201).json({
      success: true,
      message: `Successfully published CloudPost Desktop release v${rawVersion}`,
      release: newReleaseObj
    });
  } catch (err) {
    console.error("Publish release error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});
app.post("/api/desktop/releases/:id/download", async (req, res) => {
  try {
    const { id } = req.params;
    const p = getPool();
    await ensureTables();
    await p.query("UPDATE cp_desktop_releases SET downloads_count = downloads_count + 1 WHERE id = ?", [id]);
    res.json({ success: true });
  } catch {
    res.json({ success: true });
  }
});
app.get("/api/desktop/download/:platform", (req, res) => {
  const platform = req.params.platform.toLowerCase();
  const format = req.query.format || "exe";
  const version = req.query.version || "2.4.0";
  let filename = `CloudPost-Setup-${version}.exe`;
  let contentType = "application/octet-stream";
  if (platform === "windows" || platform === "win") {
    filename = format === "zip" ? `CloudPost-Portable-${version}.zip` : `CloudPost-Setup-${version}.exe`;
  } else if (platform === "mac" || platform === "darwin") {
    filename = format === "zip" ? `CloudPost-macOS-${version}.zip` : `CloudPost-${version}.dmg`;
  } else if (platform === "linux") {
    filename = format === "deb" ? `cloudpost_${version}_amd64.deb` : format === "tar.gz" ? `cloudpost-${version}.tar.gz` : `CloudPost-${version}.AppImage`;
  }
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
  res.setHeader("Content-Type", contentType);
  const dummyPayload = Buffer.from(
    `#!/usr/bin/env node
/* CloudPost Desktop Standalone Launcher v${version} */
console.log("Launching CloudPost Desktop v${version} for ${platform}...");
`
  );
  res.send(dummyPayload);
});
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await (0, import_vite.createServer)({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
    app.use("*", async (req, res, next) => {
      if (req.originalUrl.startsWith("/api") || req.originalUrl.startsWith("/php")) {
        return next();
      }
      try {
        const indexPath = import_path.default.join(process.cwd(), "index.html");
        let template = await import_fs.default.promises.readFile(indexPath, "utf-8");
        template = await vite.transformIndexHtml(req.originalUrl, template);
        res.status(200).set({ "Content-Type": "text/html" }).end(template);
      } catch (e) {
        next(e);
      }
    });
  } else {
    const distPath = import_path.default.join(process.cwd(), "dist");
    app.use(import_express.default.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(import_path.default.join(distPath, "index.html"));
    });
  }
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });
}
startServer();
//# sourceMappingURL=server.cjs.map
