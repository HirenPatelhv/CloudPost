import React, { useState, useMemo, useRef, useEffect } from 'react';
import * as d3 from 'd3';
import { SaaSCustomer, CustomerActivityHeatmapData, CustomerDailyActivity } from '../../types/saas';
import { generateCustomer30DayHeatmapData } from '../../data/saasData';
import { downloadCsvFile } from '../../services/saasService';
import {
  Activity,
  Flame,
  Calendar,
  Filter,
  Download,
  Search,
  Sparkles,
  TrendingUp,
  Layers,
  BarChart2,
  Grid3X3,
  Info,
  Zap,
  CheckCircle2,
  AlertCircle,
  Building2,
  ArrowUpRight,
  Maximize2
} from 'lucide-react';

interface CustomerActivityHeatmapProps {
  customers: SaaSCustomer[];
  onSelectCustomer?: (customer: SaaSCustomer) => void;
}

export const CustomerActivityHeatmap: React.FC<CustomerActivityHeatmapProps> = ({
  customers,
  onSelectCustomer,
}) => {
  const [selectedPlanFilter, setSelectedPlanFilter] = useState<'all' | 'enterprise' | 'pro' | 'free'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'matrix' | 'chart' | 'calendar'>('matrix');
  const [hoveredCell, setHoveredCell] = useState<{
    customerName: string;
    companyName: string;
    plan: string;
    avatar: string;
    activity: CustomerDailyActivity;
  } | null>(null);

  const [activeChartPoint, setActiveChartPoint] = useState<{
    dayLabel: string;
    dayOfWeek: string;
    totalRequests: number;
    totalCost: number;
    topTenant: string;
    x: number;
    y: number;
  } | null>(null);

  const chartSvgRef = useRef<SVGSVGElement | null>(null);

  // Generate deterministic 30-day heatmap datasets
  const { heatmapRows, summary } = useMemo(() => {
    return generateCustomer30DayHeatmapData(customers);
  }, [customers]);

  // Filter rows based on plan and search query
  const filteredRows = useMemo(() => {
    return heatmapRows.filter(row => {
      const matchesPlan = selectedPlanFilter === 'all' || row.plan === selectedPlanFilter;
      const q = searchQuery.toLowerCase();
      const matchesSearch = !q ||
        row.customerName.toLowerCase().includes(q) ||
        row.companyName.toLowerCase().includes(q) ||
        row.email.toLowerCase().includes(q);
      return matchesPlan && matchesSearch;
    });
  }, [heatmapRows, selectedPlanFilter, searchQuery]);

  // Format dates list for header
  const daysHeader = useMemo(() => {
    if (heatmapRows.length === 0 || !heatmapRows[0].dailyActivity) return [];
    return heatmapRows[0].dailyActivity.map(d => ({
      date: d.date,
      dayLabel: d.dayLabel,
      dayOfWeek: d.dayOfWeek,
      isWeekend: d.isWeekend,
      dayIndex: d.dayIndex,
    }));
  }, [heatmapRows]);

  // Render D3 SVG Area Chart for Velocity
  useEffect(() => {
    if (viewMode !== 'chart' || !chartSvgRef.current || summary.dailyTotals.length === 0) return;

    const svg = d3.select(chartSvgRef.current);
    svg.selectAll('*').remove();

    const containerWidth = chartSvgRef.current.clientWidth || 800;
    const height = 260;
    const margin = { top: 20, right: 30, bottom: 35, left: 55 };
    const width = containerWidth - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    const g = svg
      .attr('viewBox', `0 0 ${containerWidth} ${height}`)
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // Gradients
    const defs = svg.append('defs');
    
    const areaGradient = defs.append('linearGradient')
      .attr('id', 'd3-area-gradient')
      .attr('x1', '0%')
      .attr('y1', '0%')
      .attr('x2', '0%')
      .attr('y2', '100%');

    areaGradient.append('stop')
      .attr('offset', '0%')
      .attr('stop-color', '#f97316')
      .attr('stop-opacity', 0.45);

    areaGradient.append('stop')
      .attr('offset', '100%')
      .attr('stop-color', '#f97316')
      .attr('stop-opacity', 0.0);

    const data = summary.dailyTotals.map((d, i) => ({
      index: i,
      dayLabel: d.dayLabel,
      dayOfWeek: d.dayOfWeek,
      totalRequests: d.totalRequests,
      totalCost: d.totalCost,
    }));

    // Scales
    const xScale = d3.scaleLinear()
      .domain([0, data.length - 1])
      .range([0, width]);

    const maxVal = d3.max(data, d => d.totalRequests) || 1000000;
    const yScale = d3.scaleLinear()
      .domain([0, maxVal * 1.15])
      .range([innerHeight, 0]);

    // Grid lines
    const yGrid = d3.axisLeft(yScale)
      .ticks(4)
      .tickSize(-width)
      .tickFormat(() => '');

    g.append('g')
      .attr('class', 'grid')
      .call(yGrid)
      .selectAll('line')
      .attr('stroke', 'rgba(255, 255, 255, 0.06)')
      .attr('stroke-dasharray', '3 3');

    g.select('.grid .domain').remove();

    // D3 Area & Line Generators
    const areaGen = d3.area<{ index: number; totalRequests: number }>()
      .x(d => xScale(d.index))
      .y0(innerHeight)
      .y1(d => yScale(d.totalRequests))
      .curve(d3.curveMonotoneX);

    const lineGen = d3.line<{ index: number; totalRequests: number }>()
      .x(d => xScale(d.index))
      .y(d => yScale(d.totalRequests))
      .curve(d3.curveMonotoneX);

    // Draw Area
    g.append('path')
      .datum(data)
      .attr('fill', 'url(#d3-area-gradient)')
      .attr('d', areaGen);

    // Draw Line
    g.append('path')
      .datum(data)
      .attr('fill', 'none')
      .attr('stroke', '#f97316')
      .attr('stroke-width', 2.5)
      .attr('d', lineGen);

    // Data dots
    g.selectAll('.dot')
      .data(data)
      .enter()
      .append('circle')
      .attr('class', 'dot')
      .attr('cx', d => xScale(d.index))
      .attr('cy', d => yScale(d.totalRequests))
      .attr('r', 3.5)
      .attr('fill', '#f97316')
      .attr('stroke', '#111422')
      .attr('stroke-width', 1.5)
      .style('cursor', 'pointer')
      .on('mouseenter', (event, d) => {
        const [x, y] = d3.pointer(event, chartSvgRef.current);
        setActiveChartPoint({
          dayLabel: d.dayLabel,
          dayOfWeek: d.dayOfWeek,
          totalRequests: d.totalRequests,
          totalCost: d.totalCost,
          topTenant: summary.mostActiveCustomer.name,
          x,
          y,
        });
      })
      .on('mouseleave', () => {
        setActiveChartPoint(null);
      });

    // X Axis
    const xAxis = d3.axisBottom(xScale)
      .ticks(Math.min(8, data.length))
      .tickFormat(idx => data[Number(idx)] ? data[Number(idx)].dayLabel : '');

    g.append('g')
      .attr('transform', `translate(0, ${innerHeight})`)
      .call(xAxis)
      .selectAll('text')
      .attr('fill', '#71717a')
      .attr('font-size', '10px')
      .attr('font-family', 'sans-serif');

    g.selectAll('.domain').attr('stroke', 'rgba(255, 255, 255, 0.1)');
    g.selectAll('.tick line').attr('stroke', 'rgba(255, 255, 255, 0.1)');

    // Y Axis
    const yAxis = d3.axisLeft(yScale)
      .ticks(4)
      .tickFormat(val => `${(Number(val) / 1000).toFixed(0)}k`);

    g.append('g')
      .call(yAxis)
      .selectAll('text')
      .attr('fill', '#71717a')
      .attr('font-size', '10px')
      .attr('font-family', 'monospace');

  }, [viewMode, summary]);

  // Cell color helper
  const getCellColorClass = (intensity: number, isWeekend: boolean, requests: number) => {
    if (requests === 0) {
      return isWeekend
        ? 'bg-white/[0.02] border-white/5 text-transparent'
        : 'bg-white/[0.04] border-white/5 text-transparent';
    }
    switch (intensity) {
      case 1:
        return 'bg-emerald-950/90 text-emerald-400 border-emerald-800/40 hover:border-emerald-400';
      case 2:
        return 'bg-emerald-800/90 text-emerald-200 border-emerald-600/50 hover:border-emerald-300';
      case 3:
        return 'bg-emerald-600 text-white border-emerald-400/60 shadow-sm shadow-emerald-600/20 hover:border-white';
      case 4:
        return 'bg-amber-500 text-black font-semibold border-amber-400 shadow-sm shadow-amber-500/20 hover:border-white';
      case 5:
        return 'bg-orange-500 text-white font-bold border-orange-300 shadow-md shadow-orange-500/30 hover:border-white';
      default:
        return 'bg-white/5 border-white/10 text-transparent';
    }
  };

  // Export 30-day heatmap matrix to CSV
  const handleExportHeatmapCsv = () => {
    if (filteredRows.length === 0) return;

    const dateHeaders = daysHeader.map(d => `"${d.dayLabel} (${d.dayOfWeek})"`);
    const headerRow = ['"Customer Name"', '"Company"', '"Plan"', '"Total 30D Requests"', '"Avg Daily Calls"', '"Peak Day Calls"', ...dateHeaders];

    const dataRows = filteredRows.map(row => {
      const dailyCols = row.dailyActivity.map(act => act.requests);
      return [
        `"${row.customerName}"`,
        `"${row.companyName}"`,
        `"${row.plan.toUpperCase()}"`,
        row.total30dRequests,
        row.avgDailyRequests,
        row.peakDayRequests,
        ...dailyCols,
      ].join(',');
    });

    const csvContent = [headerRow.join(','), ...dataRows].join('\n');
    downloadCsvFile(csvContent, `cloudpost_saas_30day_activity_heatmap_${selectedPlanFilter}.csv`);
  };

  // Quick Plan Badges
  const getPlanBadge = (plan: string) => {
    if (plan === 'enterprise') {
      return 'bg-purple-500/20 text-purple-300 border-purple-500/30';
    }
    if (plan === 'pro') {
      return 'bg-orange-500/20 text-orange-300 border-orange-500/30';
    }
    return 'bg-zinc-500/20 text-zinc-300 border-zinc-500/30';
  };

  return (
    <div className="rounded-2xl bg-[#111422] border border-white/10 p-5 space-y-5 shadow-2xl">
      
      {/* Top Section / Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-white/10 pb-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-emerald-500 to-teal-600 flex items-center justify-center text-white shadow-lg shadow-emerald-500/20">
              <Flame className="w-4 h-4 text-white" />
            </div>
            <h2 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
              <span>30-Day Customer API Request Activity Heatmap</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-mono font-bold">
                D3.js Data Density
              </span>
            </h2>
          </div>
          <p className="text-xs text-zinc-400 mt-1">
            Visual frequency distribution of API requests executed across all customer accounts over the past 30 days.
          </p>
        </div>

        {/* View Controls & CSV Export */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Mode Switcher */}
          <div className="flex items-center gap-1 bg-white/5 p-1 rounded-xl border border-white/10 text-xs">
            <button
              onClick={() => setViewMode('matrix')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                viewMode === 'matrix' ? 'bg-orange-500 text-white shadow' : 'text-zinc-400 hover:text-white'
              }`}
              title="30-Day Customer Grid Heatmap"
            >
              <Grid3X3 className="w-3.5 h-3.5" />
              <span>Grid Matrix</span>
            </button>
            <button
              onClick={() => setViewMode('chart')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                viewMode === 'chart' ? 'bg-orange-500 text-white shadow' : 'text-zinc-400 hover:text-white'
              }`}
              title="D3 30-Day Velocity Curve"
            >
              <BarChart2 className="w-3.5 h-3.5" />
              <span>D3 Velocity Curve</span>
            </button>
            <button
              onClick={() => setViewMode('calendar')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                viewMode === 'calendar' ? 'bg-orange-500 text-white shadow' : 'text-zinc-400 hover:text-white'
              }`}
              title="Aggregated Day Velocity"
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>Daily Aggregate</span>
            </button>
          </div>

          {/* Export CSV */}
          <button
            onClick={handleExportHeatmapCsv}
            className="px-3.5 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-200 hover:text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors"
          >
            <Download className="w-3.5 h-3.5 text-emerald-400" />
            <span>Heatmap CSV</span>
          </button>
        </div>
      </div>

      {/* Heatmap High-Level Summary Statistics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
        <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/10 space-y-1">
          <div className="flex items-center justify-between text-zinc-400">
            <span className="text-[11px]">30-Day Total API Invocations</span>
            <Activity className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <span className="text-xl font-black text-white font-mono block">
            {(summary.total30dRequests / 1000000).toFixed(2)}M calls
          </span>
          <span className="text-[10px] text-zinc-500 block">Metered across all proxy gateways</span>
        </div>

        <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/10 space-y-1">
          <div className="flex items-center justify-between text-zinc-400">
            <span className="text-[11px]">Peak Traffic Day</span>
            <Zap className="w-3.5 h-3.5 text-amber-400" />
          </div>
          <span className="text-xl font-black text-amber-300 font-mono block">
            {(summary.peakDay.totalRequests / 1000).toFixed(0)}K calls
          </span>
          <span className="text-[10px] text-zinc-400 block font-sans">
            {summary.peakDay.dayLabel} ({summary.peakDay.activeCustomersCount} active tenants)
          </span>
        </div>

        <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/10 space-y-1">
          <div className="flex items-center justify-between text-zinc-400">
            <span className="text-[11px]">Daily Average Velocity</span>
            <TrendingUp className="w-3.5 h-3.5 text-blue-400" />
          </div>
          <span className="text-xl font-black text-blue-300 font-mono block">
            {Math.round(summary.avgDailyRequests / 1000).toLocaleString()}K / day
          </span>
          <span className="text-[10px] text-zinc-500 block">~{(summary.total30dCost / 30).toFixed(2)} USD daily infra</span>
        </div>

        <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/10 space-y-1">
          <div className="flex items-center justify-between text-zinc-400">
            <span className="text-[11px]">Highest Volume Tenant</span>
            <Sparkles className="w-3.5 h-3.5 text-purple-400" />
          </div>
          <span className="text-sm font-bold text-white truncate block">
            {summary.mostActiveCustomer.name}
          </span>
          <span className="text-[10px] text-purple-300 block truncate">
            {summary.mostActiveCustomer.company} ({(summary.mostActiveCustomer.totalRequests / 1000000).toFixed(2)}M reqs)
          </span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        {/* Plan Filter Buttons */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-zinc-400 flex items-center gap-1 mr-1 text-[11px]">
            <Filter className="w-3 h-3" /> Tier:
          </span>
          {(['all', 'enterprise', 'pro', 'free'] as const).map(p => (
            <button
              key={p}
              onClick={() => setSelectedPlanFilter(p)}
              className={`px-2.5 py-1 rounded-lg font-medium text-[11px] uppercase transition-colors ${
                selectedPlanFilter === p
                  ? 'bg-white/20 text-white font-bold border border-white/30'
                  : 'bg-white/5 text-zinc-400 hover:text-white border border-white/5'
              }`}
            >
              {p === 'all' ? 'All Customers' : p}
            </button>
          ))}
          <span className="text-[11px] text-zinc-500 ml-2">
            Showing {filteredRows.length} of {heatmapRows.length} customers
          </span>
        </div>

        {/* Search Input */}
        <div className="relative min-w-[220px]">
          <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search tenant or company..."
            className="w-full pl-8 pr-3 py-1.5 bg-white/5 border border-white/10 rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-orange-500 transition-colors"
          />
        </div>
      </div>

      {/* VIEW 1: MATRIX HEATMAP (30 Days x Customers) */}
      {viewMode === 'matrix' && (
        <div className="space-y-4">
          <div className="overflow-x-auto rounded-xl border border-white/10 bg-[#0d101d] pb-2">
            <div className="min-w-[980px]">
              
              {/* Header Days Row */}
              <div className="grid grid-cols-[220px_repeat(30,1fr)_90px] border-b border-white/10 bg-white/[0.02] text-[10px] text-zinc-400 font-mono py-2.5 px-3 items-center sticky top-0 z-10">
                <div className="font-sans font-bold text-zinc-300 uppercase tracking-wider text-[11px]">
                  Customer / Tenant
                </div>
                {daysHeader.map((d) => (
                  <div
                    key={d.date}
                    className={`text-center flex flex-col items-center justify-center ${
                      d.isWeekend ? 'text-zinc-600' : 'text-zinc-400'
                    }`}
                    title={`${d.dayLabel} (${d.dayOfWeek})`}
                  >
                    <span className="text-[9px] font-semibold">{d.dayLabel.split(' ')[1]}</span>
                    <span className="text-[8px] scale-90 text-zinc-500">{d.dayOfWeek[0]}</span>
                  </div>
                ))}
                <div className="text-right font-sans font-bold text-zinc-300 text-[11px] pr-2">
                  30D Total
                </div>
              </div>

              {/* Customer Rows */}
              <div className="divide-y divide-white/5 text-xs">
                {filteredRows.map(row => (
                  <div
                    key={row.customerId}
                    className="grid grid-cols-[220px_repeat(30,1fr)_90px] py-2 px-3 items-center hover:bg-white/[0.02] transition-colors group"
                  >
                    {/* Customer Info Column */}
                    <div className="flex items-center gap-2.5 pr-2 min-w-0">
                      <img
                        src={row.avatar}
                        alt={row.customerName}
                        className="w-7 h-7 rounded-full bg-white/10 flex-shrink-0 object-cover border border-white/10"
                      />
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-white text-[11px] truncate">{row.customerName}</span>
                          <span className={`text-[9px] px-1.5 py-0.2 rounded font-mono font-bold uppercase border ${getPlanBadge(row.plan)}`}>
                            {row.plan[0]}
                          </span>
                        </div>
                        <span className="text-[10px] text-zinc-400 truncate block">{row.companyName}</span>
                      </div>
                    </div>

                    {/* 30 Day Activity Cells */}
                    {row.dailyActivity.map((act) => {
                      const colorClass = getCellColorClass(act.intensity, act.isWeekend, act.requests);
                      return (
                        <div key={act.date} className="p-0.5 flex items-center justify-center">
                          <div
                            onMouseEnter={() => setHoveredCell({
                              customerName: row.customerName,
                              companyName: row.companyName,
                              plan: row.plan,
                              avatar: row.avatar,
                              activity: act,
                            })}
                            onMouseLeave={() => setHoveredCell(null)}
                            className={`w-full aspect-square max-w-[22px] rounded-[3px] border transition-all duration-150 cursor-pointer flex items-center justify-center text-[8px] ${colorClass}`}
                          >
                          </div>
                        </div>
                      );
                    })}

                    {/* Total 30D Count */}
                    <div className="text-right font-mono font-bold text-zinc-200 text-[11px] pr-2">
                      {row.total30dRequests > 1000000
                        ? `${(row.total30dRequests / 1000000).toFixed(1)}M`
                        : `${(row.total30dRequests / 1000).toFixed(0)}k`}
                    </div>
                  </div>
                ))}
              </div>

              {/* Bottom Aggregated Daily Totals Row */}
              <div className="grid grid-cols-[220px_repeat(30,1fr)_90px] border-t border-white/10 bg-white/[0.03] py-2 px-3 items-center text-xs font-mono">
                <div className="font-sans font-bold text-emerald-400 text-[11px]">
                  Daily Aggregate Total
                </div>
                {summary.dailyTotals.map((tot, idx) => (
                  <div key={idx} className="p-0.5 flex items-center justify-center">
                    <div
                      onMouseEnter={() => setHoveredCell({
                        customerName: 'All Customers Combined',
                        companyName: 'Platform Total',
                        plan: 'enterprise',
                        avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=platform',
                        activity: {
                          date: tot.date,
                          dayLabel: tot.dayLabel,
                          dayOfWeek: tot.dayOfWeek,
                          dayIndex: idx,
                          requests: tot.totalRequests,
                          dataMb: Number(((tot.totalRequests * 2.4) / 1024).toFixed(2)),
                          cost: tot.totalCost,
                          intensity: tot.intensity,
                          isWeekend: idx % 7 === 5 || idx % 7 === 6,
                        },
                      })}
                      onMouseLeave={() => setHoveredCell(null)}
                      className={`w-full aspect-square max-w-[22px] rounded-[3px] border transition-all duration-150 cursor-pointer flex items-center justify-center ${
                        tot.totalRequests > 800000
                          ? 'bg-orange-500 border-orange-300'
                          : tot.totalRequests > 400000
                          ? 'bg-amber-500 border-amber-400'
                          : tot.totalRequests > 150000
                          ? 'bg-emerald-600 border-emerald-400'
                          : 'bg-emerald-900 border-emerald-700'
                      }`}
                    >
                    </div>
                  </div>
                ))}
                <div className="text-right font-mono font-black text-emerald-400 text-[11px] pr-2">
                  {(summary.total30dRequests / 1000000).toFixed(1)}M
                </div>
              </div>

            </div>
          </div>

          {/* Floating Hover Information Tooltip Card */}
          {hoveredCell && (
            <div className="p-3.5 rounded-xl bg-[#161a2f] border border-orange-500/30 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs animate-in fade-in duration-200">
              <div className="flex items-center gap-3">
                <img
                  src={hoveredCell.avatar}
                  alt={hoveredCell.customerName}
                  className="w-8 h-8 rounded-full bg-white/10 object-cover border border-white/10"
                />
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-white text-sm">{hoveredCell.customerName}</span>
                    <span className="text-[10px] text-zinc-400">({hoveredCell.companyName})</span>
                    <span className={`text-[9px] px-1.5 py-0.5 rounded font-mono uppercase border ${getPlanBadge(hoveredCell.plan)}`}>
                      {hoveredCell.plan}
                    </span>
                  </div>
                  <span className="text-[11px] text-zinc-400">
                    Day Activity on <strong className="text-zinc-200">{hoveredCell.activity.dayLabel} ({hoveredCell.activity.dayOfWeek})</strong>
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-4 text-xs font-mono">
                <div className="text-right">
                  <span className="text-[10px] text-zinc-400 block font-sans">API Calls Executed</span>
                  <span className="font-bold text-emerald-400 text-sm">
                    {hoveredCell.activity.requests.toLocaleString()} calls
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-zinc-400 block font-sans">Data Bandwidth</span>
                  <span className="font-bold text-blue-300">
                    {hoveredCell.activity.dataMb > 1024
                      ? `${(hoveredCell.activity.dataMb / 1024).toFixed(2)} GB`
                      : `${hoveredCell.activity.dataMb} MB`}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-zinc-400 block font-sans">Infra Cost Impact</span>
                  <span className="font-bold text-rose-300">
                    ${hoveredCell.activity.cost.toFixed(4)}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* VIEW 2: D3 30-DAY VELOCITY CURVE */}
      {viewMode === 'chart' && (
        <div className="space-y-4">
          <div className="relative w-full rounded-xl bg-[#0d101d] border border-white/10 p-4 overflow-hidden">
            <svg ref={chartSvgRef} className="w-full h-64 overflow-visible" />
            
            {activeChartPoint && (
              <div
                className="absolute pointer-events-none p-2.5 rounded-lg bg-[#161a2f] border border-orange-500/50 shadow-2xl text-xs text-white z-20"
                style={{
                  left: `${Math.min(activeChartPoint.x + 15, 600)}px`,
                  top: `${Math.max(activeChartPoint.y - 40, 10)}px`,
                }}
              >
                <div className="font-bold text-orange-400 font-sans">
                  {activeChartPoint.dayLabel} ({activeChartPoint.dayOfWeek})
                </div>
                <div className="font-mono text-emerald-400 font-bold mt-0.5">
                  {activeChartPoint.totalRequests.toLocaleString()} API Calls
                </div>
                <div className="text-[10px] text-zinc-400 mt-0.5">
                  Est. Daily Cost: ${activeChartPoint.totalCost.toFixed(2)}
                </div>
              </div>
            )}
          </div>

          <div className="p-3 rounded-xl bg-white/5 border border-white/10 text-xs text-zinc-400 flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Info className="w-4 h-4 text-orange-400" />
              <span>
                Rendered with D3.js cubic monotonic smoothing over 30 days of continuous per-tenant proxy logs.
              </span>
            </span>
            <span className="font-mono text-zinc-300">
              30-Day Mean: <strong>{Math.round(summary.avgDailyRequests / 1000)}k calls/day</strong>
            </span>
          </div>
        </div>
      )}

      {/* VIEW 3: CALENDAR AGGREGATE BLOCKS */}
      {viewMode === 'calendar' && (
        <div className="space-y-3">
          <div className="grid grid-cols-2 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-10 gap-2.5">
            {summary.dailyTotals.map((tot) => (
              <div
                key={tot.date}
                className="p-3 rounded-xl bg-[#0d101d] border border-white/10 hover:border-orange-500/50 transition-all flex flex-col justify-between space-y-2 group"
              >
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-bold text-white font-sans">{tot.dayLabel}</span>
                  <span className="text-[10px] text-zinc-500 uppercase">{tot.dayOfWeek}</span>
                </div>
                <div className="space-y-1">
                  <span className="text-base font-black text-emerald-400 font-mono block">
                    {(tot.totalRequests / 1000).toFixed(0)}k
                  </span>
                  <div className="w-full bg-white/5 h-1.5 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${
                        tot.totalRequests > 800000
                          ? 'bg-orange-500'
                          : tot.totalRequests > 400000
                          ? 'bg-amber-500'
                          : 'bg-emerald-500'
                      }`}
                      style={{ width: `${Math.min(100, (tot.totalRequests / (summary.peakDay.totalRequests || 1)) * 100)}%` }}
                    />
                  </div>
                </div>
                <div className="flex justify-between text-[9px] text-zinc-400 font-mono border-t border-white/5 pt-1">
                  <span>Cost</span>
                  <span className="text-rose-300">${tot.totalCost.toFixed(2)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Heatmap Color Scale Legend */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-white/10 text-xs">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-zinc-400 text-[11px] font-semibold">Activity Intensity Scale:</span>
          <div className="flex items-center gap-1.5 font-mono text-[10px] flex-wrap">
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 rounded-[2px] bg-white/[0.04] border border-white/10 inline-block"></span>
              <span className="text-zinc-400">Idle (0)</span>
            </span>
            <span className="flex items-center gap-1 ml-1">
              <span className="w-3 h-3 rounded-[2px] bg-emerald-950 border border-emerald-800 inline-block"></span>
              <span className="text-zinc-400">1 - 10k</span>
            </span>
            <span className="flex items-center gap-1 ml-1">
              <span className="w-3 h-3 rounded-[2px] bg-emerald-800 border border-emerald-600 inline-block"></span>
              <span className="text-zinc-400">10k - 50k</span>
            </span>
            <span className="flex items-center gap-1 ml-1">
              <span className="w-3 h-3 rounded-[2px] bg-emerald-600 border border-emerald-400 inline-block"></span>
              <span className="text-zinc-300">50k - 150k</span>
            </span>
            <span className="flex items-center gap-1 ml-1">
              <span className="w-3 h-3 rounded-[2px] bg-amber-500 border border-amber-300 inline-block"></span>
              <span className="text-amber-300">150k - 350k</span>
            </span>
            <span className="flex items-center gap-1 ml-1">
              <span className="w-3 h-3 rounded-[2px] bg-orange-500 border border-orange-300 inline-block"></span>
              <span className="text-orange-300 font-bold">350k+ (Burst)</span>
            </span>
          </div>
        </div>

        <div className="text-[11px] text-zinc-400 flex items-center gap-1">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
          <span>Real-time per-tenant telemetry metered via API Proxy Gateway</span>
        </div>
      </div>

    </div>
  );
};
