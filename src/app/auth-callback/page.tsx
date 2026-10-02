'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { getUserByEmail, registerUser } from '@/lib/auth';
import { checkAndActivatePro } from '@/lib/proUsers';

// ── Registry helpers ──

interface RegisteredAccount {
  email: string;
  tier: 'free' | 'pro';
  hasCompletedOnboarding: boolean;
  hasSeenTutorial: boolean;
}

function getRegistry(): RegisteredAccount[] {
  try {
    const raw = localStorage.getItem('prepbite-registered-accounts');
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function saveRegistry(accounts: RegisteredAccount[]) {
  localStorage.setItem('prepbite-registered-accounts', JSON.stringify(accounts));
}

function findAccount(email: string): RegisteredAccount | undefined {
  return getRegistry().find(a => a.email.toLowerCase() === email.toLowerCase());
}

export function markOnboardingComplete(email: string) {
  const accounts = getRegistry();
  const existing = accounts.find(a => a.email.toLowerCase() === email.toLowerCase());
  if (existing) {
    existing.hasCompletedOnboarding = true;
  } else {
    accounts.push({ email: email.toLowerCase(), tier: 'free', hasCompletedOnboarding: true, hasSeenTutorial: false });
  }
  saveRegistry(accounts);
}

export function markTutorialSeen(email: string) {
  const accounts = getRegistry();
  const existing = accounts.find(a => a.email.toLowerCase() === email.toLowerCase());
  if (existing) {
    existing.hasSeenTutorial = true;
    saveRegistry(accounts);
  }
}

// ── Page Component ──

export default function AuthCallbackPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === 'loading') return;

    if (status === 'unauthenticated') {
      router.replace('/');
      return;
    }

    if (!session?.user?.email) {
      router.replace('/');
      return;
    }

    const email = session.user.email;

    // ── Step 1: Check the registered accounts registry ──
    const registeredAccount = findAccount(email);

    if (registeredAccount && registeredAccount.hasCompletedOnboarding) {
      // Returning user — restore session and go straight to /app
      const existingUser = getUserByEmail(email);

      if (existingUser) {
        // User exists in local DB — restore session
        localStorage.setItem('prepbite-session', JSON.stringify({
          userId: existingUser.id,
          username: existingUser.username,
          email: existingUser.email,
          gender: existingUser.gender,
        }));
        localStorage.setItem('prepbite-remember-me', 'true');
      } else {
        // Registry says onboarded but user DB was cleared — re-create silently
        registerUser(session.user.name || email.split('@')[0], email, '', 'other', true).then((result) => {
          if (result.user) {
            localStorage.setItem('prepbite-session', JSON.stringify({
              userId: result.user.id,
              username: result.user.username,
              email: result.user.email,
              gender: result.user.gender,
            }));
            localStorage.setItem('prepbite-remember-me', 'true');
          }
        });
      }

      // Suppress tutorial if already seen
      if (registeredAccount.hasSeenTutorial) {
        localStorage.setItem('prepbite-tutorial-done', 'true');
      }

      checkAndActivatePro(email);
      router.replace('/app');
      return;
    }

    // ── Step 2: Onboarding data exists (local recovery) ──
    const onboardingRaw = localStorage.getItem('prepbite-onboarding');
    if (onboardingRaw) {
      try {
        const ob = JSON.parse(onboardingRaw);
        const name = ob.name || session.user.name || email.split('@')[0];
        const gender = ob.gender || 'other';

        registerUser(name, email, '', gender, true).then((result) => {
          if (result.user) {
            localStorage.setItem('prepbite-session', JSON.stringify({
              userId: result.user.id,
              username: result.user.username,
              email: result.user.email,
              gender: result.user.gender,
            }));
            localStorage.setItem('prepbite-remember-me', 'true');
          }
          // Mark as onboarded in registry
          markOnboardingComplete(email);
          markTutorialSeen(email);
          localStorage.setItem('prepbite-tutorial-done', 'true');
          checkAndActivatePro(email);
          router.replace('/app');
        }).catch(() => router.replace('/onboarding?from=google'));
        return;
      } catch {}
    }

    // ── Step 3: Brand new user — register in registry and go to onboarding ──
    const accounts = getRegistry();
    if (!accounts.find(a => a.email.toLowerCase() === email.toLowerCase())) {
      accounts.push({ email: email.toLowerCase(), tier: 'free', hasCompletedOnboarding: false, hasSeenTutorial: false });
      saveRegistry(accounts);
    }
    router.replace('/onboarding?from=google');
  }, [session, status, router]);

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--bg-primary, #0A0A0A)',
      color: 'var(--text-primary, #FAFAFA)',
      fontFamily: 'Inter, sans-serif',
    }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
        <div style={{
          width: '40px', height: '40px',
          border: '4px solid rgba(255,255,255,0.1)',
          borderTopColor: 'var(--accent, #00E676)',
          borderRadius: '50%',
          animation: 'spin 0.9s linear infinite',
        }} />
        <p style={{ color: 'var(--text-secondary, #aaa)', fontSize: '0.95rem' }}>Signing you in…</p>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
