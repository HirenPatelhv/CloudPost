import React, { useState, useEffect, useRef } from 'react';
import { 
  Play, 
  Square, 
  Send, 
  Trash2, 
  ArrowDownLeft, 
  ArrowUpRight, 
  Radio, 
  Search, 
  Code, 
  Copy, 
  Check, 
  Clock, 
  Sparkles,
  Wifi,
  WifiOff,
  AlertCircle
} from 'lucide-react';
import { WebSocketMessage } from '../../types';
import { PaneSplitter } from '../Common/PaneSplitter';

interface WebSocketTesterProps {
  initialUrl?: string;
  onSaveSnapshot?: (data: any) => void;
  layoutMode?: 'columns' | 'rows';
}

const WS_PRESETS = [
  { name: 'Echo WebSocket Org', url: 'wss://echo.websocket.org' },
  { name: 'Postman Echo Socket', url: 'wss://ws.postman-echo.com/raw' },
  { name: 'SocketsBay Public Demo', url: 'wss://socketsbay.com/wss/v2/1/demo/' },
  { name: 'Localhost Socket (Port 8080)', url: 'ws://localhost:8080' },
];

export const WebSocketTester: React.FC<WebSocketTesterProps> = ({
  initialUrl = 'wss://echo.websocket.org',
  layoutMode = 'columns',
}) => {
  const [url, setUrl] = useState(initialUrl);
  const [status, setStatus] = useState<'DISCONNECTED' | 'CONNECTING' | 'CONNECTED' | 'ERROR'>('DISCONNECTED');
  const [messages, setMessages] = useState<WebSocketMessage[]>([]);
  const [composeText, setComposeText] = useState('{\n  "event": "ping",\n  "message": "Hello from CloudPost Studio!",\n  "timestamp": ' + Date.now() + '\n}');
  const [msgType, setMsgType] = useState<'json' | 'text'>('json');
  const [filterQuery, setFilterQuery] = useState('');
  const [filterDirection, setFilterDirection] = useState<'all' | 'in' | 'out'>('all');
  const [autoScroll, setAutoScroll] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [connectedAt, setConnectedAt] = useState<number | null>(null);
  const [elapsedSec, setElapsedSec] = useState(0);
  const [lastPingLatency, setLastPingLatency] = useState<number | null>(null);
  const [isSendingPing, setIsSendingPing] = useState(false);

  const socketRef = useRef<WebSocket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const pingStartRef = useRef<number>(0);
  const splitContainerRef = useRef<HTMLDivElement | null>(null);
  const [splitRatio, setSplitRatio] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('cp_ws_split_ratio');
      if (saved) {
        const val = parseFloat(saved);
        if (!isNaN(val) && val >= 18 && val <= 82) return val;
      }
    } catch (e) {}
    return 42;
  });

  const handleRatioChange = (val: number) => {
    setSplitRatio(val);
    try { localStorage.setItem('cp_ws_split_ratio', String(val)); } catch (e) {}
  };

  // Connection timer
  useEffect(() => {
    let interval: any = null;
    if (status === 'CONNECTED' && connectedAt) {
      interval = setInterval(() => {
        setElapsedSec(Math.floor((Date.now() - connectedAt) / 1000));
      }, 1000);
    } else {
      setElapsedSec(0);
    }
    return () => clearInterval(interval);
  }, [status, connectedAt]);

  // Auto scroll
  useEffect(() => {
    if (autoScroll && messagesEndRef.current) {
      messagesEndRef.current.scrollTop = messagesEndRef.current.scrollHeight;
    }
  }, [messages, autoScroll]);

  const handleConnect = () => {
    if (!url.trim()) return;

    try {
      setStatus('CONNECTING');
      const ws = new WebSocket(url.trim());
      socketRef.current = ws;

      ws.onopen = () => {
        setStatus('CONNECTED');
        setConnectedAt(Date.now());
        const systemMsg: WebSocketMessage = {
          id: 'msg_' + Math.random().toString(36).substring(2, 9),
          direction: 'in',
          content: `[System] Connected to ${url.trim()}`,
          timestamp: new Date().toLocaleTimeString(),
          type: 'text',
          sizeBytes: 0,
        };
        setMessages(prev => [...prev, systemMsg]);
      };

      ws.onmessage = (event) => {
        const receivedAt = Date.now();
        if (pingStartRef.current > 0) {
          setLastPingLatency(receivedAt - pingStartRef.current);
          pingStartRef.current = 0;
          setIsSendingPing(false);
        }

        let payload = event.data;
        let detectedType: 'text' | 'json' = 'text';
        if (typeof payload === 'string') {
          try {
            JSON.parse(payload);
            detectedType = 'json';
          } catch {
            detectedType = 'text';
          }
        }

        const newMsg: WebSocketMessage = {
          id: 'msg_' + Math.random().toString(36).substring(2, 9),
          direction: 'in',
          content: payload,
          timestamp: new Date().toLocaleTimeString(),
          type: detectedType,
          sizeBytes: new Blob([payload]).size,
        };
        setMessages(prev => [...prev, newMsg]);
      };

      ws.onerror = () => {
        setStatus('ERROR');
        const errMsg: WebSocketMessage = {
          id: 'msg_' + Math.random().toString(36).substring(2, 9),
          direction: 'in',
          content: `[Error] WebSocket connection encountered a network failure or could not connect to ${url}`,
          timestamp: new Date().toLocaleTimeString(),
          type: 'text',
        };
        setMessages(prev => [...prev, errMsg]);
      };

      ws.onclose = (event) => {
        setStatus('DISCONNECTED');
        setConnectedAt(null);
        const closeMsg: WebSocketMessage = {
          id: 'msg_' + Math.random().toString(36).substring(2, 9),
          direction: 'in',
          content: `[System] Connection closed (Code: ${event.code}${event.reason ? ' - ' + event.reason : ''})`,
          timestamp: new Date().toLocaleTimeString(),
          type: 'text',
        };
        setMessages(prev => [...prev, closeMsg]);
      };
    } catch (err: any) {
      setStatus('ERROR');
      alert(`WebSocket initialization failed: ${err.message}`);
    }
  };

  const handleDisconnect = () => {
    if (socketRef.current) {
      socketRef.current.close();
      socketRef.current = null;
    }
    setStatus('DISCONNECTED');
    setConnectedAt(null);
  };

  const handleSendMessage = () => {
    if (!socketRef.current || status !== 'CONNECTED') {
      alert('WebSocket is not connected. Click "Connect" first.');
      return;
    }
    if (!composeText.trim()) return;

    try {
      socketRef.current.send(composeText);
      const outMsg: WebSocketMessage = {
        id: 'msg_' + Math.random().toString(36).substring(2, 9),
        direction: 'out',
        content: composeText,
        timestamp: new Date().toLocaleTimeString(),
        type: msgType,
        sizeBytes: new Blob([composeText]).size,
      };
      setMessages(prev => [...prev, outMsg]);
    } catch (err: any) {
      alert(`Failed to send message: ${err.message}`);
    }
  };

  const handleSendPing = () => {
    if (!socketRef.current || status !== 'CONNECTED') return;
    setIsSendingPing(true);
    pingStartRef.current = Date.now();
    const pingPayload = JSON.stringify({ type: 'ping', time: pingStartRef.current });
    try {
      socketRef.current.send(pingPayload);
      const outMsg: WebSocketMessage = {
        id: 'msg_' + Math.random().toString(36).substring(2, 9),
        direction: 'out',
        content: pingPayload,
        timestamp: new Date().toLocaleTimeString(),
        type: 'ping',
        sizeBytes: pingPayload.length,
      };
      setMessages(prev => [...prev, outMsg]);
    } catch (e: any) {
      setIsSendingPing(false);
    }
  };

  const handleFormatJson = () => {
    try {
      const parsed = JSON.parse(composeText);
      setComposeText(JSON.stringify(parsed, null, 2));
      setMsgType('json');
    } catch {
      alert('Content is not valid JSON');
    }
  };

  const handleCopyMessage = (msg: WebSocketMessage) => {
    navigator.clipboard.writeText(msg.content);
    setCopiedId(msg.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const filteredMessages = messages.filter(m => {
    if (filterDirection === 'in' && m.direction !== 'in') return false;
    if (filterDirection === 'out' && m.direction !== 'out') return false;
    if (filterQuery && !m.content.toLowerCase().includes(filterQuery.toLowerCase())) return false;
    return true;
  });

  const formatSeconds = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const s = sec % 60;
    return `${mins}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div className="h-full flex flex-col bg-[#0f111a] text-zinc-200 overflow-hidden font-sans">
      {/* Top Header / Bar */}
      <div className="p-3 border-b border-white/10 bg-[#141824] flex flex-col gap-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Radio className="w-5 h-5 text-emerald-400 animate-pulse" />
            <span className="font-bold text-sm tracking-tight text-white">Postman WebSocket Client</span>
            <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              Bidirectional
            </span>
          </div>

          {/* Connection status badge */}
          <div className="flex items-center gap-3 text-xs">
            {status === 'CONNECTED' && (
              <div className="flex items-center gap-2 text-zinc-400 bg-white/5 px-2.5 py-1 rounded border border-white/10">
                <Clock className="w-3.5 h-3.5 text-emerald-400" />
                <span>Connected: <strong className="text-white font-mono">{formatSeconds(elapsedSec)}</strong></span>
                {lastPingLatency !== null && (
                  <span className="ml-1 pl-2 border-l border-white/10 text-emerald-400 font-mono">
                    {lastPingLatency}ms
                  </span>
                )}
              </div>
            )}

            <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${
              status === 'CONNECTED' ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300' :
              status === 'CONNECTING' ? 'bg-amber-500/15 border-amber-500/30 text-amber-300' :
              status === 'ERROR' ? 'bg-rose-500/15 border-rose-500/30 text-rose-300' :
              'bg-zinc-800 border-zinc-700 text-zinc-400'
            }`}>
              <span className={`w-2 h-2 rounded-full ${
                status === 'CONNECTED' ? 'bg-emerald-400 animate-ping' :
                status === 'CONNECTING' ? 'bg-amber-400' :
                status === 'ERROR' ? 'bg-rose-400' : 'bg-zinc-500'
              }`} />
              {status}
            </div>
          </div>
        </div>

        {/* URL Bar & Action Buttons */}
        <div className="flex items-center gap-2">
          <div className="flex-1 flex items-center bg-[#090b10] border border-white/15 rounded-lg overflow-hidden focus-within:border-emerald-500/60 transition-colors">
            <span className="px-3 py-2 bg-white/5 text-xs font-mono font-bold text-zinc-400 border-r border-white/10 select-none">
              WS / WSS
            </span>
            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="wss://echo.websocket.org"
              disabled={status === 'CONNECTED' || status === 'CONNECTING'}
              className="flex-1 bg-transparent px-3 py-2 text-xs font-mono text-white placeholder-zinc-500 outline-none"
            />
          </div>

          {status === 'CONNECTED' ? (
            <button
              onClick={handleDisconnect}
              className="flex items-center gap-1.5 px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-bold transition-colors shadow-lg shadow-rose-600/20"
            >
              <Square className="w-3.5 h-3.5 fill-current" />
              Disconnect
            </button>
          ) : (
            <button
              onClick={handleConnect}
              disabled={status === 'CONNECTING'}
              className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition-colors shadow-lg shadow-emerald-600/20 disabled:opacity-50"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              {status === 'CONNECTING' ? 'Connecting...' : 'Connect'}
            </button>
          )}

          {status === 'CONNECTED' && (
            <button
              onClick={handleSendPing}
              disabled={isSendingPing}
              className="flex items-center gap-1 px-3 py-2 bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-300 rounded-lg text-xs font-medium transition-colors"
              title="Measure ping latency"
            >
              <Wifi className="w-3.5 h-3.5 text-emerald-400" />
              Ping
            </button>
          )}
        </div>

        {/* Quick Presets */}
        <div className="flex items-center gap-2 overflow-x-auto text-[11px] text-zinc-400 pt-1">
          <span className="text-zinc-500 font-semibold shrink-0">Sample Sockets:</span>
          {WS_PRESETS.map(p => (
            <button
              key={p.url}
              onClick={() => {
                setUrl(p.url);
                if (status === 'CONNECTED') handleDisconnect();
              }}
              className={`px-2 py-0.5 rounded border transition-colors whitespace-nowrap ${
                url === p.url 
                  ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-300' 
                  : 'bg-white/5 border-white/5 hover:border-white/20 text-zinc-400 hover:text-white'
              }`}
            >
              {p.name}
            </button>
          ))}
        </div>
      </div>

      {/* Main Split: Left Composer, Right Live Message Stream */}
      <div
        ref={splitContainerRef}
        className={`flex-1 flex ${layoutMode === 'rows' ? 'flex-col' : 'flex-row'} overflow-hidden min-w-0`}
      >
        {/* Left: Message Composer */}
        <div
          style={{
            flex: 'none',
            ...(layoutMode === 'rows'
              ? { height: `${splitRatio}%`, width: '100%' }
              : { width: `${splitRatio}%`, height: '100%' })
          }}
          className={`overflow-hidden flex flex-col bg-[#111420] min-w-0 ${
            layoutMode === 'rows'
              ? 'min-h-[160px] max-h-[calc(100%-140px)]'
              : 'min-w-[240px] max-w-[calc(100%-200px)]'
          }`}
        >
          <div className="p-2.5 border-b border-white/10 flex items-center justify-between bg-[#151928]">
            <span className="text-xs font-bold text-zinc-300 uppercase tracking-wider">Message Composer</span>
            <div className="flex items-center gap-2">
              <button
                onClick={handleFormatJson}
                className="flex items-center gap-1 text-[11px] text-orange-400 hover:text-orange-300 font-medium px-2 py-0.5 rounded bg-orange-500/10 border border-orange-500/20"
              >
                <Sparkles className="w-3 h-3" />
                Beautify JSON
              </button>
              <select
                value={msgType}
                onChange={(e: any) => setMsgType(e.target.value)}
                className="bg-[#090b10] border border-white/10 text-zinc-300 rounded px-2 py-0.5 text-xs outline-none"
              >
                <option value="json">JSON</option>
                <option value="text">Plain Text</option>
              </select>
            </div>
          </div>

          <div className="flex-1 p-3">
            <textarea
              value={composeText}
              onChange={(e) => setComposeText(e.target.value)}
              onKeyDown={(e) => {
                if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
              placeholder="Type message or payload here... (Ctrl+Enter to send)"
              className="w-full h-full bg-[#080a10] border border-white/10 rounded-lg p-3 font-mono text-xs text-white placeholder-zinc-600 resize-none outline-none focus:border-emerald-500/50"
            />
          </div>

          <div className="p-3 border-t border-white/10 bg-[#141824] flex items-center justify-between">
            <span className="text-[11px] text-zinc-500">Shortcut: <kbd className="px-1 py-0.5 bg-white/10 rounded text-zinc-300">Ctrl+Enter</kbd></span>
            <button
              onClick={handleSendMessage}
              disabled={status !== 'CONNECTED'}
              className="flex items-center gap-1.5 px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-lg text-xs font-bold transition-colors shadow"
            >
              <Send className="w-3.5 h-3.5" />
              Send Message
            </button>
          </div>
        </div>

        {/* Resizable Splitter */}
        <PaneSplitter
          layoutMode={layoutMode}
          ratio={splitRatio}
          onChange={handleRatioChange}
          onReset={() => handleRatioChange(42)}
          containerRef={splitContainerRef}
        />

        {/* Right: Live Message Stream */}
        <div
          style={{
            flex: '1 1 0%',
            minWidth: layoutMode === 'columns' ? '200px' : 0,
            minHeight: layoutMode === 'rows' ? '140px' : 0
          }}
          className="flex flex-col bg-[#0b0d14] overflow-hidden"
        >
          {/* Filter & Toolbar */}
          <div className="p-2.5 border-b border-white/10 bg-[#121622] flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-white">Messages</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-white/10 text-zinc-300 font-mono">
                {filteredMessages.length}
              </span>

              {/* Filter Direction */}
              <div className="flex items-center bg-[#080a10] border border-white/10 rounded p-0.5 text-[11px]">
                <button
                  onClick={() => setFilterDirection('all')}
                  className={`px-2 py-0.5 rounded ${filterDirection === 'all' ? 'bg-white/15 text-white' : 'text-zinc-400'}`}
                >
                  All
                </button>
                <button
                  onClick={() => setFilterDirection('in')}
                  className={`px-2 py-0.5 rounded flex items-center gap-1 ${filterDirection === 'in' ? 'bg-emerald-500/20 text-emerald-300' : 'text-zinc-400'}`}
                >
                  <ArrowDownLeft className="w-3 h-3 text-emerald-400" />
                  In
                </button>
                <button
                  onClick={() => setFilterDirection('out')}
                  className={`px-2 py-0.5 rounded flex items-center gap-1 ${filterDirection === 'out' ? 'bg-blue-500/20 text-blue-300' : 'text-zinc-400'}`}
                >
                  <ArrowUpRight className="w-3 h-3 text-blue-400" />
                  Out
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Search query */}
              <div className="flex items-center bg-[#080a10] border border-white/10 rounded px-2 py-1 text-xs">
                <Search className="w-3 h-3 text-zinc-500 mr-1" />
                <input
                  type="text"
                  value={filterQuery}
                  onChange={(e) => setFilterQuery(e.target.value)}
                  placeholder="Filter payload..."
                  className="bg-transparent text-xs text-white placeholder-zinc-600 outline-none w-28"
                />
              </div>

              <label className="flex items-center gap-1 text-[11px] text-zinc-400 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={autoScroll}
                  onChange={(e) => setAutoScroll(e.target.checked)}
                  className="rounded border-zinc-700 text-emerald-500"
                />
                Auto-scroll
              </label>

              <button
                onClick={() => setMessages([])}
                className="p-1.5 hover:bg-white/10 rounded text-zinc-400 hover:text-rose-400 transition-colors"
                title="Clear Message Log"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Messages list */}
          <div ref={messagesEndRef} className="flex-1 overflow-y-auto p-3 space-y-2 font-mono text-xs">
            {filteredMessages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-zinc-500 py-16">
                <Radio className="w-10 h-10 text-zinc-700 mb-3" />
                <p className="font-sans text-sm font-medium">No messages yet</p>
                <p className="font-sans text-xs text-zinc-600 mt-1 max-w-sm text-center">
                  Connect to a WebSocket endpoint above and send payloads to observe real-time message exchange.
                </p>
              </div>
            ) : (
              filteredMessages.map((msg) => {
                const isIn = msg.direction === 'in';
                const isPing = msg.type === 'ping' || msg.type === 'pong';

                return (
                  <div
                    key={msg.id}
                    className={`group p-2.5 rounded-lg border transition-all ${
                      isIn 
                        ? 'bg-[#121824]/80 border-emerald-500/20 hover:border-emerald-500/40' 
                        : 'bg-[#161a29]/80 border-blue-500/20 hover:border-blue-500/40'
                    }`}
                  >
                    <div className="flex items-center justify-between text-[11px] text-zinc-400 mb-1.5">
                      <div className="flex items-center gap-2">
                        {isIn ? (
                          <span className="flex items-center gap-1 text-emerald-400 font-bold">
                            <ArrowDownLeft className="w-3.5 h-3.5" />
                            RECEIVED
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-blue-400 font-bold">
                            <ArrowUpRight className="w-3.5 h-3.5" />
                            SENT
                          </span>
                        )}

                        <span className="text-zinc-500 font-mono">{msg.timestamp}</span>
                        {msg.sizeBytes !== undefined && (
                          <span className="text-zinc-600 text-[10px]">({msg.sizeBytes} B)</span>
                        )}
                        {isPing && (
                          <span className="px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-300 text-[10px]">HEARTBEAT</span>
                        )}
                      </div>

                      <button
                        onClick={() => handleCopyMessage(msg)}
                        className="opacity-0 group-hover:opacity-100 flex items-center gap-1 text-[10px] text-zinc-400 hover:text-white px-1.5 py-0.5 rounded bg-white/5 transition-opacity"
                      >
                        {copiedId === msg.id ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                        {copiedId === msg.id ? 'Copied' : 'Copy'}
                      </button>
                    </div>

                    <pre className="text-zinc-200 whitespace-pre-wrap break-all select-text font-mono text-xs bg-[#08090f] p-2 rounded border border-white/5">
                      {msg.content}
                    </pre>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
