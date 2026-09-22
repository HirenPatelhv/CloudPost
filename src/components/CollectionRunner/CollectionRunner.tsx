import React, { useState } from 'react';
import { Collection, Variable, ApiResponse, TestResult } from '../../types';
import { executeRequest } from '../../services/apiRunner';
import { saveExecutionHistoryRecord } from '../../services/dbStorage';
import { 
  Play, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Activity, 
  RotateCw, 
  Layers, 
  Download
} from 'lucide-react';

interface CollectionRunnerProps {
  collection: Collection;
  variables: Variable[];
  onClose?: () => void;
  onResponseExecuted?: (requestId: string, response: ApiResponse) => void;
}

interface RunResultItem {
  requestId: string;
  requestName: string;
  method: string;
  url: string;
  response?: ApiResponse;
  status?: 'pending' | 'running' | 'success' | 'failed';
  error?: string;
}

export const CollectionRunner: React.FC<CollectionRunnerProps> = ({ collection, variables, onResponseExecuted }) => {
  const [isRunning, setIsRunning] = useState(false);
  const [iterations, setIterations] = useState(1);
  const [delayMs, setDelayMs] = useState(100);
  const [results, setResults] = useState<RunResultItem[]>([]);
  const [currentRunIndex, setCurrentRunIndex] = useState(-1);

  // Flatten all requests in collection (both root requests and nested folder requests)
  const allRequests = [
    ...collection.requests,
    ...collection.folders.flatMap(f => f.requests),
  ];

  const handleStartRun = async () => {
    setIsRunning(true);
    const initialList: RunResultItem[] = allRequests.map(r => ({
      requestId: r.id,
      requestName: r.name,
      method: r.method,
      url: r.url,
      status: 'pending',
    }));
    setResults(initialList);

    const updatedList = [...initialList];

    for (let i = 0; i < allRequests.length; i++) {
      setCurrentRunIndex(i);
      updatedList[i].status = 'running';
      setResults([...updatedList]);

      if (delayMs > 0 && i > 0) {
        await new Promise(res => setTimeout(res, delayMs));
      }

      try {
        const req = allRequests[i];
        const res = await executeRequest(req, variables);
        onResponseExecuted?.(req.id, res);
        const hasFailedTests = res.testResults?.some(t => !t.passed);
        updatedList[i].response = res;
        updatedList[i].status = res.status >= 200 && res.status < 400 && !hasFailedTests ? 'success' : 'failed';

        // Persist run details to database
        saveExecutionHistoryRecord({
          id: 'hist_runner_' + Date.now() + '_' + i,
          name: `[Runner] ${req.name}`,
          method: req.method,
          url: req.url,
          statusCode: res.status,
          responseTimeMs: res.time,
          responseSizeBytes: res.size,
          request: req,
          response: res,
          executedAt: new Date().toISOString(),
        });
      } catch (err: any) {
        updatedList[i].status = 'failed';
        updatedList[i].error = err.message || 'Execution error';
      }
      setResults([...updatedList]);
    }

    setIsRunning(false);
    setCurrentRunIndex(-1);
  };

  const completedCount = results.filter(r => r.status === 'success' || r.status === 'failed').length;
  const passedCount = results.filter(r => r.status === 'success').length;
  const failedCount = results.filter(r => r.status === 'failed').length;
  const totalDuration = results.reduce((acc, curr) => acc + (curr.response?.time || 0), 0);

  const handleExportReport = () => {
    const report = {
      collection: collection.name,
      executedAt: new Date().toISOString(),
      summary: {
        totalRequests: allRequests.length,
        passed: passedCount,
        failed: failedCount,
        totalDurationMs: totalDuration,
      },
      runs: results,
    };
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `collection_run_report_${collection.id}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="h-full flex flex-col bg-[#0b0d13] text-[#e1e4ea] overflow-y-auto">
      {/* Runner Header */}
      <div className="p-6 border-b border-white/10 bg-[#121622] shrink-0">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-orange-400 mb-1">
              <Layers className="w-4 h-4" />
              <span>Collection Test Runner</span>
            </div>
            <h1 className="text-xl font-bold text-white">{collection.name}</h1>
            <p className="text-xs text-zinc-400 mt-0.5">
              Execute all {allRequests.length} endpoints sequentially and validate automated assertion test suites.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-[#1a2030] px-3 py-1.5 rounded-lg border border-white/10 text-xs">
              <span className="text-zinc-400">Delay:</span>
              <input
                type="number"
                value={delayMs}
                onChange={e => setDelayMs(Math.max(0, parseInt(e.target.value) || 0))}
                className="w-16 bg-[#0e111a] border border-white/10 rounded px-2 py-0.5 text-white font-mono text-xs focus:outline-none"
              />
              <span className="text-zinc-500">ms</span>
            </div>

            <button
              onClick={handleStartRun}
              disabled={isRunning}
              className="flex items-center gap-1.5 px-5 py-2 bg-orange-500 hover:bg-orange-600 disabled:bg-orange-500/50 text-white rounded-lg text-xs font-bold transition-all shadow-md"
            >
              {isRunning ? (
                <>
                  <RotateCw className="w-4 h-4 animate-spin" />
                  <span>Running ({completedCount}/{allRequests.length})...</span>
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 fill-white" />
                  <span>Run {collection.name}</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Main Results / Stats Area */}
      <div className="max-w-5xl mx-auto p-6 w-full space-y-6">
        {/* Progress Bar & Metric Cards */}
        {results.length > 0 && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
              <div className="bg-[#141824] p-4 rounded-xl border border-white/10">
                <div className="text-zinc-400 text-[11px] mb-1">Total Executed</div>
                <div className="text-2xl font-bold text-white font-mono">
                  {completedCount} / {allRequests.length}
                </div>
              </div>
              <div className="bg-[#141824] p-4 rounded-xl border border-emerald-500/20">
                <div className="text-emerald-400 text-[11px] mb-1 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Passed Requests
                </div>
                <div className="text-2xl font-bold text-emerald-400 font-mono">
                  {passedCount}
                </div>
              </div>
              <div className="bg-[#141824] p-4 rounded-xl border border-red-500/20">
                <div className="text-red-400 text-[11px] mb-1 flex items-center gap-1">
                  <XCircle className="w-3.5 h-3.5" /> Failed Requests
                </div>
                <div className="text-2xl font-bold text-red-400 font-mono">
                  {failedCount}
                </div>
              </div>
              <div className="bg-[#141824] p-4 rounded-xl border border-white/10">
                <div className="text-zinc-400 text-[11px] mb-1 flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" /> Total Latency
                </div>
                <div className="text-2xl font-bold text-white font-mono">
                  {totalDuration} ms
                </div>
              </div>
            </div>

            {/* Run Progress Bar */}
            <div className="w-full bg-[#1a2030] rounded-full h-2 overflow-hidden border border-white/5">
              <div
                className="bg-orange-500 h-full transition-all duration-300 rounded-full"
                style={{ width: `${(completedCount / allRequests.length) * 100}%` }}
              ></div>
            </div>

            {completedCount === allRequests.length && (
              <div className="flex justify-end">
                <button
                  onClick={handleExportReport}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-xs text-white font-medium transition-colors"
                >
                  <Download className="w-3.5 h-3.5 text-orange-400" />
                  <span>Export Test Report (JSON)</span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* Requests Execution Table */}
        <div className="bg-[#141824] border border-white/10 rounded-xl overflow-hidden shadow-xl">
          <div className="px-4 py-3 bg-[#181d2c] border-b border-white/10 flex items-center justify-between text-xs font-semibold text-zinc-300">
            <span>Execution Sequence ({allRequests.length} Endpoints)</span>
            <span>Status & Assertions</span>
          </div>

          <div className="divide-y divide-white/5 text-xs">
            {allRequests.map((req, idx) => {
              const resItem = results.find(r => r.requestId === req.id);
              const status = resItem?.status || 'idle';

              return (
                <div
                  key={req.id}
                  className={`p-4 flex items-center justify-between gap-4 transition-colors ${
                    status === 'running'
                      ? 'bg-orange-500/10'
                      : status === 'success'
                      ? 'bg-emerald-500/5'
                      : status === 'failed'
                      ? 'bg-red-500/5'
                      : 'hover:bg-white/5'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="font-mono text-zinc-500 text-[11px] w-5">
                      #{idx + 1}
                    </span>
                    <span
                      className={`font-mono font-bold text-[10px] px-2 py-0.5 rounded ${
                        req.method === 'GET'
                          ? 'bg-emerald-500/20 text-emerald-400'
                          : req.method === 'POST'
                          ? 'bg-amber-500/20 text-amber-400'
                          : req.method === 'PUT'
                          ? 'bg-blue-500/20 text-blue-400'
                          : 'bg-red-500/20 text-red-400'
                      }`}
                    >
                      {req.method}
                    </span>
                    <div className="truncate">
                      <div className="font-semibold text-white truncate">{req.name}</div>
                      <div className="text-[11px] text-zinc-500 font-mono truncate">{req.url}</div>
                    </div>
                  </div>

                  {/* Status Indicator */}
                  <div className="flex items-center gap-3 shrink-0">
                    {resItem?.response && (
                      <span className="text-zinc-400 font-mono text-[11px]">
                        {resItem.response.time} ms
                      </span>
                    )}

                    {status === 'idle' && (
                      <span className="text-zinc-500 text-[11px]">Queued</span>
                    )}

                    {status === 'running' && (
                      <span className="text-orange-400 text-[11px] font-bold flex items-center gap-1">
                        <RotateCw className="w-3 h-3 animate-spin" /> Running
                      </span>
                    )}

                    {status === 'success' && (
                      <div className="flex items-center gap-1.5 text-emerald-400 text-xs font-semibold">
                        <CheckCircle2 className="w-4 h-4" />
                        <span>{resItem?.response?.status || 200} OK</span>
                      </div>
                    )}

                    {status === 'failed' && (
                      <div className="flex items-center gap-1.5 text-red-400 text-xs font-semibold">
                        <XCircle className="w-4 h-4" />
                        <span>{resItem?.response?.status || 'Failed'}</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
