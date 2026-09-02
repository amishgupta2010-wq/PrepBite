'use client';

import { useState, useEffect, useCallback } from 'react';

const STEPS = [
  { target: '.tab-btn-ingredients', text: 'Here you can add available ingredients present in your home!' },
  { target: '.tab-btn-shopping', text: 'Here the unavailable ingredients will be added!' },
  { target: '.tab-btn-progress', text: 'Here you can see your progress!' },
  { target: '.settings-btn', text: 'Here you can change preferences and choices to your liking!' },
];

export default function Tutorial() {
  const [step, setStep] = useState<number | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [pos, setPos] = useState({ x: 0, y: 0, targetX: 0, isTopTarget: false });
  const [winH, setWinH] = useState(0);

  const startTutorial = useCallback(() => {
    setStep(0);
  }, []);

  useEffect(() => {
    setWinH(window.innerHeight);
    const onResize = () => setWinH(window.innerHeight);
    window.addEventListener('resize', onResize);

    const onTrigger = () => startTutorial();
    window.addEventListener('prepbite-trigger-tutorial', onTrigger);

    if (!localStorage.getItem('prepbite-tutorial-done')) {
      const timer = setTimeout(() => startTutorial(), 500);
      return () => clearTimeout(timer);
    }

    return () => {
      window.removeEventListener('resize', onResize);
      window.removeEventListener('prepbite-trigger-tutorial', onTrigger);
    };
  }, [startTutorial]);

  const updatePosition = useCallback((stepIdx: number) => {
    if (stepIdx >= STEPS.length) return;

    let attempts = 0;
    const checkEl = () => {
      const el = document.querySelector(STEPS[stepIdx].target);
      if (el) {
        const rect = el.getBoundingClientRect();
        const isTop = rect.top < window.innerHeight / 2;
        setPos({
          x: Math.min(Math.max(rect.left + rect.width / 2, 160), window.innerWidth - 160),
          y: isTop ? rect.bottom : rect.top,
          targetX: rect.left + rect.width / 2,
          isTopTarget: isTop,
        });
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
    const onResize = () => updatePosition(step);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [step, updatePosition]);

  const handleNext = () => {
    if (step === null) return;
    if (step < STEPS.length - 1) {
      setStep(step + 1);
    } else {
      localStorage.setItem('prepbite-tutorial-done', 'true');
      setStep(null);
    }
  };

  const handleClose = () => setShowConfirm(true);
  const handleConfirmSkip = (skip: boolean) => {
    setShowConfirm(false);
    if (skip) {
      localStorage.setItem('prepbite-tutorial-done', 'true');
      setStep(null);
    }
  };

  if (step === null || !winH || pos.y === 0) return null;

  return (
    <>
      <div className="tutorial-overlay" />

      {/* Tooltip Positioned based on top/bottom target */}
      <div
        className="tutorial-container"
        style={{
          left: `${pos.x}px`,
          top: pos.isTopTarget ? `${pos.y + 8}px` : undefined,
          bottom: pos.isTopTarget ? undefined : `${winH - pos.y + 8}px`,
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        <div className={`tutorial-arrow ${pos.isTopTarget ? 'arrow-up' : 'arrow-down'}`} style={{ 
          transform: `translateX(${pos.targetX - pos.x}px)`,
          order: pos.isTopTarget ? -1 : 1
        }} />
        <div className="tutorial-box" style={{ 
          marginTop: pos.isTopTarget ? '16px' : 0,
          marginBottom: pos.isTopTarget ? 0 : '16px',
        }}>
          <button className="tutorial-close" onClick={handleClose}>✕</button>
          <p className="tutorial-text">{STEPS[step].text}</p>
          <button className="tutorial-next" onClick={handleNext}>
            {step === STEPS.length - 1 ? 'Got it!' : 'Next'}
          </button>
        </div>
      </div>

      {showConfirm && (
        <div className="tutorial-confirm-overlay">
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
