import React, { useState, useRef, useEffect } from 'react';
import { TabItem, HttpMethod, ApiResponse } from '../types';
import { 
  Plus, 
  X, 
  Layers, 
  FileCode, 
  Play, 
  Sparkles, 
  Users, 
  FileText, 
  UserPlus, 
  TrendingUp, 
  Radio, 
  Server, 
  Code2, 
  Activity,
  PanelLeft,
  PanelLeftClose,
  Columns,
  Rows,
  ChevronDown,
  BookOpen,
  GitCompare,
  HelpCircle,
  Loader2
} from 'lucide-react';

interface TabsBarProps {
  tabs: TabItem[];
  activeTabId: string;
  responsesMap?: Record<string, ApiResponse>;
  executingRequestIds?: string[];
  onSelectTab: (tabId: string) => void;
  onCloseTab: (tabId: string) => void;
  onNewRequestTab: () => void;
  onOpenArchitectureTab: () => void;
  onOpenRunnerTab?: () => void;
  onOpenSaaSUsersTab?: () => void;
  onOpenSaaSReportsTab?: () => void;
  onOpenWebSocketTab?: () => void;
  onOpenMockServerTab?: () => void;
  onOpenGraphQLTab?: () => void;
  onOpenMonitorTab?: () => void;
  onOpenSSETab?: () => void;
  onOpenGRPCTab?: () => void;
  onOpenDocsTab?: () => void;
  onOpenHelpModal?: () => void;
  onOpenDiffTab?: () => void;
  isSidebarOpen?: boolean;
  onToggleSidebar?: () => void;
  layoutMode?: 'columns' | 'rows';
  onToggleLayout?: () => void;
  isSaaSAdmin?: boolean;
  isSaaSUser?: boolean;
}

const METHOD_COLORS: Record<HttpMethod, string> = {
  GET: 'text-emerald-400',
  POST: 'text-amber-400',
  PUT: 'text-blue-400',
  DELETE: 'text-red-400',
  PATCH: 'text-purple-400',
  OPTIONS: 'text-pink-400',
  HEAD: 'text-teal-400',
};

const getStatusBadgeStyle = (code: number) => {
  if (code >= 200 && code < 300) {
    return {
      container: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
      dot: 'bg-emerald-400',
    };
  }
  if (code >= 300 && code < 400) {
    return {
      container: 'bg-sky-500/15 text-sky-400 border-sky-500/30',
      dot: 'bg-sky-400',
    };
  }
  if (code >= 400 && code < 500) {
    return {
      container: 'bg-rose-500/15 text-rose-400 border-rose-500/30',
      dot: 'bg-rose-400',
    };
  }
  if (code >= 500) {
    return {
      container: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
      dot: 'bg-rose-400',
    };
  }
  return {
    container: 'bg-rose-500/15 text-rose-400 border-rose-500/30',
    dot: 'bg-rose-400',
  };
};

export const TabsBar: React.FC<TabsBarProps> = ({
  tabs,
  activeTabId,
  responsesMap,
  executingRequestIds,
  onSelectTab,
  onCloseTab,
  onNewRequestTab,
  onOpenArchitectureTab,
  onOpenRunnerTab,
  onOpenSaaSUsersTab,
  onOpenSaaSReportsTab,
  onOpenWebSocketTab,
  onOpenMockServerTab,
  onOpenGraphQLTab,
  onOpenMonitorTab,
  onOpenSSETab,
  onOpenGRPCTab,
  onOpenDocsTab,
  onOpenHelpModal,
  onOpenDiffTab,
  isSidebarOpen = true,
  onToggleSidebar,
  layoutMode = 'columns',
  onToggleLayout,
  isSaaSAdmin,
  isSaaSUser,
}) => {
  const [showToolsDropdown, setShowToolsDropdown] = useState(false);
  const toolsDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (toolsDropdownRef.current && !toolsDropdownRef.current.contains(e.target as Node)) {
        setShowToolsDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);
  return (
    <div className="flex items-center justify-between border-b border-white/10 bg-[#0d0f17] px-2 select-none shrink-0 h-10">
      {/* Sidebar toggle button */}
      {onToggleSidebar && (
        <button
          onClick={onToggleSidebar}
          className="h-8 w-8 inline-flex items-center justify-center p-0 mr-1 hover:bg-white/10 rounded-lg text-zinc-400 hover:text-white transition-colors shrink-0"
          title={isSidebarOpen ? "Hide Sidebar (Ctrl+\\)" : "Show Sidebar (Ctrl+\\)"}
        >
          {isSidebarOpen ? <PanelLeftClose className="w-3.5 h-3.5 text-orange-400" /> : <PanelLeft className="w-3.5 h-3.5 text-zinc-300" />}
        </button>
      )}

      {/* Tabs list */}
      <div className="flex items-center gap-1 overflow-x-auto no-scrollbar h-full flex-1 min-w-0 pr-2">
        {tabs.map(tab => {
          const isActive = tab.id === activeTabId;
          const isExecuting = tab.isLoading || (tab.requestId ? executingRequestIds?.includes(tab.requestId) : false);
          const res = tab.requestId && responsesMap ? responsesMap[tab.requestId] : undefined;
          const statusCode = tab.lastStatusCode !== undefined ? tab.lastStatusCode : res?.status;
          const statusText = tab.lastStatusText || res?.statusText;
          const badgeStyle = statusCode !== undefined ? getStatusBadgeStyle(statusCode) : null;

          return (
            <div
              key={tab.id}
              onClick={() => onSelectTab(tab.id)}
              className={`group flex items-center gap-1.5 px-2.5 h-8 rounded-t-lg border-t border-x cursor-pointer text-xs font-medium transition-all max-w-[240px] shrink-0 whitespace-nowrap ${
                isActive
                  ? 'bg-[#151926] border-white/15 text-white shadow-sm'
                  : 'bg-[#0a0c12] border-transparent text-zinc-400 hover:text-white hover:bg-white/5'
              }`}
            >
              {tab.type === 'request' && tab.method && (
                <span className={`font-mono text-[9px] font-bold shrink-0 ${METHOD_COLORS[tab.method] || 'text-zinc-400'}`}>
                  {tab.method}
                </span>
              )}

              {tab.type === 'collection_runner' && (
                <Play className="w-3 h-3 text-emerald-400 shrink-0 fill-emerald-400" />
              )}

              {tab.type === 'architecture' && (
                <FileCode className="w-3 h-3 text-orange-400 shrink-0" />
              )}

              {tab.type === 'saas_users' && (
                <Users className="w-3 h-3 text-orange-400 shrink-0" />
              )}

              {tab.type === 'saas_reports' && (
                <FileText className="w-3 h-3 text-purple-400 shrink-0" />
              )}

              {tab.type === 'register' && (
                <UserPlus className="w-3 h-3 text-emerald-400 shrink-0" />
              )}

              {tab.type === 'websocket' && (
                <Radio className="w-3 h-3 text-emerald-400 shrink-0 animate-pulse" />
              )}

              {tab.type === 'mock_server' && (
                <Server className="w-3 h-3 text-orange-400 shrink-0" />
              )}

              {tab.type === 'graphql' && (
                <Code2 className="w-3 h-3 text-pink-400 shrink-0" />
              )}

              {tab.type === 'monitor' && (
                <Activity className="w-3 h-3 text-teal-400 shrink-0" />
              )}

              {tab.type === 'sse' && (
                <Radio className="w-3 h-3 text-orange-400 shrink-0 animate-pulse" />
              )}

              {tab.type === 'grpc' && (
                <Server className="w-3 h-3 text-cyan-400 shrink-0" />
              )}

              {tab.type === 'collection_docs' && (
                <BookOpen className="w-3 h-3 text-orange-400 shrink-0" />
              )}

              {tab.type === 'diff_viewer' && (
                <GitCompare className="w-3 h-3 text-emerald-400 shrink-0" />
              )}

              <span className="truncate text-xs">{tab.title}</span>

              {/* Background execution status indicator */}
              {tab.type === 'request' && isExecuting && (
                <span
                  className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30 shrink-0 animate-pulse"
                  title="Executing in background..."
                >
                  <Loader2 className="w-2.5 h-2.5 animate-spin text-amber-400 shrink-0" />
                  <span>RUN</span>
                </span>
              )}

              {/* Visual indicator showing status code of last execution (e.g., green 200, red 404) */}
              {tab.type === 'request' && !isExecuting && statusCode !== undefined && badgeStyle && (
                <span
                  className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-mono font-bold border shrink-0 transition-colors ${badgeStyle.container}`}
                  title={`Last execution: ${statusCode === 0 ? 'Network Error' : `${statusCode} ${statusText || ''}`}`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${badgeStyle.dot}`} />
                  <span>{statusCode === 0 ? 'ERR' : statusCode}</span>
                </span>
              )}

              {tab.isDirty && (
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0"></span>
              )}

              {tabs.length > 1 && (
                <button
                  onClick={e => {
                    e.stopPropagation();
                    onCloseTab(tab.id);
                  }}
                  className="opacity-0 group-hover:opacity-100 p-0.5 hover:bg-white/10 rounded text-zinc-400 hover:text-white transition-opacity ml-0.5 shrink-0"
                  title="Close Tab"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          );
        })}

        <button
          onClick={onNewRequestTab}
          className="h-8 w-8 inline-flex items-center justify-center p-0 hover:bg-white/10 rounded-lg text-zinc-400 hover:text-white transition-colors shrink-0"
          title="New Request Tab"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>

      {/* SaaS & Platform Tools shortcuts + Layout Mode Switcher */}
      <div className="flex items-center gap-1.5 pl-2 shrink-0">
        {/* Layout toggle (Columns / Rows) */}
        {onToggleLayout && (
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onToggleLayout();
            }}
            className={`h-8 inline-flex items-center gap-1.5 px-2.5 border rounded-lg text-xs font-semibold transition-all shrink-0 whitespace-nowrap cursor-pointer select-none active:scale-95 ${
              layoutMode === 'columns'
                ? 'bg-orange-500/15 hover:bg-orange-500/25 border-orange-500/30 text-orange-300'
                : 'bg-emerald-500/15 hover:bg-emerald-500/25 border-emerald-500/30 text-emerald-300'
            }`}
            title={layoutMode === 'columns' ? "Side-by-Side view active: Click to switch to Stacked View (Top/Bottom)" : "Stacked view active: Click to switch to Side-by-Side View (Left/Right)"}
          >
            {layoutMode === 'columns' ? (
              <>
                <Columns className="w-3.5 h-3.5 text-orange-400 shrink-0" />
                <span className="text-[11px] whitespace-nowrap">Side-by-Side</span>
              </>
            ) : (
              <>
                <Rows className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span className="text-[11px] whitespace-nowrap">Stacked</span>
              </>
            )}
          </button>
        )}

        {/* Collection Runner Direct Shortcut Button */}
        {onOpenRunnerTab && (
          <button
            onClick={onOpenRunnerTab}
            id="tabsbar-runner-btn"
            className="h-8 inline-flex items-center gap-1.5 px-2.5 bg-orange-500/10 hover:bg-orange-500/20 border border-orange-500/30 text-orange-300 rounded-lg text-xs font-semibold transition-colors shrink-0 whitespace-nowrap cursor-pointer shadow-sm"
            title="Collection Runner & Automated API Tests"
          >
            <Play className="w-3.5 h-3.5 text-orange-400 fill-orange-400 shrink-0" />
            <span className="text-xs whitespace-nowrap">Runner</span>
          </button>
        )}

        {/* Tools Dropdown for compact, clean header */}
        <div className="relative shrink-0" ref={toolsDropdownRef}>
          <button
            onClick={() => setShowToolsDropdown(!showToolsDropdown)}
            className="h-8 inline-flex items-center gap-1 px-2.5 bg-orange-500/10 hover:bg-orange-500/20 border border-orange-500/30 text-orange-300 rounded-lg text-xs font-semibold transition-colors shrink-0 whitespace-nowrap"
            title="Open API & Platform Tools"
          >
            <Sparkles className="w-3.5 h-3.5 text-orange-400 shrink-0" />
            <span className="text-xs whitespace-nowrap">Tools</span>
            <ChevronDown className="w-3 h-3 text-orange-400/80 shrink-0" />
          </button>

          {showToolsDropdown && (
            <div className="absolute right-0 top-full mt-1.5 w-56 bg-[#141824] border border-white/10 rounded-xl shadow-2xl z-50 p-2 space-y-1 text-xs">
              <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                CloudPost Tools
              </div>

              {onOpenRunnerTab && (
                <button
                  onClick={() => { setShowToolsDropdown(false); onOpenRunnerTab(); }}
                  className="w-full flex items-center gap-2 p-2 rounded-lg text-orange-300 hover:text-white hover:bg-white/5 text-left transition-colors font-medium"
                >
                  <Play className="w-3.5 h-3.5 text-orange-400 fill-orange-400" />
                  <span>Collection Runner & Tests</span>
                </button>
              )}

              {onOpenWebSocketTab && (
                <button
                  onClick={() => { setShowToolsDropdown(false); onOpenWebSocketTab(); }}
                  className="w-full flex items-center gap-2 p-2 rounded-lg text-zinc-300 hover:text-white hover:bg-white/5 text-left transition-colors"
                >
                  <Radio className="w-3.5 h-3.5 text-emerald-400" />
                  <span>WebSocket Tester</span>
                </button>
              )}

              {onOpenMockServerTab && (
                <button
                  onClick={() => { setShowToolsDropdown(false); onOpenMockServerTab(); }}
                  className="w-full flex items-center gap-2 p-2 rounded-lg text-zinc-300 hover:text-white hover:bg-white/5 text-left transition-colors"
                >
                  <Server className="w-3.5 h-3.5 text-amber-400" />
                  <span>Mock Server Engine</span>
                </button>
              )}

              {onOpenGraphQLTab && (
                <button
                  onClick={() => { setShowToolsDropdown(false); onOpenGraphQLTab(); }}
                  className="w-full flex items-center gap-2 p-2 rounded-lg text-zinc-300 hover:text-white hover:bg-white/5 text-left transition-colors"
                >
                  <Code2 className="w-3.5 h-3.5 text-pink-400" />
                  <span>GraphQL Explorer</span>
                </button>
              )}

              {onOpenMonitorTab && (
                <button
                  onClick={() => { setShowToolsDropdown(false); onOpenMonitorTab(); }}
                  className="w-full flex items-center gap-2 p-2 rounded-lg text-zinc-300 hover:text-white hover:bg-white/5 text-left transition-colors"
                >
                  <Activity className="w-3.5 h-3.5 text-teal-400" />
                  <span>Monitors & Health</span>
                </button>
              )}

              {onOpenSSETab && (
                <button
                  onClick={() => { setShowToolsDropdown(false); onOpenSSETab(); }}
                  className="w-full flex items-center gap-2 p-2 rounded-lg text-zinc-300 hover:text-white hover:bg-white/5 text-left transition-colors"
                >
                  <Radio className="w-3.5 h-3.5 text-orange-400" />
                  <span>SSE Stream Tester</span>
                </button>
              )}

              {onOpenGRPCTab && (
                <button
                  onClick={() => { setShowToolsDropdown(false); onOpenGRPCTab(); }}
                  className="w-full flex items-center gap-2 p-2 rounded-lg text-zinc-300 hover:text-white hover:bg-white/5 text-left transition-colors"
                >
                  <Server className="w-3.5 h-3.5 text-cyan-400" />
                  <span>gRPC Protocol Explorer</span>
                </button>
              )}

              {isSaaSUser && onOpenDocsTab && (
                <button
                  onClick={() => { setShowToolsDropdown(false); onOpenDocsTab(); }}
                  className="w-full flex items-center gap-2 p-2 rounded-lg text-zinc-300 hover:text-white hover:bg-white/5 text-left transition-colors"
                >
                  <BookOpen className="w-3.5 h-3.5 text-amber-400" />
                  <span>Documentation & User Manuals</span>
                </button>
              )}

              {onOpenHelpModal && (
                <button
                  onClick={() => { setShowToolsDropdown(false); onOpenHelpModal(); }}
                  className="w-full flex items-center gap-2 p-2 rounded-lg text-zinc-300 hover:text-white hover:bg-white/5 text-left transition-colors"
                >
                  <HelpCircle className="w-3.5 h-3.5 text-orange-400" />
                  <span>User Guide</span>
                </button>
              )}

              {onOpenDiffTab && (
                <button
                  onClick={() => { setShowToolsDropdown(false); onOpenDiffTab(); }}
                  className="w-full flex items-center gap-2 p-2 rounded-lg text-zinc-300 hover:text-white hover:bg-white/5 text-left transition-colors"
                >
                  <GitCompare className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Response Diff Inspector</span>
                </button>
              )}

              {onOpenSaaSUsersTab && (
                <button
                  onClick={() => { setShowToolsDropdown(false); onOpenSaaSUsersTab(); }}
                  className="w-full flex items-center gap-2 p-2 rounded-lg text-zinc-300 hover:text-white hover:bg-white/5 text-left transition-colors"
                >
                  <Users className="w-3.5 h-3.5 text-orange-400" />
                  <span>SaaS Users & Costs</span>
                </button>
              )}

              {onOpenSaaSReportsTab && (
                <button
                  onClick={() => { setShowToolsDropdown(false); onOpenSaaSReportsTab(); }}
                  className="w-full flex items-center gap-2 p-2 rounded-lg text-zinc-300 hover:text-white hover:bg-white/5 text-left transition-colors"
                >
                  <TrendingUp className="w-3.5 h-3.5 text-purple-400" />
                  <span>SaaS Revenue Reports</span>
                </button>
              )}

              {isSaaSAdmin && (
                <div className="pt-1 border-t border-white/5">
                  <button
                    onClick={() => { setShowToolsDropdown(false); onOpenArchitectureTab(); }}
                    className="w-full flex items-center gap-2 p-2 rounded-lg text-orange-300 hover:text-orange-200 hover:bg-white/5 text-left transition-colors font-medium"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-orange-400" />
                    <span>Architecture & Schema</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
