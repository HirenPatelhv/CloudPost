import React, { useState } from 'react';
import { 
  Play, 
  Square, 
  RotateCcw, 
  Copy, 
  Check, 
  Code2, 
  FileCode, 
  Server, 
  Layers, 
  CheckCircle2, 
  AlertCircle,
  Clock,
  Sparkles,
  ArrowRight
} from 'lucide-react';

interface GrpcMetadata {
  id: string;
  key: string;
  value: string;
  enabled: boolean;
}

const SAMPLE_PROTO = `syntax = "proto3";

package api.v1;

service UserService {
  rpc GetUser (UserRequest) returns (UserResponse);
  rpc ListUsers (ListUsersRequest) returns (stream UserResponse);
  rpc CreateUser (CreateUserRequest) returns (UserResponse);
}

message UserRequest {
  string id = 1;
  bool include_metadata = 2;
}

message ListUsersRequest {
  int32 page_size = 1;
  string page_token = 2;
}

message CreateUserRequest {
  string name = 1;
  string email = 2;
  string role = 3;
}

message UserResponse {
  string id = 1;
  string name = 2;
  string email = 3;
  string role = 4;
  int64 created_at = 5;
}`;

export const GRPCExplorer: React.FC = () => {
  const [serverAddress, setServerAddress] = useState('grpc.api.example.com:50051');
  const [useTls, setUseTls] = useState(true);
  const [protoText, setProtoText] = useState(SAMPLE_PROTO);
  const [selectedService, setSelectedService] = useState('UserService');
  const [selectedMethod, setSelectedMethod] = useState('GetUser');
  const [requestPayload, setRequestPayload] = useState(JSON.stringify({
    id: "usr_99812",
    include_metadata: true
  }, null, 2));
  const [metadataList, setMetadataList] = useState<GrpcMetadata[]>([
    { id: '1', key: 'authorization', value: 'Bearer grpc_token_abc123', enabled: true },
    { id: '2', key: 'x-tenant-id', value: 'tenant_enterprise_01', enabled: true }
  ]);
  const [activeTab, setActiveTab] = useState<'request' | 'metadata' | 'proto'>('request');
  const [isLoading, setIsLoading] = useState(false);
  const [responseOutput, setResponseOutput] = useState<any>(null);
  const [grpcStatus, setGrpcStatus] = useState<{ code: number; name: string; message: string; duration: number } | null>(null);
  const [copied, setCopied] = useState(false);

  const handleExecuteRpc = async () => {
    setIsLoading(true);
    setGrpcStatus(null);
    setResponseOutput(null);

    const start = performance.now();
    await new Promise(r => setTimeout(r, 260));
    const duration = Math.round(performance.now() - start);

    let parsedReq: any = {};
    try {
      parsedReq = JSON.parse(requestPayload);
    } catch {
      parsedReq = { raw: requestPayload };
    }

    if (selectedMethod === 'GetUser') {
      setResponseOutput({
        id: parsedReq.id || "usr_99812",
        name: "Alex Mercer",
        email: "alex.mercer@enterprise.io",
        role: "admin",
        created_at: Date.now() - 86400000 * 30,
        metadata: {
          client_version: "cloudpost-grpc-client-v1.4",
          verified: true,
          transport: useTls ? "gRPC/HTTP2 (TLS Secured)" : "gRPC/HTTP2 (Insecure Plaintext)"
        }
      });
      setGrpcStatus({
        code: 0,
        name: 'OK',
        message: 'Unary RPC completed successfully',
        duration
      });
    } else if (selectedMethod === 'ListUsers') {
      setResponseOutput([
        { id: "usr_101", name: "Sarah Connor", email: "s.connor@sky.net", role: "lead" },
        { id: "usr_102", name: "John Doe", email: "j.doe@example.org", role: "member" },
        { id: "usr_103", name: "Elena Rostova", email: "elena@acme.dev", role: "admin" }
      ]);
      setGrpcStatus({
        code: 0,
        name: 'OK',
        message: 'Server streaming RPC delivered 3 messages',
        duration
      });
    } else {
      setResponseOutput({
        id: "usr_" + Math.floor(Math.random() * 89999 + 10000),
        name: parsedReq.name || "New Team Member",
        email: parsedReq.email || "user@enterprise.org",
        role: parsedReq.role || "member",
        created_at: Date.now(),
      });
      setGrpcStatus({
        code: 0,
        name: 'OK',
        message: 'Record created in gRPC cluster',
        duration
      });
    }

    setIsLoading(false);
  };

  const handleCopyResponse = () => {
    if (!responseOutput) return;
    navigator.clipboard.writeText(JSON.stringify(responseOutput, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div id="grpc-protocol-explorer" className="flex flex-col h-full bg-[#0d1017] text-zinc-100 select-text overflow-hidden">
      {/* Top Address & Connection Bar */}
      <div className="p-4 bg-[#141722] border-b border-white/10 shrink-0 space-y-3 shadow-md">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-3">
          {/* Protocol Badge */}
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1.5 bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 text-xs font-bold rounded-lg uppercase tracking-wider flex items-center gap-1.5 shrink-0">
              <Server className="w-3.5 h-3.5" />
              gRPC
            </span>
          </div>

          {/* Host & Port Input */}
          <div className="flex-1 flex items-center bg-[#0d1017] border border-white/10 rounded-lg px-3 py-1.5 focus-within:border-cyan-500 transition-colors">
            <input
              type="text"
              value={serverAddress}
              onChange={e => setServerAddress(e.target.value)}
              placeholder="host:port (e.g. grpc.example.com:443)"
              className="w-full bg-transparent text-sm text-zinc-200 focus:outline-none font-mono"
            />
          </div>

          {/* TLS Toggle */}
          <label className="flex items-center gap-2 px-3 py-1.5 bg-[#0d1017] border border-white/10 rounded-lg text-xs cursor-pointer hover:border-white/20 transition-colors select-none shrink-0">
            <input
              type="checkbox"
              checked={useTls}
              onChange={e => setUseTls(e.target.checked)}
              className="rounded border-zinc-700 text-cyan-500 focus:ring-0"
            />
            <span className={useTls ? 'text-cyan-400 font-medium' : 'text-zinc-400'}>
              {useTls ? 'TLS Enabled' : 'Insecure (Plaintext)'}
            </span>
          </label>

          {/* Service & Method Selectors */}
          <div className="flex items-center gap-2 shrink-0">
            <select
              value={selectedService}
              onChange={e => setSelectedService(e.target.value)}
              className="bg-[#0d1017] border border-white/10 text-xs rounded-lg px-2.5 py-1.5 text-zinc-200 focus:outline-none focus:border-cyan-500"
            >
              <option value="UserService">UserService</option>
              <option value="AuthService">AuthService</option>
              <option value="PaymentService">PaymentService</option>
            </select>

            <select
              value={selectedMethod}
              onChange={e => setSelectedMethod(e.target.value)}
              className="bg-[#0d1017] border border-white/10 text-xs rounded-lg px-2.5 py-1.5 text-cyan-400 font-semibold focus:outline-none focus:border-cyan-500"
            >
              <option value="GetUser">GetUser (Unary)</option>
              <option value="ListUsers">ListUsers (Server Streaming)</option>
              <option value="CreateUser">CreateUser (Unary)</option>
            </select>

            <button
              type="button"
              onClick={handleExecuteRpc}
              disabled={isLoading || !serverAddress.trim()}
              className="px-4 py-1.5 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-40 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-all shadow-md shadow-cyan-600/20"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>{isLoading ? 'Calling RPC...' : 'Invoke'}</span>
            </button>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-4 text-xs border-t border-white/5 pt-2">
          <button
            onClick={() => setActiveTab('request')}
            className={`pb-1 border-b-2 font-medium transition-colors ${
              activeTab === 'request' ? 'border-cyan-500 text-cyan-400' : 'border-transparent text-zinc-400 hover:text-white'
            }`}
          >
            Request Message (JSON)
          </button>
          <button
            onClick={() => setActiveTab('metadata')}
            className={`pb-1 border-b-2 font-medium transition-colors flex items-center gap-1.5 ${
              activeTab === 'metadata' ? 'border-cyan-500 text-cyan-400' : 'border-transparent text-zinc-400 hover:text-white'
            }`}
          >
            <span>Headers / Metadata</span>
            <span className="px-1.5 py-0.2 bg-white/10 rounded-full text-[10px]">{metadataList.filter(m => m.enabled).length}</span>
          </button>
          <button
            onClick={() => setActiveTab('proto')}
            className={`pb-1 border-b-2 font-medium transition-colors flex items-center gap-1.5 ${
              activeTab === 'proto' ? 'border-cyan-500 text-cyan-400' : 'border-transparent text-zinc-400 hover:text-white'
            }`}
          >
            <FileCode className="w-3.5 h-3.5" />
            <span>Proto Schema</span>
          </button>
        </div>
      </div>

      {/* Main Two-Column View: Request & Response */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* Left Column: Input Panel */}
        <div className="flex-1 flex flex-col border-b lg:border-b-0 lg:border-r border-white/10 overflow-hidden bg-[#10131d]">
          {activeTab === 'request' && (
            <div className="flex-1 flex flex-col p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-zinc-400 font-medium">Message Body (Protobuf JSON Mapping)</span>
                <button
                  type="button"
                  onClick={() => {
                    try {
                      setRequestPayload(JSON.stringify(JSON.parse(requestPayload), null, 2));
                    } catch {}
                  }}
                  className="text-[11px] text-cyan-400 hover:underline"
                >
                  Beautify JSON
                </button>
              </div>
              <textarea
                value={requestPayload}
                onChange={e => setRequestPayload(e.target.value)}
                placeholder='{\n  "id": "usr_123"\n}'
                className="flex-1 w-full bg-[#090b10] text-zinc-200 p-3 rounded-lg border border-white/10 font-mono text-xs focus:outline-none focus:border-cyan-500 resize-none"
                spellCheck={false}
              />
            </div>
          )}

          {activeTab === 'metadata' && (
            <div className="flex-1 p-4 overflow-y-auto space-y-2">
              <span className="text-xs text-zinc-400 font-medium block mb-2">Custom gRPC Metadata Headers</span>
              {metadataList.map((m, i) => (
                <div key={m.id} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={m.enabled}
                    onChange={e => {
                      const updated = [...metadataList];
                      updated[i].enabled = e.target.checked;
                      setMetadataList(updated);
                    }}
                    className="rounded border-zinc-700 text-cyan-500"
                  />
                  <input
                    type="text"
                    value={m.key}
                    onChange={e => {
                      const updated = [...metadataList];
                      updated[i].key = e.target.value;
                      setMetadataList(updated);
                    }}
                    placeholder="Key (e.g. authorization)"
                    className="flex-1 bg-[#090b10] border border-white/10 rounded px-2.5 py-1.5 text-xs text-zinc-200 font-mono"
                  />
                  <input
                    type="text"
                    value={m.value}
                    onChange={e => {
                      const updated = [...metadataList];
                      updated[i].value = e.target.value;
                      setMetadataList(updated);
                    }}
                    placeholder="Value"
                    className="flex-1 bg-[#090b10] border border-white/10 rounded px-2.5 py-1.5 text-xs text-zinc-200 font-mono"
                  />
                </div>
              ))}
              <button
                type="button"
                onClick={() => setMetadataList([...metadataList, { id: String(Date.now()), key: '', value: '', enabled: true }])}
                className="mt-2 px-3 py-1 bg-white/5 hover:bg-white/10 text-xs text-cyan-400 rounded transition-colors"
              >
                + Add Metadata
              </button>
            </div>
          )}

          {activeTab === 'proto' && (
            <div className="flex-1 flex flex-col p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-zinc-400 font-medium">Protocol Buffers Definition (.proto)</span>
                <span className="text-[11px] text-zinc-500 font-mono">proto3 syntax</span>
              </div>
              <textarea
                value={protoText}
                onChange={e => setProtoText(e.target.value)}
                className="flex-1 w-full bg-[#090b10] text-zinc-300 p-3 rounded-lg border border-white/10 font-mono text-xs focus:outline-none focus:border-cyan-500 resize-none leading-relaxed"
                spellCheck={false}
              />
            </div>
          )}
        </div>

        {/* Right Column: Response Output */}
        <div className="flex-1 flex flex-col overflow-hidden bg-[#0d1017]">
          {/* Response Status Header */}
          <div className="px-4 py-2.5 bg-[#141722] border-b border-white/10 flex items-center justify-between text-xs shrink-0">
            <div className="flex items-center gap-3">
              <span className="font-semibold text-zinc-300">gRPC Response</span>
              {grpcStatus && (
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded font-mono font-bold">
                    Code {grpcStatus.code} ({grpcStatus.name})
                  </span>
                  <span className="text-zinc-500 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {grpcStatus.duration} ms
                  </span>
                </div>
              )}
            </div>

            {responseOutput && (
              <button
                type="button"
                onClick={handleCopyResponse}
                className="p-1 text-zinc-400 hover:text-white rounded hover:bg-white/5 transition-colors flex items-center gap-1"
                title="Copy response JSON"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span className="text-[11px]">Copy</span>
              </button>
            )}
          </div>

          {/* Response Body */}
          <div className="flex-1 overflow-auto p-4">
            {!responseOutput && !isLoading && (
              <div className="h-full flex flex-col items-center justify-center text-center text-zinc-500">
                <Server className="w-10 h-10 mb-2 text-zinc-700" />
                <p className="text-xs">Click "Invoke" to dispatch the gRPC RPC message and inspect response payload.</p>
              </div>
            )}

            {isLoading && (
              <div className="h-full flex flex-col items-center justify-center text-center text-cyan-400">
                <Server className="w-8 h-8 mb-2 animate-bounce" />
                <span className="text-xs font-mono">Negotiating HTTP/2 transport & invoking RPC...</span>
              </div>
            )}

            {responseOutput && (
              <pre className="font-mono text-xs text-zinc-200 leading-relaxed whitespace-pre-wrap">
                {JSON.stringify(responseOutput, null, 2)}
              </pre>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
