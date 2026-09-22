import React, { useEffect, useRef, useState, useMemo } from 'react';
import * as d3 from 'd3';
import { 
  ZoomIn, 
  ZoomOut, 
  RotateCcw, 
  Maximize2, 
  Minimize2, 
  Search, 
  Sliders, 
  Copy, 
  Check, 
  ChevronRight, 
  ChevronDown, 
  Layers, 
  Compass,
  Info,
  GitFork
} from 'lucide-react';

interface JsonNode {
  id: string;
  name: string;
  value: any;
  type: 'object' | 'array' | 'string' | 'number' | 'boolean' | 'null';
  path: string;
  children?: JsonNode[];
  _children?: JsonNode[]; // For collapse storage
  childCount?: number;
  depth?: number;
}

interface JsonGraphViewerProps {
  data: any;
  initialDepth?: number;
}

const TYPE_COLORS: Record<string, { bg: string; border: string; text: string; dot: string }> = {
  object: { bg: 'rgba(249, 115, 22, 0.15)', border: 'rgba(249, 115, 22, 0.6)', text: '#fb923c', dot: '#f97316' },
  array: { bg: 'rgba(168, 85, 247, 0.15)', border: 'rgba(168, 85, 247, 0.6)', text: '#c084fc', dot: '#a855f7' },
  string: { bg: 'rgba(52, 211, 153, 0.12)', border: 'rgba(52, 211, 153, 0.5)', text: '#6ee7b7', dot: '#34d399' },
  number: { bg: 'rgba(251, 191, 36, 0.12)', border: 'rgba(251, 191, 36, 0.5)', text: '#fcd34d', dot: '#fbbf24' },
  boolean: { bg: 'rgba(96, 165, 250, 0.12)', border: 'rgba(96, 165, 250, 0.5)', text: '#93c5fd', dot: '#60a5fa' },
  null: { bg: 'rgba(244, 63, 94, 0.12)', border: 'rgba(244, 63, 94, 0.5)', text: '#fda4af', dot: '#f43f5e' },
};

function buildJsonTree(val: any, key = 'root', path = '$', currentDepth = 0): JsonNode {
  const id = `${path}_${key}_${Math.random().toString(36).substring(2, 7)}`;
  if (val === null) {
    return { id, name: key, value: null, type: 'null', path, depth: currentDepth };
  }
  if (Array.isArray(val)) {
    const children = val.map((item, idx) => 
      buildJsonTree(item, `[${idx}]`, `${path}[${idx}]`, currentDepth + 1)
    );
    return {
      id,
      name: key,
      value: val,
      type: 'array',
      path,
      childCount: val.length,
      children,
      depth: currentDepth,
    };
  }
  if (typeof val === 'object') {
    const keys = Object.keys(val);
    const children = keys.map(k =>
      buildJsonTree(val[k], k, path === '$' ? k : `${path}.${k}`, currentDepth + 1)
    );
    return {
      id,
      name: key,
      value: val,
      type: 'object',
      path,
      childCount: keys.length,
      children,
      depth: currentDepth,
    };
  }
  const t = typeof val as 'string' | 'number' | 'boolean';
  return { id, name: key, value: val, type: t, path, depth: currentDepth };
}

export const JsonGraphViewer: React.FC<JsonGraphViewerProps> = ({ data, initialDepth = 2 }) => {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const [selectedNode, setSelectedNode] = useState<JsonNode | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [maxDepth, setMaxDepth] = useState<number>(initialDepth);
  const [layoutMode, setLayoutMode] = useState<'tree-horizontal' | 'tree-vertical' | 'radial'>('tree-horizontal');
  const [copiedPath, setCopiedPath] = useState(false);
  const [copiedValue, setCopiedValue] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Parse root data into tree
  const rootData = useMemo(() => {
    try {
      const parsed = typeof data === 'string' ? JSON.parse(data) : data;
      return buildJsonTree(parsed, 'response');
    } catch {
      return buildJsonTree(data, 'response');
    }
  }, [data]);

  // Keep a ref to rootData to mutate expand/collapse states dynamically
  const treeStateRef = useRef<JsonNode | null>(null);
  const zoomBehaviorRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null);

  // Apply initial depth collapse
  useEffect(() => {
    function applyDepth(node: JsonNode, depth: number) {
      if (!node.children && !node._children) return;
      if (node._children && !node.children) {
        node.children = node._children;
        node._children = undefined;
      }
      if ((node.depth || 0) >= depth && node.children && node.children.length > 0) {
        node._children = node.children;
        node.children = undefined;
      } else if (node.children) {
        node.children.forEach(child => applyDepth(child, depth));
      }
    }

    const cloned: JsonNode = JSON.parse(JSON.stringify(rootData));
    applyDepth(cloned, maxDepth);
    treeStateRef.current = cloned;
    renderGraph();
  }, [rootData, maxDepth, layoutMode]);

  // Render D3 Graph
  const renderGraph = () => {
    if (!svgRef.current || !containerRef.current || !treeStateRef.current) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const width = containerRef.current.clientWidth || 800;
    const height = containerRef.current.clientHeight || 500;

    const g = svg.append('g').attr('class', 'main-graph-group');

    // Zoom setup
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.15, 3])
      .on('zoom', (event) => {
        g.attr('transform', event.transform);
      });

    svg.call(zoom);
    zoomBehaviorRef.current = zoom;

    // Build D3 Hierarchy
    const root = d3.hierarchy<JsonNode>(treeStateRef.current, d => d.children);

    if (layoutMode === 'tree-horizontal') {
      const treeLayout = d3.tree<JsonNode>()
        .nodeSize([60, 220])
        .separation((a, b) => (a.parent === b.parent ? 1 : 1.25));

      treeLayout(root);

      // Links
      const linkGenerator = d3.linkHorizontal<any, any>()
        .x(d => d.y)
        .y(d => d.x);

      g.append('g')
        .attr('class', 'links')
        .selectAll('path')
        .data(root.links())
        .enter()
        .append('path')
        .attr('d', linkGenerator as any)
        .attr('fill', 'none')
        .attr('stroke', 'rgba(255, 255, 255, 0.15)')
        .attr('stroke-width', 1.5)
        .attr('stroke-dasharray', (d: any) => (d.target.data.type === 'array' ? '4 2' : 'none'));

      // Nodes
      const nodes = g.append('g')
        .attr('class', 'nodes')
        .selectAll('g')
        .data(root.descendants())
        .enter()
        .append('g')
        .attr('transform', d => `translate(${d.y},${d.x})`)
        .attr('class', 'cursor-pointer')
        .on('click', (event, d) => {
          event.stopPropagation();
          setSelectedNode(d.data);
          toggleNode(d.data);
        });

      // Node Card Background
      nodes.each(function(d) {
        const nodeG = d3.select(this);
        const typeInfo = TYPE_COLORS[d.data.type] || TYPE_COLORS.string;
        const isSelected = selectedNode?.id === d.data.id;
        const matchesSearch = searchTerm.trim() && (
          d.data.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          String(d.data.value).toLowerCase().includes(searchTerm.toLowerCase())
        );

        const cardWidth = Math.min(200, Math.max(120, d.data.name.length * 9 + 40));
        const cardHeight = 36;

        nodeG.append('rect')
          .attr('x', -10)
          .attr('y', -cardHeight / 2)
          .attr('width', cardWidth)
          .attr('height', cardHeight)
          .attr('rx', 8)
          .attr('fill', '#141824')
          .attr('stroke', matchesSearch ? '#f97316' : isSelected ? '#38bdf8' : typeInfo.border)
          .attr('stroke-width', matchesSearch || isSelected ? 2 : 1)
          .attr('filter', isSelected ? 'drop-shadow(0 0 8px rgba(56, 189, 248, 0.4))' : 'none');

        // Type indicator color bar on left
        nodeG.append('rect')
          .attr('x', -10)
          .attr('y', -cardHeight / 2)
          .attr('width', 4)
          .attr('height', cardHeight)
          .attr('rx', 2)
          .attr('fill', typeInfo.dot);

        // Node Key Text
        nodeG.append('text')
          .attr('x', 6)
          .attr('y', -3)
          .attr('fill', '#f1f5f9')
          .attr('font-size', '11px')
          .attr('font-weight', '600')
          .attr('font-family', 'monospace')
          .text(d.data.name.length > 16 ? d.data.name.substring(0, 15) + '…' : d.data.name);

        // Node Value preview / Type badge
        let previewText = '';
        if (d.data.type === 'object') {
          const count = d.data.childCount || 0;
          previewText = `{ ${count} ${count === 1 ? 'key' : 'keys'} }`;
        } else if (d.data.type === 'array') {
          const count = d.data.childCount || 0;
          previewText = `[ ${count} ${count === 1 ? 'item' : 'items'} ]`;
        } else if (d.data.type === 'string') {
          const str = String(d.data.value);
          previewText = `"${str.length > 14 ? str.substring(0, 13) + '…' : str}"`;
        } else {
          previewText = String(d.data.value);
        }

        nodeG.append('text')
          .attr('x', 6)
          .attr('y', 11)
          .attr('fill', typeInfo.text)
          .attr('font-size', '9.5px')
          .attr('font-family', 'monospace')
          .text(previewText);

        // Expand/Collapse Indicator if has children
        if (d.data.children || d.data._children) {
          const isCollapsed = !d.data.children && Boolean(d.data._children);
          const circleG = nodeG.append('g')
            .attr('transform', `translate(${cardWidth - 10}, 0)`);

          circleG.append('circle')
            .attr('r', 8)
            .attr('fill', isCollapsed ? '#f97316' : '#1e293b')
            .attr('stroke', '#f97316')
            .attr('stroke-width', 1.5);

          circleG.append('text')
            .attr('text-anchor', 'middle')
            .attr('dominant-baseline', 'central')
            .attr('fill', isCollapsed ? '#ffffff' : '#f97316')
            .attr('font-size', '10px')
            .attr('font-weight', 'bold')
            .text(isCollapsed ? '+' : '−');
        }
      });

      // Initial center transform
      const initialTransform = d3.zoomIdentity.translate(80, height / 2).scale(0.85);
      svg.call(zoom.transform, initialTransform);

    } else if (layoutMode === 'tree-vertical') {
      const treeLayout = d3.tree<JsonNode>()
        .nodeSize([160, 90])
        .separation((a, b) => (a.parent === b.parent ? 1.1 : 1.3));

      treeLayout(root);

      const linkGenerator = d3.linkVertical<any, any>()
        .x(d => d.x)
        .y(d => d.y);

      g.append('g')
        .attr('class', 'links')
        .selectAll('path')
        .data(root.links())
        .enter()
        .append('path')
        .attr('d', linkGenerator as any)
        .attr('fill', 'none')
        .attr('stroke', 'rgba(255, 255, 255, 0.15)')
        .attr('stroke-width', 1.5);

      const nodes = g.append('g')
        .attr('class', 'nodes')
        .selectAll('g')
        .data(root.descendants())
        .enter()
        .append('g')
        .attr('transform', d => `translate(${d.x},${d.y})`)
        .attr('class', 'cursor-pointer')
        .on('click', (event, d) => {
          event.stopPropagation();
          setSelectedNode(d.data);
          toggleNode(d.data);
        });

      nodes.each(function(d) {
        const nodeG = d3.select(this);
        const typeInfo = TYPE_COLORS[d.data.type] || TYPE_COLORS.string;
        const isSelected = selectedNode?.id === d.data.id;
        const matchesSearch = searchTerm.trim() && (
          d.data.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          String(d.data.value).toLowerCase().includes(searchTerm.toLowerCase())
        );

        nodeG.append('rect')
          .attr('x', -60)
          .attr('y', -16)
          .attr('width', 120)
          .attr('height', 32)
          .attr('rx', 6)
          .attr('fill', '#141824')
          .attr('stroke', matchesSearch ? '#f97316' : isSelected ? '#38bdf8' : typeInfo.border)
          .attr('stroke-width', matchesSearch || isSelected ? 2 : 1);

        nodeG.append('text')
          .attr('x', 0)
          .attr('y', -2)
          .attr('text-anchor', 'middle')
          .attr('fill', '#f1f5f9')
          .attr('font-size', '10.5px')
          .attr('font-weight', '600')
          .attr('font-family', 'monospace')
          .text(d.data.name.length > 14 ? d.data.name.substring(0, 13) + '…' : d.data.name);

        nodeG.append('text')
          .attr('x', 0)
          .attr('y', 10)
          .attr('text-anchor', 'middle')
          .attr('fill', typeInfo.text)
          .attr('font-size', '9px')
          .attr('font-family', 'monospace')
          .text(d.data.type === 'object' ? `{${d.data.childCount || 0}}` : d.data.type === 'array' ? `[${d.data.childCount || 0}]` : String(d.data.value).substring(0, 10));
      });

      const initialTransform = d3.zoomIdentity.translate(width / 2, 60).scale(0.85);
      svg.call(zoom.transform, initialTransform);
    }
  };

  const toggleNode = (targetNode: JsonNode) => {
    function toggleRecursive(node: JsonNode): boolean {
      if (node.id === targetNode.id) {
        if (node.children) {
          node._children = node.children;
          node.children = undefined;
        } else if (node._children) {
          node.children = node._children;
          node._children = undefined;
        }
        return true;
      }
      if (node.children) {
        for (const child of node.children) {
          if (toggleRecursive(child)) return true;
        }
      }
      if (node._children) {
        for (const child of node._children) {
          if (toggleRecursive(child)) return true;
        }
      }
      return false;
    }

    if (treeStateRef.current) {
      toggleRecursive(treeStateRef.current);
      renderGraph();
    }
  };

  const handleExpandAll = () => {
    function expand(node: JsonNode) {
      if (node._children) {
        node.children = node._children;
        node._children = undefined;
      }
      if (node.children) {
        node.children.forEach(expand);
      }
    }
    if (treeStateRef.current) {
      expand(treeStateRef.current);
      renderGraph();
    }
  };

  const handleCollapseAll = () => {
    function collapse(node: JsonNode, isRoot = true) {
      if (node.children) {
        node.children.forEach(c => collapse(c, false));
        if (!isRoot) {
          node._children = node.children;
          node.children = undefined;
        }
      }
    }
    if (treeStateRef.current) {
      collapse(treeStateRef.current, true);
      renderGraph();
    }
  };

  const handleZoom = (factor: number) => {
    if (!svgRef.current || !zoomBehaviorRef.current) return;
    d3.select(svgRef.current).transition().duration(250).call(zoomBehaviorRef.current.scaleBy, factor);
  };

  const handleResetZoom = () => {
    if (!svgRef.current || !zoomBehaviorRef.current || !containerRef.current) return;
    const width = containerRef.current.clientWidth || 800;
    const height = containerRef.current.clientHeight || 500;
    const transform = layoutMode === 'tree-vertical'
      ? d3.zoomIdentity.translate(width / 2, 60).scale(0.85)
      : d3.zoomIdentity.translate(80, height / 2).scale(0.85);
    d3.select(svgRef.current).transition().duration(350).call(zoomBehaviorRef.current.transform, transform);
  };

  const handleCopyPath = () => {
    if (!selectedNode) return;
    navigator.clipboard.writeText(selectedNode.path);
    setCopiedPath(true);
    setTimeout(() => setCopiedPath(false), 1800);
  };

  const handleCopyValue = () => {
    if (!selectedNode) return;
    const text = typeof selectedNode.value === 'object'
      ? JSON.stringify(selectedNode.value, null, 2)
      : String(selectedNode.value);
    navigator.clipboard.writeText(text);
    setCopiedValue(true);
    setTimeout(() => setCopiedValue(false), 1800);
  };

  return (
    <div
      ref={containerRef}
      className={`relative flex flex-col bg-[#0a0c12] select-none overflow-hidden ${
        isFullscreen ? 'fixed inset-0 z-50 w-screen h-screen' : 'h-full w-full'
      }`}
    >
      {/* Top Controls Toolbar */}
      <div className="px-4 py-2.5 bg-[#121520] border-b border-white/10 flex flex-wrap items-center justify-between gap-3 text-xs shrink-0 z-20">
        {/* Left: Layout Switcher & Depth Control */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 bg-[#181d2c] p-1 rounded-lg border border-white/10">
            <button
              onClick={() => setLayoutMode('tree-horizontal')}
              className={`px-2 py-1 rounded font-medium transition-colors ${
                layoutMode === 'tree-horizontal' ? 'bg-orange-500 text-white' : 'text-zinc-400 hover:text-white'
              }`}
              title="Horizontal Tree Layout"
            >
              Horizontal Graph
            </button>
            <button
              onClick={() => setLayoutMode('tree-vertical')}
              className={`px-2 py-1 rounded font-medium transition-colors ${
                layoutMode === 'tree-vertical' ? 'bg-orange-500 text-white' : 'text-zinc-400 hover:text-white'
              }`}
              title="Vertical Tree Layout"
            >
              Vertical Hierarchy
            </button>
          </div>

          <div className="flex items-center gap-1.5 text-zinc-400">
            <Sliders className="w-3.5 h-3.5 text-orange-400" />
            <span>Depth:</span>
            <select
              value={maxDepth}
              onChange={e => setMaxDepth(parseInt(e.target.value))}
              className="bg-[#181d2c] border border-white/10 rounded px-2 py-1 text-white text-xs focus:outline-none focus:border-orange-500"
            >
              <option value="1">Level 1</option>
              <option value="2">Level 2</option>
              <option value="3">Level 3</option>
              <option value="4">Level 4</option>
              <option value="99">All Levels</option>
            </select>
          </div>

          <div className="flex items-center gap-1 border-l border-white/10 pl-3">
            <button
              onClick={handleExpandAll}
              className="px-2 py-1 bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white rounded border border-white/5 transition-colors"
            >
              Expand All
            </button>
            <button
              onClick={handleCollapseAll}
              className="px-2 py-1 bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white rounded border border-white/5 transition-colors"
            >
              Collapse
            </button>
          </div>
        </div>

        {/* Center: Search in Graph */}
        <div className="relative min-w-[200px]">
          <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search key or value in graph..."
            value={searchTerm}
            onChange={e => {
              setSearchTerm(e.target.value);
              renderGraph();
            }}
            className="w-full bg-[#181d2c] border border-white/10 rounded-lg pl-7 pr-3 py-1 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-orange-500"
          />
        </div>

        {/* Right: Legend & Fullscreen */}
        <div className="flex items-center gap-2">
          {/* Type Legend Chips */}
          <div className="hidden lg:flex items-center gap-2 text-[10px] text-zinc-400 font-mono">
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-orange-400"></span>object</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-purple-400"></span>array</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-400"></span>string</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-400"></span>number</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-400"></span>boolean</span>
          </div>

          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="p-1.5 bg-white/5 hover:bg-white/10 rounded text-zinc-400 hover:text-white border border-white/10 transition-colors"
            title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen Graph'}
          >
            {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Main Interactive SVG Canvas */}
      <div className="relative flex-1 w-full h-full overflow-hidden">
        <svg
          ref={svgRef}
          className="w-full h-full cursor-grab active:cursor-grabbing"
          style={{ backgroundColor: '#0c0e15' }}
        />

        {/* Floating Zoom Controls Bottom Left */}
        <div className="absolute left-4 bottom-4 flex flex-col gap-1 bg-[#141824]/90 backdrop-blur-md border border-white/10 p-1 rounded-xl shadow-xl z-20">
          <button
            onClick={() => handleZoom(1.25)}
            className="p-2 hover:bg-white/10 rounded-lg text-zinc-300 hover:text-white transition-colors"
            title="Zoom In"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            onClick={() => handleZoom(0.8)}
            className="p-2 hover:bg-white/10 rounded-lg text-zinc-300 hover:text-white transition-colors"
            title="Zoom Out"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <button
            onClick={handleResetZoom}
            className="p-2 hover:bg-white/10 rounded-lg text-zinc-300 hover:text-white transition-colors"
            title="Reset View"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>

        {/* Interactive Node Details Inspector Overlay (Right Drawer / Card) */}
        {selectedNode && (
          <div className="absolute right-4 top-4 bottom-4 w-80 bg-[#141824]/95 backdrop-blur-md border border-white/10 rounded-xl shadow-2xl p-4 flex flex-col z-20 animate-in slide-in-from-right duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: TYPE_COLORS[selectedNode.type]?.dot || '#fff' }}
                />
                <span className="font-bold text-white text-xs">{selectedNode.name}</span>
                <span
                  className="px-1.5 py-0.5 rounded text-[9.5px] uppercase font-mono font-bold"
                  style={{
                    backgroundColor: TYPE_COLORS[selectedNode.type]?.bg,
                    color: TYPE_COLORS[selectedNode.type]?.text,
                  }}
                >
                  {selectedNode.type}
                </span>
              </div>
              <button
                onClick={() => setSelectedNode(null)}
                className="text-zinc-400 hover:text-white text-sm p-1 rounded hover:bg-white/10"
              >
                ✕
              </button>
            </div>

            <div className="py-3 space-y-3 flex-1 overflow-y-auto font-mono text-xs">
              {/* JSON Path */}
              <div>
                <div className="text-[10px] text-zinc-500 uppercase font-sans font-semibold mb-1 flex items-center justify-between">
                  <span>JSON Path</span>
                  <button
                    onClick={handleCopyPath}
                    className="flex items-center gap-1 text-orange-400 hover:text-orange-300"
                  >
                    {copiedPath ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedPath ? 'Copied' : 'Copy Path'}</span>
                  </button>
                </div>
                <div className="p-2 bg-[#0d0f17] border border-white/10 rounded text-emerald-400 text-[11px] break-all selection:bg-orange-500/30">
                  {selectedNode.path}
                </div>
              </div>

              {/* Node Statistics */}
              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div className="p-2 bg-[#0d0f17] border border-white/5 rounded">
                  <div className="text-zinc-500 text-[10px] font-sans">Depth</div>
                  <div className="text-white font-bold">{selectedNode.depth}</div>
                </div>
                <div className="p-2 bg-[#0d0f17] border border-white/5 rounded">
                  <div className="text-zinc-500 text-[10px] font-sans">Children</div>
                  <div className="text-white font-bold">{selectedNode.childCount ?? 'N/A'}</div>
                </div>
              </div>

              {/* Node Value Inspector */}
              <div className="flex flex-col flex-1">
                <div className="text-[10px] text-zinc-500 uppercase font-sans font-semibold mb-1 flex items-center justify-between">
                  <span>Value Preview</span>
                  <button
                    onClick={handleCopyValue}
                    className="flex items-center gap-1 text-orange-400 hover:text-orange-300"
                  >
                    {copiedValue ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedValue ? 'Copied' : 'Copy Value'}</span>
                  </button>
                </div>
                <pre className="p-2.5 bg-[#0d0f17] border border-white/10 rounded text-zinc-300 text-[11px] overflow-auto max-h-56 whitespace-pre-wrap break-all leading-relaxed">
                  {typeof selectedNode.value === 'object'
                    ? JSON.stringify(selectedNode.value, null, 2)
                    : String(selectedNode.value)}
                </pre>
              </div>
            </div>

            <div className="pt-2 border-t border-white/10 flex justify-between items-center text-[11px] text-zinc-400">
              <span>Click node to toggle branch</span>
              <button
                onClick={() => toggleNode(selectedNode)}
                className="px-2.5 py-1 bg-orange-500/20 hover:bg-orange-500/30 text-orange-300 font-semibold rounded transition-colors"
              >
                Toggle Branch
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
