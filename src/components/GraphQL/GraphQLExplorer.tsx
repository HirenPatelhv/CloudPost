import React, { useState, useRef } from 'react';
import { 
  Code2, 
  Play, 
  Sparkles, 
  Copy, 
  Check, 
  Clock, 
  Search, 
  Database, 
  FileText, 
  CheckCircle2, 
  AlertCircle,
  HelpCircle,
  ChevronRight,
  ChevronDown
} from 'lucide-react';
import { KeyValueItem } from '../../types';
import { PaneSplitter } from '../Common/PaneSplitter';

interface GraphQLExplorerProps {
  initialUrl?: string;
  layoutMode?: 'columns' | 'rows';
}

const GRAPHQL_PRESETS = [
  {
    name: 'Countries & Continents',
    url: 'https://countries.trevorblades.com/',
    query: `query GetCountriesAndContinents {
  countries(filter: { continent: { eq: "EU" } }) {
    code
    name
    emoji
    capital
    currency
    languages {
      name
      native
    }
  }
}`,
    variables: '{}'
  },
  {
    name: 'SpaceX Launches',
    url: 'https://spacex-production.up.railway.app/',
    query: `query GetRecentLaunches {
  launchesPast(limit: 5) {
    mission_name
    launch_date_local
    launch_site {
      site_name_long
    }
    rocket {
      rocket_name
    }
  }
}`,
    variables: '{}'
  }
];

export const GraphQLExplorer: React.FC<GraphQLExplorerProps> = ({
  initialUrl = 'https://countries.trevorblades.com/',
  layoutMode = 'columns',
}) => {
  const [url, setUrl] = useState(initialUrl);
  const [query, setQuery] = useState(GRAPHQL_PRESETS[0].query);
  const [variables, setVariables] = useState('{}');
  const [activeSubTab, setActiveSubTab] = useState<'query' | 'variables' | 'headers'>('query');
  const [headers, setHeaders] = useState<KeyValueItem[]>([
    { id: 'h1', key: 'Content-Type', value: 'application/json', enabled: true },
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const [response, setResponse] = useState<any>(null);
  const [responseTime, setResponseTime] = useState<number | null>(null);
  const [responseSize, setResponseSize] = useState<number | null>(null);
  const [schemaTypes, setSchemaTypes] = useState<any[]>([]);
  const [showSchemaDrawer, setShowSchemaDrawer] = useState(false);
  const [copied, setCopied] = useState(false);
  const splitContainerRef = useRef<HTMLDivElement | null>(null);
  const [splitRatio, setSplitRatio] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('cp_gql_split_ratio');
      if (saved) {
        const val = parseFloat(saved);
        if (!isNaN(val) && val >= 18 && val <= 82) return val;
      }
    } catch (e) {}
    return 50;
  });

  const handleRatioChange = (val: number) => {
    setSplitRatio(val);
    try { localStorage.setItem('cp_gql_split_ratio', String(val)); } catch (e) {}
  };

  const handleExecute = async () => {
    if (!url.trim()) {
      alert('Please enter a GraphQL endpoint URL');
      return;
    }

    setIsLoading(true);
    setResponse(null);
    const startTime = Date.now();

    try {
      let parsedVariables = {};
      if (variables.trim()) {
        try {
          parsedVariables = JSON.parse(variables);
        } catch {
          alert('GraphQL Variables must be valid JSON');
          setIsLoading(false);
          return;
        }
      }

      const reqHeaders: Record<string, string> = {};
      headers.filter(h => h.enabled && h.key).forEach(h => {
        reqHeaders[h.key] = h.value;
      });

      const res = await fetch(url.trim(), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...reqHeaders,
        },
        body: JSON.stringify({
          query,
          variables: parsedVariables,
        }),
      });

      const latency = Date.now() - startTime;
      const data = await res.json();
      const rawText = JSON.stringify(data);

      setResponse(data);
      setResponseTime(latency);
      setResponseSize(new Blob([rawText]).size);
    } catch (err: any) {
      setResponse({
        errors: [{ message: `GraphQL execution error: ${err.message}` }]
      });
      setResponseTime(Date.now() - startTime);
    } finally {
      setIsLoading(false);
    }
  };

  const handleIntrospectSchema = async () => {
    setIsLoading(true);
    try {
      const introspectionQuery = `
        query IntrospectionQuery {
          __schema {
            queryType { name }
            mutationType { name }
            types {
              name
              kind
              description
              fields {
                name
                description
                type {
                  name
                  kind
                }
              }
            }
          }
        }
      `;

      const res = await fetch(url.trim(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: introspectionQuery })
      });

      const json = await res.json();
      if (json.data?.__schema?.types) {
        const filtered = json.data.__schema.types.filter((t: any) => !t.name.startsWith('__'));
        setSchemaTypes(filtered);
        setShowSchemaDrawer(true);
      } else {
        alert('Introspection disabled or not supported by endpoint.');
      }
    } catch (e: any) {
      alert(`Introspection failed: ${e.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyResponse = () => {
    if (!response) return;
    navigator.clipboard.writeText(JSON.stringify(response, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="h-full flex flex-col bg-[#0b0d14] text-zinc-200 overflow-hidden font-sans">
      {/* Top Header & URL Bar */}
      <div className="p-3 border-b border-white/10 bg-[#121522] flex flex-col gap-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded bg-pink-500/10 border border-pink-500/30 flex items-center justify-center text-pink-400">
              <Code2 className="w-4 h-4" />
            </div>
            <span className="font-bold text-sm text-white">Postman GraphQL Explorer</span>
            <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-pink-500/10 text-pink-400 border border-pink-500/20">
              Schema Introspection
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleIntrospectSchema}
              className="flex items-center gap-1.5 text-xs text-zinc-300 hover:text-white px-2.5 py-1 rounded bg-white/5 hover:bg-white/10 border border-white/10 transition-colors"
            >
              <Database className="w-3.5 h-3.5 text-pink-400" />
              Introspect Schema
            </button>
          </div>
        </div>

        {/* URL Bar & Execute button */}
        <div className="flex items-center gap-2">
          <div className="flex-1 flex items-center bg-[#07090e] border border-white/15 rounded-lg overflow-hidden focus-within:border-pink-500/60 transition-colors">
            <span className="px-3 py-2 bg-pink-500/10 text-xs font-mono font-bold text-pink-400 border-r border-white/10 select-none">
              POST
            </span>
            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://your-graphql-endpoint/graphql"
              className="flex-1 bg-transparent px-3 py-2 text-xs font-mono text-white placeholder-zinc-500 outline-none"
            />
          </div>

          <button
            onClick={handleExecute}
            disabled={isLoading}
            className="flex items-center gap-1.5 px-4 py-2 bg-pink-600 hover:bg-pink-500 disabled:opacity-50 text-white rounded-lg text-xs font-bold transition-colors shadow-lg shadow-pink-600/20"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            {isLoading ? 'Executing...' : 'Query'}
          </button>
        </div>

        {/* Quick Presets */}
        <div className="flex items-center gap-2 text-[11px] text-zinc-400 overflow-x-auto">
          <span className="text-zinc-500 font-semibold shrink-0">Sample Endpoints:</span>
          {GRAPHQL_PRESETS.map(p => (
            <button
              key={p.name}
              onClick={() => {
                setUrl(p.url);
                setQuery(p.query);
                setVariables(p.variables);
              }}
              className={`px-2 py-0.5 rounded border transition-colors whitespace-nowrap ${
                url === p.url
                  ? 'bg-pink-500/10 border-pink-500/30 text-pink-300'
                  : 'bg-white/5 border-white/5 hover:border-white/20 text-zinc-400 hover:text-white'
              }`}
            >
              {p.name}
            </button>
          ))}
        </div>
      </div>

      {/* Main Split: Left Editor, Right Response */}
      <div
        ref={splitContainerRef}
        className={`flex-1 flex ${layoutMode === 'rows' ? 'flex-col' : 'flex-row'} overflow-hidden min-w-0`}
      >
        {/* Left: Query & Variables Editor */}
        <div
          style={{
            flex: 'none',
            ...(layoutMode === 'rows'
              ? { height: `${splitRatio}%`, width: '100%' }
              : { width: `${splitRatio}%`, height: '100%' })
          }}
          className={`overflow-hidden flex flex-col bg-[#0e101a] min-w-0 ${
            layoutMode === 'rows'
              ? 'min-h-[180px] max-h-[calc(100%-140px)]'
              : 'min-w-[260px] max-w-[calc(100%-200px)]'
          }`}
        >
          {/* Sub tabs: Query vs Variables vs Headers */}
          <div className="px-3 border-b border-white/10 bg-[#121624] flex items-center justify-between">
            <div className="flex items-center gap-1">
              <button
                onClick={() => setActiveSubTab('query')}
                className={`px-3 py-2 text-xs font-semibold border-b-2 transition-colors ${
                  activeSubTab === 'query'
                    ? 'border-pink-500 text-white'
                    : 'border-transparent text-zinc-400 hover:text-zinc-200'
                }`}
              >
                Query / Mutation
              </button>
              <button
                onClick={() => setActiveSubTab('variables')}
                className={`px-3 py-2 text-xs font-semibold border-b-2 transition-colors ${
                  activeSubTab === 'variables'
                    ? 'border-pink-500 text-white'
                    : 'border-transparent text-zinc-400 hover:text-zinc-200'
                }`}
              >
                Variables (JSON)
              </button>
              <button
                onClick={() => setActiveSubTab('headers')}
                className={`px-3 py-2 text-xs font-semibold border-b-2 transition-colors ${
                  activeSubTab === 'headers'
                    ? 'border-pink-500 text-white'
                    : 'border-transparent text-zinc-400 hover:text-zinc-200'
                }`}
              >
                Headers ({headers.filter(h => h.enabled).length})
              </button>
            </div>
          </div>

          <div className="flex-1 p-3">
            {activeSubTab === 'query' && (
              <textarea
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="query { ... }"
                className="w-full h-full bg-[#07080f] border border-white/10 rounded-lg p-3 font-mono text-xs text-white placeholder-zinc-600 resize-none outline-none focus:border-pink-500/50"
              />
            )}

            {activeSubTab === 'variables' && (
              <textarea
                value={variables}
                onChange={(e) => setVariables(e.target.value)}
                placeholder={'{\n  "limit": 10\n}'}
                className="w-full h-full bg-[#07080f] border border-white/10 rounded-lg p-3 font-mono text-xs text-white placeholder-zinc-600 resize-none outline-none focus:border-pink-500/50"
              />
            )}

            {activeSubTab === 'headers' && (
              <div className="space-y-2">
                {headers.map((h, i) => (
                  <div key={h.id} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={h.enabled}
                      onChange={(e) => {
                        const updated = [...headers];
                        updated[i].enabled = e.target.checked;
                        setHeaders(updated);
                      }}
                      className="rounded border-zinc-700 text-pink-500"
                    />
                    <input
                      type="text"
                      value={h.key}
                      onChange={(e) => {
                        const updated = [...headers];
                        updated[i].key = e.target.value;
                        setHeaders(updated);
                      }}
                      placeholder="Header Name"
                      className="flex-1 bg-[#07080f] border border-white/10 text-xs text-white rounded px-2.5 py-1.5 outline-none font-mono"
                    />
                    <input
                      type="text"
                      value={h.value}
                      onChange={(e) => {
                        const updated = [...headers];
                        updated[i].value = e.target.value;
                        setHeaders(updated);
                      }}
                      placeholder="Value"
                      className="flex-1 bg-[#07080f] border border-white/10 text-xs text-white rounded px-2.5 py-1.5 outline-none font-mono"
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Resizable Splitter */}
        <PaneSplitter
          layoutMode={layoutMode}
          ratio={splitRatio}
          onChange={handleRatioChange}
          onReset={() => handleRatioChange(50)}
          containerRef={splitContainerRef}
        />

        {/* Right: Response Output */}
        <div
          style={{
            flex: '1 1 0%',
            minWidth: layoutMode === 'columns' ? '200px' : 0,
            minHeight: layoutMode === 'rows' ? '140px' : 0
          }}
          className="flex flex-col bg-[#07080e] overflow-hidden"
        >
          {/* Response metrics bar */}
          <div className="p-2.5 border-b border-white/10 bg-[#101320] flex items-center justify-between text-xs">
            <div className="flex items-center gap-3">
              <span className="font-bold text-white">GraphQL Response</span>
              {responseTime !== null && (
                <span className="flex items-center gap-1 text-emerald-400 font-mono text-[11px]">
                  <Clock className="w-3.5 h-3.5" />
                  {responseTime} ms
                </span>
              )}
              {responseSize !== null && (
                <span className="text-zinc-500 font-mono text-[11px]">
                  {(responseSize / 1024).toFixed(2)} KB
                </span>
              )}
            </div>

            {response && (
              <button
                onClick={handleCopyResponse}
                className="flex items-center gap-1 text-zinc-400 hover:text-white px-2 py-1 rounded hover:bg-white/10 text-xs transition-colors"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? 'Copied' : 'Copy'}
              </button>
            )}
          </div>

          <div className="flex-1 p-3 overflow-y-auto font-mono text-xs">
            {response ? (
              <pre className="text-zinc-200 select-text whitespace-pre-wrap break-all bg-[#040508] p-3 rounded-lg border border-white/5">
                {JSON.stringify(response, null, 2)}
              </pre>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-zinc-500 py-16">
                <Code2 className="w-10 h-10 text-zinc-700 mb-2" />
                <p className="font-sans text-sm">Hit "Query" to fetch GraphQL response</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
