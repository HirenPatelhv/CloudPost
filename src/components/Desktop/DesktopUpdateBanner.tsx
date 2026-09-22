import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Download,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  X,
  RefreshCw,
  ShieldCheck,
  Zap,
  HardDrive
} from 'lucide-react';
import {
  checkDesktopUpdate,
  DesktopUpdateCheckResult,
  triggerDistributionDownload,
  validateUpgrade,
  getDesktopAppVersion,
  setDesktopAppVersion
} from '../../services/desktopVersionService';
import { isDesktopTool } from '../../services/platformService';

interface DesktopUpdateBannerProps {
  onDismiss?: () => void;
}

export const DesktopUpdateBanner: React.FC<DesktopUpdateBannerProps> = ({ onDismiss }) => {
  const [updateInfo, setUpdateInfo] = useState<DesktopUpdateCheckResult | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [isReadyToRestart, setIsReadyToRestart] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    // Only execute inside Desktop Tool
    if (!isDesktopTool()) return;

    performUpdateCheck();
  }, []);

  const performUpdateCheck = async () => {
    setIsChecking(true);
    setErrorMessage(null);
    try {
      const currentVer = getDesktopAppVersion();
      const result = await checkDesktopUpdate(currentVer);

      if (result.hasUpdate) {
        // Enforce downgrade protection: verify latest is strictly higher than current
        const val = validateUpgrade(result.latestVersion, currentVer);
        if (val.isValid) {
          setUpdateInfo(result);
        } else {
          console.warn('Update check detected non-upgrade version:', result.latestVersion);
        }
      }
    } catch (e: any) {
      console.warn('Desktop auto-update check error:', e.message);
    } finally {
      setIsChecking(false);
    }
  };

  const handleDownloadAndApply = async () => {
    if (!updateInfo) return;

    setIsDownloading(true);
    setDownloadProgress(10);
    setErrorMessage(null);

    try {
      // Animated progressive download simulation
      const interval = setInterval(() => {
        setDownloadProgress(prev => {
          if (prev >= 90) {
            clearInterval(interval);
            return 95;
          }
          return prev + 20;
        });
      }, 350);

      // Trigger download
      if (updateInfo.downloadUrl) {
        const a = document.createElement('a');
        a.href = updateInfo.downloadUrl;
        a.download = `CloudPost-Update-${updateInfo.latestVersion}.exe`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      }

      setTimeout(() => {
        clearInterval(interval);
        setDownloadProgress(100);
        setIsDownloading(false);
        setIsReadyToRestart(true);
      }, 2000);
    } catch (err: any) {
      setIsDownloading(false);
      setErrorMessage('Download failed: ' + err.message);
    }
  };

  const handleRestartApp = () => {
    if (updateInfo) {
      // Apply the upgrade to local storage
      setDesktopAppVersion(updateInfo.latestVersion);
    }
    // Reload application window
    window.location.reload();
  };

  if (!isDesktopTool() || !updateInfo || isDismissed) return null;

  return (
    <div className="bg-gradient-to-r from-orange-600/95 via-amber-600/95 to-orange-700/95 text-white px-4 py-2.5 shadow-xl border-b border-white/20 z-50 transition-all">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        
        {/* Left message */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center shrink-0">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-black tracking-wide uppercase bg-black/30 px-2 py-0.5 rounded font-mono">
                Desktop Update Available
              </span>
              <span className="text-xs font-bold text-amber-200">
                v{updateInfo.latestVersion}
              </span>
              <span className="text-[10px] text-white/80 font-mono">
                (Installed: v{updateInfo.currentVersion})
              </span>
            </div>
            <p className="text-[11px] text-white/90 truncate max-w-xl mt-0.5">
              {updateInfo.title || 'New performance enhancements and CORS-free socket engine updates are ready.'}
            </p>
          </div>
        </div>

        {/* Right CTA Actions */}
        <div className="flex items-center gap-2 shrink-0">
          {isDownloading ? (
            <div className="flex items-center gap-2 bg-black/30 px-3 py-1.5 rounded-lg text-xs font-mono">
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-amber-200" />
              <span>Downloading update {downloadProgress}%...</span>
            </div>
          ) : isReadyToRestart ? (
            <button
              onClick={handleRestartApp}
              className="px-3 py-1.5 bg-white text-orange-950 hover:bg-zinc-100 rounded-lg text-xs font-bold shadow transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>Restart & Apply v{updateInfo.latestVersion}</span>
            </button>
          ) : (
            <button
              onClick={handleDownloadAndApply}
              className="px-3 py-1.5 bg-black/40 hover:bg-black/60 border border-white/30 text-white rounded-lg text-xs font-bold shadow transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download & Update Now</span>
            </button>
          )}

          {!updateInfo.isMandatory && !isDownloading && (
            <button
              onClick={() => {
                setIsDismissed(true);
                onDismiss?.();
              }}
              className="p-1 text-white/70 hover:text-white hover:bg-black/20 rounded transition-colors"
              title="Dismiss"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

      </div>

      {/* Progress Bar when active */}
      {isDownloading && (
        <div className="w-full bg-black/30 h-1 rounded-full mt-2 overflow-hidden">
          <div
            className="bg-white h-full transition-all duration-300"
            style={{ width: `${downloadProgress}%` }}
          />
        </div>
      )}
    </div>
  );
};
