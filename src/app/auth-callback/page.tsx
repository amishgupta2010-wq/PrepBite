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
    const raw = localStorage.getItem('prepbite_registered_accounts');
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function saveRegistry(accounts: RegisteredAccount[]) {
  localStorage.setItem('prepbite_registered_accounts', JSON.stringify(accounts));
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
      window.location.replace('/');
      return;
    }

    if (!session?.user?.email) {
      window.location.replace('/');
      return;
    }

    const email = session.user.email;

    // Restore or create a local session so customSession is not null
    let existingDbUser = getUserByEmail(email);
    if (!existingDbUser) {
      // Re-create silently if not found so local session works
      registerUser(session.user.name || email.split('@')[0], email, '', 'other', true).then(res => {
        if (res.user) existingDbUser = res.user;
        if (existingDbUser) {
          localStorage.setItem('prepbite-session', JSON.stringify({
            userId: existingDbUser.id,
            username: existingDbUser.username,
            email: existingDbUser.email,
            gender: existingDbUser.gender,
          }));
          localStorage.setItem('prepbite-remember-me', 'true');
        }
      });
    } else {
      localStorage.setItem('prepbite-session', JSON.stringify({
        userId: existingDbUser.id,
        username: existingDbUser.username,
        email: existingDbUser.email,
        gender: existingDbUser.gender,
      }));
      localStorage.setItem('prepbite-remember-me', 'true');
    }
    
    checkAndActivatePro(email);

    // Explicit user snippet logic:
    const accounts = JSON.parse(localStorage.getItem("prepbite_registered_accounts") || "[]");
    const existingUser = accounts.find((acc: any) => acc.email === email);

    if (existingUser && existingUser.hasCompletedOnboarding) {
      // Existing user: Jump DIRECTLY to dashboard, skip questions and tutorial
      if (existingUser.hasSeenTutorial) {
        localStorage.setItem('prepbite-tutorial-done', 'true');
      }
      window.location.replace("/app");
      return;
    } else {
      // Brand new user: register them and proceed to onboarding
      if (!existingUser) {
        accounts.push({
          email,
          hasCompletedOnboarding: false,
          hasSeenTutorial: false,
          tier: "free",
        });
        localStorage.setItem("prepbite_registered_accounts", JSON.stringify(accounts));
      }
      window.location.replace("/onboarding");
    }
  }, [session, status]);

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
