/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect } from 'react';
import { 
  Workspace, 
  Collection, 
  Environment, 
  ApiRequest, 
  ApiResponse, 
  TabItem, 
  Role, 
  ActivityLog, 
  ActivePresence,
  RecentRequest
} from './types';
import { 
  INITIAL_WORKSPACES, 
  INITIAL_COLLECTIONS, 
  INITIAL_ENVIRONMENTS, 
  INITIAL_ACTIVITY_LOGS, 
  INITIAL_PRESENCE,
  INITIAL_RECENT_REQUESTS
} from './data/initialData';
import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';
import { TabsBar } from './components/TabsBar';
import { ShieldAlert, LogIn, Plus, FolderPlus, Layers } from 'lucide-react';
import { RequestBuilder } from './components/RequestBuilder/RequestBuilder';
import { ResponseViewer } from './components/ResponseViewer/ResponseViewer';
import { CollectionRunner } from './components/CollectionRunner/CollectionRunner';
import { ArchitectureAndSchemaView } from './components/Architecture/ArchitectureAndSchemaView';
import { ShareModal } from './components/Workspaces/ShareModal';
import { WorkspaceModal } from './components/Workspaces/WorkspaceModal';
import { EnvironmentManagerModal } from './components/Environments/EnvironmentManagerModal';
import { CodeSnippetModal } from './components/RequestBuilder/CodeSnippetModal';
import { SetAsVariableModal } from './components/Variables/SetAsVariableModal';
import { ImportExportModal, ExportFormatType } from './components/Modals/ImportExportModal';
import { ShareLinkModal } from './components/Modals/ShareLinkModal';
import { LandingPage } from './components/Landing/LandingPage';
import { AuthModal } from './components/Auth/AuthModal';
import { RegisterPage } from './components/Auth/RegisterPage';
import { SaaSUserDashboard } from './components/SaaS/SaaSUserDashboard';
import { SaaSReportsView } from './components/SaaS/SaaSReportsView';
import { WebSocketTester } from './components/WebSocket/WebSocketTester';
import { MockServerManager } from './components/MockServer/MockServerManager';
import { GraphQLExplorer } from './components/GraphQL/GraphQLExplorer';
import { CollectionMonitorView } from './components/Monitors/CollectionMonitor';
import { SSETester } from './components/SSE/SSETester';
import { GRPCExplorer } from './components/gRPC/gRPCExplorer';
import { CollectionDocsViewer } from './components/Docs/CollectionDocsViewer';
import { AppDocsAndManuals } from './components/Docs/AppDocsAndManuals';
import { ResponseDiffViewer } from './components/Diff/ResponseDiffViewer';
import { getActiveVariables, getScopedVariables, ScopedVariable, VariableScope } from './services/variableService';
import { Variable, User, SaaSCustomer } from './types';
import { executeRequest } from './services/apiRunner';
import { saveAllToDatabase, loadAllFromDatabase, saveExecutionHistoryRecord, loadExecutionHistoryRecords, clearExecutionHistoryRecords } from './services/dbStorage';
import { offlineSyncService } from './services/offlineSyncService';
import { getSaaSCustomers, updateSaaSCustomer, recordCustomerApiExecution, isSaaSAdmin } from './services/saasService';
import { getGuestId, getGuestShortCode, resetGuestSession, migrateGuestDataToUser } from './services/guestSessionService';
import { isDesktopTool } from './services/platformService';
import { getApiUrl } from './config';
import { DownloadModal } from './components/Download/DownloadModal';
import { DesktopUpdateBanner } from './components/Desktop/DesktopUpdateBanner';
import { UserGuideModal } from './components/Help/UserGuideModal';
import { GuestResetConfirmModal } from './components/Modals/GuestResetConfirmModal';

export default function App() {
  // 0. Auth & Landing Page View State
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('cp_auth_user');
    return saved ? JSON.parse(saved) : null;
  });
  const isGuest = !currentUser;
  const [guestId, setGuestId] = useState<string>(() => getGuestId());
  const guestShortCode = useMemo(() => getGuestShortCode(guestId), [guestId]);

  const activeUser = useMemo(() => currentUser || {
    id: guestId,
    name: `Guest (${guestShortCode})`,
    email: `${guestId}@cloudpost.local`,
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80',
    role: 'MEMBER' as const,
  }, [currentUser, guestId, guestShortCode]);
  const [showLandingPage, setShowLandingPage] = useState<boolean>(false);
  const [showAuthModal, setShowAuthModal] = useState<boolean>(false);
  const [showDownloadModal, setShowDownloadModal] = useState<boolean>(false);
  const [showHelpModal, setShowHelpModal] = useState<boolean>(false);
  const [showGuestResetConfirmModal, setShowGuestResetConfirmModal] = useState<boolean>(false);

  // 1. Core State
  const [workspaces, setWorkspaces] = useState<Workspace[]>(() => {
    const saved = localStorage.getItem('cp_workspaces');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        const hasMock = Array.isArray(parsed) && parsed.some((w: any) => 
          w.id === 'ws_team_dev_core' || w.name === 'Core Engineering Team' || w.name === 'Payments Microservice'
        );
        if (!hasMock && parsed.length > 0) return parsed;
      } catch (e) {}
    }
    return INITIAL_WORKSPACES;
  });

  const [currentWorkspaceId, setCurrentWorkspaceId] = useState<string>(() => {
    return workspaces[0]?.id || 'ws_default_workspace';
  });

  const [collections, setCollections] = useState<Collection[]>(() => {
    const saved = localStorage.getItem('cp_collections');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        const hasMock = Array.isArray(parsed) && parsed.some((c: any) => 
          c.id === 'col_ecommerce_api' || c.name === 'E-Commerce & Orders API' || (typeof c.name === 'string' && c.name.includes('E-Commerce'))
        );
        const totalRequests = Array.isArray(parsed) ? parsed.reduce((acc: number, col: any) => 
          acc + (col.requests?.length || 0) + (col.folders?.reduce((facc: number, f: any) => facc + (f.requests?.length || 0), 0) || 0), 0) : 0;
        if (!hasMock && parsed.length > 0 && totalRequests > 0) return parsed;
      } catch (e) {}
    }
    return INITIAL_COLLECTIONS;
  });

  const [environments, setEnvironments] = useState<Environment[]>(() => {
    const saved = localStorage.getItem('cp_environments');
    return saved ? JSON.parse(saved) : INITIAL_ENVIRONMENTS;
  });

  const [activeEnvId, setActiveEnvId] = useState<string>('env_dev');

  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>(() => {
    try {
      const activeId = getGuestId();
      const saved = localStorage.getItem(`cp_${activeId}_activity_logs`);
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return INITIAL_ACTIVITY_LOGS;
  });

  const [recentRequests, setRecentRequests] = useState<RecentRequest[]>(() => {
    try {
      const activeId = getGuestId();
      const saved = localStorage.getItem(`cp_${activeId}_recent_requests`);
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return INITIAL_RECENT_REQUESTS;
  });

  const [presence] = useState<ActivePresence[]>(INITIAL_PRESENCE);

  // 1.1 SaaS Customers State
  const [saasCustomers, setSaasCustomers] = useState<SaaSCustomer[]>(() => {
    return getSaaSCustomers();
  });

  const handleUpdateSaaSCustomer = (id: string, updates: Partial<SaaSCustomer>) => {
    const updated = updateSaaSCustomer(id, updates);
    setSaasCustomers(updated);
  };

  // 2. Tab Management State - Restores from LocalStorage for seamless Guest Mode & Session Recovery
  const [tabs, setTabs] = useState<TabItem[]>(() => {
    try {
      const savedTabs = localStorage.getItem('cp_tabs');
      if (savedTabs) {
        let parsed = JSON.parse(savedTabs);
        if (Array.isArray(parsed) && parsed.length > 0) {
          parsed = parsed.filter((t: any) => t.requestId !== 'req_auth_login' && !t.title?.includes('Login & Obtain Bearer Token'));
          if (parsed.length > 0) return parsed;
        }
      }
    } catch (e) {}

    const req1 = INITIAL_COLLECTIONS[0]?.folders[0]?.requests[0]; // New HTTP Request
    const req2 = INITIAL_COLLECTIONS[0]?.folders[0]?.requests[1]; // Get All Products List
    const req3 = INITIAL_COLLECTIONS[0]?.folders[0]?.requests[2]; // Update Order Shipping Details

    return [
      {
        id: 'tab_register',
        type: 'register',
        title: 'Register Account',
      },
      ...(req3 ? [{
        id: `tab_${req3.id}`,
        type: 'request' as const,
        title: req3.name,
        method: req3.method,
        requestId: req3.id,
        collectionId: req3.collectionId,
      }] : []),
      ...(req2 ? [{
        id: `tab_${req2.id}`,
        type: 'request' as const,
        title: req2.name,
        method: req2.method,
        requestId: req2.id,
        collectionId: req2.collectionId,
      }] : []),
      ...(req1 ? [{
        id: `tab_${req1.id}`,
        type: 'request' as const,
        title: req1.name,
        method: req1.method,
        requestId: req1.id,
        collectionId: req1.collectionId,
      }] : []),
      {
        id: 'tab_websocket_client',
        type: 'websocket',
        title: 'WebSocket Client',
      },
      {
        id: 'tab_graphql_explorer',
        type: 'graphql',
        title: 'GraphQL Explorer',
      },
      {
        id: 'tab_system_architecture',
        type: 'architecture',
        title: 'System Architecture',
      },
    ];
  });
  const [activeTabId, setActiveTabId] = useState<string>(() => {
    try {
      const savedActiveTab = localStorage.getItem('cp_active_tab_id');
      if (savedActiveTab && savedActiveTab !== 'tab_req_auth_login') return savedActiveTab;
    } catch (e) {}
    return 'tab_req_new_http';
  });

  // Responsive layout & sidebar toggle
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(true);
  const [layoutMode, setLayoutMode] = useState<'columns' | 'rows'>(() => {
    try {
      const saved = localStorage.getItem('cp_layout_mode');
      if (saved === 'columns' || saved === 'rows') return saved;
    } catch (e) {}
    return 'columns';
  });

  const handleToggleLayout = () => {
    setLayoutMode(prev => {
      const next = prev === 'columns' ? 'rows' : 'columns';
      try {
        localStorage.setItem('cp_layout_mode', next);
      } catch (e) {}
      return next;
    });
    // If current tab is not a request, websocket, or graphql, switch to the active request tab so user immediately sees the layout shift
    if (activeTab.type !== 'request' && activeTab.type !== 'websocket' && activeTab.type !== 'graphql') {
      const targetReqTab = tabs.find(t => t.type === 'request');
      if (targetReqTab) {
        setActiveTabId(targetReqTab.id);
      }
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === '\\') {
        e.preventDefault();
        setIsSidebarOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Active Request & Response Cache (Restores from LocalStorage for seamless offline/guest availability)
  const [responsesMap, setResponsesMap] = useState<Record<string, ApiResponse>>(() => {
    try {
      const savedResponses = localStorage.getItem('cp_responses_map');
      if (savedResponses) return JSON.parse(savedResponses);
    } catch (e) {}
    return {};
  });
  const [isLoadingRequest, setIsLoadingRequest] = useState(false);
  const [executingRequestIds, setExecutingRequestIds] = useState<string[]>([]);

  // Modals state
  const [showShareModal, setShowShareModal] = useState(false);
  const [showWorkspaceModal, setShowWorkspaceModal] = useState(false);
  const [showEnvManagerModal, setShowEnvManagerModal] = useState(false);
  const [exportModalTarget, setExportModalTarget] = useState<{ request: ApiRequest; collection?: Collection } | null>(null);
  const [setAsVariableModalState, setSetAsVariableModalState] = useState<{
    isOpen: boolean;
    initialKey?: string;
    initialValue?: string;
    initialScope?: VariableScope;
  }>({ isOpen: false });
  const [importExportModalState, setImportExportModalState] = useState<{
    isOpen: boolean;
    initialTab: 'import' | 'export';
    initialExportType?: ExportFormatType;
    initialCollectionId?: string;
    initialEnvironmentId?: string;
  }>({
    isOpen: false,
    initialTab: 'import',
  });
  const [shareLinkModalState, setShareLinkModalState] = useState<{
    isOpen: boolean;
    type: 'request' | 'collection';
    request?: ApiRequest;
    collection?: Collection;
  }>({
    isOpen: false,
    type: 'request',
  });
  const [showGuestRestrictionModal, setShowGuestRestrictionModal] = useState(false);
  const [guestRestrictionMessage, setGuestRestrictionMessage] = useState('');

  const handleOpenCreateWorkspace = () => {
    if (isGuest) {
      setGuestRestrictionMessage('Guest users cannot create new workspaces. Please sign in or register to create workspaces.');
      setShowGuestRestrictionModal(true);
      return;
    }
    setShowWorkspaceModal(true);
  };

  const handleOpenShareModal = () => {
    if (isGuest) {
      setGuestRestrictionMessage('Guest users cannot share workspaces or invite collaborators. Please sign in or register to collaborate.');
      setShowGuestRestrictionModal(true);
      return;
    }
    setShowShareModal(true);
  };

  const [toastNotification, setToastNotification] = useState<{
    type?: 'success' | 'info' | 'warning' | 'error';
    title: string;
    message: string;
  } | null>(null);

  const addNotification = (notif: { type?: 'success' | 'info' | 'warning' | 'error'; title: string; message: string }) => {
    setToastNotification(notif);
    setTimeout(() => {
      setToastNotification(null);
    }, 4000);
  };

  const handleOpenShareCollection = (col: Collection) => {
    setShareLinkModalState({
      isOpen: true,
      type: 'collection',
      collection: col,
    });
  };

  const handleOpenShareRequest = (req: ApiRequest) => {
    setShareLinkModalState({
      isOpen: true,
      type: 'request',
      request: req,
    });
  };

  const handleUpdateCollectionSharing = (collectionId: string, isEnabled: boolean, shareToken?: string) => {
    setCollections(prev => prev.map(c => {
      if (c.id !== collectionId) return c;
      return {
        ...c,
        isLinkSharingEnabled: isEnabled,
        shareToken: shareToken || c.shareToken || `col_share_${Math.random().toString(36).substring(2, 10)}`,
        updatedAt: new Date().toISOString(),
      };
    }));
  };

  // Global Keyboard Shortcuts (Ctrl+I for Import, Ctrl+E for Export) and Short Link Resolution
  useEffect(() => {
    // Check for short link or shared request/collection in URL query parameters
    try {
      const searchParams = new URLSearchParams(window.location.search);
      const shortCodeParam = searchParams.get('s') || searchParams.get('share_id');
      const sharedReqParam = searchParams.get('share_request');
      const sharedColParam = searchParams.get('share_collection');

      // 1. Resolve concise Short Link (e.g. ?s=s_3a9f1b)
      if (shortCodeParam) {
        fetch(getApiUrl(`/api/share/get/${encodeURIComponent(shortCodeParam)}`))
          .then(res => res.json())
          .then(result => {
            if (result.success && result.data) {
              const item = result.data;
              if (result.type === 'collection' || item.requests || item.folders) {
                const newColId = item.id || ('col_' + Math.random().toString(36).substring(2, 9));
                const importedCol: Collection = {
                  id: newColId,
                  workspaceId: currentWorkspace?.id || 'ws_default',
                  name: item.name || result.title || 'Shared Collection',
                  description: item.description || 'Imported via short link',
                  folders: (item.folders || []).map((f: any) => ({ ...f, collectionId: newColId })),
                  requests: (item.requests || []).map((r: any) => ({ ...r, collectionId: newColId })),
                  createdAt: new Date().toISOString(),
                  updatedAt: new Date().toISOString(),
                };
                setCollections(prev => {
                  const exists = prev.some(c => c.name === importedCol.name);
                  return exists ? prev : [importedCol, ...prev];
                });
                setShowLandingPage(false);
                addNotification({
                  type: 'success',
                  title: 'Shared Collection Imported',
                  message: `"${importedCol.name}" added to your workspace via short link.`,
                });
              } else {
                const targetColId = collections[0]?.id || 'col_shared';
                const newReq: ApiRequest = {
                  id: item.id || ('shared_' + Math.random().toString(36).substring(2, 9)),
                  collectionId: targetColId,
                  name: item.name || result.title || 'Shared Request',
                  method: item.method || 'GET',
                  url: item.url || 'https://jsonplaceholder.typicode.com/posts',
                  params: item.params || [],
                  headers: item.headers || [],
                  body: item.body || { type: 'none', rawText: '', rawType: 'text/plain', formData: [], urlEncoded: [] },
                  auth: item.auth || { type: 'none' },
                  createdAt: new Date().toISOString(),
                  updatedAt: new Date().toISOString(),
                };

                setCollections(prev => {
                  if (prev.length === 0) {
                    const defaultCol: Collection = {
                      id: targetColId,
                      workspaceId: currentWorkspace?.id || 'ws_default',
                      name: 'Shared APIs',
                      folders: [],
                      requests: [newReq],
                      createdAt: new Date().toISOString(),
                      updatedAt: new Date().toISOString()
                    };
                    return [defaultCol];
                  }
                  return prev.map(c => c.id === targetColId ? { ...c, requests: [newReq, ...c.requests] } : c);
                });

                setTabs(prev => [
                  ...prev,
                  {
                    id: 'tab_' + newReq.id,
                    type: 'request',
                    title: newReq.name,
                    method: newReq.method,
                    requestId: newReq.id,
                    collectionId: newReq.collectionId,
                  }
                ]);
                setActiveTabId('tab_' + newReq.id);
                setShowLandingPage(false);
                addNotification({
                  type: 'success',
                  title: 'Shared Request Loaded',
                  message: `"${newReq.name}" loaded ready in the editor via short link.`
                });
              }

              // Clean address bar smoothly without page reload
              if (window.history && window.history.replaceState) {
                window.history.replaceState({}, '', window.location.pathname);
              }
            }
          })
          .catch(err => {
            console.warn('Could not load short link from API:', err);
          });
      } else if (sharedReqParam) {
        const decoded = decodeURIComponent(escape(atob(decodeURIComponent(sharedReqParam))));
        const parsed = JSON.parse(decoded);
        if (parsed && (parsed.url || parsed.name)) {
          const targetColId = collections[0]?.id || 'col_shared';
          const newReq: ApiRequest = {
            id: 'shared_' + Math.random().toString(36).substring(2, 9),
            collectionId: targetColId,
            name: parsed.name || 'Shared Request',
            method: parsed.method || 'GET',
            url: parsed.url || 'https://jsonplaceholder.typicode.com/posts',
            params: parsed.params || [],
            headers: parsed.headers || [],
            body: parsed.body || { type: 'none', rawText: '', rawType: 'text/plain', formData: [], urlEncoded: [] },
            auth: parsed.auth || { type: 'none' },
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };

          // Attach to first collection so it can be saved/managed
          setCollections(prev => {
            if (prev.length === 0) {
              const defaultCol: Collection = {
                id: targetColId,
                workspaceId: currentWorkspace?.id || 'ws_default',
                name: 'Shared APIs',
                folders: [],
                requests: [newReq],
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
              };
              return [defaultCol];
            }
            return prev.map(c => c.id === targetColId ? { ...c, requests: [newReq, ...c.requests] } : c);
          });

          setTabs(prev => [
            ...prev,
            {
              id: 'tab_' + newReq.id,
              type: 'request',
              title: newReq.name,
              method: newReq.method,
              requestId: newReq.id,
              collectionId: newReq.collectionId,
            }
          ]);
          setActiveTabId('tab_' + newReq.id);
          setShowLandingPage(false);
          addNotification({
            type: 'success',
            title: 'Shared Request Loaded',
            message: `"${newReq.name}" is loaded and ready in the editor.`
          });
        }
      } else if (sharedColParam) {
        const decoded = decodeURIComponent(escape(atob(decodeURIComponent(sharedColParam))));
        const parsed = JSON.parse(decoded);
        if (parsed && parsed.name) {
          const newColId = 'col_' + Math.random().toString(36).substring(2, 9);
          const importedCol: Collection = {
            id: newColId,
            workspaceId: currentWorkspace?.id || 'ws_default',
            name: parsed.name || 'Shared Collection',
            description: parsed.description || 'Imported via share link',
            folders: (parsed.folders || []).map((f: any) => ({ ...f, collectionId: newColId })),
            requests: (parsed.requests || []).map((r: any) => ({ ...r, collectionId: newColId })),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };

          setCollections(prev => {
            const exists = prev.some(c => c.name === importedCol.name);
            return exists ? prev : [importedCol, ...prev];
          });
          setShowLandingPage(false);
          addNotification({
            type: 'success',
            title: 'Shared Collection Imported',
            message: `"${importedCol.name}" with ${importedCol.requests.length} requests added to your workspace.`,
          });
        }
      }
    } catch (e) {
      console.warn('Could not parse share parameter from URL:', e);
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      // Avoid intercepting if inside inputs or textareas unless intentional
      const target = e.target as HTMLElement;
      const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'i' && !e.shiftKey && !isInput) {
        e.preventDefault();
        setImportExportModalState({ isOpen: true, initialTab: 'import' });
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'e' && !e.shiftKey && !isInput) {
        e.preventDefault();
        setImportExportModalState({ isOpen: true, initialTab: 'export' });
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Initial Database Load on App Mount - Syncs with central MySQL across all three apps (Web, Desktop, PHP)
  useEffect(() => {
    // Purge any legacy un-isolated mock/test keys from older prototype sessions
    try {
      localStorage.removeItem('cp_recent_requests');
      localStorage.removeItem('cp_activity_logs');
    } catch (e) {}

    async function loadDbState() {
      // Production isolation: Only fetch remote database state if the user is authenticated.
      // Guest users stay strictly in their local isolated session sandbox with zero pre-populated history.
      if (!currentUser?.id) {
        return;
      }
      const targetId = currentUser.id;
      try {
        const dbData = await loadAllFromDatabase(targetId);
        if (dbData.success && dbData.workspaces && dbData.workspaces.length > 0) {
          setWorkspaces(dbData.workspaces);
          if (dbData.collections) setCollections(dbData.collections);
          if (dbData.environments) setEnvironments(dbData.environments);
          if (dbData.activityLogs) setActivityLogs(dbData.activityLogs);
          if (dbData.recentRequests && dbData.recentRequests.length > 0) setRecentRequests(dbData.recentRequests);
        }

        // Also merge any execution records from MySQL cp_history for this authenticated user
        const historyRes = await loadExecutionHistoryRecords({ userId: targetId, limit: 50 });
        if (historyRes.success && historyRes.history && historyRes.history.length > 0) {
          setRecentRequests(prev => {
            const existingIds = new Set(prev.map(r => r.id));
            const newItems: RecentRequest[] = [];
            for (const h of historyRes.history!) {
              if (!existingIds.has(h.id)) {
                newItems.push({
                  id: h.id,
                  requestId: h.request?.id || ('req_' + h.id),
                  collectionId: h.request?.collectionId,
                  name: h.request?.name || (h.method + ' ' + h.url),
                  method: h.method,
                  url: h.url,
                  status: h.statusCode,
                  statusText: h.response?.statusText || (h.statusCode >= 200 && h.statusCode < 300 ? 'OK' : 'Error'),
                  time: h.responseTimeMs,
                  size: h.responseSizeBytes,
                  executedAt: h.executedAt,
                  requestSnapshot: h.request,
                  responseSnapshot: h.response,
                });
              }
            }
            if (newItems.length === 0) return prev;
            const combined = [...prev, ...newItems].sort((a, b) => new Date(b.executedAt).getTime() - new Date(a.executedAt).getTime());
            return combined.slice(0, 50);
          });
        }
      } catch (e) {
        console.warn('Could not sync remote state on mount:', e);
      }
    }
    loadDbState();
  }, [currentUser?.id]);

  // Persistence side-effects (Always saved to localStorage for Guest Mode and queued to MySQL for all three apps)
  useEffect(() => {
    const targetId = currentUser?.id || guestId;
    // 1. Instant local persistence for isolated session & instant recovery across sessions
    try {
      localStorage.setItem(`cp_${targetId}_workspaces`, JSON.stringify(workspaces));
      localStorage.setItem(`cp_${targetId}_collections`, JSON.stringify(collections));
      localStorage.setItem(`cp_${targetId}_environments`, JSON.stringify(environments));
      localStorage.setItem(`cp_${targetId}_activity_logs`, JSON.stringify(activityLogs));
      localStorage.setItem(`cp_${targetId}_recent_requests`, JSON.stringify(recentRequests));
      localStorage.setItem(`cp_${targetId}_tabs`, JSON.stringify(tabs));
      localStorage.setItem(`cp_${targetId}_active_tab_id`, activeTabId);
      localStorage.setItem(`cp_${targetId}_responses_map`, JSON.stringify(responsesMap));

      // Standard session mirroring
      localStorage.setItem('cp_workspaces', JSON.stringify(workspaces));
      localStorage.setItem('cp_collections', JSON.stringify(collections));
      localStorage.setItem('cp_environments', JSON.stringify(environments));
      localStorage.setItem('cp_tabs', JSON.stringify(tabs));
      localStorage.setItem('cp_active_tab_id', activeTabId);
    } catch (err) {
      console.warn('LocalStorage save error:', err);
    }

    // 2. Queue for database synchronization if logged in or online
    offlineSyncService.queueSaveState({
      userId: targetId,
      workspaces,
      collections,
      environments,
      activityLogs,
      recentRequests,
    });
  }, [workspaces, collections, environments, activityLogs, recentRequests, tabs, activeTabId, responsesMap, currentUser?.id, guestId]);

  // Auth Handlers
  const handleLoginSuccess = async (user: User, shouldMigrateGuestData?: boolean) => {
    setCurrentUser(user);
    localStorage.setItem('cp_auth_user', JSON.stringify(user));
    if (shouldMigrateGuestData) {
      localStorage.setItem('cp_workspaces', JSON.stringify(workspaces));
      localStorage.setItem('cp_collections', JSON.stringify(collections));
      localStorage.setItem('cp_environments', JSON.stringify(environments));
      localStorage.setItem('cp_activity_logs', JSON.stringify(activityLogs));
      localStorage.setItem('cp_recent_requests', JSON.stringify(recentRequests));

      await migrateGuestDataToUser(guestId, user.id);

      saveAllToDatabase({
        userId: user.id,
        workspaces,
        collections,
        environments,
        activityLogs,
        recentRequests,
      });
    }
    setShowAuthModal(false);
    setShowLandingPage(false);
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('cp_auth_user');
    const newGuest = resetGuestSession();
    setGuestId(newGuest);
    setShowLandingPage(false);
  };

  const handleConfirmResetGuestSession = () => {
    setShowGuestResetConfirmModal(false);
    if (currentUser) {
      setCurrentUser(null);
      localStorage.removeItem('cp_auth_user');
    }
    const newGuest = resetGuestSession();
    setGuestId(newGuest);
    const newShortCode = getGuestShortCode(newGuest);
    addNotification({
      type: 'info',
      title: 'Guest Session Changed',
      message: `Switched to clean session (Guest #${newShortCode}). Previous data remains saved under its guest identity.`,
    });
  };

  // Derived Active Entities
  const currentWorkspace = useMemo(() => {
    return workspaces.find(w => w.id === currentWorkspaceId) || workspaces[0];
  }, [workspaces, currentWorkspaceId]);

  const currentRole: Role = useMemo(() => {
    const member = currentWorkspace.members.find(m => m.userId === activeUser.id || m.email === activeUser.email);
    return member ? member.role : 'ADMIN';
  }, [currentWorkspace, activeUser]);

  const userIsSaaSAdmin = useMemo(() => {
    return isSaaSAdmin(currentUser, isGuest);
  }, [currentUser, isGuest]);

  const isSaaSUser = useMemo(() => {
    return !isGuest && !!currentUser && (currentUser.isSaaSUser !== false);
  }, [currentUser, isGuest]);

  const workspaceCollections = useMemo(() => {
    return collections.filter(c => c.workspaceId === currentWorkspaceId || !c.workspaceId);
  }, [collections, currentWorkspaceId]);

  const workspaceEnvironments = useMemo(() => {
    return environments.filter(e => e.workspaceId === currentWorkspaceId || e.isGlobal);
  }, [environments, currentWorkspaceId]);

  const activeTab = useMemo(() => {
    return tabs.find(t => t.id === activeTabId) || tabs[0] || {
      id: 'tab_default',
      type: 'request' as const,
      title: 'Workspace',
      method: 'GET' as const,
      requestId: 'req_default',
      collectionId: 'col_default',
    };
  }, [tabs, activeTabId]);

  // Find active ApiRequest object (with robust fallback to recent requests, local cache, and resilient auto-synthesis)
  const activeRequestObj = useMemo<ApiRequest | null>(() => {
    if (activeTab?.type !== 'request' || !activeTab.requestId) return null;
    for (const col of collections) {
      for (const req of (col.requests || [])) {
        if (req.id === activeTab.requestId) return req;
      }
      for (const fld of (col.folders || [])) {
        for (const req of (fld.requests || [])) {
          if (req.id === activeTab.requestId) return req;
        }
      }
    }
    // Fallback: search in recentRequests
    const recentMatch = recentRequests.find(r => r.requestId === activeTab.requestId);
    if (recentMatch?.requestSnapshot) {
      return recentMatch.requestSnapshot;
    }
    // Fallback: check localStorage for saved active request
    try {
      const saved = localStorage.getItem('cp_active_request_' + activeTab.requestId);
      if (saved) return JSON.parse(saved);
    } catch (e) {}

    // Fallback 2: check if any request matches in any collection
    if (collections[0]?.requests?.[0]) return collections[0].requests[0];
    if (collections[0]?.folders?.[0]?.requests?.[0]) return collections[0].folders[0].requests[0];

    // Fallback 3: Synthesize active request so active request tab NEVER shows blank screen
    return {
      id: activeTab.requestId,
      collectionId: activeTab.collectionId || collections[0]?.id || 'col_default',
      name: activeTab.title || 'Untitled Request',
      method: (activeTab.method as any) || 'GET',
      url: 'https://jsonplaceholder.typicode.com/todos/1',
      headers: [],
      params: [],
      body: { type: 'none', rawText: '', rawType: 'application/json', formData: [], urlEncoded: [] },
      auth: { type: 'none' },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }, [collections, activeTab, recentRequests]);

  const activeRequestCollection = useMemo<Collection | undefined>(() => {
    if (!activeRequestObj) return undefined;
    return collections.find(c => c.id === activeRequestObj.collectionId);
  }, [collections, activeRequestObj]);

  const activeScopedVariables = useMemo<ScopedVariable[]>(() => {
    return getScopedVariables(workspaceEnvironments, activeEnvId, activeRequestCollection);
  }, [workspaceEnvironments, activeEnvId, activeRequestCollection]);

  const activeVariables = useMemo<Variable[]>(() => {
    return getActiveVariables(workspaceEnvironments, activeEnvId, activeRequestCollection);
  }, [workspaceEnvironments, activeEnvId, activeRequestCollection]);

  const activeResponse = activeRequestObj ? (responsesMap[activeRequestObj.id] || null) : null;

  // Handlers for Postman Variables
  const handleSaveNewVariable = (target: { scope: VariableScope; targetId: string; variable: Variable }) => {
    if (target.scope === 'collection') {
      setCollections(prev => prev.map(col => {
        if (col.id === target.targetId) {
          const currentVars = col.variables || [];
          const idx = currentVars.findIndex(v => v.key === target.variable.key);
          let updatedVars: Variable[];
          if (idx !== -1) {
            updatedVars = [...currentVars];
            updatedVars[idx] = target.variable;
          } else {
            updatedVars = [...currentVars, target.variable];
          }
          return { ...col, variables: updatedVars };
        }
        return col;
      }));
    } else {
      setEnvironments(prev => prev.map(env => {
        if (env.id === target.targetId) {
          const idx = env.variables.findIndex(v => v.key === target.variable.key);
          let updatedVars: Variable[];
          if (idx !== -1) {
            updatedVars = [...env.variables];
            updatedVars[idx] = target.variable;
          } else {
            updatedVars = [...env.variables, target.variable];
          }
          return { ...env, variables: updatedVars };
        }
        return env;
      }));
    }

    const newLog: ActivityLog = {
      id: 'log_' + Math.random().toString(36).substring(2, 9),
      workspaceId: currentWorkspaceId,
      user: {
        name: activeUser.name,
        email: activeUser.email,
        avatar: activeUser.avatar,
      },
      action: 'SWITCHED_ENVIRONMENT',
      targetType: 'environment',
      targetName: `Variable {{${target.variable.key}}} (${target.scope})`,
      timestamp: new Date().toISOString(),
    };
    setActivityLogs(prev => [newLog, ...prev]);
  };

  const handleQuickUpdateVariable = (key: string, value: string) => {
    const activeEnv = workspaceEnvironments.find(e => e.id === activeEnvId && !e.isGlobal);
    if (activeEnv && activeEnv.variables.some(v => v.key === key)) {
      setEnvironments(prev => prev.map(e => e.id === activeEnv.id ? {
        ...e,
        variables: e.variables.map(v => v.key === key ? { ...v, value } : v)
      } : e));
      return;
    }

    if (activeRequestCollection && (activeRequestCollection.variables || []).some(v => v.key === key)) {
      setCollections(prev => prev.map(c => c.id === activeRequestCollection.id ? {
        ...c,
        variables: (c.variables || []).map(v => v.key === key ? { ...v, value } : v)
      } : c));
      return;
    }

    const globalEnv = workspaceEnvironments.find(e => e.isGlobal) || workspaceEnvironments[0];
    if (globalEnv) {
      setEnvironments(prev => prev.map(e => e.id === globalEnv.id ? {
        ...e,
        variables: e.variables.map(v => v.key === key ? { ...v, value } : v)
      } : e));
    }
  };

  const handleOpenSetAsVariable = (text: string) => {
    const isVarName = /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(text);
    setSetAsVariableModalState({
      isOpen: true,
      initialKey: isVarName ? text : '',
      initialValue: isVarName ? '' : text,
      initialScope: activeEnvId && activeEnvId !== 'no_env' ? 'environment' : 'global',
    });
  };

  // Find active Collection for runner
  const activeRunnerCollection = useMemo<Collection | null>(() => {
    if (activeTab?.type !== 'collection_runner' || !activeTab.collectionId) return null;
    return collections.find(c => c.id === activeTab.collectionId) || null;
  }, [collections, activeTab]);

  // Handlers
  const handleSelectRequest = (req: ApiRequest) => {
    const existingTab = tabs.find(t => t.requestId === req.id);
    if (existingTab) {
      setActiveTabId(existingTab.id);
    } else {
      const existingResp = responsesMap[req.id];
      const newTab: TabItem = {
        id: 'tab_' + req.id,
        type: 'request',
        title: req.name,
        method: req.method,
        requestId: req.id,
        collectionId: req.collectionId,
        lastStatusCode: existingResp?.status,
        lastStatusText: existingResp?.statusText,
        isLoading: executingRequestIds.includes(req.id),
      };
      setTabs([...tabs, newTab]);
      setActiveTabId(newTab.id);
    }
  };

  const handleOpenRunner = (collection?: Collection | null) => {
    const targetCollection = collection || activeRequestCollection || workspaceCollections[0] || collections[0];
    if (!targetCollection) return;
    const existingRunnerTab = tabs.find(t => t.type === 'collection_runner' && t.collectionId === targetCollection.id);
    if (existingRunnerTab) {
      setActiveTabId(existingRunnerTab.id);
    } else {
      const newTab: TabItem = {
        id: 'tab_runner_' + targetCollection.id,
        type: 'collection_runner',
        title: `Runner: ${targetCollection.name}`,
        collectionId: targetCollection.id,
      };
      setTabs([...tabs, newTab]);
      setActiveTabId(newTab.id);
    }
  };

  const handleOpenArchitectureTab = () => {
    if (!userIsSaaSAdmin) return;
    const existingArchTab = tabs.find(t => t.type === 'architecture');
    if (existingArchTab) {
      setActiveTabId(existingArchTab.id);
    } else {
      const newTab: TabItem = {
        id: 'tab_architecture',
        type: 'architecture',
        title: 'System Architecture & Schema',
      };
      setTabs([...tabs, newTab]);
      setActiveTabId(newTab.id);
    }
  };

  const handleOpenSaaSUsersTab = () => {
    setShowLandingPage(false);
    const existing = tabs.find(t => t.type === 'saas_users');
    if (existing) {
      setActiveTabId(existing.id);
    } else {
      const newTab: TabItem = {
        id: 'tab_saas_users',
        type: 'saas_users',
        title: 'SaaS Customers & Costs',
      };
      setTabs([...tabs, newTab]);
      setActiveTabId(newTab.id);
    }
  };

  const handleOpenSaaSReportsTab = () => {
    setShowLandingPage(false);
    const existing = tabs.find(t => t.type === 'saas_reports');
    if (existing) {
      setActiveTabId(existing.id);
    } else {
      const newTab: TabItem = {
        id: 'tab_saas_reports',
        type: 'saas_reports',
        title: 'SaaS Financial Reports',
      };
      setTabs([...tabs, newTab]);
      setActiveTabId(newTab.id);
    }
  };

  const handleOpenRegisterTab = () => {
    setShowLandingPage(false);
    const existing = tabs.find(t => t.type === 'register');
    if (existing) {
      setActiveTabId(existing.id);
    } else {
      const newTab: TabItem = {
        id: 'tab_register',
        type: 'register',
        title: 'Register Account',
      };
      setTabs([...tabs, newTab]);
      setActiveTabId(newTab.id);
    }
  };

  const handleOpenWebSocketTab = () => {
    setShowLandingPage(false);
    const existing = tabs.find(t => t.type === 'websocket');
    if (existing) {
      setActiveTabId(existing.id);
    } else {
      const newTab: TabItem = {
        id: 'tab_websocket',
        type: 'websocket',
        title: 'WebSocket Client',
      };
      setTabs([...tabs, newTab]);
      setActiveTabId(newTab.id);
    }
  };

  const handleOpenMockServerTab = () => {
    setShowLandingPage(false);
    const existing = tabs.find(t => t.type === 'mock_server');
    if (existing) {
      setActiveTabId(existing.id);
    } else {
      const newTab: TabItem = {
        id: 'tab_mock_server',
        type: 'mock_server',
        title: 'Mock Server Engine',
      };
      setTabs([...tabs, newTab]);
      setActiveTabId(newTab.id);
    }
  };

  const handleOpenGraphQLTab = () => {
    setShowLandingPage(false);
    const existing = tabs.find(t => t.type === 'graphql');
    if (existing) {
      setActiveTabId(existing.id);
    } else {
      const newTab: TabItem = {
        id: 'tab_graphql',
        type: 'graphql',
        title: 'GraphQL Explorer',
      };
      setTabs([...tabs, newTab]);
      setActiveTabId(newTab.id);
    }
  };

  const handleOpenMonitorTab = () => {
    setShowLandingPage(false);
    const existing = tabs.find(t => t.type === 'monitor');
    if (existing) {
      setActiveTabId(existing.id);
    } else {
      const newTab: TabItem = {
        id: 'tab_monitor',
        type: 'monitor',
        title: 'Collection Monitors',
      };
      setTabs([...tabs, newTab]);
      setActiveTabId(newTab.id);
    }
  };

  const handleOpenSSETab = () => {
    setShowLandingPage(false);
    const existing = tabs.find(t => t.type === 'sse');
    if (existing) {
      setActiveTabId(existing.id);
    } else {
      const newTab: TabItem = {
        id: 'tab_sse',
        type: 'sse',
        title: 'SSE Stream Tester',
      };
      setTabs([...tabs, newTab]);
      setActiveTabId(newTab.id);
    }
  };

  const handleOpenGRPCTab = () => {
    setShowLandingPage(false);
    const existing = tabs.find(t => t.type === 'grpc');
    if (existing) {
      setActiveTabId(existing.id);
    } else {
      const newTab: TabItem = {
        id: 'tab_grpc',
        type: 'grpc',
        title: 'gRPC Explorer',
      };
      setTabs([...tabs, newTab]);
      setActiveTabId(newTab.id);
    }
  };

  const handleOpenDocsTab = () => {
    setShowLandingPage(false);
    const existing = tabs.find(t => t.type === 'collection_docs');
    if (existing) {
      setActiveTabId(existing.id);
    } else {
      const newTab: TabItem = {
        id: 'tab_collection_docs',
        type: 'collection_docs',
        title: 'Docs & User Manuals',
      };
      setTabs([...tabs, newTab]);
      setActiveTabId(newTab.id);
    }
  };

  const handleOpenDiffTab = () => {
    setShowLandingPage(false);
    const existing = tabs.find(t => t.type === 'diff_viewer');
    if (existing) {
      setActiveTabId(existing.id);
    } else {
      const newTab: TabItem = {
        id: 'tab_diff_viewer',
        type: 'diff_viewer',
        title: 'Response Diff',
      };
      setTabs([...tabs, newTab]);
      setActiveTabId(newTab.id);
    }
  };

  const handleOpenMockInBuilder = (mockReq: Partial<ApiRequest>) => {
    setShowLandingPage(false);
    const targetCol = workspaceCollections[0];
    const newReq: ApiRequest = {
      id: 'req_mock_' + Math.random().toString(36).substring(2, 8),
      name: mockReq.name || 'Test Mock Request',
      method: mockReq.method || 'GET',
      url: mockReq.url || '',
      collectionId: targetCol?.id || '',
      headers: [],
      params: [],
      body: { type: 'none', rawText: '', rawType: 'application/json', formData: [], urlEncoded: [] },
      auth: { type: 'none' },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    if (targetCol) {
      setCollections(prev => prev.map(c => {
        if (c.id !== targetCol.id) return c;
        return { ...c, requests: [...c.requests, newReq] };
      }));
    }

    const newTab: TabItem = {
      id: 'tab_' + newReq.id,
      type: 'request',
      title: newReq.name,
      method: newReq.method,
      requestId: newReq.id,
      collectionId: newReq.collectionId,
    };
    setTabs([...tabs, newTab]);
    setActiveTabId(newTab.id);
  };

  const handleSwitchToGuest = () => {
    setShowGuestResetConfirmModal(true);
  };

  const handleRegisterSuccess = (user: User, shouldMigrateData: boolean = true) => {
    setCurrentUser(user);
    localStorage.setItem('cp_auth_user', JSON.stringify(user));
    setSaasCustomers(getSaaSCustomers());
    // close register tab if open
    setTabs(prev => {
      const filtered = prev.filter(t => t.type !== 'register');
      return filtered.length > 0 ? filtered : [
        {
          id: 'tab_saas_users',
          type: 'saas_users',
          title: 'SaaS Customers & Costs',
        }
      ];
    });
    // Open SaaS user dashboard
    handleOpenSaaSUsersTab();
  };

  const handleCloseTab = (tabIdToClose: string) => {
    if (tabs.length <= 1) return;
    const idx = tabs.findIndex(t => t.id === tabIdToClose);
    const newTabs = tabs.filter(t => t.id !== tabIdToClose);
    setTabs(newTabs);

    if (activeTabId === tabIdToClose) {
      const nextActive = newTabs[Math.max(0, idx - 1)];
      setActiveTabId(nextActive.id);
    }
  };

  const handleNewRequestTab = () => {
    const targetCol = workspaceCollections[0];
    if (!targetCol) return;

    const newReqId = 'req_' + Math.random().toString(36).substring(2, 9);
    const newReq: ApiRequest = {
      id: newReqId,
      collectionId: targetCol.id,
      name: 'Untitled Request',
      method: 'GET',
      url: '{{baseUrl}}/posts',
      params: [],
      headers: [
        { id: 'h_new', key: 'Accept', value: 'application/json', enabled: true },
      ],
      body: {
        type: 'none',
        rawText: '',
        rawType: 'text/plain',
        formData: [],
        urlEncoded: [],
      },
      auth: { type: 'none' },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Add request to collection
    const updatedCollections = collections.map(c => {
      if (c.id === targetCol.id) {
        return { ...c, requests: [...c.requests, newReq] };
      }
      return c;
    });
    setCollections(updatedCollections);

    const newTab: TabItem = {
      id: 'tab_' + newReqId,
      type: 'request',
      title: newReq.name,
      method: newReq.method,
      requestId: newReq.id,
      collectionId: newReq.collectionId,
    };
    setTabs([...tabs, newTab]);
    setActiveTabId(newTab.id);
  };

  // Native Desktop Electron Menu & IPC Integration
  useEffect(() => {
    const desktopAPI = (window as any).electronAPI;
    if (desktopAPI && typeof desktopAPI.onMenuAction === 'function') {
      const cleanup = desktopAPI.onMenuAction((action: string) => {
        switch (action) {
          case 'new-request':
            handleNewRequestTab();
            break;
          case 'new-folder': {
            const targetCol = workspaceCollections[0] || collections[0];
            if (targetCol) {
              const name = window.prompt ? window.prompt('Enter new folder name:', 'New Folder') : 'New Folder';
              if (name && name.trim()) {
                handleCreateFolder(targetCol.id, name.trim());
              }
            }
            break;
          }
          case 'new-collection': {
            const name = window.prompt ? window.prompt('Enter new collection name:', 'New Collection') : 'New Collection';
            if (name && name.trim()) {
              handleCreateCollection(name.trim());
            }
            break;
          }
          case 'open-websocket':
            handleOpenWebSocketTab();
            break;
          case 'open-sse':
            handleOpenSSETab();
            break;
          case 'open-graphql':
            handleOpenGraphQLTab();
            break;
          case 'open-grpc':
            handleOpenGRPCTab();
            break;
          case 'open-mock-server':
            handleOpenMockServerTab();
            break;
          case 'open-diff':
            handleOpenDiffTab();
            break;
          case 'open-docs':
            handleOpenDocsTab();
            break;
          case 'open-register':
            handleOpenRegisterTab();
            break;
          case 'reset-guest':
            setShowGuestResetConfirmModal(true);
            break;
          case 'open-auth':
            setShowAuthModal(true);
            break;
          case 'open-runner':
            handleOpenRunner();
            break;
          case 'import':
            setImportExportModalState({ isOpen: true, initialTab: 'import' });
            break;
          case 'export':
            setImportExportModalState({ isOpen: true, initialTab: 'export' });
            break;
          case 'settings':
            setShowEnvManagerModal(true);
            break;
          case 'close-tab':
            if (activeTabId) handleCloseTab(activeTabId);
            break;
          default:
            break;
        }
      });
      return cleanup;
    }
  }, [activeTabId, tabs, collections, workspaceCollections]);

  const handleSendRequest = async (requestToExecute: ApiRequest, forceProxy: boolean = false) => {
    setIsLoadingRequest(true);
    setExecutingRequestIds(prev => prev.includes(requestToExecute.id) ? prev : [...prev, requestToExecute.id]);
    setTabs(prev => prev.map(t => t.requestId === requestToExecute.id ? { ...t, isLoading: true } : t));

    try {
      const response = await executeRequest(requestToExecute, activeVariables, (k, v) => handleQuickUpdateVariable(k, v), forceProxy);
      setResponsesMap(prev => ({ ...prev, [requestToExecute.id]: response }));
      setTabs(prev => prev.map(t => t.requestId === requestToExecute.id ? { 
        ...t, 
        isLoading: false,
        lastStatusCode: response.status,
        lastStatusText: response.statusText,
      } : t));

      // 1. Auto-save the executed request into collections and local storage so any unsaved user edits are never lost
      let requestSavedInCollection = false;
      const updatedCollections = collections.map(c => {
        const isTargetCol = c.id === requestToExecute.collectionId || (!requestToExecute.collectionId && c === collections[0]);
        if (!isTargetCol) return c;

        let foundInRoot = false;
        const newRequests = (c.requests || []).map(r => {
          if (r.id === requestToExecute.id) {
            foundInRoot = true;
            requestSavedInCollection = true;
            return { ...requestToExecute, updatedAt: new Date().toISOString() };
          }
          return r;
        });

        let foundInFolder = false;
        const newFolders = (c.folders || []).map(f => ({
          ...f,
          requests: (f.requests || []).map(r => {
            if (r.id === requestToExecute.id) {
              foundInFolder = true;
              requestSavedInCollection = true;
              return { ...requestToExecute, updatedAt: new Date().toISOString() };
            }
            return r;
          }),
        }));

        if (!foundInRoot && !foundInFolder) {
          newRequests.push({ ...requestToExecute, updatedAt: new Date().toISOString() });
          requestSavedInCollection = true;
        }

        return {
          ...c,
          requests: newRequests,
          folders: newFolders,
        };
      });

      if (!requestSavedInCollection && updatedCollections.length > 0) {
        updatedCollections[0] = {
          ...updatedCollections[0],
          requests: [...(updatedCollections[0].requests || []), { ...requestToExecute, updatedAt: new Date().toISOString() }],
        };
      }

      setCollections(updatedCollections);
      try {
        localStorage.setItem('cp_active_request_' + requestToExecute.id, JSON.stringify(requestToExecute));
      } catch (e) {}

      // 2. Track in Recent Requests (keeps last 50 executed requests with full snapshots)
      const recentItem: RecentRequest = {
        id: 'rec_' + Math.random().toString(36).substring(2, 9),
        requestId: requestToExecute.id,
        collectionId: requestToExecute.collectionId,
        name: requestToExecute.name,
        method: requestToExecute.method,
        url: requestToExecute.url,
        status: response.status,
        statusText: response.statusText,
        time: response.time,
        size: response.size,
        executedAt: new Date().toISOString(),
        requestSnapshot: JSON.parse(JSON.stringify(requestToExecute)),
        responseSnapshot: response,
      };
      const updatedRecent = [recentItem, ...recentRequests.filter(r => r.id !== recentItem.id)].slice(0, 50);
      setRecentRequests(updatedRecent);

      // 3. Guaranteed LocalStorage Persistence for Guest Mode (and instant session recovery)
      try {
        localStorage.setItem('cp_recent_requests', JSON.stringify(updatedRecent));
        localStorage.setItem('cp_collections', JSON.stringify(updatedCollections));
        localStorage.setItem('cp_workspaces', JSON.stringify(workspaces));
        localStorage.setItem('cp_environments', JSON.stringify(environments));
        localStorage.setItem('cp_tabs', JSON.stringify(tabs));
        localStorage.setItem('cp_active_tab_id', activeTabId);
        localStorage.setItem('cp_active_request_' + requestToExecute.id, JSON.stringify(requestToExecute));
        const updatedResponsesMap = { ...responsesMap, [requestToExecute.id]: response };
        localStorage.setItem('cp_responses_map', JSON.stringify(updatedResponsesMap));

        // Dedicated isolated guest mode history log
        const guestHistoryKey = `cp_${guestId}_history`;
        const guestHistory = JSON.parse(localStorage.getItem(guestHistoryKey) || '[]');
        guestHistory.unshift({
          id: recentItem.id,
          name: requestToExecute.name,
          method: requestToExecute.method,
          url: requestToExecute.url,
          status: response.status,
          time: response.time,
          size: response.size,
          executedAt: recentItem.executedAt,
          request: requestToExecute,
          response: response,
        });
        localStorage.setItem(guestHistoryKey, JSON.stringify(guestHistory.slice(0, 50)));
      } catch (err) {
        console.warn('LocalStorage save error:', err);
      }

      // 4. Save to central MySQL database (accessible by all three apps: Web, Desktop, PHP)
      const targetUserId = currentUser?.id || guestId;

      // 4a. Immediate Direct Save to cp_history table
      saveExecutionHistoryRecord({
        id: recentItem.id,
        userId: targetUserId,
        workspaceId: currentWorkspaceId,
        name: requestToExecute.name,
        method: requestToExecute.method,
        url: requestToExecute.url,
        statusCode: response.status,
        responseTimeMs: response.time,
        responseSizeBytes: response.size,
        request: requestToExecute,
        response: response,
        executedAt: recentItem.executedAt,
      });

      // 4b. Queue to offline sync engine for resilient delivery
      offlineSyncService.queueHistoryRecord({
        id: recentItem.id,
        userId: targetUserId,
        workspaceId: currentWorkspaceId,
        name: requestToExecute.name,
        method: requestToExecute.method,
        url: requestToExecute.url,
        statusCode: response.status,
        responseTimeMs: response.time,
        responseSizeBytes: response.size,
        request: requestToExecute,
        response: response,
        executedAt: recentItem.executedAt,
      });

      // 4c. Direct save of full application state to cp_app_state in database
      saveAllToDatabase({
        userId: targetUserId,
        workspaces,
        collections: updatedCollections,
        environments,
        activityLogs,
        recentRequests: updatedRecent,
      });

      // Meter usage against SaaS Customer Ledger
      try {
        recordCustomerApiExecution(currentUser?.id || 'cust_1', response.time, response.size);
        setSaasCustomers(getSaaSCustomers());
      } catch (err) {
        console.error('Failed to meter SaaS execution:', err);
      }

      // Add to activity log
      const newLog: ActivityLog = {
        id: 'act_' + Math.random().toString(36).substring(2, 9),
        workspaceId: currentWorkspaceId,
        user: {
          name: activeUser.name,
          email: activeUser.email,
          avatar: activeUser.avatar,
        },
        action: 'EXECUTED_REQUEST',
        targetName: requestToExecute.name,
        targetType: 'request',
        details: `${response.status} ${response.statusText} in ${response.time}ms`,
        timestamp: new Date().toISOString(),
      };
      setActivityLogs(prev => [newLog, ...prev.slice(0, 29)]);
    } catch (err: any) {
      console.error(err);
      setTabs(prev => prev.map(t => t.requestId === requestToExecute.id ? { 
        ...t, 
        isLoading: false, 
        lastStatusCode: 0, 
        lastStatusText: err.message || 'Error' 
      } : t));
    } finally {
      setIsLoadingRequest(false);
      setExecutingRequestIds(prev => prev.filter(id => id !== requestToExecute.id));
    }
  };

  const handleRequestExecutedInBackground = (reqId: string, res: ApiResponse) => {
    setResponsesMap(prev => ({ ...prev, [reqId]: res }));
    setTabs(prev => prev.map(t => t.requestId === reqId ? {
      ...t,
      isLoading: false,
      lastStatusCode: res.status,
      lastStatusText: res.statusText,
    } : t));
  };

  const handleSelectRecentRequest = (recent: RecentRequest) => {
    // Check if request exists in collections
    let foundReq: ApiRequest | null = null;
    for (const col of collections) {
      for (const req of col.requests) {
        if (req.id === recent.requestId) {
          foundReq = req;
          break;
        }
      }
      if (foundReq) break;
      for (const fld of col.folders) {
        for (const req of fld.requests) {
          if (req.id === recent.requestId) {
            foundReq = req;
            break;
          }
        }
        if (foundReq) break;
      }
      if (foundReq) break;
    }

    const targetReq = foundReq || recent.requestSnapshot;

    if (recent.responseSnapshot) {
      setResponsesMap(prev => ({
        ...prev,
        [targetReq.id]: recent.responseSnapshot!,
      }));
    }

    try {
      localStorage.setItem('cp_active_request_' + targetReq.id, JSON.stringify(targetReq));
    } catch (e) {}

    handleSelectRequest(targetReq);
  };

  const handleReplayRecentRequest = async (recent: RecentRequest) => {
    handleSelectRecentRequest(recent);
    await handleSendRequest(recent.requestSnapshot);
  };

  const handleRemoveRecentRequest = (recentId: string) => {
    const targetId = currentUser?.id || guestId;
    setRecentRequests(prev => {
      const updated = prev.filter(r => r.id !== recentId);
      try {
        localStorage.setItem(`cp_${targetId}_recent_requests`, JSON.stringify(updated));
      } catch (e) {}
      return updated;
    });
  };

  const handleClearRecentRequests = () => {
    const targetId = currentUser?.id || guestId;
    setRecentRequests([]);
    try {
      localStorage.removeItem('cp_recent_requests');
      localStorage.removeItem(`cp_${targetId}_recent_requests`);
    } catch (e) {}
    clearExecutionHistoryRecords(targetId);
  };

  const handleSaveRequest = (updatedRequest: ApiRequest) => {
    const updatedCollections = collections.map(col => {
      if (col.id !== updatedRequest.collectionId) return col;
      return {
        ...col,
        requests: col.requests.map(r => (r.id === updatedRequest.id ? updatedRequest : r)),
        folders: col.folders.map(f => ({
          ...f,
          requests: f.requests.map(r => (r.id === updatedRequest.id ? updatedRequest : r)),
        })),
        updatedAt: new Date().toISOString(),
      };
    });

    setCollections(updatedCollections);

    // Update tab method/title
    setTabs(prev =>
      prev.map(t =>
        t.requestId === updatedRequest.id
          ? { ...t, title: updatedRequest.name, method: updatedRequest.method, isDirty: false }
          : t
      )
    );

    const newLog: ActivityLog = {
      id: 'act_' + Math.random().toString(36).substring(2, 9),
      workspaceId: currentWorkspaceId,
      user: {
        name: activeUser.name,
        email: activeUser.email,
        avatar: activeUser.avatar,
      },
      action: 'UPDATED_REQUEST',
      targetName: updatedRequest.name,
      targetType: 'request',
      timestamp: new Date().toISOString(),
    };
    setActivityLogs(prev => [newLog, ...prev.slice(0, 29)]);
  };

  const handleCreateCollection = (name: string) => {
    const newCol: Collection = {
      id: 'col_' + Math.random().toString(36).substring(2, 9),
      workspaceId: currentWorkspaceId,
      name,
      folders: [],
      requests: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setCollections([...collections, newCol]);

    const newLog: ActivityLog = {
      id: 'act_' + Math.random().toString(36).substring(2, 9),
      workspaceId: currentWorkspaceId,
      user: {
        name: activeUser.name,
        email: activeUser.email,
        avatar: activeUser.avatar,
      },
      action: 'CREATED_COLLECTION',
      targetName: name,
      targetType: 'collection',
      timestamp: new Date().toISOString(),
    };
    setActivityLogs(prev => [newLog, ...prev]);
  };

  const handleDeleteCollection = (collectionId: string) => {
    setCollections(collections.filter(c => c.id !== collectionId));
  };

  const handleCreateFolder = (collectionId: string, folderName: string) => {
    const newFolder = {
      id: 'fld_' + Math.random().toString(36).substring(2, 9),
      collectionId,
      name: folderName,
      requests: [],
      createdAt: new Date().toISOString(),
    };
    setCollections(
      collections.map(c => (c.id === collectionId ? { ...c, folders: [...c.folders, newFolder] } : c))
    );
  };

  const handleDeleteFolder = (collectionId: string, folderId: string) => {
    setCollections(prev =>
      prev.map(c => {
        if (c.id === collectionId) {
          return {
            ...c,
            folders: c.folders.filter(f => f.id !== folderId),
          };
        }
        return c;
      })
    );
  };

  const handleCreateRequestInCollection = (collectionId: string, folderId?: string | null) => {
    const newReqId = 'req_' + Math.random().toString(36).substring(2, 9);
    const newReq: ApiRequest = {
      id: newReqId,
      collectionId,
      folderId: folderId || null,
      name: 'New HTTP Request',
      method: 'GET',
      url: '{{baseUrl}}/posts',
      params: [],
      headers: [],
      body: {
        type: 'none',
        rawText: '',
        rawType: 'text/plain',
        formData: [],
        urlEncoded: [],
      },
      auth: { type: 'none' },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    setCollections(
      collections.map(c => {
        if (c.id !== collectionId) return c;
        if (folderId) {
          return {
            ...c,
            folders: c.folders.map(f => (f.id === folderId ? { ...f, requests: [...f.requests, newReq] } : f)),
          };
        } else {
          return { ...c, requests: [...c.requests, newReq] };
        }
      })
    );

    handleSelectRequest(newReq);
  };

  const handleDeleteRequest = (requestId: string, collectionId: string) => {
    setCollections(
      collections.map(c => {
        if (c.id !== collectionId) return c;
        return {
          ...c,
          requests: c.requests.filter(r => r.id !== requestId),
          folders: c.folders.map(f => ({
            ...f,
            requests: f.requests.filter(r => r.id !== requestId),
          })),
        };
      })
    );
    // Close tab if open
    const openTab = tabs.find(t => t.requestId === requestId);
    if (openTab) {
      handleCloseTab(openTab.id);
    }
  };

  // Workspace Member RBAC handlers
  const handleInviteMember = (email: string, role: Role) => {
    if (isGuest) {
      setGuestRestrictionMessage('Guest users cannot share workspaces or invite collaborators. Please sign in or register.');
      setShowGuestRestrictionModal(true);
      return;
    }
    const newMember = {
      userId: 'usr_' + Math.random().toString(36).substring(2, 9),
      name: email.split('@')[0],
      email,
      avatar: `https://images.unsplash.com/photo-${1500000000000 + Math.floor(Math.random() * 900000)}?w=120&auto=format&fit=crop&q=80`,
      role,
      status: 'PENDING' as const,
      invitedAt: new Date().toISOString(),
    };

    setWorkspaces(
      workspaces.map(w =>
        w.id === currentWorkspaceId ? { ...w, members: [...w.members, newMember] } : w
      )
    );

    const newLog: ActivityLog = {
      id: 'act_' + Math.random().toString(36).substring(2, 9),
      workspaceId: currentWorkspaceId,
      user: {
        name: activeUser.name,
        email: activeUser.email,
        avatar: activeUser.avatar,
      },
      action: 'INVITED_MEMBER',
      targetName: `${email} (${role})`,
      targetType: 'member',
      timestamp: new Date().toISOString(),
    };
    setActivityLogs(prev => [newLog, ...prev]);
  };

  const handleChangeMemberRole = (userId: string, newRole: Role) => {
    setWorkspaces(
      workspaces.map(w => {
        if (w.id !== currentWorkspaceId) return w;
        return {
          ...w,
          members: w.members.map(m => (m.userId === userId ? { ...m, role: newRole } : m)),
        };
      })
    );

    const newLog: ActivityLog = {
      id: 'act_' + Math.random().toString(36).substring(2, 9),
      workspaceId: currentWorkspaceId,
      user: {
        name: activeUser.name,
        email: activeUser.email,
        avatar: activeUser.avatar,
      },
      action: 'CHANGED_ROLE',
      targetName: `Member role updated to ${newRole}`,
      targetType: 'member',
      timestamp: new Date().toISOString(),
    };
    setActivityLogs(prev => [newLog, ...prev]);
  };

  const handleRemoveMember = (userId: string) => {
    setWorkspaces(
      workspaces.map(w => {
        if (w.id !== currentWorkspaceId) return w;
        return {
          ...w,
          members: w.members.filter(m => m.userId !== userId),
        };
      })
    );
  };

  const handleCreateWorkspace = (name: string, description: string, type: 'PERSONAL' | 'TEAM') => {
    if (isGuest) {
      setGuestRestrictionMessage('Guest users cannot create new workspaces. Please sign in or register to create workspaces.');
      setShowGuestRestrictionModal(true);
      return;
    }
    const newWs: Workspace = {
      id: 'ws_' + Math.random().toString(36).substring(2, 9),
      name,
      description,
      type,
      ownerId: activeUser.id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      members: [
        {
          userId: activeUser.id,
          name: activeUser.name,
          email: activeUser.email,
          avatar: activeUser.avatar,
          role: 'ADMIN',
          status: 'ACTIVE',
          invitedAt: new Date().toISOString(),
          joinedAt: new Date().toISOString(),
        },
      ],
    };

    setWorkspaces([...workspaces, newWs]);
    setCurrentWorkspaceId(newWs.id);
  };

  const handleImportSuccess = (result: {
    workspaces?: Workspace[];
    collections?: Collection[];
    environments?: Environment[];
    activityLogs?: ActivityLog[];
    targetWorkspaceId: string;
    mode: 'add' | 'replace';
  }) => {
    const { workspaces: importedWorkspaces, collections: importedCollections, environments: importedEnvironments, activityLogs: importedLogs, targetWorkspaceId, mode } = result;

    if (mode === 'replace') {
      if (importedWorkspaces && importedWorkspaces.length > 0) {
        setWorkspaces(importedWorkspaces);
        setCurrentWorkspaceId(importedWorkspaces[0].id);
      }
      if (importedCollections) {
        setCollections(importedCollections);
      }
      if (importedEnvironments) {
        setEnvironments(importedEnvironments);
      }
      if (importedLogs) {
        setActivityLogs(importedLogs);
      }
    } else {
      // Append mode
      if (importedWorkspaces && importedWorkspaces.length > 0) {
        setWorkspaces(prev => {
          const existingIds = new Set(prev.map(w => w.id));
          const newWs = importedWorkspaces.filter(w => !existingIds.has(w.id));
          return [...prev, ...newWs];
        });
      }

      if (importedCollections && importedCollections.length > 0) {
        const assignedCollections = importedCollections.map(col => ({
          ...col,
          workspaceId: targetWorkspaceId || currentWorkspaceId,
        }));
        setCollections(prev => [...prev, ...assignedCollections]);

        // Auto-open first imported request
        const firstCol = assignedCollections[0];
        const firstReq = firstCol?.requests?.[0] || firstCol?.folders?.[0]?.requests?.[0];
        if (firstReq) {
          handleSelectRequest(firstReq);
        }
      }

      if (importedEnvironments && importedEnvironments.length > 0) {
        const assignedEnvs = importedEnvironments.map(env => ({
          ...env,
          workspaceId: env.isGlobal ? undefined : (targetWorkspaceId || currentWorkspaceId),
        }));
        setEnvironments(prev => [...prev, ...assignedEnvs]);
      }
    }

    // Add activity log
    const colCount = importedCollections?.length || 0;
    const envCount = importedEnvironments?.length || 0;
    const logSummary = `Data imported (${colCount} collections, ${envCount} environments)`;
    const newLog: ActivityLog = {
      id: 'log_' + Math.random().toString(36).substring(2, 9),
      workspaceId: targetWorkspaceId || currentWorkspaceId,
      user: {
        name: activeUser.name,
        email: activeUser.email,
        avatar: activeUser.avatar,
      },
      action: 'CREATED_COLLECTION',
      targetName: logSummary,
      targetType: 'collection',
      timestamp: new Date().toISOString(),
    };
    setActivityLogs(prev => [newLog, ...prev]);
  };

  const handleOpenImportModal = () => {
    setImportExportModalState({ isOpen: true, initialTab: 'import' });
  };

  const handleOpenExportModal = (options?: {
    exportType?: ExportFormatType;
    collectionId?: string;
    environmentId?: string;
  }) => {
    setImportExportModalState({
      isOpen: true,
      initialTab: 'export',
      initialExportType: options?.exportType || 'postman_collection',
      initialCollectionId: options?.collectionId,
      initialEnvironmentId: options?.environmentId,
    });
  };

  return (
    <div className="h-screen w-screen flex flex-col bg-[#0f1117] text-[#e1e4ea] overflow-hidden select-none relative">
      {/* 0. Landing Page Screen (Opens on load or via logo/landing button) */}
      {showLandingPage && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-zinc-950 flex flex-col">
          <LandingPage
            onLaunchGuestMode={() => setShowLandingPage(false)}
            onOpenAuthModal={() => setShowAuthModal(true)}
            onOpenRegister={handleOpenRegisterTab}
            onOpenDownloadPage={() => setShowDownloadModal(true)}
            onOpenDocs={handleOpenDocsTab}
            onOpenHelpModal={() => setShowHelpModal(true)}
            isAuthenticated={!isGuest}
            isSaaSUser={isSaaSUser}
            currentUser={currentUser}
            onLaunchAuthWorkspace={() => setShowLandingPage(false)}
          />
        </div>
      )}

      {/* 0.1 Desktop Native Auto-Update Banner */}
      {isDesktopTool() && <DesktopUpdateBanner />}

      {/* 1. Global Navigation Bar */}
      <Navbar
        currentWorkspace={currentWorkspace}
        allWorkspaces={workspaces}
        currentUser={currentUser}
        currentRole={currentRole}
        isGuest={isGuest}
        environments={workspaceEnvironments}
        activeEnvId={activeEnvId}
        activeVariables={activeVariables}
        scopedVariables={activeScopedVariables}
        currentCollection={activeRequestCollection}
        presence={presence}
        isSidebarOpen={isSidebarOpen}
        onToggleSidebar={() => setIsSidebarOpen(prev => !prev)}
        onSelectWorkspace={id => setCurrentWorkspaceId(id)}
        onOpenCreateWorkspaceModal={handleOpenCreateWorkspace}
        onOpenShareModal={handleOpenShareModal}
        onOpenRunner={() => handleOpenRunner()}
        onOpenEnvManager={() => setShowEnvManagerModal(true)}
        onOpenCreateVariableModal={() => handleOpenSetAsVariable('')}
        onQuickAddVariable={handleSaveNewVariable}
        onQuickUpdateVariable={handleQuickUpdateVariable}
        onSetActiveEnv={id => setActiveEnvId(id)}
        onOpenArchitectureTab={handleOpenArchitectureTab}
        isSaaSAdmin={userIsSaaSAdmin}
        isSaaSUser={isSaaSUser}
        onOpenSaaSUsers={handleOpenSaaSUsersTab}
        onOpenSaaSReports={handleOpenSaaSReportsTab}
        onOpenRegister={handleOpenRegisterTab}
        onOpenDownloadModal={() => setShowDownloadModal(true)}
        onOpenDocsTab={handleOpenDocsTab}
        onOpenHelpModal={() => setShowHelpModal(true)}
        onExportAllCollections={() => handleOpenExportModal({ exportType: 'postman_collection' })}
        onImportCollection={handleOpenImportModal}
        onOpenLandingPage={() => setShowLandingPage(true)}
        onOpenAuthModal={() => setShowAuthModal(true)}
        guestShortCode={guestShortCode}
        onResetGuestSession={() => {
          setShowGuestResetConfirmModal(true);
        }}
        onLogout={handleLogout}
      />

      {/* 2. Main Workspace Layout */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Left Sidebar Drawer / Column */}
        {isSidebarOpen && (
          <>
            {/* Mobile backdrop (only for small touch screens in web, never in desktop app) */}
            {!isDesktopTool() && (
              <div 
                className="md:hidden fixed inset-0 bg-black/60 z-20 transition-opacity backdrop-blur-sm"
                onClick={() => setIsSidebarOpen(false)}
              />
            )}
            <div className={`z-30 shrink-0 flex flex-col transition-all bg-[#0e111a] border-r border-white/10 ${
              isDesktopTool()
                ? 'static w-72 xl:w-80 h-auto shadow-none'
                : 'fixed inset-y-14 left-0 w-80 md:static md:w-72 xl:w-80 h-[calc(100vh-3.5rem)] md:h-auto shadow-2xl md:shadow-none'
            }`}>
              <Sidebar
                workspace={currentWorkspace}
                collections={workspaceCollections}
                environments={workspaceEnvironments}
                activeEnvId={activeEnvId}
                userRole={currentRole}
                activityLogs={activityLogs}
                recentRequests={recentRequests}
                activeRequestId={activeRequestObj?.id}
                onSelectRequest={req => {
                  handleSelectRequest(req);
                  if (!isDesktopTool() && typeof window !== 'undefined' && window.innerWidth < 768) {
                    setIsSidebarOpen(false);
                  }
                }}
                onSelectRecentRequest={req => {
                  handleSelectRecentRequest(req);
                  if (!isDesktopTool() && typeof window !== 'undefined' && window.innerWidth < 768) {
                    setIsSidebarOpen(false);
                  }
                }}
                onReplayRecentRequest={handleReplayRecentRequest}
                onRemoveRecentRequest={handleRemoveRecentRequest}
                onClearRecentRequests={handleClearRecentRequests}
                onCreateCollection={handleCreateCollection}
                onDeleteCollection={handleDeleteCollection}
                onCreateFolder={handleCreateFolder}
                onDeleteFolder={handleDeleteFolder}
                onCreateRequest={handleCreateRequestInCollection}
                onDeleteRequest={handleDeleteRequest}
                onOpenRunner={handleOpenRunner}
                onOpenEnvManager={() => setShowEnvManagerModal(true)}
                onSetActiveEnv={id => setActiveEnvId(id)}
                onExportRequestCode={(req, col) => setExportModalTarget({ request: req, collection: col })}
                onExportCollectionCode={col => {
                  const firstReq = col.requests[0] || col.folders[0]?.requests[0] || activeRequestObj;
                  if (firstReq) {
                    setExportModalTarget({ request: firstReq, collection: col });
                  }
                }}
                onOpenImportModal={handleOpenImportModal}
                onExportCollectionJson={(col, type) => handleOpenExportModal({ collectionId: col.id, exportType: type || 'postman_collection' })}
                onShareCollection={handleOpenShareCollection}
                onShareRequest={handleOpenShareRequest}
                onOpenWebSocketTab={handleOpenWebSocketTab}
                onOpenMockServerTab={handleOpenMockServerTab}
                onOpenGraphQLTab={handleOpenGraphQLTab}
                onOpenMonitorTab={handleOpenMonitorTab}
                onOpenRegister={handleOpenRegisterTab}
                onResetGuestSession={() => setShowGuestResetConfirmModal(true)}
                isGuest={isGuest}
              />
            </div>
          </>
        )}

        {/* Center / Right Content Panel */}
        <main className="flex-1 flex flex-col bg-[#11141e] overflow-hidden min-w-0">
          {/* Multi-Tab Switcher */}
          <TabsBar
            tabs={tabs}
            activeTabId={activeTabId}
            responsesMap={responsesMap}
            executingRequestIds={executingRequestIds}
            onSelectTab={id => setActiveTabId(id)}
            onCloseTab={handleCloseTab}
            onNewRequestTab={handleNewRequestTab}
            onOpenArchitectureTab={handleOpenArchitectureTab}
            onOpenRunnerTab={() => handleOpenRunner()}
            isSaaSAdmin={userIsSaaSAdmin}
            isSaaSUser={isSaaSUser}
            onOpenSaaSUsersTab={handleOpenSaaSUsersTab}
            onOpenSaaSReportsTab={handleOpenSaaSReportsTab}
            onOpenWebSocketTab={handleOpenWebSocketTab}
            onOpenMockServerTab={handleOpenMockServerTab}
            onOpenGraphQLTab={handleOpenGraphQLTab}
            onOpenMonitorTab={handleOpenMonitorTab}
            onOpenSSETab={handleOpenSSETab}
            onOpenGRPCTab={handleOpenGRPCTab}
            onOpenDocsTab={handleOpenDocsTab}
            onOpenHelpModal={() => setShowHelpModal(true)}
            onOpenDiffTab={handleOpenDiffTab}
            onOpenRegisterTab={handleOpenRegisterTab}
            onOpenImport={handleOpenImportModal}
            onResetGuestSession={() => setShowGuestResetConfirmModal(true)}
            isGuest={isGuest}
            isSidebarOpen={isSidebarOpen}
            onToggleSidebar={() => setIsSidebarOpen(prev => !prev)}
            layoutMode={layoutMode}
            onToggleLayout={handleToggleLayout}
          />

          {/* Tab Viewport Content */}
          <div className="flex-1 overflow-hidden">
            {activeTab.type === 'websocket' && (
              <WebSocketTester layoutMode={layoutMode} />
            )}

            {activeTab.type === 'mock_server' && (
              <MockServerManager
                workspaceId={currentWorkspace.id}
                onOpenRequestInBuilder={handleOpenMockInBuilder}
              />
            )}

            {activeTab.type === 'graphql' && (
              <GraphQLExplorer layoutMode={layoutMode} />
            )}

            {activeTab.type === 'monitor' && (
              <CollectionMonitorView
                collections={workspaceCollections}
                environments={workspaceEnvironments}
                workspaceId={currentWorkspace.id}
                onRequestExecuted={handleRequestExecutedInBackground}
              />
            )}

            {activeTab.type === 'architecture' && (
              userIsSaaSAdmin ? (
                <ArchitectureAndSchemaView />
              ) : (
                <div className="h-full flex flex-col items-center justify-center p-8 text-center bg-[#0e121e]">
                  <div className="w-12 h-12 rounded-2xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-orange-400 mb-4">
                    <ShieldAlert className="w-6 h-6" />
                  </div>
                  <h3 className="text-base font-bold text-white mb-1">Restricted Access</h3>
                  <p className="text-xs text-zinc-400 max-w-sm">
                    System Architecture & Database blueprints are only accessible to SaaS Platform Administrators.
                  </p>
                </div>
              )
            )}

            {activeTab.type === 'saas_users' && (
              <SaaSUserDashboard
                customers={saasCustomers}
                currentUser={currentUser}
                isGuest={isGuest}
                onUpdateCustomer={handleUpdateSaaSCustomer}
                onOpenReportsTab={handleOpenSaaSReportsTab}
                onOpenRegisterTab={handleOpenRegisterTab}
                onOpenAuthModal={() => setShowAuthModal(true)}
                onSwitchToGuest={handleSwitchToGuest}
              />
            )}

            {activeTab.type === 'saas_reports' && (
              <SaaSReportsView
                customers={saasCustomers}
                currentUser={currentUser}
                isGuest={isGuest}
                onOpenCustomersTab={handleOpenSaaSUsersTab}
                onOpenRegisterTab={handleOpenRegisterTab}
                onOpenAuthModal={() => setShowAuthModal(true)}
                onSwitchToGuest={handleSwitchToGuest}
              />
            )}

            {activeTab.type === 'register' && (
              <RegisterPage
                onRegisterSuccess={handleRegisterSuccess}
                onSwitchToLogin={() => {
                  setTabs(prev => prev.filter(t => t.type !== 'register'));
                  setShowAuthModal(true);
                }}
                onClose={() => handleCloseTab(activeTab.id)}
              />
            )}

            {activeTab.type === 'collection_runner' && activeRunnerCollection && (
              <CollectionRunner
                collection={activeRunnerCollection}
                variables={activeVariables}
                onResponseExecuted={handleRequestExecutedInBackground}
              />
            )}

            {activeTab.type === 'sse' && (
              <SSETester />
            )}

            {activeTab.type === 'grpc' && (
              <GRPCExplorer />
            )}

            {activeTab.type === 'collection_docs' && (
              <AppDocsAndManuals
                collections={workspaceCollections}
                activeCollectionId={activeRequestCollection?.id || workspaceCollections[0]?.id}
                variables={activeVariables}
                onOpenRequestInStudio={handleSelectRequest}
                onOpenDownloadModal={() => setShowDownloadModal(true)}
                isSaaSUser={isSaaSUser}
                onOpenAuthModal={() => setShowAuthModal(true)}
                onOpenRegister={handleOpenRegisterTab}
              />
            )}

            {activeTab.type === 'diff_viewer' && (
              <ResponseDiffViewer
                currentResponse={activeRequestObj ? responsesMap[activeRequestObj.id] : null}
                historyItems={recentRequests}
              />
            )}

            {activeTab.type === 'request' && activeRequestObj && (
              <div className={`h-full flex ${layoutMode === 'columns' ? 'flex-row' : 'flex-col'} overflow-hidden min-w-0`}>
                {/* Request Builder Pane */}
                <div className={`overflow-hidden flex flex-col min-w-0 ${
                  layoutMode === 'columns'
                    ? 'flex-1 w-1/2 border-r border-white/10 h-full'
                    : 'flex-1 h-1/2 min-h-[320px] border-b border-white/10'
                }`}>
                  <RequestBuilder
                    key={activeRequestObj.id}
                    request={activeRequestObj}
                    collection={activeRequestCollection}
                    variables={activeVariables}
                    scopedVariables={activeScopedVariables}
                    environments={workspaceEnvironments}
                    activeEnvId={activeEnvId}
                    userRole={currentRole}
                    isLoading={isLoadingRequest}
                    onSend={handleSendRequest}
                    onSave={handleSaveRequest}
                    onRequestSetAsVariable={handleOpenSetAsVariable}
                    onQuickUpdateVariable={handleQuickUpdateVariable}
                    onShareRequest={handleOpenShareRequest}
                    isDirty={activeTab.isDirty}
                  />
                </div>

                {/* Response Inspector Pane */}
                <div className={`overflow-hidden flex flex-col min-w-0 ${
                  layoutMode === 'columns'
                    ? 'flex-1 w-1/2 h-full'
                    : 'flex-1 h-1/2 min-h-[260px]'
                }`}>
                  <ResponseViewer
                    response={activeResponse}
                    activeRequest={activeRequestObj}
                    isLoading={isLoadingRequest}
                    onRequestExportCode={() => {
                      if (activeRequestObj) {
                        setExportModalTarget({ request: activeRequestObj, collection: activeRequestCollection });
                      }
                    }}
                    onRetryWithProxy={activeRequestObj ? () => handleSendRequest(activeRequestObj, true) : undefined}
                  />
                </div>
              </div>
            )}

            {activeTab.type === 'request' && !activeRequestObj && (
              <div className="h-full flex flex-col items-center justify-center p-8 text-center bg-[#0c0e15] overflow-y-auto">
                <div className="max-w-md w-full p-8 rounded-2xl bg-[#121520] border border-white/10 shadow-2xl flex flex-col items-center space-y-4">
                  <div className="w-16 h-16 rounded-2xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-orange-400">
                    <Layers className="w-8 h-8" />
                  </div>
                  <div className="space-y-1">
                    <h2 className="text-xl font-bold text-white tracking-tight">
                      {currentWorkspace?.name || 'Workspace'}
                    </h2>
                    <p className="text-xs text-zinc-400 max-w-sm leading-relaxed">
                      Everything is clean and blank. Start testing and building your APIs by creating your first HTTP request or organizing endpoints into folders.
                    </p>
                  </div>

                  <div className="pt-2 flex flex-col sm:flex-row items-center gap-3 w-full">
                    <button
                      onClick={() => {
                        const targetCol = workspaceCollections[0] || collections[0];
                        if (targetCol) {
                          handleCreateRequestInCollection(targetCol.id);
                        }
                      }}
                      className="w-full sm:flex-1 py-2.5 px-4 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-semibold text-xs transition-colors flex items-center justify-center gap-2 shadow-lg shadow-orange-500/20 cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                      <span>New HTTP Request</span>
                    </button>
                    <button
                      onClick={() => {
                        const targetCol = workspaceCollections[0] || collections[0];
                        if (targetCol) {
                          handleCreateFolder(targetCol.id, 'New Folder');
                        }
                      }}
                      className="w-full sm:flex-1 py-2.5 px-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-amber-300 font-medium text-xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <FolderPlus className="w-4 h-4" />
                      <span>New Folder</span>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>

      {/* 3. Global Modals */}
      {showGuestRestrictionModal && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#141824] border border-amber-500/30 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                <ShieldAlert className="w-5 h-5 text-amber-400" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Authentication Required</h3>
                <p className="text-xs text-zinc-400">Guest Action Restricted</p>
              </div>
            </div>

            <p className="text-xs text-zinc-300 leading-relaxed">
              {guestRestrictionMessage}
            </p>

            <div className="pt-2 flex justify-end gap-2 border-t border-white/5">
              <button
                type="button"
                onClick={() => setShowGuestRestrictionModal(false)}
                className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-medium text-xs cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowGuestRestrictionModal(false);
                  setShowAuthModal(true);
                }}
                className="px-4 py-1.5 rounded-lg bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-lg shadow-orange-500/20 cursor-pointer"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Sign In / Register</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {showShareModal && (
        <ShareModal
          workspace={currentWorkspace}
          currentRole={currentRole}
          onClose={() => setShowShareModal(false)}
          onInviteMember={handleInviteMember}
          onChangeMemberRole={handleChangeMemberRole}
          onRemoveMember={handleRemoveMember}
        />
      )}

      {showWorkspaceModal && (
        <WorkspaceModal
          onClose={() => setShowWorkspaceModal(false)}
          onCreateWorkspace={handleCreateWorkspace}
        />
      )}

      {showEnvManagerModal && (
        <EnvironmentManagerModal
          environments={workspaceEnvironments}
          collections={workspaceCollections}
          activeEnvId={activeEnvId}
          onClose={() => setShowEnvManagerModal(false)}
          onUpdateEnvironments={setEnvironments}
          onUpdateCollections={setCollections}
          onSetActiveEnv={setActiveEnvId}
        />
      )}

      {setAsVariableModalState.isOpen && (
        <SetAsVariableModal
          environments={workspaceEnvironments}
          activeEnvId={activeEnvId}
          currentCollection={activeRequestCollection}
          initialKey={setAsVariableModalState.initialKey}
          initialValue={setAsVariableModalState.initialValue}
          initialScope={setAsVariableModalState.initialScope}
          onSave={handleSaveNewVariable}
          onClose={() => setSetAsVariableModalState({ isOpen: false })}
        />
      )}

      {exportModalTarget && (
        <CodeSnippetModal
          request={exportModalTarget.request}
          collection={exportModalTarget.collection}
          variables={activeVariables}
          onClose={() => setExportModalTarget(null)}
        />
      )}

      {importExportModalState.isOpen && (
        <ImportExportModal
          initialTab={importExportModalState.initialTab}
          initialExportType={importExportModalState.initialExportType}
          initialCollectionId={importExportModalState.initialCollectionId}
          initialEnvironmentId={importExportModalState.initialEnvironmentId}
          workspaces={workspaces}
          currentWorkspace={currentWorkspace}
          collections={collections}
          environments={environments}
          activityLogs={activityLogs}
          userRole={currentRole}
          onImportSuccess={handleImportSuccess}
          onClose={() => setImportExportModalState(prev => ({ ...prev, isOpen: false }))}
        />
      )}

      {shareLinkModalState.isOpen && (
        <ShareLinkModal
          type={shareLinkModalState.type}
          request={shareLinkModalState.request}
          collection={shareLinkModalState.collection}
          workspace={currentWorkspace}
          onClose={() => setShareLinkModalState(prev => ({ ...prev, isOpen: false }))}
          onUpdateCollectionSharing={handleUpdateCollectionSharing}
        />
      )}

      {/* Authentication Modal */}
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        onLoginSuccess={handleLoginSuccess}
        hasGuestData={isGuest && collections.length > 0}
      />

      {/* Desktop Distribution Download Modal */}
      <DownloadModal
        isOpen={showDownloadModal}
        onClose={() => setShowDownloadModal(false)}
      />

      {/* User Guide & Help Modal (How to use this tool, no architecture/database/internal details) */}
      <UserGuideModal
        isOpen={showHelpModal}
        onClose={() => setShowHelpModal(false)}
        onOpenRunner={() => {
          const col = collections.find(c => c.workspaceId === currentWorkspaceId) || collections[0];
          if (col) handleOpenRunner(col);
        }}
        onOpenImport={handleOpenImportModal}
      />

      {/* Guest Session Reset Confirmation Modal */}
      <GuestResetConfirmModal
        isOpen={showGuestResetConfirmModal}
        currentGuestShortCode={guestShortCode}
        onConfirm={handleConfirmResetGuestSession}
        onCancel={() => setShowGuestResetConfirmModal(false)}
        onOpenRegister={handleOpenRegisterTab}
      />

      {/* Floating Toast Notification */}
      {toastNotification && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 bg-zinc-900 border border-orange-500/40 text-white rounded-xl shadow-2xl animate-in fade-in slide-in-from-bottom-4 duration-200">
          <div className="w-2.5 h-2.5 rounded-full bg-orange-500 shadow-sm shadow-orange-500/50 shrink-0" />
          <div className="text-xs">
            <p className="font-bold text-orange-400">{toastNotification.title}</p>
            <p className="text-zinc-300 text-[11px] mt-0.5">{toastNotification.message}</p>
          </div>
          <button
            type="button"
            onClick={() => setToastNotification(null)}
            className="text-zinc-400 hover:text-white p-1 text-xs ml-2"
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
}
