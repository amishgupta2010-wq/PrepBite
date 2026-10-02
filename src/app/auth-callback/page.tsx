'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { getUserByEmail, registerUser } from '@/lib/auth';
import { checkAndActivatePro } from '@/lib/proUsers';

export default function AuthCallbackPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    if (status === 'loading') return;

    if (status === 'unauthenticated') {
      router.push('/');
      return;
    }

    if (session?.user?.email) {
      const email = session.user.email;

      // First: check if this email already exists in our user database (any sign-up method)
      const existingUser = getUserByEmail(email);

      if (existingUser) {
        // User already exists → restore session and go straight to app
        const sessionData = JSON.stringify({
          userId: existingUser.id,
          username: existingUser.username,
          email: existingUser.email,
          gender: existingUser.gender,
        });
        localStorage.setItem('prepbite-session', sessionData);
        localStorage.setItem('prepbite-remember-me', 'true');
        checkAndActivatePro(email);
        router.replace('/app');
        return;
      }

      // Second: check if they have onboarding data (account set up but users array cleared)
      const onboardingRaw = localStorage.getItem('prepbite-onboarding');
      if (onboardingRaw) {
        try {
          const ob = JSON.parse(onboardingRaw);
          if (ob.email === email || ob.name) {
            const name = ob.name || session.user.name || email.split('@')[0];
            const gender = ob.gender || 'other';
            registerUser(name, email, '', gender, true).then((result) => {
              const user = result.user;
              if (user) {
                localStorage.setItem('prepbite-session', JSON.stringify({
                  userId: user.id,
                  username: user.username,
                  email: user.email,
                  gender: user.gender,
                }));
                localStorage.setItem('prepbite-remember-me', 'true');
              }
              checkAndActivatePro(email);
              router.replace('/app');
            });
            return;
          }
        } catch {}
      }

      // Truly new user → go to onboarding
      router.replace('/onboarding?from=google');
    } else {
      router.push('/');
    }
  }, [session, status, router]);

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--bg-primary, #0A0A0A)',
      color: 'var(--text-primary, #FAFAFA)',
      fontFamily: 'Inter, sans-serif'
    }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
        <div className="spinner" style={{
          width: '40px', height: '40px',
          border: '4px solid rgba(255,255,255,0.1)',
          borderTopColor: 'var(--accent, #00E676)',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite'
        }} />
        <p>Signing you in...</p>
      </div>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
