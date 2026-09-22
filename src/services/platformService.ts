/**
 * Platform Detection & Runtime Context Service
 * 
 * Determines whether the app is executing as:
 * 1. Web Application (React browser web app / PWA / PHP web app)
 * 2. Standalone Desktop Tool (Electron Desktop App / native desktop window)
 * 
 * SaaS User Features (Customer Hub, Billing, Usage Reports, SaaS tiers) are
 * strictly restricted to Web platforms (PHP & React web), and are excluded
 * from desktop tools.
 */

export function isDesktopTool(): boolean {
  if (typeof window === 'undefined') return false;

  // 1. Check Electron runtime process versions
  if ((window as any).process && (window as any).process.versions && (window as any).process.versions.electron) {
    return true;
  }

  // 2. Check User Agent strings
  if (navigator.userAgent && (navigator.userAgent.includes('Electron') || navigator.userAgent.includes('CloudPostDesktop'))) {
    return true;
  }

  // 3. Explicit URL parameter override for desktop wrappers (?platform=desktop or ?app_mode=desktop)
  if (typeof window.location !== 'undefined') {
    const params = new URLSearchParams(window.location.search);
    if (params.get('app_mode') === 'desktop' || params.get('mode') === 'desktop' || params.get('platform') === 'desktop') {
      return true;
    }
  }

  // 4. Global window flag or bridge API
  if ((window as any).__IS_DESKTOP_TOOL__ || (window as any).isDesktop || (window as any).electronAPI) {
    return true;
  }

  return false;
}

export function getDesktopAPI(): any | null {
  if (typeof window === 'undefined') return null;
  return (window as any).electronAPI || null;
}

