'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function SuccessPage() {
  const router = useRouter();
  const [countdown, setCountdown] = useState(5);

  useEffect(() => {
    // Unlock Pro
    localStorage.setItem('prepbite-is-pro', 'true');

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
        fontSize: '4rem',
        marginBottom: '1rem',
        animation: 'pulse 1.5s ease infinite',
      }}>👑</div>
      <h1 style={{
        fontFamily: 'Outfit, sans-serif',
        fontSize: '2rem',
        fontWeight: 800,
        marginBottom: '0.5rem',
        background: 'linear-gradient(135deg, #FFD700, #FFA500)',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
      }}>
        You are now a PrepBite Pro member!
      </h1>
      <p style={{ color: 'var(--text-muted, #777)', marginBottom: '1.5rem', maxWidth: '400px' }}>
        All premium features are now unlocked — unlimited meal plans, smart recipe swapping, and automatic grocery lists.
      </p>
      <div style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.5rem',
        padding: '0.75rem 2rem',
        borderRadius: '10px',
        background: 'rgba(255, 215, 0, 0.1)',
        border: '1px solid rgba(255, 215, 0, 0.3)',
        color: '#FFD700',
        fontWeight: 600,
      }}>
        Redirecting in {countdown}s...
      </div>
    </div>
  );
}
