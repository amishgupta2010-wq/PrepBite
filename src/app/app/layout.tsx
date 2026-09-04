'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { getSession } from '../../lib/auth';
import Tutorial from '../components/Tutorial';
import UpgradeModal from '../components/UpgradeModal';
import { isBetaTester } from '../../lib/betaTester';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { status, data: session } = useSession();
  
  const [showBadge, setShowBadge] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [isLightMode, setIsLightMode] = useState(false);
  const [showAccountSettings, setShowAccountSettings] = useState(false);
  const [showSignOutConfirm, setShowSignOutConfirm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [userData, setUserData] = useState<any>(null);
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<string>('');
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [isPro, setIsPro] = useState(false);

  const [mealStreak, setMealStreak] = useState(0);
  const [exerciseStreak, setExerciseStreak] = useState(0);

  useEffect(() => {
    // Auth Guard
    if (status === 'loading') return;
    const customSession = getSession();
    if (!customSession && status === 'unauthenticated') {
      router.push('/');
      return;
    }

    const badge = localStorage.getItem('prepbite-shopping-badge');
    setShowBadge(badge === 'true');

    const theme = localStorage.getItem('prepbite-theme');
    if (theme === 'light') {
      setIsLightMode(true);
      document.documentElement.setAttribute('data-theme', 'light');
    }
    
    const ob = JSON.parse(localStorage.getItem('prepbite-onboarding') || '{}');
    setUserData(ob);
    setIsPro(localStorage.getItem('prepbite-is-pro') === 'true' || isBetaTester());

    // Calculate Streaks
    try {
      const progress = JSON.parse(localStorage.getItem('prepbite-progress') || '{}');
      let mStreak = 0;
      let eStreak = 0;
      const today = new Date();
      today.setHours(0,0,0,0);
      let checkMeal = true;
      let checkExercise = true;

      for (let i = 0; i < 365; i++) {
        const d = new Date(today);
        d.setDate(today.getDate() - i);
        const dateStr = d.toISOString().split('T')[0];
        const data = progress[dateStr];
        
        if (checkMeal) {
          if (data && data.breakfast && data.lunch && data.dinner) {
            mStreak++;
          } else if (i !== 0) {
            checkMeal = false;
          }
        }
        
        if (checkExercise) {
          if (data && data.exercise) {
            eStreak++;
          } else if (i !== 0) {
            checkExercise = false;
          }
        }
        if (!checkMeal && !checkExercise) break;
      }
      setMealStreak(mStreak);
      setExerciseStreak(eStreak);
    } catch {}
  }, [pathname, status, router]);

  const toggleTheme = () => {
    const next = !isLightMode;
    setIsLightMode(next);
    if (next) {
      document.documentElement.setAttribute('data-theme', 'light');
      localStorage.setItem('prepbite-theme', 'light');
    } else {
      document.documentElement.removeAttribute('data-theme');
      localStorage.setItem('prepbite-theme', 'dark');
    }
  };

  const handleReplayTutorial = () => {
    localStorage.removeItem('prepbite-tutorial-done');
    setShowSettings(false);
    window.dispatchEvent(new Event('prepbite-trigger-tutorial'));
  };

  const handleSaveField = () => {
    if (!editingField || !userData) return;
    const updated = { ...userData, [editingField]: editValue };
    setUserData(updated);
    localStorage.setItem('prepbite-onboarding', JSON.stringify(updated));
    setEditingField(null);
  };

  return (
    <>
      {/* Top Header */}
      <header style={{
        maxWidth: '800px',
        margin: '0 auto',
        padding: '1rem 1.5rem 0.5rem',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <button 
            onClick={() => router.push('/')}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              fontSize: '1.5rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '0.2rem'
            }}
          >
            ←
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 800, fontSize: '1.25rem', color: 'var(--accent)', letterSpacing: '-0.5px' }}>
            <img src="/logo.jpg" alt="PrepBite Logo" style={{ width: '32px', height: '32px', borderRadius: '8px', objectFit: 'cover' }} />
            PrepBite
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          {/* Streaks */}
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            {mealStreak > 0 && (
              <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#FF4757', display: 'flex', alignItems: 'center', gap: '0.2rem', background: 'rgba(255, 71, 87, 0.1)', padding: '0.2rem 0.5rem', borderRadius: '12px' }}>
                {mealStreak}x 🔥
              </div>
            )}
            {exerciseStreak > 0 && (
              <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#4285F4', display: 'flex', alignItems: 'center', gap: '0.2rem', background: 'rgba(66, 133, 244, 0.1)', padding: '0.2rem 0.5rem', borderRadius: '12px' }}>
                {exerciseStreak}x 🔥
              </div>
            )}
          </div>
          
          {/* User Avatar */}
          <div style={{
            width: '32px', height: '32px', borderRadius: '50%',
            background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center',
            overflow: 'hidden'
          }}>
            {session?.user?.image ? (
              <img src={session.user.image} alt="User" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <span style={{ fontSize: '1.25rem' }}>👤</span>
            )}
          </div>

          <button
            className={`settings-btn ${showSettings ? 'spin-45' : ''}`}
            onClick={() => setShowSettings(true)}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-primary)',
              padding: '0.4rem',
              cursor: 'pointer',
              fontSize: '1.5rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'transform 0.3s ease'
            }}
          >
            ⚙️
          </button>
        </div>
      </header>

      <div className="app-container">
        {children}
      </div>

      {/* Bottom Nav */}
      <nav className="bottom-nav">
        <Link href="/app/ingredients" className={`tab-btn tab-btn-ingredients ${pathname === '/app/ingredients' ? 'active' : ''}`}>
          <span className="tab-icon">🥕</span>
          <span>Ingredients</span>
        </Link>
        <Link href="/app/shopping" className={`tab-btn tab-btn-shopping ${pathname === '/app/shopping' ? 'active' : ''}`} style={{ position: 'relative' }}>
          <span className="tab-icon">🛒</span>
          <span>Shopping</span>
          {showBadge && <span className="tab-badge">❗</span>}
        </Link>
        <Link href="/app/progress" className={`tab-btn tab-btn-progress ${pathname === '/app/progress' ? 'active' : ''}`}>
          <span className="tab-icon">📊</span>
          <span>Progress</span>
        </Link>
      </nav>

      {/* Settings Modal */}
      {showSettings && (
        <div className="tutorial-confirm-overlay" style={{ background: 'var(--bg-primary)' }} onClick={() => { setShowSettings(false); setShowAccountSettings(false); }}>
          <div className="animate-slide-up" onClick={e => e.stopPropagation()} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '2rem', maxWidth: '360px', width: '90%', textAlign: 'center', boxShadow: '0 10px 30px rgba(0,0,0,0.5)' }}>
            
            {!showAccountSettings ? (
              <>
                <h3 className="heading-md" style={{ marginBottom: '1.5rem', color: 'var(--accent)' }}>Settings</h3>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem 0', borderBottom: '1px solid var(--border)', marginBottom: '1rem' }}>
                  <span style={{ fontWeight: 600 }}>Theme Mode</span>
                  <button className="ingredient-tag selected" onClick={toggleTheme}>
                    {isLightMode ? '☀️ Light' : '🌙 Dark'}
                  </button>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem 0', borderBottom: '1px solid var(--border)', marginBottom: '1rem' }}>
                  <span style={{ fontWeight: 600 }}>App Tutorial</span>
                  <button className="ingredient-tag" onClick={handleReplayTutorial}>
                    Replay 🎓
                  </button>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem 0', borderBottom: '1px solid var(--border)', marginBottom: '1rem' }}>
                  <span style={{ fontWeight: 600 }}>Account</span>
                  <button className="ingredient-tag" onClick={() => setShowAccountSettings(true)}>
                    Manage 👤
                  </button>
                </div>

                {/* Switch to Pro / Pro Badge */}
                <div style={{ padding: '0.75rem 0', marginBottom: '1.5rem' }}>
                  {isPro ? (
                    <div style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                      padding: '0.6rem 1rem', borderRadius: '10px',
                      background: 'rgba(255,215,0,0.08)', border: '1px solid rgba(255,215,0,0.3)',
                      color: '#FFD700', fontWeight: 600, fontSize: '0.9rem',
                    }}>
                      👑 Pro Member ✓
                    </div>
                  ) : (
                    <button
                      onClick={() => { setShowSettings(false); setShowUpgrade(true); }}
                      style={{
                        width: '100%', position: 'relative',
                        padding: '0.7rem 1rem', borderRadius: '10px',
                        background: 'transparent',
                        border: '1.5px solid rgba(255,215,0,0.5)',
                        color: '#FFD700', fontWeight: 600, fontSize: '0.9rem',
                        cursor: 'pointer', transition: 'all 0.2s ease',
                        overflow: 'hidden',
                      }}
                      onMouseEnter={e => {
                        (e.target as HTMLElement).style.background = 'rgba(255,215,0,0.08)';
                        (e.target as HTMLElement).style.borderColor = 'rgba(255,215,0,0.8)';
                        (e.target as HTMLElement).style.boxShadow = '0 0 20px rgba(255,215,0,0.15)';
                      }}
                      onMouseLeave={e => {
                        (e.target as HTMLElement).style.background = 'transparent';
                        (e.target as HTMLElement).style.borderColor = 'rgba(255,215,0,0.5)';
                        (e.target as HTMLElement).style.boxShadow = 'none';
                      }}
                    >
                      <span style={{
                        position: 'absolute', top: '-1px', right: '-1px',
                        background: 'linear-gradient(135deg, #FFD700, #FFA500)',
                        borderRadius: '0 10px 0 10px',
                        padding: '0.15rem 0.5rem',
                        fontSize: '0.65rem', fontWeight: 700, color: '#0A0A0A',
                      }}>👑</span>
                      Switch to Pro — $5/mo
                    </button>
                  )}
                </div>

                <button className="btn btn-primary" onClick={() => setShowSettings(false)} style={{ width: '100%' }}>
                  Done
                </button>
              </>
            ) : (
              <>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.5rem', minHeight: '32px' }}>
                  <button onClick={() => setShowAccountSettings(false)} style={{ position: 'absolute', left: 0, background: 'transparent', border: 'none', color: 'var(--text-muted)', fontSize: '1.25rem', cursor: 'pointer', padding: '0.25rem' }}>←</button>
                  <h3 className="heading-md" style={{ color: 'var(--accent)', margin: 0 }}>Account Settings</h3>
                </div>

                <div style={{ textAlign: 'left', marginBottom: '1.5rem', background: 'rgba(255,255,255,0.05)', padding: '1rem', borderRadius: 'var(--radius)' }}>
                  
                  {/* Username Field */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Username</span>
                    {editingField === 'name' ? (
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <input className="input" style={{ padding: '0.2rem 0.5rem', fontSize: '0.9rem', width: '100px' }} autoFocus value={editValue} onChange={e => setEditValue(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSaveField()} />
                        <button className="ingredient-tag selected" style={{ padding: '0.2rem 0.5rem' }} onClick={handleSaveField}>✓</button>
                      </div>
                    ) : (
                      <span style={{ fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.35rem' }} onClick={() => { setEditingField('name'); setEditValue(userData?.name || ''); }}>
                        {userData?.name || 'Guest'} <span style={{ fontSize: '0.75rem', opacity: 0.5 }}>✎</span>
                      </span>
                    )}
                  </div>

                  {/* Height Field */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Height</span>
                    {editingField === 'currentHeight' ? (
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <input className="input" type="number" style={{ padding: '0.2rem 0.5rem', fontSize: '0.9rem', width: '80px' }} autoFocus value={editValue} onChange={e => setEditValue(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSaveField()} />
                        <button className="ingredient-tag selected" style={{ padding: '0.2rem 0.5rem' }} onClick={handleSaveField}>✓</button>
                      </div>
                    ) : (
                      <span style={{ fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.35rem' }} onClick={() => { setEditingField('currentHeight'); setEditValue(userData?.currentHeight || ''); }}>
                        {userData?.currentHeight} {userData?.heightUnit} <span style={{ fontSize: '0.75rem', opacity: 0.5 }}>✎</span>
                      </span>
                    )}
                  </div>

                  {/* Ideal Weight Field */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Ideal Weight</span>
                    {editingField === 'idealWeight' ? (
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <input className="input" type="number" style={{ padding: '0.2rem 0.5rem', fontSize: '0.9rem', width: '80px' }} autoFocus value={editValue} onChange={e => setEditValue(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSaveField()} />
                        <button className="ingredient-tag selected" style={{ padding: '0.2rem 0.5rem' }} onClick={handleSaveField}>✓</button>
                      </div>
                    ) : (
                      <span style={{ fontWeight: 600, color: 'var(--accent)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.35rem' }} onClick={() => { setEditingField('idealWeight'); setEditValue(userData?.idealWeight || ''); }}>
                        {userData?.idealWeight} {userData?.weightUnit} <span style={{ fontSize: '0.75rem', opacity: 0.5 }}>✎</span>
                      </span>
                    )}
                  </div>

                </div>

                <div style={{ border: '1px solid #FF4757', borderRadius: 'var(--radius)', padding: '1rem', background: 'rgba(255, 71, 87, 0.05)' }}>
                  <h4 style={{ color: '#FF4757', fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '1rem' }}>Danger Zone</h4>
                  <button className="btn-cancel-red" style={{ width: '100%', marginBottom: '0.75rem', background: 'transparent', border: '1px solid #FF4757', color: '#FF4757' }} onClick={() => setShowSignOutConfirm(true)}>
                    Sign Out
                  </button>
                  <button className="btn-cancel-red" style={{ width: '100%' }} onClick={() => setShowDeleteConfirm(true)}>
                    Delete Account
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

              {/* Sign Out Confirm */}
      {showSignOutConfirm && (
        <div className="tutorial-confirm-overlay" style={{ zIndex: 10000 }}>
          <div className="tutorial-confirm-box">
            <p style={{ marginBottom: '1.5rem', fontSize: '1.1rem' }}>You sure you wanna sign out?</p>
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
              <button className="tutorial-btn-nah" onClick={() => setShowSignOutConfirm(false)}>Nah!</button>
              <button className="tutorial-btn-yep" onClick={async () => {
                const { logoutUser } = await import('../../lib/auth');
                logoutUser();
                const { signOut } = await import('next-auth/react');
                await signOut({ redirect: false });
                window.location.href = '/';
              }}>Yep!</button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Account Confirm */}
      {showDeleteConfirm && (
        <div className="tutorial-confirm-overlay" style={{ zIndex: 10000 }}>
          <div className="tutorial-confirm-box">
            <p style={{ marginBottom: '1.5rem', fontSize: '1.1rem' }}>We are sad to let you go, you sure you wanna continue?</p>
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
              <button className="tutorial-btn-nah" onClick={() => setShowDeleteConfirm(false)}>Nah!</button>
              <button className="tutorial-btn-yep" onClick={async () => {
                const { deleteAccount } = await import('../../lib/auth');
                deleteAccount();
                const { signOut } = await import('next-auth/react');
                await signOut({ redirect: false });
                window.location.href = '/';
              }}>Yep!</button>
            </div>
          </div>
        </div>
      )}

      <Tutorial />
      {showUpgrade && <UpgradeModal onClose={() => setShowUpgrade(false)} />}
    </>
  );
}
