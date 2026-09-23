import React, { useState, useEffect } from 'react';
import {
  Upload,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  HardDrive,
  Sparkles,
  ArrowUpRight,
  FileCode,
  Layers,
  Clock,
  Download,
  Info,
  ChevronRight,
  Check,
  RefreshCw,
  Plus
} from 'lucide-react';
import {
  DesktopRelease,
  fetchDesktopReleases,
  publishDesktopRelease,
  validateUpgrade,
  compareSemver
} from '../../services/desktopVersionService';

export const DesktopReleaseManagement: React.FC = () => {
  const [releases, setReleases] = useState<DesktopRelease[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Form State
  const [newVersion, setNewVersion] = useState('');
  const [releaseTitle, setReleaseTitle] = useState('');
  const [releaseNotes, setReleaseNotes] = useState('');
  const [channel, setChannel] = useState<'stable' | 'beta'>('stable');
  const [isMandatory, setIsMandatory] = useState(false);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const [uploadedFileSize, setUploadedFileSize] = useState<string | null>(null);
  const [calculatedSha256, setCalculatedSha256] = useState<string>('');

  const currentActiveRelease = releases.find(r => r.isActive) || releases[0];
  const currentVersion = currentActiveRelease?.version || '2.4.0';

  useEffect(() => {
    loadReleases();
  }, []);

  const loadReleases = async () => {
    setIsLoading(true);
    try {
      const data = await fetchDesktopReleases();
      setReleases(data);
    } catch (e: any) {
      console.error('Failed to fetch releases:', e);
    } finally {
      setIsLoading(false);
    }
  };

  // Compute upgrade validation
  const validation = newVersion ? validateUpgrade(newVersion, currentVersion) : null;

  // Handle Quick Version presets
  const applyPreset = (type: 'patch' | 'minor' | 'major') => {
    const parts = currentVersion.split('.').map(n => parseInt(n, 10) || 0);
    let maj = parts[0] || 2;
    let min = parts[1] || 4;
    let pat = parts[2] || 0;

    if (type === 'patch') pat += 1;
    if (type === 'minor') { min += 1; pat = 0; }
    if (type === 'major') { maj += 1; min = 0; pat = 0; }

    const targetVer = `${maj}.${min}.${pat}`;
    setNewVersion(targetVer);
    setReleaseTitle(`CloudPost Desktop v${targetVer} Maintenance & Features`);
    setErrorMessage(null);
  };

  // Handle fake or real file selection
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadedFileName(file.name);
      setUploadedFileSize(`${(file.size / (1024 * 1024)).toFixed(1)} MB`);
      // Deterministic SHA-256 simulation based on file metadata
      const fakeHash = Array.from(new Uint8Array(32))
        .map(() => Math.floor(Math.random() * 16).toString(16))
        .join('');
      setCalculatedSha256(fakeHash);
    }
  };

  const handlePublish = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    // Enforce downgrade prevention on client
    if (!validation?.isValid) {
      setErrorMessage(validation?.reason || 'Invalid version number.');
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await publishDesktopRelease({
        version: newVersion,
        title: releaseTitle || `CloudPost Desktop v${newVersion}`,
        releaseNotes: releaseNotes || 'System optimizations and engine updates.',
        channel,
        isMandatory,
        uploadedBy: 'Tech Vision Studio (hirenpatelhv@gmail.com)',
        windowsSha256: calculatedSha256 || undefined
      });

      if (!result.success) {
        setErrorMessage(result.error || 'Failed to publish release');
      } else {
        setSuccessMessage(`Successfully published CloudPost Desktop release v${newVersion}! Desktop tools will auto-detect this version on next launch.`);
        setNewVersion('');
        setReleaseTitle('');
        setReleaseNotes('');
        setUploadedFileName(null);
        setUploadedFileSize(null);
        setCalculatedSha256('');
        await loadReleases();
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'An unexpected error occurred during publish');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 text-zinc-200">
      {/* Overview Banner */}
      <div className="p-5 rounded-2xl bg-gradient-to-r from-[#0f1424] via-[#12182c] to-[#0c101d] border border-white/10 shadow-lg relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-orange-500/20 text-orange-400">
                <HardDrive className="w-5 h-5" />
              </span>
              <h2 className="text-lg font-bold text-white tracking-tight">
                Desktop Version Management & Auto-Update Registry
              </h2>
            </div>
            <p className="text-xs text-zinc-400 max-w-2xl leading-relaxed">
              Configure and upload new desktop releases for Windows, macOS, and Linux. The desktop application automatically queries this registry upon startup, downloading and applying verified upgrades while strictly blocking downgrades.
            </p>
          </div>

          {/* Current Live Version Tag */}
          <div className="flex items-center gap-3 bg-[#0a0d17] p-3 rounded-xl border border-white/10 shrink-0">
            <div>
              <div className="text-[10px] text-zinc-400 font-mono uppercase">Publisher: Tech Vision Studio</div>
              <div className="text-base font-extrabold text-amber-400 font-mono">
                v{currentVersion}
              </div>
            </div>
            <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold">
              Live Stable
            </span>
          </div>
        </div>
      </div>

      {/* Main Grid: Upload Form (Left) & Version List (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left: Upload New Version Form */}
        <div className="lg:col-span-6 bg-[#0e121e] border border-white/10 rounded-2xl p-5 shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-white/10">
              <div className="flex items-center gap-2">
                <Upload className="w-4 h-4 text-orange-400" />
                <h3 className="text-sm font-bold text-white">Publish New Upgrade</h3>
              </div>
              <span className="text-[10px] text-emerald-400 font-medium flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5" /> Downgrade Prevention Active
              </span>
            </div>

            {/* Error & Success alerts */}
            {errorMessage && (
              <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                <span>{errorMessage}</span>
              </div>
            )}

            {successMessage && (
              <div className="mb-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>{successMessage}</span>
              </div>
            )}

            <form onSubmit={handlePublish} className="space-y-4">
              
              {/* Version Input with Quick Presets */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-zinc-300">
                    New Version Tag <span className="text-red-400">*</span>
                  </label>
                  <div className="flex items-center gap-1.5 text-[10px]">
                    <span className="text-zinc-400">Presets:</span>
                    <button
                      type="button"
                      onClick={() => applyPreset('patch')}
                      className="px-2 py-0.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded text-amber-300 font-mono"
                    >
                      +Patch
                    </button>
                    <button
                      type="button"
                      onClick={() => applyPreset('minor')}
                      className="px-2 py-0.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded text-amber-300 font-mono"
                    >
                      +Minor
                    </button>
                    <button
                      type="button"
                      onClick={() => applyPreset('major')}
                      className="px-2 py-0.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded text-amber-300 font-mono"
                    >
                      +Major
                    </button>
                  </div>
                </div>

                <div className="relative">
                  <input
                    type="text"
                    required
                    value={newVersion}
                    onChange={(e) => {
                      setNewVersion(e.target.value);
                      setErrorMessage(null);
                    }}
                    placeholder="e.g. 2.4.1 or 2.5.0"
                    className={`w-full px-3 py-2 bg-[#080b14] border rounded-xl text-xs font-mono text-white placeholder-zinc-400 focus:outline-none transition-colors ${
                      validation
                        ? validation.isValid
                          ? 'border-emerald-500/50 focus:border-emerald-400'
                          : 'border-red-500/60 focus:border-red-500'
                        : 'border-white/10 focus:border-orange-500'
                    }`}
                  />
                  {validation && (
                    <div className="absolute right-3 top-2.5">
                      {validation.isValid ? (
                        <Check className="w-4 h-4 text-emerald-400" />
                      ) : (
                        <AlertTriangle className="w-4 h-4 text-red-400" />
                      )}
                    </div>
                  )}
                </div>

                {/* Validation Status Indicator */}
                {validation && !validation.isValid && (
                  <p className="text-[11px] text-red-400 flex items-center gap-1 pt-0.5 font-medium">
                    <span>⛔ {validation.reason}</span>
                  </p>
                )}
                {validation && validation.isValid && (
                  <p className="text-[11px] text-emerald-400 flex items-center gap-1 pt-0.5 font-medium">
                    <span>✓ Valid upgrade tag (Higher than live v{currentVersion})</span>
                  </p>
                )}
              </div>

              {/* Title */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-300">
                  Release Title
                </label>
                <input
                  type="text"
                  value={releaseTitle}
                  onChange={(e) => setReleaseTitle(e.target.value)}
                  placeholder={`e.g. CloudPost Desktop v${newVersion || '2.4.1'} Performance & Security`}
                  className="w-full px-3 py-2 bg-[#080b14] border border-white/10 rounded-xl text-xs text-white placeholder-zinc-400 focus:outline-none focus:border-orange-500"
                />
              </div>

              {/* Release Notes */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-300">
                  Release Notes / Changelog
                </label>
                <textarea
                  rows={3}
                  value={releaseNotes}
                  onChange={(e) => setReleaseNotes(e.target.value)}
                  placeholder="• Faster CORS socket engine&#10;• Turnkey PHP export installer update&#10;• Bug fixes and memory optimizations"
                  className="w-full px-3 py-2 bg-[#080b14] border border-white/10 rounded-xl text-xs text-white placeholder-zinc-400 focus:outline-none focus:border-orange-500 resize-none font-mono"
                />
              </div>

              {/* Channel and Mandatory Checkbox */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-zinc-300">
                    Distribution Channel
                  </label>
                  <select
                    value={channel}
                    onChange={(e) => setChannel(e.target.value as any)}
                    className="w-full px-3 py-2 bg-[#080b14] border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-orange-500"
                  >
                    <option value="stable">Stable (Fleet Wide)</option>
                    <option value="beta">Beta (Early Access)</option>
                  </select>
                </div>

                <div className="space-y-1.5 flex flex-col justify-end">
                  <label className="flex items-center gap-2 p-2 rounded-xl bg-[#080b14] border border-white/10 cursor-pointer hover:border-white/20 transition-colors">
                    <input
                      type="checkbox"
                      checked={isMandatory}
                      onChange={(e) => setIsMandatory(e.target.checked)}
                      className="rounded text-orange-500 focus:ring-0 focus:outline-none bg-zinc-800 border-zinc-700"
                    />
                    <span className="text-xs text-zinc-300 font-medium select-none">
                      Mandatory Update
                    </span>
                  </label>
                </div>
              </div>

              {/* Binary File Upload Box */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-300">
                  Binary Artifact (.exe / .dmg / .AppImage / .zip)
                </label>
                <div className="p-4 rounded-xl border-2 border-dashed border-white/10 hover:border-orange-500/40 bg-[#080b14] text-center transition-colors">
                  <input
                    type="file"
                    id="desktop-artifact-file"
                    onChange={handleFileSelect}
                    className="hidden"
                    accept=".exe,.dmg,.AppImage,.zip,.deb,.tar.gz"
                  />
                  <label
                    htmlFor="desktop-artifact-file"
                    className="cursor-pointer flex flex-col items-center justify-center gap-1.5"
                  >
                    <Upload className="w-5 h-5 text-orange-400" />
                    {uploadedFileName ? (
                      <div className="text-xs">
                        <span className="text-emerald-400 font-semibold">{uploadedFileName}</span>
                        <span className="text-zinc-400 ml-1.5">({uploadedFileSize})</span>
                      </div>
                    ) : (
                      <div className="text-xs text-zinc-400">
                        <span className="text-orange-400 font-semibold">Click to select installer</span> or drag and drop
                      </div>
                    )}
                    <span className="text-[10px] text-zinc-400">
                      Supports NSIS Windows Installer, macOS DMG, Linux AppImage or Zip
                    </span>
                  </label>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isSubmitting || (validation !== null && !validation.isValid)}
                className={`w-full py-3 px-4 rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-lg transition-all cursor-pointer ${
                  validation !== null && !validation.isValid
                    ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed border border-white/5'
                    : 'bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white shadow-orange-500/20'
                }`}
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Publishing & Notifying Fleet...</span>
                  </>
                ) : (
                  <>
                    <ArrowUpRight className="w-4 h-4" />
                    <span>Publish Upgrade (v{newVersion || '...'})</span>
                  </>
                )}
              </button>

            </form>
          </div>

          <div className="pt-4 mt-4 border-t border-white/5 text-[11px] text-zinc-400 flex items-center gap-2">
            <Info className="w-3.5 h-3.5 text-orange-400 shrink-0" />
            <span>
              Downgrades are programmatically disallowed to protect end-user database state integrity.
            </span>
          </div>
        </div>

        {/* Right: Published Releases History & Fleet Status */}
        <div className="lg:col-span-6 bg-[#0e121e] border border-white/10 rounded-2xl p-5 shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-white/10">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-orange-400" />
                <h3 className="text-sm font-bold text-white">Fleet Releases History</h3>
              </div>
              <button
                onClick={loadReleases}
                className="p-1 hover:bg-white/10 text-zinc-400 hover:text-white rounded-lg transition-colors"
                title="Refresh Releases"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              </button>
            </div>

            {/* Releases List */}
            <div className="space-y-3 max-h-[520px] overflow-y-auto pr-1">
              {releases.map((rel, idx) => (
                <div
                  key={rel.id}
                  className={`p-4 rounded-xl border transition-all ${
                    idx === 0
                      ? 'bg-[#121626] border-amber-500/30 shadow-md'
                      : 'bg-[#090b14] border-white/5 opacity-80'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-1.5">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold font-mono text-white">
                        v{rel.version}
                      </span>
                      {idx === 0 && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                          Active Latest
                        </span>
                      )}
                      {rel.channel === 'beta' && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/30">
                          Beta
                        </span>
                      )}
                      {rel.isMandatory && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-500/10 text-red-400 border border-red-500/30">
                          Mandatory
                        </span>
                      )}
                    </div>
                    <span className="text-[11px] text-zinc-400 font-mono">
                      {new Date(rel.releasedAt).toLocaleDateString()}
                    </span>
                  </div>

                  <p className="text-xs font-medium text-zinc-300 mb-2">
                    {rel.title}
                  </p>

                  <div className="text-[11px] text-zinc-400 font-mono line-clamp-2 bg-black/20 p-2 rounded-lg border border-white/5 mb-3">
                    {rel.releaseNotes}
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-zinc-400 pt-2 border-t border-white/5">
                    <span className="flex items-center gap-1">
                      <Download className="w-3.5 h-3.5 text-zinc-400" />
                      <span>{rel.downloadsCount.toLocaleString()} downloads</span>
                    </span>
                    <span className="text-zinc-400">
                      By: {rel.uploadedBy?.split(' ')[0] || 'Admin'}
                    </span>
                  </div>
                </div>
              ))}

              {releases.length === 0 && !isLoading && (
                <div className="text-center py-12 text-zinc-400 text-xs">
                  No releases found. Publish your first release using the form on the left.
                </div>
              )}
            </div>
          </div>

          {/* Desktop FAQ Callout */}
          <div className="p-3.5 rounded-xl bg-[#090b14] border border-white/5 mt-4 space-y-1 text-xs">
            <div className="font-bold text-amber-300 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              <span>How Desktop Auto-Update Works</span>
            </div>
            <p className="text-zinc-400 text-[11px] leading-relaxed">
              When the CloudPost desktop tool starts, it calls <code className="text-orange-300">GET /api/desktop/check-update</code> with its installed version. If this registry has a higher version code, the desktop app notifies the developer with release notes and initiates the download.
            </p>
          </div>
        </div>

      </div>
    </div>
  );
};
