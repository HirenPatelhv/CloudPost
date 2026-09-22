/**
 * Application Base URL & Central Version Configuration
 * Primary domain: https://cloudpost.techvisionstudio.in
 * 
 * In standard web/PWA deployments on the domain, empty string allows seamless
 * same-origin relative paths (e.g. /api/db/save).
 * For standalone desktop wrappers or cross-origin API hosts, set VITE_API_BASE_URL.
 */
export const APP_VERSION = '2.4.0';
export const APP_VERSION_DISPLAY = `v${APP_VERSION}`;

export const APP_BASE_URL: string = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');

export function getApiUrl(path: string): string {
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  // In browser runtime, always use relative path so requests hit the active host / Express server without CORS errors
  if (typeof window !== 'undefined' && window.location.protocol.startsWith('http')) {
    return cleanPath;
  }
  return `${APP_BASE_URL}${cleanPath}`;
}
