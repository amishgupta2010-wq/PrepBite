'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import CookbookModal from '../../components/CookbookModal';
import UpgradeModal from '../../components/UpgradeModal';
import { isIngredientAvailable, deduplicateIngredients } from '../../lib/ingredientMatch';
import { isBetaTester } from '../../../lib/betaTester';

/** Cache key for storing generated meal plan data to avoid redundant API calls */
const CACHE_KEY = 'prepbite-recipe-cache';
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

/** User-facing error messages — never expose raw API responses */
const USER_ERROR = 'Unable to generate your meal plan right now. Please try again in a moment.';

const GEN_COUNT_KEY = 'prepbite-gen-count';
const GEN_MONTH_KEY = 'prepbite-gen-month';
const FREE_LIMIT = 3;

interface CacheEntry {
  data: { days: any[]; extras: Record<string, any[]> };
  timestamp: number;
  fingerprint: string;
}

function buildFingerprint(calories: number, ingredients: string, diet: string, exclude: string): string {
  return `${calories}|${ingredients}|${diet}|${exclude}`;
}

function getCache(fingerprint: string): CacheEntry | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const entry: CacheEntry = JSON.parse(raw);
    if (entry.fingerprint !== fingerprint) return null;
    if (Date.now() - entry.timestamp > CACHE_TTL_MS) return null;
    return entry;
  } catch { return null; }
}

function setCache(fingerprint: string, data: { days: any[]; extras: Record<string, any[]> }) {
  try {
    const entry: CacheEntry = { data, timestamp: Date.now(), fingerprint };
    localStorage.setItem(CACHE_KEY, JSON.stringify(entry));
  } catch { /* quota exceeded or private browsing */ }
}

function getGenCount(): number {
  if (typeof window === 'undefined') return 0;
  const currentMonth = new Date().getMonth().toString();
  const savedMonth = localStorage.getItem(GEN_MONTH_KEY);
  if (savedMonth !== currentMonth) {
    localStorage.setItem(GEN_MONTH_KEY, currentMonth);
    localStorage.setItem(GEN_COUNT_KEY, '0');
    return 0;
  }
  return parseInt(localStorage.getItem(GEN_COUNT_KEY) || '0', 10);
}

function incrementGenCount() {
  if (typeof window === 'undefined') return;
  const currentMonth = new Date().getMonth().toString();
  localStorage.setItem(GEN_MONTH_KEY, currentMonth);
  const current = getGenCount();
  localStorage.setItem(GEN_COUNT_KEY, (current + 1).toString());
}

function isProUser(): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem('prepbite-is-pro') === 'true' || isBetaTester();
}

export default function RecipesPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [days, setDays] = useState<any[]>([]);
  const [extras, setExtras] = useState<Record<string, any[]>>({});
  const [selectedDay, setSelectedDay] = useState(0);
  const [filters, setFilters] = useState({ veg: false, vegan: false, lactoseFree: false });
  const [showToast, setShowToast] = useState(false);
  const [cookbook, setCookbook] = useState<any>(null);
  const [refreshTarget, setRefreshTarget] = useState<{ day: number; meal: number } | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [upgradeReason, setUpgradeReason] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isPro = isProUser();

  const fetchRecipes = useCallback(async (signal?: AbortSignal, isFilterUpdate: boolean = false) => {
    // Limits removed for free testing


    setLoading(true);
    setError('');
    try {
      const onboarding = JSON.parse(localStorage.getItem('prepbite-onboarding') || '{}');
      const ingredients = JSON.parse(localStorage.getItem('prepbite-ingredients') || '[]');
      const weightKg = onboarding.weightUnit === 'kg' ? onboarding.currentWeight : onboarding.currentWeight / 2.20462;
      const heightCm = onboarding.heightUnit === 'ft' ? onboarding.currentHeight * 2.54 : (onboarding.currentHeight || 170);
      const bmr = 10 * weightKg + 6.25 * heightCm - 120;
      const tdee = Math.round(bmr * (1.2 + ((onboarding.exerciseDays || 0) * 0.05))) || 2000;

      let diet = '';
      if (filters.vegan) diet = 'vegan';
      else if (filters.veg) diet = 'vegetarian';
      const exclude = filters.lactoseFree ? 'dairy' : '';
      const ingNames = ingredients.map((i: any) => i.name).join(',');

      // Check local cache first
      const fingerprint = buildFingerprint(tdee, ingNames, diet, exclude);
      const cached = getCache(fingerprint);
      if (cached) {
        setDays(cached.data.days);
        setExtras(cached.data.extras);
        setLoading(false);
        return;
      }

      let url = `/api/recipes?targetCalories=${tdee}&ingredients=${encodeURIComponent(ingNames)}`;
      if (diet) url += `&diet=${diet}`;
      if (exclude) url += `&exclude=${exclude}`;

      const res = await fetch(url, { signal });
      if (!res.ok) throw new Error(USER_ERROR);
      const data = await res.json();
      if (data.error) throw new Error(USER_ERROR);
      setDays(data.days || []);
      setExtras(data.extras || {});
      // Count this generation for free users (stat tracking only, no block)
      if (!isPro && !isFilterUpdate) incrementGenCount();
    } catch (e: any) {
      if (e.name === 'AbortError') return;
      setError(USER_ERROR);
    } finally {
      setLoading(false);
    }
  }, [filters, isPro]);

  // Track initial mount to differentiate from filter changes
  const initialMount = useRef(true);

  // Debounced fetch on filter changes
  useEffect(() => {
    if (abortRef.current) abortRef.current.abort();
    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(() => {
      const controller = new AbortController();
      abortRef.current = controller;
      fetchRecipes(controller.signal, !initialMount.current);
      initialMount.current = false;
    }, 400);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (abortRef.current) abortRef.current.abort();
    };
  }, [fetchRecipes]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const h = (e: WheelEvent) => { e.preventDefault(); el.scrollLeft += e.deltaY; };
    el.addEventListener('wheel', h, { passive: false });
    return () => el.removeEventListener('wheel', h);
  }, []);

  const toggleFilter = (key: keyof typeof filters) => {
    setFilters(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSwapClick = (dayIdx: number, mealIdx: number) => {
    // Pro limit removed for testing
    setRefreshTarget({ day: dayIdx, meal: mealIdx });
  };

  const handleRefreshConfirm = () => {
    if (!refreshTarget) return;
    const { day: dayIdx, meal: mealIdx } = refreshTarget;
    const mealType = ['breakfast', 'lunch', 'dinner'][mealIdx];
    const pool = extras[mealType] || [];
    
    if (pool.length > 0) {
      const currentDayMeals = days[dayIdx].meals;
      const oldRecipe = currentDayMeals[mealIdx];
      
      // Find a recipe in the pool that isn't the old recipe AND isn't already used in this day
      const currentTitles = currentDayMeals.map((m: any) => m.title);
      let newRecipeIdx = pool.findIndex((r: any) => r.title !== oldRecipe.title && !currentTitles.includes(r.title));
      
      // Fallback: if all pool recipes are in today's meals, at least pick one that isn't the old recipe
      if (newRecipeIdx === -1) {
        newRecipeIdx = pool.findIndex((r: any) => r.title !== oldRecipe.title);
      }
      // Ultimate fallback: just pick the first one if somehow they are all the exact same as the old recipe
      if (newRecipeIdx === -1) newRecipeIdx = 0;

      const newRecipe = pool[newRecipeIdx];
      const updatedDays = [...days];
      updatedDays[dayIdx] = {
        ...updatedDays[dayIdx],
        meals: currentDayMeals.map((m: any, i: number) => i === mealIdx ? { ...newRecipe, type: m.type } : m),
      };
      setDays(updatedDays);
      
      // Remove the used recipe from the pool and add the old recipe back to the end
      const newPool = [...pool];
      newPool.splice(newRecipeIdx, 1);
      newPool.push(oldRecipe);
      setExtras(prev => ({ ...prev, [mealType]: newPool }));
    }
    setRefreshTarget(null);
  };

  const handleConfirm = () => {
    if (confirming) return;
    setConfirming(true);
    try {
      const userIngs = JSON.parse(localStorage.getItem('prepbite-ingredients') || '[]').map((i: any) => i.name);
      const existingShop = JSON.parse(localStorage.getItem('prepbite-shopping') || '[]');
      const IGNORE_LIST = ['water', 'salt', 'pepper', 'sugar', 'oil', 'olive oil', 'butter', 'garlic powder', 'onion powder'];
      const allMissing: { name: string }[] = [];

      // Auto grocery list (Pro limit removed for testing)
      days.forEach(day => {
        day.meals.forEach((meal: any) => {
          (meal.ingredients || []).forEach((ing: any) => {
            const ingName = ing.name.toLowerCase();
            if (!isIngredientAvailable(ing.name, userIngs) && !IGNORE_LIST.some(ignore => ingName.includes(ignore))) {
              allMissing.push({ name: ing.name });
            }
          });
        });
      });

      const deduped = deduplicateIngredients(allMissing);
      const newItems = deduped.map(item => ({
        id: Date.now().toString() + Math.random().toString(36),
        name: item.name, tag: 'Other', count: item.count,
      }));
      if (newItems.length > 0) {
        localStorage.setItem('prepbite-shopping', JSON.stringify([...newItems, ...existingShop]));
        localStorage.setItem('prepbite-shopping-badge', 'true');
      }
      const startDate = new Date().toISOString().split('T')[0];
      localStorage.setItem('prepbite-mealplan', JSON.stringify({ days, generatedAt: Date.now(), startDate }));
      localStorage.removeItem(CACHE_KEY);
      setShowToast(true);
      setTimeout(() => { setShowToast(false); router.push('/app/ingredients'); }, 3000);
    } finally {
      setTimeout(() => setConfirming(false), 3500);
    }
  };

  if (loading) {
    return (
      <div className="animate-slide-up" style={{ textAlign: 'center', marginTop: '4rem' }}>
        <div className="pot-loader-container">
          <div className="pot-icon">🍲</div>
          <div className="water-splash splash-1"></div>
          <div className="water-splash splash-2"></div>
          <div className="water-splash splash-3"></div>
        </div>
        <p className="heading-md">Generating your meal plan...</p>
        <p style={{ color: 'var(--text-muted)', marginTop: '0.5rem' }}>Matching recipes to your ingredients</p>
      </div>
    );
  }
  if (error) {
    return (
      <div className="animate-slide-up" style={{ textAlign: 'center', marginTop: '4rem' }}>
        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>😅</div>
        <p className="heading-md" style={{ marginBottom: '1rem' }}>Unable to generate your meal plan right now</p>
        <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem', fontSize: '0.9rem' }}>Please try again in a moment.</p>
        <button className="btn btn-primary" onClick={() => fetchRecipes()}>Try Again</button>
      </div>
    );
  }
  if (!days.length && showUpgrade) {
    return (
      <div className="animate-slide-up" style={{ textAlign: 'center', marginTop: '4rem' }}>
        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🔒</div>
        <p className="heading-md" style={{ marginBottom: '0.5rem' }}>Monthly Limit Reached</p>
        <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem', maxWidth: '360px', margin: '0 auto 1.5rem' }}>
          You've used all {FREE_LIMIT} free meal plan generations this month. Upgrade to Pro for unlimited access.
        </p>
        <button
          onClick={() => setShowUpgrade(true)}
          style={{
            padding: '0.75rem 2rem', borderRadius: '12px', border: 'none', cursor: 'pointer',
            background: 'linear-gradient(135deg, #FFD700, #FFA500)',
            color: '#0A0A0A', fontFamily: 'Outfit, sans-serif', fontSize: '1rem', fontWeight: 700,
            boxShadow: '0 4px 20px rgba(255,215,0,0.3)',
          }}
        >
          👑 Upgrade to Pro
        </button>
        {showUpgrade && <UpgradeModal onClose={() => setShowUpgrade(false)} />}
      </div>
    );
  }
  if (!days.length) return null;

  const currentDay = days[selectedDay];
  const genCount = getGenCount();

  return (
    <div className="animate-slide-up">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h1 className="heading-lg" style={{ margin: 0 }}>Your Meal Plan</h1>
        {!isPro && (
          <span style={{
            fontSize: '0.75rem', fontWeight: 600, padding: '0.25rem 0.75rem',
            borderRadius: '20px', background: 'rgba(255,215,0,0.1)', border: '1px solid rgba(255,215,0,0.3)',
            color: '#FFD700',
          }}>
            {genCount}/{FREE_LIMIT} free
          </span>
        )}
      </div>

      {/* Diet Filters */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        {([
          { key: 'veg' as const, label: '🥬 Only Veg' },
          { key: 'vegan' as const, label: '🌱 Only Vegan' },
          { key: 'lactoseFree' as const, label: '🥛 Lactose Free' },
        ]).map(f => (
          <button key={f.key} className={`diet-filter ${filters[f.key] ? 'on' : 'off'}`} onClick={() => toggleFilter(f.key)}>
            {f.label}
          </button>
        ))}
      </div>

      {/* Day selector */}
      <div ref={scrollRef} style={{ display: 'flex', gap: '0.5rem', overflowX: 'auto', paddingBottom: '0.5rem', marginBottom: '2rem', scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
        {days.map((day, i) => {
          const date = new Date();
          date.setDate(date.getDate() + i);
          return (
            <button key={day.day} className={`day-selector-btn ${selectedDay === i ? 'active' : ''}`} onClick={() => setSelectedDay(i)}>
              <span style={{ fontSize: '0.75rem', display: 'block', opacity: 0.8, marginBottom: '2px', textTransform: 'uppercase' }}>{day.day.slice(0, 3)}</span>
              <span style={{ fontSize: '1.2rem', fontWeight: 800 }}>{date.getDate()}</span>
            </button>
          );
        })}
      </div>

      {/* Selected day meals */}
      {currentDay && (
        <div key={selectedDay}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <h2 className="heading-md">{currentDay.day}</h2>
            <span className="tag-chip" style={{ background: 'var(--accent-dim)', color: 'var(--accent)', border: '1px solid var(--accent)' }}>
              {Math.round(currentDay.nutrients?.calories || 0)} kcal
            </span>
          </div>

          {currentDay.meals.map((meal: any, i: number) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
              <div className="glass-card" style={{ padding: '1rem', flex: 1, position: 'relative' }}>
                <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start', cursor: 'pointer' }} onClick={() => setCookbook(meal)}>
                  {meal.image ? (
                    <img src={meal.image} alt={meal.title} style={{ width: '72px', height: '72px', borderRadius: 'var(--radius)', objectFit: 'cover', flexShrink: 0 }} />
                  ) : (
                    <div style={{ width: '72px', height: '72px', borderRadius: 'var(--radius)', background: 'var(--bg-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem', flexShrink: 0 }}>🍲</div>
                  )}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '0.25rem' }}>{meal.type}</div>
                    <div className="heading-sm" style={{ fontSize: '0.95rem', marginBottom: '0.25rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{meal.title}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>⏱ {meal.readyInMinutes || '?'}m · 🔥 {Math.round(meal.calories || 0)} kcal</div>
                  </div>
                </div>
              </div>
              <button
                className="recipe-refresh-btn"
                title={isPro ? 'Replace this recipe' : 'Pro feature — Upgrade to swap'}
                onClick={() => handleSwapClick(selectedDay, i)}
                style={!isPro ? { opacity: 0.4 } : {}}
              >
                {isPro ? '⟳' : '🔒'}
              </button>
            </div>
          ))}
        </div>
      )}

      <button
        className="btn btn-primary"
        onClick={handleConfirm}
        disabled={confirming}
        style={{
          width: '100%', marginTop: '1rem', marginBottom: '2rem', padding: '1rem', fontSize: '1.1rem',
          opacity: confirming ? 0.6 : 1, cursor: confirming ? 'not-allowed' : 'pointer',
        }}
      >
        {confirming ? 'Saving...' : 'Confirm Meal Plan ✓'}
      </button>

      {!isPro && (
        <p style={{ textAlign: 'center', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '2rem' }}>
          ℹ️ Auto grocery list is a <span style={{ color: '#FFD700', cursor: 'pointer' }} onClick={() => { setUpgradeReason('grocery'); setShowUpgrade(true); }}>Pro feature</span>. Upgrade to auto-add missing ingredients.
        </p>
      )}

      {showToast && <div className="toast-popup">🛒 {isPro ? 'Unavailable ingredients added to the Shopping List!' : 'Meal plan confirmed!'}</div>}
      {cookbook && <CookbookModal recipe={cookbook} onClose={() => setCookbook(null)} />}
      {showUpgrade && <UpgradeModal onClose={() => setShowUpgrade(false)} />}

      {/* Refresh confirmation dialog */}
      {refreshTarget && (
        <div className="tutorial-confirm-overlay">
          <div className="tutorial-confirm-box">
            <p style={{ marginBottom: '1.5rem', fontSize: '1.1rem' }}>Are you sure you wanna replace this recipe?</p>
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
              <button className="tutorial-btn-nah" onClick={() => setRefreshTarget(null)}>Nah!</button>
              <button className="tutorial-btn-yep" onClick={handleRefreshConfirm}>Yep!</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
