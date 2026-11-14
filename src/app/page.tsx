'use client';

import { useSession, signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useState, useEffect, useRef } from 'react';
import { getSession, loginUser, SessionData } from '../lib/auth';
import { checkAndActivatePro } from '../lib/proUsers';

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
  const [pendingCheckout, setPendingCheckout] = useState(false);
  const [loginId, setLoginId] = useState('');
  const [loginPw, setLoginPw] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [customSession, setCustomSession] = useState<SessionData | null>(null);
  const [isPro, setIsPro] = useState(false);
  const [pricingPlan, setPricingPlan] = useState<'monthly' | 'annual' | 'lifetime'>('annual');
  const [pendingPlan, setPendingPlan] = useState<'monthly' | 'annual' | 'lifetime'>('annual');
  const [lifetimeSpots, setLifetimeSpots] = useState<number>(25);
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
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [showReviewsDropdown, setShowReviewsDropdown] = useState(false);
  const [localReviews, setLocalReviews] = useState<{id:string, name:string, userName:string, rating:number, stars:number, comment:string, text:string, owner:string, createdAt:string}[]>([]);

  useEffect(() => {
    setCustomSession(getSession());
    // Load reviews from localStorage (persistent across refreshes)
    try {
      const stored = localStorage.getItem('prepbite_reviews');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) setLocalReviews(parsed);
      }
    } catch {}
    fetch('/api/lifetime-spots')
      .then(res => res.json())
      .then(data => {
        if (typeof data.remaining === 'number') {
          setLifetimeSpots(Math.max(0, Math.min(25, data.remaining)));
        }
      })
      .catch(() => {});

    if (typeof window !== 'undefined') {
      const searchParams = new URLSearchParams(window.location.search);
      if (searchParams.get('login') === 'true') {
        setShowSignIn(true);
      }
      const authError = searchParams.get('error');
      if (authError) {
        setShowSignIn(true);
        if (authError === 'OAuthSignin' || authError === 'OAuthCallback') {
          setLoginError('Google sign-in could not be completed. Please try again.');
        } else if (authError === 'AccessDenied') {
          setLoginError('Sign-in access was denied. Please allow permissions to sign in.');
        } else {
          setLoginError(`Authentication error: ${authError}. Please try again.`);
        }
      }
    }
  }, []);

  // Sync pro status when session is resolved
  useEffect(() => {
    const userEmail = customSession?.email || oauthSession?.user?.email;
    if (userEmail) {
      const hasPro = checkAndActivatePro(userEmail);
      setIsPro(hasPro);
    } else {
      setIsPro(false);
      localStorage.removeItem('prepbite-is-pro');
    }
  }, [oauthSession, customSession]);

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

  // Only consider logged in if an email actually exists
  const isLoggedIn = Boolean(oauthSession?.user?.email || customSession?.email);
  const displayName = customSession?.username || oauthSession?.user?.name || (oauthSession?.user?.email ? oauthSession.user.email.split('@')[0] : null);
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
      const userEmail = result.user!.email;
      // Check if this user is a Pro user
      const accountHasPro = checkAndActivatePro(userEmail);
      setIsPro(accountHasPro);

      if (pendingCheckout) {
        setPendingCheckout(false);
        if (accountHasPro) {
          // If the account ALREADY has Pro, just sign in (go to /app)
          router.push('/app');
        } else {
          // If the account DOES NOT have Pro, take them to the Dodo buy menu!
          setCheckoutLoading(true);
          try {
            const res = await fetch('/api/create-checkout-session', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ planType: pendingPlan }),
            });
            const data = await res.json();
            if (data.checkout_url) {
              window.location.href = data.checkout_url;
              return;
            } else {
              alert(data.error || 'Unable to start checkout. Please try again.');
              setCheckoutLoading(false);
              router.push('/app');
            }
          } catch {
            alert('Unable to start checkout. Please try again.');
            setCheckoutLoading(false);
            router.push('/app');
          }
        }
      } else {
        router.push('/app');
      }
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
      const userEmail = customSession?.email || oauthSession?.user?.email || '';
      const newReview = {
        id: Date.now().toString(36) + Math.random().toString(36).slice(2),
        name: displayName || '',
        userName: displayName || '',
        stars: reviewStars,
        rating: reviewStars,
        text: reviewText.trim(),
        comment: reviewText.trim(),
        owner: displayName || '',
        createdAt: new Date().toISOString(),
      };
      // Save to localStorage immediately (persistent source of truth)
      const updated = [newReview, ...localReviews];
      setLocalReviews(updated);
      localStorage.setItem('prepbite_reviews', JSON.stringify(updated));
      
      // Fire email notification via API (background, non-blocking)
      fetch('/api/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'REVIEW',
          payload: { name: displayName, email: userEmail, stars: reviewStars, review: reviewText.trim() }
        })
      }).catch(() => {});

      setReviewSuccess(true);
      setReviewText('');
      setReviewStars(0);
      setTimeout(() => setReviewSuccess(false), 3000);
    } catch { alert('Failed to submit review. Please try again.'); }
    setReviewSubmitting(false);
  };

  const handleUpgrade = async (plan?: 'monthly' | 'annual' | 'lifetime') => {
    if (checkoutLoading) return;
    const targetPlan = plan || pricingPlan;
    setPendingPlan(targetPlan);
    // Require sign-in before going to checkout
    if (!isLoggedIn) {
      setPendingCheckout(true);
      setShowSignIn(true);
      return;
    }
    // If account already has Pro, go straight to dashboard
    if (isPro) {
      router.push('/app');
      return;
    }
    setCheckoutLoading(true);
    try {
      const res = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planType: targetPlan }),
      });
      const data = await res.json();
      if (data.checkout_url) {
        window.location.href = data.checkout_url;
      } else {
        alert(data.error || 'Unable to start checkout. Please try again.');
        setCheckoutLoading(false);
      }
    } catch {
      alert('Unable to start checkout. Please try again.');
      setCheckoutLoading(false);
    }
  };

  const handleCheckoutAfterGoogleSignIn = async () => {
    // Called after Google OAuth redirect when pendingCheckout was set
    if (!pendingCheckout) return;
    setPendingCheckout(false);
    setCheckoutLoading(true);
    try {
      const res = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planType: pendingPlan }),
      });
      const data = await res.json();
      if (data.checkout_url) {
        window.location.href = data.checkout_url;
      } else {
        alert(data.error || 'Unable to start checkout. Please try again.');
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

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('revealed');
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.1, rootMargin: '0px 0px -40px 0px' }
    );

    const elements = document.querySelectorAll('.reveal-init');
    elements.forEach((el) => observer.observe(el));

    return () => observer.disconnect();
  }, [showReviewsDropdown]);

  return (
    <div className="lp">
      {/* ─── NAVBAR ─── */}
      <nav className="lp-nav">
        <div className="lp-nav-inner">
          <div className="lp-nav-brand" style={{ cursor: 'pointer' }} onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
            <img src="/prepbite-logo-transparent.png?v=3" alt="PrepBite" className="lp-nav-logo" style={{ height: '36px', width: 'auto', borderRadius: '6px' }} />
          </div>
          <div className="lp-nav-links">
            <button className="lp-nav-link" onClick={() => scrollTo('features')}>Features</button>
            <button className="lp-nav-link" onClick={() => scrollTo('pricing')}>Pricing</button>
            <button className="lp-nav-link" onClick={() => scrollTo('reviews')}>Reviews</button>
            <button className="lp-nav-link" onClick={() => scrollTo('about')}>About Us</button>
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

            {loginError && (
              <div style={{
                background: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                color: '#ef4444',
                padding: '0.65rem 0.85rem',
                borderRadius: '8px',
                fontSize: '0.85rem',
                marginBottom: '0.75rem',
                textAlign: 'center'
              }}>
                {loginError}
              </div>
            )}

            {/* Google OAuth button only */}

            {/* Google OAuth button */}
            <button
              className="lp-google-btn"
              onClick={() => {
                setLoginError('');
                signIn('google', { callbackUrl: pendingCheckout ? `/auth-callback?checkout=1&plan=${pendingPlan}` : '/auth-callback' });
              }}
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
            </div>
        </div>
      )}

      {/* ─── HERO ─── */}
      <section className="lp-hero">
        <div className="lp-hero-glow" />
        <div className="lp-hero-grid" />
        <div className="lp-hero-content">
          <p className="lp-section-eyebrow reveal-init">{"For anyone tired of asking \"what's for dinner?\""}</p>
          <h1 className="lp-hero-title reveal-init reveal-heading">
            Generating meal plan in less than{' '}
            <span style={{ color: '#10b981' }}>60 seconds</span>
          </h1>
          <p className="lp-motto reveal-init" style={{ fontStyle: 'normal' }}>Less prep, better bites.</p>
          <p className="lp-hero-sub reveal-init">
            Stop stressing over daily dinner decisions. Pick your preferences, generate
            customized 7-day plans, swap recipes instantly, and auto-sync missing ingredients.
          </p>
          <div className="lp-hero-actions reveal-init">
            {isLoggedIn ? (
              <button className="lp-btn-cta lp-btn-dashboard" onClick={() => router.push('/app')}>
                Go to Dashboard →
              </button>
            ) : (
              <button className="lp-btn-cta lp-btn-dashboard" onClick={() => setShowSignIn(true)}>
                Try it for free
              </button>
            )}
            <button className="lp-btn-ghost" onClick={() => scrollTo('features')}>
              See How It Works ↓
            </button>
          </div>
        </div>

        {/* Hero mockup card */}
        <div className="lp-hero-mockup reveal-init reveal-stagger-2">
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
          <p className="lp-section-eyebrow reveal-init">How it works</p>
          <h2 className="lp-section-title reveal-init reveal-heading">Three steps to effortless meals</h2>
          <p className="lp-section-sub reveal-init">No spreadsheets. No decision fatigue. Just food you'll love.</p>
          <div className="lp-steps">
            {[
              { num: '01', icon: '🎯', title: 'Set Dietary Goals', desc: 'Enter your calorie target, dietary preferences, and restrictions. We handle the math.' },
              { num: '02', icon: '⚡', title: 'Generate & Swap', desc: 'Get a complete 7-day meal plan instantly. Don\'t like a recipe? Swap it with one click.' },
              { num: '03', icon: '🛒', title: 'Smart Grocery Sync', desc: 'Missing ingredients auto-populate your shopping list. Never forget an item again.' },
            ].map((step, i) => (
              <div key={i} className={`lp-step-card reveal-init reveal-stagger-${i + 1}`}>
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
        <div className="lp-section-inner" style={{ maxWidth: '960px' }}>
          <p className="lp-section-eyebrow reveal-init">Membership Plans</p>
          <h2 className="lp-section-title reveal-init reveal-heading">Choose Your PrepBite Plan</h2>
          <p className="lp-section-sub reveal-init">Unlock unlimited meal planning, smart recipe swaps, and auto grocery sync.</p>

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
            @media (max-width: 820px) {
              .lp-plans-grid {
                grid-template-columns: 1fr !important;
              }
            }
          `}</style>

          {isLoggedIn && isPro ? (
            /* Pro user: show benefits + thank-you */
            <div style={{ maxWidth: '520px', margin: '0 auto', textAlign: 'center' }}>
              <div className="lp-price-card lp-price-pro reveal-init" style={{ marginBottom: '1.5rem' }}>
                <div className="lp-price-badge">👑 YOUR PLAN</div>
                <h3 className="lp-price-name lp-gradient-text">Pro Member</h3>
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
              <p className="reveal-init" style={{ fontSize: '1.15rem', fontWeight: 600, color: 'var(--accent)', marginTop: '1rem' }}>
                Thank you for choosing the Pro version!
              </p>
            </div>
          ) : (
            /* 3 Membership Plan Choices (No Free Tier) */
            <div className="reveal-init" style={{ maxWidth: '900px', margin: '0 auto' }}>
              <div className="lp-plans-grid" style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '1.15rem',
                marginBottom: '1.8rem',
              }}>
                {/* ── Monthly Plan (Green) ── */}
                <div
                  onClick={() => setPricingPlan('monthly')}
                  style={{
                    position: 'relative',
                    background: pricingPlan === 'monthly'
                      ? 'linear-gradient(180deg, rgba(0, 230, 118, 0.12) 0%, rgba(15, 15, 15, 0.98) 100%)'
                      : 'var(--bg-card, #141414)',
                    border: pricingPlan === 'monthly'
                      ? '2px solid #00E676'
                      : '1.5px solid rgba(0, 230, 118, 0.3)',
                    borderRadius: '16px',
                    padding: '1.5rem 1.25rem',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    transition: 'all 0.25s ease',
                    boxShadow: pricingPlan === 'monthly' ? '0 0 26px rgba(0, 230, 118, 0.25)' : 'none',
                    transform: pricingPlan === 'monthly' ? 'translateY(-3px)' : 'none',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.9rem' }}>
                    <span style={{ fontSize: '0.8rem', fontWeight: 800, letterSpacing: '1px', color: '#00E676', textTransform: 'uppercase' }}>
                      Monthly
                    </span>
                    <div style={{
                      width: '18px', height: '18px', borderRadius: '50%',
                      border: pricingPlan === 'monthly' ? '5px solid #00E676' : '2px solid #555',
                      background: pricingPlan === 'monthly' ? '#0A0A0A' : 'transparent',
                    }} />
                  </div>
                  <div style={{ marginBottom: '1.1rem' }}>
                    <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#FAFAFA', fontFamily: 'Outfit, sans-serif' }}>
                      $5 <span style={{ fontSize: '0.9rem', color: '#888', fontWeight: 500 }}>/ mo</span>
                    </div>
                    <p style={{ fontSize: '0.86rem', color: '#00E676', fontWeight: 600, marginTop: '0.25rem', marginBottom: 0 }}>
                      $1.15/week, billed monthly
                    </p>
                  </div>
                  <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 1rem 0', display: 'flex', flexDirection: 'column', gap: '0.6rem', flexGrow: 1, fontSize: '0.83rem', color: '#ccc' }}>
                    <li style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}><span style={{ color: '#00E676' }}>✓</span> Unlimited generations</li>
                    <li style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}><span style={{ color: '#00E676' }}>✓</span> Unlimited recipe swaps</li>
                    <li style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}><span style={{ color: '#00E676' }}>✓</span> Auto missing ingredients</li>
                  </ul>
                </div>

                {/* ── Annual Plan (Gold with Crown & Glint, "Most popular", Pre-selected) ── */}
                <div
                  onClick={() => setPricingPlan('annual')}
                  className="pb-glint-gold"
                  style={{
                    position: 'relative',
                    background: pricingPlan === 'annual'
                      ? 'linear-gradient(180deg, rgba(255, 215, 0, 0.14) 0%, rgba(15, 15, 15, 0.98) 100%)'
                      : 'var(--bg-card, #141414)',
                    border: pricingPlan === 'annual'
                      ? '2px solid #FFD700'
                      : '1.5px solid rgba(255, 215, 0, 0.45)',
                    borderRadius: '16px',
                    padding: '1.5rem 1.25rem',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    transition: 'all 0.25s ease',
                    boxShadow: pricingPlan === 'annual' ? '0 0 30px rgba(255, 215, 0, 0.3)' : 'none',
                    transform: pricingPlan === 'annual' ? 'translateY(-3px)' : 'none',
                    overflow: 'hidden',
                  }}
                >
                  <div style={{
                    position: 'absolute', top: '0', right: '0',
                    background: 'linear-gradient(135deg, #FFD700, #FFA500)',
                    color: '#0A0A0A',
                    padding: '0.24rem 0.75rem',
                    borderRadius: '0 14px 0 10px',
                    fontSize: '0.72rem', fontWeight: 800,
                    display: 'flex', alignItems: 'center', gap: '0.3rem',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
                    zIndex: 2,
                  }}>
                    <span>👑</span> Most popular
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.9rem' }}>
                    <span style={{ fontSize: '0.8rem', fontWeight: 800, letterSpacing: '1px', color: '#FFD700', textTransform: 'uppercase' }}>
                      Annual
                    </span>
                    <div style={{
                      width: '18px', height: '18px', borderRadius: '50%',
                      border: pricingPlan === 'annual' ? '5px solid #FFD700' : '2px solid #555',
                      background: pricingPlan === 'annual' ? '#0A0A0A' : 'transparent',
                      marginRight: '5.5rem',
                    }} />
                  </div>
                  <div style={{ marginBottom: '1.1rem' }}>
                    <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#FAFAFA', fontFamily: 'Outfit, sans-serif' }}>
                      $39 <span style={{ fontSize: '0.9rem', color: '#888', fontWeight: 500 }}>/ yr</span>
                    </div>
                    <p style={{ fontSize: '0.86rem', color: '#FFD700', fontWeight: 700, marginTop: '0.25rem', marginBottom: 0 }}>
                      $0.75/week, billed annually
                    </p>
                  </div>
                  <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 1rem 0', display: 'flex', flexDirection: 'column', gap: '0.6rem', flexGrow: 1, fontSize: '0.83rem', color: '#ccc' }}>
                    <li style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}><span style={{ color: '#FFD700' }}>✓</span> All Pro features included</li>
                    <li style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}><span style={{ color: '#FFD700' }}>✓</span> 35% weekly savings</li>
                    <li style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}><span style={{ color: '#FFD700' }}>✓</span> Priority recipe generation</li>
                  </ul>
                </div>

                {/* ── Lifetime Plan (Diamond Blue with Glint & Spots Bar) ── */}
                <div
                  onClick={() => {
                    if (lifetimeSpots > 0) setPricingPlan('lifetime');
                  }}
                  className={lifetimeSpots > 0 ? 'pb-glint-blue' : ''}
                  style={{
                    position: 'relative',
                    background: lifetimeSpots <= 0
                      ? 'rgba(20, 20, 20, 0.7)'
                      : pricingPlan === 'lifetime'
                        ? 'linear-gradient(180deg, rgba(0, 229, 255, 0.14) 0%, rgba(15, 15, 15, 0.98) 100%)'
                        : 'var(--bg-card, #141414)',
                    border: lifetimeSpots <= 0
                      ? '1px solid rgba(255, 255, 255, 0.08)'
                      : pricingPlan === 'lifetime'
                        ? '2px solid #00E5FF'
                        : '1.5px solid rgba(0, 229, 255, 0.35)',
                    borderRadius: '16px',
                    padding: '1.5rem 1.25rem',
                    cursor: lifetimeSpots <= 0 ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    transition: 'all 0.25s ease',
                    boxShadow: lifetimeSpots > 0 && pricingPlan === 'lifetime' ? '0 0 30px rgba(0, 229, 255, 0.3)' : 'none',
                    transform: lifetimeSpots > 0 && pricingPlan === 'lifetime' ? 'translateY(-3px)' : 'none',
                    overflow: 'hidden',
                  }}
                >
                  {/* Sold Out Overlay */}
                  {lifetimeSpots <= 0 && (
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
                        fontSize: '1.3rem',
                        letterSpacing: '2px',
                        padding: '0.45rem 1.6rem',
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

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.9rem', filter: lifetimeSpots <= 0 ? 'blur(1px)' : 'none' }}>
                    <span style={{ fontSize: '0.8rem', fontWeight: 800, letterSpacing: '1px', color: '#00E5FF', textTransform: 'uppercase' }}>
                      💎 Lifetime
                    </span>
                    <div style={{
                      width: '18px', height: '18px', borderRadius: '50%',
                      border: pricingPlan === 'lifetime' ? '5px solid #00E5FF' : '2px solid #555',
                      background: pricingPlan === 'lifetime' ? '#0A0A0A' : 'transparent',
                    }} />
                  </div>
                  <div style={{ marginBottom: '0.9rem', filter: lifetimeSpots <= 0 ? 'blur(1px)' : 'none' }}>
                    <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#00E5FF', fontFamily: 'Outfit, sans-serif', lineHeight: 1.25 }}>
                      Founding Member Lifetime Pass
                    </div>
                    <p style={{ fontSize: '0.82rem', color: '#999', marginTop: '0.25rem', marginBottom: 0 }}>
                      Pay once, keep Pro forever
                    </p>
                  </div>

                  {/* Scarcity Bar */}
                  <div style={{ marginBottom: '1.1rem', filter: lifetimeSpots <= 0 ? 'blur(1px)' : 'none' }}>
                    <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#00E5FF', marginBottom: '0.35rem' }}>
                      Only {lifetimeSpots} of 25 spots remaining
                    </div>
                    <div style={{
                      width: '100%', height: '8px',
                      background: 'rgba(0, 229, 255, 0.15)',
                      border: '1px solid rgba(0, 229, 255, 0.3)',
                      borderRadius: '999px',
                      overflow: 'hidden',
                    }}>
                      <div style={{
                        height: '100%',
                        width: `${Math.min(100, Math.max(0, ((25 - lifetimeSpots) / 25) * 100))}%`,
                        background: 'linear-gradient(90deg, #0284C7, #00E5FF)',
                        boxShadow: '0 0 10px rgba(0, 229, 255, 0.6)',
                        borderRadius: '999px',
                        transition: 'width 0.5s ease',
                      }} />
                    </div>
                  </div>

                  <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 0.8rem 0', display: 'flex', flexDirection: 'column', gap: '0.6rem', flexGrow: 1, fontSize: '0.83rem', color: '#ccc', filter: lifetimeSpots <= 0 ? 'blur(1px)' : 'none' }}>
                    <li style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}><span style={{ color: '#00E5FF' }}>✓</span> No recurring subscriptions</li>
                    <li style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}><span style={{ color: '#00E5FF' }}>✓</span> Lifetime feature updates</li>
                    <li style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}><span style={{ color: '#00E5FF' }}>✓</span> Founding Member badge</li>
                  </ul>

                  <div style={{
                    fontSize: '0.7rem', color: 'rgba(0, 229, 255, 0.75)', lineHeight: 1.3,
                    marginTop: 'auto', borderTop: '1px solid rgba(0, 229, 255, 0.15)', paddingTop: '0.45rem',
                    filter: lifetimeSpots <= 0 ? 'blur(1px)' : 'none',
                  }}>
                    *Fair use limits apply: up to 50 meal plan generations per month under our Terms of Service.
                  </div>
                </div>
              </div>

              {/* ── Single "Continue" Button ── */}
              <button
                onClick={() => handleUpgrade(pricingPlan)}
                disabled={checkoutLoading || (pricingPlan === 'lifetime' && lifetimeSpots <= 0)}
                style={{
                  width: '100%',
                  padding: '1.05rem',
                  borderRadius: '14px',
                  border: 'none',
                  background: checkoutLoading
                    ? 'rgba(255,255,255,0.1)'
                    : pricingPlan === 'monthly'
                      ? 'linear-gradient(135deg, #00E676, #10B981)'
                      : pricingPlan === 'lifetime'
                        ? 'linear-gradient(135deg, #00E5FF, #0284C7)'
                        : 'linear-gradient(135deg, #FFD700, #FFA500)',
                  color: '#0A0A0A',
                  fontFamily: 'Outfit, sans-serif',
                  fontSize: '1.2rem',
                  fontWeight: 800,
                  cursor: checkoutLoading || (pricingPlan === 'lifetime' && lifetimeSpots <= 0) ? 'not-allowed' : 'pointer',
                  transition: 'all 0.25s ease',
                  boxShadow: checkoutLoading
                    ? 'none'
                    : pricingPlan === 'monthly'
                      ? '0 6px 25px rgba(0, 230, 118, 0.4)'
                      : pricingPlan === 'lifetime'
                        ? '0 6px 25px rgba(0, 229, 255, 0.4)'
                        : '0 6px 25px rgba(255, 215, 0, 0.4)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                }}
              >
                {checkoutLoading ? 'Redirecting to checkout...' : 'Continue →'}
              </button>
            </div>
          )}
        </div>
      </section>
      {/* ─── REVIEWS SECTION ─── */}
      <section className="lp-section" id="reviews">
        <div className="lp-section-inner">
          <p className="lp-section-eyebrow reveal-init">Community</p>
          <h2 className="lp-section-title reveal-init reveal-heading">What people are saying</h2>
          <p className="lp-section-sub reveal-init">Read our latest reviews and share your experience.</p>
          
          <div className="review-stats reveal-init">
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
              className="lp-btn-outline reveal-init" 
              onClick={() => setShowReviewsDropdown(!showReviewsDropdown)}
              style={{ padding: '0.75rem 1.5rem', display: 'inline-flex', gap: '0.5rem', alignItems: 'center' }}
            >
              Read Reviews {showReviewsDropdown ? '▲' : '▼'}
            </button>
          </div>

          {showReviewsDropdown && (
            <div className="animate-slide-up" style={{ marginBottom: '3rem' }}>
              {reviewsLoading ? (
                <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-muted)' }}>Loading reviews…</div>
              ) : localReviews.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '3rem 1rem' }}>
                  <div style={{ fontSize: '4rem', marginBottom: '1rem', opacity: 0.5 }}>📦</div>
                  <p style={{ color: 'var(--text-muted)' }}>No reviews yet. Be the first!</p>
                </div>
              ) : (
                <div style={{ display: 'grid', gap: '1rem' }}>
                  {localReviews.map((rev, i) => {
                    const isOwn = isLoggedIn && rev.owner === displayName;
                    return (
                    <div key={rev.id || i} className={`review-card reveal-init reveal-stagger-${(i % 3) + 1}`} style={{ position: 'relative' }}>
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
                                <button style={{ width: '100%', textAlign: 'left', padding: '0.5rem 0.75rem', background: 'none', border: 'none', cursor: 'pointer', color: '#EF4444', borderRadius: 'var(--radius)' }} onClick={() => { setActiveReviewMenu(null); const reviewId = rev.id; setLocalReviews(prev => { const updated = prev.filter(r => r.id !== reviewId); localStorage.setItem('prepbite_reviews', JSON.stringify(updated)); return updated; }); }}>🗑️ Delete</button>
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

          <div className="contact-box reveal-init" style={{ maxWidth: '600px', margin: '0 auto' }}>
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

      {/* ─── ABOUT US SECTION ─── */}
      <section className="lp-section" id="about">
        <div className="lp-section-inner" style={{ maxWidth: '800px' }}>
          <p className="lp-section-eyebrow reveal-init">About Us</p>
          <h2 className="lp-section-title reveal-init reveal-heading" style={{ fontWeight: 800 }}>About PrepBite</h2>
          <p className="reveal-init" style={{ color: '#10b981', fontWeight: 700, fontSize: '1.25rem', marginTop: '0.5rem', marginBottom: '1.5rem' }}>
            Less prep, better bites.
          </p>
          <div className="glass-card reveal-init" style={{ padding: '2.5rem', textAlign: 'left', lineHeight: 1.75, borderRadius: 'var(--radius-lg)' }}>
            <p style={{ fontSize: '1.15rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.75rem' }}>
              Meal planning shouldn’t feel like a second job.
            </p>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>
              PrepBite was built to eliminate mealtime decision fatigue. We help busy students, professionals, and lifters hit their nutrition goals without spending hours buried in clunky spreadsheets or overcomplicated trackers.
            </p>

            <div style={{ height: '1px', background: 'var(--border)', margin: '2rem 0' }} />

            <h3 style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '1rem' }}>
              Why PrepBite Exists
            </h3>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem' }}>
              Most nutrition apps demand endless manual logging, barcode scanning, and rigid 7-day recipes that fall apart the minute your schedule gets hectic. Sticking to your diet isn&apos;t a willpower problem—it&apos;s a friction problem. When planning what to eat takes longer than cooking it, consistency dies.
            </p>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>
              PrepBite strips out the noise. You get practical batch-prep frameworks, automated grocery lists, and clean interfaces designed to adapt to a real routine—not hijack it.
            </p>

            <div style={{ height: '1px', background: 'var(--border)', margin: '2rem 0' }} />

            <h3 style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '1.25rem' }}>
              Core Principles
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', marginBottom: '2rem' }}>
              <div className="reveal-init reveal-stagger-1" style={{ background: 'var(--bg-secondary)', padding: '1.25rem', borderRadius: '12px', borderLeft: '4px solid #10b981' }}>
                <strong style={{ color: 'var(--text-primary)', fontSize: '1.05rem', display: 'block', marginBottom: '0.35rem' }}>
                  ⚡ Frictionless Speed
                </strong>
                <span style={{ color: 'var(--text-secondary)' }}>
                  Zero bloated workflows. Get a complete, realistic plan and a consolidated grocery run in under 60 seconds.
                </span>
              </div>
              <div className="reveal-init reveal-stagger-2" style={{ background: 'var(--bg-secondary)', padding: '1.25rem', borderRadius: '12px', borderLeft: '4px solid #10b981' }}>
                <strong style={{ color: 'var(--text-primary)', fontSize: '1.05rem', display: 'block', marginBottom: '0.35rem' }}>
                  🎯 Consistency Over Perfection
                </strong>
                <span style={{ color: 'var(--text-secondary)' }}>
                  Rigid calorie obsession burns people out. We prioritize practical, repeatable meals that support recovery, energy, and focus without locking you in the kitchen every night.
                </span>
              </div>
              <div className="reveal-init reveal-stagger-3" style={{ background: 'var(--bg-secondary)', padding: '1.25rem', borderRadius: '12px', borderLeft: '4px solid #10b981' }}>
                <strong style={{ color: 'var(--text-primary)', fontSize: '1.05rem', display: 'block', marginBottom: '0.35rem' }}>
                  🌱 Built in Public, Shaped by You
                </strong>
                <span style={{ color: 'var(--text-secondary)' }}>
                  No pop-ups, no spam. PrepBite is an independent project built directly around user feedback and real-world utility.
                </span>
              </div>
            </div>

            <div style={{ height: '1px', background: 'var(--border)', margin: '2rem 0' }} />

            <h3 style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '1rem' }}>
              Meet the Builder
            </h3>
            <p style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--accent)', marginBottom: '0.75rem' }}>
              Hey, I’m Ag!
            </p>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem' }}>
              I’m an independent builder and designer balancing high school exams, training, and software development.
            </p>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem' }}>
              Juggling intense study blocks, workouts, and cooking made me realize how much mental fuel was wasted just staring into the fridge wondering what to cook. I didn&apos;t want another bloated database—I wanted an automated system that solved the &quot;what&apos;s for dinner?&quot; dilemma instantly. So I built PrepBite.
            </p>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>
              Every feature and iteration is shaped by the people using it. If you hit a bug, want a new integration, or have an idea, reach out directly.
            </p>

            <div style={{ height: '1px', background: 'var(--border)', margin: '2rem 0' }} />

            <h3 style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '1rem' }}>
              Connect &amp; Feedback
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '2.5rem' }}>
              <p style={{ margin: 0, color: 'var(--text-secondary)' }}>
                <strong>Support &amp; Bug Reports:</strong>{' '}
                <a href="mailto:PrepBite.support@gmail.com" style={{ color: '#10b981', textDecoration: 'underline' }}>
                  PrepBite.support@gmail.com
                </a>
              </p>
              <p style={{ margin: 0, color: 'var(--text-secondary)' }}>
                <strong>Build-in-Public Updates:</strong>{' '}
                <a href="https://x.com/RealAgHere" target="_blank" rel="noopener noreferrer" style={{ color: '#10b981', textDecoration: 'underline' }}>
                  @RealAgHere on X
                </a>
              </p>
            </div>

            <div style={{ textAlign: 'center', paddingTop: '1.5rem', borderTop: '1px solid var(--border)' }}>
              <p style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: '1.25rem', color: 'var(--text-primary)' }}>
                Ready to take dinner off your mental to-do list?
              </p>
              {isLoggedIn ? (
                <button className="lp-btn-cta lp-btn-dashboard" onClick={() => router.push('/app')}>
                  Go to Dashboard →
                </button>
              ) : (
                <button className="lp-btn-cta lp-btn-dashboard" onClick={() => setShowSignIn(true)}>
                  Try PrepBite Free
                </button>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ─── FAQ SECTION ─── */}
      <section className="lp-section lp-section-alt" id="faq">
        <div className="lp-section-inner" style={{ maxWidth: '700px' }}>
          <p className="lp-section-eyebrow reveal-init">FAQ</p>
          <h2 className="lp-section-title reveal-init reveal-heading">Frequently Asked Questions</h2>
          <p className="lp-section-sub reveal-init">Everything you need to know about PrepBite.</p>
          
          <div style={{ margin: '3rem 0' }}>
            {FAQ_DATA.map((item, index) => (
              <div key={index} className={`faq-item reveal-init reveal-stagger-${(index % 3) + 1}`}>
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

          <div className="contact-box reveal-init">
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
        <div className="lp-footer-inner reveal-init">
          <div className="lp-footer-brand" style={{ cursor: 'pointer' }} onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
            <img src="/prepbite-logo-transparent.png?v=3" alt="PrepBite" style={{ height: '30px', width: 'auto', borderRadius: '6px' }} />
          </div>
          <p className="lp-footer-copy">© {new Date().getFullYear()} PrepBite. Less prep, better bites.</p>
          {isLoggedIn ? (
            <button className="lp-btn-cta lp-btn-sm" onClick={() => router.push('/app')}>
              Go to Dashboard →
            </button>
          ) : (
            <button className="lp-btn-cta lp-btn-sm" onClick={() => setShowSignIn(true)}>
              Try it for free
            </button>
          )}
        </div>
        <div className="reveal-init" style={{ textAlign: 'center', marginTop: '1.25rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
          Contact <a href="mailto:PrepBite.support@gmail.com" style={{ color: 'var(--accent)', textDecoration: 'underline' }}>PrepBite.support@gmail.com</a> for help
        </div>
      </footer>
    </div>
  );
}
