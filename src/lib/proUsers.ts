/**
 * Pro Users Utility
 *
 * Manages a hardcoded list of Pro user emails.
 * When a user signs in or completes onboarding, their email is checked
 * against this list. If matched, `prepbite-is-pro` is set in localStorage.
 */

// Add Pro user emails here (all lowercase)
const PRO_EMAILS: string[] = [
  'amishgupta2010@gmail.com',
];

/**
 * Check if an email belongs to a Pro user and activate Pro if so.
 * Call this during login / auth-callback / onboarding completion.
 */
export function checkAndActivatePro(email: string): boolean {
  if (typeof window === 'undefined') return false;
  const normalizedEmail = email.toLowerCase().trim();
  if (PRO_EMAILS.includes(normalizedEmail)) {
    localStorage.setItem('prepbite-is-pro', 'true');
    return true;
  }
  return false;
}

/**
 * Check if the current user is Pro (via localStorage flag).
 */
export function isProUser(): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem('prepbite-is-pro') === 'true';
}
