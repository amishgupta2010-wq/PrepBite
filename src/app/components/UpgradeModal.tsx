'use client';

import { useState, useEffect } from 'react';

interface UpgradeModalProps {
  onClose: () => void;
  defaultPlan?: 'monthly' | 'annual' | 'lifetime';
}

export default function UpgradeModal({ onClose, defaultPlan = 'annual' }: UpgradeModalProps) {
  const [selectedPlan, setSelectedPlan] = useState<'monthly' | 'annual' | 'lifetime'>(defaultPlan);
  const [loading, setLoading] = useState(false);
  const [spotsRemaining, setSpotsRemaining] = useState<number>(25);
  const [spotsLoaded, setSpotsLoaded] = useState(false);

  // Fetch live lifetime spots
  useEffect(() => {
    let isMounted = true;
    // Check localStorage cache first
    try {
      const cached = localStorage.getItem('prepbite_lifetime_spots_remaining');
      if (cached !== null) {
        const val = parseInt(cached, 10);
        if (!isNaN(val)) setSpotsRemaining(Math.max(0, Math.min(25, val)));
      }
    } catch {}

    fetch('/api/lifetime-spots')
      .then(res => res.json())
      .then(data => {
        if (!isMounted) return;
        if (typeof data.remaining === 'number') {
          const rem = Math.max(0, Math.min(25, data.remaining));
          setSpotsRemaining(rem);
          try {
            localStorage.setItem('prepbite_lifetime_spots_remaining', rem.toString());
          } catch {}
          if (rem <= 0 && selectedPlan === 'lifetime') {
            setSelectedPlan('annual');
          }
        }
        setSpotsLoaded(true);
      })
      .catch(() => {
        if (isMounted) setSpotsLoaded(true);
      });

    return () => { isMounted = false; };
  }, [selectedPlan]);

  const isSoldOut = spotsRemaining <= 0;
  // Progress bar fills proportionally as spots are taken: (25 - spotsRemaining) / 25
  const fillPercent = Math.min(100, Math.max(0, ((25 - spotsRemaining) / 25) * 100));

  const handleContinue = async () => {
    if (loading) return;
    if (selectedPlan === 'lifetime' && isSoldOut) {
      alert('The Lifetime pass is sold out. Please select another plan.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planType: selectedPlan }),
      });
      const data = await res.json();
      if (data.checkout_url) {
        window.location.href = data.checkout_url;
      } else {
        alert(data.error || 'Unable to start checkout. Please try again.');
        setLoading(false);
      }
    } catch {
      alert('Unable to start checkout. Please try again.');
      setLoading(false);
    }
  };

  // Continue button styles based on plan selection
  const buttonStyle = {
    monthly: {
      background: 'linear-gradient(135deg, #00E676, #10B981)',
      color: '#0A0A0A',
      shadow: '0 6px 25px rgba(0, 230, 118, 0.4)',
    },
    annual: {
      background: 'linear-gradient(135deg, #FFD700, #FFA500)',
      color: '#0A0A0A',
      shadow: '0 6px 25px rgba(255, 215, 0, 0.4)',
    },
    lifetime: {
      background: 'linear-gradient(135deg, #00E5FF, #0284C7)',
      color: '#0A0A0A',
      shadow: '0 6px 25px rgba(0, 229, 255, 0.4)',
    },
  }[selectedPlan];

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 10001,
        background: 'rgba(0,0,0,0.78)', backdropFilter: 'blur(8px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '1rem',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          position: 'relative',
          background: 'var(--bg-card, #121212)',
          border: '1px solid var(--border, #262626)',
          borderRadius: '20px',
          padding: '2rem',
          maxWidth: '840px',
          width: '100%',
          maxHeight: '92vh',
          overflowY: 'auto',
          boxShadow: '0 24px 70px rgba(0,0,0,0.6)',
        }}
      >
        {/* Inline Glint and Ribbon Animations */}
        <style>{`
          @keyframes pbGlint {
            0% { transform: translateX(-160%) skewX(-20deg); }
            40%, 100% { transform: translateX(260%) skewX(-20deg); }
          }
          .pb-glint-gold::after {
            content: '';
            position: absolute;
            top: 0; left: 0; width: 60%; height: 100%;
            background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.22), transparent);
            transform: translateX(-160%) skewX(-20deg);
            animation: pbGlint 3.6s infinite ease-in-out;
            pointer-events: none;
          }
          .pb-glint-blue::after {
            content: '';
            position: absolute;
            top: 0; left: 0; width: 60%; height: 100%;
            background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.28), transparent);
            transform: translateX(-160%) skewX(-20deg);
            animation: pbGlint 3.6s infinite ease-in-out;
            animation-delay: 1.2s;
            pointer-events: none;
          }
          @media (max-width: 768px) {
            .pb-upgrade-grid {
              grid-template-columns: 1fr !important;
            }
          }
        `}</style>

        {/* Close button */}
        <button
          onClick={onClose}
          aria-label="Close"
          style={{
            position: 'absolute', top: '1.1rem', right: '1.1rem',
            background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)',
            color: 'var(--text-secondary, #A0A0A0)', borderRadius: '10px',
            width: '34px', height: '34px',
            cursor: 'pointer', fontSize: '1rem',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'all 0.15s ease',
            zIndex: 10,
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,71,87,0.15)'; (e.currentTarget as HTMLElement).style.color = '#FF4757'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.06)'; (e.currentTarget as HTMLElement).style.color = 'var(--text-secondary, #A0A0A0)'; }}
        >
          ✕
        </button>

        {/* Modal Header */}
        <div style={{ textAlign: 'center', marginBottom: '1.8rem' }}>
          <h2 style={{
            fontFamily: 'Outfit, sans-serif',
            fontSize: '1.75rem', fontWeight: 800,
            marginBottom: '0.4rem',
            color: 'var(--text-primary, #FAFAFA)',
          }}>
            Choose Your PrepBite Plan
          </h2>
          <p style={{ color: 'var(--text-secondary, #999)', fontSize: '0.92rem', margin: 0 }}>
            Unlock unlimited meal planning, instant recipe swapping, and automated groceries.
          </p>
        </div>

        {/* 3 Plans Grid (No Free Tier) */}
        <div className="pb-upgrade-grid" style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '1rem',
          marginBottom: '1.8rem',
        }}>

          {/* ── 1. MONTHLY PLAN (Green) ── */}
          <div
            onClick={() => setSelectedPlan('monthly')}
            style={{
              position: 'relative',
              background: selectedPlan === 'monthly'
                ? 'linear-gradient(180deg, rgba(0, 230, 118, 0.12) 0%, rgba(10, 10, 10, 0.95) 100%)'
                : 'rgba(255, 255, 255, 0.02)',
              border: selectedPlan === 'monthly'
                ? '2px solid #00E676'
                : '1.5px solid rgba(0, 230, 118, 0.3)',
              borderRadius: '16px',
              padding: '1.35rem 1.15rem',
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              transition: 'all 0.2s ease',
              boxShadow: selectedPlan === 'monthly' ? '0 0 24px rgba(0, 230, 118, 0.25)' : 'none',
              transform: selectedPlan === 'monthly' ? 'translateY(-2px)' : 'none',
            }}
          >
            {/* Radio / Selection Indicator */}
            <div style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.9rem',
            }}>
              <span style={{
                fontSize: '0.75rem', fontWeight: 800, letterSpacing: '1px',
                color: '#00E676', textTransform: 'uppercase',
              }}>
                Monthly
              </span>
              <div style={{
                width: '18px', height: '18px', borderRadius: '50%',
                border: selectedPlan === 'monthly' ? '5px solid #00E676' : '2px solid #444',
                background: selectedPlan === 'monthly' ? '#0A0A0A' : 'transparent',
                transition: 'all 0.15s ease',
              }} />
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#FAFAFA', fontFamily: 'Outfit, sans-serif' }}>
                $5 <span style={{ fontSize: '0.85rem', color: '#888', fontWeight: 500 }}>/ mo</span>
              </div>
              <p style={{
                fontSize: '0.84rem',
                color: '#00E676',
                fontWeight: 600,
                marginTop: '0.25rem',
                marginBottom: 0,
              }}>
                $1.15/week, billed monthly
              </p>
            </div>

            <ul style={{
              listStyle: 'none', padding: 0, margin: '0 0 1rem 0',
              display: 'flex', flexDirection: 'column', gap: '0.55rem',
              flexGrow: 1, fontSize: '0.8rem', color: '#ccc',
            }}>
              <li style={{ display: 'flex', gap: '0.45rem', alignItems: 'center' }}>
                <span style={{ color: '#00E676' }}>✓</span> Unlimited generations
              </li>
              <li style={{ display: 'flex', gap: '0.45rem', alignItems: 'center' }}>
                <span style={{ color: '#00E676' }}>✓</span> Unlimited recipe swaps
              </li>
              <li style={{ display: 'flex', gap: '0.45rem', alignItems: 'center' }}>
                <span style={{ color: '#00E676' }}>✓</span> Auto missing ingredients
              </li>
            </ul>
          </div>

          {/* ── 2. ANNUAL PLAN (Gold with Crown & Glint, Pre-selected, "Most popular") ── */}
          <div
            onClick={() => setSelectedPlan('annual')}
            className="pb-glint-gold"
            style={{
              position: 'relative',
              background: selectedPlan === 'annual'
                ? 'linear-gradient(180deg, rgba(255, 215, 0, 0.14) 0%, rgba(10, 10, 10, 0.95) 100%)'
                : 'rgba(255, 215, 0, 0.04)',
              border: selectedPlan === 'annual'
                ? '2px solid #FFD700'
                : '1.5px solid rgba(255, 215, 0, 0.45)',
              borderRadius: '16px',
              padding: '1.35rem 1.15rem',
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              transition: 'all 0.2s ease',
              boxShadow: selectedPlan === 'annual' ? '0 0 28px rgba(255, 215, 0, 0.3)' : 'none',
              transform: selectedPlan === 'annual' ? 'translateY(-2px)' : 'none',
              overflow: 'hidden',
            }}
          >
            {/* Crown & "Most popular" Tag */}
            <div style={{
              position: 'absolute', top: '0', right: '0',
              background: 'linear-gradient(135deg, #FFD700, #FFA500)',
              color: '#0A0A0A',
              padding: '0.22rem 0.65rem',
              borderRadius: '0 14px 0 10px',
              fontSize: '0.7rem', fontWeight: 800, letterSpacing: '0.5px',
              display: 'flex', alignItems: 'center', gap: '0.25rem',
              boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
              zIndex: 2,
            }}>
              <span>👑</span> Most popular
            </div>

            {/* Radio / Selection Indicator */}
            <div style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.9rem',
            }}>
              <span style={{
                fontSize: '0.75rem', fontWeight: 800, letterSpacing: '1px',
                color: '#FFD700', textTransform: 'uppercase',
                display: 'flex', alignItems: 'center', gap: '0.3rem',
              }}>
                Annual
              </span>
              <div style={{
                width: '18px', height: '18px', borderRadius: '50%',
                border: selectedPlan === 'annual' ? '5px solid #FFD700' : '2px solid #444',
                background: selectedPlan === 'annual' ? '#0A0A0A' : 'transparent',
                transition: 'all 0.15s ease',
                marginRight: '5rem', // Make room for badge
              }} />
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#FAFAFA', fontFamily: 'Outfit, sans-serif' }}>
                $39 <span style={{ fontSize: '0.85rem', color: '#888', fontWeight: 500 }}>/ yr</span>
              </div>
              <p style={{
                fontSize: '0.84rem',
                color: '#FFD700',
                fontWeight: 700,
                marginTop: '0.25rem',
                marginBottom: 0,
              }}>
                $0.75/week, billed annually
              </p>
            </div>

            <ul style={{
              listStyle: 'none', padding: 0, margin: '0 0 1rem 0',
              display: 'flex', flexDirection: 'column', gap: '0.55rem',
              flexGrow: 1, fontSize: '0.8rem', color: '#ccc',
            }}>
              <li style={{ display: 'flex', gap: '0.45rem', alignItems: 'center' }}>
                <span style={{ color: '#FFD700' }}>✓</span> All Pro features included
              </li>
              <li style={{ display: 'flex', gap: '0.45rem', alignItems: 'center' }}>
                <span style={{ color: '#FFD700' }}>✓</span> 35% weekly savings
              </li>
              <li style={{ display: 'flex', gap: '0.45rem', alignItems: 'center' }}>
                <span style={{ color: '#FFD700' }}>✓</span> Priority recipe generation
              </li>
            </ul>
          </div>

          {/* ── 3. LIFETIME PLAN (Diamond Blue with Glint & Remaining Spots Bar) ── */}
          <div
            onClick={() => {
              if (!isSoldOut) setSelectedPlan('lifetime');
            }}
            className={!isSoldOut ? 'pb-glint-blue' : ''}
            style={{
              position: 'relative',
              background: isSoldOut
                ? 'rgba(20, 20, 20, 0.7)'
                : selectedPlan === 'lifetime'
                  ? 'linear-gradient(180deg, rgba(0, 229, 255, 0.14) 0%, rgba(10, 10, 10, 0.95) 100%)'
                  : 'rgba(0, 229, 255, 0.03)',
              border: isSoldOut
                ? '1px solid rgba(255, 255, 255, 0.08)'
                : selectedPlan === 'lifetime'
                  ? '2px solid #00E5FF'
                  : '1.5px solid rgba(0, 229, 255, 0.35)',
              borderRadius: '16px',
              padding: '1.35rem 1.15rem',
              cursor: isSoldOut ? 'not-allowed' : 'pointer',
              display: 'flex',
              flexDirection: 'column',
              transition: 'all 0.2s ease',
              boxShadow: !isSoldOut && selectedPlan === 'lifetime' ? '0 0 28px rgba(0, 229, 255, 0.3)' : 'none',
              transform: !isSoldOut && selectedPlan === 'lifetime' ? 'translateY(-2px)' : 'none',
              overflow: 'hidden',
            }}
          >
            {/* Sold Out Overlay Banner when spots reach 0 */}
            {isSoldOut && (
              <div style={{
                position: 'absolute', inset: 0,
                backdropFilter: 'blur(3.5px)',
                background: 'rgba(0, 0, 0, 0.45)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                zIndex: 20,
              }}>
                <div style={{
                  background: 'linear-gradient(135deg, #FFD700, #FFA500)',
                  color: '#0A0A0A',
                  fontFamily: 'Outfit, sans-serif',
                  fontWeight: 900,
                  fontSize: '1.25rem',
                  letterSpacing: '2px',
                  padding: '0.4rem 1.5rem',
                  borderRadius: '6px',
                  transform: 'rotate(-14deg)',
                  boxShadow: '0 8px 24px rgba(0,0,0,0.8), 0 0 12px rgba(255, 215, 0, 0.5)',
                  border: '2px solid #0A0A0A',
                  textTransform: 'uppercase',
                }}>
                  Sold Out
                </div>
              </div>
            )}

            {/* Radio / Selection Indicator */}
            <div style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.9rem',
              filter: isSoldOut ? 'blur(1px)' : 'none',
            }}>
              <span style={{
                fontSize: '0.75rem', fontWeight: 800, letterSpacing: '1px',
                color: '#00E5FF', textTransform: 'uppercase',
                display: 'flex', alignItems: 'center', gap: '0.3rem',
              }}>
                💎 Lifetime
              </span>
              <div style={{
                width: '18px', height: '18px', borderRadius: '50%',
                border: selectedPlan === 'lifetime' ? '5px solid #00E5FF' : '2px solid #444',
                background: selectedPlan === 'lifetime' ? '#0A0A0A' : 'transparent',
                transition: 'all 0.15s ease',
              }} />
            </div>

            <div style={{ marginBottom: '0.9rem', filter: isSoldOut ? 'blur(1px)' : 'none' }}>
              <div style={{
                fontSize: '1.05rem', fontWeight: 800,
                color: '#00E5FF', fontFamily: 'Outfit, sans-serif',
                lineHeight: 1.25,
              }}>
                Founding Member Lifetime Pass
              </div>
              <p style={{
                fontSize: '0.8rem',
                color: 'var(--text-secondary, #A0A0A0)',
                marginTop: '0.25rem',
                marginBottom: 0,
              }}>
                Pay once, keep Pro forever
              </p>
            </div>

            {/* Scarcity Bar & Remaining Counter */}
            <div style={{ marginBottom: '1rem', filter: isSoldOut ? 'blur(1px)' : 'none' }}>
              <div style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                fontSize: '0.74rem', fontWeight: 700, color: '#00E5FF',
                marginBottom: '0.35rem',
              }}>
                <span>Only {spotsRemaining} of 25 spots remaining</span>
              </div>
              {/* Blue Bar: completely unfilled originally (0%), fills up with each purchase to 100% on 25th user */}
              <div style={{
                width: '100%', height: '8px',
                background: 'rgba(0, 229, 255, 0.15)',
                border: '1px solid rgba(0, 229, 255, 0.3)',
                borderRadius: '999px',
                overflow: 'hidden',
                position: 'relative',
              }}>
                <div style={{
                  height: '100%',
                  width: `${fillPercent}%`,
                  background: 'linear-gradient(90deg, #0284C7, #00E5FF)',
                  boxShadow: fillPercent > 0 ? '0 0 10px rgba(0, 229, 255, 0.6)' : 'none',
                  borderRadius: '999px',
                  transition: 'width 0.5s ease',
                }} />
              </div>
            </div>

            <ul style={{
              listStyle: 'none', padding: 0, margin: '0 0 0.75rem 0',
              display: 'flex', flexDirection: 'column', gap: '0.55rem',
              flexGrow: 1, fontSize: '0.8rem', color: '#ccc',
              filter: isSoldOut ? 'blur(1px)' : 'none',
            }}>
              <li style={{ display: 'flex', gap: '0.45rem', alignItems: 'center' }}>
                <span style={{ color: '#00E5FF' }}>✓</span> No recurring subscriptions
              </li>
              <li style={{ display: 'flex', gap: '0.45rem', alignItems: 'center' }}>
                <span style={{ color: '#00E5FF' }}>✓</span> Lifetime feature updates
              </li>
              <li style={{ display: 'flex', gap: '0.45rem', alignItems: 'center' }}>
                <span style={{ color: '#00E5FF' }}>✓</span> Founding Member badge
              </li>
            </ul>

            {/* Asterisk / Terms Clarification */}
            <div style={{
              fontSize: '0.68rem',
              color: 'rgba(0, 229, 255, 0.75)',
              lineHeight: 1.3,
              marginTop: 'auto',
              borderTop: '1px solid rgba(0, 229, 255, 0.15)',
              paddingTop: '0.45rem',
              filter: isSoldOut ? 'blur(1px)' : 'none',
            }}>
              *Fair use limits apply: up to 50 meal plan generations per month under our Terms of Service.
            </div>
          </div>

        </div>

        {/* ── Single "Continue" Button ── */}
        <button
          onClick={handleContinue}
          disabled={loading || (selectedPlan === 'lifetime' && isSoldOut)}
          style={{
            width: '100%',
            padding: '1rem',
            borderRadius: '14px',
            border: 'none',
            background: loading
              ? 'rgba(255,255,255,0.1)'
              : buttonStyle.background,
            color: loading ? '#888' : buttonStyle.color,
            fontFamily: 'Outfit, sans-serif',
            fontSize: '1.15rem',
            fontWeight: 800,
            cursor: loading || (selectedPlan === 'lifetime' && isSoldOut) ? 'not-allowed' : 'pointer',
            transition: 'all 0.25s ease',
            boxShadow: loading ? 'none' : buttonStyle.shadow,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.5rem',
          }}
        >
          {loading ? (
            'Redirecting to checkout...'
          ) : (
            <>
              Continue
              <span style={{ fontSize: '1.2rem', transition: 'transform 0.15s' }}>→</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}