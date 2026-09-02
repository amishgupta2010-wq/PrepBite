'use client';

import { useState } from 'react';

interface CookbookProps {
  recipe: {
    title: string;
    image?: string;
    steps?: { number: number; step: string }[];
    ingredients?: { name: string; amount: number; unit: string }[];
  };
  onClose: () => void;
}

const STEP_IMAGES: [string[], string][] = [
  [['boil', 'simmer', 'blanch', 'water', 'stock', 'soup', 'steam'], '🫕'],
  [['fry', 'sauté', 'saute', 'sear', 'pan', 'cook', 'heat', 'warm', 'brown'], '🍳'],
  [['chop', 'dice', 'cut', 'slice', 'mince', 'trim', 'peel', 'julienne', 'prepare', 'wash', 'gather'], '🔪'],
  [['mix', 'stir', 'whisk', 'combine', 'blend', 'fold', 'toss', 'beat', 'scramble'], '🥣'],
  [['bake', 'oven', 'roast', 'broil', 'preheat', 'grill', 'toast'], '🔥'],
  [['serve', 'plate', 'garnish', 'drizzle', 'top', 'arrange', 'enjoy'], '🍽️'],
  [['refrigerat', 'chill', 'cool', 'freeze', 'cold'], '🧊'],
  [['season', 'salt', 'pepper', 'spice', 'marinate'], '🧂'],
];

function getStepEmoji(text: string): string {
  const lower = text.toLowerCase();
  for (const [keywords, emoji] of STEP_IMAGES) {
    if (keywords.some(k => lower.includes(k))) return emoji;
  }
  return '👨‍🍳';
}

let cachedAudioBuffer: AudioBuffer | null = null;
let audioContext: AudioContext | null = null;

async function playPageCrumbleSound() {
  try {
    if (!audioContext) {
      const AC = window.AudioContext || (window as any).webkitAudioContext;
      audioContext = new AC();
    }
    
    if (!cachedAudioBuffer) {
      const res = await fetch('/Sound.mp3');
      const arrayBuffer = await res.arrayBuffer();
      cachedAudioBuffer = await audioContext.decodeAudioData(arrayBuffer);
    }
    
    const source = audioContext.createBufferSource();
    source.buffer = cachedAudioBuffer;
    
    const gainNode = audioContext.createGain();
    gainNode.gain.value = 2.5; // 2.5x volume boost
    
    source.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    // Start at 0.15s to trim potential initial silence, and play for a short duration
    source.start(0, 0.15);
  } catch { /* audio not supported or fetch failed */ }
}

export default function CookbookModal({ recipe, onClose }: CookbookProps) {
  const [page, setPage] = useState(0);
  const [flipDir, setFlipDir] = useState<'left' | 'right' | null>(null);

  const steps = recipe.steps || [];
  const ingredients = recipe.ingredients || [];
  const totalPages = steps.length + 1; // Page 0 = ingredients, 1..N = steps

  if (totalPages <= 1 && ingredients.length === 0) {
    return (
      <div className="cookbook-overlay" onClick={onClose}>
        <div className="cookbook-modal" onClick={e => e.stopPropagation()}>
          <button className="cookbook-close" onClick={onClose}>✕</button>
          <h2 className="cookbook-title">{recipe.title}</h2>
          <div style={{ padding: '3rem 2rem', textAlign: 'center', color: '#BFA77A' }}>
            No detailed information available for this recipe.
          </div>
        </div>
      </div>
    );
  }

  const flip = (dir: 'left' | 'right', newPage: number) => {
    playPageCrumbleSound();
    setFlipDir(dir);
    setTimeout(() => { setPage(newPage); setFlipDir(null); }, 200);
  };

  return (
    <div className="cookbook-overlay" onClick={onClose}>
      <div className="cookbook-modal" onClick={e => e.stopPropagation()}>
        <button className="cookbook-close" onClick={onClose}>✕</button>
        <h2 className="cookbook-title">{recipe.title}</h2>

        <div className={`cookbook-page ${flipDir ? `flip-${flipDir}` : ''}`}>
          {page === 0 ? (
            /* First page: Ingredients */
            <>
              <div className="cookbook-step-number">📝 Ingredients</div>
              <div className="cookbook-ingredients-list">
                {ingredients.length > 0 ? ingredients.map((ing, i) => (
                  <div key={i} className="cookbook-ingredient-item">
                    <span className="cookbook-ingredient-dot">•</span>
                    <span>{ing.amount > 0 ? `${ing.amount} ${ing.unit} ` : ''}{ing.name}</span>
                  </div>
                )) : (
                  <div style={{ color: '#BFA77A', fontStyle: 'italic' }}>No ingredients listed.</div>
                )}
              </div>
              <div className="cookbook-step-image">
                <span style={{ fontSize: '3.5rem', opacity: 0.3 }}>🧾</span>
              </div>
            </>
          ) : (
            /* Step pages */
            <>
              <div className="cookbook-step-number">Step {steps[page - 1].number}</div>
              <div className="cookbook-step-text">{steps[page - 1].step}</div>
              <div className="cookbook-step-image">
                <span style={{ fontSize: '3.5rem', opacity: 0.3 }}>{getStepEmoji(steps[page - 1].step)}</span>
              </div>
            </>
          )}
        </div>

        <div className="cookbook-nav">
          <button className="cookbook-arrow" onClick={() => flip('right', page - 1)} disabled={page === 0}>←</button>
          <div className="cookbook-dots">
            {Array.from({ length: totalPages }, (_, i) => (
              <span key={i} className={`cookbook-dot ${i === page ? 'active' : ''}`} />
            ))}
          </div>
          <button className="cookbook-arrow" onClick={() => flip('left', page + 1)} disabled={page >= totalPages - 1}>→</button>
        </div>

        <div style={{ textAlign: 'center', marginTop: '0.5rem', fontSize: '0.75rem', color: '#BFA77A', opacity: 0.6 }}>
          {page === 0 ? 'Ingredients' : `Step ${page} of ${steps.length}`}
        </div>
      </div>
    </div>
  );
}
