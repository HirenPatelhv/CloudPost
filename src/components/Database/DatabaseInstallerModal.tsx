import React, { useState, useEffect } from 'react';
import {
  Database,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Server,
  Play,
  Layers,
  FileCode,
  ExternalLink,
  X,
  Sparkles,
  Cpu,
  Table,
  Sliders
} from 'lucide-react';
import {
  testDbConnection,
  createDatabase,
  runSchemaMigration,
  getDatabaseTablesStatus,
  optimizeDatabaseTables,
  saveDatabaseConfig,
  DbTableMetric,
  DbInstallerConfig,
} from '../../services/dbStorage';

interface DatabaseInstallerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const DatabaseInstallerModal: React.FC<DatabaseInstallerModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [activeTab, setActiveTab] = useState<'installer' | 'tables' | 'sql' | 'php'>('installer');
  const [config, setConfig] = useState<DbInstallerConfig>({
    host: 'localhost',
    port: 3306,
    database: 'u320472937_postman',
    user: 'u320472937_postman',
    password: 'Micr0@112233',
  });

  const [connectionStatus, setConnectionStatus] = useState<{
    tested: boolean;
    connected: boolean;
    databaseExists?: boolean;
    version?: string;
    message?: string;
  }>({ tested: false, connected: false });

  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const [logs, setLogs] = useState<string[]>([
    'MySQL Database Installer & Schema Alterer initialized.',
    'Ready to configure, create, or alter MySQL database tables.',
  ]);

  const [tables, setTables] = useState<DbTableMetric[]>([]);
  const [tableCount, setTableCount] = useState<number>(0);
  const [bannerNotice, setBannerNotice] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    if (isOpen) {
      handleTestConnection(false);
      loadTables();
    }
  }, [isOpen]);

  const addLog = (msg: string) => {
    const time = new Date().toLocaleTimeString();
    setLogs((prev) => [...prev, `[${time}] ${msg}`]);
  };

  const handleTestConnection = async (showNotice = true) => {
    setLoadingAction('test');
    try {
      addLog(`Testing connection to MySQL server at ${config.host}:${config.port}...`);
      const res = await testDbConnection(config);
      if (res.success) {
        setConnectionStatus({
          tested: true,
          connected: true,
          databaseExists: res.databaseExists,
          version: res.version,
          message: res.message,
        });
        addLog(`Connection verified: ${res.message}`);
        if (showNotice) {
          setBannerNotice({
            text: res.message || 'MySQL connection successful.',
            type: 'success',
          });
        }
        loadTables();
      } else {
        setConnectionStatus({
          tested: true,
          connected: false,
          message: res.error,
        });
        addLog(`Connection failed: ${res.error}`);
        if (showNotice) {
          setBannerNotice({
            text: res.error || 'Connection failed.',
            type: 'error',
          });
        }
      }
    } catch (err: any) {
      setConnectionStatus({
        tested: true,
        connected: false,
        message: err.message,
      });
      addLog(`Error: ${err.message}`);
    } finally {
      setLoadingAction(null);
    }
  };

  const handleCreateDatabase = async () => {
    setLoadingAction('create_db');
    try {
      addLog(`Executing CREATE DATABASE IF NOT EXISTS \`${config.database}\`...`);
      const res = await createDatabase(config);
      if (res.success) {
        addLog(`Database created: ${res.message}`);
        setBannerNotice({ text: res.message || 'Database created successfully.', type: 'success' });
        await handleTestConnection(false);
      } else {
        addLog(`Create Database failed: ${res.error}`);
        setBannerNotice({ text: res.error || 'Failed to create database.', type: 'error' });
      }
    } catch (err: any) {
      addLog(`Error: ${err.message}`);
      setBannerNotice({ text: err.message, type: 'error' });
    } finally {
      setLoadingAction(null);
    }
  };

  const handleRunMigrations = async () => {
    setLoadingAction('migrate');
    try {
      addLog('Starting schema migration: Creating and altering tables, columns, and indexes...');
      const res = await runSchemaMigration(config);
      if (res.logs && Array.isArray(res.logs)) {
        res.logs.forEach((l) => addLog(`-> ${l}`));
      }
      if (res.success) {
        addLog(`Schema migration completed: ${res.message}`);
        setBannerNotice({ text: res.message || 'Schema migrated successfully.', type: 'success' });
        await loadTables();
        if (onSuccess) onSuccess();
      } else {
        addLog(`Migration error: ${res.error}`);
        setBannerNotice({ text: res.error || 'Schema migration failed.', type: 'error' });
      }
    } catch (err: any) {
      addLog(`Error: ${err.message}`);
      setBannerNotice({ text: err.message, type: 'error' });
    } finally {
      setLoadingAction(null);
    }
  };

  const handleOptimizeTables = async () => {
    setLoadingAction('optimize');
    try {
      addLog('Optimizing MySQL InnoDB table indexes and storage defragmentation...');
      const res = await optimizeDatabaseTables();
      if (res.success) {
        addLog(`Table optimization completed: ${res.message}`);
        setBannerNotice({ text: res.message || 'All tables optimized.', type: 'success' });
        await loadTables();
      } else {
        addLog(`Optimization failed: ${res.error}`);
        setBannerNotice({ text: res.error || 'Optimization failed.', type: 'error' });
      }
    } catch (err: any) {
      addLog(`Error: ${err.message}`);
    } finally {
      setLoadingAction(null);
    }
  };

  const handleSaveConfig = async () => {
    setLoadingAction('save_config');
    try {
      addLog('Saving and applying database credentials...');
      const res = await saveDatabaseConfig(config);
      if (res.success) {
        addLog(`Credentials applied: ${res.message}`);
        setBannerNotice({ text: res.message || 'Configuration saved.', type: 'success' });
        await handleTestConnection(false);
      } else {
        addLog(`Save config failed: ${res.error}`);
        setBannerNotice({ text: res.error || 'Save failed.', type: 'error' });
      }
    } catch (err: any) {
      addLog(`Error: ${err.message}`);
    } finally {
      setLoadingAction(null);
    }
  };

  const loadTables = async () => {
    try {
      const res = await getDatabaseTablesStatus();
      if (res.success && res.tables) {
        setTables(res.tables);
        setTableCount(res.tables.length);
      }
    } catch (err) {
      // Ignored
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="px-6 py-5 bg-zinc-950 border-b border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-3 py-0.5 my-auto">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-orange-500 to-amber-600 flex items-center justify-center text-white shadow-lg shadow-orange-500/20 font-bold shrink-0 my-0.5">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white">MySQL Database Installer & Schema Alterer</h2>
                <span className="px-2 py-0.5 text-[10px] font-semibold bg-orange-500/20 text-orange-400 border border-orange-500/30 rounded-full">
                  v2.4.0
                </span>
              </div>
              <p className="text-xs text-zinc-400">
                Automated database creation, safe column alterations, performance index optimization, and data persistence.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Tabs */}
        <div className="px-6 pt-3 bg-zinc-950/60 border-b border-zinc-800 flex items-center gap-2">
          <button
            onClick={() => setActiveTab('installer')}
            className={`px-3 py-2 text-xs font-semibold rounded-t-lg transition-colors border-b-2 flex items-center gap-2 ${
              activeTab === 'installer'
                ? 'border-orange-500 text-orange-400 bg-zinc-900/80'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            Installer & Migrations
          </button>

          <button
            onClick={() => {
              setActiveTab('tables');
              loadTables();
            }}
            className={`px-3 py-2 text-xs font-semibold rounded-t-lg transition-colors border-b-2 flex items-center gap-2 ${
              activeTab === 'tables'
                ? 'border-orange-500 text-orange-400 bg-zinc-900/80'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Table className="w-3.5 h-3.5" />
            Database Tables ({tableCount})
          </button>

          <button
            onClick={() => setActiveTab('sql')}
            className={`px-3 py-2 text-xs font-semibold rounded-t-lg transition-colors border-b-2 flex items-center gap-2 ${
              activeTab === 'sql'
                ? 'border-orange-500 text-orange-400 bg-zinc-900/80'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <FileCode className="w-3.5 h-3.5" />
            SQL Alter Script
          </button>

          <button
            onClick={() => setActiveTab('php')}
            className={`px-3 py-2 text-xs font-semibold rounded-t-lg transition-colors border-b-2 flex items-center gap-2 ${
              activeTab === 'php'
                ? 'border-orange-500 text-orange-400 bg-zinc-900/80'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Server className="w-3.5 h-3.5" />
            PHP Shared Hosting Installer
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {bannerNotice && (
            <div
              className={`p-3 rounded-xl text-xs flex items-center justify-between border ${
                bannerNotice.type === 'success'
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                  : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
              }`}
            >
              <div className="flex items-center gap-2">
                {bannerNotice.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                )}
                <span>{bannerNotice.text}</span>
              </div>
              <button
                onClick={() => setBannerNotice(null)}
                className="text-zinc-400 hover:text-white text-xs ml-4"
              >
                Dismiss
              </button>
            </div>
          )}

          {activeTab === 'installer' && (
            <div className="space-y-6">
              {/* Credentials Configuration Form */}
              <div className="bg-zinc-950 p-4 rounded-xl border border-zinc-800 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-zinc-200 uppercase tracking-wider flex items-center gap-2">
                    <Server className="w-3.5 h-3.5 text-orange-400" />
                    MySQL Database Connection Parameters
                  </h3>
                  <div className="flex items-center gap-2">
                    {connectionStatus.tested ? (
                      connectionStatus.connected ? (
                        <span className="px-2 py-0.5 text-[10px] font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-full flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          Connected
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 text-[10px] font-semibold bg-rose-500/20 text-rose-400 border border-rose-500/30 rounded-full flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" />
                          Offline / Error
                        </span>
                      )
                    ) : null}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-medium text-zinc-400 mb-1">Host</label>
                    <input
                      type="text"
                      value={config.host}
                      onChange={(e) => setConfig({ ...config, host: e.target.value })}
                      className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-orange-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-zinc-400 mb-1">Port</label>
                    <input
                      type="number"
                      value={config.port}
                      onChange={(e) => setConfig({ ...config, port: e.target.value })}
                      className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-orange-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-zinc-400 mb-1">Database Name</label>
                    <input
                      type="text"
                      value={config.database}
                      onChange={(e) => setConfig({ ...config, database: e.target.value })}
                      className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-orange-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-zinc-400 mb-1">User</label>
                    <input
                      type="text"
                      value={config.user}
                      onChange={(e) => setConfig({ ...config, user: e.target.value })}
                      className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-orange-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-zinc-400 mb-1">Password</label>
                    <input
                      type="password"
                      value={config.password}
                      onChange={(e) => setConfig({ ...config, password: e.target.value })}
                      className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-orange-500"
                    />
                  </div>

                  <div className="flex items-end gap-2">
                    <button
                      onClick={() => handleTestConnection(true)}
                      disabled={loadingAction === 'test'}
                      className="flex-1 py-1.5 px-3 bg-zinc-800 hover:bg-zinc-700 text-white font-semibold text-xs rounded-lg transition-colors border border-zinc-700 flex items-center justify-center gap-1.5 disabled:opacity-50"
                    >
                      <RefreshCw className={`w-3 h-3 ${loadingAction === 'test' ? 'animate-spin' : ''}`} />
                      Test
                    </button>
                    <button
                      onClick={handleSaveConfig}
                      disabled={loadingAction === 'save_config'}
                      className="flex-1 py-1.5 px-3 bg-orange-600 hover:bg-orange-500 text-white font-semibold text-xs rounded-lg transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50"
                    >
                      Apply
                    </button>
                  </div>
                </div>
              </div>

              {/* Action Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* 1. Create Database */}
                <div className="p-4 bg-zinc-950 rounded-xl border border-zinc-800 flex flex-col justify-between">
                  <div>
                    <div className="w-7 h-7 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center font-bold text-xs mb-2">
                      1
                    </div>
                    <h4 className="text-xs font-bold text-white mb-1">Create Database</h4>
                    <p className="text-[11px] text-zinc-400 mb-3">
                      Creates database with utf8mb4 collation if it does not yet exist.
                    </p>
                  </div>
                  <button
                    onClick={handleCreateDatabase}
                    disabled={loadingAction === 'create_db'}
                    className="w-full py-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs rounded-lg transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
                  >
                    <Play className="w-3 h-3" />
                    {loadingAction === 'create_db' ? 'Creating...' : 'Create DB'}
                  </button>
                </div>

                {/* 2. Run Intelligent Migrations */}
                <div className="p-4 bg-zinc-950 rounded-xl border border-zinc-800 flex flex-col justify-between">
                  <div>
                    <div className="w-7 h-7 rounded-lg bg-orange-500/20 text-orange-400 flex items-center justify-center font-bold text-xs mb-2">
                      2
                    </div>
                    <h4 className="text-xs font-bold text-white mb-1">Create / Alter Tables</h4>
                    <p className="text-[11px] text-zinc-400 mb-3">
                      Creates all 9 tables or safely adds missing columns, indexes, and SuperAdmin.
                    </p>
                  </div>
                  <button
                    onClick={handleRunMigrations}
                    disabled={loadingAction === 'migrate'}
                    className="w-full py-2 bg-orange-600 hover:bg-orange-500 text-white font-semibold text-xs rounded-lg transition-all shadow-lg shadow-orange-500/20 flex items-center justify-center gap-1.5 disabled:opacity-50"
                  >
                    <Sparkles className="w-3 h-3" />
                    {loadingAction === 'migrate' ? 'Migrating...' : 'Run Migration'}
                  </button>
                </div>

                {/* 3. Optimize Tables */}
                <div className="p-4 bg-zinc-950 rounded-xl border border-zinc-800 flex flex-col justify-between">
                  <div>
                    <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-xs mb-2">
                      3
                    </div>
                    <h4 className="text-xs font-bold text-white mb-1">Optimize Tables</h4>
                    <p className="text-[11px] text-zinc-400 mb-3">
                      Defragments indexes, optimizes query planner statistics, and reclaims space.
                    </p>
                  </div>
                  <button
                    onClick={handleOptimizeTables}
                    disabled={loadingAction === 'optimize'}
                    className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs rounded-lg transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
                  >
                    <Cpu className="w-3 h-3" />
                    {loadingAction === 'optimize' ? 'Optimizing...' : 'Optimize Tables'}
                  </button>
                </div>
              </div>

              {/* Execution Logs */}
              <div className="bg-zinc-950 rounded-xl border border-zinc-800 overflow-hidden">
                <div className="px-4 py-2 bg-zinc-900/60 border-b border-zinc-800 flex items-center justify-between">
                  <span className="text-xs font-mono font-semibold text-zinc-300">Migration & Installer Logs</span>
                  <button
                    onClick={() => setLogs(['Logs cleared.'])}
                    className="text-[10px] text-zinc-500 hover:text-zinc-300"
                  >
                    Clear
                  </button>
                </div>
                <pre className="p-4 text-xs font-mono text-emerald-400 bg-zinc-950 h-40 overflow-y-auto whitespace-pre-wrap leading-relaxed">
                  {logs.join('\n')}
                </pre>
              </div>
            </div>
          )}

          {activeTab === 'tables' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold text-zinc-200 uppercase tracking-wider">
                    Installed MySQL Tables Overview
                  </h3>
                  <p className="text-xs text-zinc-400">
                    Showing engine, row counts, index sizes, and collation for database `{config.database}`.
                  </p>
                </div>
                <button
                  onClick={loadTables}
                  className="px-3 py-1.5 text-xs font-semibold bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg transition-colors flex items-center gap-1.5"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Refresh
                </button>
              </div>

              <div className="overflow-x-auto border border-zinc-800 rounded-xl">
                <table className="w-full text-left text-xs text-zinc-300">
                  <thead className="bg-zinc-950 text-zinc-400 border-b border-zinc-800 font-semibold">
                    <tr>
                      <th className="py-2.5 px-3">Table</th>
                      <th className="py-2.5 px-3">Engine</th>
                      <th className="py-2.5 px-3">Rows</th>
                      <th className="py-2.5 px-3">Data Size</th>
                      <th className="py-2.5 px-3">Index Size</th>
                      <th className="py-2.5 px-3">Collation</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/60 bg-zinc-900/40">
                    {tables.length > 0 ? (
                      tables.map((t) => (
                        <tr key={t.name} className="hover:bg-zinc-800/40 transition-colors">
                          <td className="py-2.5 px-3 font-mono font-semibold text-orange-400">{t.name}</td>
                          <td className="py-2.5 px-3 text-zinc-400">{t.engine}</td>
                          <td className="py-2.5 px-3 font-bold text-white">{t.rows.toLocaleString()}</td>
                          <td className="py-2.5 px-3 text-zinc-400">{t.data_length_kb} KB</td>
                          <td className="py-2.5 px-3 text-zinc-400">{t.index_length_kb} KB</td>
                          <td className="py-2.5 px-3 text-zinc-500 font-mono text-[10px]">{t.collation}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={6} className="py-6 px-3 text-center text-zinc-500">
                          No tables found or database connection not established yet.
                          <br />
                          Switch to the <span className="text-orange-400 font-semibold">Installer & Migrations</span> tab to run setup.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'sql' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold text-zinc-200 uppercase tracking-wider">
                    Full MySQL DDL & Intelligent ALTER Script
                  </h3>
                  <p className="text-xs text-zinc-400">
                    Can be executed directly in phpMyAdmin, MySQL Workbench, or CLI.
                  </p>
                </div>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(DDL_SQL_SCRIPT);
                    setBannerNotice({ text: 'SQL copied to clipboard!', type: 'success' });
                  }}
                  className="px-3 py-1.5 text-xs font-semibold bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg transition-colors"
                >
                  Copy SQL
                </button>
              </div>

              <pre className="p-4 text-xs font-mono text-zinc-300 bg-zinc-950 rounded-xl border border-zinc-800 h-96 overflow-y-auto whitespace-pre-wrap leading-relaxed">
                {DDL_SQL_SCRIPT}
              </pre>
            </div>
          )}

          {activeTab === 'php' && (
            <div className="space-y-4">
              <div className="p-4 bg-zinc-950 rounded-xl border border-zinc-800 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-orange-500/20 text-orange-400 flex items-center justify-center font-bold">
                    PHP
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-white">Standalone Shared Hosting Installer</h3>
                    <p className="text-[11px] text-zinc-400">
                      Clean URL without `.php` shown in the browser address bar. Zero URL display on status bar hover.
                    </p>
                  </div>
                </div>

                <p className="text-xs text-zinc-300 leading-relaxed">
                  The standalone PHP installer is deployed at <code className="text-orange-400 font-mono bg-zinc-900 px-1.5 py-0.5 rounded">/php/install</code> or <code className="text-orange-400 font-mono bg-zinc-900 px-1.5 py-0.5 rounded">/install</code>. You can run it on any shared hosting provider (cPanel, LiteSpeed, Hostinger, Plesk, XAMPP, or LAMP stack).
                </p>

                <div className="flex items-center gap-3 pt-2">
                  {/* Zero-leak link (No .php in address bar, no URL in status bar on hover) */}
                  <button
                    onClick={() => window.open('/php/install', '_blank')}
                    onMouseOver={() => { window.status = ''; }}
                    className="px-4 py-2 bg-orange-600 hover:bg-orange-500 text-white font-semibold text-xs rounded-lg transition-all flex items-center gap-2 shadow-lg shadow-orange-500/20"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    Open Standalone PHP Installer
                  </button>

                  <button
                    onClick={() => window.open('/saas-users', '_blank')}
                    onMouseOver={() => { window.status = ''; }}
                    className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-semibold text-xs rounded-lg transition-colors flex items-center gap-2"
                  >
                    View SaaS Users Management
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 bg-zinc-950 border-t border-zinc-800 flex items-center justify-between">
          <div className="text-[11px] text-zinc-500">
            Database: <span className="text-zinc-300 font-mono">{config.database}</span> | Engine:{' '}
            <span className="text-zinc-300 font-mono">InnoDB</span> | Charset:{' '}
            <span className="text-zinc-300 font-mono">utf8mb4</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-semibold text-xs rounded-lg transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

const DDL_SQL_SCRIPT = `-- CloudPost MySQL Database Creation & Intelligent Schema Alterer
-- Charset: utf8mb4 | Collation: utf8mb4_unicode_ci | Engine: InnoDB

-- 1. Create Database if not exists
CREATE DATABASE IF NOT EXISTS \`u320472937_postman\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE \`u320472937_postman\`;

-- 2. Schema Migrations Tracker
CREATE TABLE IF NOT EXISTS cp_schema_migrations (
  id INT AUTO_INCREMENT PRIMARY KEY,
  version VARCHAR(64) NOT NULL UNIQUE,
  name VARCHAR(255) NOT NULL,
  executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Core Users & SuperAdmin
CREATE TABLE IF NOT EXISTS cp_users (
  id VARCHAR(64) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  avatar TEXT NULL,
  role VARCHAR(32) NOT NULL DEFAULT 'member',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_users_email (email),
  INDEX idx_users_role (role)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Unified Application State
CREATE TABLE IF NOT EXISTS cp_app_state (
  user_id VARCHAR(64) PRIMARY KEY,
  workspaces_json LONGTEXT,
  collections_json LONGTEXT,
  environments_json LONGTEXT,
  activity_logs_json LONGTEXT,
  recent_requests_json LONGTEXT,
  settings_json LONGTEXT,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. Granular Workspaces
CREATE TABLE IF NOT EXISTS cp_workspaces (
  id VARCHAR(64) PRIMARY KEY,
  user_id VARCHAR(64),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  type VARCHAR(32) DEFAULT 'personal',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_ws_user_id (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6. Granular Collections
CREATE TABLE IF NOT EXISTS cp_collections (
  id VARCHAR(64) PRIMARY KEY,
  workspace_id VARCHAR(64),
  user_id VARCHAR(64),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  data_json LONGTEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_col_ws_user (workspace_id, user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 7. Granular Environments
CREATE TABLE IF NOT EXISTS cp_environments (
  id VARCHAR(64) PRIMARY KEY,
  workspace_id VARCHAR(64),
  user_id VARCHAR(64),
  name VARCHAR(255) NOT NULL,
  variables_json LONGTEXT,
  is_active TINYINT(1) DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_env_ws_id (workspace_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 8. Granular Execution History
CREATE TABLE IF NOT EXISTS cp_history (
  id VARCHAR(64) PRIMARY KEY,
  user_id VARCHAR(64),
  workspace_id VARCHAR(64),
  name VARCHAR(255) NULL,
  method VARCHAR(16) NOT NULL,
  url TEXT NOT NULL,
  status_code INT DEFAULT 0,
  response_time_ms INT DEFAULT 0,
  response_size_bytes INT DEFAULT 0,
  request_json LONGTEXT,
  response_json LONGTEXT,
  executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_hist_user_time (user_id, executed_at),
  INDEX idx_hist_status (status_code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 9. Dedicated Activity Logs
CREATE TABLE IF NOT EXISTS cp_activity_logs (
  id VARCHAR(64) PRIMARY KEY,
  user_id VARCHAR(64),
  workspace_id VARCHAR(64),
  action VARCHAR(64) NOT NULL,
  target_name VARCHAR(255),
  target_type VARCHAR(64),
  details TEXT,
  timestamp VARCHAR(64),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_act_user_time (user_id, timestamp)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 10. SaaS Customers & Accounting Ledger
CREATE TABLE IF NOT EXISTS cp_saas_customers (
  id VARCHAR(64) PRIMARY KEY,
  user_id VARCHAR(64) NULL,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  company_name VARCHAR(255) DEFAULT 'Independent Developer',
  role VARCHAR(128) DEFAULT 'API Developer',
  plan VARCHAR(32) DEFAULT 'pro',
  status VARCHAR(32) DEFAULT 'active',
  monthly_fee DECIMAL(10,2) DEFAULT 29.00,
  total_requests BIGINT UNSIGNED DEFAULT 0,
  monthly_quota BIGINT UNSIGNED DEFAULT 1000000,
  requests_this_month BIGINT UNSIGNED DEFAULT 0,
  data_transfer_mb DECIMAL(12,2) DEFAULT 0.00,
  total_cost DECIMAL(10,2) DEFAULT 0.00,
  net_margin DECIMAL(10,2) DEFAULT 29.00,
  net_margin_percent DECIMAL(6,2) DEFAULT 100.00,
  health_score INT DEFAULT 100,
  country VARCHAR(64) DEFAULT 'United States',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_saas_email (email),
  INDEX idx_saas_user_id (user_id),
  INDEX idx_saas_plan_status (plan, status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 11. Safe ALTER TABLE statements for existing installations
-- (Executes automatically via Installer API or PHP /install)
-- ALTER TABLE cp_users ADD COLUMN IF NOT EXISTS role VARCHAR(32) NOT NULL DEFAULT 'member';
-- ALTER TABLE cp_app_state ADD COLUMN IF NOT EXISTS recent_requests_json LONGTEXT;
-- ALTER TABLE cp_saas_customers ADD COLUMN IF NOT EXISTS user_id VARCHAR(64) NULL;
-- OPTIMIZE TABLE cp_users, cp_app_state, cp_workspaces, cp_collections, cp_environments, cp_history, cp_activity_logs, cp_saas_customers;
`;
