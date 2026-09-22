import React, { useState, useEffect } from 'react';
import { 
  Collection, 
  Folder, 
  ApiRequest, 
  Environment, 
  Role, 
  ActivityLog, 
  Workspace,
  RecentRequest
} from '../types';
import { 
  Folder as FolderIcon, 
  FolderOpen, 
  FolderPlus,
  Plus, 
  ChevronRight, 
  ChevronDown, 
  Search, 
  Layers, 
  Globe, 
  Clock, 
  Activity, 
  Play, 
  MoreVertical, 
  Trash2, 
  Edit2, 
  FileCode,
  ShieldAlert,
  Code2,
  Upload,
  Download,
  RotateCcw,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  XCircle,
  History,
  Share2,
  Radio,
  Server
} from 'lucide-react';

interface SidebarProps {
  workspace: Workspace;
  collections: Collection[];
  environments: Environment[];
  activeEnvId: string;
  userRole: Role;
  activityLogs: ActivityLog[];
  recentRequests?: RecentRequest[];
  activeRequestId?: string;
  onSelectRequest: (request: ApiRequest) => void;
  onSelectRecentRequest?: (recent: RecentRequest) => void;
  onReplayRecentRequest?: (recent: RecentRequest) => void;
  onRemoveRecentRequest?: (recentId: string) => void;
  onClearRecentRequests?: () => void;
  onCreateCollection: (name: string) => void;
  onDeleteCollection: (collectionId: string) => void;
  onCreateFolder: (collectionId: string, folderName: string) => void;
  onDeleteFolder?: (collectionId: string, folderId: string) => void;
  onCreateRequest: (collectionId: string, folderId?: string | null) => void;
  onDeleteRequest: (requestId: string, collectionId: string) => void;
  onOpenRunner: (collection: Collection) => void;
  onOpenEnvManager: () => void;
  onSetActiveEnv: (envId: string) => void;
  onExportRequestCode?: (request: ApiRequest, collection: Collection) => void;
  onExportCollectionCode?: (collection: Collection) => void;
  onOpenImportModal?: () => void;
  onExportCollectionJson?: (collection: Collection, type?: 'postman_collection' | 'cloudpost_collection') => void;
  onShareCollection?: (collection: Collection) => void;
  onShareRequest?: (request: ApiRequest) => void;
  onOpenWebSocketTab?: () => void;
  onOpenMockServerTab?: () => void;
  onOpenGraphQLTab?: () => void;
  onOpenMonitorTab?: () => void;
}

function formatRelativeTime(dateString: string): string {
  try {
    const date = new Date(dateString);
    const now = new Date();
    const diffSec = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffSec < 10) return 'Just now';
    if (diffSec < 60) return `${diffSec}s ago`;
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHour = Math.floor(diffMin / 60);
    if (diffHour < 24) return `${diffHour}h ago`;
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  } catch {
    return 'Recently';
  }
}

export const Sidebar: React.FC<SidebarProps> = ({
  workspace,
  collections,
  environments,
  activeEnvId,
  userRole,
  activityLogs,
  recentRequests = [],
  activeRequestId,
  onSelectRequest,
  onSelectRecentRequest,
  onReplayRecentRequest,
  onRemoveRecentRequest,
  onClearRecentRequests,
  onCreateCollection,
  onDeleteCollection,
  onCreateFolder,
  onDeleteFolder,
  onCreateRequest,
  onDeleteRequest,
  onOpenRunner,
  onOpenEnvManager,
  onSetActiveEnv,
  onExportRequestCode,
  onExportCollectionCode,
  onOpenImportModal,
  onExportCollectionJson,
  onShareCollection,
  onShareRequest,
  onOpenWebSocketTab,
  onOpenMockServerTab,
  onOpenGraphQLTab,
  onOpenMonitorTab,
}) => {
  const [activeTab, setActiveTab] = useState<'collections' | 'recent' | 'environments' | 'activity'>('collections');
  const [searchQuery, setSearchQuery] = useState('');
  const [recentFilterMethod, setRecentFilterMethod] = useState<string>('ALL');
  const [recentFilterStatus, setRecentFilterStatus] = useState<'ALL' | '2XX' | 'ERRORS'>('ALL');
  const [openCollections, setOpenCollections] = useState<Record<string, boolean>>({
    [collections[0]?.id || '']: true,
  });
  const [openFolders, setOpenFolders] = useState<Record<string, boolean>>({});
  const [newCollectionName, setNewCollectionName] = useState('');
  const [showNewCollectionInput, setShowNewCollectionInput] = useState(false);
  const [creatingFolderColId, setCreatingFolderColId] = useState<string | null>(null);
  const [newFolderName, setNewFolderName] = useState('');
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

  const isViewer = userRole === 'VIEWER';

  const toggleCollection = (colId: string) => {
    setOpenCollections(prev => ({ ...prev, [colId]: !prev[colId] }));
  };

  const toggleFolder = (fldId: string) => {
    setOpenFolders(prev => ({ ...prev, [fldId]: !prev[fldId] }));
  };

  // Auto-expand folder when a request inside it is selected/added
  useEffect(() => {
    if (!activeRequestId) return;
    for (const col of collections) {
      for (const fld of col.folders) {
        if (fld.requests.some(r => r.id === activeRequestId)) {
          setOpenFolders(prev => ({ ...prev, [fld.id]: true }));
          setOpenCollections(prev => ({ ...prev, [col.id]: true }));
          return;
        }
      }
    }
  }, [activeRequestId, collections]);

  const handleCreateCollectionSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCollectionName.trim() || isViewer) return;
    onCreateCollection(newCollectionName.trim());
    setNewCollectionName('');
    setShowNewCollectionInput(false);
  };

  const filteredCollections = collections.map(col => {
    if (!searchQuery.trim()) return col;
    const q = searchQuery.toLowerCase();
    const matchColName = col.name.toLowerCase().includes(q);
    const filteredRequests = col.requests.filter(r => r.name.toLowerCase().includes(q) || r.url.toLowerCase().includes(q));
    const filteredFolders = col.folders.map(f => ({
      ...f,
      requests: f.requests.filter(r => r.name.toLowerCase().includes(q) || r.url.toLowerCase().includes(q)),
    })).filter(f => f.name.toLowerCase().includes(q) || f.requests.length > 0);

    if (matchColName || filteredRequests.length > 0 || filteredFolders.length > 0) {
      return { ...col, requests: filteredRequests, folders: filteredFolders };
    }
    return null;
  }).filter(Boolean) as Collection[];

  const filteredRecentRequests = recentRequests.filter(r => {
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchText = r.name.toLowerCase().includes(q) || r.url.toLowerCase().includes(q) || r.method.toLowerCase().includes(q);
      if (!matchText) return false;
    }
    if (recentFilterMethod !== 'ALL' && r.method !== recentFilterMethod) {
      return false;
    }
    if (recentFilterStatus === '2XX') {
      if (!r.status || r.status < 200 || r.status >= 300) return false;
    } else if (recentFilterStatus === 'ERRORS') {
      if (r.status && r.status >= 200 && r.status < 400) return false;
    }
    return true;
  });

  return (
    <aside className="w-80 bg-[#0c0e15] border-r border-white/10 flex flex-col h-full shrink-0 select-none">
      {/* Top Sidebar Sub-Tabs: Collections, Recent, Envs, Activity */}
      <div className="flex items-center justify-between border-b border-white/10 bg-[#121520] p-1 text-[11px] shrink-0 gap-1">
        <button
          onClick={() => setActiveTab('collections')}
          className={`flex-1 h-8 px-1.5 rounded font-medium inline-flex items-center justify-center gap-1 transition-colors whitespace-nowrap ${
            activeTab === 'collections'
              ? 'bg-orange-500/20 text-orange-400 font-semibold'
              : 'text-zinc-400 hover:text-white'
          }`}
          title="Collections"
        >
          <Layers className="w-3.5 h-3.5 shrink-0" />
          <span className="truncate">Collections</span>
        </button>

        <button
          onClick={() => setActiveTab('recent')}
          className={`flex-1 h-8 px-1.5 rounded font-medium inline-flex items-center justify-center gap-1 transition-colors relative whitespace-nowrap ${
            activeTab === 'recent'
              ? 'bg-orange-500/20 text-orange-400 font-semibold'
              : 'text-zinc-400 hover:text-white'
          }`}
          title="Recent Requests (Last 20)"
        >
          <History className="w-3.5 h-3.5 text-amber-400 shrink-0" />
          <span className="truncate">Recent</span>
          {recentRequests.length > 0 && (
            <span className={`px-1 py-0.2 text-[9px] rounded-full font-bold leading-none shrink-0 ${
              activeTab === 'recent' ? 'bg-orange-500 text-white' : 'bg-white/10 text-zinc-300'
            }`}>
              {recentRequests.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('environments')}
          className={`flex-1 h-8 px-1.5 rounded font-medium inline-flex items-center justify-center gap-1 transition-colors whitespace-nowrap ${
            activeTab === 'environments'
              ? 'bg-orange-500/20 text-orange-400 font-semibold'
              : 'text-zinc-400 hover:text-white'
          }`}
          title="Environments"
        >
          <Globe className="w-3.5 h-3.5 shrink-0" />
          <span className="truncate">Envs</span>
        </button>

        <button
          onClick={() => setActiveTab('activity')}
          className={`flex-1 h-8 px-1.5 rounded font-medium inline-flex items-center justify-center gap-1 transition-colors whitespace-nowrap ${
            activeTab === 'activity'
              ? 'bg-orange-500/20 text-orange-400 font-semibold'
              : 'text-zinc-400 hover:text-white'
          }`}
          title="Activity"
        >
          <Activity className="w-3.5 h-3.5 shrink-0" />
          <span className="truncate">Activity</span>
        </button>
      </div>

      {/* Tab 1: Collections Tree */}
      {activeTab === 'collections' && (
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Search + Add / Import Collection Header */}
          <div className="p-2 border-b border-white/10 space-y-2 shrink-0">
            <div className="flex items-center gap-1.5">
              <div className="relative flex-1">
                <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Filter collections..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full h-8 bg-[#141824] border border-white/10 rounded-lg pl-7 pr-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-orange-500"
                />
              </div>
              {!isViewer && (
                <>
                  <button
                    onClick={onOpenImportModal}
                    className="h-8 w-8 inline-flex items-center justify-center p-0 bg-white/5 hover:bg-white/10 border border-white/10 text-orange-400 rounded-lg transition-colors shrink-0 whitespace-nowrap"
                    title="Import Postman / CloudPost (.json)"
                  >
                    <Upload className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setShowNewCollectionInput(true)}
                    className="h-8 w-8 inline-flex items-center justify-center p-0 bg-white/5 hover:bg-white/10 border border-white/10 text-orange-400 rounded-lg transition-colors shrink-0 whitespace-nowrap"
                    title="New Collection"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </>
              )}
            </div>

            {showNewCollectionInput && (
              <form onSubmit={handleCreateCollectionSubmit} className="space-y-1 pt-1">
                <input
                  type="text"
                  placeholder="Collection Name..."
                  value={newCollectionName}
                  onChange={e => setNewCollectionName(e.target.value)}
                  className="w-full bg-[#161b26] border border-orange-500/50 rounded px-2 py-1 text-xs text-white placeholder-zinc-500 focus:outline-none"
                  autoFocus
                />
                <div className="flex justify-end gap-1">
                  <button
                    type="button"
                    onClick={() => setShowNewCollectionInput(false)}
                    className="px-2 py-0.5 text-[11px] text-zinc-400 hover:text-white"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-2 py-0.5 bg-orange-500 text-white rounded text-[11px] font-medium"
                  >
                    Create
                  </button>
                </div>
              </form>
            )}
          </div>

          {/* Collections List Tree */}
          <div className="flex-1 overflow-y-auto p-2 space-y-1 text-xs">
            {filteredCollections.length === 0 ? (
              <div className="p-6 text-center text-zinc-500 text-xs">
                No collections found.
              </div>
            ) : (
              filteredCollections.map(col => {
                const isColOpen = openCollections[col.id];
                return (
                  <div key={col.id} className="rounded-lg overflow-hidden border border-white/5 bg-[#10131d]">
                    {/* Collection Header Row */}
                    <div
                      onClick={() => toggleCollection(col.id)}
                      className="group flex items-center justify-between px-2.5 py-2 hover:bg-white/5 cursor-pointer text-zinc-200"
                    >
                      <div className="flex items-center gap-1.5 truncate">
                        {isColOpen ? (
                          <ChevronDown className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                        ) : (
                          <ChevronRight className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                        )}
                        <Layers className="w-3.5 h-3.5 text-orange-400 shrink-0" />
                        <span className="font-semibold truncate text-white">{col.name}</span>
                      </div>

                      {/* Collection Context Actions */}
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={e => {
                            e.stopPropagation();
                            onShareCollection?.(col);
                          }}
                          className="p-1 hover:bg-white/10 rounded text-orange-400"
                          title="Share Collection via Public Link"
                        >
                          <Share2 className="w-3 h-3" />
                        </button>
                        <button
                          onClick={e => {
                            e.stopPropagation();
                            onExportCollectionJson?.(col, 'postman_collection');
                          }}
                          className="p-1 hover:bg-white/10 rounded text-amber-400"
                          title="Export Collection as Postman v2.1 JSON"
                        >
                          <Download className="w-3 h-3" />
                        </button>
                        <button
                          onClick={e => {
                            e.stopPropagation();
                            onExportCollectionJson?.(col, 'cloudpost_collection');
                          }}
                          className="p-1 hover:bg-white/10 rounded text-emerald-400"
                          title="Export Collection as CloudPost Custom Format JSON"
                        >
                          <Layers className="w-3 h-3" />
                        </button>
                        <button
                          onClick={e => {
                            e.stopPropagation();
                            if (onExportCollectionCode) {
                              onExportCollectionCode(col);
                            } else if (col.requests[0]) {
                              onExportRequestCode?.(col.requests[0], col);
                            }
                          }}
                          className="p-1 hover:bg-white/10 rounded text-orange-400"
                          title="Export Collection as Code / Script"
                        >
                          <Code2 className="w-3 h-3" />
                        </button>
                        <button
                          onClick={e => {
                            e.stopPropagation();
                            onOpenRunner(col);
                          }}
                          className="p-1 hover:bg-white/10 rounded text-emerald-400"
                          title="Run Collection"
                        >
                          <Play className="w-3 h-3 fill-emerald-400" />
                        </button>
                        {!isViewer && (
                          <>
                            <button
                              onClick={e => {
                                e.stopPropagation();
                                setOpenCollections(prev => ({ ...prev, [col.id]: true }));
                                setCreatingFolderColId(col.id);
                                setNewFolderName('');
                              }}
                              className="p-1 hover:bg-white/10 rounded text-amber-300 hover:text-amber-200"
                              title="New Folder"
                            >
                              <FolderPlus className="w-3 h-3" />
                            </button>
                            <button
                              onClick={e => {
                                e.stopPropagation();
                                onCreateRequest(col.id, null);
                              }}
                              className="p-1 hover:bg-white/10 rounded text-zinc-300 hover:text-white"
                              title="Add Request"
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                          </>
                        )}
                        {!isViewer && collections.length > 1 && (
                          <button
                            onClick={e => {
                              e.stopPropagation();
                              onDeleteCollection(col.id);
                            }}
                            className="p-1 hover:bg-white/10 rounded text-zinc-500 hover:text-red-400"
                            title="Delete Collection"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Collection Children (Folders & Root Requests) */}
                    {isColOpen && (
                      <div className="pl-4 pr-1 pb-1 space-y-0.5 border-t border-white/5 pt-1">
                        {/* Inline Folder Creation Form */}
                        {creatingFolderColId === col.id && (
                          <form
                            onSubmit={e => {
                              e.preventDefault();
                              if (newFolderName.trim()) {
                                onCreateFolder(col.id, newFolderName.trim());
                                setCreatingFolderColId(null);
                                setNewFolderName('');
                              }
                            }}
                            className="p-1.5 rounded-lg bg-[#161b26] border border-amber-500/40 flex items-center gap-1.5 my-1"
                          >
                            <FolderPlus className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                            <input
                              type="text"
                              placeholder="Folder name (e.g. Auth, Users)..."
                              value={newFolderName}
                              onChange={e => setNewFolderName(e.target.value)}
                              className="flex-1 bg-transparent text-xs text-white placeholder-zinc-500 focus:outline-none"
                              autoFocus
                            />
                            <button
                              type="submit"
                              disabled={!newFolderName.trim()}
                              className="px-2 py-0.5 rounded bg-amber-500 hover:bg-amber-600 disabled:opacity-40 text-black text-[10px] font-bold"
                            >
                              Add
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setCreatingFolderColId(null);
                                setNewFolderName('');
                              }}
                              className="px-1.5 py-0.5 text-[10px] text-zinc-400 hover:text-white"
                            >
                              ✕
                            </button>
                          </form>
                        )}

                        {/* Blank Collection State */}
                        {col.folders.length === 0 && col.requests.length === 0 && creatingFolderColId !== col.id && (
                          <div className="p-3 my-1 rounded-lg border border-dashed border-white/10 text-center bg-white/[0.02]">
                            <p className="text-[11px] text-zinc-400 mb-2">Collection is blank</p>
                            <div className="flex items-center justify-center gap-2">
                              <button
                                type="button"
                                onClick={e => {
                                  e.stopPropagation();
                                  onCreateRequest(col.id, null);
                                }}
                                className="px-2.5 py-1 rounded bg-orange-500/20 hover:bg-orange-500/30 text-orange-300 text-xs font-medium flex items-center gap-1 transition-colors"
                              >
                                <Plus className="w-3 h-3" />
                                <span>Add Request</span>
                              </button>
                              <button
                                type="button"
                                onClick={e => {
                                  e.stopPropagation();
                                  setCreatingFolderColId(col.id);
                                  setNewFolderName('');
                                }}
                                className="px-2.5 py-1 rounded bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 text-xs font-medium flex items-center gap-1 transition-colors"
                              >
                                <FolderPlus className="w-3 h-3" />
                                <span>New Folder</span>
                              </button>
                            </div>
                          </div>
                        )}

                        {/* Folders */}
                        {col.folders.map(fld => {
                          const isFldOpen = openFolders[fld.id];
                          return (
                            <div key={fld.id} className="space-y-0.5">
                              {/* Folder Header */}
                              <div
                                onClick={() => toggleFolder(fld.id)}
                                className="group flex items-center justify-between px-2 py-1 hover:bg-white/5 rounded cursor-pointer text-zinc-300"
                              >
                                <div className="flex items-center gap-1.5 truncate">
                                  {isFldOpen ? (
                                    <ChevronDown className="w-3 h-3 text-zinc-400 shrink-0" />
                                  ) : (
                                    <ChevronRight className="w-3 h-3 text-zinc-400 shrink-0" />
                                  )}
                                  {isFldOpen ? (
                                    <FolderOpen className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                                  ) : (
                                    <FolderIcon className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                                  )}
                                  <span className="truncate text-[11px] font-medium">{fld.name}</span>
                                </div>

                                {!isViewer && (
                                  <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button
                                      onClick={e => {
                                        e.stopPropagation();
                                        setOpenFolders(prev => ({ ...prev, [fld.id]: true }));
                                        setOpenCollections(prev => ({ ...prev, [col.id]: true }));
                                        onCreateRequest(col.id, fld.id);
                                      }}
                                      className="p-0.5 hover:bg-white/10 rounded text-zinc-400 hover:text-white"
                                      title="Add Request into Folder"
                                    >
                                      <Plus className="w-3 h-3" />
                                    </button>
                                    {onDeleteFolder && (
                                      <button
                                        onClick={e => {
                                          e.stopPropagation();
                                          onDeleteFolder(col.id, fld.id);
                                        }}
                                        className="p-0.5 hover:bg-white/10 rounded text-zinc-500 hover:text-red-400"
                                        title="Delete Folder"
                                      >
                                        <Trash2 className="w-3 h-3" />
                                      </button>
                                    )}
                                  </div>
                                )}
                              </div>

                              {/* Folder Requests */}
                              {isFldOpen && (
                                <div className="pl-5 space-y-0.5 border-l border-white/10 ml-2">
                                  {fld.requests.map(req => {
                                    const isSelected = activeRequestId === req.id;
                                    return (
                                      <div
                                        key={req.id}
                                        onClick={() => onSelectRequest(req)}
                                        className={`group flex items-center justify-between px-2 py-1 rounded cursor-pointer transition-colors ${
                                          isSelected
                                            ? 'bg-orange-500/20 text-orange-300 font-medium'
                                            : 'text-zinc-400 hover:bg-white/5 hover:text-white'
                                        }`}
                                      >
                                        <div className="flex items-center gap-1.5 truncate">
                                          <span
                                            className={`font-mono text-[9px] font-bold ${
                                              req.method === 'GET'
                                                ? 'text-emerald-400'
                                                : req.method === 'POST'
                                                ? 'text-amber-400'
                                                : req.method === 'PUT'
                                                ? 'text-blue-400'
                                                : 'text-red-400'
                                            }`}
                                          >
                                            {req.method}
                                          </span>
                                          <span className="truncate text-[11px]">{req.name}</span>
                                        </div>

                                        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                          <button
                                            onClick={e => {
                                              e.stopPropagation();
                                              onShareRequest?.(req);
                                            }}
                                            className="p-0.5 text-zinc-400 hover:text-orange-400"
                                            title="Share Request via Link"
                                          >
                                            <Share2 className="w-3 h-3" />
                                          </button>
                                          <button
                                            onClick={e => {
                                              e.stopPropagation();
                                              onExportRequestCode?.(req, col);
                                            }}
                                            className="p-0.5 text-zinc-400 hover:text-orange-400"
                                            title="Export Request as Code"
                                          >
                                            <Code2 className="w-3 h-3" />
                                          </button>
                                          {!isViewer && (
                                            <button
                                              onClick={e => {
                                                e.stopPropagation();
                                                onDeleteRequest(req.id, col.id);
                                              }}
                                              className="p-0.5 text-zinc-500 hover:text-red-400"
                                              title="Delete Request"
                                            >
                                              <Trash2 className="w-3 h-3" />
                                            </button>
                                          )}
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          );
                        })}

                        {/* Root Requests */}
                        {col.requests.map(req => {
                          const isSelected = activeRequestId === req.id;
                          return (
                            <div
                              key={req.id}
                              onClick={() => onSelectRequest(req)}
                              className={`group flex items-center justify-between px-2 py-1 rounded cursor-pointer transition-colors ${
                                isSelected
                                  ? 'bg-orange-500/20 text-orange-300 font-medium'
                                  : 'text-zinc-400 hover:bg-white/5 hover:text-white'
                              }`}
                            >
                              <div className="flex items-center gap-1.5 truncate">
                                <span
                                  className={`font-mono text-[9px] font-bold ${
                                    req.method === 'GET'
                                      ? 'text-emerald-400'
                                      : req.method === 'POST'
                                      ? 'text-amber-400'
                                      : req.method === 'PUT'
                                      ? 'text-blue-400'
                                      : 'text-red-400'
                                  }`}
                                >
                                  {req.method}
                                </span>
                                <span className="truncate text-[11px]">{req.name}</span>
                              </div>

                              <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                  onClick={e => {
                                    e.stopPropagation();
                                    onShareRequest?.(req);
                                  }}
                                  className="p-0.5 text-zinc-400 hover:text-orange-400"
                                  title="Share Request via Link"
                                >
                                  <Share2 className="w-3 h-3" />
                                </button>
                                <button
                                  onClick={e => {
                                    e.stopPropagation();
                                    onExportRequestCode?.(req, col);
                                  }}
                                  className="p-0.5 text-zinc-400 hover:text-orange-400"
                                  title="Export Request as Code"
                                >
                                  <Code2 className="w-3 h-3" />
                                </button>
                                {!isViewer && (
                                  <button
                                    onClick={e => {
                                      e.stopPropagation();
                                      onDeleteRequest(req.id, col.id);
                                    }}
                                    className="p-0.5 text-zinc-500 hover:text-red-400"
                                    title="Delete Request"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Tab 2: Recent Requests History (Last 20 API Executions) */}
      {activeTab === 'recent' && (
        <div className="flex-1 flex flex-col overflow-hidden text-xs">
          {/* Header Bar */}
          <div className="p-2.5 border-b border-white/10 space-y-2 shrink-0 bg-[#121520]/60">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <History className="w-3.5 h-3.5 text-amber-400" />
                <span className="font-semibold text-white text-xs">Recent Requests</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 font-mono">
                  {recentRequests.length}/20
                </span>
              </div>

              {recentRequests.length > 0 && onClearRecentRequests && (
                <button
                  onClick={onClearRecentRequests}
                  className="flex items-center gap-1 px-2 py-0.5 text-[10px] font-medium text-zinc-400 hover:text-rose-400 hover:bg-rose-500/10 rounded transition-colors"
                  title="Clear history"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>Clear</span>
                </button>
              )}
            </div>

            {/* Search and Method filters */}
            <div className="space-y-1.5">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Filter recent requests..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full h-8 bg-[#141824] border border-white/10 rounded-lg pl-7 pr-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-amber-500/50"
                />
              </div>

              <div className="flex items-center gap-1 pt-0.5 overflow-x-auto no-scrollbar">
                {['ALL', 'GET', 'POST', 'PUT', 'DELETE'].map(method => (
                  <button
                    key={method}
                    onClick={() => setRecentFilterMethod(method)}
                    className={`px-2 py-0.5 rounded text-[10px] font-mono font-medium transition-colors ${
                      recentFilterMethod === method
                        ? 'bg-amber-500 text-black font-bold'
                        : 'bg-white/5 text-zinc-400 hover:text-white hover:bg-white/10'
                    }`}
                  >
                    {method}
                  </button>
                ))}
                <span className="text-zinc-600 text-[10px]">|</span>
                <button
                  onClick={() => setRecentFilterStatus(recentFilterStatus === '2XX' ? 'ALL' : '2XX')}
                  className={`px-1.5 py-0.5 rounded text-[10px] font-medium transition-colors ${
                    recentFilterStatus === '2XX'
                      ? 'bg-emerald-500/30 text-emerald-300 border border-emerald-500/40'
                      : 'bg-white/5 text-zinc-400 hover:text-emerald-300'
                  }`}
                  title="Filter successful (2xx)"
                >
                  2xx
                </button>
                <button
                  onClick={() => setRecentFilterStatus(recentFilterStatus === 'ERRORS' ? 'ALL' : 'ERRORS')}
                  className={`px-1.5 py-0.5 rounded text-[10px] font-medium transition-colors ${
                    recentFilterStatus === 'ERRORS'
                      ? 'bg-rose-500/30 text-rose-300 border border-rose-500/40'
                      : 'bg-white/5 text-zinc-400 hover:text-rose-300'
                  }`}
                  title="Filter errors"
                >
                  Err
                </button>
              </div>
            </div>
          </div>

          {/* Recent List */}
          <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
            {filteredRecentRequests.length === 0 ? (
              <div className="py-12 px-4 text-center space-y-2">
                <div className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mx-auto text-zinc-500">
                  <History className="w-5 h-5" />
                </div>
                <p className="text-xs text-zinc-400 font-medium">No recent requests found</p>
                <p className="text-[11px] text-zinc-500 leading-relaxed max-w-[200px] mx-auto">
                  Execute any API request using the <strong className="text-orange-400">Send</strong> button to automatically record it here for quick replay.
                </p>
              </div>
            ) : (
              filteredRecentRequests.map(recent => {
                const isSelected = activeRequestId === recent.requestId;
                const isSuccess = recent.status && recent.status >= 200 && recent.status < 300;
                const isClientError = recent.status && recent.status >= 400 && recent.status < 500;
                const isServerError = recent.status && recent.status >= 500;

                const methodColor = 
                  recent.method === 'GET' ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' :
                  recent.method === 'POST' ? 'text-amber-400 bg-amber-500/10 border-amber-500/20' :
                  recent.method === 'PUT' ? 'text-blue-400 bg-blue-500/10 border-blue-500/20' :
                  recent.method === 'DELETE' ? 'text-rose-400 bg-rose-500/10 border-rose-500/20' :
                  'text-purple-400 bg-purple-500/10 border-purple-500/20';

                const statusColor = 
                  isSuccess ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' :
                  isClientError ? 'bg-amber-500/15 text-amber-300 border-amber-500/30' :
                  isServerError ? 'bg-rose-500/15 text-rose-300 border-rose-500/30' :
                  'bg-zinc-800 text-zinc-300 border-white/10';

                return (
                  <div
                    key={recent.id}
                    onClick={() => onSelectRecentRequest?.(recent)}
                    className={`group relative p-2.5 rounded-lg border cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-orange-500/10 border-orange-500/40 shadow-sm shadow-orange-500/10'
                        : 'bg-[#10131d] border-white/5 hover:border-white/20 hover:bg-white/5'
                    }`}
                  >
                    {/* Top Row: Method, Status, Duration */}
                    <div className="flex items-center justify-between gap-1 mb-1">
                      <div className="flex items-center gap-1.5">
                        <span className={`px-1.5 py-0.2 rounded border font-mono text-[9px] font-bold ${methodColor}`}>
                          {recent.method}
                        </span>

                        {recent.status !== undefined && (
                          <span className={`px-1.5 py-0.2 rounded border text-[9px] font-mono font-semibold flex items-center gap-0.5 ${statusColor}`}>
                            {isSuccess && <CheckCircle2 className="w-2.5 h-2.5 text-emerald-400" />}
                            {(isClientError || isServerError) && <AlertCircle className="w-2.5 h-2.5 text-rose-400" />}
                            <span>{recent.status}</span>
                            {recent.statusText && <span className="opacity-80 truncate max-w-[60px]">{recent.statusText}</span>}
                          </span>
                        )}
                      </div>

                      {recent.time !== undefined && (
                        <span className="text-[10px] text-zinc-400 font-mono">
                          {recent.time}ms
                        </span>
                      )}
                    </div>

                    {/* Middle Row: Name & URL preview */}
                    <div className="space-y-0.5 pr-14">
                      <div className="font-medium text-white truncate text-[11px] group-hover:text-amber-300 transition-colors">
                        {recent.name}
                      </div>
                      <div className="text-[10px] text-zinc-400 font-mono truncate">
                        {recent.url}
                      </div>
                    </div>

                    {/* Bottom Row: Timestamp */}
                    <div className="flex items-center justify-between text-[10px] text-zinc-500 mt-1.5 pt-1 border-t border-white/5">
                      <div className="flex items-center gap-1 text-[10px] text-zinc-400">
                        <Clock className="w-2.5 h-2.5 text-zinc-500" />
                        <span>{formatRelativeTime(recent.executedAt)}</span>
                      </div>
                      <span className="text-[9px] text-zinc-600 opacity-0 group-hover:opacity-100 transition-opacity">
                        Click to load test
                      </span>
                    </div>

                    {/* Hover Floating Actions */}
                    <div className="absolute right-2 top-2 hidden group-hover:flex items-center gap-1 bg-[#161a26] border border-white/10 rounded-lg p-0.5 shadow-lg">
                      {onReplayRecentRequest && (
                        <button
                          onClick={e => {
                            e.stopPropagation();
                            onReplayRecentRequest(recent);
                          }}
                          className="p-1 hover:bg-emerald-500/20 text-emerald-400 rounded transition-colors"
                          title="Re-run request"
                        >
                          <Play className="w-3 h-3 fill-emerald-400" />
                        </button>
                      )}
                      <button
                        onClick={e => {
                          e.stopPropagation();
                          onSelectRecentRequest?.(recent);
                        }}
                        className="p-1 hover:bg-orange-500/20 text-orange-400 rounded transition-colors"
                        title="Jump to request editor"
                      >
                        <ExternalLink className="w-3 h-3" />
                      </button>
                      {onRemoveRecentRequest && (
                        <button
                          onClick={e => {
                            e.stopPropagation();
                            onRemoveRecentRequest(recent.id);
                          }}
                          className="p-1 hover:bg-rose-500/20 text-rose-400 rounded transition-colors"
                          title="Remove from history"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Tab 3: Environments Quick List */}
      {activeTab === 'environments' && (
        <div className="flex-1 flex flex-col p-3 space-y-3 overflow-y-auto text-xs">
          <div className="flex items-center justify-between text-zinc-400 font-semibold uppercase text-[11px]">
            <span>Environments</span>
            <button
              onClick={onOpenEnvManager}
              className="text-orange-400 hover:text-orange-300 text-[11px]"
            >
              Configure
            </button>
          </div>

          <div className="space-y-1.5">
            {environments.map(env => (
              <div
                key={env.id}
                onClick={() => onSetActiveEnv(env.id)}
                className={`p-2.5 rounded-lg border cursor-pointer flex items-center justify-between transition-colors ${
                  activeEnvId === env.id
                    ? 'border-orange-500/40 bg-orange-500/10 text-white'
                    : 'border-white/5 bg-[#121520] text-zinc-400 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-2 truncate">
                  {env.isGlobal ? <Globe className="w-3.5 h-3.5 text-blue-400" /> : <Layers className="w-3.5 h-3.5 text-orange-400" />}
                  <span className="font-medium truncate">{env.name}</span>
                </div>
                {activeEnvId === env.id && (
                  <span className="px-1.5 py-0.2 bg-emerald-500/20 text-emerald-400 text-[10px] rounded font-bold">
                    Active
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 4: Live Collaborative Activity Feed */}
      {activeTab === 'activity' && (
        <div className="flex-1 flex flex-col p-3 space-y-3 overflow-y-auto text-xs">
          <div className="flex items-center justify-between text-zinc-400 font-semibold uppercase text-[11px]">
            <span>Team Activity Stream</span>
            <span className="text-[10px] text-emerald-400 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              Live Sync
            </span>
          </div>

          <div className="space-y-2">
            {activityLogs.map(log => (
              <div key={log.id} className="p-2.5 rounded-lg bg-[#121520] border border-white/5 space-y-1">
                <div className="flex items-center gap-2">
                  <img
                    src={log.user.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80'}
                    alt={log.user.name}
                    className="w-5 h-5 rounded-full object-cover"
                  />
                  <span className="font-semibold text-white text-[11px]">{log.user.name}</span>
                </div>
                <p className="text-[11px] text-zinc-300">
                  {log.action.replace('_', ' ')}: <strong className="text-orange-300">{log.targetName}</strong>
                </p>
                {log.details && <p className="text-[10px] text-zinc-500">{log.details}</p>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Postman-Grade Protocols & Engines Footer */}
      <div className="p-2.5 border-t border-white/10 bg-[#0c0e16] shrink-0">
        <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-1.5 px-1">
          Postman Suite Tools
        </div>
        <div className="grid grid-cols-2 gap-1.5">
          {onOpenWebSocketTab && (
            <button
              onClick={onOpenWebSocketTab}
              className="flex items-center gap-1.5 px-2 py-1.5 rounded bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white border border-white/5 transition-colors text-[11px] font-medium"
              title="WebSocket Real-Time Tester"
            >
              <Radio className="w-3 h-3 text-emerald-400" />
              <span className="truncate">WebSocket</span>
            </button>
          )}

          {onOpenMockServerTab && (
            <button
              onClick={onOpenMockServerTab}
              className="flex items-center gap-1.5 px-2 py-1.5 rounded bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white border border-white/5 transition-colors text-[11px] font-medium"
              title="Mock Server Engine"
            >
              <Server className="w-3 h-3 text-amber-400" />
              <span className="truncate">Mock Server</span>
            </button>
          )}

          {onOpenGraphQLTab && (
            <button
              onClick={onOpenGraphQLTab}
              className="flex items-center gap-1.5 px-2 py-1.5 rounded bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white border border-white/5 transition-colors text-[11px] font-medium"
              title="GraphQL Schema & Queries"
            >
              <Code2 className="w-3 h-3 text-pink-400" />
              <span className="truncate">GraphQL</span>
            </button>
          )}

          {onOpenMonitorTab && (
            <button
              onClick={onOpenMonitorTab}
              className="flex items-center gap-1.5 px-2 py-1.5 rounded bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white border border-white/5 transition-colors text-[11px] font-medium"
              title="Automated Collection Monitors"
            >
              <Activity className="w-3 h-3 text-teal-400" />
              <span className="truncate">Monitors</span>
            </button>
          )}
        </div>
      </div>
    </aside>
  );
};
