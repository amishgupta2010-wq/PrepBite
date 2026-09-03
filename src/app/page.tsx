'use client';

import { useSession, signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useState, useEffect, useRef } from 'react';
import { getSession, loginUser, SessionData } from '../lib/auth';

export default function LandingPage() {
  const { data: oauthSession } = useSession();
  const router = useRouter();
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [showSignIn, setShowSignIn] = useState(false);
  const [loginId, setLoginId] = useState('');
  const [loginPw, setLoginPw] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [customSession, setCustomSession] = useState<SessionData | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setCustomSession(getSession());
    if (typeof window !== 'undefined') {
      const searchParams = new URLSearchParams(window.location.search);
      if (searchParams.get('login') === 'true') {
        setShowSignIn(true);
      }
    }
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowSignIn(false);
      }
    };
    if (showSignIn) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [showSignIn]);

  const isLoggedIn = !!oauthSession || !!customSession;
  const displayName = customSession?.username || oauthSession?.user?.name || 'User';
  const gender = customSession?.gender || 'other';

  const genderAvatar = gender === 'male' ? '👨' : gender === 'female' ? '👩' : '🧑';
  const profileImage = oauthSession?.user?.image;

  const handleLogin = async () => {
    if (loginLoading) return;
    setLoginError('');
    if (!loginId.trim() || !loginPw) {
      setLoginError('Please fill in all fields.');
      return;
    }
    setLoginLoading(true);
    const result = await loginUser(loginId, loginPw, rememberMe);
    if (result.success) {
      setShowSignIn(false);
      setCustomSession({
        userId: result.user!.id,
        username: result.user!.username,
        email: result.user!.email,
        gender: result.user!.gender,
      });
    } else {
      setLoginError(result.error || 'Login failed.');
    }
    setLoginLoading(false);
  };

  const handleUpgrade = async () => {
    if (checkoutLoading) return;
    setCheckoutLoading(true);
    try {
      const res = await fetch('/api/create-checkout-session', { method: 'POST' });
      const data = await res.json();
      if (data.checkout_url) {
        window.location.href = data.checkout_url;
      } else {
        alert('Unable to start checkout. Please try again.');
        setCheckoutLoading(false);
      }
    } catch {
      alert('Unable to start checkout. Please try again.');
      setCheckoutLoading(false);
    }
  };

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="lp">
      {/* ─── NAVBAR ─── */}
      <nav className="lp-nav">
        <div className="lp-nav-inner">
          <div className="lp-nav-brand">
            <img src="/logo.jpg" alt="PrepBite" className="lp-nav-logo" />
            <span className="lp-nav-name">PrepBite</span>
          </div>
          <div className="lp-nav-links">
            <button className="lp-nav-link" onClick={() => scrollTo('features')}>Features</button>
            <button className="lp-nav-link" onClick={() => scrollTo('pricing')}>Pricing</button>
            {isLoggedIn ? (
              <button className="lp-user-pill" onClick={() => router.push('/app')}>
                <span className="lp-user-avatar" style={{ overflow: 'hidden' }}>
                  {profileImage ? (
                    <img src={profileImage} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    genderAvatar
                  )}
                </span>
                <span className="lp-user-name">{displayName}</span>
              </button>
            ) : (
              <button
                className="lp-btn-outline lp-btn-sm"
                onClick={() => setShowSignIn(true)}
              >
                Sign In
              </button>
            )}
          </div>
        </div>
      </nav>

      {/* Sign-In Modal */}
      {showSignIn && !isLoggedIn && (
        <div className="lp-modal-overlay">
          <div className="lp-signin-modal" ref={dropdownRef}>
            <button className="lp-modal-close" onClick={() => setShowSignIn(false)}>×</button>
            <h4 style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, marginBottom: '1rem', fontSize: '1.25rem' }}>
              Welcome back
            </h4>

            <div className="lp-input-group">
              <input
                className="lp-input"
                type="text"
                placeholder="Email or Username"
                value={loginId}
                onChange={e => { setLoginId(e.target.value); setLoginError(''); }}
                onKeyDown={e => e.key === 'Enter' && handleLogin()}
                autoFocus
              />
            </div>

            <div className="lp-input-group" style={{ position: 'relative' }}>
              <input
                className="lp-input"
                type={showPw ? 'text' : 'password'}
                placeholder="Password"
                value={loginPw}
                onChange={e => { setLoginPw(e.target.value); setLoginError(''); }}
                onKeyDown={e => e.key === 'Enter' && handleLogin()}
                style={{ paddingRight: '2.5rem' }}
              />
              <button
                onClick={() => setShowPw(!showPw)}
                className="lp-pw-toggle"
                type="button"
                tabIndex={-1}
              >
                {showPw ? '👁️' : '🙈'}
              </button>
            </div>

            <label className="lp-remember" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={e => setRememberMe(e.target.checked)}
                style={{ accentColor: 'var(--accent)', width: '16px', height: '16px' }}
              />
              <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Remember me</span>
            </label>

            {loginError && (
              <p style={{ color: '#FF4757', fontSize: '0.82rem', marginBottom: '0.75rem', fontWeight: 500 }}>
                {loginError}
              </p>
            )}

            <button
              className="lp-btn-primary"
              style={{ width: '100%', padding: '0.75rem', fontSize: '0.95rem', marginBottom: '1rem' }}
              onClick={handleLogin}
              disabled={loginLoading}
            >
              {loginLoading ? 'Signing in...' : 'Sign In'}
            </button>

            {/* Divider */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
              <div style={{ flex: 1, height: '1px', background: 'var(--border)' }} />
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>or</span>
              <div style={{ flex: 1, height: '1px', background: 'var(--border)' }} />
            </div>

            {/* Google OAuth button */}
            <button
              className="lp-google-btn"
              onClick={() => signIn('google', { callbackUrl: '/auth-callback' })}
              style={{ padding: '0.75rem' }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              <span>Continue with Google</span>
            </button>

            {/* Create Account link */}
            <p style={{ textAlign: 'center', fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '1rem' }}>
              Don't have an account?{' '}
              <button
                onClick={() => { setShowSignIn(false); router.push('/onboarding'); }}
                style={{
                  background: 'none', border: 'none', color: '#4285F4',
                  fontWeight: 600, cursor: 'pointer', fontSize: '0.85rem',
                  textDecoration: 'underline',
                }}
              >
                Create one!
              </button>
            </p>
          </div>
        </div>
      )}

      {/* ─── HERO ─── */}
      <section className="lp-hero">
        <div className="lp-hero-glow" />
        <div className="lp-hero-grid" />
        <div className="lp-hero-content">
          <div className="lp-badge">✨ Smart meal planning for everyone</div>
          <h1 className="lp-hero-title">
            Weekly Meal Planning &<br />
            <span className="lp-gradient-text">Smart Grocery Lists</span> on Autopilot
          </h1>
          <p className="lp-motto">Less prep, better bites.</p>
          <p className="lp-hero-sub">
            Stop stressing over daily dinner decisions. Pick your preferences, generate
            customized 7-day plans, swap recipes instantly, and auto-sync missing ingredients.
          </p>
          <div className="lp-hero-actions">
            {isLoggedIn ? (
              <button className="lp-btn-cta" onClick={() => router.push('/app')}>
                Go to Dashboard →
              </button>
            ) : (
              <button className="lp-btn-cta" onClick={() => router.push('/onboarding')}>
                Start Planning Free
              </button>
            )}
            <button className="lp-btn-ghost" onClick={() => scrollTo('features')}>
              See How It Works ↓
            </button>
          </div>
        </div>

        {/* Hero mockup card */}
        <div className="lp-hero-mockup">
          <div className="lp-mockup-card">
            <div className="lp-mockup-header">
              <span className="lp-mockup-dot" style={{ background: '#FF5F56' }} />
              <span className="lp-mockup-dot" style={{ background: '#FFBD2E' }} />
              <span className="lp-mockup-dot" style={{ background: '#27C93F' }} />
              <span style={{ marginLeft: 'auto', fontSize: '0.75rem', color: 'var(--text-muted)' }}>PrepBite Dashboard</span>
            </div>
            <div className="lp-mockup-body">
              <div className="lp-mockup-sidebar">
                <div className="lp-mockup-nav-item active">🥕 Ingredients</div>
                <div className="lp-mockup-nav-item">🛒 Shopping</div>
                <div className="lp-mockup-nav-item">📊 Progress</div>
              </div>
              <div className="lp-mockup-main">
                <div className="lp-mockup-title">Your Meal Plan</div>
                <div className="lp-mockup-days">
                  {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d, i) => (
                    <span key={d} className={`lp-mockup-day ${i === 0 ? 'active' : ''}`}>{d}</span>
                  ))}
                </div>
                <div className="lp-mockup-meals">
                  {[
                    { type: 'Breakfast', name: 'Avocado Toast', cal: '320 kcal', emoji: '🥑' },
                    { type: 'Lunch', name: 'Chicken Caesar Bowl', cal: '580 kcal', emoji: '🥗' },
                    { type: 'Dinner', name: 'Salmon & Broccoli', cal: '490 kcal', emoji: '🍣' },
                  ].map(meal => (
                    <div key={meal.type} className="lp-mockup-meal">
                      <span className="lp-mockup-meal-emoji">{meal.emoji}</span>
                      <div className="lp-mockup-meal-info">
                        <span className="lp-mockup-meal-type">{meal.type}</span>
                        <span className="lp-mockup-meal-name">{meal.name}</span>
                      </div>
                      <span className="lp-mockup-meal-cal">{meal.cal}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── 3-STEP WORKFLOW ─── */}
      <section className="lp-section" id="features">
        <div className="lp-section-inner">
          <div className="lp-badge" style={{ margin: '0 auto 1rem' }}>How it works</div>
          <h2 className="lp-section-title">Three steps to effortless meals</h2>
          <p className="lp-section-sub">No spreadsheets. No decision fatigue. Just food you'll love.</p>
          <div className="lp-steps">
            {[
              { num: '01', icon: '🎯', title: 'Set Dietary Goals', desc: 'Enter your calorie target, dietary preferences, and restrictions. We handle the math.' },
              { num: '02', icon: '⚡', title: 'Generate & Swap', desc: 'Get a complete 7-day meal plan instantly. Don\'t like a recipe? Swap it with one click.' },
              { num: '03', icon: '🛒', title: 'Smart Grocery Sync', desc: 'Missing ingredients auto-populate your shopping list. Never forget an item again.' },
            ].map((step, i) => (
              <div key={i} className="lp-step-card">
                <div className="lp-step-num">{step.num}</div>
                <div className="lp-step-icon">{step.icon}</div>
                <h3 className="lp-step-title">{step.title}</h3>
                <p className="lp-step-desc">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── PRICING ─── */}
      <section className="lp-section lp-section-alt" id="pricing">
        <div className="lp-section-inner">
          <div className="lp-badge" style={{ margin: '0 auto 1rem' }}>Pricing</div>
          <h2 className="lp-section-title">Simple, transparent pricing</h2>
          <p className="lp-section-sub">Start free. Upgrade when you need more power.</p>
          <div className="lp-pricing-grid">
            {/* Free tier */}
            <div className="lp-price-card">
              <h3 className="lp-price-name">Free</h3>
              <div className="lp-price-amount">
                <span className="lp-price-dollar">$0</span>
                <span className="lp-price-period">/month</span>
              </div>
              <ul className="lp-price-features">
                <li><span className="lp-check">✓</span> 3 meal plan generations / month</li>
                <li><span className="lp-cross">✕</span> Recipe swapping</li>
                <li><span className="lp-cross">✕</span> Auto grocery list sync</li>
              </ul>
              {isLoggedIn ? (
                <button className="lp-btn-outline" style={{ width: '100%' }} onClick={() => router.push('/app')}>
                  Current Plan
                </button>
              ) : (
                <button className="lp-btn-outline" style={{ width: '100%' }} onClick={() => router.push('/onboarding')}>
                  Get Started Free
                </button>
              )}
            </div>
            {/* Pro tier */}
            <div className="lp-price-card lp-price-pro">
              <div className="lp-price-badge">👑 BEST VALUE</div>
              <h3 className="lp-price-name lp-gradient-text">Pro</h3>
              <div className="lp-price-amount">
                <span className="lp-price-dollar">$5</span>
                <span className="lp-price-period">/month</span>
              </div>
              <ul className="lp-price-features">
                <li><span className="lp-check">✓</span> Unlimited meal plan generations</li>
                <li><span className="lp-check">✓</span> Unlimited smart recipe swapping</li>
                <li><span className="lp-check">✓</span> Auto-add missing ingredients</li>
              </ul>
              <button className="lp-btn-gold" style={{ width: '100%' }} onClick={handleUpgrade} disabled={checkoutLoading}>
                {checkoutLoading ? 'Redirecting...' : 'Upgrade to Pro'}
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ─── FOOTER ─── */}
      <footer className="lp-footer">
        <div className="lp-footer-inner">
          <div className="lp-footer-brand">
            <img src="/logo.jpg" alt="PrepBite" style={{ width: '28px', height: '28px', borderRadius: '6px' }} />
            <span style={{ fontWeight: 700, fontSize: '1.1rem' }}>PrepBite</span>
          </div>
          <p className="lp-footer-copy">© {new Date().getFullYear()} PrepBite. Less prep, better bites.</p>
          {isLoggedIn ? (
            <button className="lp-btn-cta lp-btn-sm" onClick={() => router.push('/app')}>
              Go to Dashboard →
            </button>
          ) : (
            <button className="lp-btn-cta lp-btn-sm" onClick={() => router.push('/onboarding')}>
              Get Started Free
            </button>
          )}
        </div>
      </footer>
    </div>
  );
}
