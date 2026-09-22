import React, { useState } from 'react';
import { 
  Sparkles, 
  Play, 
  Code2, 
  Copy, 
  Check, 
  Plus, 
  Trash2, 
  BookOpen, 
  Zap, 
  Variable as VariableIcon, 
  Clock, 
  Key, 
  RotateCcw 
} from 'lucide-react';
import { Variable } from '../../types';
import { runPreRequestScript } from '../../services/apiRunner';

interface PreRequestEditorProps {
  script?: string;
  onChange: (script: string) => void;
  disabled?: boolean;
  variables?: Variable[];
  onSetVariable?: (key: string, value: string) => void;
}

interface PreRequestSnippet {
  title: string;
  description: string;
  snippet: string;
  category: 'variables' | 'timestamps' | 'auth' | 'crypto';
}

const PRE_REQUEST_SNIPPETS: PreRequestSnippet[] = [
  {
    title: 'Set environment variable',
    description: 'Assign a static or calculated value to an environment variable',
    snippet: `pm.environment.set("api_key", "secret_live_token_123");`,
    category: 'variables',
  },
  {
    title: 'Get environment variable',
    description: 'Read an active variable and log or manipulate it',
    snippet: `const baseUrl = pm.environment.get("baseUrl");
console.log("Current target base URL:", baseUrl);`,
    category: 'variables',
  },
  {
    title: 'Set ISO 8601 Timestamp',
    description: 'Generate dynamic UTC timestamp for request signatures',
    snippet: `pm.environment.set("current_timestamp", new Date().toISOString());`,
    category: 'timestamps',
  },
  {
    title: 'Set Unix Epoch (Seconds)',
    description: 'Generate seconds timestamp for OAuth / HMAC APIs',
    snippet: `pm.environment.set("epoch_time", Math.floor(Date.now() / 1000));`,
    category: 'timestamps',
  },
  {
    title: 'Generate Random UUID v4',
    description: 'Inject a unique idempotency or tracing key',
    snippet: `const requestId = typeof crypto !== 'undefined' && crypto.randomUUID 
  ? crypto.randomUUID() 
  : 'req_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9);
pm.environment.set("request_id", requestId);`,
    category: 'timestamps',
  },
  {
    title: 'Basic Auth Base64 Encoder',
    description: 'Encode username and password credentials into Base64',
    snippet: `const user = "admin";
const pass = "supersecret";
const encoded = btoa(user + ":" + pass);
pm.environment.set("basic_auth_token", encoded);`,
    category: 'auth',
  },
  {
    title: 'Dynamic Nonce Generator',
    description: 'Create a single-use random alphanumeric nonce',
    snippet: `const nonce = Array.from(crypto.getRandomValues(new Uint8Array(16)))
  .map(b => b.toString(16).padStart(2, '0')).join('');
pm.environment.set("request_nonce", nonce);`,
    category: 'crypto',
  },
];

export const PreRequestEditor: React.FC<PreRequestEditorProps> = ({
  script = '',
  onChange,
  disabled = false,
  variables = [],
  onSetVariable,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [copiedSnippetIndex, setCopiedSnippetIndex] = useState<number | null>(null);
  const [testLogs, setTestLogs] = useState<string[]>([]);
  const [testUpdatedVars, setTestUpdatedVars] = useState<{ key: string; value: string }[]>([]);
  const [hasRunTest, setHasRunTest] = useState(false);

  const filteredSnippets = selectedCategory === 'all'
    ? PRE_REQUEST_SNIPPETS
    : PRE_REQUEST_SNIPPETS.filter(s => s.category === selectedCategory);

  const handleAppendSnippet = (snippetCode: string) => {
    if (disabled) return;
    const newScript = script.trim() 
      ? `${script.trim()}\n\n// Added snippet\n${snippetCode}`
      : snippetCode;
    onChange(newScript);
  };

  const handleCopySnippet = (code: string, idx: number) => {
    navigator.clipboard.writeText(code);
    setCopiedSnippetIndex(idx);
    setTimeout(() => setCopiedSnippetIndex(null), 2000);
  };

  const handleRunPreScriptTest = () => {
    setHasRunTest(true);
    const recordedSets: { key: string; value: string }[] = [];
    const res = runPreRequestScript(script, variables, (k, v) => {
      recordedSets.push({ key: k, value: v });
      if (onSetVariable) onSetVariable(k, v);
    });
    setTestLogs(res.logs.length > 0 ? res.logs : ['[INFO] Pre-request script executed successfully with no console output.']);
    setTestUpdatedVars(recordedSets);
  };

  return (
    <div id="pre-request-editor" className="flex flex-col lg:flex-row gap-4 h-[calc(100vh-21rem)] min-h-[420px]">
      {/* Left / Main Code Editor */}
      <div className="flex-1 flex flex-col bg-[#161922] border border-white/10 rounded-xl overflow-hidden shadow-lg">
        {/* Editor Toolbar */}
        <div className="flex items-center justify-between px-4 py-2.5 bg-[#0f1118] border-b border-white/10">
          <div className="flex items-center gap-2">
            <Code2 className="w-4 h-4 text-orange-400" />
            <span className="text-xs font-semibold text-zinc-200">Pre-request Script (JavaScript Sandbox)</span>
            <span className="text-[10px] bg-orange-500/10 text-orange-400 border border-orange-500/20 px-2 py-0.5 rounded-full font-mono">
              Runs before request
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleRunPreScriptTest}
              disabled={disabled || !script.trim()}
              className="flex items-center gap-1.5 px-3 py-1 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:hover:bg-emerald-600 text-white text-xs font-medium rounded-lg transition-colors shadow-sm"
              title="Execute script against local sandbox to verify variables and console logs"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Test Script</span>
            </button>

            {script.trim() && !disabled && (
              <button
                type="button"
                onClick={() => onChange('')}
                className="p-1 text-zinc-500 hover:text-red-400 transition-colors rounded"
                title="Clear pre-request script"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Textarea code editor */}
        <div className="relative flex-1 flex flex-col min-h-0">
          <textarea
            value={script}
            onChange={e => onChange(e.target.value)}
            disabled={disabled}
            placeholder={`// Write JavaScript to execute before this request is dispatched\n// Examples:\n// pm.environment.set("timestamp", new Date().toISOString());\n// pm.environment.set("random_uuid", crypto.randomUUID());\n// console.log("Preparing request...");`}
            className="w-full flex-1 p-4 bg-[#141720] text-zinc-200 font-mono text-xs leading-relaxed focus:outline-none resize-none selection:bg-orange-500/30"
            spellCheck={false}
          />
        </div>

        {/* Sandbox Test Console & Variables Preview */}
        {hasRunTest && (
          <div className="bg-[#0b0d13] border-t border-white/10 p-3 max-h-44 overflow-y-auto">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-semibold text-zinc-400 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                Execution Output & Captured Variables
              </span>
              <button 
                onClick={() => setHasRunTest(false)}
                className="text-[10px] text-zinc-500 hover:text-zinc-300"
              >
                Dismiss
              </button>
            </div>

            {testUpdatedVars.length > 0 && (
              <div className="mb-2 space-y-1">
                <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-bold">Variables Updated:</span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
                  {testUpdatedVars.map((v, i) => (
                    <div key={i} className="flex items-center gap-1.5 px-2 py-1 bg-white/5 rounded border border-white/5 text-[11px] font-mono">
                      <VariableIcon className="w-3 h-3 text-cyan-400" />
                      <span className="text-orange-300 font-bold">{v.key}:</span>
                      <span className="text-zinc-300 truncate">{v.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-1 font-mono text-[11px]">
              {testLogs.map((log, idx) => (
                <div 
                  key={idx} 
                  className={`leading-tight ${
                    log.startsWith('[ERROR]') ? 'text-rose-400' :
                    log.startsWith('[WARN]') ? 'text-amber-400' :
                    log.startsWith('[PRE-SCRIPT ERROR]') ? 'text-rose-400 font-bold' :
                    'text-zinc-400'
                  }`}
                >
                  {log}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Right Snippets Sidebar */}
      <div className="w-full lg:w-80 flex flex-col bg-[#161922] border border-white/10 rounded-xl overflow-hidden shadow-lg shrink-0">
        <div className="px-4 py-2.5 bg-[#0f1118] border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-orange-400" />
            <span className="text-xs font-semibold text-zinc-200">Script Snippets</span>
          </div>
          <span className="text-[10px] text-zinc-500 font-mono">1-click insert</span>
        </div>

        {/* Filter chips */}
        <div className="flex items-center gap-1 p-2 bg-[#12141c] border-b border-white/5 overflow-x-auto text-[11px]">
          {(['all', 'variables', 'timestamps', 'auth', 'crypto'] as const).map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-2.5 py-1 rounded-md capitalize whitespace-nowrap transition-colors ${
                selectedCategory === cat
                  ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30'
                  : 'text-zinc-400 hover:text-white hover:bg-white/5'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Snippet list */}
        <div className="flex-1 overflow-y-auto p-2 space-y-2">
          {filteredSnippets.map((item, idx) => (
            <div
              key={idx}
              className="p-2.5 bg-[#1a1d28] hover:bg-[#202432] border border-white/5 hover:border-orange-500/30 rounded-lg transition-all text-left group"
            >
              <div className="flex items-start justify-between gap-2 mb-1">
                <span className="text-xs font-medium text-zinc-200 group-hover:text-orange-400 transition-colors">
                  {item.title}
                </span>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    type="button"
                    onClick={() => handleCopySnippet(item.snippet, idx)}
                    className="p-1 text-zinc-400 hover:text-white rounded hover:bg-white/10"
                    title="Copy snippet"
                  >
                    {copiedSnippetIndex === idx ? (
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAppendSnippet(item.snippet)}
                    disabled={disabled}
                    className="p-1 text-orange-400 hover:text-orange-300 rounded hover:bg-orange-500/10"
                    title="Insert into editor"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
              <p className="text-[11px] text-zinc-400 leading-snug mb-2">
                {item.description}
              </p>
              <pre className="p-1.5 bg-[#0f1118] text-zinc-400 rounded text-[10px] font-mono overflow-x-auto border border-white/5 group-hover:text-zinc-300">
                {item.snippet}
              </pre>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
