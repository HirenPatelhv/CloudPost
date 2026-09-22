/**
 * Offline Sync Service & PWA Manager
 * Provides offline-first persistence, IndexedDB/LocalStorage outbox queue,
 * automatic network reconnect synchronization, and PWA system installation.
 */

import { saveAllToDatabase, saveExecutionHistoryRecord, loadAllFromDatabase } from './dbStorage';
import { Workspace, Collection, Environment, ActivityLog, RecentRequest } from '../types';

export type SyncStatus = 'online' | 'offline' | 'syncing' | 'synced' | 'error';

export interface OutboxItem {
  id: string;
  type: 'SAVE_STATE' | 'SAVE_HISTORY';
  payload: any;
  createdAt: number;
  retries: number;
}

export interface SyncState {
  isOnline: boolean;
  status: SyncStatus;
  pendingCount: number;
  lastSyncTime: number | null;
  canInstallPwa: boolean;
  isInstalled: boolean;
  errorMessage?: string;
}

type SyncStateListener = (state: SyncState) => void;

class OfflineSyncManager {
  private isOnline: boolean = typeof navigator !== 'undefined' ? navigator.onLine : true;
  private status: SyncStatus = typeof navigator !== 'undefined' && navigator.onLine ? 'synced' : 'offline';
  private pendingCount: number = 0;
  private lastSyncTime: number | null = null;
  private deferredInstallPrompt: any = null;
  private isInstalled: boolean = false;
  private errorMessage?: string;
  private listeners: Set<SyncStateListener> = new Set();
  private isSyncingNow: boolean = false;

  private readonly OUTBOX_STORAGE_KEY = 'cp_offline_outbox_queue';
  private readonly LAST_SYNC_KEY = 'cp_last_sync_timestamp';

  constructor() {
    if (typeof window !== 'undefined') {
      this.initNetworkListeners();
      this.initPwaListeners();
      this.initServiceWorker();
      this.loadInitialState();
    }
  }

  private loadInitialState() {
    try {
      const savedLastSync = localStorage.getItem(this.LAST_SYNC_KEY);
      if (savedLastSync) {
        this.lastSyncTime = parseInt(savedLastSync, 10);
      }
      const outbox = this.getOutbox();
      this.pendingCount = outbox.length;
      if (!this.isOnline) {
        this.status = 'offline';
      } else if (this.pendingCount > 0) {
        this.status = 'online';
      } else {
        this.status = 'synced';
      }
    } catch (e) {
      console.warn('Error loading sync state:', e);
    }
  }

  private initNetworkListeners() {
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.status = 'online';
      this.notify();
      console.log('[OfflineSync] Internet connection detected. Triggering auto-sync...');
      this.syncNow();
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
      this.status = 'offline';
      this.notify();
      console.log('[OfflineSync] Network offline. Switching to local-only persistence mode.');
    });

    // Check standalone display mode for PWA
    if (window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone === true) {
      this.isInstalled = true;
    }
  }

  private initPwaListeners() {
    window.addEventListener('beforeinstallprompt', (e: Event) => {
      e.preventDefault();
      this.deferredInstallPrompt = e;
      this.notify();
    });

    window.addEventListener('appinstalled', () => {
      this.isInstalled = true;
      this.deferredInstallPrompt = null;
      this.notify();
      console.log('[PWA] Application successfully installed on local system.');
    });
  }

  private initServiceWorker() {
    if ('serviceWorker' in navigator && process.env.NODE_ENV !== 'development') {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
          .then((registration) => {
            console.log('[SW] Service Worker registered with scope:', registration.scope);
          })
          .catch((err) => {
            console.warn('[SW] Service Worker registration failed:', err);
          });
      });
    }

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data && event.data.type === 'TRIGGER_OUTBOX_SYNC') {
          this.syncNow();
        }
      });
    }
  }

  public subscribe(listener: SyncStateListener): () => void {
    this.listeners.add(listener);
    listener(this.getState());
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify() {
    const state = this.getState();
    this.listeners.forEach((listener) => {
      try {
        listener(state);
      } catch (err) {
        console.error('Sync listener error:', err);
      }
    });
  }

  public getState(): SyncState {
    return {
      isOnline: this.isOnline,
      status: this.status,
      pendingCount: this.pendingCount,
      lastSyncTime: this.lastSyncTime,
      canInstallPwa: !!this.deferredInstallPrompt,
      isInstalled: this.isInstalled,
      errorMessage: this.errorMessage,
    };
  }

  public async promptInstall(): Promise<boolean> {
    if (!this.deferredInstallPrompt) {
      return false;
    }
    try {
      this.deferredInstallPrompt.prompt();
      const choiceResult = await this.deferredInstallPrompt.userChoice;
      if (choiceResult.outcome === 'accepted') {
        this.isInstalled = true;
        this.deferredInstallPrompt = null;
        this.notify();
        return true;
      }
    } catch (err) {
      console.warn('[PWA] Prompt error:', err);
    }
    return false;
  }

  private getOutbox(): OutboxItem[] {
    try {
      const data = localStorage.getItem(this.OUTBOX_STORAGE_KEY);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  private setOutbox(items: OutboxItem[]) {
    try {
      localStorage.setItem(this.OUTBOX_STORAGE_KEY, JSON.stringify(items));
      this.pendingCount = items.length;
    } catch (e) {
      console.error('[OfflineSync] Outbox save error:', e);
    }
  }

  public queueSaveState(data: {
    userId?: string;
    workspaces: Workspace[];
    collections: Collection[];
    environments: Environment[];
    activityLogs: ActivityLog[];
    recentRequests?: RecentRequest[];
  }) {
    // 1. Always update local storage cache immediately
    try {
      localStorage.setItem('cp_workspaces', JSON.stringify(data.workspaces));
      localStorage.setItem('cp_collections', JSON.stringify(data.collections));
      localStorage.setItem('cp_environments', JSON.stringify(data.environments));
      localStorage.setItem('cp_activity_logs', JSON.stringify(data.activityLogs));
      if (data.recentRequests) {
        localStorage.setItem('cp_recent_requests', JSON.stringify(data.recentRequests));
      }
    } catch (err) {
      console.warn('Local storage write warning:', err);
    }

    // 2. Add or replace existing SAVE_STATE in outbox to prevent duplicate bulk saves
    const outbox = this.getOutbox();
    const existingIndex = outbox.findIndex((item) => item.type === 'SAVE_STATE');
    const newItem: OutboxItem = {
      id: 'save_state_' + Date.now(),
      type: 'SAVE_STATE',
      payload: data,
      createdAt: Date.now(),
      retries: 0,
    };

    if (existingIndex >= 0) {
      outbox[existingIndex] = newItem;
    } else {
      outbox.push(newItem);
    }

    this.setOutbox(outbox);
    this.status = this.isOnline ? 'online' : 'offline';
    this.notify();

    // 3. If online, trigger background sync
    if (this.isOnline) {
      this.syncNow();
    }
  }

  public queueHistoryRecord(entry: any) {
    const outbox = this.getOutbox();
    outbox.push({
      id: 'hist_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
      type: 'SAVE_HISTORY',
      payload: entry,
      createdAt: Date.now(),
      retries: 0,
    });
    this.setOutbox(outbox);
    this.status = this.isOnline ? 'online' : 'offline';
    this.notify();

    if (this.isOnline) {
      this.syncNow();
    }
  }

  public async syncNow(): Promise<{ success: boolean; syncedCount: number; error?: string }> {
    if (this.isSyncingNow) {
      return { success: true, syncedCount: 0 };
    }

    if (!navigator.onLine) {
      this.isOnline = false;
      this.status = 'offline';
      this.notify();
      return { success: false, syncedCount: 0, error: 'Cannot sync while offline' };
    }

    this.isSyncingNow = true;
    this.status = 'syncing';
    this.notify();

    const outbox = this.getOutbox();
    if (outbox.length === 0) {
      // Nothing in outbox, just verify server sync
      this.status = 'synced';
      this.lastSyncTime = Date.now();
      localStorage.setItem(this.LAST_SYNC_KEY, String(this.lastSyncTime));
      this.isSyncingNow = false;
      this.notify();
      return { success: true, syncedCount: 0 };
    }

    const remainingItems: OutboxItem[] = [];
    let syncedCount = 0;

    for (const item of outbox) {
      try {
        if (item.type === 'SAVE_STATE') {
          const res = await saveAllToDatabase(item.payload);
          if (res.success) {
            syncedCount++;
          } else {
            item.retries += 1;
            remainingItems.push(item);
          }
        } else if (item.type === 'SAVE_HISTORY') {
          const res = await saveExecutionHistoryRecord(item.payload);
          if (res.success) {
            syncedCount++;
          } else {
            item.retries += 1;
            remainingItems.push(item);
          }
        }
      } catch (err: any) {
        item.retries += 1;
        remainingItems.push(item);
      }
    }

    this.setOutbox(remainingItems);
    this.lastSyncTime = Date.now();
    localStorage.setItem(this.LAST_SYNC_KEY, String(this.lastSyncTime));

    if (remainingItems.length === 0) {
      this.status = 'synced';
      this.errorMessage = undefined;
    } else {
      this.status = this.isOnline ? 'online' : 'offline';
      this.errorMessage = `${remainingItems.length} items pending sync`;
    }

    this.isSyncingNow = false;
    this.notify();

    return {
      success: remainingItems.length === 0,
      syncedCount,
      error: remainingItems.length > 0 ? `${remainingItems.length} items failed to sync` : undefined,
    };
  }
}

export const offlineSyncService = new OfflineSyncManager();
