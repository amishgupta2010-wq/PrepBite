'use client';

import { useState, useEffect } from 'react';
import ThemeToggle from './ThemeToggle';

const CACHE_KEY = 'prepbite-recipe-cache';

export default function SettingsModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [cookDays, setCookDays] = useState<number | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    try {
      const ob = JSON.parse(localStorage.getItem('prepbite-onboarding') || '{}');
      setCookDays(ob.cookDays ?? null);
    } catch {}
  }, [isOpen]);

  const handleCookDaysChange = (days: number) => {
    setCookDays(days);
    try {
      const ob = JSON.parse(localStorage.getItem('prepbite-onboarding') || '{}');
      ob.cookDays = days;
      localStorage.setItem('prepbite-onboarding', JSON.stringify(ob));
      // Also update questionAnswers in registered accounts if present
      const session = JSON.parse(localStorage.getItem('prepbite-session') || '{}');
      const email = session.email;
      if (email) {
        const accounts = JSON.parse(localStorage.getItem('prepbite_registered_accounts') || '[]');
        const idx = accounts.findIndex((a: any) => a.email?.toLowerCase() === email.toLowerCase());
        if (idx !== -1) {
          if (!accounts[idx].questionAnswers) accounts[idx].questionAnswers = {};
          accounts[idx].questionAnswers.cookDays = days;
          localStorage.setItem('prepbite_registered_accounts', JSON.stringify(accounts));
        }
      }
      // Clear recipe cache so next generation uses new cookDays
      localStorage.removeItem(CACHE_KEY);
    } catch {}
  };

  return (
    <>
      <button
        className="settings-btn"
        onClick={() => setIsOpen(true)}
        aria-label="Open settings"
        id="settings-button"
      >
        ⚙
      </button>

      {isOpen && (
        <div className="modal-overlay" onClick={() => setIsOpen(false)}>
          <div
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
              <h2 className="heading-md">Settings</h2>
              <button
                className="btn-close"
                onClick={() => setIsOpen(false)}
                aria-label="Close settings"
                id="settings-close-button"
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-secondary)',
                  fontSize: '1.5rem',
                  cursor: 'pointer',
                  padding: '0.25rem',
                  lineHeight: 1,
                }}
              >
                ✕
              </button>
            </div>

            <ThemeToggle />

            {/* Cook Days Setting */}
            <div style={{ marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid var(--border)' }}>
              <p style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '0.75rem' }}>
                🍳 Cooking Days / Week
              </p>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                {[2, 3, 4, 5, 6, 7].map((d) => (
                  <button
                    key={d}
                    onClick={() => handleCookDaysChange(d)}
                    style={{
                      width: '44px',
                      height: '44px',
                      borderRadius: '10px',
                      border: cookDays === d ? '2px solid var(--accent)' : '1px solid var(--border)',
                      background: cookDays === d ? 'var(--accent-dim)' : 'var(--bg-secondary)',
                      color: cookDays === d ? 'var(--accent)' : 'var(--text-secondary)',
                      fontFamily: 'var(--font-body)',
                      fontSize: '1rem',
                      fontWeight: cookDays === d ? 700 : 400,
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    {d}
                  </button>
                ))}
              </div>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
                Changes apply the next time you generate a meal plan.
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
