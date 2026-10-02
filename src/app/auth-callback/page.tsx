'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { getUserByEmail, registerUser } from '@/lib/auth';
import { checkAndActivatePro } from '@/lib/proUsers';

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
    const isSessionOnboardingCompleted = (session.user as any).onboardingCompleted;

    // ── Step 1: Check if user already exists in our local DB ──
    const existingUser = getUserByEmail(email);

    if (existingUser) {
      // Restore custom session so getSession() works throughout the app
      const sessionData = {
        userId: existingUser.id,
        username: existingUser.username,
        email: existingUser.email,
        gender: existingUser.gender,
      };
      localStorage.setItem('prepbite-session', JSON.stringify(sessionData));
      localStorage.setItem('prepbite-remember-me', 'true');

      // Mark tutorial as done so returning users never see it again
      localStorage.setItem('prepbite-tutorial-done', 'true');

      checkAndActivatePro(email);
      router.replace('/app');
      return;
    }

    // ── Step 1.5: If NextAuth session says onboarding is completed, but they aren't in local DB ──
    // We recreate them in local DB silently and skip onboarding.
    if (isSessionOnboardingCompleted) {
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
        localStorage.setItem('prepbite-tutorial-done', 'true');
        checkAndActivatePro(email);
        router.replace('/app');
      });
      return;
    }

    // ── Step 2: Onboarding data exists but users array was cleared ──
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
          // Mark tutorial done for recovered accounts too
          localStorage.setItem('prepbite-tutorial-done', 'true');
          checkAndActivatePro(email);
          router.replace('/app');
        }).catch(() => router.replace('/onboarding?from=google'));
        return;
      } catch {}
    }

    // ── Step 3: Brand new user → go to onboarding ──
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
