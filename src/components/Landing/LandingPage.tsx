import React, { useState } from 'react';
import { 
  Send, 
  Zap, 
  Shield, 
  Database, 
  Server, 
  Code2, 
  Share2, 
  FolderGit2, 
  Layers, 
  CheckCircle2, 
  Sparkles, 
  ArrowRight, 
  Globe, 
  Lock, 
  Terminal, 
  FolderArchive, 
  Play, 
  Check, 
  Copy,
  Cpu,
  LogIn,
  UserCheck,
  Flame,
  FileCode,
  Monitor,
  Download,
  BookOpen,
  HelpCircle
} from 'lucide-react';
import { executeRequest } from '../../services/apiRunner';
import { ApiResponse } from '../../types';
import { APP_VERSION_DISPLAY } from '../../config';

interface LandingPageProps {
  onLaunchGuestMode: () => void;
  onOpenAuthModal: () => void;
  onOpenRegister?: () => void;
  onOpenPhpModal?: () => void;
  onOpenDownloadPage?: () => void;
  onOpenDocs?: () => void;
  onOpenHelpModal?: () => void;
  isAuthenticated: boolean;
  isSaaSUser?: boolean;
  currentUser: { name: string; email: string } | null;
  onLaunchAuthWorkspace: () => void;
}

const PRESET_APIS = [
  {
    name: 'Get Posts',
    method: 'GET' as const,
    url: 'https://jsonplaceholder.typicode.com/posts/1',
    body: '',
  },
  {
    name: 'Create User',
    method: 'POST' as const,
    url: 'https://jsonplaceholder.typicode.com/users',
    body: JSON.stringify({ name: 'Alex Rivera', username: 'alexr', email: 'alex@example.com' }, null, 2),
  },
  {
    name: 'HTTPBin Get',
    method: 'GET' as const,
    url: 'https://httpbin.org/get',
    body: '',
  },
  {
    name: 'ReqRes Users',
    method: 'GET' as const,
    url: 'https://reqres.in/api/users?page=1',
    body: '',
  },
];

export const LandingPage: React.FC<LandingPageProps> = ({
  onLaunchGuestMode,
  onOpenAuthModal,
  onOpenRegister,
  onOpenPhpModal,
  onOpenDownloadPage,
  onOpenDocs,
  onOpenHelpModal,
  isAuthenticated,
  isSaaSUser,
  currentUser,
  onLaunchAuthWorkspace,
}) => {
  // Live Playground State
  const [method, setMethod] = useState<'GET' | 'POST' | 'PUT' | 'DELETE'>('GET');
  const [url, setUrl] = useState('https://jsonplaceholder.typicode.com/posts/1');
  const [bodyText, setBodyText] = useState('');
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<ApiResponse | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);

  const handleSendQuickRequest = async () => {
    setLoading(true);
    try {
      const res = await executeRequest(
        {
          id: 'landing_quick_test',
          collectionId: 'col_landing',
          name: 'Quick Test',
          method: method,
          url: url,
          params: [],
          headers: [
            { id: 'h1', key: 'Content-Type', value: 'application/json', enabled: true },
          ],
          body: {
            type: bodyText ? 'json' : 'none',
            rawText: bodyText,
            rawType: 'application/json',
            formData: [],
            urlEncoded: [],
          },
          auth: { type: 'none' },
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        []
      );
      setResponse(res);
    } catch (err: any) {
      setResponse({
        status: 500,
        statusText: 'Request Error',
        time: 0,
        size: 0,
        headers: {},
        data: { error: err.message || 'Failed to execute request' },
        rawBody: JSON.stringify({ error: err.message || 'Failed to execute request' }),
        timestamp: new Date().toISOString(),
        testResults: [],
      });
    } finally {
      setLoading(false);
    }
  };

  const handleApplyPreset = (preset: typeof PRESET_APIS[0]) => {
    setMethod(preset.method);
    setUrl(preset.url);
    setBodyText(preset.body);
  };

  return (
    <div className="min-h-screen h-full w-full bg-zinc-950 text-zinc-100 flex flex-col overflow-y-auto selection:bg-orange-500/30 selection:text-orange-200">
      {/* 1. Top Navbar */}
      <nav className="min-h-[64px] py-3.5 border-b border-white/10 bg-zinc-950/90 backdrop-blur-xl px-4 sm:px-8 flex items-center justify-between sticky top-0 z-40 shrink-0">
        <div className="flex items-center gap-3 py-1 my-auto">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-orange-500 to-amber-600 flex items-center justify-center shadow-lg shadow-orange-500/25 shrink-0 my-0.5">
            <Send className="w-5 h-5 text-white -rotate-12" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-base tracking-tight bg-gradient-to-r from-white via-zinc-200 to-orange-400 bg-clip-text text-transparent">
                CloudPost
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-orange-500/20 text-orange-400 border border-orange-500/30 font-mono font-semibold">
                {APP_VERSION_DISPLAY}
              </span>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 sm:gap-3">
          {isSaaSUser && onOpenDocs && (
            <button
              onClick={onOpenDocs}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-800/80 hover:bg-zinc-700/80 border border-white/10 text-zinc-300 hover:text-white rounded-lg text-xs font-semibold transition-all cursor-pointer shadow-sm"
              title="Read Platform Documentation & User Manuals"
            >
              <BookOpen className="w-3.5 h-3.5 text-orange-400" />
              <span className="hidden sm:inline">Docs & Manual</span>
            </button>
          )}

          {onOpenHelpModal && (
            <button
              onClick={onOpenHelpModal}
              className="flex items-center justify-center w-8 h-8 bg-[#141824] hover:bg-white/10 border border-white/10 text-orange-400 hover:text-white rounded-lg text-xs font-bold transition-all cursor-pointer shadow-sm"
              title="How to use this tool"
              aria-label="User Guide"
            >
              <HelpCircle className="w-4 h-4 text-orange-400" />
            </button>
          )}

          {onOpenDownloadPage && (
            <button
              onClick={onOpenDownloadPage}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-orange-500/20 to-amber-500/20 hover:from-orange-500/30 hover:to-amber-500/30 border border-orange-500/40 text-orange-300 hover:text-white rounded-lg text-xs font-bold transition-all cursor-pointer shadow-sm"
              title="Download Desktop App for Windows, macOS, and Linux"
            >
              <Download className="w-3.5 h-3.5 text-orange-400" />
              <span>Download</span>
            </button>
          )}

          {isAuthenticated ? (
            <button
              onClick={onLaunchAuthWorkspace}
              className="flex items-center gap-1.5 px-4 py-1.5 bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white rounded-lg text-xs font-bold shadow-lg shadow-orange-500/20 transition-all cursor-pointer"
            >
              <UserCheck className="w-3.5 h-3.5" />
              <span>Workspace ({currentUser?.name.split(' ')[0]})</span>
            </button>
          ) : (
            <>
              <button
                onClick={onLaunchGuestMode}
                className="px-3.5 py-1.5 text-xs font-medium text-zinc-300 hover:text-white rounded-lg hover:bg-white/5 border border-white/10 transition-colors cursor-pointer"
              >
                Guest Mode
              </button>
              <button
                onClick={onOpenAuthModal}
                className="flex items-center gap-1.5 px-4 py-1.5 bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white rounded-lg text-xs font-bold shadow-lg shadow-orange-500/20 transition-all cursor-pointer"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Sign In</span>
              </button>
            </>
          )}
        </div>
      </nav>

      {/* 2. Hero Section */}
      <section className="relative pt-12 pb-16 px-4 sm:px-8 max-w-7xl mx-auto w-full flex flex-col items-center text-center">
        {/* Glow backdrop */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-orange-500/15 rounded-full blur-3xl pointer-events-none -z-10"></div>
        <div className="absolute top-1/3 left-1/3 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none -z-10"></div>

        {/* Main Headline */}
        <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white max-w-4xl leading-[1.15]">
          Build, Test & Collaborate on APIs with{' '}
          <span className="bg-gradient-to-r from-orange-400 via-amber-300 to-orange-500 bg-clip-text text-transparent">
            Speed & Precision
          </span>
        </h1>

        {/* Subtitle */}
        <p className="mt-5 text-sm sm:text-base text-zinc-400 max-w-2xl leading-relaxed">
          The collaborative API platform for engineering teams. Test REST, SSE streams, gRPC, and GraphQL endpoints instantly, organize collections, manage environments, and persist everything directly to your database.
        </p>

        {/* Primary Action Buttons */}
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3.5 w-full max-w-md sm:max-w-none">
          <button
            onClick={onLaunchGuestMode}
            className="w-full sm:w-auto px-6 py-3.5 bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white font-bold text-sm rounded-xl shadow-xl shadow-orange-500/25 transition-all flex items-center justify-center gap-2 group cursor-pointer"
          >
            <Zap className="w-4 h-4 text-amber-200 fill-amber-200" />
            <span>Launch Sandbox</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
          </button>

          {onOpenDownloadPage && (
            <button
              onClick={onOpenDownloadPage}
              className="w-full sm:w-auto px-6 py-3.5 bg-gradient-to-r from-orange-500/15 via-amber-500/15 to-orange-600/15 hover:from-orange-500/25 hover:via-amber-500/25 hover:to-orange-600/25 border border-orange-500/40 text-orange-300 hover:text-white font-bold text-sm rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg cursor-pointer"
            >
              <Download className="w-4 h-4 text-orange-400" />
              <span>Download Desktop Tool</span>
            </button>
          )}

          <button
            onClick={() => onOpenRegister ? onOpenRegister() : onOpenAuthModal()}
            className="w-full sm:w-auto px-6 py-3.5 bg-[#181e30] hover:bg-[#20273d] border border-orange-500/30 text-white font-bold text-sm rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg cursor-pointer"
          >
            <Sparkles className="w-4 h-4 text-orange-400" />
            <span>Register Free Account</span>
          </button>

          <button
            onClick={onOpenAuthModal}
            className="w-full sm:w-auto px-6 py-3.5 bg-white/5 hover:bg-white/10 border border-white/10 text-white font-semibold text-sm rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <Lock className="w-4 h-4 text-zinc-400" />
            <span>Sign In</span>
          </button>

          {isSaaSUser && onOpenDocs && (
            <button
              onClick={onOpenDocs}
              className="w-full sm:w-auto px-5 py-3.5 bg-zinc-900/90 hover:bg-zinc-800 border border-white/10 hover:border-orange-500/40 text-zinc-300 hover:text-white font-semibold text-sm rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg cursor-pointer"
            >
              <BookOpen className="w-4 h-4 text-orange-400" />
              <span>Docs & User Manuals</span>
            </button>
          )}

          {onOpenHelpModal && (
            <button
              onClick={onOpenHelpModal}
              className="w-full sm:w-auto px-5 py-3.5 bg-zinc-900/90 hover:bg-zinc-800 border border-white/10 hover:border-orange-500/40 text-zinc-300 hover:text-white font-semibold text-sm rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg cursor-pointer"
            >
              <HelpCircle className="w-4 h-4 text-orange-400" />
              <span>User Guide</span>
            </button>
          )}
        </div>

        {/* 3. Live Interactive Sandbox Hero Widget */}
        <div className="mt-12 w-full max-w-4xl bg-zinc-900/90 border border-white/10 rounded-2xl shadow-2xl overflow-hidden text-left flex flex-col backdrop-blur">
          {/* Playground Top Bar */}
          <div className="p-3.5 sm:p-4 border-b border-white/10 bg-zinc-950/60 flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <span className="flex h-3 w-3 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
              </span>
              <span className="text-xs font-bold text-white uppercase tracking-wider">
                Live Interactive API Sandbox
              </span>
              <span className="text-[11px] text-zinc-400 hidden sm:inline">
                (Test any endpoint right now without signing up)
              </span>
            </div>

            {/* Presets */}
            <div className="flex items-center gap-1.5 overflow-x-auto">
              <span className="text-[11px] text-zinc-500 font-medium mr-1">Presets:</span>
              {PRESET_APIS.map(p => (
                <button
                  key={p.name}
                  onClick={() => handleApplyPreset(p)}
                  className="px-2 py-1 rounded-md text-[11px] bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white border border-white/10 transition-colors whitespace-nowrap"
                >
                  {p.name}
                </button>
              ))}
            </div>
          </div>

          {/* URL & Method Input Bar */}
          <div className="p-3 sm:p-4 border-b border-white/10 bg-zinc-900/40 flex items-center gap-2">
            <select
              value={method}
              onChange={e => setMethod(e.target.value as any)}
              className="bg-zinc-950 border border-white/10 text-orange-400 font-bold text-xs rounded-xl px-3 py-2.5 focus:outline-none focus:border-orange-500 font-mono"
            >
              <option value="GET">GET</option>
              <option value="POST">POST</option>
              <option value="PUT">PUT</option>
              <option value="DELETE">DELETE</option>
            </select>

            <div className="relative flex-1">
              <input
                type="text"
                value={url}
                onChange={e => setUrl(e.target.value)}
                placeholder="https://api.example.com/endpoint"
                className="w-full bg-zinc-950 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-orange-500 font-mono"
              />
            </div>

            <button
              onClick={handleSendQuickRequest}
              disabled={loading}
              className="px-5 py-2.5 bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white text-xs font-bold rounded-xl shadow-lg shadow-orange-500/20 flex items-center gap-2 transition-all disabled:opacity-50"
            >
              {loading ? (
                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <Send className="w-3.5 h-3.5" />
              )}
              <span>{loading ? 'Sending...' : 'Send'}</span>
            </button>
          </div>

          {/* Optional JSON Body (if POST/PUT) */}
          {(method === 'POST' || method === 'PUT') && (
            <div className="p-3 border-b border-white/10 bg-zinc-950/40">
              <div className="text-[11px] text-zinc-400 font-mono mb-1.5">JSON Payload Body:</div>
              <textarea
                value={bodyText}
                onChange={e => setBodyText(e.target.value)}
                placeholder='{\n  "title": "New Article",\n  "body": "Content here"\n}'
                rows={3}
                className="w-full bg-zinc-950 border border-white/10 rounded-lg p-2 text-xs text-emerald-300 font-mono focus:outline-none focus:border-orange-500"
              />
            </div>
          )}

          {/* Response Output Area */}
          <div className="h-64 sm:h-72 overflow-hidden flex flex-col bg-zinc-950">
            {/* Status Header */}
            <div className="px-4 py-2 border-b border-white/10 bg-zinc-900/30 flex items-center justify-between text-xs font-mono">
              <div className="flex items-center gap-3">
                <span className="text-zinc-400 text-[11px] uppercase font-semibold">Response:</span>
                {response ? (
                  <span
                    className={`px-2 py-0.5 rounded text-xs font-bold ${
                      response.status >= 200 && response.status < 300
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                    }`}
                  >
                    {response.status} {response.statusText}
                  </span>
                ) : (
                  <span className="text-zinc-500 text-[11px]">Ready to execute</span>
                )}
              </div>

              {response && (
                <div className="flex items-center gap-4 text-zinc-400 text-[11px]">
                  <span>Time: <strong className="text-zinc-200">{response.time} ms</strong></span>
                  <span>Size: <strong className="text-zinc-200">{(response.size / 1024).toFixed(2)} KB</strong></span>
                </div>
              )}
            </div>

            {/* Body View */}
            <div className="flex-1 p-4 overflow-auto font-mono text-xs text-emerald-300/90 bg-zinc-950/80">
              {response ? (
                <pre className="whitespace-pre">
                  {typeof response.data === 'string'
                    ? response.data
                    : JSON.stringify(response.data, null, 2)}
                </pre>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-zinc-500 space-y-2">
                  <Play className="w-8 h-8 text-zinc-600" />
                  <p className="text-xs">Click <strong>"Send"</strong> above to test this request in real-time.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* 4. Comparison Section: Guest Mode vs Logged In Mode */}
      <section className="py-16 px-4 sm:px-8 border-t border-white/10 bg-zinc-900/30">
        <div className="max-w-6xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <span className="text-xs font-bold text-orange-400 uppercase tracking-wider">Access Modes</span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white mt-1">
              Choose How You Want to Work
            </h2>
            <p className="text-xs sm:text-sm text-zinc-400 mt-2">
              CloudPost gives you complete flexibility — zero-login transient scratchpad or persistent cloud team syncing.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Mode 1: Guest Mode */}
            <div className="bg-zinc-900/70 border border-amber-500/30 rounded-2xl p-6 relative overflow-hidden flex flex-col justify-between shadow-xl">
              <div className="absolute top-0 right-0 p-4">
                <span className="px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-500/10 text-amber-300 border border-amber-500/20">
                  Quick Access
                </span>
              </div>

              <div>
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 mb-4">
                  <Zap className="w-5 h-5" />
                </div>
                <h3 className="text-lg font-bold text-white mb-2">Guest Mode</h3>
                <p className="text-xs text-zinc-400 mb-6 leading-relaxed">
                  Open and test immediately with zero barriers. Ideal for quick debugging and temporary experiments.
                </p>

                <ul className="space-y-3 text-xs text-zinc-300 mb-6">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0" />
                    <span><strong>Private Session:</strong> Leaves no trace on your computer</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0" />
                    <span><strong>Instant Access:</strong> No account or login required</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0" />
                    <span><strong>Full Request Builder:</strong> Headers, Params, JSON Body, Auth</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0" />
                    <span><strong>Code Generation:</strong> cURL, Python, PHP, JS, Go</span>
                  </li>
                </ul>
              </div>

              <button
                onClick={onLaunchGuestMode}
                className="w-full py-3 bg-white/5 hover:bg-white/10 border border-amber-500/30 hover:border-amber-400 text-amber-300 hover:text-white font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-2"
              >
                <span>Launch Guest Mode</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Mode 2: Logged In Mode */}
            <div className="bg-zinc-900/70 border border-orange-500/40 rounded-2xl p-6 relative overflow-hidden flex flex-col justify-between shadow-xl">
              <div className="absolute top-0 right-0 p-4">
                <span className="px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-orange-500/20 text-orange-300 border border-orange-500/30">
                  Cloud Sync
                </span>
              </div>

              <div>
                <div className="w-10 h-10 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-orange-400 mb-4">
                  <Database className="w-5 h-5" />
                </div>
                <h3 className="text-lg font-bold text-white mb-2">Team Account</h3>
                <p className="text-xs text-zinc-400 mb-6 leading-relaxed">
                  Persistent workspace storage. Keep all your collections organized across sessions and collaborate with team members.
                </p>

                <ul className="space-y-3 text-xs text-zinc-300 mb-6">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span><strong>Auto-Save:</strong> Collections, history & environments saved</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span><strong>Workspaces:</strong> Personal sandbox and team workspaces</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span><strong>Role Access:</strong> Admin, Editor, and Viewer permissions</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span><strong>Postman Import/Export:</strong> v2.1 collection format</span>
                  </li>
                </ul>
              </div>

              <button
                onClick={onOpenAuthModal}
                className="w-full py-3 bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white font-bold text-xs rounded-xl shadow-lg shadow-orange-500/20 transition-all flex items-center justify-center gap-2"
              >
                <span>Sign In / Create Account</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* 5. MySQL Database Persistence Architecture Showcase */}
      <section className="py-16 px-4 sm:px-8 border-t border-white/10 bg-gradient-to-b from-zinc-950 via-emerald-950/15 to-zinc-950">
        <div className="max-w-6xl mx-auto flex flex-col lg:flex-row items-center justify-between gap-10">
          <div className="lg:w-1/2 space-y-4 text-left">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-300 font-semibold">
              <Database className="w-3.5 h-3.5 text-emerald-400" />
              <span>Direct Database Persistence</span>
            </div>

            <h2 className="text-2xl sm:text-4xl font-extrabold text-white leading-tight">
              Everything Persisted in MySQL Database
            </h2>

            <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed">
              All workspaces, hierarchical folders, requests, environment variables, authorization headers, recent request history, and activity logs are automatically synchronized and persisted directly into your MySQL database.
            </p>

            <div className="grid grid-cols-2 gap-3 pt-2 text-xs text-zinc-300">
              <div className="p-3 bg-white/5 border border-white/10 rounded-xl">
                <div className="font-bold text-white mb-1">Storage Engine</div>
                <div className="text-emerald-400 font-mono text-[11px]">MySQL 8.x / InnoDB</div>
              </div>
              <div className="p-3 bg-white/5 border border-white/10 rounded-xl">
                <div className="font-bold text-white mb-1">Storage Tables</div>
                <div className="text-emerald-400 font-mono text-[11px]">cp_app_state, cp_users</div>
              </div>
            </div>

            <div className="pt-2">
              <button
                onClick={onLaunchGuestMode}
                className="px-6 py-3.5 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-bold text-xs rounded-xl shadow-lg shadow-emerald-500/25 flex items-center gap-2 transition-all"
              >
                <Database className="w-4 h-4" />
                <span>Open API Studio</span>
              </button>
            </div>
          </div>

          <div className="lg:w-1/2 w-full bg-zinc-900 border border-white/10 rounded-2xl p-4 font-mono text-xs text-emerald-300/90 shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between border-b border-white/10 pb-2 mb-3 text-zinc-400 text-[11px]">
              <span className="font-bold text-white">Database Schema Architecture</span>
              <span className="text-emerald-400 font-semibold">MySQL 8.x / InnoDB</span>
            </div>
            <pre className="overflow-x-auto text-[11px] leading-relaxed text-emerald-200">
{`-- Workspaces & State Table
CREATE TABLE cp_app_state (
  user_id VARCHAR(64) PRIMARY KEY,
  workspaces_json LONGTEXT,
  collections_json LONGTEXT,
  environments_json LONGTEXT,
  activity_logs_json LONGTEXT,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP 
    ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Registered Users Table
CREATE TABLE cp_users (
  id VARCHAR(64) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`}
            </pre>
          </div>
        </div>
      </section>

      {/* 6. Feature Grid */}
      <section className="py-16 px-4 sm:px-8 border-t border-white/10 bg-zinc-950">
        <div className="max-w-6xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <span className="text-xs font-bold text-orange-400 uppercase tracking-wider">Features</span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white mt-1">
              Everything Needed for API Craftsmanship
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="p-5 rounded-2xl bg-zinc-900/50 border border-white/10 hover:border-orange-500/40 transition-colors">
              <div className="w-9 h-9 rounded-lg bg-orange-500/10 text-orange-400 flex items-center justify-center mb-3">
                <Send className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-bold text-white mb-1">Dynamic Request Builder</h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Full support for Query Params, Custom Headers, Bearer/Basic Auth, Form-Data, Url-Encoded, and JSON payloads.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-zinc-900/50 border border-white/10 hover:border-orange-500/40 transition-colors">
              <div className="w-9 h-9 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center mb-3">
                <Code2 className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-bold text-white mb-1">Multi-Language Code Export</h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Export any request or entire collection into pure PHP cURL, Python requests, JavaScript Fetch, Axios, Go, Java, or C#.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-zinc-900/50 border border-white/10 hover:border-orange-500/40 transition-colors">
              <div className="w-9 h-9 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center mb-3">
                <Layers className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-bold text-white mb-1">Scoped Environment Variables</h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Define and resolve variables like <code className="text-orange-300">{"{{baseUrl}}"}</code> across Global, Environment, Collection, and Request scopes.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-zinc-900/50 border border-white/10 hover:border-orange-500/40 transition-colors">
              <div className="w-9 h-9 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center mb-3">
                <Share2 className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-bold text-white mb-1">Postman v2.1 Import & Export</h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Seamlessly import or export Postman collections, environments, and full backup snapshots.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-zinc-900/50 border border-white/10 hover:border-orange-500/40 transition-colors">
              <div className="w-9 h-9 rounded-lg bg-purple-500/10 text-purple-400 flex items-center justify-center mb-3">
                <FolderGit2 className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-bold text-white mb-1">Team & Personal Workspaces</h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Isolate private prototyping from shared team engineering with Role-Based Access Controls (Admin, Editor, Viewer).
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-zinc-900/50 border border-white/10 hover:border-orange-500/40 transition-colors">
              <div className="w-9 h-9 rounded-lg bg-rose-500/10 text-rose-400 flex items-center justify-center mb-3">
                <Cpu className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-bold text-white mb-1">D3 Graph & JSON Tree Visualizer</h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Explore large JSON payloads with interactive folding, search filtering, and node graph visualizations.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 7. Footer */}
      <footer className="py-8 px-4 sm:px-8 border-t border-white/10 bg-zinc-950 text-xs text-zinc-500 flex flex-col sm:flex-row items-center justify-between gap-4 max-w-7xl mx-auto w-full">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded bg-orange-500 flex items-center justify-center text-white">
            <Send className="w-3 h-3" />
          </div>
          <span className="font-bold text-zinc-300">CloudPost API Studio</span>
          <span>— Collaborative API Platform</span>
        </div>

        <div className="flex items-center gap-4 text-[11px]">
          <button onClick={onLaunchGuestMode} className="hover:text-zinc-300">Guest Sandbox</button>
          <button onClick={onOpenAuthModal} className="hover:text-zinc-300">Sign In</button>
          <button onClick={onOpenPhpModal} className="hover:text-zinc-300">PHP Shared Hosting</button>
        </div>
      </footer>
    </div>
  );
};
