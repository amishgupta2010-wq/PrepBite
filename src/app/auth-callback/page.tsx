'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { getUserByEmail } from '@/lib/auth';

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
      const existingUser = getUserByEmail(session.user.email);
      if (existingUser) {
        // Returning Google user -> create a local session so the app recognizes them
        const sessionData = JSON.stringify({
          userId: existingUser.id,
          username: existingUser.username,
          email: existingUser.email,
          gender: existingUser.gender,
        });
        localStorage.setItem('prepbite-session', sessionData);
        localStorage.setItem('prepbite-remember-me', 'true');
        router.push('/app');
      } else {
        // New Google user -> detect incomplete profile -> go to onboarding
        // Pass a flag so onboarding knows to skip email step
        router.push('/onboarding?from=google');
      }
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
        <p>Checking profile...</p>
      </div>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
