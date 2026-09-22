import React, { useState, useEffect } from 'react';
import { APP_BASE_URL, getApiUrl } from '../../config';
import { 
  Server, 
  Plus, 
  Trash2, 
  Edit3, 
  Play, 
  Copy, 
  Check, 
  ExternalLink, 
  Sparkles, 
  Activity, 
  Clock, 
  ArrowRight, 
  Code,
  ToggleLeft,
  ToggleRight,
  Send,
  Zap
} from 'lucide-react';
import { MockServer, MockEndpoint, HttpMethod, KeyValueItem, ApiRequest } from '../../types';

interface MockServerManagerProps {
  workspaceId: string;
  onOpenRequestInBuilder?: (mockReq: Partial<ApiRequest>) => void;
}

const INITIAL_MOCK_SERVERS: MockServer[] = [];

const TEMPLATES = [
  {
    name: 'Success List (200)',
    body: JSON.stringify({ status: 'ok', data: [{ id: 1, name: 'Sample Item 1' }, { id: 2, name: 'Sample Item 2' }] }, null, 2),
    status: 200,
  },
  {
    name: 'Resource Created (201)',
    body: JSON.stringify({ message: 'Resource created successfully', id: 'res_' + Math.floor(Math.random() * 10000) }, null, 2),
    status: 201,
  },
  {
    name: 'Validation Error (400)',
    body: JSON.stringify({ error: 'Bad Request', fields: { email: 'Email address is invalid' } }, null, 2),
    status: 400,
  },
  {
    name: 'Server Error (500)',
    body: JSON.stringify({ error: 'Internal Server Error', referenceId: 'ERR-' + Math.floor(Math.random() * 900000) }, null, 2),
    status: 500,
  }
];

export const MockServerManager: React.FC<MockServerManagerProps> = ({
  workspaceId,
  onOpenRequestInBuilder,
}) => {
  const [mockServers, setMockServers] = useState<MockServer[]>(() => {
    const saved = localStorage.getItem('cp_mock_servers');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed.filter((s: MockServer) => s.id !== 'mock_srv_core');
        }
      } catch (e) {}
    }
    return INITIAL_MOCK_SERVERS;
  });

  const [activeServerId, setActiveServerId] = useState<string>(() => {
    return mockServers[0]?.id || '';
  });

  const [selectedEndpointId, setSelectedEndpointId] = useState<string | null>(() => {
    return mockServers[0]?.endpoints[0]?.id || null;
  });

  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);
  const [testingEndpoint, setTestingEndpoint] = useState(false);
  const [testResult, setTestResult] = useState<any>(null);

  // Sync to localStorage
  useEffect(() => {
    localStorage.setItem('cp_mock_servers', JSON.stringify(mockServers));
  }, [mockServers]);

  const activeServer = mockServers.find(s => s.id === activeServerId) || mockServers[0];
  const activeEndpoint = activeServer?.endpoints.find(e => e.id === selectedEndpointId) || activeServer?.endpoints[0];

  const handleCreateMockServer = () => {
    const name = prompt('Enter Mock Server Name:', 'New API Mock Server');
    if (!name?.trim()) return;

    const newId = 'mock_srv_' + Math.random().toString(36).substring(2, 9);
    const newServer: MockServer = {
      id: newId,
      workspaceId,
      name: name.trim(),
      description: 'Custom mock server for simulating backend endpoints.',
      baseUrl: (APP_BASE_URL || (typeof window !== 'undefined' ? window.location.origin : 'https://cloudpost.techvisionstudio.in')) + '/api/mock/' + newId,
      createdAt: new Date().toISOString(),
      endpoints: [
        {
          id: 'ep_' + Math.random().toString(36).substring(2, 8),
          name: 'Default Mock Route',
          method: 'GET',
          path: '/api/test',
          responseStatus: 200,
          responseDelayMs: 100,
          responseHeaders: [
            { id: 'h1', key: 'Content-Type', value: 'application/json', enabled: true }
          ],
          responseBody: JSON.stringify({ success: true, message: 'Mock response from ' + name }, null, 2),
          hitCount: 0,
          enabled: true,
        }
      ]
    };

    setMockServers(prev => [...prev, newServer]);
    setActiveServerId(newId);
    setSelectedEndpointId(newServer.endpoints[0].id);
  };

  const handleCreateEndpoint = () => {
    if (!activeServer) return;
    const newEndpoint: MockEndpoint = {
      id: 'ep_' + Math.random().toString(36).substring(2, 8),
      name: 'New Mock Endpoint',
      method: 'GET',
      path: '/api/v1/resource',
      responseStatus: 200,
      responseDelayMs: 100,
      responseHeaders: [
        { id: 'h1', key: 'Content-Type', value: 'application/json', enabled: true }
      ],
      responseBody: JSON.stringify({ message: 'Hello from mock endpoint' }, null, 2),
      hitCount: 0,
      enabled: true,
    };

    setMockServers(prev => prev.map(s => {
      if (s.id !== activeServer.id) return s;
      return {
        ...s,
        endpoints: [...s.endpoints, newEndpoint]
      };
    }));
    setSelectedEndpointId(newEndpoint.id);
  };

  const handleUpdateEndpoint = (updates: Partial<MockEndpoint>) => {
    if (!activeServer || !activeEndpoint) return;
    setMockServers(prev => prev.map(s => {
      if (s.id !== activeServer.id) return s;
      return {
        ...s,
        endpoints: s.endpoints.map(e => {
          if (e.id !== activeEndpoint.id) return e;
          return { ...e, ...updates };
        })
      };
    }));
  };

  const handleDeleteEndpoint = (endpointId: string) => {
    if (!confirm('Are you sure you want to delete this mock endpoint?')) return;
    setMockServers(prev => prev.map(s => {
      if (s.id !== activeServer.id) return s;
      const remaining = s.endpoints.filter(e => e.id !== endpointId);
      return { ...s, endpoints: remaining };
    }));
    setSelectedEndpointId(null);
  };

  const handleCopyUrl = (url: string) => {
    navigator.clipboard.writeText(url);
    setCopiedUrl(url);
    setTimeout(() => setCopiedUrl(null), 2000);
  };

  const handleTestMockEndpoint = async () => {
    if (!activeEndpoint || !activeServer) return;
    setTestingEndpoint(true);
    setTestResult(null);

    const fullUrl = `${activeServer.baseUrl}${activeEndpoint.path.startsWith('/') ? '' : '/'}${activeEndpoint.path}`;
    const startTime = Date.now();

    try {
      // Simulate fetch or local proxy test
      await new Promise(r => setTimeout(r, activeEndpoint.responseDelayMs));
      let parsedData: any;
      try {
        parsedData = JSON.parse(activeEndpoint.responseBody);
      } catch {
        parsedData = activeEndpoint.responseBody;
      }

      const latency = Date.now() - startTime;
      setTestResult({
        status: activeEndpoint.responseStatus,
        latencyMs: latency,
        headers: activeEndpoint.responseHeaders.filter(h => h.enabled),
        data: parsedData
      });

      // Update hit count
      handleUpdateEndpoint({
        hitCount: activeEndpoint.hitCount + 1,
        lastHitAt: new Date().toISOString()
      });
    } catch (err: any) {
      setTestResult({
        status: 500,
        error: err.message
      });
    } finally {
      setTestingEndpoint(false);
    }
  };

  return (
    <div className="h-full flex flex-col bg-[#0d0f17] text-zinc-200 overflow-hidden font-sans">
      {/* Top Header */}
      <div className="p-3.5 border-b border-white/10 bg-[#121522] flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-orange-500/10 border border-orange-500/30 flex items-center justify-center text-orange-400">
            <Server className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-bold text-sm text-white">Postman Mock Server Engine</h2>
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-orange-500/10 text-orange-400 border border-orange-500/20">
                Zero-Backend Simulation
              </span>
            </div>
            <p className="text-xs text-zinc-400">
              Create simulated HTTP endpoints with custom response status, latency delays, headers, and mock JSON payloads.
            </p>
          </div>
        </div>

        <button
          onClick={handleCreateMockServer}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-600 hover:bg-orange-500 text-white rounded-lg text-xs font-bold transition-colors shadow"
        >
          <Plus className="w-3.5 h-3.5" />
          New Mock Server
        </button>
      </div>

      {/* Main Layout: Left list of mock servers & endpoints, Right endpoint configuration */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        {/* Left Column: Endpoints & Servers */}
        <div className="w-full md:w-80 border-b md:border-b-0 md:border-r border-white/10 flex flex-col bg-[#0f121d]">
          {/* Mock Server Switcher */}
          <div className="p-3 border-b border-white/10 bg-[#141826]">
            <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block mb-1.5">
              Active Mock Server
            </label>
            <select
              value={activeServer?.id}
              onChange={(e) => {
                setActiveServerId(e.target.value);
                const s = mockServers.find(srv => srv.id === e.target.value);
                setSelectedEndpointId(s?.endpoints[0]?.id || null);
              }}
              className="w-full bg-[#080910] border border-white/10 text-xs text-white rounded-lg px-2.5 py-1.5 outline-none font-medium"
            >
              {mockServers.map(s => (
                <option key={s.id} value={s.id}>{s.name} ({s.endpoints.length} routes)</option>
              ))}
            </select>

            {activeServer && (
              <div className="mt-2 text-[11px] text-zinc-400 flex items-center justify-between">
                <span className="truncate max-w-[200px] font-mono text-[10px] text-orange-300">
                  {activeServer.baseUrl}
                </span>
                <button
                  onClick={() => handleCopyUrl(activeServer.baseUrl)}
                  className="text-zinc-400 hover:text-white p-1 rounded hover:bg-white/5"
                  title="Copy Mock Base URL"
                >
                  {copiedUrl === activeServer.baseUrl ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                </button>
              </div>
            )}
          </div>

          {/* Endpoints Header */}
          <div className="p-2.5 border-b border-white/10 flex items-center justify-between bg-[#111422]">
            <span className="text-xs font-bold text-zinc-300 uppercase tracking-wider">
              Mock Routes ({activeServer?.endpoints.length || 0})
            </span>
            <button
              onClick={handleCreateEndpoint}
              className="p-1 hover:bg-white/10 rounded text-orange-400 hover:text-orange-300 transition-colors"
              title="Add Route"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          {/* Endpoints List */}
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {activeServer?.endpoints.map(ep => {
              const isSelected = ep.id === selectedEndpointId;
              const methodColor = 
                ep.method === 'GET' ? 'text-emerald-400 bg-emerald-500/10' :
                ep.method === 'POST' ? 'text-amber-400 bg-amber-500/10' :
                ep.method === 'PUT' ? 'text-blue-400 bg-blue-500/10' :
                ep.method === 'DELETE' ? 'text-rose-400 bg-rose-500/10' : 'text-purple-400 bg-purple-500/10';

              return (
                <div
                  key={ep.id}
                  onClick={() => setSelectedEndpointId(ep.id)}
                  className={`p-2.5 rounded-lg cursor-pointer border transition-all ${
                    isSelected
                      ? 'bg-white/10 border-orange-500/40 text-white shadow-sm'
                      : 'bg-white/5 border-transparent hover:bg-white/[0.07] text-zinc-300'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-semibold truncate text-white">{ep.name}</span>
                    <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded border border-white/5 ${methodColor}`}>
                      {ep.method}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-zinc-400 font-mono">
                    <span className="truncate max-w-[170px]">{ep.path}</span>
                    <span className="text-emerald-400 font-bold">{ep.responseStatus}</span>
                  </div>

                  <div className="mt-1.5 flex items-center justify-between text-[10px] text-zinc-500">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" /> {ep.responseDelayMs}ms
                    </span>
                    <span>Hits: <strong className="text-zinc-300">{ep.hitCount}</strong></span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Endpoint Configuration Editor */}
        {activeEndpoint ? (
          <div className="flex-1 flex flex-col bg-[#0a0c13] overflow-y-auto">
            {/* Action Bar */}
            <div className="p-3 border-b border-white/10 bg-[#121624] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={activeEndpoint.name}
                  onChange={(e) => handleUpdateEndpoint({ name: e.target.value })}
                  className="bg-transparent text-sm font-bold text-white border-b border-dashed border-white/20 hover:border-white/50 focus:border-orange-500 outline-none px-1"
                />
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleTestMockEndpoint}
                  disabled={testingEndpoint}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition-colors shadow"
                >
                  <Play className="w-3 h-3 fill-current" />
                  {testingEndpoint ? 'Invoking...' : 'Test Mock Route'}
                </button>

                {onOpenRequestInBuilder && (
                  <button
                    onClick={() => {
                      onOpenRequestInBuilder({
                        name: activeEndpoint.name,
                        method: activeEndpoint.method,
                        url: `${activeServer.baseUrl}${activeEndpoint.path.startsWith('/') ? '' : '/'}${activeEndpoint.path}`,
                      });
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-300 rounded-lg text-xs font-medium transition-colors"
                  >
                    <ExternalLink className="w-3 h-3 text-orange-400" />
                    Open in Request Builder
                  </button>
                )}

                <button
                  onClick={() => handleDeleteEndpoint(activeEndpoint.id)}
                  className="p-1.5 hover:bg-white/10 rounded text-zinc-400 hover:text-rose-400 transition-colors"
                  title="Delete Endpoint"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Route Settings */}
            <div className="p-4 space-y-4 max-w-4xl">
              {/* Method, Path & Status */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-zinc-400 uppercase tracking-wider mb-1">
                    HTTP Method
                  </label>
                  <select
                    value={activeEndpoint.method}
                    onChange={(e: any) => handleUpdateEndpoint({ method: e.target.value as HttpMethod })}
                    className="w-full bg-[#111420] border border-white/10 text-xs font-mono font-bold text-white rounded-lg px-3 py-2 outline-none"
                  >
                    <option value="GET">GET</option>
                    <option value="POST">POST</option>
                    <option value="PUT">PUT</option>
                    <option value="DELETE">DELETE</option>
                    <option value="PATCH">PATCH</option>
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-[11px] font-bold text-zinc-400 uppercase tracking-wider mb-1">
                    Route Path
                  </label>
                  <input
                    type="text"
                    value={activeEndpoint.path}
                    onChange={(e) => handleUpdateEndpoint({ path: e.target.value })}
                    placeholder="/api/v1/users"
                    className="w-full bg-[#111420] border border-white/10 text-xs font-mono text-white rounded-lg px-3 py-2 outline-none focus:border-orange-500/50"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-zinc-400 uppercase tracking-wider mb-1">
                    Status Code
                  </label>
                  <select
                    value={activeEndpoint.responseStatus}
                    onChange={(e) => handleUpdateEndpoint({ responseStatus: parseInt(e.target.value, 10) })}
                    className="w-full bg-[#111420] border border-white/10 text-xs font-mono font-bold text-emerald-400 rounded-lg px-3 py-2 outline-none"
                  >
                    <option value="200">200 OK</option>
                    <option value="201">201 Created</option>
                    <option value="204">204 No Content</option>
                    <option value="400">400 Bad Request</option>
                    <option value="401">401 Unauthorized</option>
                    <option value="403">403 Forbidden</option>
                    <option value="404">404 Not Found</option>
                    <option value="500">500 Internal Server Error</option>
                  </select>
                </div>
              </div>

              {/* Latency Simulation */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
                    Simulated Response Latency Delay ({activeEndpoint.responseDelayMs}ms)
                  </label>
                  <span className="text-[10px] text-zinc-500">Simulate network conditions</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="2000"
                  step="50"
                  value={activeEndpoint.responseDelayMs}
                  onChange={(e) => handleUpdateEndpoint({ responseDelayMs: parseInt(e.target.value, 10) })}
                  className="w-full accent-orange-500 cursor-pointer"
                />
              </div>

              {/* Mock Body Editor */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-zinc-300 uppercase tracking-wider">
                    Mock Response Body (JSON / Text)
                  </span>

                  {/* Template selector */}
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] text-zinc-500">Templates:</span>
                    {TEMPLATES.map(t => (
                      <button
                        key={t.name}
                        onClick={() => handleUpdateEndpoint({ responseBody: t.body, responseStatus: t.status })}
                        className="text-[10px] px-2 py-0.5 rounded bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-300 transition-colors"
                      >
                        {t.name}
                      </button>
                    ))}
                  </div>
                </div>

                <textarea
                  value={activeEndpoint.responseBody}
                  onChange={(e) => handleUpdateEndpoint({ responseBody: e.target.value })}
                  rows={10}
                  className="w-full bg-[#080910] border border-white/10 rounded-lg p-3 font-mono text-xs text-white placeholder-zinc-600 outline-none focus:border-orange-500/50"
                />
              </div>

              {/* Live Test Results Output */}
              {testResult && (
                <div className="p-3 rounded-lg border border-emerald-500/20 bg-emerald-500/5 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-emerald-300 flex items-center gap-1">
                      <Zap className="w-3.5 h-3.5 text-emerald-400" />
                      Mock Response Simulated
                    </span>
                    <span className="font-mono text-zinc-400">
                      Status: <strong className="text-emerald-300">{testResult.status}</strong> | Latency: <strong className="text-emerald-300">{testResult.latencyMs}ms</strong>
                    </span>
                  </div>
                  <pre className="p-2.5 rounded bg-[#06070c] border border-white/5 font-mono text-xs text-zinc-300 overflow-x-auto max-h-48">
                    {typeof testResult.data === 'object' ? JSON.stringify(testResult.data, null, 2) : testResult.data}
                  </pre>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-zinc-500">
            <Server className="w-12 h-12 text-zinc-700 mb-2" />
            <p className="text-sm">Select or create a mock endpoint to configure responses</p>
          </div>
        )}
      </div>
    </div>
  );
};
