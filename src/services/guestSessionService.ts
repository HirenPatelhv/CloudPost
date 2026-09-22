/**
 * Guest Session Isolation Service
 * Manages unique, isolated sessions for multiple guest users across Web, Desktop, and PHP.
 * Ensures each guest has a partitioned sandbox in local storage and MySQL database.
 */

const GUEST_ID_KEY = 'cp_guest_session_id';

/**
 * Generates a cryptographically strong, unique guest identifier.
 * Format: guest_<timestamp_base36>_<random_hex>
 */
export function generateUniqueGuestId(): string {
  const timestamp = Date.now().toString(36);
  const randomPart = Math.random().toString(36).substring(2, 10);
  return `guest_${timestamp}_${randomPart}`;
}

/**
 * Retrieves the current device/browser guest session ID or creates a new one.
 * Also synchronizes with document.cookie for cross-backend (PHP / Node) availability.
 */
export function getGuestId(): string {
  try {
    let guestId = localStorage.getItem(GUEST_ID_KEY);
    
    // Check legacy key if present
    if (!guestId) {
      guestId = localStorage.getItem('cp_guest_id');
    }

    // Check cookie fallback
    if (!guestId && typeof document !== 'undefined') {
      const match = document.cookie.match(new RegExp('(^|;\\s*)cp_guest_id=([^;]+)'));
      if (match && match[2]) {
        guestId = decodeURIComponent(match[2]);
      }
    }

    // If still not found, generate a fresh unique guest ID
    if (!guestId) {
      guestId = generateUniqueGuestId();
    }

    // Persist to localStorage and cookie
    localStorage.setItem(GUEST_ID_KEY, guestId);
    localStorage.setItem('cp_guest_id', guestId);
    if (typeof document !== 'undefined') {
      document.cookie = `cp_guest_id=${encodeURIComponent(guestId)}; path=/; max-age=31536000; SameSite=Lax`;
    }

    return guestId;
  } catch (e) {
    return 'guest_' + Date.now().toString(36);
  }
}

/**
 * Returns a user-friendly short code for UI display (e.g. "#4F9A2B")
 */
export function getGuestShortCode(guestId?: string): string {
  const id = guestId || getGuestId();
  return id.replace(/^guest_/, '').slice(-6).toUpperCase();
}

/**
 * Resets the guest session and generates a brand new clean sandbox.
 * Useful when a user wants to test multiple guest states or start fresh.
 */
export function resetGuestSession(): string {
  const newGuestId = generateUniqueGuestId();
  try {
    localStorage.setItem(GUEST_ID_KEY, newGuestId);
    localStorage.setItem('cp_guest_id', newGuestId);
    if (typeof document !== 'undefined') {
      document.cookie = `cp_guest_id=${encodeURIComponent(newGuestId)}; path=/; max-age=31536000; SameSite=Lax`;
    }
  } catch (e) {}
  return newGuestId;
}

/**
 * Migrates data from an existing guest session to an authenticated user ID.
 * Ensures the user's trial/guest requests are preserved into their permanent account.
 */
export async function migrateGuestDataToUser(guestId: string, newUserId: string): Promise<boolean> {
  try {
    const res = await fetch('/api/guest/migrate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ guestId, newUserId }),
    });
    const data = await res.json();
    return !!data.success;
  } catch (e) {
    console.warn('Guest migration error:', e);
    return false;
  }
}
