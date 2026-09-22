import React, { useState, useMemo } from 'react';
import { ApiRequest, ApiResponse } from '../../types';
import { JsonGraphViewer } from './JsonGraphViewer';
import { JsonTreeViewer } from './JsonTreeViewer';
import { CorsResolutionModal } from '../Modals/CorsResolutionModal';
import { 
  CheckCircle2, 
  XCircle, 
  Clock, 
  HardDrive, 
  Copy, 
  Check, 
  Download, 
  Search, 
  Activity,
  Network,
  Code2,
  FileText,
  ListTree,
  Sparkles,
  ToggleLeft,
  ToggleRight,
  HelpCircle,
  ShieldAlert,
  RefreshCw
} from 'lucide-react';

interface ResponseViewerProps {
  response: ApiResponse | null;
  isLoading: boolean;
  onRequestExportCode?: () => void;
  activeRequest?: ApiRequest;
  onRetryWithProxy?: () => Promise<void> | void;
}

export const ResponseViewer: React.FC<ResponseViewerProps> = ({ 
  response, 
  isLoading,
  onRequestExportCode,
  activeRequest,
  onRetryWithProxy
}) => {
  const [activeTab, setActiveTab] = useState<'pretty' | 'graph' | 'raw' | 'headers' | 'tests'>('pretty');
  const [prettyPrintEnabled, setPrettyPrintEnabled] = useState<boolean>(true);
  const [prettyViewMode, setPrettyViewMode] = useState<'tree' | 'code'>('code');
  const [indentSize, setIndentSize] = useState<number>(2);
  const [copied, setCopied] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showCorsModal, setShowCorsModal] = useState<boolean>(false);

  // Detect if response data is valid JSON
  const isJsonData = useMemo(() => {
    if (!response) return false;
    if (typeof response.data === 'object' && response.data !== null) return true;
    if (typeof response.rawBody === 'string') {
      try {
        JSON.parse(response.rawBody);
        return true;
      } catch {
        return false;
      }
    }
    return false;
  }, [response]);

  // Formatted JSON string based on prettyPrint state
  const formattedBody = useMemo(() => {
    if (!response) return '';
    const raw = response.rawBody || JSON.stringify(response.data);
    if (!isJsonData || !prettyPrintEnabled) {
      return raw;
    }
    try {
      const parsed = typeof response.data === 'object' ? response.data : JSON.parse(raw);
      return JSON.stringify(parsed, null, indentSize);
    } catch {
      return raw;
    }
  }, [response, isJsonData, prettyPrintEnabled, indentSize]);

  // CORS and connection error detection (declared unconditionally before early returns)
  const isCorsError = useMemo(() => {
    if (!response) return false;
    if (response.isCorsError) return true;
    if (!response.status || response.status === 0) return true;
    const txt = (response.statusText || '').toLowerCase();
    if (txt.includes('cors') || txt.includes('network error') || txt.includes('connection error')) return true;
    return false;
  }, [response]);

  if (isLoading) {
    return (
      <div className="h-full flex flex-col items-center justify-center bg-[#0e111a] border-t border-white/10 text-zinc-400 p-8">
        <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin mb-3"></div>
        <p className="text-xs font-semibold text-white">Sending API Request...</p>
        <p className="text-[11px] text-zinc-500 mt-1">Evaluating parameters, headers, and running postman test scripts</p>
      </div>
    );
  }

  if (!response) {
    return (
      <div className="h-full flex flex-col items-center justify-center bg-[#0e111a] border-t border-white/10 text-zinc-500 p-8 text-center">
        <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-zinc-400 mb-3">
          <Activity className="w-6 h-6 text-orange-400" />
        </div>
        <h3 className="font-semibold text-zinc-300 text-sm">Response Pane Ready</h3>
        <p className="text-xs text-zinc-500 max-w-sm mt-1">
          Click <strong>Send</strong> or press <code className="bg-white/10 px-1 py-0.5 rounded text-zinc-300 font-mono">Cmd/Ctrl + Enter</code> to dispatch the HTTP request and inspect responses here.
        </p>
      </div>
    );
  }

  const isSuccess = response.status >= 200 && response.status < 300;
  const isError = response.status >= 400 || response.status === 0;

  const handleCopy = () => {
    navigator.clipboard.writeText(formattedBody || response.rawBody || JSON.stringify(response.data, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const content = formattedBody || response.rawBody || JSON.stringify(response.data, null, 2);
    const blob = new Blob([content], {
      type: isJsonData ? 'application/json' : 'text/plain',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `response_${response.status || 'data'}_${Date.now()}.${isJsonData ? 'json' : 'txt'}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const totalTests = response.testResults?.length || 0;
  const passedTests = response.testResults?.filter(t => t.passed).length || 0;

  return (
    <div className="h-full flex flex-col bg-[#0e111a] border-t border-white/10 overflow-hidden">
      {/* Response Metrics & Status Bar */}
      <div className="px-4 py-2.5 bg-[#141824] border-b border-white/10 flex items-center justify-between gap-4 shrink-0 text-xs">
        {/* Left: Status Code, Time, Size */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5 font-bold">
            <span className="text-zinc-400 font-normal">Status:</span>
            <span
              className={`px-2 py-0.5 rounded font-mono ${
                isSuccess
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  : isError
                  ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                  : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
              }`}
            >
              {response.status ? `${response.status} ${response.statusText}` : 'CORS / Connection Error'}
            </span>

            {/* Clickable Help Icon when CORS or Connection Error occurs */}
            {isCorsError && (
              <button
                id="resolve-cors-status-btn"
                type="button"
                onClick={() => setShowCorsModal(true)}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 hover:text-white border border-rose-500/40 text-[11px] font-semibold cursor-pointer transition-all shadow-sm ml-1 animate-pulse hover:animate-none group"
                title="CORS / Connection issue detected. Click to view steps to resolve it in the app."
              >
                <HelpCircle className="w-3.5 h-3.5 text-rose-400 group-hover:scale-110 transition-transform shrink-0" />
                <span>How to Fix</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-1 text-zinc-400">
            <Clock className="w-3.5 h-3.5 text-zinc-500" />
            <span>Time:</span>
            <span className="text-white font-mono">{response.time} ms</span>
          </div>

          <div className="flex items-center gap-1 text-zinc-400">
            <HardDrive className="w-3.5 h-3.5 text-zinc-500" />
            <span>Size:</span>
            <span className="text-white font-mono">
              {response.size > 1024 ? `${(response.size / 1024).toFixed(2)} KB` : `${response.size} B`}
            </span>
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2">
          {onRequestExportCode && (
            <button
              onClick={onRequestExportCode}
              className="flex items-center gap-1 px-2.5 py-1 bg-orange-500/10 hover:bg-orange-500/20 text-orange-300 hover:text-orange-200 border border-orange-500/30 rounded font-medium transition-colors"
              title="Export Request as Code (cURL, Python, JS, PHP, etc.)"
            >
              <Code2 className="w-3.5 h-3.5 text-orange-400" />
              <span className="hidden sm:inline">Export Code</span>
            </button>
          )}
          <button
            onClick={handleCopy}
            className="flex items-center gap-1 px-2.5 py-1 bg-white/5 hover:bg-white/10 rounded text-zinc-300 hover:text-white transition-colors"
            title="Copy Response Body"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline">{copied ? 'Copied' : 'Copy'}</span>
          </button>
          <button
            onClick={handleDownload}
            className="flex items-center gap-1 px-2.5 py-1 bg-white/5 hover:bg-white/10 rounded text-zinc-300 hover:text-white transition-colors"
            title="Download Response File"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Save</span>
          </button>
        </div>
      </div>

      {/* CORS Alert Banner */}
      {isCorsError && (
        <div className="px-4 py-2 bg-gradient-to-r from-rose-950/40 via-[#18121d] to-[#121624] border-b border-rose-500/30 flex flex-wrap items-center justify-between gap-3 text-xs shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-6 h-6 rounded-lg bg-rose-500/20 border border-rose-500/30 flex items-center justify-center shrink-0 text-rose-400">
              <ShieldAlert className="w-3.5 h-3.5" />
            </div>
            <div className="min-w-0">
              <span className="text-rose-200 font-semibold">CORS or Connection Error: </span>
              <span className="text-zinc-400 text-[11px]">
                Browser blocked this request due to Same-Origin Policy (missing Access-Control-Allow-Origin).
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {onRetryWithProxy && (
              <button
                onClick={onRetryWithProxy}
                className="px-2.5 py-1 rounded bg-orange-500/20 hover:bg-orange-500/30 text-orange-300 hover:text-white border border-orange-500/40 text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
                title="Retry request using built-in CloudPost Server Proxy"
              >
                <RefreshCw className="w-3 h-3 text-orange-400" />
                <span>Retry via Proxy</span>
              </button>
            )}
            <button
              onClick={() => setShowCorsModal(true)}
              className="px-2.5 py-1 rounded bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 hover:text-white border border-rose-500/40 text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
              title="View full step-by-step resolution guide"
            >
              <HelpCircle className="w-3.5 h-3.5 text-rose-400" />
              <span>Resolution Steps</span>
            </button>
          </div>
        </div>
      )}

      {/* Sub Navigation Bar: Tabs & Pretty/Graph Controls */}
      <div className="px-4 border-b border-white/10 bg-[#121520] flex flex-wrap items-center justify-between gap-2 shrink-0 text-xs">
        <div className="flex items-center gap-1">
          {/* Pretty JSON Tab */}
          <button
            onClick={() => setActiveTab('pretty')}
            className={`px-3 py-2 font-medium border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'pretty'
                ? 'border-orange-500 text-orange-400'
                : 'border-transparent text-zinc-400 hover:text-white'
            }`}
          >
            <Code2 className="w-3.5 h-3.5" />
            <span>Pretty JSON</span>
          </button>

          {/* Visual Graph Tab */}
          <button
            onClick={() => setActiveTab('graph')}
            className={`px-3 py-2 font-medium border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'graph'
                ? 'border-orange-500 text-orange-400'
                : 'border-transparent text-zinc-400 hover:text-white'
            }`}
          >
            <Network className="w-3.5 h-3.5 text-orange-400" />
            <span className="font-semibold">Visual Graph</span>
            {isJsonData && (
              <span className="px-1.5 py-0.2 bg-orange-500/20 text-orange-300 rounded text-[9.5px] uppercase font-bold">
                Interactive
              </span>
            )}
          </button>

          {/* Raw Tab */}
          <button
            onClick={() => setActiveTab('raw')}
            className={`px-3 py-2 font-medium border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'raw'
                ? 'border-orange-500 text-orange-400'
                : 'border-transparent text-zinc-400 hover:text-white'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Raw</span>
          </button>

          {/* Headers Tab */}
          <button
            onClick={() => setActiveTab('headers')}
            className={`px-3 py-2 font-medium border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'headers'
                ? 'border-orange-500 text-orange-400'
                : 'border-transparent text-zinc-400 hover:text-white'
            }`}
          >
            <span>Headers</span>
            <span className="px-1.5 py-0.2 bg-white/10 rounded text-[10px] text-zinc-300">
              {Object.keys(response.headers || {}).length}
            </span>
          </button>

          {/* Test Results Tab */}
          <button
            onClick={() => setActiveTab('tests')}
            className={`px-3 py-2 font-medium border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'tests'
                ? 'border-orange-500 text-orange-400'
                : 'border-transparent text-zinc-400 hover:text-white'
            }`}
          >
            <span>Test Results</span>
            {totalTests > 0 && (
              <span
                className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
                  passedTests === totalTests
                    ? 'bg-emerald-500/20 text-emerald-400'
                    : 'bg-red-500/20 text-red-400'
                }`}
              >
                {passedTests}/{totalTests}
              </span>
            )}
          </button>
        </div>

        {/* Contextual Toolbar for Pretty Tab */}
        {activeTab === 'pretty' && (
          <div className="flex items-center gap-3 py-1.5">
            {/* Automatic Pretty Print Toggle */}
            <div className="flex items-center gap-2 bg-[#181d2c] px-2.5 py-1 rounded-lg border border-white/10 text-[11px]">
              <span className="text-zinc-400 flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-orange-400" />
                Pretty Print:
              </span>
              <button
                onClick={() => setPrettyPrintEnabled(!prettyPrintEnabled)}
                className={`flex items-center gap-1 font-semibold transition-colors ${
                  prettyPrintEnabled ? 'text-orange-400' : 'text-zinc-500'
                }`}
                title="Toggle Automatic Pretty Print formatting"
              >
                {prettyPrintEnabled ? (
                  <ToggleRight className="w-5 h-5 text-orange-500" />
                ) : (
                  <ToggleLeft className="w-5 h-5 text-zinc-600" />
                )}
                <span>{prettyPrintEnabled ? 'ON' : 'OFF'}</span>
              </button>
            </div>

            {/* View Mode Toggle: Code vs Collapsible Tree */}
            {prettyPrintEnabled && isJsonData && (
              <div className="flex items-center gap-1 bg-[#181d2c] p-0.5 rounded-lg border border-white/10">
                <button
                  onClick={() => setPrettyViewMode('code')}
                  className={`px-2 py-0.5 rounded font-medium text-[11px] transition-colors ${
                    prettyViewMode === 'code'
                      ? 'bg-orange-500 text-white shadow-sm'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                  title="Code View with Syntax Highlighting"
                >
                  Formatted
                </button>
                <button
                  onClick={() => setPrettyViewMode('tree')}
                  className={`px-2 py-0.5 rounded font-medium text-[11px] transition-colors flex items-center gap-1 ${
                    prettyViewMode === 'tree'
                      ? 'bg-orange-500 text-white shadow-sm'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                  title="Collapsible Interactive JSON Tree"
                >
                  <ListTree className="w-3 h-3" />
                  <span>Tree View</span>
                </button>
              </div>
            )}

            {/* Indent selector */}
            {prettyPrintEnabled && prettyViewMode === 'code' && (
              <div className="flex items-center gap-1 text-zinc-400 text-[11px]">
                <span>Spaces:</span>
                <select
                  value={indentSize}
                  onChange={e => setIndentSize(parseInt(e.target.value))}
                  className="bg-[#181d2c] border border-white/10 rounded px-1.5 py-0.5 text-white text-[11px] focus:outline-none focus:border-orange-500"
                >
                  <option value="2">2</option>
                  <option value="4">4</option>
                </select>
              </div>
            )}

            {/* Search */}
            <div className="relative">
              <Search className="w-3 h-3 text-zinc-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search response..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="bg-[#0a0c12] border border-white/10 rounded pl-7 pr-2 py-0.5 text-[11px] text-white placeholder-zinc-500 focus:outline-none focus:border-orange-500"
              />
            </div>
          </div>
        )}
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-hidden">
        {/* Tab: Pretty JSON */}
        {activeTab === 'pretty' && (
          <div className="h-full overflow-auto p-4 font-mono text-xs">
            {prettyViewMode === 'tree' && isJsonData ? (
              <JsonTreeViewer data={response.data ?? response.rawBody} searchTerm={searchTerm} />
            ) : (
              <pre className="text-emerald-300 leading-relaxed overflow-x-auto selection:bg-orange-500/30">
                {formattedBody || 'Empty Response Body'}
              </pre>
            )}
          </div>
        )}

        {/* Tab: Visual Graph Representation */}
        {activeTab === 'graph' && (
          <div className="h-full w-full">
            {isJsonData ? (
              <JsonGraphViewer data={response.data ?? response.rawBody} initialDepth={2} />
            ) : (
              <div className="h-full flex flex-col items-center justify-center p-8 text-center text-zinc-500 text-xs">
                <Network className="w-8 h-8 text-zinc-600 mb-2" />
                <p className="font-semibold text-zinc-400">Non-JSON Response Payload</p>
                <p className="mt-1 max-w-sm">
                  The visual graph visualizer generates interactive hierarchical tree diagrams for JSON data structures. This response is plain text or HTML.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Tab: Raw */}
        {activeTab === 'raw' && (
          <div className="h-full overflow-auto p-4 font-mono text-xs">
            <pre className="text-zinc-300 leading-relaxed overflow-x-auto whitespace-pre-wrap">
              {response.rawBody || JSON.stringify(response.data)}
            </pre>
          </div>
        )}

        {/* Tab: Headers */}
        {activeTab === 'headers' && (
          <div className="h-full overflow-auto p-4 text-xs font-mono">
            <div className="border border-white/10 rounded-lg overflow-hidden bg-[#0a0c12]">
              <div className="grid grid-cols-12 gap-2 font-semibold uppercase text-[11px] text-zinc-400 px-3 py-2 bg-[#141824] border-b border-white/10">
                <div className="col-span-4">Header Key</div>
                <div className="col-span-8">Value</div>
              </div>
              <div className="divide-y divide-white/5">
                {Object.entries(response.headers || {}).map(([k, v]) => (
                  <div key={k} className="grid grid-cols-12 gap-2 px-3 py-1.5 items-center">
                    <div className="col-span-4 text-orange-300 font-semibold truncate">{k}</div>
                    <div className="col-span-8 text-zinc-300 break-all">{v}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Tab: Tests */}
        {activeTab === 'tests' && (
          <div className="h-full overflow-auto p-4 space-y-3 font-sans text-xs">
            {totalTests === 0 ? (
              <div className="p-8 text-center text-zinc-500 text-xs">
                No test scripts were written for this request. Go to the <strong>Tests</strong> tab above to add assertions like <code className="text-orange-300 font-mono">pm.response.to.have.status(200)</code>.
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center gap-3 p-3 bg-[#141824] rounded-lg border border-white/10 text-xs">
                  <div className="flex items-center gap-1.5 text-emerald-400 font-bold">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>{passedTests} Passed</span>
                  </div>
                  {totalTests - passedTests > 0 && (
                    <div className="flex items-center gap-1.5 text-red-400 font-bold">
                      <XCircle className="w-4 h-4" />
                      <span>{totalTests - passedTests} Failed</span>
                    </div>
                  )}
                </div>

                <div className="border border-white/10 rounded-lg divide-y divide-white/5 bg-[#0a0c12] overflow-hidden">
                  {response.testResults?.map((test, idx) => (
                    <div key={idx} className="p-3 flex items-start justify-between gap-3 text-xs">
                      <div className="flex items-start gap-2.5">
                        {test.passed ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                        ) : (
                          <XCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                        )}
                        <div>
                          <div className="font-semibold text-white">{test.name}</div>
                          {test.message && (
                            <p className="text-red-400 font-mono text-[11px] mt-0.5">{test.message}</p>
                          )}
                        </div>
                      </div>

                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          test.passed ? 'bg-emerald-500/20 text-emerald-300' : 'bg-red-500/20 text-red-300'
                        }`}
                      >
                        {test.passed ? 'PASS' : 'FAIL'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* In-App CORS & Connection Error Resolution Modal */}
      {showCorsModal && (
        <CorsResolutionModal
          isOpen={showCorsModal}
          onClose={() => setShowCorsModal(false)}
          targetUrl={response?.targetUrl || activeRequest?.url || ''}
          method={activeRequest?.method || 'GET'}
          onRetryWithProxy={onRetryWithProxy}
        />
      )}
    </div>
  );
};
