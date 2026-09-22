import React, { useState, useRef, useEffect } from 'react';
import { 
  Workspace, 
  Environment, 
  User, 
  Role, 
  ActivePresence, 
  Variable,
  Collection 
} from '../types';
import { ScopedVariable, VariableScope } from '../services/variableService';
import { QuickVariablePopover } from './Environments/QuickVariablePopover';
import { offlineSyncService, SyncState } from '../services/offlineSyncService';
import { isDesktopTool } from '../services/platformService';
import { isSaaSAdmin } from '../services/saasService';
import { APP_VERSION_DISPLAY } from '../config';
import { 
  Layers, 
  Users, 
  User as UserIcon, 
  Globe, 
  Eye, 
  Settings, 
  Plus, 
  Share2, 
  ShieldCheck, 
  ShieldAlert, 
  ChevronDown, 
  FileCode, 
  Upload, 
  Download,
  Sparkles,
  BookOpen,
  Key,
  Server,
  Database,
  Zap,
  LogIn,
  LogOut,
  Home,
  Wifi,
  WifiOff,
  RefreshCw,
  Smartphone,
  CheckCircle2,
  TrendingUp,
  PanelLeft,
  PanelLeftClose,
  Monitor,
  Send,
  HelpCircle
} from 'lucide-react';

interface NavbarProps {
  currentWorkspace: Workspace;
  allWorkspaces: Workspace[];
  currentUser: User | null;
  currentRole: Role;
  isGuest: boolean;
  environments: Environment[];
  activeEnvId: string;
  activeVariables: Variable[];
  scopedVariables: ScopedVariable[];
  currentCollection?: Collection;
  presence: ActivePresence[];
  isSidebarOpen?: boolean;
  onToggleSidebar?: () => void;
  onSelectWorkspace: (workspaceId: string) => void;
  onOpenCreateWorkspaceModal: () => void;
  onOpenShareModal: () => void;
  onOpenEnvManager: () => void;
  onOpenCreateVariableModal: () => void;
  onQuickAddVariable: (target: { scope: VariableScope; targetId: string; variable: Variable }) => void;
  onQuickUpdateVariable: (key: string, value: string) => void;
  onSetActiveEnv: (envId: string) => void;
  onOpenArchitectureTab: () => void;
  onExportAllCollections: () => void;
  onImportCollection: () => void;
  onOpenLandingPage: () => void;
  onOpenAuthModal: () => void;
  onOpenRegister?: () => void;
  onOpenDownloadModal?: () => void;
  onOpenDocsTab?: () => void;
  onOpenHelpModal?: () => void;
  onOpenSaaSUsers?: () => void;
  onOpenSaaSReports?: () => void;
  isSaaSAdmin?: boolean;
  isSaaSUser?: boolean;
  guestShortCode?: string;
  onResetGuestSession?: () => void;
  onLogout: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentWorkspace,
  allWorkspaces,
  currentUser,
  currentRole,
  isGuest,
  environments,
  activeEnvId,
  activeVariables,
  scopedVariables,
  currentCollection,
  presence,
  isSidebarOpen,
  onToggleSidebar,
  onSelectWorkspace,
  onOpenCreateWorkspaceModal,
  onOpenShareModal,
  onOpenEnvManager,
  onOpenCreateVariableModal,
  onQuickAddVariable,
  onQuickUpdateVariable,
  onSetActiveEnv,
  onOpenArchitectureTab,
  onExportAllCollections,
  onImportCollection,
  onOpenLandingPage,
  onOpenAuthModal,
  onOpenRegister,
  onOpenDownloadModal,
  onOpenDocsTab,
  onOpenHelpModal,
  onOpenSaaSUsers,
  onOpenSaaSReports,
  isSaaSAdmin: isSaaSAdminProp,
  isSaaSUser: isSaaSUserProp,
  guestShortCode,
  onResetGuestSession,
  onLogout,
}) => {
  const userIsSaaSAdmin = isSaaSAdminProp !== undefined ? isSaaSAdminProp : isSaaSAdmin(currentUser, isGuest);
  const userIsSaaSUser = isSaaSUserProp !== undefined ? isSaaSUserProp : (!isGuest && !!currentUser && (currentUser.isSaaSUser !== false));
  const [showWorkspaceDropdown, setShowWorkspaceDropdown] = useState(false);
  const [showEnvDropdown, setShowEnvDropdown] = useState(false);
  const [showQuickVars, setShowQuickVars] = useState(false);
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [syncState, setSyncState] = useState<SyncState>(() => offlineSyncService.getState());
  const [isManualSyncing, setIsManualSyncing] = useState(false);

  const workspaceRef = useRef<HTMLDivElement>(null);
  const envRef = useRef<HTMLDivElement>(null);
  const userRef = useRef<HTMLDivElement>(null);

  // Subscribe to offlineSyncService
  useEffect(() => {
    const unsubscribe = offlineSyncService.subscribe((state) => {
      setSyncState(state);
    });
    return () => unsubscribe();
  }, []);

  const handleInstallClick = async () => {
    const installed = await offlineSyncService.promptInstall();
    if (installed) {
      alert('CloudPost is installed successfully! You can now launch it directly from your desktop or applications menu and use it completely offline.');
    }
  };

  const handleManualSync = async () => {
    setIsManualSyncing(true);
    await offlineSyncService.syncNow();
    setTimeout(() => setIsManualSyncing(false), 500);
  };

  // Close dropdowns on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (workspaceRef.current && !workspaceRef.current.contains(e.target as Node)) {
        setShowWorkspaceDropdown(false);
      }
      if (envRef.current && !envRef.current.contains(e.target as Node)) {
        setShowEnvDropdown(false);
      }
      if (userRef.current && !userRef.current.contains(e.target as Node)) {
        setShowUserDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const activeEnv = environments.find(e => e.id === activeEnvId && !e.isGlobal);

  return (
    <header className="relative z-50 min-h-[56px] py-1.5 bg-[#121520] border-b border-white/10 px-2 sm:px-3 flex items-center select-none shrink-0 font-sans gap-1.5 sm:gap-2">
      {/* 1. Sidebar Toggle Button */}
      {onToggleSidebar && (
        <button
          onClick={onToggleSidebar}
          className="h-8 w-8 inline-flex items-center justify-center p-0 text-zinc-400 hover:text-white rounded-lg hover:bg-white/5 border border-white/10 transition-colors shrink-0 whitespace-nowrap"
          title={isSidebarOpen ? "Hide Sidebar (Ctrl+\\)" : "Show Sidebar (Ctrl+\\)"}
        >
          {isSidebarOpen ? (
            <PanelLeftClose className="w-4 h-4 text-orange-400" />
          ) : (
            <PanelLeft className="w-4 h-4 text-zinc-300" />
          )}
        </button>
      )}

      {/* 2. Brand Logo - Click to return to Home page */}
      <button
        onClick={onOpenLandingPage}
        className="h-8 inline-flex items-center gap-1.5 hover:opacity-80 transition-opacity text-left group shrink-0 whitespace-nowrap"
        title="Home"
      >
        <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-orange-500 to-amber-600 flex items-center justify-center shadow-md shadow-orange-500/20 text-white font-black text-sm shrink-0">
          <Send className="w-4 h-4 text-white -rotate-12" />
        </div>
        <div className="hidden md:flex flex-col justify-center">
          <div className="flex items-center gap-1 leading-none">
            <span className="font-bold text-white text-xs sm:text-sm tracking-tight group-hover:text-orange-300 transition-colors">CloudPost</span>
            <span className="text-[9px] px-1 py-0.2 rounded-full bg-orange-500/20 text-orange-400 border border-orange-500/30 font-mono font-semibold">{APP_VERSION_DISPLAY}</span>
          </div>
          <span className="text-[7.5px] text-orange-400/80 font-mono block leading-tight mt-0.5">COLLABORATIVE API</span>
        </div>
      </button>

      {/* 3. Workspace Dropdown Switcher */}
      <div className="relative shrink-0" ref={workspaceRef}>
        <button
          onClick={() => setShowWorkspaceDropdown(!showWorkspaceDropdown)}
          className="h-8 inline-flex items-center gap-1.5 px-2 sm:px-2.5 bg-[#181d2c] hover:bg-[#1f2537] border border-white/10 rounded-lg text-xs text-white transition-colors shrink-0 whitespace-nowrap"
        >
          {currentWorkspace.type === 'TEAM' ? (
            <Users className="w-3.5 h-3.5 text-orange-400 shrink-0" />
          ) : (
            <UserIcon className="w-3.5 h-3.5 text-blue-400 shrink-0" />
          )}
          <span className="font-semibold max-w-[80px] sm:max-w-[110px] xl:max-w-[130px] truncate whitespace-nowrap">{currentWorkspace.name}</span>
          <ChevronDown className="w-3 h-3 text-zinc-400 shrink-0" />
        </button>

        {showWorkspaceDropdown && (
          <div className="absolute left-0 top-full mt-1.5 w-64 bg-[#141824] border border-white/10 rounded-xl shadow-2xl z-50 p-2 space-y-1 text-xs">
            <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-zinc-500">
              Workspaces ({allWorkspaces.length})
            </div>
            <div className="max-h-60 overflow-y-auto space-y-1">
              {allWorkspaces.map(ws => (
                <div
                  key={ws.id}
                  onClick={() => {
                    onSelectWorkspace(ws.id);
                    setShowWorkspaceDropdown(false);
                  }}
                  className={`flex items-center justify-between p-2 rounded-lg cursor-pointer transition-colors ${
                    ws.id === currentWorkspace.id
                      ? 'bg-orange-500/20 text-white font-semibold'
                      : 'text-zinc-300 hover:bg-white/5 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    {ws.type === 'TEAM' ? (
                      <Users className="w-3.5 h-3.5 text-orange-400 shrink-0" />
                    ) : (
                      <UserIcon className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                    )}
                    <span className="truncate">{ws.name}</span>
                  </div>
                  <span className="text-[10px] text-zinc-500 font-mono">
                    {ws.members.length} members
                  </span>
                </div>
              ))}
            </div>

            <div className="pt-2 border-t border-white/5">
              <button
                onClick={() => {
                  setShowWorkspaceDropdown(false);
                  onOpenCreateWorkspaceModal();
                }}
                className="w-full flex items-center gap-2 p-2 rounded-lg text-orange-400 hover:text-orange-300 hover:bg-white/5 transition-colors font-medium text-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Create Workspace...</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 4. Guest Mode Pill (Keep only Guest Mode) */}
      {isGuest ? (
        <div className="h-8 inline-flex items-center gap-1.5 px-2.5 sm:px-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs shrink-0 whitespace-nowrap" title="Guest Mode">
          <Zap className="w-3.5 h-3.5 text-amber-400 shrink-0" />
          <span className="text-[11px] font-medium whitespace-nowrap">Guest Mode</span>
        </div>
      ) : (
        <div className="h-8 inline-flex items-center gap-1.5 px-2 sm:px-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs shrink-0 whitespace-nowrap">
          <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0"></span>
          <span className="text-[11px] font-medium hidden sm:inline whitespace-nowrap">Synced</span>
        </div>
      )}

      {/* 5. Network & Offline Sync State Widget */}
      <div className="h-8 inline-flex items-center justify-between gap-1.5 bg-[#181d2c] border border-white/10 rounded-lg px-2 text-xs shrink-0 whitespace-nowrap min-w-[130px]">
        {syncState.isOnline ? (
          <div 
            className="h-full inline-flex items-center gap-1.5 px-0.5 text-emerald-400 font-mono text-[11px] cursor-pointer hover:bg-white/5 rounded transition-colors shrink-0 whitespace-nowrap flex-1"
            onClick={handleManualSync}
            title={`Network: Online. ${syncState.pendingCount > 0 ? `${syncState.pendingCount} changes waiting to sync.` : 'All changes synced to MySQL database.'} Click to sync now.`}
          >
            <span className="w-3.5 h-3.5 flex items-center justify-center shrink-0">
              {syncState.status === 'syncing' || isManualSyncing ? (
                <RefreshCw className="w-3.5 h-3.5 text-amber-400 animate-spin shrink-0" />
              ) : (
                <Wifi className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              )}
            </span>
            <span className={`whitespace-nowrap ${syncState.status === 'syncing' || isManualSyncing ? 'text-amber-300 font-semibold' : 'text-emerald-300'}`}>
              {syncState.status === 'syncing' || isManualSyncing
                ? 'Syncing...'
                : syncState.pendingCount > 0
                ? `Sync (${syncState.pendingCount})`
                : 'Sync'}
            </span>
          </div>
        ) : (
          <div 
            className="h-full inline-flex items-center justify-center gap-1.5 px-1 text-amber-400 font-mono text-[11px] bg-amber-500/10 rounded shrink-0 whitespace-nowrap flex-1"
            title="You are currently offline. All workspaces, collections, environments, and tests work completely offline and will auto-sync when internet reconnects."
          >
            <WifiOff className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span className="text-amber-300 font-semibold whitespace-nowrap">
              Offline {syncState.pendingCount > 0 ? `(${syncState.pendingCount})` : ''}
            </span>
          </div>
        )}

        {/* Manual Sync Trigger Button */}
        {syncState.isOnline && (
          <button
            onClick={handleManualSync}
            disabled={syncState.status === 'syncing' || isManualSyncing}
            className="h-6 w-6 inline-flex items-center justify-center p-0 text-zinc-400 hover:text-white hover:bg-white/10 rounded transition-colors disabled:opacity-50 shrink-0 ml-auto"
            title="Force Sync All Local Data to Remote MySQL Database"
          >
            <RefreshCw className={`w-3 h-3 ${syncState.status === 'syncing' || isManualSyncing ? 'animate-spin text-amber-400' : ''}`} />
          </button>
        )}
      </div>

      {/* 6. Import Button */}
      <button
        onClick={onImportCollection}
        className="h-8 inline-flex items-center gap-1.5 px-2 sm:px-2.5 text-xs text-zinc-300 hover:text-white rounded-lg hover:bg-white/10 bg-white/5 border border-white/10 transition-colors shrink-0 whitespace-nowrap"
        title="Import Postman Collection, Environment or CloudPost JSON (Ctrl+I)"
      >
        <Upload className="w-3.5 h-3.5 text-orange-400 shrink-0" />
        <span className="font-medium whitespace-nowrap hidden sm:inline">Import</span>
      </button>

      {/* 7. Export Button */}
      <button
        onClick={onExportAllCollections}
        className="h-8 inline-flex items-center gap-1.5 px-2 sm:px-2.5 text-xs text-zinc-300 hover:text-white rounded-lg hover:bg-white/10 bg-white/5 border border-white/10 transition-colors shrink-0 whitespace-nowrap"
        title="Export Postman v2.1, Environments, or Full Backup (Ctrl+E)"
      >
        <Download className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
        <span className="font-medium whitespace-nowrap hidden sm:inline">Export</span>
      </button>

      {/* 8. + Var Button */}
      <button
        onClick={onOpenCreateVariableModal}
        className="h-8 inline-flex items-center gap-1.5 px-2 sm:px-2.5 bg-[#181d2c] hover:bg-[#1f2537] border border-white/10 text-orange-300 hover:text-orange-200 rounded-lg text-xs font-medium transition-colors shrink-0 whitespace-nowrap"
        title="Create a new variable (Environment, Collection, or Global)"
      >
        <Key className="w-3.5 h-3.5 text-orange-400 shrink-0" />
        <span className="whitespace-nowrap font-semibold">+ Var</span>
      </button>

      {/* 9. Environment Selector with Quick Peek */}
      <div className="relative h-8 inline-flex items-center gap-1 bg-[#181d2c] border border-white/10 rounded-lg px-1 text-xs shrink-0 whitespace-nowrap" ref={envRef}>
        <button
          onClick={() => setShowEnvDropdown(!showEnvDropdown)}
          className="h-full inline-flex items-center gap-1.5 px-1.5 sm:px-2 text-white hover:text-orange-300 transition-colors shrink-0 whitespace-nowrap"
        >
          <Globe className="w-3.5 h-3.5 text-orange-400 shrink-0" />
          <span className="font-medium max-w-[75px] sm:max-w-[105px] xl:max-w-[120px] truncate whitespace-nowrap">
            {activeEnv ? activeEnv.name : 'No Environment'}
          </span>
          <ChevronDown className="w-3 h-3 text-zinc-400 shrink-0" />
        </button>

        {showEnvDropdown && (
          <div className="absolute right-0 top-full mt-1.5 w-60 bg-[#141824] border border-white/10 rounded-xl shadow-2xl z-50 p-2 space-y-1 text-xs">
            <div className="px-2 py-1 text-[11px] font-semibold uppercase text-zinc-500">
              Environments
            </div>
            <div
              onClick={() => {
                onSetActiveEnv('no_env');
                setShowEnvDropdown(false);
              }}
              className={`p-2 rounded-lg cursor-pointer ${
                activeEnvId === 'no_env' || !activeEnvId
                  ? 'bg-orange-500/20 text-white font-semibold'
                  : 'text-zinc-300 hover:bg-white/5'
              }`}
            >
              No Environment (Globals only)
            </div>
            {environments.filter(e => !e.isGlobal).map(env => (
              <div
                key={env.id}
                onClick={() => {
                  onSetActiveEnv(env.id);
                  setShowEnvDropdown(false);
                }}
                className={`p-2 rounded-lg cursor-pointer flex items-center justify-between ${
                  activeEnvId === env.id
                    ? 'bg-orange-500/20 text-white font-semibold'
                    : 'text-zinc-300 hover:bg-white/5'
                }`}
              >
                <span className="truncate">{env.name}</span>
                <span className="text-[10px] text-zinc-500">{env.variables.length} vars</span>
              </div>
            ))}
            <div className="pt-2 border-t border-white/5">
              <button
                onClick={() => {
                  setShowEnvDropdown(false);
                  onOpenEnvManager();
                }}
                className="w-full text-left p-1.5 text-orange-400 hover:text-orange-300 hover:bg-white/5 rounded text-xs font-medium"
              >
                Manage Environments...
              </button>
            </div>
          </div>
        )}

        {/* Quick peek eye icon */}
        <div className="relative shrink-0">
          <button
            onClick={() => setShowQuickVars(!showQuickVars)}
            className={`h-6 w-6 inline-flex items-center justify-center p-0 rounded transition-colors shrink-0 ${
              showQuickVars ? 'bg-orange-500/20 text-orange-400' : 'hover:bg-white/10 text-zinc-400 hover:text-white'
            }`}
            title="Quick View & Add Variables"
          >
            <Eye className="w-3.5 h-3.5" />
          </button>
          {showQuickVars && (
            <QuickVariablePopover
              variables={scopedVariables}
              environments={environments}
              activeEnvId={activeEnvId}
              currentCollection={currentCollection}
              onOpenManager={() => {
                setShowQuickVars(false);
                onOpenEnvManager();
              }}
              onQuickAddVariable={onQuickAddVariable}
              onQuickUpdateVariable={onQuickUpdateVariable}
              onClose={() => setShowQuickVars(false)}
            />
          )}
        </div>
      </div>

      {/* 10. Download Desktop App Button */}
      {!isDesktopTool() && onOpenDownloadModal && (
        <button
          onClick={onOpenDownloadModal}
          className="h-8 inline-flex items-center gap-1.5 px-2 sm:px-2.5 bg-gradient-to-r from-orange-500/15 to-amber-500/15 hover:from-orange-500/25 hover:to-amber-500/25 border border-orange-500/35 text-orange-300 hover:text-white rounded-lg text-xs font-semibold transition-all shadow-sm cursor-pointer shrink-0 whitespace-nowrap"
          title="Download CloudPost Desktop App (Windows, macOS, Linux)"
        >
          <Download className="w-3.5 h-3.5 text-orange-400 shrink-0" />
          <span className="whitespace-nowrap hidden sm:inline">Download</span>
        </button>
      )}

      {/* 11. Docs & Manual Button (Exclusive to SaaS Users) */}
      {userIsSaaSUser && onOpenDocsTab && (
        <button
          onClick={onOpenDocsTab}
          className="h-8 inline-flex items-center gap-1.5 px-2 sm:px-2.5 bg-zinc-800/80 hover:bg-zinc-700/80 border border-white/10 text-zinc-300 hover:text-white rounded-lg text-xs font-semibold transition-all shadow-sm cursor-pointer shrink-0 whitespace-nowrap"
          title="Open Documentation, User Manuals & Architecture Guides"
        >
          <BookOpen className="w-3.5 h-3.5 text-orange-400 shrink-0" />
          <span className="whitespace-nowrap hidden lg:inline">Docs & Manual</span>
          <span className="whitespace-nowrap hidden sm:inline lg:hidden">Docs</span>
        </button>
      )}

      {/* ? Option (User Guide on how to use this tool, no architecture/database/technology internals) */}
      {onOpenHelpModal && (
        <button
          onClick={onOpenHelpModal}
          id="nav-help-guide-btn"
          className="h-8 w-8 inline-flex items-center justify-center bg-[#141824] hover:bg-white/10 border border-white/10 text-orange-400 hover:text-white rounded-lg text-xs font-bold transition-all shadow-sm cursor-pointer shrink-0"
          title="How to use this tool"
          aria-label="User Guide"
        >
          <HelpCircle className="w-4 h-4 text-orange-400 shrink-0" />
        </button>
      )}

      {/* 12. Invite Collaborators Button */}
      <button
        onClick={onOpenShareModal}
        className="h-8 inline-flex items-center gap-1.5 px-2 sm:px-2.5 bg-orange-500 hover:bg-orange-600 font-semibold text-white rounded-lg text-xs transition-colors shadow-sm cursor-pointer shrink-0 whitespace-nowrap"
        title="Invite Team Members to Workspace"
      >
        <Share2 className="w-3.5 h-3.5 shrink-0" />
        <span className="whitespace-nowrap hidden sm:inline">Invite</span>
      </button>

      {/* 13. Guest Session Code Badge (if guest) */}
      {isGuest && (
        <div 
          className="h-8 inline-flex items-center gap-1 px-2 sm:px-2.5 bg-amber-500/10 hover:bg-amber-500/15 border border-amber-500/20 text-amber-300 rounded-lg text-[11px] font-mono transition-colors cursor-pointer shrink-0 whitespace-nowrap"
          title="Isolated Guest Session: Click to start a fresh clean guest session."
          onClick={onResetGuestSession}
        >
          <ShieldCheck className="w-3.5 h-3.5 text-amber-400 shrink-0" />
          <span className="whitespace-nowrap">Guest #{guestShortCode || 'LOCAL'}</span>
        </div>
      )}

      {/* 14 & 15. Sign In & Register (Always Anchored on Right, Never Clipped) */}
      <div className="relative shrink-0 flex items-center gap-1.5 sm:gap-2 ml-auto" ref={userRef} id="navbar-auth-actions">
        {isGuest ? (
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <button
              onClick={onOpenAuthModal}
              id="nav-signin-btn"
              className="h-8 inline-flex items-center gap-1.5 px-2.5 sm:px-3 bg-white/10 hover:bg-white/15 text-zinc-100 hover:text-white rounded-lg text-xs font-semibold transition-all border border-white/15 shrink-0 whitespace-nowrap cursor-pointer shadow-sm hover:shadow"
              title="Sign in with your CloudPost account"
            >
              <LogIn className="w-3.5 h-3.5 text-orange-400 shrink-0" />
              <span className="whitespace-nowrap font-medium">Sign In</span>
            </button>
            {!isDesktopTool() && (
              <button
                onClick={() => onOpenRegister ? onOpenRegister() : onOpenAuthModal()}
                id="nav-register-btn"
                className="h-8 inline-flex items-center gap-1.5 px-2.5 sm:px-3.5 bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white rounded-lg text-xs font-bold transition-all shadow-md shadow-orange-500/25 hover:shadow-orange-500/40 shrink-0 whitespace-nowrap cursor-pointer"
                title="Create a CloudPost account"
              >
                <Sparkles className="w-3.5 h-3.5 shrink-0" />
                <span className="whitespace-nowrap">Register</span>
              </button>
            )}
          </div>
        ) : (
          <button
            onClick={() => setShowUserDropdown(!showUserDropdown)}
            className="h-8 inline-flex items-center gap-1.5 px-2 bg-[#181d2c] hover:bg-[#1f2537] border border-white/10 rounded-lg text-xs text-white transition-colors shrink-0 whitespace-nowrap"
          >
            <img
              src={currentUser?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80'}
              alt={currentUser?.name || 'User'}
              className="w-5 h-5 rounded-full object-cover border border-white/20 shrink-0"
            />
            <span className="font-semibold max-w-[90px] truncate hidden md:inline whitespace-nowrap">
              {currentUser?.name || 'User'}
            </span>
            <ChevronDown className="w-3 h-3 text-zinc-400 shrink-0" />
          </button>
        )}

          {showUserDropdown && !isGuest && (
            <div className="absolute right-0 top-full mt-1.5 w-64 bg-[#141824] border border-white/10 rounded-xl shadow-2xl z-50 p-2 space-y-1 text-xs">
              <div className="p-2 border-b border-white/10">
                <div className="font-bold text-white truncate">{currentUser?.name}</div>
                <div className="text-[11px] text-zinc-400 truncate">{currentUser?.email}</div>
                <div className="mt-1 inline-block px-2 py-0.5 rounded bg-orange-500/20 text-orange-300 font-mono text-[10px]">
                  Role: {currentRole}
                </div>
              </div>

              {/* SaaS User features strictly gated to Web (PHP & React Web), excluded in Desktop Tools */}
              {!isDesktopTool() && onOpenSaaSUsers && (
                <button
                  onClick={() => {
                    setShowUserDropdown(false);
                    onOpenSaaSUsers();
                  }}
                  className="w-full text-left p-2 rounded-lg text-zinc-200 hover:text-white hover:bg-white/5 flex items-center gap-2"
                >
                  <Users className="w-3.5 h-3.5 text-orange-400" />
                  <span>SaaS Customer Hub & Costs</span>
                </button>
              )}

              {!isDesktopTool() && onOpenSaaSReports && (
                <button
                  onClick={() => {
                    setShowUserDropdown(false);
                    onOpenSaaSReports();
                  }}
                  className="w-full text-left p-2 rounded-lg text-zinc-200 hover:text-white hover:bg-white/5 flex items-center gap-2"
                >
                  <TrendingUp className="w-3.5 h-3.5 text-purple-400" />
                  <span>SaaS Financial Reports</span>
                </button>
              )}

              <button
                onClick={() => {
                  setShowUserDropdown(false);
                  onOpenLandingPage();
                }}
                className="w-full text-left p-2 rounded-lg text-zinc-300 hover:text-white hover:bg-white/5 flex items-center gap-2"
              >
                <Home className="w-3.5 h-3.5 text-zinc-400" />
                <span>Home</span>
              </button>

              <button
                onClick={() => {
                  setShowUserDropdown(false);
                  onLogout();
                }}
                className="w-full text-left p-2 rounded-lg text-rose-400 hover:bg-rose-500/10 flex items-center gap-2 border-t border-white/5 mt-1"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Log Out</span>
              </button>
            </div>
          )}
        </div>
    </header>
  );
};
