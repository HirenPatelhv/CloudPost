import React, { useState } from 'react';
import { User, Role } from '../../types';
import { SaaSSubscriptionPlan } from '../../types/saas';
import { registerNewSaaSCustomer, isSaaSAdmin } from '../../services/saasService';
import { getApiUrl } from '../../config';
import {
  UserPlus,
  CheckCircle2,
  Lock,
  Mail,
  User as UserIcon,
  Building2,
  Briefcase,
  Sparkles,
  ArrowRight,
  Shield,
  Zap,
  Check,
  Globe,
  Layers,
  ArrowLeft,
  Flame,
  Star
} from 'lucide-react';

interface RegisterPageProps {
  onRegisterSuccess: (user: User, shouldMigrateData?: boolean) => void;
  onSwitchToLogin: () => void;
  onClose?: () => void;
}

export const RegisterPage: React.FC<RegisterPageProps> = ({
  onRegisterSuccess,
  onSwitchToLogin,
  onClose,
}) => {
  const [step, setStep] = useState<1 | 2>(1);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [role, setRole] = useState('Backend Engineer');
  const [selectedPlan, setSelectedPlan] = useState<SaaSSubscriptionPlan>('pro');
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
  const [agreeTerms, setAgreeTerms] = useState(true);
  const [migrateGuestData, setMigrateGuestData] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Password strength calculation
  const getPasswordStrength = (pass: string) => {
    let score = 0;
    if (pass.length >= 8) score += 1;
    if (/[A-Z]/.test(pass)) score += 1;
    if (/[0-9]/.test(pass)) score += 1;
    if (/[^A-Za-z0-9]/.test(pass)) score += 1;
    return score;
  };

  const passStrength = getPasswordStrength(password);

  const handleStep1Submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Please enter your full name.');
      return;
    }
    if (!email.trim() || !email.includes('@')) {
      setError('Please enter a valid work email address.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    setError(null);
    setStep(2);
  };

  const handleFinalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!agreeTerms) {
      setError('Please accept the Terms of Service & Privacy Policy to continue.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    const planFeeMap: Record<SaaSSubscriptionPlan, number> = {
      free: 0,
      pro: 0,
      enterprise: 0,
    };

    const fee = 0; // 100% Free of Cost right now
    const company = companyName || (email.split('@')[1] ? email.split('@')[1].split('.')[0].toUpperCase() : 'Tech Co');

    try {
      // 1. Try server-side API registration first
      try {
        const resp = await fetch(getApiUrl('/api/auth/register'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name,
            email,
            password,
            companyName: company,
            role,
            plan: selectedPlan,
            monthlyFee: fee,
          }),
        });

        if (resp.ok) {
          const json = await resp.json();
          if (json.success && json.user) {
            // Also update local cache
            registerNewSaaSCustomer({
              name,
              email,
              companyName: company,
              role,
              plan: selectedPlan,
              monthlyFee: fee,
            });

            const userWithAdmin: User = {
              ...json.user,
              isSaaSAdmin: json.user.isSaaSAdmin ?? isSaaSAdmin(json.user),
            };
            onRegisterSuccess(userWithAdmin, migrateGuestData);
            return;
          }
        }
      } catch (netErr) {
        console.warn('Backend register not reachable, using local customer store:', netErr);
      }

      // 2. Fallback to offline/local SaaS customer store
      const saasCust = registerNewSaaSCustomer({
        name,
        email,
        companyName: company,
        role,
        plan: selectedPlan,
        monthlyFee: fee,
      });

      const newUser: User = {
        id: saasCust.id,
        name: name,
        email: email,
        avatar: saasCust.avatar,
        currentWorkspaceId: 'ws_personal_default',
        plan: selectedPlan,
        isSaaSUser: true,
        isSaaSAdmin: isSaaSAdmin({ email, roleTitle: role } as any),
        companyName: company,
        roleTitle: role,
      };

      onRegisterSuccess(newUser, migrateGuestData);
    } catch (err: any) {
      setError(err?.message || 'Failed to complete registration. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-full w-full bg-[#0a0c14] text-zinc-100 flex flex-col items-center justify-center p-4 sm:p-8 font-sans animate-in fade-in duration-200">
      <div className="w-full max-w-4xl bg-[#121624] border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col md:flex-row">
        
        {/* Left Side: Brand Highlights & SaaS Value Prop */}
        <div className="md:w-5/12 bg-gradient-to-br from-[#181d30] via-[#141828] to-[#0d101d] p-6 sm:p-8 border-b md:border-b-0 md:border-r border-white/10 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-orange-500 to-amber-600 flex items-center justify-center shadow-lg shadow-orange-500/25">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="font-extrabold text-lg text-white tracking-tight">CloudPost Platform</h1>
                <p className="text-xs text-orange-400 font-mono font-medium">Enterprise & SaaS API Studio</p>
              </div>
            </div>

            <div className="space-y-4">
              <h2 className="text-xl sm:text-2xl font-black text-white leading-tight">
                Developer API Workspace & <span className="bg-gradient-to-r from-orange-400 to-amber-300 bg-clip-text text-transparent">SaaS Hub</span>
              </h2>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Join thousands of engineering teams building, testing, and managing high-throughput APIs with automated database persistence and cost tracking.
              </p>

              <div className="space-y-3 pt-2">
                <div className="flex items-start gap-2.5 text-xs text-zinc-300">
                  <div className="p-1 rounded-md bg-emerald-500/10 text-emerald-400 shrink-0 mt-0.5">
                    <Check className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <span className="font-semibold text-white">Full Persistence:</span>
                    <p className="text-[11px] text-zinc-400">Save collections, history, and variables directly to MySQL & SQLite.</p>
                  </div>
                </div>

                <div className="flex items-start gap-2.5 text-xs text-zinc-300">
                  <div className="p-1 rounded-md bg-orange-500/10 text-orange-400 shrink-0 mt-0.5">
                    <Zap className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <span className="font-semibold text-white">Dual Engine (PHP & React):</span>
                    <p className="text-[11px] text-zinc-400">Deploy anywhere: cPanel, XAMPP, Docker, or Node.js cloud.</p>
                  </div>
                </div>

                <div className="flex items-start gap-2.5 text-xs text-zinc-300">
                  <div className="p-1 rounded-md bg-blue-500/10 text-blue-400 shrink-0 mt-0.5">
                    <Shield className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <span className="font-semibold text-white">SaaS Cost & Usage Intelligence:</span>
                    <p className="text-[11px] text-zinc-400">Track gateway egress, compute costs, and margins in real-time.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-6 mt-6 border-t border-white/5 flex items-center justify-between text-xs text-zinc-400">
            <span>Already have an account?</span>
            <button
              onClick={onSwitchToLogin}
              className="text-orange-400 hover:text-orange-300 font-bold flex items-center gap-1 transition-colors"
            >
              <span>Sign In</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Right Side: Registration Steps Form */}
        <div className="md:w-7/12 p-6 sm:p-8 flex flex-col justify-between bg-[#111522]">
          <div>
            {/* Step indicators */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                  step === 1 ? 'bg-orange-500 text-white' : 'bg-emerald-500 text-white'
                }`}>
                  {step === 1 ? '1' : <Check className="w-4 h-4" />}
                </div>
                <span className="text-xs font-bold text-white">
                  {step === 1 ? 'Account Information' : 'Organization & Plan'}
                </span>
              </div>
              <span className="text-[11px] text-zinc-500 font-mono">Step {step} of 2</span>
            </div>

            {error && (
              <div className="mb-4 p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-300 text-xs">
                {error}
              </div>
            )}

            {/* STEP 1: Personal Credentials */}
            {step === 1 && (
              <form onSubmit={handleStep1Submit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                    Full Name <span className="text-rose-400">*</span>
                  </label>
                  <div className="relative">
                    <UserIcon className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={e => setName(e.target.value)}
                      placeholder="Jane Doe"
                      className="w-full bg-[#0c0e17] border border-white/10 rounded-xl pl-9 pr-3 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-orange-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                    Work Email Address <span className="text-rose-400">*</span>
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      placeholder="jane@company.com"
                      className="w-full bg-[#0c0e17] border border-white/10 rounded-xl pl-9 pr-3 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-orange-500"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-semibold text-zinc-300">
                      Create Password <span className="text-rose-400">*</span>
                    </label>
                    <span className="text-[10px] text-zinc-500 font-mono">Min. 6 characters</span>
                  </div>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="password"
                      required
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      placeholder="••••••••••••"
                      className="w-full bg-[#0c0e17] border border-white/10 rounded-xl pl-9 pr-3 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-orange-500"
                    />
                  </div>
                  {/* Strength Bar */}
                  {password.length > 0 && (
                    <div className="mt-2 space-y-1">
                      <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden flex gap-1">
                        <div className={`h-full rounded-full transition-all ${passStrength >= 1 ? 'bg-rose-500 w-1/4' : 'w-0'}`}></div>
                        <div className={`h-full rounded-full transition-all ${passStrength >= 2 ? 'bg-amber-500 w-1/4' : 'w-0'}`}></div>
                        <div className={`h-full rounded-full transition-all ${passStrength >= 3 ? 'bg-blue-500 w-1/4' : 'w-0'}`}></div>
                        <div className={`h-full rounded-full transition-all ${passStrength >= 4 ? 'bg-emerald-500 w-1/4' : 'w-0'}`}></div>
                      </div>
                      <div className="flex justify-between text-[10px] text-zinc-500">
                        <span>Password strength:</span>
                        <span className={`font-semibold ${
                          passStrength <= 1 ? 'text-rose-400' :
                          passStrength === 2 ? 'text-amber-400' :
                          passStrength === 3 ? 'text-blue-400' : 'text-emerald-400'
                        }`}>
                          {passStrength <= 1 ? 'Weak' : passStrength === 2 ? 'Fair' : passStrength === 3 ? 'Good' : 'Strong'}
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    className="w-full py-3 bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white font-bold text-xs rounded-xl shadow-lg shadow-orange-500/25 flex items-center justify-center gap-2 transition-all cursor-pointer"
                  >
                    <span>Continue to Plan & Organization</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </form>
            )}

            {/* STEP 2: Organization & Plan Selection */}
            {step === 2 && (
              <form onSubmit={handleFinalSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                      Company / Org Name
                    </label>
                    <div className="relative">
                      <Building2 className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={companyName}
                        onChange={e => setCompanyName(e.target.value)}
                        placeholder="Acme Corp"
                        className="w-full bg-[#0c0e17] border border-white/10 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-orange-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                      Engineering Role
                    </label>
                    <div className="relative">
                      <Briefcase className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
                      <select
                        value={role}
                        onChange={e => setRole(e.target.value)}
                        className="w-full bg-[#0c0e17] border border-white/10 rounded-xl pl-9 pr-3 py-2 text-xs text-white focus:outline-none focus:border-orange-500"
                      >
                        <option value="Backend Engineer">Backend Engineer</option>
                        <option value="Full-Stack Developer">Full-Stack Developer</option>
                        <option value="Lead Architect">Lead Architect</option>
                        <option value="QA / SDET">QA / Automation Engineer</option>
                        <option value="DevOps / SRE">DevOps / SRE</option>
                        <option value="Engineering Manager">Engineering Manager</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Plan Selection Cards */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-semibold text-zinc-300">Select Subscription Tier</label>
                    <span className="text-[10px] text-emerald-400 font-mono font-semibold bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                      $0 / No Credit Card
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    {/* Free */}
                    <div
                      onClick={() => setSelectedPlan('free')}
                      className={`p-3 rounded-xl border cursor-pointer transition-all flex flex-col justify-between ${
                        selectedPlan === 'free'
                          ? 'bg-orange-500/10 border-orange-500 shadow-md text-white'
                          : 'bg-[#0c0e17] border-white/10 text-zinc-400 hover:border-white/20'
                      }`}
                    >
                      <div>
                        <span className="text-xs font-bold text-white block">Community</span>
                        <span className="text-base font-black text-emerald-400">$0</span>
                        <span className="text-[10px] text-zinc-500 block">/ free forever</span>
                      </div>
                      <p className="text-[10px] text-zinc-400 mt-2">Unlimited reqs, fast execution</p>
                    </div>

                    {/* Pro */}
                    <div
                      onClick={() => setSelectedPlan('pro')}
                      className={`relative p-3 rounded-xl border cursor-pointer transition-all flex flex-col justify-between ${
                        selectedPlan === 'pro'
                          ? 'bg-orange-500/15 border-orange-500 shadow-md ring-1 ring-orange-500/50 text-white'
                          : 'bg-[#0c0e17] border-white/10 text-zinc-400 hover:border-white/20'
                      }`}
                    >
                      <span className="absolute -top-2 right-2 bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-[8px] font-black uppercase px-1.5 py-0.2 rounded-full shadow">
                        Free Access
                      </span>
                      <div>
                        <span className="text-xs font-bold text-white block">Pro Developer</span>
                        <span className="text-base font-black text-emerald-400">$0</span>
                        <span className="text-[10px] text-zinc-500 block">/ free of cost</span>
                      </div>
                      <p className="text-[10px] text-zinc-400 mt-2">Unlimited calls, full team seats</p>
                    </div>

                    {/* Enterprise */}
                    <div
                      onClick={() => setSelectedPlan('enterprise')}
                      className={`p-3 rounded-xl border cursor-pointer transition-all flex flex-col justify-between ${
                        selectedPlan === 'enterprise'
                          ? 'bg-orange-500/10 border-orange-500 shadow-md text-white'
                          : 'bg-[#0c0e17] border-white/10 text-zinc-400 hover:border-white/20'
                      }`}
                    >
                      <div>
                        <span className="text-xs font-bold text-white block">Enterprise</span>
                        <span className="text-base font-black text-emerald-400">$0</span>
                        <span className="text-[10px] text-zinc-500 block">/ free of cost</span>
                      </div>
                      <p className="text-[10px] text-zinc-400 mt-2">Unlimited reqs, dedicated DB</p>
                    </div>
                  </div>
                </div>

                {/* Migrations & Checkboxes */}
                <div className="space-y-2 pt-1 text-xs">
                  <label className="flex items-start gap-2 cursor-pointer text-zinc-300">
                    <input
                      type="checkbox"
                      checked={migrateGuestData}
                      onChange={e => setMigrateGuestData(e.target.checked)}
                      className="mt-0.5 w-3.5 h-3.5 rounded text-orange-500 bg-[#0c0e17] border-white/20"
                    />
                    <span className="text-[11px]">Save current temporary guest requests & environment variables into my account</span>
                  </label>

                  <label className="flex items-start gap-2 cursor-pointer text-zinc-300">
                    <input
                      type="checkbox"
                      checked={agreeTerms}
                      onChange={e => setAgreeTerms(e.target.checked)}
                      className="mt-0.5 w-3.5 h-3.5 rounded text-orange-500 bg-[#0c0e17] border-white/20"
                    />
                    <span className="text-[11px]">
                      I agree to the <span className="text-orange-400 underline">Terms of Service</span> and <span className="text-orange-400 underline">Privacy Policy</span>
                    </span>
                  </label>
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="px-4 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-300 hover:text-white text-xs font-semibold rounded-xl transition-colors flex items-center gap-1.5"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Back</span>
                  </button>

                  <button
                    type="submit"
                    className="flex-1 py-2.5 bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white font-bold text-xs rounded-xl shadow-lg shadow-orange-500/25 flex items-center justify-center gap-2 transition-all cursor-pointer"
                  >
                    <UserPlus className="w-4 h-4" />
                    <span>Complete Registration & Launch Workspace</span>
                  </button>
                </div>
              </form>
            )}
          </div>

          <div className="mt-4 pt-4 border-t border-white/5 text-center">
            <span className="text-[11px] text-zinc-500">
              Need help? Contact our platform engineer support at <span className="text-zinc-400">support@cloudpost.io</span>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
