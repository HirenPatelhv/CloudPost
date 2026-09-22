import React, { useState, useEffect } from 'react';
import { 
  Activity, 
  Play, 
  Pause, 
  Plus, 
  Trash2, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  TrendingUp, 
  RefreshCw, 
  Calendar, 
  Layers,
  ArrowRight
} from 'lucide-react';
import { Collection, Environment, CollectionMonitor, MonitorRunRecord, ApiResponse } from '../../types';
import { executeRequest } from '../../services/apiRunner';

interface CollectionMonitorProps {
  collections: Collection[];
  environments: Environment[];
  workspaceId: string;
  onRequestExecuted?: (requestId: string, response: ApiResponse) => void;
}

const INITIAL_MONITORS: CollectionMonitor[] = [];

export const CollectionMonitorView: React.FC<CollectionMonitorProps> = ({
  collections,
  environments,
  workspaceId,
  onRequestExecuted,
}) => {
  const [monitors, setMonitors] = useState<CollectionMonitor[]>(() => {
    const saved = localStorage.getItem('cp_monitors');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed.filter((m: CollectionMonitor) => m.id !== 'mon_core_api');
        }
      } catch (e) {}
    }
    return INITIAL_MONITORS;
  });

  const [activeMonitorId, setActiveMonitorId] = useState<string>(() => {
    return monitors[0]?.id || '';
  });

  const [isRunningManual, setIsRunningManual] = useState(false);

  useEffect(() => {
    localStorage.setItem('cp_monitors', JSON.stringify(monitors));
  }, [monitors]);

  const activeMonitor = monitors.find(m => m.id === activeMonitorId) || monitors[0];
  const targetCollection = collections.find(c => c.id === activeMonitor?.collectionId);

  const handleCreateMonitor = () => {
    if (!collections.length) {
      alert('Please create at least one collection before setting up a monitor.');
      return;
    }

    const name = prompt('Enter Monitor Name:', 'Automated SLA Monitor');
    if (!name?.trim()) return;

    const newId = 'mon_' + Math.random().toString(36).substring(2, 9);
    const newMon: CollectionMonitor = {
      id: newId,
      name: name.trim(),
      collectionId: collections[0].id,
      workspaceId,
      schedule: '15m',
      status: 'active',
      createdAt: new Date().toISOString(),
      history: []
    };

    setMonitors(prev => [...prev, newMon]);
    setActiveMonitorId(newId);
  };

  const handleToggleStatus = (id: string) => {
    setMonitors(prev => prev.map(m => {
      if (m.id !== id) return m;
      return {
        ...m,
        status: m.status === 'active' ? 'paused' : 'active'
      };
    }));
  };

  const handleDeleteMonitor = (id: string) => {
    if (!confirm('Are you sure you want to delete this monitor?')) return;
    setMonitors(prev => prev.filter(m => m.id !== id));
    setActiveMonitorId('');
  };

  const handleRunMonitorNow = async () => {
    if (!activeMonitor || !targetCollection) return;
    setIsRunningManual(true);

    const allRequests = [
      ...targetCollection.requests,
      ...targetCollection.folders.flatMap(f => f.requests)
    ];

    if (!allRequests.length) {
      alert('Selected collection has no requests to run.');
      setIsRunningManual(false);
      return;
    }

    let totalPassed = 0;
    let totalFailed = 0;
    let totalTimeMs = 0;

    for (const req of allRequests) {
      try {
        const res = await executeRequest(req, targetCollection.variables || []);
        onRequestExecuted?.(req.id, res);
        totalTimeMs += res.time;
        const failedInReq = res.testResults.filter(t => !t.passed).length;
        const passedInReq = res.testResults.filter(t => t.passed).length;
        totalPassed += passedInReq;
        totalFailed += failedInReq;
        if (res.status >= 400 && res.testResults.length === 0) {
          totalFailed++;
        }
      } catch {
        totalFailed++;
      }
    }

    const avgTime = Math.round(totalTimeMs / allRequests.length);
    const runRecord: MonitorRunRecord = {
      id: 'run_' + Math.random().toString(36).substring(2, 8),
      monitorId: activeMonitor.id,
      timestamp: new Date().toISOString(),
      status: totalFailed === 0 ? 'passed' : 'failed',
      totalRequests: allRequests.length,
      passedTests: totalPassed,
      failedTests: totalFailed,
      avgResponseTimeMs: avgTime,
    };

    setMonitors(prev => prev.map(m => {
      if (m.id !== activeMonitor.id) return m;
      return {
        ...m,
        lastRunAt: runRecord.timestamp,
        lastRunStatus: runRecord.status,
        history: [runRecord, ...(m.history || [])].slice(0, 50)
      };
    }));

    setIsRunningManual(false);
  };

  // Uptime & metric calculations
  const runs = activeMonitor?.history || [];
  const passedRuns = runs.filter(r => r.status === 'passed').length;
  const uptimePercent = runs.length > 0 ? Math.round((passedRuns / runs.length) * 100) : 100;
  const avgLatency = runs.length > 0 
    ? Math.round(runs.reduce((acc, r) => acc + r.avgResponseTimeMs, 0) / runs.length)
    : 0;

  return (
    <div className="h-full flex flex-col bg-[#0b0d14] text-zinc-200 overflow-hidden font-sans">
      {/* Top Header */}
      <div className="p-3.5 border-b border-white/10 bg-[#121522] flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-teal-500/10 border border-teal-500/30 flex items-center justify-center text-teal-400">
            <Activity className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-bold text-sm text-white">Postman Collection Monitors</h2>
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-teal-500/10 text-teal-400 border border-teal-500/20">
                Continuous Testing & SLAs
              </span>
            </div>
            <p className="text-xs text-zinc-400">
              Automate API collection test execution on a periodic schedule to track uptime, performance, and regressions.
            </p>
          </div>
        </div>

        <button
          onClick={handleCreateMonitor}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-teal-600 hover:bg-teal-500 text-white rounded-lg text-xs font-bold transition-colors shadow"
        >
          <Plus className="w-3.5 h-3.5" />
          Create Monitor
        </button>
      </div>

      {/* Main Split */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        {/* Left: Monitors List */}
        <div className="w-full md:w-80 border-b md:border-b-0 md:border-r border-white/10 flex flex-col bg-[#0e101a]">
          <div className="p-2.5 border-b border-white/10 flex items-center justify-between bg-[#131625]">
            <span className="text-xs font-bold text-zinc-300 uppercase tracking-wider">
              Monitors ({monitors.length})
            </span>
          </div>

          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {monitors.map(m => {
              const isSelected = m.id === activeMonitorId;
              return (
                <div
                  key={m.id}
                  onClick={() => setActiveMonitorId(m.id)}
                  className={`p-3 rounded-lg cursor-pointer border transition-all ${
                    isSelected
                      ? 'bg-white/10 border-teal-500/40 text-white shadow-sm'
                      : 'bg-white/5 border-transparent hover:bg-white/[0.07] text-zinc-300'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-xs truncate text-white">{m.name}</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold ${
                      m.status === 'active' ? 'bg-teal-500/20 text-teal-300' : 'bg-zinc-700 text-zinc-400'
                    }`}>
                      {m.status}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-zinc-400">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" /> Every {m.schedule}
                    </span>
                    {m.lastRunStatus && (
                      <span className={`flex items-center gap-1 font-semibold ${
                        m.lastRunStatus === 'passed' ? 'text-emerald-400' : 'text-rose-400'
                      }`}>
                        {m.lastRunStatus === 'passed' ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                        {m.lastRunStatus}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Monitor Details, Stats & Run History */}
        {activeMonitor ? (
          <div className="flex-1 flex flex-col bg-[#07090f] overflow-y-auto p-4 space-y-4">
            {/* Top Action Card */}
            <div className="p-4 rounded-xl bg-[#111422] border border-white/10 flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-bold text-white">{activeMonitor.name}</h3>
                <div className="flex items-center gap-3 text-xs text-zinc-400 mt-1">
                  <span>Collection: <strong className="text-zinc-200">{targetCollection?.name || 'Unassigned'}</strong></span>
                  <span>•</span>
                  <span>Interval: <strong className="text-teal-300">Every {activeMonitor.schedule}</strong></span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleRunMonitorNow}
                  disabled={isRunningManual}
                  className="flex items-center gap-1.5 px-3.5 py-2 bg-teal-600 hover:bg-teal-500 disabled:opacity-50 text-white rounded-lg text-xs font-bold transition-colors shadow"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isRunningManual ? 'animate-spin' : ''}`} />
                  {isRunningManual ? 'Running...' : 'Run Monitor Now'}
                </button>

                <button
                  onClick={() => handleToggleStatus(activeMonitor.id)}
                  className="flex items-center gap-1.5 px-3 py-2 bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-300 rounded-lg text-xs font-medium transition-colors"
                >
                  {activeMonitor.status === 'active' ? <Pause className="w-3.5 h-3.5 text-amber-400" /> : <Play className="w-3.5 h-3.5 text-emerald-400" />}
                  {activeMonitor.status === 'active' ? 'Pause' : 'Resume'}
                </button>

                <button
                  onClick={() => handleDeleteMonitor(activeMonitor.id)}
                  className="p-2 hover:bg-white/10 rounded-lg text-zinc-400 hover:text-rose-400 transition-colors"
                  title="Delete Monitor"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* SLA Metric Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="p-3.5 rounded-xl bg-[#111422] border border-white/10">
                <span className="text-[11px] uppercase font-bold tracking-wider text-zinc-400 block mb-1">
                  Uptime & SLA
                </span>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-black text-emerald-400 font-mono">{uptimePercent}%</span>
                  <span className="text-xs text-zinc-500">all runs</span>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-[#111422] border border-white/10">
                <span className="text-[11px] uppercase font-bold tracking-wider text-zinc-400 block mb-1">
                  Average Latency
                </span>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-black text-teal-300 font-mono">{avgLatency} ms</span>
                  <span className="text-xs text-zinc-500">round trip</span>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-[#111422] border border-white/10">
                <span className="text-[11px] uppercase font-bold tracking-wider text-zinc-400 block mb-1">
                  Total Runs Recorded
                </span>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-black text-white font-mono">{runs.length}</span>
                  <span className="text-xs text-zinc-500">runs</span>
                </div>
              </div>
            </div>

            {/* Run History Table */}
            <div className="rounded-xl bg-[#111422] border border-white/10 overflow-hidden">
              <div className="p-3 border-b border-white/10 flex items-center justify-between">
                <span className="text-xs font-bold text-white uppercase tracking-wider">
                  Execution History
                </span>
                <span className="text-xs text-zinc-400">Showing last {runs.length} runs</span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-[#090b12] text-zinc-400 uppercase font-mono text-[10px]">
                    <tr>
                      <th className="py-2 px-3">Run Timestamp</th>
                      <th className="py-2 px-3">Status</th>
                      <th className="py-2 px-3">Requests</th>
                      <th className="py-2 px-3">Passed</th>
                      <th className="py-2 px-3">Failed</th>
                      <th className="py-2 px-3">Avg Latency</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 font-mono">
                    {runs.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-6 text-center text-zinc-500 font-sans">
                          No execution records yet. Click "Run Monitor Now" to perform the first automated test run.
                        </td>
                      </tr>
                    ) : (
                      runs.map(r => (
                        <tr key={r.id} className="hover:bg-white/[0.03] transition-colors">
                          <td className="py-2.5 px-3 text-zinc-300">
                            {new Date(r.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                          </td>
                          <td className="py-2.5 px-3">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              r.status === 'passed' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'
                            }`}>
                              {r.status.toUpperCase()}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-zinc-400">{r.totalRequests}</td>
                          <td className="py-2.5 px-3 text-emerald-400 font-bold">{r.passedTests}</td>
                          <td className="py-2.5 px-3 text-rose-400 font-bold">{r.failedTests}</td>
                          <td className="py-2.5 px-3 text-teal-300">{r.avgResponseTimeMs} ms</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-zinc-500">
            <Activity className="w-12 h-12 text-zinc-700 mb-2" />
            <p className="text-sm">Select or create a monitor to inspect automated health checks</p>
          </div>
        )}
      </div>
    </div>
  );
};
