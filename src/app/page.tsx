'use client';

import { useSession, signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useState, useEffect, useRef } from 'react';
import { getSession, loginUser, SessionData } from '../lib/auth';
import { checkAndActivatePro } from '../lib/proUsers';
import SettingsModal from './components/SettingsModal';

const FAQ_DATA = [
  {
    q: 'Can I change my weight, username, and details later on?',
    a: 'Yes! You can absolutely change few details later on in account settings after setting up your account!'
  },
  {
    q: 'How will this app help me in my daily life, fitness, weight loss/gain journey?',
    a: 'It will generate an entire week plan for your meals with their recipes with clear calorie count based on your details and available ingredients so that you dont stress out on what to eat next! it also has a checklist feature so you can keep track of when you missed a meal or exercise!'
  },
  {
    q: 'Is buying the Pro version worth it?',
    a: 'Absolutely! You get UNLIMITED Week plan generations! UNLIMITED Recipe Swaps! and AUTOMATED Shopping Cart to instantly know which ingredients you should buy next! It gives you all those features for just 5$/month! All the features you need for your journey!'
  }
];

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
  const [isPro, setIsPro] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // FAQ & Review State
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null);
  const [faqQuestion, setFaqQuestion] = useState('');
  const [faqSubmitting, setFaqSubmitting] = useState(false);
  const [faqSuccess, setFaqSuccess] = useState(false);

  const [guestEmail, setGuestEmail] = useState('');
  const [activeReviewMenu, setActiveReviewMenu] = useState<number | null>(null);

  const [reviewStars, setReviewStars] = useState(0);
  const [reviewText, setReviewText] = useState('');
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [reviewSuccess, setReviewSuccess] = useState(false);
  const [showReviewsDropdown, setShowReviewsDropdown] = useState(false);
  const [localReviews, setLocalReviews] = useState<{name:string, stars:number, text:string, owner:string}[]>([]);

  useEffect(() => {
    setCustomSession(getSession());
    setIsPro(localStorage.getItem('prepbite-is-pro') === 'true');
    // Load persisted reviews from localStorage
    try {
      const saved = localStorage.getItem('prepbite-reviews');
      if (saved) setLocalReviews(JSON.parse(saved));
    } catch {}
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
      // Check if this user is a Pro user
      checkAndActivatePro(result.user!.email);
      router.push('/app');
    } else {
      setLoginError(result.error || 'Login failed.');
    }
    setLoginLoading(false);
  };

  const handleFaqSubmit = async () => {
    if (!faqQuestion.trim()) return;
    setFaqSubmitting(true);
    try {
      await fetch('/api/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'FAQ',
          payload: { name: displayName, email: customSession?.email || oauthSession?.user?.email || guestEmail || 'None', question: faqQuestion }
        })
      });
      setFaqSuccess(true);
      setFaqQuestion('');
      setGuestEmail('');
      setTimeout(() => setFaqSuccess(false), 3000);
    } catch { alert('Failed to send question'); }
    setFaqSubmitting(false);
  };

  const handleReviewSubmit = async () => {
    if (!reviewText.trim() || reviewStars === 0) return;
    setReviewSubmitting(true);
    try {
      await fetch('/api/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'REVIEW',
          payload: { name: displayName, email: customSession?.email || oauthSession?.user?.email || guestEmail || 'None', stars: reviewStars, review: reviewText }
        })
      });
      setReviewSuccess(true);
      const newReviews = [{ name: displayName, stars: reviewStars, text: reviewText, owner: displayName }, ...localReviews];
      setLocalReviews(newReviews);
      // Persist to localStorage so they survive refresh
      localStorage.setItem('prepbite-reviews', JSON.stringify(newReviews));
      setReviewText('');
      setReviewStars(0);
      setGuestEmail('');
      setTimeout(() => setReviewSuccess(false), 3000);
    } catch { alert('Failed to submit review'); }
    setReviewSubmitting(false);
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
      <SettingsModal />
      {/* ─── NAVBAR ─── */}
      <nav className="lp-nav">
        <div className="lp-nav-inner">
          <div className="lp-nav-brand">
            <img src="/prepbite-logo.png" alt="PrepBite" className="lp-nav-logo" />
            <span className="lp-nav-name">PrepBite</span>
          </div>
          <div className="lp-nav-links">
            <button className="lp-nav-link" onClick={() => scrollTo('features')}>Features</button>
            <button className="lp-nav-link" onClick={() => scrollTo('pricing')}>Pricing</button>
            <button className="lp-nav-link" onClick={() => scrollTo('reviews')}>Reviews</button>
            <button className="lp-nav-link" onClick={() => scrollTo('faq')}>FAQ</button>
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
                SignIn/SignUp
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

            {/* Google OAuth button only */}

            {/* Google OAuth button */}
            <button
              className="lp-google-btn"
              onClick={() => signIn('google', { callbackUrl: '/auth-callback' })}
              style={{
                width: '100%',
                marginTop: '1.25rem',
                display: 'flex',
                gap: '0.75rem',
                justifyContent: 'center',
                alignItems: 'center',
                background: 'var(--bg-card)',
                color: 'var(--text-primary)',
                border: '1px solid var(--border)',
                fontWeight: 600,
                fontSize: '1rem',
                padding: '0.85rem',
                borderRadius: 'var(--radius)'
              }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              SignIn/SignUp using Google
            </button>

            <button
              onClick={() => signIn('facebook', { callbackUrl: '/auth-callback' })}
              className="lp-facebook-btn"
              style={{
                width: '100%',
                marginTop: '0.75rem',
                display: 'flex',
                gap: '0.75rem',
                justifyContent: 'center',
                alignItems: 'center',
                background: '#1877F2',
                color: '#ffffff',
                border: 'none',
                fontWeight: 600,
                fontSize: '1rem',
                padding: '0.85rem',
                borderRadius: 'var(--radius)',
                cursor: 'pointer',
                transition: 'transform 0.2s ease, opacity 0.2s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.opacity = '0.9';
                e.currentTarget.style.transform = 'translateY(-1px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.opacity = '1';
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.469h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.469h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
              </svg>
              SignIn/SignUp using Facebook
            </button>
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
              <button className="lp-btn-cta lp-btn-dashboard" onClick={() => router.push('/app')}>
                Go to Dashboard →
              </button>
            ) : (
              <button className="lp-btn-cta lp-btn-dashboard" onClick={() => setShowSignIn(true)}>
                SignUp/SignIn
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

      <section className="lp-section lp-section-alt" id="pricing">
        <div className="lp-section-inner">
          <div className="lp-badge" style={{ margin: '0 auto 1rem' }}>Pricing</div>
          <h2 className="lp-section-title">Simple, transparent pricing</h2>
          <p className="lp-section-sub">Start free. Upgrade when you need more power.</p>

          {isPro ? (
            /* Pro user: show benefits + thank-you */
            <div style={{ maxWidth: '520px', margin: '0 auto', textAlign: 'center' }}>
              <div className="lp-price-card lp-price-pro" style={{ marginBottom: '1.5rem' }}>
                <div className="lp-price-badge">👑 YOUR PLAN</div>
                <h3 className="lp-price-name lp-gradient-text">Pro</h3>
                <ul className="lp-price-features" style={{ textAlign: 'left' }}>
                  <li><span className="lp-check">✓</span> Unlimited meal plan generations</li>
                  <li><span className="lp-check">✓</span> Unlimited smart recipe swapping</li>
                  <li><span className="lp-check">✓</span> Auto-add missing ingredients</li>
                  <li><span className="lp-check">✓</span> Priority support</li>
                </ul>
                <button className="lp-btn-dashboard" style={{ width: '100%', padding: '0.85rem', borderRadius: 'var(--radius)', border: 'none', fontWeight: 700, fontSize: '1rem', cursor: 'pointer' }} onClick={() => router.push('/app')}>
                  Go to Dashboard →
                </button>
              </div>
              <p style={{ fontSize: '1.15rem', fontWeight: 600, color: 'var(--accent)', marginTop: '1rem' }}>
                🙏 Thank you for choosing the Pro version!
              </p>
            </div>
          ) : (
            /* Free user: show normal pricing grid */
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
                  <button className="lp-btn-outline" style={{ width: '100%' }} onClick={() => setShowSignIn(true)}>
                    SignUp/SignIn
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
          )}
        </div>
      </section>
      {/* ─── REVIEWS SECTION ─── */}
      <section className="lp-section" id="reviews">
        <div className="lp-section-inner">
          <div className="lp-badge" style={{ margin: '0 auto 1rem' }}>Community</div>
          <h2 className="lp-section-title">What people are saying</h2>
          <p className="lp-section-sub">Read our latest reviews and share your experience.</p>
          
          <div className="review-stats">
            {[5, 4, 3, 2, 1].map(stars => {
              const count = localReviews.filter(r => r.stars === stars).length;
              const percent = localReviews.length > 0 ? (count / localReviews.length) * 100 : 0;
              return (
                <div key={stars} className="review-stat-row">
                  <span style={{ width: '40px' }}>{stars} ★</span>
                  <div className="review-stat-bar-container">
                    <div className="review-stat-bar" style={{ width: `${percent}%` }} />
                  </div>
                  <span style={{ width: '30px', textAlign: 'right' }}>{count}</span>
                </div>
              );
            })}
          </div>

          <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <button 
              className="lp-btn-outline" 
              onClick={() => setShowReviewsDropdown(!showReviewsDropdown)}
              style={{ padding: '0.75rem 1.5rem', display: 'inline-flex', gap: '0.5rem', alignItems: 'center' }}
            >
              Read Reviews {showReviewsDropdown ? '▲' : '▼'}
            </button>
          </div>

          {showReviewsDropdown && (
            <div className="animate-slide-up" style={{ marginBottom: '3rem' }}>
              {localReviews.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '3rem 1rem' }}>
                  <div style={{ fontSize: '4rem', marginBottom: '1rem', opacity: 0.5 }}>📦</div>
                  <p style={{ color: 'var(--text-muted)' }}>No reviews yet. Be the first!</p>
                </div>
              ) : (
                <div style={{ display: 'grid', gap: '1rem' }}>
                  {localReviews.map((rev, i) => {
                    const isOwn = isLoggedIn && rev.owner === displayName;
                    return (
                    <div key={i} className="review-card" style={{ position: 'relative' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                        <div>
                          <strong style={{ color: 'var(--accent)', marginRight: '0.5rem' }}>{rev.name}</strong>
                          <span style={{ color: '#F59E0B' }}>{'★'.repeat(rev.stars)}{'☆'.repeat(5-rev.stars)}</span>
                        </div>
                        <div style={{ position: 'relative' }}>
                          <button 
                            style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '1.25rem', lineHeight: 1 }}
                            onClick={() => setActiveReviewMenu(activeReviewMenu === i ? null : i)}
                          >
                            ⋮
                          </button>
                          {activeReviewMenu === i && (
                            <div style={{ 
                              position: 'absolute', right: 0, top: '100%', 
                              background: 'var(--bg-card)', border: '1px solid var(--border)', 
                              borderRadius: 'var(--radius)', padding: '0.5rem', 
                              minWidth: '130px', zIndex: 10,
                              boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
                            }}>
                              {!isOwn && (
                                <button style={{ width: '100%', textAlign: 'left', padding: '0.5rem 0.75rem', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-primary)', borderRadius: 'var(--radius)' }} onClick={() => { setActiveReviewMenu(null); alert('Review reported. Thank you!'); }}>🚩 Report</button>
                              )}
                              {isOwn && (
                                <button style={{ width: '100%', textAlign: 'left', padding: '0.5rem 0.75rem', background: 'none', border: 'none', cursor: 'pointer', color: '#EF4444', borderRadius: 'var(--radius)' }} onClick={() => { setActiveReviewMenu(null); const updated = localReviews.filter((_, idx) => idx !== i); setLocalReviews(updated); localStorage.setItem('prepbite-reviews', JSON.stringify(updated)); }}>🗑️ Delete</button>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                      <p style={{ color: 'var(--text-secondary)' }}>{rev.text}</p>
                    </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          <div className="contact-box" style={{ maxWidth: '600px', margin: '0 auto' }}>
            <h3 style={{ marginBottom: '1rem', fontSize: '1.25rem' }}>Leave a review?</h3>
            {!isLoggedIn ? (
              <div style={{ textAlign: 'center', padding: '1.5rem' }}>
                <p style={{ color: 'var(--text-secondary)', marginBottom: '0.5rem', fontSize: '1.05rem' }}>
                  <strong style={{ color: 'var(--accent)' }}>SignUp/SignIn — It&apos;s free!</strong>
                </p>
                <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem', fontSize: '0.9rem' }}>Create a free account to leave a review.</p>
                <button className="lp-btn-cta lp-btn-dashboard" onClick={() => setShowSignIn(true)}>
                  SignIn/SignUp
                </button>
              </div>
            ) : (
              <>
                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
                  {[1, 2, 3, 4, 5].map(s => (
                    <button 
                      key={s} 
                      className={`star-btn ${reviewStars >= s ? 'active' : ''}`}
                      onClick={() => setReviewStars(s)}
                    >
                      ★
                    </button>
                  ))}
                </div>
                <textarea 
                  className="input" 
                  placeholder="Tell us what you think..." 
                  rows={4}
                  value={reviewText}
                  onChange={e => setReviewText(e.target.value)}
                  style={{ width: '100%', marginBottom: '1rem', resize: 'vertical' }}
                />
                <button 
                  className="lp-btn-cta lp-btn-dashboard" 
                  onClick={handleReviewSubmit}
                  disabled={reviewSubmitting || !reviewText.trim() || reviewStars === 0}
                >
                  {reviewSubmitting ? 'Sending...' : 'Send Review'}
                </button>
                {reviewSuccess && <p style={{ color: 'var(--accent)', marginTop: '0.5rem' }}>Review submitted! ✓</p>}
              </>
            )}
          </div>
        </div>
      </section>

      {/* ─── FAQ SECTION ─── */}
      <section className="lp-section lp-section-alt" id="faq">
        <div className="lp-section-inner" style={{ maxWidth: '700px' }}>
          <div className="lp-badge" style={{ margin: '0 auto 1rem' }}>FAQ</div>
          <h2 className="lp-section-title">Frequently Asked Questions</h2>
          <p className="lp-section-sub">Everything you need to know about PrepBite.</p>
          
          <div style={{ margin: '3rem 0' }}>
            {FAQ_DATA.map((item, index) => (
              <div key={index} className="faq-item">
                <button 
                  className="faq-question" 
                  onClick={() => setOpenFaqIndex(openFaqIndex === index ? null : index)}
                >
                  {item.q}
                  <span style={{ transform: openFaqIndex === index ? 'rotate(180deg)' : 'none', transition: 'var(--transition)' }}>
                    ▼
                  </span>
                </button>
                {openFaqIndex === index && (
                  <div className="faq-answer animate-slide-up">
                    {item.a}
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="contact-box">
            <h3 style={{ marginBottom: '1rem', fontSize: '1.25rem' }}>Ask us a question</h3>
            {!isLoggedIn ? (
              <div style={{ textAlign: 'center', padding: '1.5rem' }}>
                <p style={{ color: 'var(--text-secondary)', marginBottom: '0.5rem', fontSize: '1.05rem' }}>
                  <strong style={{ color: 'var(--accent)' }}>SignUp/SignIn — It&apos;s free!</strong>
                </p>
                <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem', fontSize: '0.9rem' }}>Create a free account to ask us anything.</p>
                <button className="lp-btn-cta lp-btn-dashboard" onClick={() => setShowSignIn(true)}>
                  SignIn/SignUp
                </button>
              </div>
            ) : (
              <>
                <textarea 
                  className="input" 
                  placeholder="What&apos;s on your mind?" 
                  rows={3}
                  value={faqQuestion}
                  onChange={e => setFaqQuestion(e.target.value)}
                  style={{ width: '100%', marginBottom: '1rem', resize: 'vertical' }}
                />
                <button 
                  className="lp-btn-cta lp-btn-dashboard" 
                  onClick={handleFaqSubmit}
                  disabled={faqSubmitting || !faqQuestion.trim()}
                >
                  {faqSubmitting ? 'Sending...' : 'Send'}
                </button>
                {faqSuccess && <p style={{ color: 'var(--accent)', marginTop: '0.5rem' }}>Our team will get back to you! ✓</p>}
              </>
            )}
          </div>
        </div>
      </section>

      {/* ─── FOOTER ─── */}
      <footer className="lp-footer">
        <div className="lp-footer-inner">
          <div className="lp-footer-brand">
            <img src="/prepbite-logo.png" alt="PrepBite" style={{ width: '28px', height: '28px', borderRadius: '6px' }} />
            <span style={{ fontWeight: 700, fontSize: '1.1rem' }}>PrepBite</span>
          </div>
          <p className="lp-footer-copy">© {new Date().getFullYear()} PrepBite. Less prep, better bites.</p>
          {isLoggedIn ? (
            <button className="lp-btn-cta lp-btn-sm" onClick={() => router.push('/app')}>
              Go to Dashboard →
            </button>
          ) : (
            <button className="lp-btn-cta lp-btn-sm" onClick={() => setShowSignIn(true)}>
              SignUp/SignIn
            </button>
          )}
        </div>
      </footer>
    </div>
  );
}
