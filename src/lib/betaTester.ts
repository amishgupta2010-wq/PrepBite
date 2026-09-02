/**
 * Beta Tester Utility
 *
 * During the beta phase, testers get unlimited access to all pro features
 * (unlimited meal plan generation, recipe swapping, etc.) without triggering
 * any paywall logic.
 *
 * To mark a user as a beta tester, run this in the browser console:
 *   localStorage.setItem('prepbite-beta-tester', 'true');
 *
 * Or navigate to ?beta=true once.
 */

const BETA_KEY = 'prepbite-beta-tester';

export function isBetaTester(): boolean {
  if (typeof window === 'undefined') return false;

  // Allow one-time activation via URL param  ?beta=true
  try {
    const params = new URLSearchParams(window.location.search);
    if (params.get('beta') === 'true') {
      localStorage.setItem(BETA_KEY, 'true');
      // Clean URL without reload
      const url = new URL(window.location.href);
      url.searchParams.delete('beta');
      window.history.replaceState({}, '', url.toString());
    }
  } catch { /* SSR or URL parsing issue */ }

  return localStorage.getItem(BETA_KEY) === 'true';
}

export function setBetaTester(enabled: boolean): void {
  if (enabled) {
    localStorage.setItem(BETA_KEY, 'true');
  } else {
    localStorage.removeItem(BETA_KEY);
  }
}
