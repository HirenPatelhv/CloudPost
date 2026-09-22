import React, { useState } from 'react';
import { 
  ChevronRight, 
  ChevronDown, 
  Copy, 
  Check, 
  Search, 
  Maximize2, 
  Minimize2 
} from 'lucide-react';

interface JsonTreeViewerProps {
  data: any;
  searchTerm?: string;
}

interface TreeNodeProps {
  name: string;
  value: any;
  path: string;
  depth: number;
  searchTerm: string;
  defaultExpanded?: boolean;
}

const TYPE_BADGES: Record<string, { label: string; color: string; text: string }> = {
  object: { label: 'obj', color: 'bg-orange-500/10 text-orange-400 border-orange-500/20', text: 'text-orange-400' },
  array: { label: 'arr', color: 'bg-purple-500/10 text-purple-400 border-purple-500/20', text: 'text-purple-400' },
  string: { label: 'str', color: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20', text: 'text-emerald-300' },
  number: { label: 'num', color: 'bg-amber-500/10 text-amber-300 border-amber-500/20', text: 'text-amber-300' },
  boolean: { label: 'bool', color: 'bg-blue-500/10 text-blue-300 border-blue-500/20', text: 'text-blue-300' },
  null: { label: 'null', color: 'bg-rose-500/10 text-rose-300 border-rose-500/20', text: 'text-rose-400' },
};

const TreeNode: React.FC<TreeNodeProps> = ({ name, value, path, depth, searchTerm, defaultExpanded = true }) => {
  const [isExpanded, setIsExpanded] = useState<boolean>(depth < 2 || defaultExpanded);
  const [copied, setCopied] = useState(false);

  const isObject = value !== null && typeof value === 'object' && !Array.isArray(value);
  const isArray = Array.isArray(value);
  const isNull = value === null;
  const type = isArray ? 'array' : isObject ? 'object' : isNull ? 'null' : typeof value;

  const isLeaf = !isObject && !isArray;

  const handleCopyPath = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(path);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const highlightMatch = (text: string) => {
    if (!searchTerm) return text;
    const parts = text.split(new RegExp(`(${searchTerm})`, 'gi'));
    return (
      <>
        {parts.map((part, i) =>
          part.toLowerCase() === searchTerm.toLowerCase() ? (
            <mark key={i} className="bg-orange-500/40 text-orange-200 rounded px-0.5">
              {part}
            </mark>
          ) : (
            part
          )
        )}
      </>
    );
  };

  const renderValue = () => {
    if (isNull) return <span className="text-rose-400 italic">null</span>;
    if (typeof value === 'boolean') return <span className="text-blue-400 font-bold">{String(value)}</span>;
    if (typeof value === 'number') return <span className="text-amber-300 font-mono">{value}</span>;
    if (typeof value === 'string') {
      return (
        <span className="text-emerald-300 font-mono">
          &quot;{highlightMatch(value)}&quot;
        </span>
      );
    }
    return null;
  };

  const childEntries = isObject ? Object.entries(value) : isArray ? value.map((item, idx) => [String(idx), item] as [string, any]) : [];

  return (
    <div className="font-mono text-xs select-text">
      <div
        onClick={() => !isLeaf && setIsExpanded(!isExpanded)}
        className={`group flex items-center gap-1.5 py-0.5 px-2 rounded hover:bg-white/5 transition-colors cursor-pointer ${
          depth === 0 ? 'bg-white/[0.02]' : ''
        }`}
        style={{ paddingLeft: `${Math.max(8, depth * 18)}px` }}
      >
        {/* Toggle icon */}
        {!isLeaf ? (
          <span className="text-zinc-400 group-hover:text-white p-0.5">
            {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
          </span>
        ) : (
          <span className="w-3.5 h-3.5 inline-block opacity-0" />
        )}

        {/* Key name */}
        <span className="font-semibold text-orange-300/90">
          {highlightMatch(name)}:
        </span>

        {/* Value preview or collapsed brackets */}
        {isLeaf ? (
          <div>{renderValue()}</div>
        ) : (
          <div className="flex items-center gap-2 text-zinc-400">
            <span className="text-zinc-500 font-mono">
              {isArray ? `Array(${childEntries.length})` : `Object{${childEntries.length}}`}
            </span>
            {!isExpanded && (
              <span className="text-[10px] text-zinc-500 bg-white/5 px-1.5 py-0.2 rounded border border-white/5">
                {isArray ? '[ ... ]' : '{ ... }'}
              </span>
            )}
          </div>
        )}

        {/* Type Badge on Hover */}
        <span
          className={`ml-auto opacity-0 group-hover:opacity-100 text-[9.5px] uppercase font-mono px-1.5 py-0.2 rounded border transition-opacity ${
            TYPE_BADGES[type]?.color || 'bg-white/5 text-zinc-400 border-white/10'
          }`}
        >
          {TYPE_BADGES[type]?.label || type}
        </span>

        {/* Quick Copy Path Button on Hover */}
        <button
          onClick={handleCopyPath}
          className="opacity-0 group-hover:opacity-100 p-1 hover:bg-white/10 rounded text-zinc-400 hover:text-orange-300 transition-opacity ml-1"
          title={`Copy JSON path: ${path}`}
        >
          {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
        </button>
      </div>

      {/* Children list */}
      {!isLeaf && isExpanded && (
        <div className="border-l border-white/5 ml-3">
          {childEntries.map(([childKey, childVal]) => (
            <TreeNode
              key={childKey}
              name={isArray ? `[${childKey}]` : childKey}
              value={childVal}
              path={isArray ? `${path}[${childKey}]` : `${path}.${childKey}`}
              depth={depth + 1}
              searchTerm={searchTerm}
              defaultExpanded={defaultExpanded}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export const JsonTreeViewer: React.FC<JsonTreeViewerProps> = ({ data, searchTerm = '' }) => {
  const [expandAll, setExpandAll] = useState<boolean | null>(null);

  const parsedData = typeof data === 'string' ? (() => {
    try {
      return JSON.parse(data);
    } catch {
      return data;
    }
  })() : data;

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between pb-2 mb-2 border-b border-white/5 text-[11px] text-zinc-400">
        <span>Interactive Collapsible Tree</span>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setExpandAll(true)}
            className="px-2 py-0.5 bg-white/5 hover:bg-white/10 rounded text-zinc-300 transition-colors"
          >
            Expand All
          </button>
          <button
            onClick={() => setExpandAll(false)}
            className="px-2 py-0.5 bg-white/5 hover:bg-white/10 rounded text-zinc-300 transition-colors"
          >
            Collapse All
          </button>
        </div>
      </div>

      <TreeNode
        name="root"
        value={parsedData}
        path="$"
        depth={0}
        searchTerm={searchTerm}
        defaultExpanded={expandAll ?? true}
        key={expandAll === null ? 'default' : expandAll ? 'expanded' : 'collapsed'}
      />
    </div>
  );
};
