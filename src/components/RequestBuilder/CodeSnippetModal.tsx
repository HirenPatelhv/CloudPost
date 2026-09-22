import React, { useState, useMemo } from 'react';
import { ApiRequest, Variable, Collection } from '../../types';
import { 
  ALL_VARIANTS, 
  CodeVariant, 
  CodeGenOptions, 
  DEFAULT_OPTIONS, 
  generateCollectionBashScript, 
  generateCollectionNodeScript 
} from '../../services/codeGenService';
import { 
  Code2, 
  Copy, 
  Check, 
  Download, 
  Search, 
  Sliders, 
  Sparkles, 
  FileCode, 
  Layers, 
  Terminal, 
  Settings2,
  CheckCircle2,
  Share2,
  Maximize2,
  Minimize2,
  ChevronRight
} from 'lucide-react';

interface CodeSnippetModalProps {
  request: ApiRequest;
  variables: Variable[];
  collection?: Collection;
  onClose: () => void;
}

export const CodeSnippetModal: React.FC<CodeSnippetModalProps> = ({
  request,
  variables,
  collection,
  onClose,
}) => {
  const [selectedVariantId, setSelectedVariantId] = useState<string>('curl');
  const [searchTerm, setSearchTerm] = useState('');
  const [exportMode, setExportMode] = useState<'single' | 'collection_bash' | 'collection_node' | 'collection_postman'>('single');
  const [copied, setCopied] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [options, setOptions] = useState<CodeGenOptions>(DEFAULT_OPTIONS);
  const [showSettings, setShowSettings] = useState(false);

  const selectedVariant = useMemo(() => {
    return ALL_VARIANTS.find(v => v.id === selectedVariantId) || ALL_VARIANTS[0];
  }, [selectedVariantId]);

  // Filter languages/variants by search term
  const filteredVariants = useMemo(() => {
    if (!searchTerm.trim()) return ALL_VARIANTS;
    const q = searchTerm.toLowerCase();
    return ALL_VARIANTS.filter(v => 
      v.name.toLowerCase().includes(q) ||
      v.language.toLowerCase().includes(q) ||
      v.extension.toLowerCase().includes(q)
    );
  }, [searchTerm]);

  // Generate the active snippet
  const generatedCode = useMemo(() => {
    if (exportMode === 'collection_bash' && collection) {
      return generateCollectionBashScript(collection, variables, options);
    }
    if (exportMode === 'collection_node' && collection) {
      return generateCollectionNodeScript(collection, variables, options);
    }
    if (exportMode === 'collection_postman' && collection) {
      return JSON.stringify(collection, null, 2);
    }
    return selectedVariant.generate(request, variables, options);
  }, [selectedVariant, request, variables, options, exportMode, collection]);

  // Code line numbers calculation
  const codeLines = useMemo(() => {
    return generatedCode.split('\n');
  }, [generatedCode]);

  const handleCopy = () => {
    navigator.clipboard.writeText(generatedCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    let filename = '';
    let mimeType = 'text/plain';

    if (exportMode === 'collection_bash') {
      filename = `${(collection?.name || 'collection').toLowerCase().replace(/\s+/g, '_')}_runner.sh`;
      mimeType = 'text/x-sh';
    } else if (exportMode === 'collection_node') {
      filename = `${(collection?.name || 'collection').toLowerCase().replace(/\s+/g, '_')}_runner.js`;
      mimeType = 'application/javascript';
    } else if (exportMode === 'collection_postman') {
      filename = `${(collection?.name || 'collection').toLowerCase().replace(/\s+/g, '_')}.postman_collection.json`;
      mimeType = 'application/json';
    } else {
      const sanitizedName = (request.name || 'request').toLowerCase().replace(/[^a-z0-9]/g, '_');
      filename = `${sanitizedName}_${selectedVariant.id}.${selectedVariant.extension}`;
      mimeType = selectedVariant.mimeType;
    }

    const blob = new Blob([generatedCode], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-150">
      <div 
        className={`bg-[#121520] border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col transition-all ${
          isFullscreen ? 'w-full h-full max-w-none max-h-none rounded-none' : 'w-full max-w-5xl h-[88vh]'
        }`}
      >
        {/* Modal Top Header */}
        <div className="px-6 py-3.5 border-b border-white/10 bg-[#161a28] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-orange-500/20 border border-orange-500/30 flex items-center justify-center text-orange-400">
              <Code2 className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-bold text-white text-sm">Export as Code / Code Snippet</h2>
                <span className="px-2 py-0.5 rounded bg-orange-500/20 text-orange-300 font-mono text-[10px] uppercase font-bold">
                  Postman Compatible
                </span>
              </div>
              <p className="text-xs text-zinc-400">
                Generate production-ready API request code for multiple languages, libraries, and frameworks
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/5 transition-colors"
              title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/5 transition-colors"
              title="Close modal (Esc)"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Mode Selector (Single Request vs Entire Collection) */}
        <div className="px-6 py-2.5 bg-[#10131d] border-b border-white/10 flex flex-wrap items-center justify-between gap-3 text-xs shrink-0">
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setExportMode('single')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-colors flex items-center gap-1.5 ${
                exportMode === 'single'
                  ? 'bg-orange-500 text-white shadow-sm'
                  : 'text-zinc-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <FileCode className="w-3.5 h-3.5" />
              <span>Current Request ({request.method})</span>
            </button>

            {collection && (
              <>
                <button
                  onClick={() => setExportMode('collection_bash')}
                  className={`px-3 py-1.5 rounded-lg font-medium transition-colors flex items-center gap-1.5 ${
                    exportMode === 'collection_bash'
                      ? 'bg-orange-500 text-white shadow-sm'
                      : 'text-zinc-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <Terminal className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Collection Bash Script</span>
                </button>

                <button
                  onClick={() => setExportMode('collection_node')}
                  className={`px-3 py-1.5 rounded-lg font-medium transition-colors flex items-center gap-1.5 ${
                    exportMode === 'collection_node'
                      ? 'bg-orange-500 text-white shadow-sm'
                      : 'text-zinc-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <Layers className="w-3.5 h-3.5 text-amber-400" />
                  <span>Collection Node.js Suite</span>
                </button>

                <button
                  onClick={() => setExportMode('collection_postman')}
                  className={`px-3 py-1.5 rounded-lg font-medium transition-colors flex items-center gap-1.5 ${
                    exportMode === 'collection_postman'
                      ? 'bg-orange-500 text-white shadow-sm'
                      : 'text-zinc-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <Share2 className="w-3.5 h-3.5 text-blue-400" />
                  <span>Postman v2.1 JSON</span>
                </button>
              </>
            )}
          </div>

          {/* Action Toolbar */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowSettings(!showSettings)}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg border transition-colors ${
                showSettings 
                  ? 'bg-orange-500/20 text-orange-300 border-orange-500/30' 
                  : 'bg-white/5 hover:bg-white/10 border-white/10 text-zinc-300'
              }`}
              title="Code Generation Settings"
            >
              <Settings2 className="w-3.5 h-3.5" />
              <span>Settings</span>
            </button>

            <button
              onClick={handleDownload}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-lg font-medium transition-colors"
              title="Download Code File"
            >
              <Download className="w-3.5 h-3.5 text-zinc-300" />
              <span>Download File</span>
            </button>

            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 px-4 py-1.5 bg-orange-500 hover:bg-orange-600 text-white rounded-lg font-bold transition-colors shadow-md"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-white" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied to Clipboard!' : 'Copy Code'}</span>
            </button>
          </div>
        </div>

        {/* Optional Settings Drawer / Header */}
        {showSettings && (
          <div className="px-6 py-3 bg-[#181d2c] border-b border-white/10 grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            {/* Resolve Variables Toggle */}
            <div className="flex items-center justify-between bg-[#121520] p-2.5 rounded-xl border border-white/5">
              <div>
                <span className="font-semibold text-white block">Resolve Variables</span>
                <span className="text-[11px] text-zinc-400">Replace {'{{var}}'} with active values</span>
              </div>
              <input
                type="checkbox"
                checked={options.resolveVariables}
                onChange={e => setOptions({ ...options, resolveVariables: e.target.checked })}
                className="w-4 h-4 accent-orange-500 cursor-pointer"
              />
            </div>

            {/* Indentation Level */}
            <div className="flex items-center justify-between bg-[#121520] p-2.5 rounded-xl border border-white/5">
              <div>
                <span className="font-semibold text-white block">Indentation</span>
                <span className="text-[11px] text-zinc-400">Tabs or space width</span>
              </div>
              <select
                value={options.indent}
                onChange={e => setOptions({ ...options, indent: e.target.value as any })}
                className="bg-[#181d2c] border border-white/10 rounded px-2 py-1 text-white text-xs focus:outline-none focus:border-orange-500"
              >
                <option value="2">2 Spaces</option>
                <option value="4">4 Spaces</option>
                <option value="tab">Tab</option>
              </select>
            </div>

            {/* Multi-line wrapping */}
            <div className="flex items-center justify-between bg-[#121520] p-2.5 rounded-xl border border-white/5">
              <div>
                <span className="font-semibold text-white block">Line Continuation</span>
                <span className="text-[11px] text-zinc-400">Break headers onto new lines</span>
              </div>
              <input
                type="checkbox"
                checked={options.lineContinuation}
                onChange={e => setOptions({ ...options, lineContinuation: e.target.checked })}
                className="w-4 h-4 accent-orange-500 cursor-pointer"
              />
            </div>
          </div>
        )}

        {/* Main Body: Left Language List & Right Code Preview */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left Sidebar (Only in Single Request Mode) */}
          {exportMode === 'single' && (
            <div className="w-64 bg-[#0e1017] border-r border-white/10 flex flex-col shrink-0">
              {/* Search Bar */}
              <div className="p-3 border-b border-white/10">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search languages..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className="w-full bg-[#161a28] border border-white/10 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-orange-500"
                  />
                </div>
              </div>

              {/* Variant Language List */}
              <div className="flex-1 overflow-y-auto p-2 space-y-0.5 text-xs">
                {filteredVariants.map(v => {
                  const isSelected = selectedVariantId === v.id;
                  return (
                    <button
                      key={v.id}
                      onClick={() => setSelectedVariantId(v.id)}
                      className={`w-full text-left px-3 py-2 rounded-lg flex items-center justify-between group transition-colors ${
                        isSelected
                          ? 'bg-orange-500/20 text-orange-300 font-semibold border border-orange-500/30'
                          : 'text-zinc-400 hover:bg-white/5 hover:text-white'
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate">
                        <span className="w-1.5 h-1.5 rounded-full bg-orange-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                        <span className="truncate">{v.name}</span>
                      </div>
                      <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-white/5 text-zinc-500 group-hover:text-zinc-300">
                        .{v.extension}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Right Area: Code Display */}
          <div className="flex-1 bg-[#090b10] flex flex-col overflow-hidden">
            {/* Header info bar */}
            <div className="px-4 py-2 border-b border-white/5 bg-[#0e111a] flex items-center justify-between text-xs text-zinc-400 font-mono shrink-0">
              <div className="flex items-center gap-2">
                <span className="text-orange-400 font-semibold">
                  {exportMode === 'single' ? selectedVariant.name : exportMode.replace('_', ' ').toUpperCase()}
                </span>
                <span>•</span>
                <span>{codeLines.length} lines</span>
                <span>•</span>
                <span>{new Blob([generatedCode]).size} bytes</span>
              </div>

              <div className="flex items-center gap-2 text-zinc-500">
                <span>Variables: {options.resolveVariables ? 'Resolved' : 'Raw {{placeholder}}'}</span>
              </div>
            </div>

            {/* Code lines and editor view */}
            <div className="flex-1 overflow-auto flex text-xs font-mono select-text">
              {/* Line numbers gutter */}
              <div className="py-4 pl-3 pr-2 text-right text-zinc-600 select-none bg-[#0a0c12] border-r border-white/5">
                {codeLines.map((_, i) => (
                  <div key={i} className="leading-relaxed text-[11px]">
                    {i + 1}
                  </div>
                ))}
              </div>

              {/* Code Content */}
              <div className="p-4 flex-1 overflow-x-auto text-emerald-300 leading-relaxed whitespace-pre selection:bg-orange-500/30">
                {generatedCode}
              </div>
            </div>
          </div>
        </div>

        {/* Footer info bar */}
        <div className="px-6 py-3 bg-[#141824] border-t border-white/10 flex items-center justify-between text-xs shrink-0">
          <div className="flex items-center gap-2 text-zinc-400">
            <Sparkles className="w-3.5 h-3.5 text-orange-400" />
            <span>Click <strong>Copy Code</strong> or <strong>Download File</strong> to integrate directly into your backend or tests.</span>
          </div>

          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-lg font-medium transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
