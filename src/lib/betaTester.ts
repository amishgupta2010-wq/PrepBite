/**
 * Beta Tester Utility
 *
 * Disabled for production: Pro status is now controlled strictly via
 * purchase records or whitelisted Pro accounts.
 */

export function isBetaTester(): boolean {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('prepbite-beta-tester');
  }
  return false;
}

export function setBetaTester(_enabled: boolean): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('prepbite-beta-tester');
  }
}
