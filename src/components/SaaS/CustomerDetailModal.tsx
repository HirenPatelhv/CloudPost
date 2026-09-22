import React, { useState } from 'react';
import { SaaSCustomer, SaaSSubscriptionPlan, SaaSSubscriptionStatus } from '../../types/saas';
import { calculateCustomerCostAndMargin } from '../../data/saasData';
import {
  X,
  User,
  Building2,
  DollarSign,
  Activity,
  Cpu,
  HardDrive,
  Wifi,
  Sparkles,
  ShieldCheck,
  AlertTriangle,
  Zap,
  Globe,
  Clock,
  CheckCircle2,
  Sliders,
  RotateCcw,
  Trash2,
  Download,
  CreditCard,
  Layers,
  ArrowUpRight,
  TrendingUp,
  TrendingDown,
  BarChart3
} from 'lucide-react';

interface CustomerDetailModalProps {
  customer: SaaSCustomer;
  isOpen: boolean;
  onClose: () => void;
  onUpdateCustomer: (id: string, updates: Partial<SaaSCustomer>) => void;
}

export const CustomerDetailModal: React.FC<CustomerDetailModalProps> = ({
  customer,
  isOpen,
  onClose,
  onUpdateCustomer,
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'cost_breakdown' | 'usage' | 'activity' | 'settings'>('overview');
  const [editingPlan, setEditingPlan] = useState<SaaSSubscriptionPlan>(customer.plan);
  const [editingStatus, setEditingStatus] = useState<SaaSSubscriptionStatus>(customer.status);
  const [customFee, setCustomFee] = useState(customer.monthlyFee.toString());
  const [discountPercent, setDiscountPercent] = useState((customer.customDiscountPercent || 0).toString());
  const [notes, setNotes] = useState(customer.notes || '');
  const [isSaved, setIsSaved] = useState(false);

  if (!isOpen) return null;

  const handleSaveChanges = () => {
    const feeNum = parseFloat(customFee) || 0;
    const discNum = parseFloat(discountPercent) || 0;

    // Recalculate costs based on new fee
    const costCalc = calculateCustomerCostAndMargin(
      customer.usage.requestsThisMonth,
      customer.usage.dataTransferMb,
      customer.usage.totalCollectionsCount * 0.05,
      customer.usage.aiTokensUsed,
      feeNum
    );

    onUpdateCustomer(customer.id, {
      plan: editingPlan,
      status: editingStatus,
      monthlyFee: feeNum,
      customDiscountPercent: discNum,
      notes,
      costBreakdown: costCalc.breakdown,
      netMargin: costCalc.netMargin,
      netMarginPercent: costCalc.netMarginPercent,
    });

    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
  };

  const handleResetQuota = () => {
    const quotaMap: Record<SaaSSubscriptionPlan, number> = {
      free: 100000,
      pro: 1000000,
      enterprise: 10000000,
    };
    onUpdateCustomer(customer.id, {
      usage: {
        ...customer.usage,
        requestsThisMonth: 0,
        quotaUsedPercent: 0,
        monthlyQuota: quotaMap[editingPlan],
      },
    });
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
  };

  const handleExportCustomerJson = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(customer, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `customer_360_${customer.id}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-[#111420] border border-white/15 rounded-2xl w-full max-w-4xl max-h-[90vh] shadow-2xl overflow-hidden flex flex-col">
        
        {/* Modal Header */}
        <div className="p-5 border-b border-white/10 bg-[#161a29] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <img
              src={customer.avatar}
              alt={customer.name}
              className="w-12 h-12 rounded-xl object-cover border border-white/20 shadow-md"
            />
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white">{customer.name}</h2>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono uppercase font-bold border ${
                  customer.plan === 'enterprise' ? 'bg-purple-500/20 text-purple-300 border-purple-500/30' :
                  customer.plan === 'pro' ? 'bg-orange-500/20 text-orange-300 border-orange-500/30' :
                  'bg-zinc-500/20 text-zinc-300 border-zinc-500/30'
                }`}>
                  {customer.plan}
                </span>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono uppercase font-bold ${
                  customer.status === 'active' ? 'bg-emerald-500/20 text-emerald-300' :
                  customer.status === 'trialing' ? 'bg-blue-500/20 text-blue-300' :
                  customer.status === 'past_due' ? 'bg-rose-500/20 text-rose-300' :
                  'bg-zinc-700 text-zinc-300'
                }`}>
                  {customer.status}
                </span>
              </div>
              <p className="text-xs text-zinc-400 flex items-center gap-2 mt-0.5">
                <span>{customer.email}</span>
                <span>•</span>
                <span>{customer.companyName}</span>
                <span>•</span>
                <span>{customer.country}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExportCustomerJson}
              className="px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-300 hover:text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors"
              title="Export Customer 360 Record as JSON"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export JSON</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-white/10 bg-[#0d101a] px-4 gap-2 text-xs">
          <button
            onClick={() => setActiveTab('overview')}
            className={`py-2.5 px-3 font-semibold border-b-2 transition-all ${
              activeTab === 'overview'
                ? 'border-orange-500 text-orange-400'
                : 'border-transparent text-zinc-400 hover:text-white'
            }`}
          >
            Customer 360 Overview
          </button>
          <button
            onClick={() => setActiveTab('cost_breakdown')}
            className={`py-2.5 px-3 font-semibold border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === 'cost_breakdown'
                ? 'border-orange-500 text-orange-400'
                : 'border-transparent text-zinc-400 hover:text-white'
            }`}
          >
            <DollarSign className="w-3.5 h-3.5" />
            <span>Infrastructure & Cost Breakdown</span>
          </button>
          <button
            onClick={() => setActiveTab('usage')}
            className={`py-2.5 px-3 font-semibold border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === 'usage'
                ? 'border-orange-500 text-orange-400'
                : 'border-transparent text-zinc-400 hover:text-white'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>API Traffic & Quotas</span>
          </button>
          <button
            onClick={() => setActiveTab('activity')}
            className={`py-2.5 px-3 font-semibold border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === 'activity'
                ? 'border-orange-500 text-orange-400'
                : 'border-transparent text-zinc-400 hover:text-white'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Audit Trail ({customer.recentActivity?.length || 0})</span>
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`py-2.5 px-3 font-semibold border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === 'settings'
                ? 'border-orange-500 text-orange-400'
                : 'border-transparent text-zinc-400 hover:text-white'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Plan & Margin Controls</span>
          </button>
        </div>

        {/* Tab Contents */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">

          {/* 1. OVERVIEW TAB */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Financial & Margin Highlights */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3.5 rounded-xl bg-white/5 border border-white/10">
                  <span className="text-[11px] text-zinc-400 block mb-1">Monthly Subscription Fee</span>
                  <span className="text-xl font-black text-white">${customer.monthlyFee.toFixed(2)}</span>
                  <span className="text-[10px] text-zinc-500 block mt-0.5">{customer.billingCycle} billing</span>
                </div>

                <div className="p-3.5 rounded-xl bg-white/5 border border-white/10">
                  <span className="text-[11px] text-zinc-400 block mb-1">Total Infra Cost</span>
                  <span className="text-xl font-black text-rose-400">${customer.costBreakdown.totalCost.toFixed(2)}</span>
                  <span className="text-[10px] text-zinc-500 block mt-0.5">Gateway, compute & storage</span>
                </div>

                <div className="p-3.5 rounded-xl bg-white/5 border border-white/10">
                  <span className="text-[11px] text-zinc-400 block mb-1">Net Gross Margin</span>
                  <span className={`text-xl font-black ${customer.netMargin >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    ${customer.netMargin.toFixed(2)}
                  </span>
                  <span className="text-[10px] text-emerald-400/80 block mt-0.5 font-bold">
                    {customer.netMarginPercent.toFixed(1)}% margin
                  </span>
                </div>

                <div className="p-3.5 rounded-xl bg-white/5 border border-white/10">
                  <span className="text-[11px] text-zinc-400 block mb-1">Customer Health Score</span>
                  <div className="flex items-baseline gap-1">
                    <span className={`text-xl font-black ${
                      customer.healthScore >= 90 ? 'text-emerald-400' :
                      customer.healthScore >= 70 ? 'text-amber-400' : 'text-rose-400'
                    }`}>
                      {customer.healthScore}
                    </span>
                    <span className="text-xs text-zinc-500 font-bold">/100</span>
                  </div>
                  <span className="text-[10px] text-zinc-400 block mt-0.5">Very Healthy Account</span>
                </div>
              </div>

              {/* Account Meta Grid */}
              <div className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-3">
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">Account Metadata & Identity</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs">
                  <div>
                    <span className="text-zinc-500 block text-[11px]">Organization / Company</span>
                    <span className="font-semibold text-zinc-200">{customer.companyName}</span>
                  </div>
                  <div>
                    <span className="text-zinc-500 block text-[11px]">Primary Role</span>
                    <span className="font-semibold text-zinc-200">{customer.role}</span>
                  </div>
                  <div>
                    <span className="text-zinc-500 block text-[11px]">Account ID</span>
                    <span className="font-mono text-zinc-300 text-[11px]">{customer.id}</span>
                  </div>
                  <div>
                    <span className="text-zinc-500 block text-[11px]">Registered Date</span>
                    <span className="font-medium text-zinc-300">{new Date(customer.registeredAt).toLocaleDateString()}</span>
                  </div>
                  <div>
                    <span className="text-zinc-500 block text-[11px]">Last Active Time</span>
                    <span className="font-medium text-zinc-300">{new Date(customer.lastActiveAt).toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="text-zinc-500 block text-[11px]">Last Known IP / Origin</span>
                    <span className="font-mono text-zinc-300 text-[11px]">{customer.lastLoginIp} ({customer.country})</span>
                  </div>
                  <div>
                    <span className="text-zinc-500 block text-[11px]">Payment Method</span>
                    <span className="font-medium text-zinc-300">{customer.paymentMethod}</span>
                  </div>
                  <div>
                    <span className="text-zinc-500 block text-[11px]">Workspaces Owned</span>
                    <span className="font-bold text-orange-400">{customer.usage.activeWorkspacesCount} Workspaces ({customer.usage.totalCollectionsCount} collections)</span>
                  </div>
                  <div>
                    <span className="text-zinc-500 block text-[11px]">Team Seats</span>
                    <span className="font-bold text-white">{customer.usage.teamMembersCount} Members Active</span>
                  </div>
                </div>
              </div>

              {/* Monthly Quota Consumption Progress */}
              <div className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-zinc-200">Current Billing Period Quota Consumption</span>
                  <span className="font-mono font-bold text-orange-400">
                    {customer.usage.requestsThisMonth.toLocaleString()} / {customer.usage.monthlyQuota.toLocaleString()} requests ({customer.usage.quotaUsedPercent}%)
                  </span>
                </div>
                <div className="w-full h-2.5 bg-zinc-800 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      customer.usage.quotaUsedPercent > 85 ? 'bg-rose-500' :
                      customer.usage.quotaUsedPercent > 60 ? 'bg-amber-500' : 'bg-emerald-500'
                    }`}
                    style={{ width: `${Math.min(customer.usage.quotaUsedPercent, 100)}%` }}
                  ></div>
                </div>
              </div>
            </div>
          )}

          {/* 2. COST BREAKDOWN TAB */}
          {activeTab === 'cost_breakdown' && (
            <div className="space-y-6">
              <div className="p-4 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-start gap-3">
                <DollarSign className="w-5 h-5 text-orange-400 shrink-0 mt-0.5" />
                <div className="text-xs space-y-1">
                  <p className="font-bold text-orange-300">Unit Economics & Customer Cost Anatomy</p>
                  <p className="text-zinc-300 leading-relaxed">
                    CloudPost dynamically meters every request execution, bandwidth egress, database persistence layer, and AI tokens consumed by this customer.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Cost Category Items */}
                <div className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Zap className="w-4 h-4 text-amber-400" />
                      <span className="text-xs font-bold text-white">API Gateway & Proxy Ingress</span>
                    </div>
                    <span className="text-xs font-mono font-bold text-white">${customer.costBreakdown.apiGatewayCost.toFixed(2)}</span>
                  </div>
                  <p className="text-[11px] text-zinc-400">
                    Meters rate-limiting, SSL termination, and CORS proxy routing ($0.000003 / req).
                  </p>
                  <span className="text-[10px] text-zinc-500 font-mono block">Volume: {customer.usage.requestsThisMonth.toLocaleString()} requests</span>
                </div>

                <div className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Wifi className="w-4 h-4 text-blue-400" />
                      <span className="text-xs font-bold text-white">Bandwidth & Egress Data</span>
                    </div>
                    <span className="text-xs font-mono font-bold text-white">${customer.costBreakdown.egressBandwidthCost.toFixed(2)}</span>
                  </div>
                  <p className="text-[11px] text-zinc-400">
                    Response payloads, large JSON streams, and export transfers ($0.08 / GB).
                  </p>
                  <span className="text-[10px] text-zinc-500 font-mono block">Transfer: {(customer.usage.dataTransferMb / 1024).toFixed(2)} GB</span>
                </div>

                <div className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <HardDrive className="w-4 h-4 text-emerald-400" />
                      <span className="text-xs font-bold text-white">Database & Workspace Storage</span>
                    </div>
                    <span className="text-xs font-mono font-bold text-white">${customer.costBreakdown.databaseStorageCost.toFixed(2)}</span>
                  </div>
                  <p className="text-[11px] text-zinc-400">
                    MySQL / SQLite record rows, environments, logs, and collection schemas ($0.15 / GB).
                  </p>
                  <span className="text-[10px] text-zinc-500 font-mono block">{customer.usage.totalCollectionsCount} collections persisted</span>
                </div>

                <div className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-purple-400" />
                      <span className="text-xs font-bold text-white">AI Schema & Code Generator</span>
                    </div>
                    <span className="text-xs font-mono font-bold text-white">${customer.costBreakdown.aiComputeCost.toFixed(2)}</span>
                  </div>
                  <p className="text-[11px] text-zinc-400">
                    AI test generator, cURL parser, and mock response generators ($0.002 / 1k tokens).
                  </p>
                  <span className="text-[10px] text-zinc-500 font-mono block">Tokens: {customer.usage.aiTokensUsed.toLocaleString()} tokens</span>
                </div>
              </div>

              {/* Total Calculation Card */}
              <div className="p-5 rounded-xl bg-[#161a29] border border-white/15 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div>
                  <h4 className="text-sm font-bold text-white">Net Margin Summary</h4>
                  <p className="text-xs text-zinc-400">Monthly Revenue (${customer.monthlyFee.toFixed(2)}) - Total Cost (${customer.costBreakdown.totalCost.toFixed(2)})</p>
                </div>
                <div className="text-right">
                  <span className={`text-2xl font-black ${customer.netMargin >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    ${customer.netMargin.toFixed(2)}/mo
                  </span>
                  <span className="text-xs font-bold text-emerald-400 block">
                    {customer.netMarginPercent.toFixed(1)}% Profit Margin
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* 3. USAGE & TRAFFIC TAB */}
          {activeTab === 'usage' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3.5 rounded-xl bg-white/5 border border-white/10">
                  <span className="text-[11px] text-zinc-400 block mb-1">Average Response Latency</span>
                  <span className="text-xl font-black text-emerald-400">{customer.usage.avgLatencyMs} ms</span>
                  <span className="text-[10px] text-zinc-500 block mt-0.5">Sub-50ms ultra fast</span>
                </div>

                <div className="p-3.5 rounded-xl bg-white/5 border border-white/10">
                  <span className="text-[11px] text-zinc-400 block mb-1">Request Error Rate</span>
                  <span className="text-xl font-black text-blue-400">{customer.usage.errorRatePercent}%</span>
                  <span className="text-[10px] text-zinc-500 block mt-0.5">99.98% Success SLA</span>
                </div>

                <div className="p-3.5 rounded-xl bg-white/5 border border-white/10">
                  <span className="text-[11px] text-zinc-400 block mb-1">Lifetime Total Requests</span>
                  <span className="text-xl font-black text-white">{customer.usage.totalRequests.toLocaleString()}</span>
                  <span className="text-[10px] text-zinc-500 block mt-0.5">Since registration</span>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider">Quota Management</h4>
                  <button
                    onClick={handleResetQuota}
                    className="px-3 py-1 bg-white/10 hover:bg-white/15 text-xs text-white rounded-lg font-semibold flex items-center gap-1.5 transition-colors"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Reset Monthly Quota Counter</span>
                  </button>
                </div>
                <p className="text-xs text-zinc-400">
                  Resetting the quota will refresh the customer&apos;s request consumption for the current billing cycle without affecting historical cost records.
                </p>
              </div>
            </div>
          )}

          {/* 4. ACTIVITY AUDIT TRAIL */}
          {activeTab === 'activity' && (
            <div className="space-y-4">
              <h4 className="text-xs font-bold text-white uppercase tracking-wider">Customer Audit Trail & Real-time Logs</h4>
              <div className="space-y-2">
                {(customer.recentActivity || []).map((act) => (
                  <div key={act.id} className="p-3 rounded-xl bg-white/5 border border-white/10 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 rounded-full bg-orange-400"></div>
                      <div>
                        <span className="font-semibold text-white block">{act.action}</span>
                        <span className="text-[11px] text-zinc-500 font-mono">IP: {act.ip || '127.0.0.1'}</span>
                      </div>
                    </div>
                    <span className="text-[11px] text-zinc-400 font-mono">{act.timestamp}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 5. PLAN & MARGIN SETTINGS */}
          {activeTab === 'settings' && (
            <div className="space-y-5">
              <h4 className="text-xs font-bold text-white uppercase tracking-wider">Subscription & Administrative Override</h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1.5">Plan Tier</label>
                  <select
                    value={editingPlan}
                    onChange={e => {
                      const p = e.target.value as SaaSSubscriptionPlan;
                      setEditingPlan(p);
                      if (p === 'free') setCustomFee('0');
                      else if (p === 'pro') setCustomFee('29');
                      else setCustomFee('199');
                    }}
                    className="w-full bg-[#0d101a] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-orange-500"
                  >
                    <option value="free">Free Developer ($0)</option>
                    <option value="pro">Pro Team ($29/mo)</option>
                    <option value="enterprise">Enterprise Scale ($199/mo)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1.5">Account Status</label>
                  <select
                    value={editingStatus}
                    onChange={e => setEditingStatus(e.target.value as SaaSSubscriptionStatus)}
                    className="w-full bg-[#0d101a] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-orange-500"
                  >
                    <option value="active">Active (Good Standing)</option>
                    <option value="trialing">Trialing (Evaluation)</option>
                    <option value="past_due">Past Due (Payment Retry)</option>
                    <option value="suspended">Suspended / Frozen</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1.5">Custom Monthly Fee ($)</label>
                  <input
                    type="number"
                    value={customFee}
                    onChange={e => setCustomFee(e.target.value)}
                    className="w-full bg-[#0d101a] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-orange-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1.5">Custom Discount (%)</label>
                  <input
                    type="number"
                    value={discountPercent}
                    onChange={e => setDiscountPercent(e.target.value)}
                    className="w-full bg-[#0d101a] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-orange-500 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1.5">Internal Account Notes</label>
                <textarea
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  rows={3}
                  placeholder="Add notes on customer support tickets, SLA negotiations, or VIP requests..."
                  className="w-full bg-[#0d101a] border border-white/10 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-orange-500"
                ></textarea>
              </div>

              <div className="flex items-center justify-between pt-2">
                <div className="text-xs text-emerald-400 font-semibold">
                  {isSaved && '✓ Changes successfully saved to SaaS customer registry.'}
                </div>
                <button
                  type="button"
                  onClick={handleSaveChanges}
                  className="px-5 py-2.5 bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white font-bold text-xs rounded-xl shadow-lg shadow-orange-500/25 transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Save Account Updates</span>
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};
