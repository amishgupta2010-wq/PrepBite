'use client';

import { useState } from 'react';

interface UpgradeModalProps {
  onClose: () => void;
}

export default function UpgradeModal({ onClose }: UpgradeModalProps) {
  const [loading, setLoading] = useState(false);

  const handleBuyPro = async () => {
    if (loading) return;
    setLoading(true);
    try {
      const res = await fetch('/api/create-checkout-session', { method: 'POST' });
      const data = await res.json();
      if (data.checkout_url) {
        window.location.href = data.checkout_url;
      } else {
        alert('Unable to start checkout. Please try again.');
        setLoading(false);
      }
    } catch {
      alert('Unable to start checkout. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 10001,
        background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '1rem',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          position: 'relative',
          background: 'var(--bg-card, #1A1A1A)',
          border: '1px solid var(--border, #262626)',
          borderRadius: '16px',
          padding: '2rem',
          maxWidth: '560px',
          width: '100%',
          boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
        }}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute', top: '1rem', right: '1rem',
            background: 'rgba(255,71,87,0.1)', border: '1px solid rgba(255,71,87,0.3)',
            color: '#FF4757', borderRadius: '8px',
            width: '32px', height: '32px',
            cursor: 'pointer', fontSize: '1rem',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          ✕
        </button>

        <h2 style={{
          fontFamily: 'Outfit, sans-serif',
          fontSize: '1.5rem', fontWeight: 700,
          textAlign: 'center', marginBottom: '1.5rem',
          color: 'var(--text-primary, #FAFAFA)',
        }}>
          Choose Your Plan
        </h2>

        {/* Two cards side by side */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
          {/* Free Card */}
          <div style={{
            background: 'var(--bg-secondary, #111)',
            border: '1px solid var(--border, #262626)',
            borderRadius: '12px', padding: '1.25rem',
          }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1rem', color: 'var(--text-secondary, #A0A0A0)' }}>Free</h3>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <li style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', fontSize: '0.85rem', color: 'var(--text-muted, #777)' }}>
                <span style={{ color: '#FF4757', flexShrink: 0 }}>❌</span>
                3 Meal Plan Generations / Month
              </li>
              <li style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', fontSize: '0.85rem', color: 'var(--text-muted, #777)' }}>
                <span style={{ color: '#FF4757', flexShrink: 0 }}>❌</span>
                Meal Swapping Disabled
              </li>
              <li style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', fontSize: '0.85rem', color: 'var(--text-muted, #777)' }}>
                <span style={{ color: '#FF4757', flexShrink: 0 }}>❌</span>
                Manual Grocery List Only
              </li>
            </ul>
          </div>

          {/* Pro Card */}
          <div style={{
            background: 'linear-gradient(135deg, rgba(255,215,0,0.08), rgba(255,165,0,0.05))',
            border: '1.5px solid rgba(255,215,0,0.4)',
            borderRadius: '12px', padding: '1.25rem',
            position: 'relative', overflow: 'hidden',
          }}>
            {/* Crown badge */}
            <div style={{
              position: 'absolute', top: '-1px', right: '-1px',
              background: 'linear-gradient(135deg, #FFD700, #FFA500)',
              borderRadius: '0 12px 0 12px',
              padding: '0.25rem 0.6rem',
              fontSize: '0.7rem', fontWeight: 700, color: '#0A0A0A',
            }}>👑 BEST</div>
            <h3 style={{
              fontSize: '1.1rem', fontWeight: 700, marginBottom: '1rem',
              background: 'linear-gradient(135deg, #FFD700, #FFA500)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            }}>Pro</h3>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <li style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', fontSize: '0.85rem', color: 'var(--text-primary, #FAFAFA)' }}>
                <span style={{ color: '#00E676', flexShrink: 0 }}>✅</span>
                Unlimited Meal Plan Generations
              </li>
              <li style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', fontSize: '0.85rem', color: 'var(--text-primary, #FAFAFA)' }}>
                <span style={{ color: '#00E676', flexShrink: 0 }}>✅</span>
                Unlimited Smart Recipe Swapping
              </li>
              <li style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', fontSize: '0.85rem', color: 'var(--text-primary, #FAFAFA)' }}>
                <span style={{ color: '#00E676', flexShrink: 0 }}>✅</span>
                Auto-Add Missing Ingredients to Grocery List
              </li>
            </ul>
          </div>
        </div>

        {/* Buy Pro Button */}
        <button
          onClick={handleBuyPro}
          disabled={loading}
          style={{
            width: '100%',
            padding: '0.9rem',
            borderRadius: '12px',
            border: 'none',
            background: loading
              ? 'rgba(255,215,0,0.3)'
              : 'linear-gradient(135deg, #FFD700, #FFA500)',
            color: '#0A0A0A',
            fontFamily: 'Outfit, sans-serif',
            fontSize: '1.1rem',
            fontWeight: 700,
            cursor: loading ? 'not-allowed' : 'pointer',
            transition: 'all 0.2s ease',
            boxShadow: loading ? 'none' : '0 4px 20px rgba(255,215,0,0.3)',
          }}
        >
          {loading ? 'Redirecting to checkout...' : 'Buy Pro ($5/mo)'}
        </button>
      </div>
    </div>
  );
}
