'use client';

import { useSession } from 'next-auth/react';
import { useEffect } from 'react';
import { getUserByEmail, registerUser, getRegistry, saveRegistry, findAccount } from '@/lib/auth';
import { checkAndActivatePro } from '@/lib/proUsers';

// ── Page Component ──

export default function AuthCallbackPage() {
  const { data: session, status } = useSession();

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
    // Check if we came here from the "Upgrade to Pro" flow
    const wantsCheckout = typeof window !== 'undefined' &&
      new URLSearchParams(window.location.search).get('checkout') === '1';

    // Await-safe wrapper because useEffect cannot be async
    (async () => {
      // Restore or create a local session so customSession is not null
      let existingDbUser = getUserByEmail(email);
      if (!existingDbUser) {
        // Await registration so the user exists before we redirect
        const res = await registerUser(session.user!.name || email.split('@')[0], email, '', 'other', true);
        if (res.user) existingDbUser = res.user;
      }

      const sessionData = {
        userId: existingDbUser?.id || ('oauth_' + Date.now().toString(36)),
        username: existingDbUser?.username || session.user?.name || email.split('@')[0],
        email: existingDbUser?.email || email,
        gender: existingDbUser?.gender || 'other',
      };

      localStorage.setItem('prepbite-session', JSON.stringify(sessionData));
      localStorage.setItem('prepbite-remember-me', 'true');

      // Route based on registry
      const existingAccount = findAccount(email);

      if (!existingAccount) {
        const currentRegistry = getRegistry();
        currentRegistry.push({ email, hasCompletedOnboarding: false, hasSeenTutorial: false, tier: 'free' });
        saveRegistry(currentRegistry);
      }

      const accountHasPro = checkAndActivatePro(email);

      // If user came via "Upgrade to Pro"
      if (wantsCheckout) {
        if (accountHasPro) {
          // Account ALREADY has Pro! Do not open checkout, just sign in
          if (existingAccount && existingAccount.hasCompletedOnboarding) {
            localStorage.setItem('prepbite-tutorial-done', 'true');
            window.location.replace('/app');
          } else {
            window.location.replace('/onboarding');
          }
          return;
        } else {
          // Account DOES NOT have Pro! Take them to Dodo checkout
          const searchParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
          const planType = searchParams?.get('plan') || 'annual';
          try {
            const res = await fetch('/api/create-checkout-session', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ planType }),
            });
            const data = await res.json();
            if (data.checkout_url) {
              window.location.href = data.checkout_url;
              return;
            }
          } catch {
            // Fall through to normal routing if checkout fails
          }
        }
      }

      // Normal sign-in redirect
      if (existingAccount && existingAccount.hasCompletedOnboarding) {
        // Existing user — suppress tutorial and go straight to dashboard
        localStorage.setItem('prepbite-tutorial-done', 'true');
        window.location.replace('/app');
      } else {
        window.location.replace('/onboarding');
      }
    })();
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
