/**
 * Pro Users Utility
 *
 * Manages Pro access.
 * Pro status is strictly controlled by purchase records (tier === 'pro' in prepbite_registered_accounts).
 * No emails are hardcoded or automatically granted Pro upon signup.
 * If an account deletes their account and re-registers, they start with tier: 'free'.
 */

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

  // Purchased Pro check (stored in prepbite_registered_accounts)
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

  // Not Pro -> Wipe stale pro flag immediately!
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
    let email: string | null = null;
    if (rawSession) {
      const session = JSON.parse(rawSession);
      if (session?.email) email = session.email;
    }
    if (!email) {
      const ob = localStorage.getItem('prepbite-onboarding');
      if (ob) email = JSON.parse(ob)?.email;
    }
    if (email) {
      return checkAndActivatePro(email);
    }
  } catch {}

  localStorage.removeItem('prepbite-is-pro');
  return false;
}
