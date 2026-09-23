import React, { useState } from 'react';
import { 
  BookOpen, 
  Monitor, 
  Globe, 
  Server, 
  Database, 
  Code2, 
  Layers, 
  ShieldCheck, 
  Cpu, 
  Key, 
  Download, 
  Terminal, 
  CheckCircle2, 
  Copy, 
  Check, 
  ChevronRight, 
  FileText, 
  Zap, 
  Search, 
  ExternalLink,
  HelpCircle,
  FolderGit2,
  RefreshCw,
  GitCompare,
  Activity,
  Users,
  Radio,
  Share2,
  Lock,
  Tag
} from 'lucide-react';
import { Collection, ApiRequest, Variable } from '../../types';
import { CollectionDocsViewer } from './CollectionDocsViewer';
import { APP_VERSION, APP_VERSION_DISPLAY } from '../../config';
import { isDesktopTool } from '../../services/platformService';
import { SaaSExclusivityGate } from '../SaaS/SaaSExclusivityGate';

interface AppDocsAndManualsProps {
  collections: Collection[];
  activeCollectionId?: string;
  variables?: Variable[];
  onOpenRequestInStudio?: (req: ApiRequest) => void;
  onOpenDownloadModal?: () => void;
  isSaaSUser?: boolean;
  onOpenAuthModal?: () => void;
  onOpenRegister?: (plan?: any) => void;
}

type MainSection = 'manuals' | 'architecture' | 'versioning' | 'collection_api';

export const AppDocsAndManuals: React.FC<AppDocsAndManualsProps> = ({
  collections,
  activeCollectionId,
  variables = [],
  onOpenRequestInStudio,
  onOpenDownloadModal,
  isSaaSUser,
  onOpenAuthModal,
  onOpenRegister,
}) => {
  const [activeSection, setActiveSection] = useState<MainSection>('manuals');
  const [activeManualChapter, setActiveManualChapter] = useState<string>('quickstart');
  const [activeArchChapter, setActiveArchChapter] = useState<string>('overview');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [copiedSnippet, setCopiedSnippet] = useState<string | null>(null);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSnippet(id);
    setTimeout(() => setCopiedSnippet(null), 2000);
  };

  const manualChapters = [
    { id: 'quickstart', title: '1. Quickstart & Getting Started', icon: Zap },
    { id: 'desktop_app', title: '2. Desktop App (Win, Mac, Linux)', icon: Monitor },
    { id: 'web_pwa', title: '3. Web App & Offline PWA', icon: Globe },
    { id: 'php_hosting', title: '4. PHP Shared Hosting (cPanel / Hostinger)', icon: Server },
    { id: 'multi_protocol', title: '5. Multi-Protocol API Studio', icon: Radio },
    { id: 'variables_scripts', title: '6. Variables & Postman pm.* Scripts', icon: Code2 },
    { id: 'import_export', title: '7. Postman v2.1 Import & Export', icon: RefreshCw },
    { id: 'collaboration_saas', title: '8. Collaboration & SaaS Metering', icon: Users },
  ];

  const archChapters = [
    { id: 'overview', title: 'System Topology & Multi-App Design', icon: Layers },
    { id: 'versioning_guide', title: 'Central Versioning Guide (Where to Set)', icon: Tag },
    { id: 'db_optimization', title: 'Database & High-Performance Indexing', icon: Database },
    { id: 'security_clean_urls', title: 'Clean URLs & Status-Bar Concealment', icon: ShieldCheck },
    { id: 'internal_apis', title: 'Internal Server REST API Reference', icon: Terminal },
  ];

  return (
    <div className="h-full flex flex-col bg-[#0f111a] text-zinc-200 overflow-hidden select-none">
      {/* Top Header Bar */}
      <div className="h-14 border-b border-white/10 bg-[#0d0f17] px-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-orange-500 to-amber-600 flex items-center justify-center text-white shadow-md shadow-orange-500/20">
            <BookOpen className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-bold text-white tracking-tight">CloudPost Documentation & User Manuals</h1>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-orange-500/20 text-orange-400 border border-orange-500/30 font-mono font-semibold">
                {APP_VERSION_DISPLAY}
              </span>
            </div>
            <p className="text-[11px] text-zinc-400">Complete documentation, step-by-step user guides, and technical architecture for all apps.</p>
          </div>
        </div>

        {/* Section Navigation Pills */}
        <div className="flex items-center gap-1.5 bg-zinc-900/80 p-1 rounded-xl border border-white/5">
          <button
            onClick={() => setActiveSection('manuals')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              activeSection === 'manuals'
                ? 'bg-orange-500 text-white shadow-sm font-semibold'
                : 'text-zinc-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>User Manuals</span>
          </button>

          <button
            onClick={() => setActiveSection('architecture')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              activeSection === 'architecture'
                ? 'bg-orange-500 text-white shadow-sm font-semibold'
                : 'text-zinc-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Cpu className="w-3.5 h-3.5" />
            <span>Architecture & Specs</span>
          </button>

          <button
            onClick={() => setActiveSection('versioning')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              activeSection === 'versioning'
                ? 'bg-orange-500 text-white shadow-sm font-semibold'
                : 'text-zinc-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Tag className="w-3.5 h-3.5" />
            <span>Version Setting Guide</span>
          </button>

          <button
            onClick={() => setActiveSection('collection_api')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              activeSection === 'collection_api'
                ? 'bg-orange-500 text-white shadow-sm font-semibold'
                : 'text-zinc-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Code2 className="w-3.5 h-3.5" />
            <span>Collection API Docs</span>
          </button>
        </div>
      </div>

      {/* Main Body */}
      <div className="flex-1 flex overflow-hidden">
        {/* If Collection API Docs tab is selected, render CollectionDocsViewer directly */}
        {activeSection === 'collection_api' ? (
          <div className="flex-1 overflow-hidden">
            <CollectionDocsViewer
              collections={collections}
              activeCollectionId={activeCollectionId}
              variables={variables}
              onOpenRequestInStudio={onOpenRequestInStudio}
            />
          </div>
        ) : (
          <>
            {/* Sidebar Chapter Navigator */}
            <aside className="w-72 bg-[#0c0e15] border-r border-white/10 flex flex-col shrink-0">
              <div className="p-3 border-b border-white/10">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-zinc-500" />
                  <input
                    type="text"
                    placeholder="Search docs & manuals..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 bg-zinc-900 border border-zinc-800 rounded-lg text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-orange-500"
                  />
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-2 space-y-1">
                {activeSection === 'manuals' && (
                  <>
                    <div className="px-2 py-1.5 text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                      User Manual Chapters
                    </div>
                    {manualChapters
                      .filter(ch => !searchQuery || ch.title.toLowerCase().includes(searchQuery.toLowerCase()))
                      .map(ch => {
                        const Icon = ch.icon;
                        const isActive = activeManualChapter === ch.id;
                        return (
                          <button
                            key={ch.id}
                            onClick={() => setActiveManualChapter(ch.id)}
                            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs transition-all text-left ${
                              isActive
                                ? 'bg-orange-500/20 text-orange-300 font-semibold border border-orange-500/30'
                                : 'text-zinc-400 hover:text-white hover:bg-white/5'
                            }`}
                          >
                            <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-orange-400' : 'text-zinc-500'}`} />
                            <span className="truncate">{ch.title}</span>
                          </button>
                        );
                      })}
                  </>
                )}

                {activeSection === 'architecture' && (
                  <>
                    <div className="px-2 py-1.5 text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                      Technical Architecture Specs
                    </div>
                    {archChapters
                      .filter(ch => !searchQuery || ch.title.toLowerCase().includes(searchQuery.toLowerCase()))
                      .map(ch => {
                        const Icon = ch.icon;
                        const isActive = activeArchChapter === ch.id;
                        return (
                          <button
                            key={ch.id}
                            onClick={() => setActiveArchChapter(ch.id)}
                            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs transition-all text-left ${
                              isActive
                                ? 'bg-orange-500/20 text-orange-300 font-semibold border border-orange-500/30'
                                : 'text-zinc-400 hover:text-white hover:bg-white/5'
                            }`}
                          >
                            <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-orange-400' : 'text-zinc-500'}`} />
                            <span className="truncate">{ch.title}</span>
                          </button>
                        );
                      })}
                  </>
                )}

                {activeSection === 'versioning' && (
                  <>
                    <div className="px-2 py-1.5 text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                      Central Version Control
                    </div>
                    <div className="p-3 bg-zinc-900/60 rounded-lg border border-white/5 text-xs text-zinc-400 space-y-2">
                      <div className="flex items-center gap-1.5 text-orange-400 font-semibold">
                        <Tag className="w-3.5 h-3.5" />
                        <span>Unified Version: {APP_VERSION}</span>
                      </div>
                      <p className="text-[11px] leading-relaxed">
                        CloudPost enforces a strict single-version policy across the React Web SPA, Desktop Tool, PHP Engine, and Express backend.
                      </p>
                    </div>
                  </>
                )}
              </div>

              {/* Version & Platform Footer */}
              <div className="p-3 border-t border-white/10 bg-[#090b10] text-[11px] text-zinc-500 flex items-center justify-between">
                <span>Active Version: <strong className="text-zinc-300 font-mono">{APP_VERSION}</strong></span>
                <span className="px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 font-mono text-[10px]">
                  {isDesktopTool() ? 'Desktop Native' : 'Web/PWA'}
                </span>
              </div>
            </aside>

            {/* Content Area */}
            <main className="flex-1 overflow-y-auto p-6 md:p-8 space-y-8 max-w-5xl">
              {/* SECTION: USER MANUALS */}
              {activeSection === 'manuals' && (
                <div>
                  {activeManualChapter === 'quickstart' && (
                    <article className="space-y-6">
                      <div className="border-b border-white/10 pb-4">
                        <h2 className="text-2xl font-black text-white flex items-center gap-2.5">
                          <Zap className="w-6 h-6 text-orange-400" />
                          Chapter 1: Quickstart & Getting Started
                        </h2>
                        <p className="text-zinc-400 text-sm mt-1">
                          Everything you need to send your first API request, organize collections, and manage variables.
                        </p>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="p-4 bg-zinc-900/60 border border-white/10 rounded-xl space-y-2">
                          <div className="text-orange-400 font-bold text-xs uppercase tracking-wider">Step 1</div>
                          <h3 className="text-base font-bold text-white">Create a Request</h3>
                          <p className="text-xs text-zinc-400">
                            Click the <strong>+</strong> tab button or <strong>New Request</strong> in the sidebar. Choose your HTTP method (GET, POST, PUT, DELETE) and type your target URL.
                          </p>
                        </div>
                        <div className="p-4 bg-zinc-900/60 border border-white/10 rounded-xl space-y-2">
                          <div className="text-orange-400 font-bold text-xs uppercase tracking-wider">Step 2</div>
                          <h3 className="text-base font-bold text-white">Configure Payload</h3>
                          <p className="text-xs text-zinc-400">
                            Add Headers, Query Parameters, or JSON body content. Use variables like <code className="text-orange-300 font-mono">&#123;&#123;baseUrl&#125;&#125;</code> for flexible switching.
                          </p>
                        </div>
                        <div className="p-4 bg-zinc-900/60 border border-white/10 rounded-xl space-y-2">
                          <div className="text-orange-400 font-bold text-xs uppercase tracking-wider">Step 3</div>
                          <h3 className="text-base font-bold text-white">Execute & Inspect</h3>
                          <p className="text-xs text-zinc-400">
                            Press <strong>Send (Ctrl+Enter)</strong>. View formatted JSON, response headers, status codes, latency timings, and test assertion results.
                          </p>
                        </div>
                      </div>

                      <div className="p-4 bg-zinc-950 border border-zinc-800 rounded-xl space-y-3">
                        <h4 className="text-sm font-bold text-zinc-200">Guest Sandboxing & Persistence</h4>
                        <p className="text-xs text-zinc-400 leading-relaxed">
                          CloudPost provides instant isolated Guest sessions without forcing you to sign up or authenticate. Every guest session operates with a private, unique guest ID and 6-digit shortcode. When you are ready, one click seamlessly migrates all your local collections and requests to a permanent user account.
                        </p>
                      </div>
                    </article>
                  )}

                  {activeManualChapter === 'desktop_app' && (
                    <article className="space-y-6">
                      <div className="border-b border-white/10 pb-4">
                        <h2 className="text-2xl font-black text-white flex items-center gap-2.5">
                          <Monitor className="w-6 h-6 text-cyan-400" />
                          Chapter 2: Desktop Application Manual (Windows, macOS, Linux)
                        </h2>
                        <p className="text-zinc-400 text-sm mt-1">
                          Native performance, zero CORS restrictions, unlimited request throughput, and background auto-updating.
                        </p>
                      </div>

                      <div className="space-y-4">
                        <div className="p-4 bg-cyan-500/10 border border-cyan-500/25 rounded-xl space-y-2">
                          <div className="flex items-center gap-2 text-cyan-300 font-bold text-sm">
                            <CheckCircle2 className="w-4 h-4 text-cyan-400" />
                            Why Use the Desktop App?
                          </div>
                          <ul className="text-xs text-zinc-300 space-y-1.5 list-disc list-inside">
                            <li><strong>Zero CORS Restrictions:</strong> Web browsers enforce strict Cross-Origin Resource Sharing. The desktop app executes HTTP requests through native Node.js sockets, connecting directly to localhost, intranet, or third-party APIs without proxy latency.</li>
                            <li><strong>Direct Socket Performance:</strong> No proxy delays, native TCP socket pooling, and low-latency API execution.</li>
                            <li><strong>Direct File System Access:</strong> Seamless native open/save dialogs for Postman v2.1 collections and exports.</li>
                            <li><strong>Startup Auto-Updater:</strong> Automatically queries the SaaS release server on startup to verify integrity and prompt for verified upgrades while strictly blocking downgrades.</li>
                          </ul>
                        </div>

                        <h3 className="text-base font-bold text-white mt-4">Desktop Keyboard Shortcuts</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                          <div className="p-3 bg-zinc-900 border border-zinc-800 rounded-lg flex items-center justify-between">
                            <span className="text-zinc-400">Send Request</span>
                            <kbd className="px-2 py-1 bg-zinc-800 border border-zinc-700 rounded text-[11px] font-mono text-zinc-200">Ctrl + Enter / ⌘ + Enter</kbd>
                          </div>
                          <div className="p-3 bg-zinc-900 border border-zinc-800 rounded-lg flex items-center justify-between">
                            <span className="text-zinc-400">New Request Tab</span>
                            <kbd className="px-2 py-1 bg-zinc-800 border border-zinc-700 rounded text-[11px] font-mono text-zinc-200">Ctrl + T / ⌘ + T</kbd>
                          </div>
                          <div className="p-3 bg-zinc-900 border border-zinc-800 rounded-lg flex items-center justify-between">
                            <span className="text-zinc-400">Save Request</span>
                            <kbd className="px-2 py-1 bg-zinc-800 border border-zinc-700 rounded text-[11px] font-mono text-zinc-200">Ctrl + S / ⌘ + S</kbd>
                          </div>
                          <div className="p-3 bg-zinc-900 border border-zinc-800 rounded-lg flex items-center justify-between">
                            <span className="text-zinc-400">Check for Updates</span>
                            <span className="text-zinc-300 font-mono">Menu → CloudPost → Check for Updates</span>
                          </div>
                        </div>

                        {/* macOS Build Instructions */}
                        <div className="p-4 bg-zinc-900/80 border border-white/10 rounded-xl space-y-3 mt-4">
                          <h4 className="text-sm font-bold text-white flex items-center gap-2">
                            <Terminal className="w-4 h-4 text-orange-400" />
                            How to Build CloudPost for macOS (DMG & ZIP)
                          </h4>
                          <p className="text-xs text-zinc-400">
                            You can compile native macOS binaries for Apple Silicon (M1/M2/M3/M4) or Intel (x64) directly using the configured npm scripts:
                          </p>
                          <div className="space-y-2 text-xs font-mono">
                            <div className="p-2.5 bg-black/60 border border-white/10 rounded-lg text-emerald-400 select-all">
                              npm run build:mac
                            </div>
                            <p className="text-[11px] text-zinc-500 font-sans">
                              Compiles both Apple Silicon (<code className="text-orange-300">arm64</code>) and Intel (<code className="text-orange-300">x64</code>) DMG installers and ZIP archives in <code className="text-zinc-300">dist_desktop/</code>.
                            </p>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 text-[11px] font-mono">
                            <div className="p-2 bg-black/40 border border-white/5 rounded">
                              <span className="text-zinc-400 block text-[10px] font-sans">Apple Silicon only:</span>
                              <span className="text-orange-300">npm run build:mac:arm</span>
                            </div>
                            <div className="p-2 bg-black/40 border border-white/5 rounded">
                              <span className="text-zinc-400 block text-[10px] font-sans">Intel Macs only:</span>
                              <span className="text-orange-300">npm run build:mac:intel</span>
                            </div>
                            <div className="p-2 bg-black/40 border border-white/5 rounded">
                              <span className="text-zinc-400 block text-[10px] font-sans">Universal Binary:</span>
                              <span className="text-orange-300">npm run build:mac:universal</span>
                            </div>
                          </div>
                          <div className="p-2.5 bg-amber-500/10 border border-amber-500/20 rounded-lg text-[11px] text-amber-300 font-sans">
                            <strong>Note on macOS Gatekeeper:</strong> If opening an unsigned local build on macOS, right-click the app in Finder and choose <em>Open</em>, or run <code className="font-mono bg-black/40 px-1 py-0.5 rounded text-white">xattr -cr /Applications/CloudPost.app</code> in Terminal to remove the quarantine flag.
                          </div>

                          {/* Building for Mac from Windows Guide */}
                          <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg text-[11px] text-blue-200 font-sans space-y-2">
                            <div className="font-bold text-white flex items-center gap-1.5">
                              <Monitor className="w-3.5 h-3.5 text-blue-400" />
                              <span>Building for macOS from a Windows Machine:</span>
                            </div>
                            <p className="text-zinc-300">
                              Direct <code className="text-orange-300 font-mono">.dmg</code> disk images require Apple-specific utilities, but you can build for Mac from Windows using either:
                            </p>
                            <ul className="list-disc list-inside space-y-1 text-zinc-400 pl-1">
                              <li>
                                <strong className="text-white">GitHub Actions (Included Free):</strong> Push or export your project to GitHub. The included <code className="text-orange-300 font-mono">.github/workflows/build-desktop.yml</code> automatically builds official Apple Silicon & Intel DMG installers on macOS cloud runners.
                              </li>
                              <li>
                                <strong className="text-white">Local Mac ZIP Archive:</strong> Run <code className="text-emerald-400 font-mono">npm run build:mac:zip</code> on Windows to output a cross-platform <code className="text-zinc-300 font-mono">CloudPost.app.zip</code> archive that unzips and runs directly on macOS.
                              </li>
                            </ul>
                          </div>

                          {/* Windows Defender SmartScreen & Publisher Note */}
                          <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg text-[11px] text-blue-200 font-sans space-y-2">
                            <div className="font-bold text-white flex items-center justify-between">
                              <span className="flex items-center gap-1.5">
                                <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
                                <span>Windows Defender SmartScreen & Publisher Information:</span>
                              </span>
                              <span className="font-mono text-[10px] bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded">
                                Publisher: Tech Vision Studio
                              </span>
                            </div>
                            <p className="text-zinc-300">
                              When launching the Windows installer or portable binary on a fresh machine, Microsoft Defender SmartScreen may display <em>"Windows protected your PC"</em>.
                            </p>
                            <div className="flex flex-wrap items-center gap-2 text-zinc-300 bg-black/40 p-2 rounded">
                              <span className="text-white font-semibold">To launch:</span>
                              <span>1. Click <u>"More info"</u></span>
                              <span className="text-zinc-500">→</span>
                              <span>2. Verify publisher is <strong className="text-amber-300">Tech Vision Studio</strong></span>
                              <span className="text-zinc-500">→</span>
                              <span>3. Click <strong className="text-emerald-400">"Run anyway"</strong></span>
                            </div>
                          </div>
                        </div>

                        {onOpenDownloadModal && (
                          <div className="pt-2">
                            <button
                              onClick={onOpenDownloadModal}
                              className="px-4 py-2 bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white rounded-lg text-xs font-bold transition-all shadow-md flex items-center gap-2 cursor-pointer"
                            >
                              <Download className="w-4 h-4" />
                              <span>Download CloudPost Desktop App</span>
                            </button>
                          </div>
                        )}
                      </div>
                    </article>
                  )}

                  {activeManualChapter === 'web_pwa' && (
                    <article className="space-y-6">
                      <div className="border-b border-white/10 pb-4">
                        <h2 className="text-2xl font-black text-white flex items-center gap-2.5">
                          <Globe className="w-6 h-6 text-emerald-400" />
                          Chapter 3: Web Application & Offline PWA Manual
                        </h2>
                        <p className="text-zinc-400 text-sm mt-1">
                          Run anywhere in modern web browsers with offline caching, service worker synchronization, and PWA installation.
                        </p>
                      </div>

                      <div className="space-y-4 text-xs text-zinc-300 leading-relaxed">
                        <p>
                          The Web App operates at <strong>https://cloudpost.techvisionstudio.in</strong>. It is built as a Progressive Web App (PWA) with a background Service Worker (<code className="text-orange-400">sw.js</code>) that caches assets for instant cold-starts and offline accessibility.
                        </p>

                        <div className="p-4 bg-zinc-900 border border-zinc-800 rounded-xl space-y-3">
                          <h4 className="text-sm font-bold text-white flex items-center gap-2">
                            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                            How to Install as a Desktop / Mobile PWA:
                          </h4>
                          <ol className="list-decimal list-inside space-y-1.5 text-zinc-400">
                            <li>Open CloudPost in Google Chrome, Microsoft Edge, Brave, or Safari.</li>
                            <li>Look at the URL bar and click the <strong>Install App</strong> icon (or menu → <em>Add to Home Screen</em> on mobile).</li>
                            <li>CloudPost launches in its own dedicated, chromeless application window with desktop taskbar integration.</li>
                          </ol>
                        </div>
                      </div>
                    </article>
                  )}

                  {activeManualChapter === 'php_hosting' && (
                    <article className="space-y-6">
                      <div className="border-b border-white/10 pb-4">
                        <h2 className="text-2xl font-black text-white flex items-center gap-2.5">
                          <Server className="w-6 h-6 text-purple-400" />
                          Chapter 4: Turnkey PHP Shared Hosting Manual (Hostinger, cPanel, XAMPP)
                        </h2>
                        <p className="text-zinc-400 text-sm mt-1">
                          100% self-hosted on inexpensive shared hosting. Zero Node.js dependencies, pure PHP 7.4-8.3+ and MySQL.
                        </p>
                      </div>

                      <div className="space-y-4 text-xs text-zinc-300">
                        <div className="p-4 bg-purple-500/10 border border-purple-500/25 rounded-xl space-y-2">
                          <h4 className="font-bold text-purple-300 text-sm">Prerequisites & Host Requirements</h4>
                          <ul className="list-disc list-inside space-y-1 text-zinc-300">
                            <li>PHP 7.4, 8.0, 8.1, 8.2, or 8.3+</li>
                            <li>Extensions enabled: <code className="text-purple-300">pdo_mysql</code>, <code className="text-purple-300">curl</code>, <code className="text-purple-300">json</code>, <code className="text-purple-300">mbstring</code></li>
                            <li>Apache with <code className="text-purple-300">mod_rewrite</code> (pre-configured in included <code className="text-purple-300">.htaccess</code>)</li>
                            <li>One MySQL / MariaDB database (e.g., Hostinger cPanel database)</li>
                          </ul>
                        </div>

                        <h3 className="text-base font-bold text-white mt-4">3-Step Deployment Guide</h3>
                        <div className="space-y-3">
                          <div className="p-3.5 bg-zinc-900 border border-zinc-800 rounded-xl space-y-1">
                            <span className="text-orange-400 font-bold font-mono">STEP 1: Upload Files</span>
                            <p className="text-zinc-400">
                              Upload the contents of <code className="text-zinc-200">php_shared_hosting/</code> directly to your <code className="text-zinc-200">public_html/</code> directory via cPanel File Manager or FTP.
                            </p>
                          </div>

                          <div className="p-3.5 bg-zinc-900 border border-zinc-800 rounded-xl space-y-1">
                            <span className="text-orange-400 font-bold font-mono">STEP 2: Configure Database</span>
                            <p className="text-zinc-400">
                              Edit <code className="text-zinc-200">config.php</code> with your database host, name, user, and password:
                            </p>
                            <div className="relative mt-2">
                              <pre className="p-3 bg-black/80 rounded-lg text-emerald-400 font-mono text-[11px] overflow-x-auto">
{`define('DB_HOST', 'localhost');
define('DB_NAME', 'u320472937_postman');
define('DB_USER', 'u320472937_postman');
define('DB_PASS', 'YourStrongPassword123!');
define('APP_VERSION', '2.4.0');`}
                              </pre>
                            </div>
                          </div>

                          <div className="p-3.5 bg-zinc-900 border border-zinc-800 rounded-xl space-y-1">
                            <span className="text-orange-400 font-bold font-mono">STEP 3: Run 1-Click Installer</span>
                            <p className="text-zinc-400">
                              Open your browser to <code className="text-zinc-200">https://yourdomain.com/install</code> (or <code className="text-zinc-200">/install.php</code>). The wizard creates all optimized MySQL tables, composite indexes, and seeds initial data in seconds.
                            </p>
                          </div>
                        </div>
                      </div>
                    </article>
                  )}

                  {activeManualChapter === 'multi_protocol' && (
                    <article className="space-y-6">
                      <div className="border-b border-white/10 pb-4">
                        <h2 className="text-2xl font-black text-white flex items-center gap-2.5">
                          <Radio className="w-6 h-6 text-amber-400" />
                          Chapter 5: Multi-Protocol Testing Manual
                        </h2>
                        <p className="text-zinc-400 text-sm mt-1">
                          Test REST, WebSockets, Server-Sent Events (SSE), GraphQL, gRPC, and Mock Servers in a single workspace.
                        </p>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                        <div className="p-4 bg-zinc-900 border border-zinc-800 rounded-xl space-y-2">
                          <h4 className="font-bold text-white flex items-center gap-2">
                            <Radio className="w-4 h-4 text-amber-400" />
                            WebSocket Live Tester
                          </h4>
                          <p className="text-zinc-400">
                            Connect to <code className="text-amber-300">ws://</code> or <code className="text-amber-300">wss://</code> endpoints. Send custom JSON payloads, subscribe to real-time message streams, inspect heartbeat frames, and view chronological message logs with byte counts.
                          </p>
                        </div>

                        <div className="p-4 bg-zinc-900 border border-zinc-800 rounded-xl space-y-2">
                          <h4 className="font-bold text-white flex items-center gap-2">
                            <Activity className="w-4 h-4 text-emerald-400" />
                            Server-Sent Events (SSE) Tester
                          </h4>
                          <p className="text-zinc-400">
                            Inspect streaming LLM responses, live stock tickers, and notification feeds. Auto-reconnection, event ID tracking, and live chunk visualization.
                          </p>
                        </div>

                        <div className="p-4 bg-zinc-900 border border-zinc-800 rounded-xl space-y-2">
                          <h4 className="font-bold text-white flex items-center gap-2">
                            <Code2 className="w-4 h-4 text-pink-400" />
                            GraphQL Explorer & Schema Introspection
                          </h4>
                          <p className="text-zinc-400">
                            Automatic introspection query downloads full schema types, queries, and mutations. Interactive query builder, variable editor, and schema documentation sidebar.
                          </p>
                        </div>

                        <div className="p-4 bg-zinc-900 border border-zinc-800 rounded-xl space-y-2">
                          <h4 className="font-bold text-white flex items-center gap-2">
                            <Cpu className="w-4 h-4 text-blue-400" />
                            gRPC Protocol Explorer
                          </h4>
                          <p className="text-zinc-400">
                            Inspect Protocol Buffer definitions, call unary and streaming RPC methods, configure metadata headers, and validate strongly-typed binary messaging.
                          </p>
                        </div>
                      </div>
                    </article>
                  )}

                  {activeManualChapter === 'variables_scripts' && (
                    <article className="space-y-6">
                      <div className="border-b border-white/10 pb-4">
                        <h2 className="text-2xl font-black text-white flex items-center gap-2.5">
                          <Code2 className="w-6 h-6 text-orange-400" />
                          Chapter 6: Variables, Scopes & Postman Scripting Manual
                        </h2>
                        <p className="text-zinc-400 text-sm mt-1">
                          Full Postman sandbox compatibility: <code className="text-orange-400 font-mono">pm.*</code> API, variable hierarchy, and automated assertion tests.
                        </p>
                      </div>

                      <div className="space-y-4 text-xs text-zinc-300">
                        <h3 className="text-sm font-bold text-white">Variable Precedence Hierarchy</h3>
                        <p className="text-zinc-400">
                          Variables are resolved in order of priority (closest scope wins):
                        </p>
                        <div className="p-3 bg-zinc-950 border border-zinc-800 rounded-lg font-mono text-[11px] text-zinc-300 flex items-center justify-between">
                          <span>Local / Request Scope</span>
                          <span className="text-zinc-600">→</span>
                          <span className="text-orange-400 font-bold">Collection Scope</span>
                          <span className="text-zinc-600">→</span>
                          <span className="text-cyan-400 font-bold">Environment Scope</span>
                          <span className="text-zinc-600">→</span>
                          <span className="text-zinc-400">Global Scope</span>
                        </div>

                        <h3 className="text-sm font-bold text-white mt-4">Supported Postman Scripts API</h3>
                        <div className="relative">
                          <pre className="p-4 bg-zinc-950 border border-zinc-800 rounded-xl text-emerald-400 font-mono text-[11px] overflow-x-auto leading-relaxed">
{`// 1. Reading & Setting Variables
pm.environment.set("token", pm.response.json().access_token);
pm.collectionVariables.set("userId", 1042);
const currentToken = pm.variables.get("token");

// 2. Writing Assertion Tests
pm.test("Status code is 200 OK", function () {
    pm.response.to.have.status(200);
});

pm.test("Response time is under 500ms", function () {
    pm.expect(pm.response.responseTime).to.be.below(500);
});

pm.test("Payload contains valid user data", function () {
    const data = pm.response.json();
    pm.expect(data).to.have.property("email");
    pm.expect(data.role).to.eql("admin");
});`}
                          </pre>
                        </div>
                      </div>
                    </article>
                  )}

                  {activeManualChapter === 'import_export' && (
                    <article className="space-y-6">
                      <div className="border-b border-white/10 pb-4">
                        <h2 className="text-2xl font-black text-white flex items-center gap-2.5">
                          <RefreshCw className="w-6 h-6 text-emerald-400" />
                          Chapter 7: Postman v2.1 Import & Export Manual
                        </h2>
                        <p className="text-zinc-400 text-sm mt-1">
                          100% loss-free import and export compatible with Postman Collection Schema v2.1.0 and environments.
                        </p>
                      </div>

                      <div className="space-y-4 text-xs text-zinc-300">
                        <div className="p-4 bg-zinc-900 border border-zinc-800 rounded-xl space-y-3">
                          <h4 className="font-bold text-white text-sm">How to Export for Official Postman App</h4>
                          <ol className="list-decimal list-inside space-y-1.5 text-zinc-400">
                            <li>Click the collection dropdown or the top navigation <strong>Export</strong> button.</li>
                            <li>Select <strong>Postman Collection v2.1</strong> format.</li>
                            <li>Save the generated <code className="text-emerald-400">.json</code> file.</li>
                            <li>Open Postman desktop or web → Click <em>Import</em> → Drop the file. Every folder, header, script, and variable imports seamlessly.</li>
                          </ol>
                        </div>
                      </div>
                    </article>
                  )}

                  {activeManualChapter === 'collaboration_saas' && (
                    <article className="space-y-6">
                      <div className="border-b border-white/10 pb-4">
                        <h2 className="text-2xl font-black text-white flex items-center gap-2.5">
                          <Users className="w-6 h-6 text-blue-400" />
                          Chapter 8: Collaboration & SaaS Administration Manual
                        </h2>
                        <p className="text-zinc-400 text-sm mt-1">
                          Live teammate presence, Role-Based Access Control (RBAC), and SaaS customer billing & usage metering.
                        </p>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                        <div className="p-4 bg-zinc-900 border border-zinc-800 rounded-xl space-y-2">
                          <h4 className="font-bold text-white">Workspaces & Roles</h4>
                          <p className="text-zinc-400">
                            Collaborate with your team across shared workspaces. Assign fine-grained roles: <strong>Owner</strong>, <strong>Admin</strong>, <strong>Editor</strong>, or <strong>Viewer</strong>. Active member presence indicators show who is currently viewing or editing.
                          </p>
                        </div>

                        <div className="p-4 bg-zinc-900 border border-zinc-800 rounded-xl space-y-2">
                          <h4 className="font-bold text-white">SaaS Tenant Management & Reports</h4>
                          <p className="text-zinc-400">
                            SuperAdmins have access to customer usage heatmaps, Monthly Recurring Revenue (MRR), Annual Recurring Revenue (ARR), infrastructure cost tracking, and plan management (Free, Pro, Enterprise).
                          </p>
                        </div>
                      </div>
                    </article>
                  )}
                </div>
              )}

              {/* SECTION: ARCHITECTURE & TECHNICAL SPECS */}
              {activeSection === 'architecture' && (
                <div>
                  {activeArchChapter === 'overview' && (
                    <article className="space-y-6">
                      <div className="border-b border-white/10 pb-4">
                        <h2 className="text-2xl font-black text-white flex items-center gap-2.5">
                          <Layers className="w-6 h-6 text-orange-400" />
                          System Topology & Multi-App Architecture
                        </h2>
                        <p className="text-zinc-400 text-sm mt-1">
                          Enterprise architectural design of CloudPost across Web, Electron Desktop, Node Express, and PHP Shared Hosting.
                        </p>
                      </div>

                      <div className="p-4 bg-zinc-900 border border-zinc-800 rounded-xl space-y-3 text-xs text-zinc-300">
                        <h4 className="text-sm font-bold text-white">High-Level Topology</h4>
                        <div className="p-4 bg-black/60 rounded-lg border border-white/5 font-mono text-[11px] leading-relaxed text-zinc-300">
                          <div className="text-orange-400 font-bold">┌─────────────────────────────────────────────────────────────────────────────┐</div>
                          <div className="text-orange-400 font-bold">│                       CloudPost Unified Multi-Platform                      │</div>
                          <div className="text-orange-400 font-bold">└──────────────────────────────────────┬──────────────────────────────────────┘</div>
                          <div>                                       │</div>
                          <div>       ┌───────────────────────────────┼───────────────────────────────┐</div>
                          <div>       ▼                               ▼                               ▼</div>
                          <div>┌──────────────┐               ┌──────────────┐               ┌──────────────┐</div>
                          <div>│  Web / PWA   │               │ Desktop App  │               │  PHP Engine  │</div>
                          <div>│  (React/TS)  │               │(Electron.js) │               │(cPanel/Host) │</div>
                          <div>└──────┬───────┘               └──────┬───────┘               └──────┬───────┘</div>
                          <div>       │ (HTTP Proxy / Direct)         │ (Direct Raw Sockets)          │ (Pure PDO)</div>
                          <div>       ▼                               ▼                               ▼</div>
                          <div>┌──────────────────────────────────────────────────────────────────────────────┐</div>
                          <div>│           MySQL High-Performance Database (Composite Indexed)                │</div>
                          <div>└──────────────────────────────────────────────────────────────────────────────┘</div>
                        </div>
                      </div>
                    </article>
                  )}

                  {activeArchChapter === 'versioning_guide' && (
                    <article className="space-y-6">
                      <div className="border-b border-white/10 pb-4">
                        <h2 className="text-2xl font-black text-white flex items-center gap-2.5">
                          <Tag className="w-6 h-6 text-orange-400" />
                          Central Versioning Guide (Where to Set App Version)
                        </h2>
                        <p className="text-zinc-400 text-sm mt-1">
                          Comprehensive mapping of exactly where the application version is configured across all 5 app targets.
                        </p>
                      </div>

                      <div className="p-4 bg-amber-500/10 border border-amber-500/25 rounded-xl text-xs text-amber-200">
                        <strong>Single Source of Truth:</strong> CloudPost keeps version <span className="font-mono font-bold text-white">{APP_VERSION}</span> strictly synchronized across every repository file, manifest, backend server, desktop binary, and PHP hosting package.
                      </div>

                      <div className="space-y-4">
                        <h3 className="text-base font-bold text-white">App Version Configuration Locations</h3>
                        
                        <div className="space-y-3 text-xs">
                          <div className="p-4 bg-zinc-900 border border-zinc-800 rounded-xl space-y-2">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2 font-bold text-white">
                                <Globe className="w-4 h-4 text-emerald-400" />
                                <span>1. React Web App / PWA Single Source of Truth</span>
                              </div>
                              <span className="font-mono text-orange-400 bg-orange-500/10 px-2 py-0.5 rounded">src/config.ts</span>
                            </div>
                            <p className="text-zinc-400">
                              Define <code className="text-zinc-200 font-mono">export const APP_VERSION = '2.4.0';</code>. This value is imported across the entire React frontend: Navbar badges, Landing Page hero, Desktop update banner, and download modal.
                            </p>
                          </div>

                          <div className="p-4 bg-zinc-900 border border-zinc-800 rounded-xl space-y-2">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2 font-bold text-white">
                                <Monitor className="w-4 h-4 text-cyan-400" />
                                <span>2. Desktop App & Electron Build Version</span>
                              </div>
                              <span className="font-mono text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded">package.json</span>
                            </div>
                            <p className="text-zinc-400">
                              Set <code className="text-zinc-200 font-mono">"version": "2.4.0"</code> in the root <code className="text-zinc-200 font-mono">package.json</code>. Electron builder uses this version to stamp the compiled Windows <code className="text-zinc-200 font-mono">.exe</code>, macOS <code className="text-zinc-200 font-mono">.dmg</code>, and Linux binaries.
                            </p>
                          </div>

                          <div className="p-4 bg-zinc-900 border border-zinc-800 rounded-xl space-y-2">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2 font-bold text-white">
                                <Server className="w-4 h-4 text-purple-400" />
                                <span>3. Turnkey PHP Shared Hosting Version</span>
                              </div>
                              <span className="font-mono text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded">php_shared_hosting/config.php</span>
                            </div>
                            <p className="text-zinc-400">
                              Set <code className="text-zinc-200 font-mono">define('APP_VERSION', '2.4.0');</code> and <code className="text-zinc-200 font-mono">define('APP_VERSION_DISPLAY', 'v2.4.0');</code>. This sets the version for all PHP runtime endpoints, installer badges, and diagnostics.
                            </p>
                          </div>

                          <div className="p-4 bg-zinc-900 border border-zinc-800 rounded-xl space-y-2">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2 font-bold text-white">
                                <Terminal className="w-4 h-4 text-amber-400" />
                                <span>4. Node / Express Backend Server</span>
                              </div>
                              <span className="font-mono text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded">server.ts</span>
                            </div>
                            <p className="text-zinc-400">
                              Set <code className="text-zinc-200 font-mono">const SERVER_APP_VERSION = "2.4.0";</code> and <code className="text-zinc-200 font-mono">DEFAULT_LATEST_DESKTOP_RELEASE.version = "2.4.0"</code>. Returns current version via <code className="text-zinc-200 font-mono">/api/health</code> and <code className="text-zinc-200 font-mono">/api/version</code>.
                            </p>
                          </div>

                          <div className="p-4 bg-zinc-900 border border-zinc-800 rounded-xl space-y-2">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2 font-bold text-white">
                                <Database className="w-4 h-4 text-blue-400" />
                                <span>5. Database Migration Schema Version</span>
                              </div>
                              <span className="font-mono text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded">install.php / server.ts</span>
                            </div>
                            <p className="text-zinc-400">
                              Recorded in table <code className="text-zinc-200 font-mono">cp_schema_migrations</code> as <code className="text-zinc-200 font-mono">v2.4.0</code> to track executed schema alter scripts and index creations.
                            </p>
                          </div>
                        </div>
                      </div>
                    </article>
                  )}

                  {activeArchChapter === 'db_optimization' && (
                    <article className="space-y-6">
                      <div className="border-b border-white/10 pb-4">
                        <h2 className="text-2xl font-black text-white flex items-center gap-2.5">
                          <Database className="w-6 h-6 text-emerald-400" />
                          Database & High-Performance Indexing Architecture
                        </h2>
                        <p className="text-zinc-400 text-sm mt-1">
                          Optimized MySQL database schema with composite indexes, connection pooling, and sub-millisecond query latency.
                        </p>
                      </div>

                      <div className="space-y-4 text-xs text-zinc-300">
                        <h3 className="text-sm font-bold text-white">Composite Indexing Strategy</h3>
                        <div className="overflow-x-auto">
                          <table className="w-full text-left border border-white/10 rounded-xl overflow-hidden">
                            <thead className="bg-zinc-900 text-zinc-400 font-mono text-[11px]">
                              <tr>
                                <th className="p-3">Table</th>
                                <th className="p-3">Index Name</th>
                                <th className="p-3">Indexed Columns</th>
                                <th className="p-3">Optimization Target</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5 font-mono text-[11px]">
                              <tr className="bg-zinc-950/40">
                                <td className="p-3 text-white font-bold">cp_requests</td>
                                <td className="p-3 text-orange-400">idx_req_col_sort</td>
                                <td className="p-3 text-zinc-300">(collection_id, sort_order)</td>
                                <td className="p-3 text-zinc-400">Instant tree loading without filesort</td>
                              </tr>
                              <tr>
                                <td className="p-3 text-white font-bold">cp_collections</td>
                                <td className="p-3 text-orange-400">idx_col_ws_sort</td>
                                <td className="p-3 text-zinc-300">(workspace_id, sort_order)</td>
                                <td className="p-3 text-zinc-400">Rapid workspace collection retrieval</td>
                              </tr>
                              <tr className="bg-zinc-950/40">
                                <td className="p-3 text-white font-bold">cp_request_history</td>
                                <td className="p-3 text-orange-400">idx_hist_user_time</td>
                                <td className="p-3 text-zinc-300">(user_id, created_at DESC)</td>
                                <td className="p-3 text-zinc-400">Recent history queries with zero table scan</td>
                              </tr>
                              <tr>
                                <td className="p-3 text-white font-bold">cp_customers</td>
                                <td className="p-3 text-orange-400">idx_cust_email_plan</td>
                                <td className="p-3 text-zinc-300">(email, plan, status)</td>
                                <td className="p-3 text-zinc-400">Sub-millisecond SaaS authentication & metering</td>
                              </tr>
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </article>
                  )}

                  {activeArchChapter === 'security_clean_urls' && (
                    <article className="space-y-6">
                      <div className="border-b border-white/10 pb-4">
                        <h2 className="text-2xl font-black text-white flex items-center gap-2.5">
                          <ShieldCheck className="w-6 h-6 text-teal-400" />
                          Clean URLs & Status-Bar Concealment
                        </h2>
                        <p className="text-zinc-400 text-sm mt-1">
                          Strict user instruction enforcement: PHP file extension suppression and link status-bar protection.
                        </p>
                      </div>

                      <div className="space-y-4 text-xs text-zinc-300">
                        <div className="p-4 bg-zinc-900 border border-zinc-800 rounded-xl space-y-2">
                          <h4 className="font-bold text-white text-sm">1. PHP Extension Concealment in Address Bar</h4>
                          <p className="text-zinc-400 leading-relaxed">
                            Under Apache / LiteSpeed (<code className="text-orange-400 font-mono">.htaccess</code>), any direct request with a <code className="text-orange-400 font-mono">.php</code> extension is automatically rewritten to a clean, extensionless path via HTTP 301. Routing rules cleanly map <code className="text-zinc-200 font-mono">/install</code> to <code className="text-zinc-200 font-mono">install.php</code>, <code className="text-zinc-200 font-mono">/api</code> to <code className="text-zinc-200 font-mono">api.php</code>, and <code className="text-zinc-200 font-mono">/diagnostic</code> to <code className="text-zinc-200 font-mono">diagnostic.php</code> without ever revealing <code className="text-orange-400 font-mono">.php</code> in the user's browser address bar.
                          </p>
                        </div>

                        <div className="p-4 bg-zinc-900 border border-zinc-800 rounded-xl space-y-2">
                          <h4 className="font-bold text-white text-sm">2. URL Status Bar Concealment on Hover</h4>
                          <p className="text-zinc-400 leading-relaxed">
                            To prevent URLs from being previewed in the browser's lower status bar when hovering over navigation items and action controls, CloudPost exclusively utilizes styled <code className="text-orange-400 font-mono">&lt;button&gt;</code> elements and interactive JavaScript click handlers instead of raw <code className="text-orange-400 font-mono">&lt;a href="..."&gt;</code> anchor tags.
                          </p>
                        </div>
                      </div>
                    </article>
                  )}

                  {activeArchChapter === 'internal_apis' && (
                    <article className="space-y-6">
                      <div className="border-b border-white/10 pb-4">
                        <h2 className="text-2xl font-black text-white flex items-center gap-2.5">
                          <Terminal className="w-6 h-6 text-amber-400" />
                          Internal Server REST API Reference
                        </h2>
                        <p className="text-zinc-400 text-sm mt-1">
                          Core backend endpoints for synchronization, collections, workspaces, desktop releases, and SaaS administration.
                        </p>
                      </div>

                      <div className="space-y-3 text-xs">
                        <div className="p-3.5 bg-zinc-900 border border-zinc-800 rounded-xl space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded font-mono font-bold text-[10px]">GET</span>
                            <code className="text-zinc-200 font-mono font-semibold">/api/health</code>
                          </div>
                          <p className="text-zinc-400">Returns service status, current active version <code className="text-orange-300 font-mono">2.4.0</code>, and UTC timestamp.</p>
                        </div>

                        <div className="p-3.5 bg-zinc-900 border border-zinc-800 rounded-xl space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded font-mono font-bold text-[10px]">GET</span>
                            <code className="text-zinc-200 font-mono font-semibold">/api/desktop/check-update?version=2.4.0&platform=win32</code>
                          </div>
                          <p className="text-zinc-400">Checks if a newer verified desktop release is available, preventing downgrades.</p>
                        </div>

                        <div className="p-3.5 bg-zinc-900 border border-zinc-800 rounded-xl space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded font-mono font-bold text-[10px]">GET</span>
                            <code className="text-zinc-200 font-mono font-semibold">/api/db/load</code>
                          </div>
                          <p className="text-zinc-400">Loads workspaces, collections, requests, and environments from MySQL.</p>
                        </div>

                        <div className="p-3.5 bg-zinc-900 border border-zinc-800 rounded-xl space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded font-mono font-bold text-[10px]">POST</span>
                            <code className="text-zinc-200 font-mono font-semibold">/api/db/save</code>
                          </div>
                          <p className="text-zinc-400">Persists client state changes with automatic batch transactions and rollback.</p>
                        </div>
                      </div>
                    </article>
                  )}
                </div>
              )}

              {/* SECTION: VERSIONING GUIDE DEDICATED VIEW */}
              {activeSection === 'versioning' && (
                <article className="space-y-6">
                  <div className="border-b border-white/10 pb-4">
                    <h2 className="text-2xl font-black text-white flex items-center gap-2.5">
                      <Tag className="w-6 h-6 text-orange-400" />
                      Where and How to Set App Version for All Apps
                    </h2>
                    <p className="text-zinc-400 text-sm mt-1">
                      Direct step-by-step instructions for changing and maintaining uniform version tags across all CloudPost clients.
                    </p>
                  </div>

                  <div className="p-4 bg-orange-500/10 border border-orange-500/25 rounded-xl space-y-2 text-xs">
                    <h4 className="font-bold text-orange-300 text-sm">Unified Version Standard</h4>
                    <p className="text-zinc-300">
                      All applications must always share the exact same version string (e.g., <strong className="text-white font-mono">{APP_VERSION}</strong>). Whenever bumping to a new release (e.g., <strong className="text-white font-mono">2.5.0</strong>), update the version in the following 4 files:
                    </p>
                  </div>

                  <div className="space-y-4 text-xs">
                    <div className="p-4 bg-zinc-900 border border-zinc-800 rounded-xl space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-white text-sm">File 1: Frontend Single Source of Truth</span>
                        <code className="text-orange-400 font-mono text-[11px]">src/config.ts</code>
                      </div>
                      <pre className="p-3 bg-black/80 rounded-lg text-emerald-400 font-mono text-[11px] overflow-x-auto">
{`export const APP_VERSION = '${APP_VERSION}';
export const APP_VERSION_DISPLAY = \`v\${APP_VERSION}\`;`}
                      </pre>
                      <p className="text-zinc-400">
                        This immediately updates the version badge in the Navigation Bar, Landing Page hero, Desktop update banner, and Download Modal.
                      </p>
                    </div>

                    <div className="p-4 bg-zinc-900 border border-zinc-800 rounded-xl space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-white text-sm">File 2: Desktop Tool & Electron Package</span>
                        <code className="text-cyan-400 font-mono text-[11px]">package.json</code>
                      </div>
                      <pre className="p-3 bg-black/80 rounded-lg text-cyan-400 font-mono text-[11px] overflow-x-auto">
{`"name": "cloudpost",
"version": "${APP_VERSION}",`}
                      </pre>
                      <p className="text-zinc-400">
                        Electron and electron-builder read this string to stamp binaries (<code className="text-zinc-200">.exe</code>, <code className="text-zinc-200">.dmg</code>, <code className="text-zinc-200">.AppImage</code>) and <code className="text-zinc-200">app.getVersion()</code>.
                      </p>
                    </div>

                    <div className="p-4 bg-zinc-900 border border-zinc-800 rounded-xl space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-white text-sm">File 3: Turnkey PHP Shared Hosting</span>
                        <code className="text-purple-400 font-mono text-[11px]">php_shared_hosting/config.php</code>
                      </div>
                      <pre className="p-3 bg-black/80 rounded-lg text-purple-300 font-mono text-[11px] overflow-x-auto">
{`define('APP_NAME', 'CloudPost API Studio');
define('APP_VERSION', '${APP_VERSION}');
define('APP_VERSION_DISPLAY', 'v${APP_VERSION}');`}
                      </pre>
                      <p className="text-zinc-400">
                        Governs the PHP web application, database installer header, diagnostic check, and JSON storage API.
                      </p>
                    </div>

                    <div className="p-4 bg-zinc-900 border border-zinc-800 rounded-xl space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-white text-sm">File 4: Express Server & Desktop Update Server</span>
                        <code className="text-amber-400 font-mono text-[11px]">server.ts</code>
                      </div>
                      <pre className="p-3 bg-black/80 rounded-lg text-amber-300 font-mono text-[11px] overflow-x-auto">
{`const SERVER_APP_VERSION = "${APP_VERSION}";
const DEFAULT_LATEST_DESKTOP_RELEASE: DesktopRelease = {
  version: "${APP_VERSION}",
  title: "CloudPost v${APP_VERSION} - Collaborative Multi-Protocol Release",
  ...`}
                      </pre>
                      <p className="text-zinc-400">
                        Used by <code className="text-zinc-200">/api/health</code>, <code className="text-zinc-200">/api/version</code>, and the desktop auto-update check endpoint.
                      </p>
                    </div>
                  </div>
                </article>
              )}
            </main>
          </>
        )}
      </div>
    </div>
  );
};
