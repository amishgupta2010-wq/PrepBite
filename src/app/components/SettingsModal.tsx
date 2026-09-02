'use client';

import { useState } from 'react';
import ThemeToggle from './ThemeToggle';

export default function SettingsModal() {
  const [isOpen, setIsOpen] = useState(false);

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
          </div>
        </div>
      )}
    </>
  );
}
