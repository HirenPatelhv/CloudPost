/**
 * Database Storage Service
 * Saves and syncs all workspaces, collections, requests, environments, and logs to MySQL database u320472937_postman
 */

import { Workspace, Collection, Environment, ActivityLog, RecentRequest } from '../types';
import { getApiUrl } from '../config';
import { getGuestId } from './guestSessionService';

export interface DbStatusResponse {
  connected: boolean;
  database: string;
  user: string;
  host: string;
  tablesInitialized?: boolean;
  message?: string;
  error?: string;
}

export async function checkDatabaseStatus(): Promise<DbStatusResponse> {
  try {
    const res = await fetch(getApiUrl('/api/db/status'));
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }
    return await res.json();
  } catch (err: any) {
    return {
      connected: false,
      database: 'u320472937_postman',
      user: 'u320472937_postman',
      host: 'localhost',
      message: err.message || 'Database service unreachable',
    };
  }
}

export async function saveAllToDatabase(data: {
  userId?: string;
  workspaces: Workspace[];
  collections: Collection[];
  environments: Environment[];
  activityLogs: ActivityLog[];
  recentRequests?: RecentRequest[];
}): Promise<{ success: boolean; message?: string; error?: string }> {
  try {
    const res = await fetch(getApiUrl('/api/db/save'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: data.userId || getGuestId(),
        workspaces: data.workspaces,
        collections: data.collections,
        environments: data.environments,
        activityLogs: data.activityLogs,
        recentRequests: data.recentRequests || [],
      }),
    });
    return await res.json();
  } catch (err: any) {
    console.warn('Database save warning (using local fallback):', err.message);
    return { success: false, error: err.message };
  }
}

export async function loadAllFromDatabase(userId?: string): Promise<{
  success: boolean;
  workspaces?: Workspace[];
  collections?: Collection[];
  environments?: Environment[];
  activityLogs?: ActivityLog[];
  recentRequests?: RecentRequest[];
  settings?: any;
  message?: string;
}> {
  try {
    const targetId = userId || getGuestId();
    const res = await fetch(getApiUrl(`/api/db/load?userId=${encodeURIComponent(targetId)}`));
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err: any) {
    console.warn('Database load warning (using local store):', err.message);
    return { success: false, message: err.message };
  }
}

export async function saveExecutionHistoryRecord(entry: {
  id?: string;
  userId?: string;
  workspaceId?: string;
  name?: string;
  method: string;
  url: string;
  statusCode: number;
  responseTimeMs: number;
  responseSizeBytes: number;
  request: any;
  response: any;
  executedAt?: string;
}): Promise<{ success: boolean; id?: string; error?: string }> {
  try {
    const res = await fetch(getApiUrl('/api/history/save'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...entry,
        userId: entry.userId || getGuestId(),
        executedAt: entry.executedAt || new Date().toISOString(),
      }),
    });
    return await res.json();
  } catch (err: any) {
    console.warn('Execution history save warning:', err.message);
    return { success: false, error: err.message };
  }
}

export async function loadExecutionHistoryRecords(options?: {
  userId?: string;
  workspaceId?: string;
  limit?: number;
}): Promise<{ success: boolean; history?: any[]; count?: number; error?: string }> {
  try {
    const userId = options?.userId || getGuestId();
    const workspaceId = options?.workspaceId || 'all';
    const limit = options?.limit || 50;
    const res = await fetch(getApiUrl(`/api/history/list?userId=${encodeURIComponent(userId)}&workspaceId=${encodeURIComponent(workspaceId)}&limit=${limit}`));
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err: any) {
    console.warn('Execution history load warning:', err.message);
    return { success: false, error: err.message };
  }
}

export async function clearExecutionHistoryRecords(userId?: string): Promise<{ success: boolean; message?: string }> {
  try {
    const targetId = userId || getGuestId();
    const res = await fetch(getApiUrl(`/api/history/clear?userId=${encodeURIComponent(targetId)}`), {
      method: 'DELETE',
    });
    return await res.json();
  } catch (err: any) {
    return { success: false };
  }
}

// -------------------------------------------------------------
// Database Installer Client Methods
// -------------------------------------------------------------

export interface DbInstallerConfig {
  host?: string;
  port?: number | string;
  user?: string;
  password?: string;
  database?: string;
}

export interface DbTableMetric {
  name: string;
  engine: string;
  rows: number;
  data_length_kb: number;
  index_length_kb: number;
  collation: string;
  comment?: string;
}

export async function testDbConnection(config?: DbInstallerConfig): Promise<{
  success: boolean;
  databaseExists?: boolean;
  version?: string;
  message?: string;
  error?: string;
}> {
  try {
    const res = await fetch(getApiUrl('/api/installer/test'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config || {}),
    });
    return await res.json();
  } catch (err: any) {
    return { success: false, error: err.message || 'Connection test request failed' };
  }
}

export async function createDatabase(config?: DbInstallerConfig): Promise<{
  success: boolean;
  message?: string;
  error?: string;
}> {
  try {
    const res = await fetch(getApiUrl('/api/installer/create-database'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config || {}),
    });
    return await res.json();
  } catch (err: any) {
    return { success: false, error: err.message || 'Create database request failed' };
  }
}

export async function runSchemaMigration(config?: DbInstallerConfig): Promise<{
  success: boolean;
  logs?: string[];
  message?: string;
  error?: string;
}> {
  try {
    const res = await fetch(getApiUrl('/api/installer/run-migrations'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config || {}),
    });
    return await res.json();
  } catch (err: any) {
    return { success: false, error: err.message || 'Migration request failed' };
  }
}

export async function getDatabaseTablesStatus(): Promise<{
  success: boolean;
  connected?: boolean;
  database?: string;
  host?: string;
  user?: string;
  tables?: DbTableMetric[];
  table_count?: number;
  error?: string;
}> {
  try {
    const res = await fetch(getApiUrl('/api/installer/status'));
    return await res.json();
  } catch (err: any) {
    return { success: false, connected: false, error: err.message };
  }
}

export async function optimizeDatabaseTables(): Promise<{
  success: boolean;
  message?: string;
  results?: Record<string, string>;
  error?: string;
}> {
  try {
    const res = await fetch(getApiUrl('/api/installer/optimize'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    return await res.json();
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function saveDatabaseConfig(config: DbInstallerConfig): Promise<{
  success: boolean;
  message?: string;
  config?: any;
  error?: string;
}> {
  try {
    const res = await fetch(getApiUrl('/api/installer/save-config'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config),
    });
    return await res.json();
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}


