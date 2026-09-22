import React, { useState, useMemo } from 'react';
import { User } from '../../types';
import { SaaSCustomer, SaaSSubscriptionPlan } from '../../types/saas';
import { computeSaaSMetrics, computePlanDistributions, SAMPLE_REPORT_PERIODS } from '../../data/saasData';
import { downloadCsvFile } from '../../services/saasService';
import { CustomerActivityHeatmap } from './CustomerActivityHeatmap';
import { SaaSExclusivityGate } from './SaaSExclusivityGate';
import {
  TrendingUp,
  DollarSign,
  Download,
  Calendar,
  Layers,
  Users,
  Activity,
  Cpu,
  HardDrive,
  Wifi,
  Sparkles,
  PieChart,
  BarChart3,
  Printer,
  ArrowUpRight,
  ShieldCheck,
  Zap,
  CheckCircle2,
  FileText,
  Lock,
  UserCheck,
  Building2,
  LogOut
} from 'lucide-react';

interface SaaSReportsViewProps {
  customers: SaaSCustomer[];
  currentUser?: User | null;
  isGuest?: boolean;
  onOpenCustomersTab: () => void;
  onOpenRegisterTab?: (plan?: SaaSSubscriptionPlan) => void;
  onOpenAuthModal?: () => void;
  onSwitchToGuest?: () => void;
}

export const SaaSReportsView: React.FC<SaaSReportsViewProps> = ({
  customers,
  currentUser,
  isGuest = false,
  onOpenCustomersTab,
  onOpenRegisterTab,
  onOpenAuthModal,
  onSwitchToGuest,
}) => {
  const [selectedRange, setSelectedRange] = useState<'7d' | '30d' | 'q3' | 'ytd' | 'all'>('30d');

  const metrics = useMemo(() => computeSaaSMetrics(customers), [customers]);
  const planDistributions = useMemo(() => computePlanDistributions(customers), [customers]);

  // Verify SaaS User status
  const isSaaSUser = !isGuest && !!currentUser && (currentUser.isSaaSUser || !!currentUser.plan);

  // If NOT a SaaS user, render the dedicated Exclusivity Gate
  if (!isSaaSUser) {
    return (
      <SaaSExclusivityGate
        featureName="SaaS Financial Intelligence & 30-Day Activity Heatmap"
        onOpenRegister={plan => onOpenRegisterTab ? onOpenRegisterTab(plan) : onOpenAuthModal?.()}
        onOpenLogin={() => onOpenAuthModal?.()}
      />
    );
  }

  // Derived Unit Economics
  const arpu = metrics.avgRevenuePerUser;
  const ltv = metrics.churnRatePercent > 0 ? Math.round(arpu / (metrics.churnRatePercent / 100)) : arpu * 36;
  const costPer10kReqs = metrics.totalApiRequests > 0
    ? Number(((metrics.totalInfrastructureCost / metrics.totalApiRequests) * 10000).toFixed(4))
    : 0.03;

  const handleExportFinancialReportCsv = () => {
    const headers = [
      'Report Period',
      'Gross Revenue ($)',
      'Total Infrastructure Cost ($)',
      'Net Gross Profit ($)',
      'Profit Margin (%)',
      'API Requests Metered',
      'New Customer Signups',
      'Active Users',
      'Churned Users',
    ];

    const rows = SAMPLE_REPORT_PERIODS.map(p => [
      `"${p.periodLabel}"`,
      p.revenue.toFixed(2),
      p.infraCost.toFixed(2),
      p.netProfit.toFixed(2),
      `${p.marginPercent.toFixed(1)}%`,
      p.requestsCount,
      p.newSignups,
      p.activeUsers,
      p.churnedUsers,
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    downloadCsvFile(csvContent, `cloudpost_saas_financial_report_${selectedRange}.csv`);
  };

  const handleExportPlanMatrixJson = () => {
    const data = {
      generatedAt: new Date().toISOString(),
      reportRange: selectedRange,
      executiveSummary: metrics,
      unitEconomics: {
        arpu,
        ltv,
        costPer10kReqs,
      },
      planDistributions,
      historicalPeriods: SAMPLE_REPORT_PERIODS,
    };

    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(data, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `saas_executive_report_${selectedRange}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#0a0c14] overflow-y-auto p-4 sm:p-6 space-y-6 font-sans select-none text-zinc-100">
      
      {/* SaaS User Verified Profile Bar */}
      <div className="p-3 rounded-xl bg-gradient-to-r from-orange-500/10 via-purple-500/10 to-indigo-500/10 border border-orange-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2.5">
          <div className="w-6 h-6 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
            <CheckCircle2 className="w-3.5 h-3.5" />
          </div>
          <div>
            <span className="font-semibold text-white">SaaS Verified Account: </span>
            <span className="text-orange-300 font-bold">{currentUser?.name || 'SaaS User'}</span>
            <span className="text-zinc-400"> ({currentUser?.email || 'authenticated'})</span>
            <span className={`ml-2 px-2 py-0.5 rounded-full font-mono text-[10px] font-bold uppercase ${
              currentUser?.plan === 'enterprise'
                ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                : currentUser?.plan === 'pro'
                ? 'bg-orange-500/20 text-orange-300 border border-orange-500/30'
                : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
            }`}>
              {currentUser?.plan || 'Enterprise'} Tier
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {onSwitchToGuest && (
            <button
              onClick={onSwitchToGuest}
              className="px-2 py-1 rounded bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 text-rose-300 text-[11px] font-semibold flex items-center gap-1 transition-colors"
              title="Switch to Guest mode to preview the locked SaaS gate"
            >
              <Lock className="w-3 h-3" />
              <span>Test Gated View</span>
            </button>
          )}
        </div>
      </div>

      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-purple-500 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-purple-500/20">
              <FileText className="w-4 h-4" />
            </div>
            <h1 className="text-xl font-black text-white">SaaS Revenue & Cost Intelligence Report</h1>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30 font-mono font-bold">
              Board & Executive Ready
            </span>
          </div>
          <p className="text-xs text-zinc-400 mt-1">
            Audited financial breakdown, infrastructure margins, ARPU, LTV, and cohort economics across all SaaS tiers.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Time Range Selector */}
          <div className="flex items-center gap-1 bg-white/5 p-1 rounded-xl border border-white/10 text-xs">
            <Calendar className="w-3.5 h-3.5 text-zinc-400 ml-1.5" />
            {(['7d', '30d', 'q3', 'ytd', 'all'] as const).map(r => (
              <button
                key={r}
                onClick={() => setSelectedRange(r)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold uppercase transition-colors ${
                  selectedRange === r ? 'bg-orange-500 text-white shadow' : 'text-zinc-400 hover:text-white'
                }`}
              >
                {r}
              </button>
            ))}
          </div>

          <button
            onClick={handleExportFinancialReportCsv}
            className="px-3.5 py-2 bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-200 hover:text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors"
          >
            <Download className="w-3.5 h-3.5 text-emerald-400" />
            <span>Download CSV</span>
          </button>

          <button
            onClick={handleExportPlanMatrixJson}
            className="px-3.5 py-2 bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-200 hover:text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors"
          >
            <FileText className="w-3.5 h-3.5 text-blue-400" />
            <span>Export JSON</span>
          </button>

          <button
            onClick={handlePrint}
            className="px-3.5 py-2 bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-200 hover:text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors"
            title="Print or Save PDF"
          >
            <Printer className="w-3.5 h-3.5 text-amber-400" />
            <span>Print Report</span>
          </button>
        </div>
      </div>


      {/* Executive Financial Summary Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="p-4 rounded-xl bg-[#111422] border border-white/10">
          <span className="text-[11px] text-zinc-400 block mb-1">Monthly Recurring Revenue</span>
          <span className="text-2xl font-black text-emerald-400">${metrics.totalMrr.toLocaleString()}</span>
          <span className="text-[10px] text-zinc-400 block mt-1">+18.4% vs last quarter</span>
        </div>

        <div className="p-4 rounded-xl bg-[#111422] border border-white/10">
          <span className="text-[11px] text-zinc-400 block mb-1">Annualized Run-Rate (ARR)</span>
          <span className="text-2xl font-black text-white">${(metrics.totalArr).toLocaleString()}</span>
          <span className="text-[10px] text-emerald-400 block mt-1 font-semibold">Healthy Trajectory</span>
        </div>

        <div className="p-4 rounded-xl bg-[#111422] border border-white/10">
          <span className="text-[11px] text-zinc-400 block mb-1">Total Infra Cost</span>
          <span className="text-2xl font-black text-rose-400">${metrics.totalInfrastructureCost.toFixed(2)}</span>
          <span className="text-[10px] text-zinc-500 block mt-1">{(metrics.totalInfrastructureCost / (metrics.totalMrr || 1) * 100).toFixed(1)}% of Revenue</span>
        </div>

        <div className="p-4 rounded-xl bg-[#111422] border border-white/10">
          <span className="text-[11px] text-zinc-400 block mb-1">Gross Profit Margin</span>
          <span className="text-2xl font-black text-emerald-400">{metrics.overallMarginPercent}%</span>
          <span className="text-[10px] text-zinc-400 block mt-1">${metrics.netProfitMrr.toFixed(2)} Net MRR</span>
        </div>

        <div className="p-4 rounded-xl bg-[#111422] border border-white/10">
          <span className="text-[11px] text-zinc-400 block mb-1">ARPU (Avg Rev / User)</span>
          <span className="text-2xl font-black text-purple-300">${arpu}</span>
          <span className="text-[10px] text-zinc-400 block mt-1">Across all {metrics.totalCustomers} users</span>
        </div>

        <div className="p-4 rounded-xl bg-[#111422] border border-white/10">
          <span className="text-[11px] text-zinc-400 block mb-1">Estimated LTV</span>
          <span className="text-2xl font-black text-amber-300">${ltv}</span>
          <span className="text-[10px] text-zinc-400 block mt-1">{metrics.churnRatePercent}% monthly churn</span>
        </div>
      </div>

      {/* Unit Economics & Cost Efficiency Banner */}
      <div className="p-5 rounded-2xl bg-gradient-to-r from-[#121629] via-[#161a2f] to-[#121629] border border-white/10 space-y-4 shadow-xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-orange-400" />
            <h3 className="text-sm font-bold text-white">SaaS Unit Economics & Cloud Infrastructure Efficiency</h3>
          </div>
          <span className="text-[11px] text-zinc-400 font-mono">Infrastructure Efficiency Score: 94.8/100</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
          <div className="p-3 rounded-xl bg-white/5 border border-white/10 space-y-1">
            <span className="text-zinc-400 text-[11px] block">Cost per 10,000 Requests</span>
            <span className="text-lg font-bold text-white font-mono">${costPer10kReqs.toFixed(4)}</span>
            <p className="text-[10px] text-zinc-500">API gateway proxy + SSL overhead</p>
          </div>

          <div className="p-3 rounded-xl bg-white/5 border border-white/10 space-y-1">
            <span className="text-zinc-400 text-[11px] block">Egress Bandwidth Cost / GB</span>
            <span className="text-lg font-bold text-white font-mono">$0.0800</span>
            <p className="text-[10px] text-zinc-500">Cloudflare & Fastly CDN routed</p>
          </div>

          <div className="p-3 rounded-xl bg-white/5 border border-white/10 space-y-1">
            <span className="text-zinc-400 text-[11px] block">Database Storage Cost / GB</span>
            <span className="text-lg font-bold text-white font-mono">$0.1500</span>
            <p className="text-[10px] text-zinc-500">MySQL multi-region replicated</p>
          </div>

          <div className="p-3 rounded-xl bg-white/5 border border-white/10 space-y-1">
            <span className="text-zinc-400 text-[11px] block">AI Generation Cost / 1k Tokens</span>
            <span className="text-lg font-bold text-white font-mono">$0.0020</span>
            <p className="text-[10px] text-zinc-500">Schema parser & test suite auto-gen</p>
          </div>
        </div>
      </div>

      {/* Visual Activity Heatmap (30-Day Frequency Matrix per Customer) */}
      <CustomerActivityHeatmap customers={customers} />

      {/* Plan Tier Distribution Matrix */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <Layers className="w-4 h-4 text-orange-400" />
            <span>Tier Performance & Margin Matrix</span>
          </h3>
          <span className="text-xs text-zinc-400">Broken down by subscription category</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {planDistributions.map(p => (
            <div
              key={p.plan}
              className="p-5 rounded-2xl bg-[#111422] border border-white/10 space-y-4 shadow-lg flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full uppercase font-mono border ${
                    p.plan === 'enterprise' ? 'bg-purple-500/20 text-purple-300 border-purple-500/30' :
                    p.plan === 'pro' ? 'bg-orange-500/20 text-orange-300 border-orange-500/30' :
                    'bg-zinc-500/20 text-zinc-300 border-zinc-500/30'
                  }`}>
                    {p.name}
                  </span>
                  <span className="text-xs font-bold text-white">{p.userCount} Accounts</span>
                </div>

                <div className="space-y-2 pt-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-zinc-400">Total Monthly Revenue:</span>
                    <span className="font-mono font-bold text-emerald-400">${p.mrr.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-400">Infrastructure Cost:</span>
                    <span className="font-mono font-bold text-rose-400">${p.infraCost.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between border-t border-white/5 pt-1.5">
                    <span className="text-zinc-300 font-semibold">Net Profit Contribution:</span>
                    <span className={`font-mono font-bold ${p.netMargin >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                      ${p.netMargin.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-400">Average Monthly Margin:</span>
                    <span className="font-bold text-white">{p.marginPercent}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-400">Avg Requests / User:</span>
                    <span className="font-mono text-zinc-300">{p.avgRequestsPerUser.toLocaleString()}</span>
                  </div>
                </div>
              </div>

              <div className="pt-2 border-t border-white/5">
                <button
                  onClick={onOpenCustomersTab}
                  className="w-full py-2 bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white rounded-xl text-xs font-semibold transition-colors flex items-center justify-center gap-1"
                >
                  <span>Inspect {p.plan.toUpperCase()} Customers</span>
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Historical Revenue & Cost Trend Statements */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-purple-400" />
            <span>Monthly P&L Statements (Revenue vs Infra Cost)</span>
          </h3>
          <span className="text-xs text-zinc-400">Historical performance breakdown</span>
        </div>

        <div className="rounded-2xl bg-[#111422] border border-white/10 overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-white/10 bg-white/5 text-zinc-400 font-semibold uppercase text-[10px] tracking-wider">
                  <th className="py-3 px-4">Period</th>
                  <th className="py-3 px-3">Gross Revenue</th>
                  <th className="py-3 px-3">Infra Cost</th>
                  <th className="py-3 px-3">Net Profit</th>
                  <th className="py-3 px-3">Gross Margin</th>
                  <th className="py-3 px-3">API Requests</th>
                  <th className="py-3 px-3">New Signups</th>
                  <th className="py-3 px-3">Active Users</th>
                  <th className="py-3 px-4">Churn</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-zinc-200">
                {SAMPLE_REPORT_PERIODS.map((period, idx) => (
                  <tr key={idx} className="hover:bg-white/5 transition-colors font-mono">
                    <td className="py-3 px-4 font-sans font-bold text-white flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                      <span>{period.periodLabel}</span>
                    </td>
                    <td className="py-3 px-3 text-emerald-400 font-bold">${period.revenue.toLocaleString()}</td>
                    <td className="py-3 px-3 text-rose-400">${period.infraCost.toFixed(2)}</td>
                    <td className="py-3 px-3 text-white font-bold">${period.netProfit.toFixed(2)}</td>
                    <td className="py-3 px-3 text-emerald-300 font-bold">{period.marginPercent}%</td>
                    <td className="py-3 px-3 text-zinc-300">{(period.requestsCount / 1000000).toFixed(1)}M</td>
                    <td className="py-3 px-3 text-zinc-300">+{period.newSignups}</td>
                    <td className="py-3 px-3 text-zinc-300">{period.activeUsers}</td>
                    <td className="py-3 px-4 text-zinc-500">{period.churnedUsers}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

    </div>
  );
};
