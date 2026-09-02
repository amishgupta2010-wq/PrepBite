'use client';

import { useTheme } from './ThemeProvider';

export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      <div>
        <div className="heading-sm" style={{ marginBottom: '0.25rem' }}>
          {theme === 'dark' ? '🌙' : '☀️'} Appearance
        </div>
        <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>
          {theme === 'dark' ? 'Dark mode' : 'Light mode'}
        </div>
      </div>
      <button
        className={`theme-switch ${theme === 'light' ? 'active' : ''}`}
        onClick={toggleTheme}
        aria-label="Toggle theme"
        id="theme-toggle-switch"
      >
        <span className="theme-switch-thumb" />
      </button>
    </div>
  );
}
