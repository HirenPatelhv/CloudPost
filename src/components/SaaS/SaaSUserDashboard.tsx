import React, { useState, useMemo } from 'react';
import { User } from '../../types';
import { SaaSCustomer, SaaSSubscriptionPlan, SaaSSubscriptionStatus } from '../../types/saas';
import { computeSaaSMetrics } from '../../data/saasData';
import { exportCustomersToCsv, downloadCsvFile, registerNewSaaSCustomer } from '../../services/saasService';
import { CustomerDetailModal } from './CustomerDetailModal';
import { SaaSExclusivityGate } from './SaaSExclusivityGate';
import { DesktopReleaseManagement } from './DesktopReleaseManagement';
import {
  Users,
  Search,
  Filter,
  DollarSign,
  TrendingUp,
  Activity,
  ArrowUpRight,
  ShieldCheck,
  Zap,
  Download,
  Plus,
  MoreVertical,
  ExternalLink,
  ChevronDown,
  Building2,
  CheckCircle2,
  AlertCircle,
  Clock,
  Sparkles,
  SlidersHorizontal,
  HardDrive,
  Lock,
  Monitor,
  Apple,
  Terminal
} from 'lucide-react';

interface SaaSUserDashboardProps {
  customers: SaaSCustomer[];
  currentUser?: User | null;
  isGuest?: boolean;
  onUpdateCustomer: (id: string, updates: Partial<SaaSCustomer>) => void;
  onOpenReportsTab: () => void;
  onOpenRegisterTab: (plan?: SaaSSubscriptionPlan) => void;
  onOpenAuthModal?: () => void;
  onSwitchToGuest?: () => void;
  initialSubTab?: 'customers' | 'releases';
}

export const SaaSUserDashboard: React.FC<SaaSUserDashboardProps> = ({
  customers,
  currentUser,
  isGuest = false,
  onUpdateCustomer,
  onOpenReportsTab,
  onOpenRegisterTab,
  onOpenAuthModal,
  onSwitchToGuest,
  initialSubTab = 'customers',
}) => {
  const [dashboardSubTab, setDashboardSubTab] = useState<'customers' | 'releases'>(initialSubTab);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPlanFilter, setSelectedPlanFilter] = useState<'all' | SaaSSubscriptionPlan>('all');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<'all' | SaaSSubscriptionStatus>('all');
  const [sortBy, setSortBy] = useState<'mrr' | 'requests' | 'margin' | 'health' | 'date'>('mrr');
  const [selectedCustomer, setSelectedCustomer] = useState<SaaSCustomer | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);

  // New customer modal state
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newCompany, setNewCompany] = useState('');
  const [newRole, setNewRole] = useState('Senior Backend Engineer');
  const [newPlan, setNewPlan] = useState<SaaSSubscriptionPlan>('pro');

  const metrics = useMemo(() => computeSaaSMetrics(customers), [customers]);

  const filteredCustomers = useMemo(() => {
    return customers.filter(c => {
      const matchSearch =
        c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.companyName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.country.toLowerCase().includes(searchQuery.toLowerCase());

      const matchPlan = selectedPlanFilter === 'all' || c.plan === selectedPlanFilter;
      const matchStatus = selectedStatusFilter === 'all' || c.status === selectedStatusFilter;

      return matchSearch && matchPlan && matchStatus;
    }).sort((a, b) => {
      if (sortBy === 'mrr') return b.monthlyFee - a.monthlyFee;
      if (sortBy === 'requests') return b.usage.totalRequests - a.usage.totalRequests;
      if (sortBy === 'margin') return b.netMargin - a.netMargin;
      if (sortBy === 'health') return b.healthScore - a.healthScore;
      if (sortBy === 'date') return new Date(b.registeredAt).getTime() - new Date(a.registeredAt).getTime();
      return 0;
    });
  }, [customers, searchQuery, selectedPlanFilter, selectedStatusFilter, sortBy]);

  // Verify SaaS User status
  const isSaaSUser = !isGuest && !!currentUser && (currentUser.isSaaSUser || !!currentUser.plan);

  // If NOT a SaaS user, render the dedicated Exclusivity Gate
  if (!isSaaSUser) {
    return (
      <SaaSExclusivityGate
        featureName="SaaS Customer 360 & Cost Metering Hub"
        onOpenRegister={plan => onOpenRegisterTab(plan)}
        onOpenLogin={() => onOpenAuthModal?.()}
      />
    );
  }

  const handleExportCsv = () => {
    const csv = exportCustomersToCsv(filteredCustomers);
    downloadCsvFile(csv, `cloudpost_saas_customers_${new Date().toISOString().split('T')[0]}.csv`);
  };

  const handleCreateCustomerSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName || !newEmail) return;

    const newCust = registerNewSaaSCustomer({
      name: newName,
      email: newEmail,
      companyName: newCompany,
      role: newRole,
      plan: newPlan,
    });

    onUpdateCustomer(newCust.id, newCust);

    setShowAddModal(false);
    setNewName('');
    setNewEmail('');
    setNewCompany('');
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#0a0c14] overflow-y-auto p-4 sm:p-6 space-y-6 font-sans select-none">
      
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
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-orange-500 to-amber-600 flex items-center justify-center text-white shadow-lg shadow-orange-500/20">
              <Users className="w-4 h-4" />
            </div>
            <h1 className="text-xl font-black text-white">SaaS Customer & User 360 Hub</h1>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-orange-500/20 text-orange-300 border border-orange-500/30 font-mono font-bold">
              Real-time Cost & Usage Analytics
            </span>
          </div>
          <p className="text-xs text-zinc-400 mt-1">
            Track, inspect, and audit all registered SaaS developers, billing tiers, API execution costs, and profit margins.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={onOpenReportsTab}
            className="px-3.5 py-2 bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-200 hover:text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors"
          >
            <TrendingUp className="w-3.5 h-3.5 text-orange-400" />
            <span>View SaaS Financial Reports</span>
          </button>

          <button
            onClick={handleExportCsv}
            className="px-3.5 py-2 bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-200 hover:text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors"
          >
            <Download className="w-3.5 h-3.5 text-blue-400" />
            <span>Export CSV</span>
          </button>

          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2 bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white rounded-xl text-xs font-bold shadow-lg shadow-orange-500/25 flex items-center gap-1.5 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Add SaaS Customer</span>
          </button>
        </div>
      </div>

      {/* Sub-tab Navigation */}
      <div className="flex items-center gap-2 border-b border-white/10 pb-3">
        <button
          onClick={() => setDashboardSubTab('customers')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
            dashboardSubTab === 'customers'
              ? 'bg-gradient-to-r from-orange-500 to-amber-600 text-white shadow-lg shadow-orange-500/20'
              : 'text-zinc-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>SaaS Customers & Metering ({customers.length})</span>
        </button>

        <button
          onClick={() => setDashboardSubTab('releases')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
            dashboardSubTab === 'releases'
              ? 'bg-gradient-to-r from-orange-500 to-amber-600 text-white shadow-lg shadow-orange-500/20'
              : 'text-zinc-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <HardDrive className="w-4 h-4" />
          <span>Desktop Version Management & Auto-Update</span>
        </button>
      </div>

      {dashboardSubTab === 'releases' ? (
        <DesktopReleaseManagement />
      ) : (
        <>
      {/* KPI Cards Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="p-3.5 rounded-xl bg-[#111422] border border-white/10">
          <span className="text-[11px] text-zinc-400 block mb-1">Total SaaS Accounts</span>
          <span className="text-xl font-black text-white">{metrics.totalCustomers}</span>
          <span className="text-[10px] text-emerald-400 block mt-0.5 font-semibold">
            {metrics.activeSubscriptions} Paid Subscriptions
          </span>
        </div>

        <div className="p-3.5 rounded-xl bg-[#111422] border border-white/10">
          <span className="text-[11px] text-zinc-400 block mb-1">Monthly Run-Rate (MRR)</span>
          <span className="text-xl font-black text-emerald-400">${metrics.totalMrr.toLocaleString()}</span>
          <span className="text-[10px] text-zinc-500 block mt-0.5 font-mono">
            ARR: ${(metrics.totalArr).toLocaleString()}
          </span>
        </div>

        <div className="p-3.5 rounded-xl bg-[#111422] border border-white/10">
          <span className="text-[11px] text-zinc-400 block mb-1">Total Infra Cost</span>
          <span className="text-xl font-black text-rose-400">${metrics.totalInfrastructureCost.toLocaleString()}</span>
          <span className="text-[10px] text-zinc-500 block mt-0.5">Gateway + Bandwidth</span>
        </div>

        <div className="p-3.5 rounded-xl bg-[#111422] border border-white/10">
          <span className="text-[11px] text-zinc-400 block mb-1">Net Monthly Margin</span>
          <span className="text-xl font-black text-white">${metrics.netProfitMrr.toLocaleString()}</span>
          <span className="text-[10px] text-emerald-400 block mt-0.5 font-bold">
            {metrics.overallMarginPercent}% Profit Margin
          </span>
        </div>

        <div className="p-3.5 rounded-xl bg-[#111422] border border-white/10">
          <span className="text-[11px] text-zinc-400 block mb-1">Total API Volume</span>
          <span className="text-xl font-black text-orange-400">{(metrics.totalApiRequests / 1000000).toFixed(1)}M</span>
          <span className="text-[10px] text-zinc-500 block mt-0.5">Requests metered</span>
        </div>

        <div className="p-3.5 rounded-xl bg-[#111422] border border-white/10">
          <span className="text-[11px] text-zinc-400 block mb-1">Avg Account Health</span>
          <span className="text-xl font-black text-purple-300">{metrics.customerHealthAvg}/100</span>
          <span className="text-[10px] text-zinc-400 block mt-0.5">
            {metrics.churnRatePercent}% Monthly Churn
          </span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-3 rounded-xl bg-[#111422] border border-white/10 flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search by customer name, email, company, or country..."
            className="w-full bg-[#0a0c14] border border-white/10 rounded-lg pl-9 pr-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-orange-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto">
          {/* Plan Filter */}
          <div className="flex items-center gap-1 bg-white/5 p-1 rounded-lg border border-white/10 text-xs">
            <span className="text-[10px] font-semibold text-zinc-400 px-1">Plan:</span>
            {(['all', 'free', 'pro', 'enterprise'] as const).map(p => (
              <button
                key={p}
                onClick={() => setSelectedPlanFilter(p)}
                className={`px-2.5 py-1 rounded text-[11px] font-semibold capitalize transition-colors ${
                  selectedPlanFilter === p ? 'bg-orange-500 text-white' : 'text-zinc-400 hover:text-white'
                }`}
              >
                {p}
              </button>
            ))}
          </div>

          {/* Status Filter */}
          <select
            value={selectedStatusFilter}
            onChange={e => setSelectedStatusFilter(e.target.value as any)}
            className="bg-[#0a0c14] border border-white/10 text-zinc-300 text-xs rounded-lg px-2.5 py-2 focus:outline-none focus:border-orange-500"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active</option>
            <option value="trialing">Trialing</option>
            <option value="past_due">Past Due</option>
            <option value="suspended">Suspended</option>
          </select>

          {/* Sort By */}
          <select
            value={sortBy}
            onChange={e => setSortBy(e.target.value as any)}
            className="bg-[#0a0c14] border border-white/10 text-zinc-300 text-xs rounded-lg px-2.5 py-2 focus:outline-none focus:border-orange-500 font-medium"
          >
            <option value="mrr">Sort by MRR (Highest)</option>
            <option value="requests">Sort by API Requests</option>
            <option value="margin">Sort by Net Margin</option>
            <option value="health">Sort by Health Score</option>
            <option value="date">Sort by Signup Date</option>
          </select>
        </div>
      </div>

      {/* Customer Directory Table */}
      <div className="rounded-xl bg-[#111422] border border-white/10 overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-white/10 bg-white/5 text-zinc-400 font-semibold uppercase text-[10px] tracking-wider">
                <th className="py-3 px-4">Customer & Organization</th>
                <th className="py-3 px-3">Plan Tier & Status</th>
                <th className="py-3 px-3">Monthly Revenue</th>
                <th className="py-3 px-3">API Traffic & Quota</th>
                <th className="py-3 px-3">Total Infra Cost</th>
                <th className="py-3 px-3">Net Profit Margin</th>
                <th className="py-3 px-3">Health</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-zinc-200">
              {filteredCustomers.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-xs text-zinc-500">
                    No SaaS customers matched your query or filters.
                  </td>
                </tr>
              ) : (
                filteredCustomers.map(customer => (
                  <tr
                    key={customer.id}
                    onClick={() => setSelectedCustomer(customer)}
                    className="hover:bg-white/5 cursor-pointer transition-colors group"
                  >
                    {/* 1. Customer */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <img
                          src={customer.avatar}
                          alt={customer.name}
                          className="w-8 h-8 rounded-lg object-cover border border-white/10"
                        />
                        <div>
                          <span className="font-bold text-white block group-hover:text-orange-400 transition-colors">
                            {customer.name}
                          </span>
                          <span className="text-[11px] text-zinc-400 flex items-center gap-1.5">
                            <span>{customer.email}</span>
                            <span>•</span>
                            <span className="text-zinc-500 font-semibold">{customer.companyName}</span>
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* 2. Plan Tier */}
                    <td className="py-3 px-3">
                      <div className="space-y-1">
                        <span className={`inline-block text-[9px] px-2 py-0.5 rounded-full font-mono uppercase font-bold border ${
                          customer.plan === 'enterprise' ? 'bg-purple-500/20 text-purple-300 border-purple-500/30' :
                          customer.plan === 'pro' ? 'bg-orange-500/20 text-orange-300 border-orange-500/30' :
                          'bg-zinc-500/20 text-zinc-300 border-zinc-500/30'
                        }`}>
                          {customer.plan}
                        </span>
                        <div>
                          <span className={`inline-flex items-center gap-1 text-[10px] font-semibold ${
                            customer.status === 'active' ? 'text-emerald-400' :
                            customer.status === 'trialing' ? 'text-blue-400' :
                            customer.status === 'past_due' ? 'text-rose-400' : 'text-zinc-500'
                          }`}>
                            <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
                            <span className="capitalize">{customer.status.replace('_', ' ')}</span>
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* 3. Monthly Revenue */}
                    <td className="py-3 px-3">
                      <span className="font-bold text-white font-mono text-xs">
                        ${customer.monthlyFee.toFixed(2)}
                      </span>
                      <span className="text-[10px] text-zinc-500 block">/ {customer.billingCycle}</span>
                    </td>

                    {/* 4. API Traffic & Quota */}
                    <td className="py-3 px-3">
                      <div className="w-36 space-y-1">
                        <div className="flex justify-between text-[10px] font-mono">
                          <span className="text-zinc-300 font-semibold">
                            {(customer.usage.requestsThisMonth / 1000).toFixed(0)}k reqs
                          </span>
                          <span className="text-emerald-400 font-semibold">Unlimited</span>
                        </div>
                        <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full bg-emerald-500 w-full"
                          ></div>
                        </div>
                      </div>
                    </td>

                    {/* 5. Infra Cost */}
                    <td className="py-3 px-3">
                      <span className="font-mono text-rose-400 font-bold text-xs">
                        ${customer.costBreakdown.totalCost.toFixed(2)}
                      </span>
                      <span className="text-[10px] text-zinc-500 block">
                        {(customer.usage.dataTransferMb / 1024).toFixed(1)} GB Egress
                      </span>
                    </td>

                    {/* 6. Net Profit Margin */}
                    <td className="py-3 px-3">
                      <span className={`font-mono font-bold text-xs ${customer.netMargin >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        ${customer.netMargin.toFixed(2)}
                      </span>
                      <span className="text-[10px] text-emerald-400/80 block font-bold">
                        {customer.netMarginPercent.toFixed(1)}% margin
                      </span>
                    </td>

                    {/* 7. Health */}
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-1.5">
                        <span className={`px-2 py-0.5 rounded font-mono font-bold text-[10px] ${
                          customer.healthScore >= 90 ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30' :
                          customer.healthScore >= 70 ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30' :
                          'bg-rose-500/15 text-rose-300 border border-rose-500/30'
                        }`}>
                          {customer.healthScore}%
                        </span>
                      </div>
                    </td>

                    {/* 8. Actions */}
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={e => {
                          e.stopPropagation();
                          setSelectedCustomer(customer);
                        }}
                        className="px-2.5 py-1 bg-white/5 hover:bg-orange-500/20 text-zinc-300 hover:text-orange-300 border border-white/10 rounded-lg text-[11px] font-semibold transition-colors inline-flex items-center gap-1"
                      >
                        <span>Inspect 360</span>
                        <ArrowUpRight className="w-3 h-3" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Customer 360 Inspector Modal */}
      {selectedCustomer && (
        <CustomerDetailModal
          customer={selectedCustomer}
          isOpen={true}
          onClose={() => setSelectedCustomer(null)}
          onUpdateCustomer={(id, updates) => {
            onUpdateCustomer(id, updates);
            setSelectedCustomer(prev => (prev ? { ...prev, ...updates } : null));
          }}
        />
      )}
      </>
      )}

      {/* Add New SaaS Customer Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-[#111422] border border-white/15 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
            <div className="p-4 border-b border-white/10 flex items-center justify-between bg-[#161a29]">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Plus className="w-4 h-4 text-orange-400" />
                <span>Create New SaaS Customer</span>
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1 text-zinc-400 hover:text-white rounded"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateCustomerSubmit} className="p-5 space-y-4 text-xs">
              <div>
                <label className="block text-zinc-300 font-semibold mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  placeholder="Alex Rivera"
                  className="w-full bg-[#0a0c14] border border-white/10 rounded-lg px-3 py-2 text-white placeholder-zinc-500 focus:outline-none focus:border-orange-500"
                />
              </div>

              <div>
                <label className="block text-zinc-300 font-semibold mb-1">Work Email</label>
                <input
                  type="email"
                  required
                  value={newEmail}
                  onChange={e => setNewEmail(e.target.value)}
                  placeholder="alex.r@fintech.dev"
                  className="w-full bg-[#0a0c14] border border-white/10 rounded-lg px-3 py-2 text-white placeholder-zinc-500 focus:outline-none focus:border-orange-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-zinc-300 font-semibold mb-1">Company</label>
                  <input
                    type="text"
                    value={newCompany}
                    onChange={e => setNewCompany(e.target.value)}
                    placeholder="Fintech Dev"
                    className="w-full bg-[#0a0c14] border border-white/10 rounded-lg px-3 py-2 text-white placeholder-zinc-500 focus:outline-none focus:border-orange-500"
                  />
                </div>

                <div>
                  <label className="block text-zinc-300 font-semibold mb-1">Plan Tier</label>
                  <select
                    value={newPlan}
                    onChange={e => setNewPlan(e.target.value as SaaSSubscriptionPlan)}
                    className="w-full bg-[#0a0c14] border border-white/10 rounded-lg px-2.5 py-2 text-white focus:outline-none focus:border-orange-500"
                  >
                    <option value="free">Free ($0)</option>
                    <option value="pro">Pro ($29/mo)</option>
                    <option value="enterprise">Enterprise ($199/mo)</option>
                  </select>
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 bg-white/5 hover:bg-white/10 text-zinc-300 rounded-lg font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white rounded-lg font-bold shadow-md"
                >
                  Create Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
