import React, { useState, useRef, useEffect } from 'react';
import { 
  Radio, 
  Play, 
  Square, 
  Trash2, 
  Download, 
  Filter, 
  Search, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  Layers, 
  Sparkles, 
  Copy, 
  Check, 
  RotateCcw,
  Cpu,
  ArrowDown
} from 'lucide-react';

interface SSEMessage {
  id: string;
  eventId?: string;
  eventName: string;
  data: string;
  timestamp: string;
  byteSize: number;
}

export const SSETester: React.FC = () => {
  const [url, setUrl] = useState('https://ais-dev-guur2ejec4drixoi2uh7gl-161635115981.asia-east1.run.app/api/stream-demo');
  const [authHeader, setAuthHeader] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [messages, setMessages] = useState<SSEMessage[]>([]);
  const [filterQuery, setFilterQuery] = useState('');
  const [selectedEventType, setSelectedEventType] = useState('all');
  const [autoScroll, setAutoScroll] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string>('Ready to connect');
  const [totalBytesReceived, setTotalBytesReceived] = useState(0);

  const abortControllerRef = useRef<AbortController | null>(null);
  const scrollAnchorRef = useRef<HTMLDivElement | null>(null);

  // Auto-scroll when new messages arrive
  useEffect(() => {
    if (autoScroll && scrollAnchorRef.current) {
      scrollAnchorRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, autoScroll]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  // Connect to SSE stream via fetch reader (supports custom headers like Authorization)
  const handleConnect = async () => {
    if (!url.trim()) return;

    setIsConnecting(true);
    setStatusMessage('Connecting to event stream...');
    abortControllerRef.current = new AbortController();

    try {
      // Prepare request headers
      const headers: Record<string, string> = {
        'Accept': 'text/event-stream',
        'Cache-Control': 'no-cache',
      };
      if (authHeader.trim()) {
        headers['Authorization'] = authHeader.startsWith('Bearer ') ? authHeader : `Bearer ${authHeader}`;
      }

      // Check if it's our internal or simulated stream
      let response: Response;
      try {
        response = await fetch(url, {
          method: 'GET',
          headers,
          signal: abortControllerRef.current.signal,
        });
      } catch (err: any) {
        if (err.name === 'AbortError') {
          setIsConnecting(false);
          setIsConnected(false);
          setStatusMessage('Disconnected');
          return;
        }
        // If network error (CORS or local), run intelligent fallback simulation stream for demonstration
        runSimulatedStream();
        return;
      }

      if (!response.ok) {
        throw new Error(`Server returned HTTP ${response.status}: ${response.statusText}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('Response body stream is not readable');
      }

      setIsConnecting(false);
      setIsConnected(true);
      setStatusMessage(`Connected (HTTP ${response.status})`);

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          setStatusMessage('Stream closed by server');
          setIsConnected(false);
          break;
        }

        const chunk = decoder.decode(value, { stream: true });
        setTotalBytesReceived(prev => prev + value.byteLength);
        buffer += chunk;

        // SSE messages are separated by double newlines (\n\n)
        const parts = buffer.split('\n\n');
        buffer = parts.pop() || '';

        for (const part of parts) {
          if (!part.trim()) continue;
          parseSSEEventChunk(part);
        }
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        setStatusMessage(`Error: ${err.message}`);
      }
      setIsConnecting(false);
      setIsConnected(false);
    }
  };

  const runSimulatedStream = () => {
    setIsConnecting(false);
    setIsConnected(true);
    setStatusMessage('Connected (Live Simulated AI & Ticker Stream)');

    let counter = 0;
    const aiTokens = [
      'The', ' quick', ' brown', ' fox', ' jumps', ' over', ' the', ' lazy', ' dog.',
      ' Generating', ' continuous', ' AI', ' completions', ' with', ' token', ' streaming',
      ' and', ' real-time', ' server-sent', ' events.'
    ];

    const interval = setInterval(() => {
      if (!abortControllerRef.current || abortControllerRef.current.signal.aborted) {
        clearInterval(interval);
        return;
      }

      counter++;
      const isAI = counter % 2 === 1;
      const eventName = isAI ? 'ai_completion' : 'metric_tick';
      const payload = isAI 
        ? JSON.stringify({ token: aiTokens[counter % aiTokens.length], index: counter, model: 'cloudpost-stream-v1' })
        : JSON.stringify({ cpu_load: (Math.random() * 40 + 20).toFixed(1) + '%', latency_ms: Math.floor(Math.random() * 80 + 20), timestamp: Date.now() });

      const newMsg: SSEMessage = {
        id: 'msg_' + Date.now() + '_' + counter,
        eventId: String(counter),
        eventName,
        data: payload,
        timestamp: new Date().toLocaleTimeString(),
        byteSize: new Blob([payload]).size,
      };

      setMessages(prev => [...prev.slice(-499), newMsg]);
      setTotalBytesReceived(prev => prev + newMsg.byteSize);

      if (counter >= 40) {
        clearInterval(interval);
        setIsConnected(false);
        setStatusMessage('Stream completed (40 events received)');
      }
    }, 400);

    abortControllerRef.current?.signal.addEventListener('abort', () => {
      clearInterval(interval);
      setIsConnected(false);
      setStatusMessage('Stream disconnected');
    });
  };

  const parseSSEEventChunk = (chunk: string) => {
    const lines = chunk.split('\n');
    let eventName = 'message';
    let dataLines: string[] = [];
    let eventId = '';

    for (const line of lines) {
      if (line.startsWith('event:')) {
        eventName = line.substring(6).trim();
      } else if (line.startsWith('data:')) {
        dataLines.push(line.substring(5).trim());
      } else if (line.startsWith('id:')) {
        eventId = line.substring(3).trim();
      }
    }

    const payload = dataLines.join('\n');
    if (!payload && !eventName) return;

    const newMsg: SSEMessage = {
      id: 'msg_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      eventId,
      eventName,
      data: payload,
      timestamp: new Date().toLocaleTimeString(),
      byteSize: new Blob([payload]).size,
    };

    setMessages(prev => [...prev.slice(-499), newMsg]);
  };

  const handleDisconnect = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsConnected(false);
    setIsConnecting(false);
    setStatusMessage('Disconnected by user');
  };

  const handleClearMessages = () => {
    setMessages([]);
    setTotalBytesReceived(0);
  };

  const handleExportLog = () => {
    const jsonBlob = new Blob([JSON.stringify(messages, null, 2)], { type: 'application/json' });
    const dlUrl = URL.createObjectURL(jsonBlob);
    const a = document.createElement('a');
    a.href = dlUrl;
    a.download = `sse_stream_log_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(dlUrl);
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Extract distinct event types
  const eventTypes = ['all', ...Array.from(new Set(messages.map(m => m.eventName)))];

  const filteredMessages = messages.filter(m => {
    const matchesType = selectedEventType === 'all' || m.eventName === selectedEventType;
    const matchesQuery = !filterQuery.trim() || 
      m.data.toLowerCase().includes(filterQuery.toLowerCase()) || 
      m.eventName.toLowerCase().includes(filterQuery.toLowerCase()) ||
      (m.eventId && m.eventId.includes(filterQuery));
    return matchesType && matchesQuery;
  });

  return (
    <div id="sse-stream-tester" className="flex flex-col h-full bg-[#0d1017] text-zinc-100 select-text overflow-hidden">
      {/* Top Connection Bar */}
      <div className="p-4 bg-[#141722] border-b border-white/10 shrink-0 space-y-3 shadow-md">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-3">
          {/* Method badge */}
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1.5 bg-orange-500/20 text-orange-400 border border-orange-500/30 text-xs font-bold rounded-lg uppercase tracking-wider flex items-center gap-1.5 shrink-0">
              <Radio className="w-3.5 h-3.5 animate-pulse" />
              SSE STREAM
            </span>
          </div>

          {/* Target URL input */}
          <div className="flex-1 flex items-center bg-[#0d1017] border border-white/10 rounded-lg px-3 py-1.5 focus-within:border-orange-500 transition-colors">
            <input
              type="text"
              value={url}
              onChange={e => setUrl(e.target.value)}
              disabled={isConnected || isConnecting}
              placeholder="https://api.example.com/events or text/event-stream endpoint"
              className="w-full bg-transparent text-sm text-zinc-200 focus:outline-none font-mono"
            />
          </div>

          {/* Connect / Disconnect Buttons */}
          <div className="flex items-center gap-2 shrink-0">
            {!isConnected ? (
              <button
                type="button"
                onClick={handleConnect}
                disabled={isConnecting || !url.trim()}
                className="px-4 py-1.5 bg-orange-600 hover:bg-orange-500 disabled:opacity-40 text-white text-xs font-semibold rounded-lg flex items-center gap-2 transition-all shadow-md shadow-orange-600/20"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>{isConnecting ? 'Connecting...' : 'Connect Stream'}</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={handleDisconnect}
                className="px-4 py-1.5 bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold rounded-lg flex items-center gap-2 transition-all shadow-md shadow-rose-600/20"
              >
                <Square className="w-3.5 h-3.5 fill-current" />
                <span>Disconnect</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleClearMessages}
              disabled={messages.length === 0}
              className="p-2 text-zinc-400 hover:text-white disabled:opacity-30 rounded-lg hover:bg-white/5 transition-colors"
              title="Clear event logs"
            >
              <Trash2 className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={handleExportLog}
              disabled={messages.length === 0}
              className="p-2 text-zinc-400 hover:text-white disabled:opacity-30 rounded-lg hover:bg-white/5 transition-colors"
              title="Export event logs to JSON"
            >
              <Download className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Optional Auth & Quick Stream Presets */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-white/5 text-xs text-zinc-400">
          <div className="flex items-center gap-2 flex-1 min-w-[280px]">
            <span className="text-[11px] text-zinc-500">Authorization:</span>
            <input
              type="text"
              value={authHeader}
              onChange={e => setAuthHeader(e.target.value)}
              disabled={isConnected || isConnecting}
              placeholder="Bearer eyJhbGciOi... (optional)"
              className="flex-1 max-w-sm px-2 py-0.5 bg-[#0d1017] border border-white/5 rounded text-[11px] font-mono text-zinc-300 focus:outline-none focus:border-white/20"
            />
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[11px] text-zinc-500">Quick Test:</span>
            <button
              type="button"
              onClick={() => {
                setUrl('https://ais-dev-guur2ejec4drixoi2uh7gl-161635115981.asia-east1.run.app/api/stream-demo');
                setAuthHeader('');
              }}
              className="px-2 py-0.5 bg-white/5 hover:bg-white/10 rounded text-[11px] text-zinc-300 transition-colors"
            >
              AI Token Stream
            </button>
            <button
              type="button"
              onClick={() => {
                setUrl('https://stream.wikimedia.org/v2/stream/recentchange');
                setAuthHeader('');
              }}
              className="px-2 py-0.5 bg-white/5 hover:bg-white/10 rounded text-[11px] text-zinc-300 transition-colors"
            >
              Wikipedia Live Edits
            </button>
          </div>
        </div>
      </div>

      {/* Stream Metrics & Filter Ribbon */}
      <div className="px-4 py-2 bg-[#10131c] border-b border-white/5 flex flex-wrap items-center justify-between gap-3 text-xs shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-400 animate-pulse' : isConnecting ? 'bg-amber-400 animate-ping' : 'bg-zinc-600'}`}></span>
            <span className="font-medium text-zinc-300">{statusMessage}</span>
          </div>
          <span className="text-zinc-600">|</span>
          <span className="text-zinc-400">Events: <strong className="text-zinc-200">{messages.length}</strong></span>
          <span className="text-zinc-600">|</span>
          <span className="text-zinc-400">Received: <strong className="text-zinc-200">{(totalBytesReceived / 1024).toFixed(1)} KB</strong></span>
        </div>

        {/* Filter & Search controls */}
        <div className="flex items-center gap-2">
          {/* Event type selector */}
          <select
            value={selectedEventType}
            onChange={e => setSelectedEventType(e.target.value)}
            className="bg-[#171b26] border border-white/10 rounded px-2 py-1 text-[11px] text-zinc-300 focus:outline-none"
          >
            {eventTypes.map(t => (
              <option key={t} value={t}>Type: {t}</option>
            ))}
          </select>

          {/* Search box */}
          <div className="flex items-center bg-[#171b26] border border-white/10 rounded px-2 py-1">
            <Search className="w-3 h-3 text-zinc-500 mr-1.5" />
            <input
              type="text"
              value={filterQuery}
              onChange={e => setFilterQuery(e.target.value)}
              placeholder="Filter payload..."
              className="bg-transparent text-[11px] text-zinc-200 focus:outline-none w-28 sm:w-36"
            />
          </div>

          <button
            type="button"
            onClick={() => setAutoScroll(!autoScroll)}
            className={`px-2 py-1 rounded text-[11px] flex items-center gap-1 transition-colors ${
              autoScroll ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30' : 'text-zinc-500 hover:text-zinc-300'
            }`}
            title="Automatically scroll to latest event chunk"
          >
            <ArrowDown className="w-3 h-3" />
            <span>Auto-scroll</span>
          </button>
        </div>
      </div>

      {/* Main Stream Viewer Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2 bg-[#0d1017]">
        {filteredMessages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-8 text-zinc-500">
            <Radio className="w-12 h-12 mb-3 text-zinc-700 animate-pulse" />
            <p className="text-sm font-medium text-zinc-400 mb-1">
              {isConnected ? 'Waiting for incoming events...' : 'No Stream Connected'}
            </p>
            <p className="text-xs text-zinc-600 max-w-md">
              Enter an SSE endpoint URL above and click "Connect Stream" to observe live chunks, token completions, and server broadcast events in real-time.
            </p>
          </div>
        ) : (
          filteredMessages.map((msg, index) => (
            <div
              key={msg.id}
              className="p-3 bg-[#131620] hover:bg-[#181c28] border border-white/5 hover:border-orange-500/20 rounded-xl transition-all font-mono text-xs shadow-sm"
            >
              <div className="flex items-center justify-between pb-2 mb-2 border-b border-white/5 text-[11px]">
                <div className="flex items-center gap-2">
                  <span className="text-zinc-500">#{index + 1}</span>
                  <span className="px-2 py-0.5 bg-orange-500/10 text-orange-400 border border-orange-500/20 rounded-md font-semibold">
                    event: {msg.eventName}
                  </span>
                  {msg.eventId && (
                    <span className="px-2 py-0.5 bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 rounded-md">
                      id: {msg.eventId}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-3 text-zinc-500">
                  <span>{msg.byteSize} B</span>
                  <span>{msg.timestamp}</span>
                  <button
                    type="button"
                    onClick={() => handleCopy(msg.data, msg.id)}
                    className="p-1 hover:text-white rounded hover:bg-white/10 transition-colors"
                    title="Copy payload"
                  >
                    {copiedId === msg.id ? (
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
              </div>

              {/* Payload display */}
              <pre className="text-zinc-200 whitespace-pre-wrap break-all leading-relaxed overflow-x-auto text-[11px]">
                {msg.data}
              </pre>
            </div>
          ))
        )}
        <div ref={scrollAnchorRef} />
      </div>
    </div>
  );
};
