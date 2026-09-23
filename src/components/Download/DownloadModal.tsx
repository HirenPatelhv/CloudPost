import React, { useState, useEffect } from 'react';
import {
  Download,
  CheckCircle2,
  Copy,
  Check,
  X,
  Sparkles,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  ShieldCheck,
  Zap,
  Terminal,
  Server,
  Monitor,
  Laptop,
  ArrowDownToLine,
  FileCode2,
  HardDrive
} from 'lucide-react';
import {
  DesktopRelease,
  DistributionArtifact,
  fetchDesktopReleases,
  getLatestActiveRelease,
  triggerDistributionDownload,
  trackDownload
} from '../../services/desktopVersionService';

interface DownloadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenSaaSAdmin?: () => void;
}

type PlatformTab = 'windows' | 'mac' | 'linux' | 'php';

export const DownloadModal: React.FC<DownloadModalProps> = ({
  isOpen,
  onClose,
  onOpenSaaSAdmin
}) => {
  const [selectedPlatform, setSelectedPlatform] = useState<PlatformTab>('windows');
  const [releases, setReleases] = useState<DesktopRelease[]>([]);
  const [latestRelease, setLatestRelease] = useState<DesktopRelease | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [copiedChecksum, setCopiedChecksum] = useState<string | null>(null);
  const [downloadingFormat, setDownloadingFormat] = useState<string | null>(null);
  const [showChangelog, setShowChangelog] = useState(false);
  const [detectedOS, setDetectedOS] = useState<string>('Windows');

  // Auto-detect Operating System
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const ua = window.navigator.userAgent.toLowerCase();
    const plat = (window.navigator as any).userAgentData?.platform?.toLowerCase() || window.navigator.platform.toLowerCase();

    if (plat.includes('mac') || ua.includes('macintosh') || ua.includes('mac os x')) {
      setSelectedPlatform('mac');
      setDetectedOS('macOS (Apple Silicon & Intel)');
    } else if (plat.includes('linux') || ua.includes('linux') || ua.includes('x11')) {
      setSelectedPlatform('linux');
      setDetectedOS('Linux (64-bit)');
    } else {
      setSelectedPlatform('windows');
      setDetectedOS('Windows 10 / 11 (64-bit)');
    }

    loadReleases();
  }, [isOpen]);

  const loadReleases = async () => {
    setIsLoading(true);
    try {
      const rels = await fetchDesktopReleases();
      setReleases(rels);
      const latest = await getLatestActiveRelease();
      setLatestRelease(latest);
    } catch (e) {
      console.error('Failed to load desktop releases:', e);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  const currentRelease = latestRelease || releases[0];
  const dists = currentRelease?.distributions || {};

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedChecksum(id);
    setTimeout(() => setCopiedChecksum(null), 2500);
  };

  const handleDownload = (artifact: DistributionArtifact | undefined, platformName: string) => {
    if (!artifact) return;
    setDownloadingFormat(artifact.format);
    trackDownload(currentRelease.id, platformName);
    triggerDistributionDownload(artifact, currentRelease.version);

    setTimeout(() => {
      setDownloadingFormat(null);
    }, 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-3 sm:p-6 overflow-y-auto selection:bg-orange-500/30 selection:text-orange-200 animate-in fade-in duration-200">
      <div 
        className="relative w-full max-w-4xl bg-[#0e121e] border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Glow Accents */}
        <div className="absolute top-0 right-1/4 w-80 h-80 bg-orange-500/10 rounded-full blur-3xl pointer-events-none -z-10"></div>
        <div className="absolute bottom-0 left-1/4 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl pointer-events-none -z-10"></div>

        {/* Modal Top Header */}
        <div className="px-6 py-4 bg-[#0a0d17] border-b border-white/10 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-orange-500 to-amber-600 flex items-center justify-center text-white shadow-lg shadow-orange-500/20 font-bold shrink-0">
              <Download className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-extrabold text-white tracking-tight">
                  Download CloudPost Distributions
                </h2>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 font-semibold">
                  v{currentRelease?.version || '2.4.0'} Latest
                </span>
                <span className="hidden sm:inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-orange-500/10 text-orange-300 border border-orange-500/30 font-semibold">
                  <ShieldCheck className="w-3 h-3 text-orange-400" />
                  Publisher: Tech Vision Studio
                </span>
              </div>
              <p className="text-xs text-zinc-400 mt-0.5">
                Native Desktop Applications & Turnkey PHP Shared Hosting
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {onOpenSaaSAdmin && (
              <button
                onClick={() => {
                  onClose();
                  onOpenSaaSAdmin();
                }}
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-300 hover:text-white rounded-lg text-xs font-semibold transition-colors"
                title="Manage versions & releases in SaaS Admin"
              >
                <HardDrive className="w-3.5 h-3.5 text-orange-400" />
                <span>Version Manager</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 text-zinc-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
              title="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-zinc-200">
          
          {/* OS Auto-Detection Banner */}
          <div className="p-3.5 rounded-xl bg-gradient-to-r from-orange-500/10 via-amber-500/10 to-transparent border border-orange-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2.5">
              <Sparkles className="w-4 h-4 text-orange-400 shrink-0" />
              <span>
                <strong className="text-white">Detected Operating System:</strong>{' '}
                <span className="text-amber-300 font-medium">{detectedOS}</span>
              </span>
            </div>
            <div className="flex items-center gap-2 text-zinc-400">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Downgrade-Protected Releases with Auto-Update Check</span>
            </div>
          </div>

          {/* Platform Tab Navigation */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-[#090b14] p-1.5 rounded-xl border border-white/10">
            <button
              onClick={() => setSelectedPlatform('windows')}
              className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-xs font-bold transition-all ${
                selectedPlatform === 'windows'
                  ? 'bg-gradient-to-r from-orange-500 to-amber-600 text-white shadow-md'
                  : 'text-zinc-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Monitor className="w-4 h-4" />
              <span>Windows</span>
            </button>

            <button
              onClick={() => setSelectedPlatform('mac')}
              className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-xs font-bold transition-all ${
                selectedPlatform === 'mac'
                  ? 'bg-gradient-to-r from-orange-500 to-amber-600 text-white shadow-md'
                  : 'text-zinc-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Laptop className="w-4 h-4" />
              <span>macOS</span>
            </button>

            <button
              onClick={() => setSelectedPlatform('linux')}
              className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-xs font-bold transition-all ${
                selectedPlatform === 'linux'
                  ? 'bg-gradient-to-r from-orange-500 to-amber-600 text-white shadow-md'
                  : 'text-zinc-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Terminal className="w-4 h-4" />
              <span>Linux</span>
            </button>

            <button
              onClick={() => setSelectedPlatform('php')}
              className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-xs font-bold transition-all ${
                selectedPlatform === 'php'
                  ? 'bg-gradient-to-r from-orange-500 to-amber-600 text-white shadow-md'
                  : 'text-zinc-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Server className="w-4 h-4" />
              <span>PHP Hosting</span>
            </button>
          </div>

          {/* Platform Specific Distribution Cards */}
          {selectedPlatform === 'windows' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* 1. Windows Installer */}
                <div className="p-5 rounded-xl bg-[#121624] border border-white/10 hover:border-orange-500/40 transition-all flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded bg-orange-500/20 text-orange-300 font-bold">
                        Recommended
                      </span>
                      <span className="text-xs text-zinc-400">
                        {dists.windowsExe?.sizeFormatted || '84.4 MB'}
                      </span>
                    </div>
                    <h3 className="text-base font-bold text-white mb-1">
                      Windows Installer (Setup .exe)
                    </h3>
                    <p className="text-xs text-zinc-400 leading-relaxed mb-4">
                      Complete 64-bit installer with automatic desktop shortcut, start menu entry, and background auto-update checks.
                    </p>
                  </div>

                  <div className="space-y-2 pt-2 border-t border-white/5">
                    <button
                      onClick={() => handleDownload(dists.windowsExe, 'Windows Setup')}
                      disabled={downloadingFormat === 'exe'}
                      className="w-full py-2.5 px-4 bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white rounded-xl text-xs font-bold shadow-lg shadow-orange-500/20 flex items-center justify-center gap-2 transition-all cursor-pointer"
                    >
                      {downloadingFormat === 'exe' ? (
                        <>
                          <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          <span>Downloading Setup...</span>
                        </>
                      ) : (
                        <>
                          <ArrowDownToLine className="w-4 h-4" />
                          <span>Download .EXE Installer</span>
                        </>
                      )}
                    </button>

                    {dists.windowsExe?.sha256 && (
                      <div className="flex items-center justify-between text-[11px] text-zinc-400 pt-1">
                        <span className="truncate font-mono">
                          SHA256: {dists.windowsExe.sha256.substring(0, 16)}...
                        </span>
                        <button
                          onClick={() => handleCopy(dists.windowsExe?.sha256 || '', 'win-exe')}
                          className="text-orange-400 hover:text-orange-300 flex items-center gap-1 shrink-0 ml-2"
                        >
                          {copiedChecksum === 'win-exe' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                          <span>{copiedChecksum === 'win-exe' ? 'Copied' : 'Copy'}</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* 2. Windows Portable */}
                <div className="p-5 rounded-xl bg-[#121624] border border-white/10 hover:border-orange-500/40 transition-all flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 font-bold">
                        Standalone Portable
                      </span>
                      <span className="text-xs text-zinc-400">
                        {dists.windowsZip?.sizeFormatted || '90.0 MB'}
                      </span>
                    </div>
                    <h3 className="text-base font-bold text-white mb-1">
                      Windows Portable (.zip)
                    </h3>
                    <p className="text-xs text-zinc-400 leading-relaxed mb-4">
                      Zero-install standalone executable. Extract anywhere and launch without administrator privileges.
                    </p>
                  </div>

                  <div className="space-y-2 pt-2 border-t border-white/5">
                    <button
                      onClick={() => handleDownload(dists.windowsZip, 'Windows Portable')}
                      disabled={downloadingFormat === 'zip'}
                      className="w-full py-2.5 px-4 bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer"
                    >
                      {downloadingFormat === 'zip' ? (
                        <>
                          <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          <span>Downloading ZIP...</span>
                        </>
                      ) : (
                        <>
                          <ArrowDownToLine className="w-4 h-4" />
                          <span>Download .ZIP Portable</span>
                        </>
                      )}
                    </button>

                    {dists.windowsZip?.sha256 && (
                      <div className="flex items-center justify-between text-[11px] text-zinc-400 pt-1">
                        <span className="truncate font-mono">
                          SHA256: {dists.windowsZip.sha256.substring(0, 16)}...
                        </span>
                        <button
                          onClick={() => handleCopy(dists.windowsZip?.sha256 || '', 'win-zip')}
                          className="text-orange-400 hover:text-orange-300 flex items-center gap-1 shrink-0 ml-2"
                        >
                          {copiedChecksum === 'win-zip' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                          <span>{copiedChecksum === 'win-zip' ? 'Copied' : 'Copy'}</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Windows SmartScreen Guidance Box */}
              <div className="p-3.5 rounded-xl bg-blue-950/30 border border-blue-500/30 flex flex-col gap-2.5 text-xs">
                <div className="flex items-center justify-between gap-2 text-blue-300 font-bold">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-blue-400 shrink-0" />
                    <span>Windows SmartScreen First Launch Guide</span>
                  </div>
                  <span className="text-[10px] font-mono bg-blue-500/20 text-blue-200 px-2 py-0.5 rounded border border-blue-500/30">
                    Publisher: Tech Vision Studio
                  </span>
                </div>
                <p className="text-zinc-300 text-[11.5px] leading-relaxed">
                  On newly released distributions, Microsoft Defender SmartScreen may display <em>"Windows protected your PC"</em>. This is standard for independent developer software.
                </p>
                <div className="flex flex-wrap items-center gap-2 text-[11px] text-zinc-300 bg-black/40 p-2.5 rounded-lg border border-white/5">
                  <span className="px-2 py-0.5 rounded bg-blue-500/30 text-blue-200 font-bold">Step 1</span>
                  <span>Click <strong className="text-white underline underline-offset-2">"More info"</strong></span>
                  <span className="text-zinc-500 font-bold">→</span>
                  <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-200 font-bold">Step 2</span>
                  <span>Confirm Publisher: <strong className="text-amber-300">Tech Vision Studio</strong></span>
                  <span className="text-zinc-500 font-bold">→</span>
                  <span className="px-2 py-0.5 rounded bg-emerald-500/30 text-emerald-200 font-bold">Step 3</span>
                  <span>Click <strong className="text-emerald-400">"Run anyway"</strong></span>
                </div>
              </div>

              {/* Requirement Note */}
              <div className="text-[11px] text-zinc-400 flex items-center justify-between gap-2 bg-[#0a0d17] p-2.5 rounded-lg border border-white/5">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>Supports Windows 10, Windows 11, and Windows Server 2019+. 64-bit architecture.</span>
                </div>
                <span className="text-zinc-400 font-mono text-[10px]">
                  Publisher: <strong className="text-orange-400 font-semibold">Tech Vision Studio</strong>
                </span>
              </div>
            </div>
          )}

          {selectedPlatform === 'mac' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* 1. macOS DMG */}
                <div className="p-5 rounded-xl bg-[#121624] border border-white/10 hover:border-orange-500/40 transition-all flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded bg-orange-500/20 text-orange-300 font-bold">
                        Universal (Apple & Intel)
                      </span>
                      <span className="text-xs text-zinc-400">
                        {dists.macDmg?.sizeFormatted || '92.0 MB'}
                      </span>
                    </div>
                    <h3 className="text-base font-bold text-white mb-1">
                      macOS Disk Image (.dmg)
                    </h3>
                    <p className="text-xs text-zinc-400 leading-relaxed mb-4">
                      Drag-and-drop installer for macOS. Compatible with Apple Silicon (M1/M2/M3/M4) and Intel Core processors.
                    </p>
                  </div>

                  <div className="space-y-2 pt-2 border-t border-white/5">
                    <button
                      onClick={() => handleDownload(dists.macDmg, 'macOS DMG')}
                      disabled={downloadingFormat === 'dmg'}
                      className="w-full py-2.5 px-4 bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white rounded-xl text-xs font-bold shadow-lg shadow-orange-500/20 flex items-center justify-center gap-2 transition-all cursor-pointer"
                    >
                      {downloadingFormat === 'dmg' ? (
                        <>
                          <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          <span>Downloading DMG...</span>
                        </>
                      ) : (
                        <>
                          <ArrowDownToLine className="w-4 h-4" />
                          <span>Download .DMG Package</span>
                        </>
                      )}
                    </button>

                    {dists.macDmg?.sha256 && (
                      <div className="flex items-center justify-between text-[11px] text-zinc-400 pt-1">
                        <span className="truncate font-mono">
                          SHA256: {dists.macDmg.sha256.substring(0, 16)}...
                        </span>
                        <button
                          onClick={() => handleCopy(dists.macDmg?.sha256 || '', 'mac-dmg')}
                          className="text-orange-400 hover:text-orange-300 flex items-center gap-1 shrink-0 ml-2"
                        >
                          {copiedChecksum === 'mac-dmg' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                          <span>{copiedChecksum === 'mac-dmg' ? 'Copied' : 'Copy'}</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* 2. macOS ZIP */}
                <div className="p-5 rounded-xl bg-[#121624] border border-white/10 hover:border-orange-500/40 transition-all flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 font-bold">
                        App Bundle
                      </span>
                      <span className="text-xs text-zinc-400">
                        {dists.macZip?.sizeFormatted || '97.0 MB'}
                      </span>
                    </div>
                    <h3 className="text-base font-bold text-white mb-1">
                      macOS App Archive (.zip)
                    </h3>
                    <p className="text-xs text-zinc-400 leading-relaxed mb-4">
                      Direct compressed `CloudPost.app` bundle for manual placement in Applications directory.
                    </p>
                  </div>

                  <div className="space-y-2 pt-2 border-t border-white/5">
                    <button
                      onClick={() => handleDownload(dists.macZip, 'macOS ZIP')}
                      disabled={downloadingFormat === 'mac-zip'}
                      className="w-full py-2.5 px-4 bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer"
                    >
                      <ArrowDownToLine className="w-4 h-4" />
                      <span>Download .ZIP Bundle</span>
                    </button>

                    {dists.macZip?.sha256 && (
                      <div className="flex items-center justify-between text-[11px] text-zinc-400 pt-1">
                        <span className="truncate font-mono">
                          SHA256: {dists.macZip.sha256.substring(0, 16)}...
                        </span>
                        <button
                          onClick={() => handleCopy(dists.macZip?.sha256 || '', 'mac-zip')}
                          className="text-orange-400 hover:text-orange-300 flex items-center gap-1 shrink-0 ml-2"
                        >
                          {copiedChecksum === 'mac-zip' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                          <span>{copiedChecksum === 'mac-zip' ? 'Copied' : 'Copy'}</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Requirement Note */}
              <div className="text-[11px] text-zinc-400 flex items-center gap-2 bg-[#0a0d17] p-2.5 rounded-lg border border-white/5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>Requires macOS 11.0 (Big Sur), Monterey, Ventura, Sonoma, or Sequoia.</span>
              </div>
            </div>
          )}

          {selectedPlatform === 'linux' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* 1. AppImage */}
                <div className="p-5 rounded-xl bg-[#121624] border border-white/10 hover:border-orange-500/40 transition-all flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded bg-orange-500/20 text-orange-300 font-bold">
                        Run Anywhere
                      </span>
                      <span className="text-xs text-zinc-400">{dists.linuxAppImage?.sizeFormatted || '87.0 MB'}</span>
                    </div>
                    <h3 className="text-sm font-bold text-white mb-1">Linux AppImage</h3>
                    <p className="text-xs text-zinc-400 mb-4">Universal binary without package installation.</p>
                  </div>
                  <button
                    onClick={() => handleDownload(dists.linuxAppImage, 'Linux AppImage')}
                    className="w-full py-2.5 px-3 bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <ArrowDownToLine className="w-3.5 h-3.5" />
                    <span>Download AppImage</span>
                  </button>
                </div>

                {/* 2. Debian / Ubuntu */}
                <div className="p-5 rounded-xl bg-[#121624] border border-white/10 hover:border-orange-500/40 transition-all flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 font-bold">
                        Debian / Ubuntu
                      </span>
                      <span className="text-xs text-zinc-400">{dists.linuxDeb?.sizeFormatted || '75.0 MB'}</span>
                    </div>
                    <h3 className="text-sm font-bold text-white mb-1">Debian Package (.deb)</h3>
                    <p className="text-xs text-zinc-400 mb-4">Native dpkg installer with apt compatibility.</p>
                  </div>
                  <button
                    onClick={() => handleDownload(dists.linuxDeb, 'Linux DEB')}
                    className="w-full py-2.5 px-3 bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <ArrowDownToLine className="w-3.5 h-3.5" />
                    <span>Download .DEB</span>
                  </button>
                </div>

                {/* 3. Tarball */}
                <div className="p-5 rounded-xl bg-[#121624] border border-white/10 hover:border-orange-500/40 transition-all flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 font-bold">
                        Tar Archive
                      </span>
                      <span className="text-xs text-zinc-400">{dists.linuxTar?.sizeFormatted || '85.0 MB'}</span>
                    </div>
                    <h3 className="text-sm font-bold text-white mb-1">Tarball (.tar.gz)</h3>
                    <p className="text-xs text-zinc-400 mb-4">Complete binary distribution for custom packaging.</p>
                  </div>
                  <button
                    onClick={() => handleDownload(dists.linuxTar, 'Linux Tar')}
                    className="w-full py-2.5 px-3 bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <ArrowDownToLine className="w-3.5 h-3.5" />
                    <span>Download .TAR.GZ</span>
                  </button>
                </div>
              </div>

              {/* Requirement Note */}
              <div className="text-[11px] text-zinc-400 flex items-center gap-2 bg-[#0a0d17] p-2.5 rounded-lg border border-white/5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>Compatible with Ubuntu 20.04+, Debian 11+, Fedora 34+, Arch Linux, and openSUSE.</span>
              </div>
            </div>
          )}

          {selectedPlatform === 'php' && (
            <div className="space-y-4">
              <div className="p-5 rounded-xl bg-[#121624] border border-white/10 hover:border-orange-500/40 transition-all">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded bg-orange-500/20 text-orange-300 font-bold">
                        Turnkey Web Deployment
                      </span>
                      <span className="text-xs text-zinc-400">870 KB (Zero Node.js Required)</span>
                    </div>
                    <h3 className="text-base font-bold text-white">
                      CloudPost PHP Shared Hosting Edition (.zip)
                    </h3>
                    <p className="text-xs text-zinc-400 max-w-xl leading-relaxed">
                      Complete self-hosted edition engineered strictly for shared hosting providers (cPanel, Hostinger, GoDaddy, Plesk, Apache, Nginx). Includes web installer, MySQL auto-migrator, and clean URLs without `.php` extensions.
                    </p>
                  </div>

                  <button
                    onClick={() => handleDownload(dists.phpSharedHosting, 'PHP Shared Hosting')}
                    className="py-3 px-5 bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white rounded-xl text-xs font-bold shadow-lg shadow-orange-500/20 flex items-center justify-center gap-2 shrink-0 cursor-pointer"
                  >
                    <ArrowDownToLine className="w-4 h-4" />
                    <span>Download PHP Bundle (.zip)</span>
                  </button>
                </div>

                <div className="mt-4 pt-4 border-t border-white/5 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs text-zinc-400">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>PHP 7.4, 8.0, 8.1, 8.2, 8.3 Ready</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>MySQL 5.7+ / MariaDB 10.3+</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Built-in Migration & Schema Verifier</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Desktop Exclusive Advantages Grid */}
          <div className="pt-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-400 mb-3 flex items-center gap-2">
              <Zap className="w-3.5 h-3.5 text-orange-400" />
              <span>Why Run CloudPost on Desktop?</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="p-3.5 rounded-xl bg-[#090b14] border border-white/5 space-y-1">
                <div className="text-orange-400 font-bold flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4" />
                  <span>100% CORS-Free</span>
                </div>
                <p className="text-zinc-400 text-[11px] leading-relaxed">
                  Sends raw TCP/HTTP requests directly from your machine. Bypasses browser sandbox blocks and CORS pre-flight restrictions.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-[#090b14] border border-white/5 space-y-1">
                <div className="text-emerald-400 font-bold flex items-center gap-1.5">
                  <Zap className="w-4 h-4" />
                  <span>Direct Socket Execution</span>
                </div>
                <p className="text-zinc-400 text-[11px] leading-relaxed">
                  Execute requests and automated test suites locally with native low-latency socket networking and complete request privacy.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-[#090b14] border border-white/5 space-y-1">
                <div className="text-amber-400 font-bold flex items-center gap-1.5">
                  <HardDrive className="w-4 h-4" />
                  <span>Auto-Update on Open</span>
                </div>
                <p className="text-zinc-400 text-[11px] leading-relaxed">
                  When opened, the desktop tool automatically queries the version registry for newer upgrades while blocking accidental downgrades.
                </p>
              </div>
            </div>
          </div>

          {/* Collapsible Release Notes */}
          <div className="border border-white/10 rounded-xl overflow-hidden bg-[#090b14]">
            <button
              onClick={() => setShowChangelog(!showChangelog)}
              className="w-full px-4 py-3 flex items-center justify-between text-xs font-semibold text-zinc-300 hover:text-white transition-colors"
            >
              <span className="flex items-center gap-2">
                <FileCode2 className="w-4 h-4 text-orange-400" />
                <span>What's New in v{currentRelease?.version || '2.4.0'}</span>
              </span>
              {showChangelog ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>

            {showChangelog && (
              <div className="px-4 pb-4 text-xs text-zinc-400 border-t border-white/5 space-y-2 whitespace-pre-line font-mono bg-black/20 p-3.5">
                {currentRelease?.releaseNotes}
              </div>
            )}
          </div>

        </div>

        {/* Modal Bottom Footer */}
        <div className="px-6 py-3.5 bg-[#0a0d17] border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs shrink-0">
          <div className="flex flex-wrap items-center gap-2.5 text-zinc-400">
            <span className="flex items-center gap-1.5 text-zinc-300">
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
              Publisher: <strong className="text-orange-400 font-semibold ml-0.5">Tech Vision Studio</strong>
            </span>
            <span className="text-zinc-600 hidden sm:inline">•</span>
            <span>All binaries SHA-256 verified</span>
            <span className="text-zinc-600 hidden sm:inline">•</span>
            <span className="text-zinc-500">© 2026 Tech Vision Studio</span>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              onClick={onClose}
              className="w-full sm:w-auto px-4 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-300 hover:text-white rounded-lg font-medium transition-colors cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
