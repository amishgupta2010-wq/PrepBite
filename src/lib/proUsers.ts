/**
 * Pro Users Utility
 *
 * Manages Pro access.
 * Only 'amishgupta2010@gmail.com' is whitelisted by default, plus
 * any user account that has bought Pro (tier === 'pro' in prepbite_registered_accounts).
 * Non-pro accounts have 'prepbite-is-pro' wiped immediately.
 */

export const PRO_EMAILS: string[] = [
  'amishgupta2010@gmail.com',
];

/**
 * Check if an email belongs to a Pro user.
 * If yes -> sets 'prepbite-is-pro' to 'true' and returns true.
 * If no -> clears 'prepbite-is-pro' from localStorage and returns false.
 */
export function checkAndActivatePro(email?: string | null): boolean {
  if (typeof window === 'undefined') return false;
  if (!email) {
    localStorage.removeItem('prepbite-is-pro');
    return false;
  }

  const normalized = email.toLowerCase().trim();

  // 1. Whitelist check (only amishgupta2010@gmail.com)
  if (PRO_EMAILS.includes(normalized)) {
    localStorage.setItem('prepbite-is-pro', 'true');
    return true;
  }

  // 2. Purchased Pro check (stored in prepbite_registered_accounts)
  try {
    const raw = localStorage.getItem('prepbite_registered_accounts');
    if (raw) {
      const accounts = JSON.parse(raw);
      if (Array.isArray(accounts)) {
        const acc = accounts.find((a: any) => a.email?.toLowerCase().trim() === normalized);
        if (acc && acc.tier === 'pro') {
          localStorage.setItem('prepbite-is-pro', 'true');
          return true;
        }
      }
    }
  } catch {}

  // 3. Not Pro -> Wipe stale pro flag immediately!
  localStorage.removeItem('prepbite-is-pro');
  return false;
}

/**
 * Checks if the currently active logged-in user is Pro.
 */
export function isProUser(): boolean {
  if (typeof window === 'undefined') return false;

  try {
    const rawSession = localStorage.getItem('prepbite-session');
    if (rawSession) {
      const session = JSON.parse(rawSession);
      if (session?.email) {
        return checkAndActivatePro(session.email);
      }
    }
  } catch {}

  // If no session email found, user cannot be Pro
  localStorage.removeItem('prepbite-is-pro');
  return false;
}
