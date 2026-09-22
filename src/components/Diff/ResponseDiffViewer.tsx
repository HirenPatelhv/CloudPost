import React, { useState } from 'react';
import { 
  GitCompare, 
  ArrowLeftRight, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  Layers, 
  Copy, 
  Check, 
  RotateCcw,
  Zap,
  TrendingDown,
  TrendingUp,
  Columns,
  Maximize2
} from 'lucide-react';
import { ApiResponse } from '../../types';

interface ResponseDiffItem {
  id: string;
  name?: string;
  method?: string;
  request?: { method: string; name: string };
  response?: ApiResponse;
  responseSnapshot?: ApiResponse;
}

interface ResponseDiffViewerProps {
  currentResponse?: ApiResponse | null;
  historyItems?: ResponseDiffItem[];
}

export const ResponseDiffViewer: React.FC<ResponseDiffViewerProps> = ({
  currentResponse,
  historyItems = [],
}) => {
  const [selectedHistoryIdA, setSelectedHistoryIdA] = useState<string>('current');
  const [selectedHistoryIdB, setSelectedHistoryIdB] = useState<string>(
    historyItems[0]?.id || ''
  );
  const [diffViewMode, setDiffViewMode] = useState<'split' | 'unified'>('split');
  const [copiedSide, setCopiedSide] = useState<'left' | 'right' | null>(null);

  const resolveResponse = (id: string): ApiResponse | null => {
    if (id === 'current') return currentResponse || null;
    const item = historyItems.find(h => h.id === id);
    if (!item) return null;
    return item.responseSnapshot || item.response || null;
  };

  // Resolve Response A
  const responseA = resolveResponse(selectedHistoryIdA);

  // Resolve Response B
  const responseB = resolveResponse(selectedHistoryIdB);

  const rawA = responseA?.rawBody || (responseA?.data ? JSON.stringify(responseA.data, null, 2) : '');
  const rawB = responseB?.rawBody || (responseB?.data ? JSON.stringify(responseB.data, null, 2) : '');

  const linesA = rawA.split('\n');
  const linesB = rawB.split('\n');
  const maxLines = Math.max(linesA.length, linesB.length);

  const handleCopy = (text: string, side: 'left' | 'right') => {
    navigator.clipboard.writeText(text);
    setCopiedSide(side);
    setTimeout(() => setCopiedSide(null), 2000);
  };

  const statusDiff = responseA && responseB ? responseB.status - responseA.status : 0;
  const timeDiff = responseA && responseB ? responseB.time - responseA.time : 0;
  const sizeDiff = responseA && responseB ? responseB.size - responseA.size : 0;

  return (
    <div id="response-diff-viewer" className="flex flex-col h-full bg-[#0d1017] text-zinc-100 select-text overflow-hidden">
      {/* Top Header & Snapshot Selectors */}
      <div className="p-4 bg-[#141722] border-b border-white/10 shrink-0 space-y-3 shadow-md">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <GitCompare className="w-5 h-5 text-orange-400" />
            <h2 className="text-base font-bold text-white">Response Diff Inspector</h2>
            <span className="text-[10px] bg-orange-500/10 text-orange-400 border border-orange-500/20 px-2 py-0.5 rounded-full font-mono">
              Payload & Header Comparison
            </span>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center bg-[#0d1017] border border-white/10 rounded-lg p-0.5 text-xs">
              <button
                type="button"
                onClick={() => setDiffViewMode('split')}
                className={`px-2.5 py-1 rounded-md transition-colors flex items-center gap-1 ${
                  diffViewMode === 'split' ? 'bg-orange-500/20 text-orange-400 font-semibold' : 'text-zinc-400 hover:text-white'
                }`}
              >
                <Columns className="w-3.5 h-3.5" />
                <span>Side-by-Side</span>
              </button>
              <button
                type="button"
                onClick={() => setDiffViewMode('unified')}
                className={`px-2.5 py-1 rounded-md transition-colors flex items-center gap-1 ${
                  diffViewMode === 'unified' ? 'bg-orange-500/20 text-orange-400 font-semibold' : 'text-zinc-400 hover:text-white'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Unified</span>
              </button>
            </div>
          </div>
        </div>

        {/* Snapshot Selectors Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-white/5 text-xs">
          {/* Base Snapshot A */}
          <div className="flex items-center gap-2">
            <span className="text-zinc-400 font-medium shrink-0">Base (Snapshot A):</span>
            <select
              value={selectedHistoryIdA}
              onChange={e => setSelectedHistoryIdA(e.target.value)}
              className="flex-1 bg-[#0d1017] border border-white/10 rounded px-2.5 py-1 text-zinc-200 focus:outline-none focus:border-orange-500"
            >
              <option value="current">Current Active Tab Response</option>
              {historyItems.map((h, i) => {
                const method = h.method || h.request?.method || 'REQ';
                const name = h.name || h.request?.name || 'Request';
                const resp = h.responseSnapshot || h.response;
                const status = resp?.status || (h as any).status || 200;
                const time = resp?.time || (h as any).time || 0;
                return (
                  <option key={h.id} value={h.id}>
                    #{historyItems.length - i} [{method}] {name} ({status} - {time}ms)
                  </option>
                );
              })}
            </select>
          </div>

          {/* Comparison Snapshot B */}
          <div className="flex items-center gap-2">
            <span className="text-zinc-400 font-medium shrink-0">Compare (Snapshot B):</span>
            <select
              value={selectedHistoryIdB}
              onChange={e => setSelectedHistoryIdB(e.target.value)}
              className="flex-1 bg-[#0d1017] border border-white/10 rounded px-2.5 py-1 text-zinc-200 focus:outline-none focus:border-orange-500"
            >
              <option value="current">Current Active Tab Response</option>
              {historyItems.map((h, i) => {
                const method = h.method || h.request?.method || 'REQ';
                const name = h.name || h.request?.name || 'Request';
                const resp = h.responseSnapshot || h.response;
                const status = resp?.status || (h as any).status || 200;
                const time = resp?.time || (h as any).time || 0;
                return (
                  <option key={h.id} value={h.id}>
                    #{historyItems.length - i} [{method}] {name} ({status} - {time}ms)
                  </option>
                );
              })}
            </select>
          </div>
        </div>
      </div>

      {/* Metrics Delta Ribbon */}
      <div className="px-4 py-2 bg-[#10131c] border-b border-white/5 flex flex-wrap items-center justify-between gap-3 text-xs shrink-0">
        <div className="flex items-center gap-6">
          {/* Status Delta */}
          <div className="flex items-center gap-2">
            <span className="text-zinc-500">Status:</span>
            <span className="font-mono text-zinc-300">{responseA?.status || '-'} → {responseB?.status || '-'}</span>
            {statusDiff !== 0 && (
              <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${statusDiff > 0 ? 'bg-amber-500/20 text-amber-400' : 'bg-rose-500/20 text-rose-400'}`}>
                {statusDiff > 0 ? `+${statusDiff}` : statusDiff}
              </span>
            )}
          </div>

          {/* Latency Delta */}
          <div className="flex items-center gap-2">
            <span className="text-zinc-500">Latency:</span>
            <span className="font-mono text-zinc-300">{responseA?.time || 0}ms → {responseB?.time || 0}ms</span>
            {timeDiff !== 0 && (
              <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold flex items-center gap-0.5 ${timeDiff > 0 ? 'bg-rose-500/20 text-rose-400' : 'bg-emerald-500/20 text-emerald-400'}`}>
                {timeDiff > 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                {timeDiff > 0 ? `+${timeDiff}ms` : `${timeDiff}ms`}
              </span>
            )}
          </div>

          {/* Size Delta */}
          <div className="flex items-center gap-2">
            <span className="text-zinc-500">Size:</span>
            <span className="font-mono text-zinc-300">{responseA?.size || 0} B → {responseB?.size || 0} B</span>
            {sizeDiff !== 0 && (
              <span className="text-zinc-400 text-[10px] font-mono">
                ({sizeDiff > 0 ? `+${sizeDiff}` : sizeDiff} B)
              </span>
            )}
          </div>
        </div>

        <div className="text-[11px] text-zinc-500">
          Comparing {linesA.length} lines vs {linesB.length} lines
        </div>
      </div>

      {/* Main Diff Display */}
      <div className="flex-1 overflow-hidden flex flex-col">
        {(!responseA && !responseB) ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-8 text-zinc-500">
            <GitCompare className="w-12 h-12 mb-3 text-zinc-700" />
            <p className="text-sm font-medium text-zinc-400 mb-1">No Responses to Compare</p>
            <p className="text-xs text-zinc-600 max-w-sm">
              Execute a request in the studio or select responses from your execution history above to view side-by-side diffs.
            </p>
          </div>
        ) : diffViewMode === 'split' ? (
          /* Side-by-Side Split View */
          <div className="flex-1 flex overflow-hidden">
            {/* Left Snapshot */}
            <div className="flex-1 flex flex-col border-r border-white/10 overflow-hidden bg-[#0a0c12]">
              <div className="px-4 py-2 bg-[#121520] border-b border-white/5 flex items-center justify-between text-xs">
                <span className="font-semibold text-zinc-300">Base Snapshot A</span>
                <button
                  type="button"
                  onClick={() => handleCopy(rawA, 'left')}
                  className="p-1 text-zinc-400 hover:text-white rounded hover:bg-white/5 transition-colors flex items-center gap-1"
                >
                  {copiedSide === 'left' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span className="text-[10px]">Copy</span>
                </button>
              </div>
              <div className="flex-1 overflow-auto p-3 font-mono text-xs leading-relaxed">
                {Array.from({ length: maxLines }).map((_, i) => {
                  const lineA = linesA[i];
                  const lineB = linesB[i];
                  const isDiff = lineA !== lineB;
                  return (
                    <div
                      key={i}
                      className={`flex items-start px-2 py-0.5 rounded ${
                        lineA === undefined ? 'bg-zinc-900/40 text-zinc-600 select-none' :
                        isDiff ? 'bg-rose-950/30 text-rose-300' : 'text-zinc-300'
                      }`}
                    >
                      <span className="w-8 shrink-0 text-zinc-600 select-none text-[10px]">{i + 1}</span>
                      <pre className="flex-1 overflow-x-auto whitespace-pre">{lineA ?? ''}</pre>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Right Snapshot */}
            <div className="flex-1 flex flex-col overflow-hidden bg-[#0d1017]">
              <div className="px-4 py-2 bg-[#121520] border-b border-white/5 flex items-center justify-between text-xs">
                <span className="font-semibold text-zinc-300">Compare Snapshot B</span>
                <button
                  type="button"
                  onClick={() => handleCopy(rawB, 'right')}
                  className="p-1 text-zinc-400 hover:text-white rounded hover:bg-white/5 transition-colors flex items-center gap-1"
                >
                  {copiedSide === 'right' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span className="text-[10px]">Copy</span>
                </button>
              </div>
              <div className="flex-1 overflow-auto p-3 font-mono text-xs leading-relaxed">
                {Array.from({ length: maxLines }).map((_, i) => {
                  const lineA = linesA[i];
                  const lineB = linesB[i];
                  const isDiff = lineA !== lineB;
                  return (
                    <div
                      key={i}
                      className={`flex items-start px-2 py-0.5 rounded ${
                        lineB === undefined ? 'bg-zinc-900/40 text-zinc-600 select-none' :
                        isDiff ? 'bg-emerald-950/30 text-emerald-300' : 'text-zinc-300'
                      }`}
                    >
                      <span className="w-8 shrink-0 text-zinc-600 select-none text-[10px]">{i + 1}</span>
                      <pre className="flex-1 overflow-x-auto whitespace-pre">{lineB ?? ''}</pre>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        ) : (
          /* Unified Diff View */
          <div className="flex-1 overflow-auto p-4 bg-[#0a0c12] font-mono text-xs leading-relaxed">
            {Array.from({ length: maxLines }).map((_, i) => {
              const lineA = linesA[i];
              const lineB = linesB[i];
              const isDiff = lineA !== lineB;

              if (!isDiff && lineA !== undefined) {
                return (
                  <div key={i} className="flex items-start px-2 py-0.5 text-zinc-400">
                    <span className="w-8 shrink-0 text-zinc-600 select-none text-[10px]">{i + 1}</span>
                    <pre className="flex-1 overflow-x-auto whitespace-pre">{lineA}</pre>
                  </div>
                );
              }

              return (
                <React.Fragment key={i}>
                  {lineA !== undefined && (
                    <div className="flex items-start px-2 py-0.5 bg-rose-950/40 text-rose-300 rounded">
                      <span className="w-8 shrink-0 text-rose-500 select-none text-[10px]">- {i + 1}</span>
                      <pre className="flex-1 overflow-x-auto whitespace-pre">{lineA}</pre>
                    </div>
                  )}
                  {lineB !== undefined && (
                    <div className="flex items-start px-2 py-0.5 bg-emerald-950/40 text-emerald-300 rounded">
                      <span className="w-8 shrink-0 text-emerald-500 select-none text-[10px]">+ {i + 1}</span>
                      <pre className="flex-1 overflow-x-auto whitespace-pre">{lineB}</pre>
                    </div>
                  )}
                </React.Fragment>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
