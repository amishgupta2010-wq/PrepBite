'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { markTutorialSeen } from '../auth-callback/page';
import { getSession } from '../../lib/auth';

const STEPS = [
  { target: '.tab-btn-ingredients', text: 'Here you can add available ingredients present in your home!' },
  { target: '.tab-btn-shopping', text: 'Here the unavailable ingredients will be added!' },
  { target: '.tab-btn-progress', text: 'Here you can see your progress!' },
  { target: '.settings-btn', text: 'Here you can change preferences and choices to your liking!' },
];

function getTargetPosition(stepIdx: number) {
  if (typeof window === 'undefined') return null;
  if (stepIdx < 0 || stepIdx >= STEPS.length) return null;
  const el = document.querySelector(STEPS[stepIdx].target);
  if (!el) return null;
  const rect = el.getBoundingClientRect();
  const isTop = rect.top < window.innerHeight / 2;
  return {
    x: Math.min(Math.max(rect.left + rect.width / 2, 160), window.innerWidth - 160),
    y: isTop ? rect.bottom : rect.top,
    targetX: rect.left + rect.width / 2,
    isTopTarget: isTop,
  };
}

export default function Tutorial() {
  const [step, setStep] = useState<number | null>(null);
  const [textStep, setTextStep] = useState<number>(0);
  const [textFading, setTextFading] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [pos, setPos] = useState({ x: 0, y: 0, targetX: 0, isTopTarget: false });
  const [winH, setWinH] = useState(0);
  const [visible, setVisible] = useState(false);
  const [fading, setFading] = useState(false);
  const fadeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { data: session } = useSession();

  /** Smoothly hides the tutorial without triggering any auth or layout unmounting */
  const dismissTutorial = useCallback(() => {
    setFading(true);
    if (fadeTimer.current) clearTimeout(fadeTimer.current);
    fadeTimer.current = setTimeout(() => {
      setStep(null);
      setVisible(false);
      setFading(false);
      setTextFading(false);
    }, 220);
  }, []);

  const startTutorial = useCallback(() => {
    const initialPos = getTargetPosition(0);
    if (initialPos) setPos(initialPos);
    setStep(0);
    setTextStep(0);
    setTextFading(false);
    setVisible(true);
    setFading(false);
  }, []);

  useEffect(() => {
    setWinH(window.innerHeight);
    const onResize = () => setWinH(window.innerHeight);
    window.addEventListener('resize', onResize);

    const onTrigger = () => startTutorial();
    window.addEventListener('prepbite-trigger-tutorial', onTrigger);

    let hasSeenTutorial = false;
    try {
      const email = session?.user?.email || getSession()?.email;
      if (email) {
        const accounts = JSON.parse(localStorage.getItem('prepbite_registered_accounts') || '[]');
        const existingUser = accounts.find((acc: any) => acc.email?.toLowerCase().trim() === email.toLowerCase().trim());
        if (existingUser?.hasSeenTutorial) hasSeenTutorial = true;
      }
    } catch {}

    const isLocalDone = localStorage.getItem('prepbite-tutorial-done') === 'true';
    const isSessionDone = (session?.user as any)?.hasSeenTutorial === true;

    if (!isLocalDone && !isSessionDone && !hasSeenTutorial) {
      const timer = setTimeout(() => startTutorial(), 400);
      return () => {
        clearTimeout(timer);
        window.removeEventListener('resize', onResize);
        window.removeEventListener('prepbite-trigger-tutorial', onTrigger);
      };
    }

    return () => {
      window.removeEventListener('resize', onResize);
      window.removeEventListener('prepbite-trigger-tutorial', onTrigger);
    };
  }, [startTutorial, session]);

  const updatePosition = useCallback((stepIdx: number) => {
    if (stepIdx >= STEPS.length) return;

    const p = getTargetPosition(stepIdx);
    if (p) {
      setPos(p);
      return;
    }

    let attempts = 0;
    const checkEl = () => {
      const retryPos = getTargetPosition(stepIdx);
      if (retryPos) {
        setPos(retryPos);
      } else if (attempts < 10) {
        attempts++;
        setTimeout(checkEl, 100);
      }
    };
    checkEl();
  }, []);

  useEffect(() => {
    if (step === null) return;
    updatePosition(step);
    const onResize = () => {
      setWinH(window.innerHeight);
      updatePosition(step);
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [step, updatePosition]);

  const handleNext = () => {
    if (step === null) return;
    if (step < STEPS.length - 1) {
      const nextStep = step + 1;
      
      // 1. Calculate next coordinates and start moving the box smoothly
      const nextPos = getTargetPosition(nextStep);
      if (nextPos) {
        setPos(nextPos);
      }
      setStep(nextStep);

      // 2. Fade out current text so the next text never flashes at the old place
      setTextFading(true);

      // 3. Swap text and fade in smoothly as the green box arrives at the new place
      setTimeout(() => {
        setTextStep(nextStep);
        setTextFading(false);
      }, 120);
    } else {
      localStorage.setItem('prepbite-tutorial-done', 'true');
      const userEmail = session?.user?.email || getSession()?.email;
      if (userEmail) {
        markTutorialSeen(userEmail);
      }
      dismissTutorial();
    }
  };

  const handleClose = () => setShowConfirm(true);
  const handleConfirmSkip = (skip: boolean) => {
    setShowConfirm(false);
    if (skip) {
      localStorage.setItem('prepbite-tutorial-done', 'true');
      const userEmail = session?.user?.email || getSession()?.email;
      if (userEmail) {
        markTutorialSeen(userEmail);
      }
      dismissTutorial();
    }
  };

  if (!visible || step === null || !winH || pos.y === 0) {
    return null;
  }

  const overlayOpacity = fading ? 0 : 1;

  return (
    <>
      <div
        className="tutorial-overlay"
        style={{ opacity: overlayOpacity, transition: 'opacity 0.2s ease', pointerEvents: fading ? 'none' : 'auto' }}
      />

      {/* Tooltip positioned smoothly relative to target */}
      <div
        className="tutorial-container"
        style={{
          left: `${pos.x}px`,
          top: pos.isTopTarget ? `${pos.y + 8}px` : undefined,
          bottom: pos.isTopTarget ? undefined : `${winH - pos.y + 8}px`,
          flexDirection: 'column',
          alignItems: 'center',
          opacity: fading ? 0 : 1,
          transition: 'left 0.3s cubic-bezier(0.25, 1, 0.5, 1), opacity 0.2s ease',
          pointerEvents: fading ? 'none' : 'auto',
        }}
      >
        <div
          className={`tutorial-arrow ${pos.isTopTarget ? 'arrow-up' : 'arrow-down'}`}
          style={{ 
            transform: `translateX(${pos.targetX - pos.x}px)`,
            order: pos.isTopTarget ? -1 : 1,
            transition: 'transform 0.3s cubic-bezier(0.25, 1, 0.5, 1)',
          }}
        />
        <div
          className="tutorial-box"
          style={{ 
            marginTop: pos.isTopTarget ? '16px' : 0,
            marginBottom: pos.isTopTarget ? 0 : '16px',
          }}
        >
          <button className="tutorial-close" onClick={handleClose}>✕</button>
          <p
            className="tutorial-text"
            style={{
              opacity: textFading ? 0 : 1,
              transition: 'opacity 0.12s ease',
              minHeight: '2.5rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {STEPS[textStep]?.text}
          </p>
          <button className="tutorial-next" onClick={handleNext}>
            {step === STEPS.length - 1 ? 'Got it!' : 'Next'}
          </button>
        </div>
      </div>

      {showConfirm && (
        <div className="tutorial-confirm-overlay" style={{ opacity: fading ? 0 : 1, transition: 'opacity 0.2s ease' }}>
          <div className="tutorial-confirm-box">
            <p style={{ marginBottom: '1.5rem', fontSize: '1.1rem' }}>Are you sure you wanna skip the tutorial?</p>
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
              <button className="tutorial-btn-nah" onClick={() => handleConfirmSkip(false)}>Nah!</button>
              <button className="tutorial-btn-yep" onClick={() => handleConfirmSkip(true)}>Yep!</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
