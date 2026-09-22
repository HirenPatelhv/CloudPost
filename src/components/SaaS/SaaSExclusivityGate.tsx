import React from 'react';
import { User } from '../../types';
import { SaaSSubscriptionPlan } from '../../types/saas';
import { 
  Lock, 
  Sparkles, 
  ShieldCheck, 
  Zap, 
  CheckCircle2, 
  TrendingUp, 
  Users, 
  Activity, 
  Flame, 
  LogIn, 
  UserPlus, 
  ArrowRight,
  Database,
  Layers,
  Check,
  Building2
} from 'lucide-react';

interface SaaSExclusivityGateProps {
  featureName?: string;
  onOpenRegister: (plan?: SaaSSubscriptionPlan) => void;
  onOpenLogin: () => void;
}

export const SaaSExclusivityGate: React.FC<SaaSExclusivityGateProps> = ({
  featureName = 'SaaS Financial Reports & Customer 360',
  onOpenRegister,
  onOpenLogin,
}) => {
  return (
    <div className="flex-1 flex flex-col h-full bg-[#0a0c14] overflow-y-auto p-4 sm:p-8 font-sans select-none text-zinc-100 items-center justify-center min-h-[600px]">
      <div className="max-w-4xl w-full mx-auto space-y-8 my-auto py-6">
        
        {/* Lock Banner & Eyebrow */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-orange-500/10 border border-orange-500/30 text-orange-300 text-xs font-bold uppercase tracking-wider shadow-sm">
            <Lock className="w-3.5 h-3.5 text-orange-400" />
            <span>Restricted Access • SaaS Users Only</span>
          </div>

          <h1 className="text-2xl sm:text-4xl font-black text-white tracking-tight">
            {featureName}
          </h1>

          <p className="text-xs sm:text-sm text-zinc-400 max-w-2xl mx-auto leading-relaxed">
            This module provides executive MRR/ARR analytics, infrastructure unit economics ($0.000002/req), multi-tenant cost accounting, and 30-day customer activity heatmaps. Access is strictly reserved for registered SaaS users and subscribers.
          </p>
        </div>

        {/* Feature Highlights Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-left">
          <div className="p-4 rounded-xl bg-[#111422] border border-white/10 space-y-2">
            <div className="w-8 h-8 rounded-lg bg-orange-500/10 text-orange-400 flex items-center justify-center">
              <Flame className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-bold text-white">30-Day API Heatmap</h3>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Interactive request velocity matrix, daily aggregate calendar blocks, and hover telemetry.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-[#111422] border border-white/10 space-y-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-bold text-white">Unit Economics & Margins</h3>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Real-time MRR, ARR, and net profit margins after subtracting API gateway, egress, and DB storage costs.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-[#111422] border border-white/10 space-y-2">
            <div className="w-8 h-8 rounded-lg bg-purple-500/10 text-purple-400 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-bold text-white">Customer 360 & Metering</h3>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Multi-tenant customer health scores, usage quotas, quota alarms, and CSV/JSON reporting.
            </p>
          </div>
        </div>

        {/* Plan Tiers Preview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Free Tier */}
          <div className="p-5 rounded-2xl bg-[#131625] border border-white/10 flex flex-col justify-between hover:border-white/20 transition-all">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-zinc-400 uppercase">Community</span>
                <span className="text-xs px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-300 font-mono font-bold">$0 Free</span>
              </div>
              <div className="text-lg font-bold text-white">Developer Tier</div>
              <ul className="space-y-1.5 text-xs text-zinc-400">
                <li className="flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>Unlimited requests (No limit)</span>
                </li>
                <li className="flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>Basic SaaS reports</span>
                </li>
                <li className="flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>MySQL DB sync</span>
                </li>
              </ul>
            </div>
            <button
              onClick={() => onOpenRegister('free')}
              className="mt-5 w-full py-2 bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-200 hover:text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
            >
              Select Free Tier
            </button>
          </div>

          {/* Pro Tier (Featured) */}
          <div className="p-5 rounded-2xl bg-gradient-to-b from-orange-500/15 to-[#131625] border-2 border-orange-500/50 flex flex-col justify-between relative shadow-lg shadow-orange-500/10">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-orange-400 uppercase">Pro Engineer</span>
                <span className="text-xs px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-mono font-bold">$0 Free</span>
              </div>
              <div className="text-lg font-bold text-white">Pro Plan</div>
              <ul className="space-y-1.5 text-xs text-zinc-300">
                <li className="flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>Unlimited requests</span>
                </li>
                <li className="flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-orange-400 shrink-0" />
                  <span>Full 30-Day API Heatmap</span>
                </li>
                <li className="flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-orange-400 shrink-0" />
                  <span>Unit Economics & Cost Ledger</span>
                </li>
                <li className="flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-orange-400 shrink-0" />
                  <span>Unlimited Collections & Envs</span>
                </li>
              </ul>
            </div>
            <button
              onClick={() => onOpenRegister('pro')}
              className="mt-5 w-full py-2.5 bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white rounded-xl text-xs font-bold shadow-md shadow-orange-500/20 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Get Free Pro Access</span>
            </button>
          </div>

          {/* Enterprise Tier */}
          <div className="p-5 rounded-2xl bg-[#131625] border border-white/10 flex flex-col justify-between hover:border-white/20 transition-all">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-purple-400 uppercase">Enterprise</span>
                <span className="text-xs px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-mono font-bold">$0 Free</span>
              </div>
              <div className="text-lg font-bold text-white">Enterprise Tier</div>
              <ul className="space-y-1.5 text-xs text-zinc-400">
                <li className="flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>Unlimited requests</span>
                </li>
                <li className="flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                  <span>Multi-Tenant Cost Accounting</span>
                </li>
                <li className="flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                  <span>Dedicated MySQL Cluster Sync</span>
                </li>
                <li className="flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                  <span>Export APIs & Workspaces</span>
                </li>
              </ul>
            </div>
            <button
              onClick={() => onOpenRegister('enterprise')}
              className="mt-5 w-full py-2 bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/30 text-purple-300 hover:text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
            >
              Select Enterprise (Free)
            </button>
          </div>
        </div>

        {/* Sign In / Account prompt */}
        <div className="p-4 rounded-xl bg-white/5 border border-white/10 text-center space-y-2">
          <div className="text-xs text-zinc-300">
            Already have an active account?{' '}
            <button
              onClick={onOpenLogin}
              className="text-orange-400 hover:text-orange-300 underline font-semibold ml-1"
            >
              Sign In to Your Workspace
            </button>
          </div>
          <p className="text-[11px] text-zinc-500">
            Sign in or register a new account to unlock full SaaS customer management and real-time telemetry.
          </p>
        </div>

      </div>
    </div>
  );
};
