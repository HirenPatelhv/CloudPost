import React, { useState } from 'react';
import { User } from '../../types';
import { getApiUrl } from '../../config';
import { isSaaSAdmin } from '../../services/saasService';
import { 
  X, 
  LogIn, 
  UserPlus, 
  User as UserIcon,
  Lock,
  Mail
} from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (user: User, shouldMigrateGuestData?: boolean) => void;
  hasGuestData?: boolean;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  onLoginSuccess,
  hasGuestData = false,
}) => {
  const [tab, setTab] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [migrateData, setMigrateData] = useState(hasGuestData);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email || !password) {
      setError('Please enter both email and password.');
      return;
    }

    if (tab === 'register' && !name) {
      setError('Please enter your full name.');
      return;
    }

    const isHirenHv = email.toLowerCase() === 'hirenpatelhv@gmail.com';
    if (isHirenHv && password !== 'Micr0@1122') {
      setError('Invalid password. Please enter the correct password.');
      return;
    }

    setIsSubmitting(true);

    try {
      const endpoint = tab === 'login' ? getApiUrl('/api/auth/login') : getApiUrl('/api/auth/register');
      const payload = tab === 'login'
        ? { email, password }
        : {
            name: name || (isHirenHv ? 'Hiren Patel' : email.split('@')[0]),
            email,
            password,
            companyName: isHirenHv ? 'CloudPost SaaS Enterprise' : 'CloudPost',
            role: isHirenHv ? 'Workspace Architect & SuperAdmin' : 'Backend Engineer',
            plan: 'enterprise',
          };

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (data.success && data.user) {
        const userObj: User = {
          ...data.user,
          isSaaSAdmin: data.user.isSaaSAdmin ?? isSaaSAdmin(data.user),
        };
        onLoginSuccess(userObj, migrateData);
        onClose();
        setIsSubmitting(false);
        return;
      } else if (data.error) {
        setError(data.error);
        setIsSubmitting(false);
        return;
      }
    } catch (apiErr) {
      // Local fallback in case network/server unavailable
    }

    const newUser: User = isHirenHv
      ? {
          id: 'usr_hiren_hv',
          name: 'Hiren Patel',
          email: 'hirenpatelhv@gmail.com',
          avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80',
          currentWorkspaceId: 'ws_team_dev_core',
          plan: 'enterprise',
          isSaaSUser: true,
          isSaaSAdmin: true,
          companyName: 'CloudPost SaaS Enterprise',
          roleTitle: 'Workspace Architect & SuperAdmin',
        }
      : {
          id: 'usr_' + Math.random().toString(36).substring(2, 9),
          name: tab === 'register' ? name : (email.split('@')[0] || 'Developer'),
          email: email,
          avatar: `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(email)}`,
          currentWorkspaceId: 'ws_personal_default',
          plan: 'enterprise',
          isSaaSUser: true,
          isSaaSAdmin: isSaaSAdmin({ email, roleTitle: 'Workspace Admin' } as any),
          companyName: 'CloudPost Enterprise Labs',
          roleTitle: 'Workspace Admin',
        };

    onLoginSuccess(newUser, migrateData);
    setIsSubmitting(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-zinc-900 border border-white/10 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-5 border-b border-white/10 flex items-center justify-between bg-zinc-950/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-orange-500 to-amber-600 flex items-center justify-center shadow-lg shadow-orange-500/20 text-white font-bold">
              <LogIn className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                {tab === 'login' ? 'Sign In to CloudPost' : 'Create an Account'}
              </h2>
              <p className="text-xs text-zinc-400">
                Unlock persistent workspace saving, environment sync, and team sharing.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-5 overflow-y-auto max-h-[80vh]">
          {/* Tab buttons */}
          <div className="flex p-1 bg-white/5 rounded-xl border border-white/10">
            <button
              type="button"
              onClick={() => setTab('login')}
              className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${
                tab === 'login'
                  ? 'bg-orange-500 text-white shadow-md'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => setTab('register')}
              className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${
                tab === 'register'
                  ? 'bg-orange-500 text-white shadow-md'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              Register New Account
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-300 text-xs">
                {error}
              </div>
            )}

            {tab === 'register' && (
              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                  Full Name
                </label>
                <div className="relative">
                  <UserIcon className="w-4 h-4 text-zinc-500 absolute left-3 top-3" />
                  <input
                    type="text"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="Alex Morgan"
                    className="w-full bg-zinc-950 border border-white/10 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-orange-500"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-zinc-500 absolute left-3 top-3" />
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="developer@company.com"
                  className="w-full bg-zinc-950 border border-white/10 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-orange-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-zinc-500 absolute left-3 top-3" />
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-zinc-950 border border-white/10 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-orange-500"
                />
              </div>
            </div>

            {hasGuestData && (
              <label className="flex items-center gap-2.5 p-3 rounded-xl bg-white/5 border border-white/10 cursor-pointer">
                <input
                  type="checkbox"
                  checked={migrateData}
                  onChange={e => setMigrateData(e.target.checked)}
                  className="w-4 h-4 rounded text-orange-500 focus:ring-0 focus:ring-offset-0 bg-zinc-950 border-white/20"
                />
                <span className="text-xs text-zinc-300">
                  Save current guest session requests & environment into this account
                </span>
              </label>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-2.5 bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-lg shadow-orange-500/20 transition-all flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <span>Authenticating...</span>
              ) : tab === 'login' ? (
                <>
                  <LogIn className="w-4 h-4" />
                  <span>Sign In & Enable Data Persistence</span>
                </>
              ) : (
                <>
                  <UserPlus className="w-4 h-4" />
                  <span>Create Account & Start Saving Data</span>
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
