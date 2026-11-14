'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function SuccessPage() {
  const router = useRouter();
  const [countdown, setCountdown] = useState(5);
  const [planType, setPlanType] = useState<'monthly' | 'annual' | 'lifetime'>('annual');

  useEffect(() => {
    // Detect plan type from query param
    let detectedPlan: 'monthly' | 'annual' | 'lifetime' = 'annual';
    if (typeof window !== 'undefined') {
      const search = new URLSearchParams(window.location.search);
      const p = search.get('plan');
      if (p === 'monthly' || p === 'lifetime' || p === 'annual') {
        detectedPlan = p;
        setPlanType(p);
      }
    }

    // Unlock Pro in localStorage
    localStorage.setItem('prepbite-is-pro', 'true');
    localStorage.setItem('prepbite-pro-plan', detectedPlan);

    // If lifetime plan, claim the spot on the server
    if (detectedPlan === 'lifetime') {
      localStorage.setItem('prepbite_lifetime_member', 'true');
      fetch('/api/lifetime-spots', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      }).catch(err => console.error('Failed to claim lifetime spot:', err));
    }

    // Upgrade the current user account tier to 'pro'
    try {
      const sessionRaw = localStorage.getItem('prepbite-session');
      const email = sessionRaw ? JSON.parse(sessionRaw)?.email : null;
      if (email) {
        const accountsRaw = localStorage.getItem('prepbite_registered_accounts');
        if (accountsRaw) {
          const accounts = JSON.parse(accountsRaw);
          if (Array.isArray(accounts)) {
            const updated = accounts.map((a: any) =>
              a.email?.toLowerCase().trim() === email.toLowerCase().trim()
                ? { ...a, tier: 'pro', plan: detectedPlan }
                : a
            );
            localStorage.setItem('prepbite_registered_accounts', JSON.stringify(updated));
          }
        }
      }
    } catch {}

    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          router.push('/app/ingredients');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [router]);

  const planInfo = {
    monthly: {
      icon: '✨',
      badge: 'MONTHLY PRO',
      title: 'You are now a PrepBite Pro member!',
      gradient: 'linear-gradient(135deg, #00E676, #10B981)',
      border: 'rgba(0, 230, 118, 0.4)',
      bgPill: 'rgba(0, 230, 118, 0.1)',
      pillColor: '#00E676',
    },
    annual: {
      icon: '👑',
      badge: 'ANNUAL PRO',
      title: 'You are now an Annual Pro member!',
      gradient: 'linear-gradient(135deg, #FFD700, #FFA500)',
      border: 'rgba(255, 215, 0, 0.4)',
      bgPill: 'rgba(255, 215, 0, 0.1)',
      pillColor: '#FFD700',
    },
    lifetime: {
      icon: '💎',
      badge: 'FOUNDING LIFETIME MEMBER',
      title: 'Founding Member Lifetime Pass Unlocked!',
      gradient: 'linear-gradient(135deg, #00E5FF, #38BDF8)',
      border: 'rgba(0, 229, 255, 0.4)',
      bgPill: 'rgba(0, 229, 255, 0.1)',
      pillColor: '#00E5FF',
    },
  }[planType];

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--bg-primary, #0A0A0A)',
      color: 'var(--text-primary, #FAFAFA)',
      fontFamily: 'Inter, sans-serif',
      padding: '2rem',
      textAlign: 'center',
    }}>
      <div style={{
        fontSize: '4.5rem',
        marginBottom: '1rem',
        animation: 'pulse 1.5s ease infinite',
      }}>{planInfo.icon}</div>
      <h1 style={{
        fontFamily: 'Outfit, sans-serif',
        fontSize: '2rem',
        fontWeight: 800,
        marginBottom: '0.5rem',
        background: planInfo.gradient,
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
      }}>
        {planInfo.title}
      </h1>
      <p style={{ color: 'var(--text-muted, #777)', marginBottom: '1.5rem', maxWidth: '420px', lineHeight: 1.5 }}>
        All premium features are now unlocked — unlimited meal plans, smart recipe swapping, and automatic grocery list sync.
      </p>
      <div style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.5rem',
        padding: '0.75rem 2rem',
        borderRadius: '10px',
        background: planInfo.bgPill,
        border: `1px solid ${planInfo.border}`,
        color: planInfo.pillColor,
        fontWeight: 700,
      }}>
        Redirecting to dashboard in {countdown}s...
      </div>
    </div>
  );
}
