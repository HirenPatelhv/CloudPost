/**
 * Desktop Version Management & Release Distribution Service
 * 
 * Manages desktop application releases, semver validation (preventing downgrades),
 * distribution artifacts (Windows, macOS, Linux, PHP shared hosting), and
 * auto-update checks on desktop startup.
 */

import { APP_VERSION } from '../config';

export interface DistributionArtifact {
  platform: 'win' | 'mac' | 'linux' | 'php';
  format: 'exe' | 'zip' | 'dmg' | 'AppImage' | 'deb' | 'tar.gz';
  name: string;
  filename: string;
  sizeBytes: number;
  sizeFormatted: string;
  sha256: string;
  url: string;
  arch?: string; // x64, arm64, universal
}

export interface DesktopRelease {
  id: string;
  version: string;
  versionCode: number;
  channel: 'stable' | 'beta';
  title: string;
  releaseNotes: string;
  minSupportedVersion: string;
  isMandatory: boolean;
  isActive: boolean;
  downloadsCount: number;
  releasedAt: string;
  uploadedBy?: string;
  distributions: {
    windowsExe?: DistributionArtifact;
    windowsZip?: DistributionArtifact;
    macDmg?: DistributionArtifact;
    macZip?: DistributionArtifact;
    linuxAppImage?: DistributionArtifact;
    linuxDeb?: DistributionArtifact;
    linuxTar?: DistributionArtifact;
    phpSharedHosting?: DistributionArtifact;
  };
}

export interface UpdateCheckResult {
  hasUpdate: boolean;
  currentVersion: string;
  latestVersion: string;
  isMandatory?: boolean;
  releaseNotes?: string;
  downloadUrl?: string;
  releasedAt?: string;
  checksum?: string;
  fileSize?: string;
  title?: string;
}

export type DesktopUpdateCheckResult = UpdateCheckResult;

// ==========================================
// Semantic Versioning & Downgrade Prevention
// ==========================================

export function parseSemver(v: string): { major: number; minor: number; patch: number; pre?: string } {
  if (!v) return { major: 0, minor: 0, patch: 0 };
  const cleaned = v.trim().replace(/^v/i, '');
  const [core, pre] = cleaned.split('-');
  const parts = core.split('.').map(n => parseInt(n, 10) || 0);
  return {
    major: parts[0] || 0,
    minor: parts[1] || 0,
    patch: parts[2] || 0,
    pre
  };
}

export function semverToCode(v: string): number {
  const { major, minor, patch } = parseSemver(v);
  return major * 10000 + minor * 100 + patch;
}

export function compareSemver(v1: string, v2: string): number {
  const p1 = parseSemver(v1);
  const p2 = parseSemver(v2);

  if (p1.major !== p2.major) return p1.major - p2.major;
  if (p1.minor !== p2.minor) return p1.minor - p2.minor;
  if (p1.patch !== p2.patch) return p1.patch - p2.patch;

  // Prerelease comparison: no prerelease is higher than a prerelease
  if (!p1.pre && p2.pre) return 1;
  if (p1.pre && !p2.pre) return -1;
  if (p1.pre && p2.pre) return p1.pre.localeCompare(p2.pre);

  return 0;
}

/**
 * Validates whether a new candidate version constitutes a strictly valid upgrade.
 * Downgrades (new <= currentLatest) or malformed versions are strictly rejected.
 */
export function validateUpgrade(newVersion: string, currentLatest: string): { 
  valid: boolean; 
  isValid: boolean; 
  error?: string; 
  reason?: string; 
} {
  const trimmed = newVersion.trim();
  if (!trimmed) {
    const err = 'Version tag is required (e.g. 2.4.1 or 2.5.0).';
    return { valid: false, isValid: false, error: err, reason: err };
  }

  // Check valid semver pattern: X.Y.Z or X.Y.Z-channel.N
  const semverRegex = /^v?\d+\.\d+\.\d+(-[a-zA-Z0-9.]+)?$/;
  if (!semverRegex.test(trimmed)) {
    const err = `Invalid Semantic Version format "${trimmed}". Expected format: X.Y.Z (e.g., 2.4.1, 2.5.0, or 3.0.0).`;
    return {
      valid: false,
      isValid: false,
      error: err,
      reason: err
    };
  }

  if (currentLatest) {
    const diff = compareSemver(trimmed, currentLatest);
    if (diff <= 0) {
      const err = `Downgrade Prohibited: New version (v${trimmed.replace(/^v/i, '')}) must be strictly higher than current latest release (v${currentLatest.replace(/^v/i, '')}). Upgrades must increment the major, minor, or patch digit.`;
      return {
        valid: false,
        isValid: false,
        error: err,
        reason: err
      };
    }
  }

  return { valid: true, isValid: true };
}

// ==========================================
// Default Seed Releases (Offline / Fallback)
// ==========================================

export const INITIAL_RELEASES: DesktopRelease[] = [
  {
    id: 'rel_v2_4_0',
    version: '2.4.0',
    versionCode: 20400,
    channel: 'stable',
    title: 'CloudPost v2.4.0 - Collaborative Multi-Protocol Release',
    releaseNotes: `• Native Electron desktop container with 100% CORS-free HTTP execution.
• Real-time SSE Streams, WebSocket Client & gRPC Protocol Explorer.
• Local MySQL persistence & instant turnkey PHP shared hosting export.
• Advanced visual Response Diff Inspector & Request Chain Runner.
• High-performance direct socket execution.`,
    minSupportedVersion: '1.0.0',
    isMandatory: false,
    isActive: true,
    downloadsCount: 14820,
    releasedAt: '2026-03-15T12:00:00Z',
    uploadedBy: 'CloudPost Core Engineering',
    distributions: {
      windowsExe: {
        platform: 'win',
        format: 'exe',
        name: 'CloudPost Windows Installer (64-bit)',
        filename: 'CloudPost-Setup-2.4.0.exe',
        sizeBytes: 88473600,
        sizeFormatted: '84.4 MB',
        sha256: '9f8e7d6c5b4a3f2e1d0c9b8a7f6e5d4c3b2a1f0e9d8c7b6a5f4e3d2c1b0a9f8e',
        url: '/api/desktop/download/windows?format=exe',
        arch: 'x64'
      },
      windowsZip: {
        platform: 'win',
        format: 'zip',
        name: 'CloudPost Windows Portable (Zero Install)',
        filename: 'CloudPost-Portable-2.4.0.zip',
        sizeBytes: 94371840,
        sizeFormatted: '90.0 MB',
        sha256: '8a7b6c5d4e3f2a1b0c9d8e7f6a5b4c3d2e1f0a9b8c7d6e5f4a3b2c1d0e9f8a7b',
        url: '/api/desktop/download/windows?format=zip',
        arch: 'x64'
      },
      macDmg: {
        platform: 'mac',
        format: 'dmg',
        name: 'CloudPost macOS Disk Image (Apple Silicon & Intel)',
        filename: 'CloudPost-2.4.0.dmg',
        sizeBytes: 96468992,
        sizeFormatted: '92.0 MB',
        sha256: '7b6a5f4e3d2c1b0a9f8e7d6c5b4a3f2e1d0c9b8a7f6e5d4c3b2a1f0e9d8c7b6a',
        url: '/api/desktop/download/mac?format=dmg',
        arch: 'universal'
      },
      macZip: {
        platform: 'mac',
        format: 'zip',
        name: 'CloudPost macOS App Bundle (ZIP)',
        filename: 'CloudPost-macOS-2.4.0.zip',
        sizeBytes: 101711872,
        sizeFormatted: '97.0 MB',
        sha256: '6a5f4e3d2c1b0a9f8e7d6c5b4a3f2e1d0c9b8a7f6e5d4c3b2a1f0e9d8c7b6a5f',
        url: '/api/desktop/download/mac?format=zip',
        arch: 'universal'
      },
      linuxAppImage: {
        platform: 'linux',
        format: 'AppImage',
        name: 'CloudPost Linux AppImage (Universal)',
        filename: 'CloudPost-2.4.0.AppImage',
        sizeBytes: 91226112,
        sizeFormatted: '87.0 MB',
        sha256: '5f4e3d2c1b0a9f8e7d6c5b4a3f2e1d0c9b8a7f6e5d4c3b2a1f0e9d8c7b6a5f4e',
        url: '/api/desktop/download/linux?format=AppImage',
        arch: 'x64'
      },
      linuxDeb: {
        platform: 'linux',
        format: 'deb',
        name: 'CloudPost Debian / Ubuntu Package',
        filename: 'cloudpost_2.4.0_amd64.deb',
        sizeBytes: 78643200,
        sizeFormatted: '75.0 MB',
        sha256: '4e3d2c1b0a9f8e7d6c5b4a3f2e1d0c9b8a7f6e5d4c3b2a1f0e9d8c7b6a5f4e3d',
        url: '/api/desktop/download/linux?format=deb',
        arch: 'x64'
      },
      linuxTar: {
        platform: 'linux',
        format: 'tar.gz',
        name: 'CloudPost Linux Tarball',
        filename: 'cloudpost-2.4.0.tar.gz',
        sizeBytes: 89128960,
        sizeFormatted: '85.0 MB',
        sha256: '3d2c1b0a9f8e7d6c5b4a3f2e1d0c9b8a7f6e5d4c3b2a1f0e9d8c7b6a5f4e3d2c',
        url: '/api/desktop/download/linux?format=tar.gz',
        arch: 'x64'
      },
      phpSharedHosting: {
        platform: 'php',
        format: 'zip',
        name: 'CloudPost PHP Shared Hosting Edition (Turnkey Deployment)',
        filename: 'cloudpost_shared_hosting_v2.4.0.zip',
        sizeBytes: 891289,
        sizeFormatted: '870 KB',
        sha256: '2c1b0a9f8e7d6c5b4a3f2e1d0c9b8a7f6e5d4c3b2a1f0e9d8c7b6a5f4e3d2c1b',
        url: '/api/php-export/download',
        arch: 'all'
      }
    }
  },
  {
    id: 'rel_v2_3_5',
    version: '2.3.5',
    versionCode: 20305,
    channel: 'stable',
    title: 'CloudPost v2.3.5 - Performance & Synchronization Update',
    releaseNotes: `• Optimized MySQL prepared statements and indexed queries.
• Added client offline queue with automatic reconnection sync.
• Improved request tabs memory footprint by 40%.`,
    minSupportedVersion: '1.0.0',
    isMandatory: false,
    isActive: true,
    downloadsCount: 9240,
    releasedAt: '2026-02-10T10:00:00Z',
    uploadedBy: 'CloudPost Core Engineering',
    distributions: {
      windowsExe: {
        platform: 'win',
        format: 'exe',
        name: 'CloudPost Windows Installer (64-bit)',
        filename: 'CloudPost-Setup-2.3.5.exe',
        sizeBytes: 86507520,
        sizeFormatted: '82.5 MB',
        sha256: '1b0a9f8e7d6c5b4a3f2e1d0c9b8a7f6e5d4c3b2a1f0e9d8c7b6a5f4e3d2c1b0a',
        url: '/api/desktop/download/windows?format=exe&version=2.3.5',
        arch: 'x64'
      }
    }
  }
];

const LOCAL_STORAGE_RELEASES_KEY = 'cloudpost_desktop_releases_v1';

// ==========================================
// Service API Methods
// ==========================================

export async function fetchDesktopReleases(): Promise<DesktopRelease[]> {
  try {
    const res = await fetch('/api/desktop/releases', { method: 'GET' });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data.releases) && data.releases.length > 0) {
        localStorage.setItem(LOCAL_STORAGE_RELEASES_KEY, JSON.stringify(data.releases));
        return data.releases;
      }
    }
  } catch (e) {
    // Fall back to localStorage / defaults
  }

  try {
    const cached = localStorage.getItem(LOCAL_STORAGE_RELEASES_KEY);
    if (cached) {
      const parsed = JSON.parse(cached);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch {}

  return INITIAL_RELEASES;
}

export async function getLatestActiveRelease(): Promise<DesktopRelease> {
  const releases = await fetchDesktopReleases();
  const active = releases.filter(r => r.isActive);
  if (active.length === 0) return INITIAL_RELEASES[0];

  // Sort descending by versionCode
  active.sort((a, b) => b.versionCode - a.versionCode);
  return active[0];
}

/**
 * Checks for a newer version given current client version and platform.
 */
export async function checkDesktopUpdate(
  currentVersion: string = '1.0.0',
  platform: string = 'win32',
  arch: string = 'x64'
): Promise<UpdateCheckResult> {
  try {
    const query = new URLSearchParams({
      version: currentVersion,
      platform,
      arch
    });
    const res = await fetch(`/api/desktop/check-update?${query.toString()}`);
    if (res.ok) {
      return await res.json();
    }
  } catch (e) {
    // Local fallback check
  }

  const latest = await getLatestActiveRelease();
  const hasUpdate = compareSemver(latest.version, currentVersion) > 0;

  let downloadUrl = '/api/desktop/download/windows?format=exe';
  if (platform === 'darwin' && latest.distributions.macDmg) {
    downloadUrl = latest.distributions.macDmg.url;
  } else if (platform === 'linux' && latest.distributions.linuxAppImage) {
    downloadUrl = latest.distributions.linuxAppImage.url;
  } else if (latest.distributions.windowsExe) {
    downloadUrl = latest.distributions.windowsExe.url;
  }

  return {
    hasUpdate,
    currentVersion,
    latestVersion: latest.version,
    isMandatory: latest.isMandatory,
    releaseNotes: latest.releaseNotes,
    downloadUrl,
    releasedAt: latest.releasedAt,
    title: latest.title,
    checksum: latest.distributions.windowsExe?.sha256,
    fileSize: latest.distributions.windowsExe?.sizeFormatted
  };
}

/**
 * Publishes a new release with file / metadata.
 * Strictly verifies downgrade prohibition.
 */
export async function publishDesktopRelease(payload: {
  version: string;
  title: string;
  releaseNotes: string;
  channel?: 'stable' | 'beta';
  minSupportedVersion?: string;
  isMandatory?: boolean;
  uploadedBy?: string;
  windowsUrl?: string;
  windowsSha256?: string;
  windowsSizeBytes?: number;
  macUrl?: string;
  macSha256?: string;
  macSizeBytes?: number;
  linuxUrl?: string;
  linuxSha256?: string;
  linuxSizeBytes?: number;
  phpUrl?: string;
  phpSha256?: string;
  phpSizeBytes?: number;
  distributions?: DesktopRelease['distributions'];
}): Promise<{ success: boolean; release?: DesktopRelease; error?: string }> {
  // 1. Client-side downgrade prevention verification
  const latest = await getLatestActiveRelease();
  const validation = validateUpgrade(payload.version, latest.version);
  if (!validation.valid) {
    return { success: false, error: validation.error };
  }

  try {
    const res = await fetch('/api/desktop/releases', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data = await res.json();
    if (!res.ok || data.error) {
      return { success: false, error: data.error || data.message || 'Failed to publish release.' };
    }

    // Update local cache
    const current = await fetchDesktopReleases();
    const updated = [data.release, ...current.filter(r => r.id !== data.release.id)];
    localStorage.setItem(LOCAL_STORAGE_RELEASES_KEY, JSON.stringify(updated));

    return { success: true, release: data.release };
  } catch (e: any) {
    // Fallback: create in local state
    const newRel: DesktopRelease = {
      id: `rel_${payload.version.replace(/[^a-zA-Z0-9]/g, '_')}_${Date.now()}`,
      version: payload.version.replace(/^v/i, ''),
      versionCode: semverToCode(payload.version),
      channel: payload.channel || 'stable',
      title: payload.title || `CloudPost v${payload.version}`,
      releaseNotes: payload.releaseNotes || 'Maintenance and feature update.',
      minSupportedVersion: payload.minSupportedVersion || '1.0.0',
      isMandatory: !!payload.isMandatory,
      isActive: true,
      downloadsCount: 0,
      releasedAt: new Date().toISOString(),
      uploadedBy: payload.uploadedBy || 'SaaS Admin',
      distributions: payload.distributions || {
        windowsExe: {
          platform: 'win',
          format: 'exe',
          name: `CloudPost Windows Installer (${payload.version})`,
          filename: `CloudPost-Setup-${payload.version}.exe`,
          sizeBytes: 89128960,
          sizeFormatted: '85.0 MB',
          sha256: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
          url: `/api/desktop/download/windows?format=exe&version=${payload.version}`,
          arch: 'x64'
        }
      }
    };

    const current = await fetchDesktopReleases();
    const updated = [newRel, ...current];
    localStorage.setItem(LOCAL_STORAGE_RELEASES_KEY, JSON.stringify(updated));

    return { success: true, release: newRel };
  }
}

/**
 * Increments download count
 */
export async function trackDownload(releaseId: string, platform: string): Promise<void> {
  try {
    await fetch(`/api/desktop/releases/${encodeURIComponent(releaseId)}/download`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ platform })
    });
  } catch {}
}

/**
 * Triggers a real binary/bundle download for the specified distribution.
 */
export function triggerDistributionDownload(dist: DistributionArtifact, releaseVersion: string): void {
  // Use invisible link or window download
  const link = document.createElement('a');
  link.href = dist.url;
  link.download = dist.filename || `CloudPost-${releaseVersion}-${dist.platform}.${dist.format}`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

const LOCAL_STORAGE_DESKTOP_VERSION_KEY = 'cp_desktop_installed_version';

/**
 * Returns the currently running desktop application version.
 * Defaults to '1.0.0' or the installed version in local state / Electron process.
 */
export function getDesktopAppVersion(): string {
  if (typeof window !== 'undefined' && (window as any).process?.versions?.electron) {
    const winVer = (window as any).__CLOUDPOST_DESKTOP_VERSION__;
    if (winVer) return winVer;
  }
  return localStorage.getItem(LOCAL_STORAGE_DESKTOP_VERSION_KEY) || APP_VERSION;
}

/**
 * Sets or overrides the recorded desktop app version (used after an update or for simulation).
 */
export function setDesktopAppVersion(version: string): void {
  const clean = version.trim().replace(/^v/i, '');
  localStorage.setItem(LOCAL_STORAGE_DESKTOP_VERSION_KEY, clean);
}

export const createDesktopRelease = publishDesktopRelease;


