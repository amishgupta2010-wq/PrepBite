'use client';

import { useState, useEffect } from 'react';
import CookbookModal from '../../components/CookbookModal';

interface DailyData {
  date: string;
  exercise: boolean;
  breakfast: boolean;
  lunch: boolean;
  dinner: boolean;
}

export default function ProgressPage() {
  const [data, setData] = useState<Record<string, DailyData>>({});
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [showFlash, setShowFlash] = useState(false);
  const [mealPlan, setMealPlan] = useState<any>(null);
  const [cookbook, setCookbook] = useState<any>(null);

  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    setSelectedDate(today);
    const saved = localStorage.getItem('prepbite-progress');
    if (saved) setData(JSON.parse(saved));
    const plan = localStorage.getItem('prepbite-mealplan');
    if (plan) setMealPlan(JSON.parse(plan));
  }, []);

  const save = (nd: Record<string, DailyData>) => {
    setData(nd);
    localStorage.setItem('prepbite-progress', JSON.stringify(nd));
  };

  const playSuccessSound = () => {
    try {
      const AC = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AC();
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(800, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 0.15);
      g.gain.setValueAtTime(0.3, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
      osc.connect(g);
      g.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.15);
    } catch { /* audio not supported */ }
  };

  const toggleTask = (task: keyof Omit<DailyData, 'date'>) => {
    if (!selectedDate) return;
    const cur = data[selectedDate] || { date: selectedDate, exercise: false, breakfast: false, lunch: false, dinner: false };
    const isChecking = !cur[task];
    save({ ...data, [selectedDate]: { ...cur, [task]: isChecking } });
    if (isChecking) {
      setShowFlash(true);
      playSuccessSound();
      setTimeout(() => setShowFlash(false), 800);
    }
  };

  const todayDate = new Date();
  const currentMonth = todayDate.getMonth();
  const currentYear = todayDate.getFullYear();
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const todayStr = todayDate.toISOString().split('T')[0];

  const getDayRecipes = () => {
    if (!mealPlan?.days || !selectedDate) return null;
    const d = new Date(selectedDate + 'T12:00:00');
    const dow = d.getDay(); // 0=Sun
    const planIdx = dow === 0 ? 6 : dow - 1; // Mon=0..Sun=6
    return mealPlan.days[planIdx] || null;
  };

  const dayRecipes = getDayRecipes();
  const currentDayData = data[selectedDate] || { exercise: false, breakfast: false, lunch: false, dinner: false };

  const getGraphData = () => {
    if (!selectedDate) return [];
    const base = new Date(selectedDate);
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(base);
      d.setDate(base.getDate() - (6 - i));
      const ds = d.toISOString().split('T')[0];
      const dd = data[ds];
      let score = 0;
      if (dd) { if (dd.exercise) score += 25; if (dd.breakfast) score += 25; if (dd.lunch) score += 25; if (dd.dinner) score += 25; }
      return { label: d.toLocaleDateString('en-US', { weekday: 'short' }), score, date: ds };
    });
  };

  const graphData = getGraphData();

  return (
    <>
      {showFlash && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0, 255, 135, 0.15)', pointerEvents: 'none', zIndex: 9997, animation: 'flashOverlay 0.8s ease-out forwards' }} />
      )}

      <div style={{ minHeight: '100vh' }}>
        <h1 className="heading-lg" style={{ marginBottom: '2rem' }}>Progress</h1>

        {/* Graph */}
        <div className="chart-container">
          {graphData.map((day, i) => (
            <div key={i} className="chart-bar-wrapper">
              <div className="chart-bar" style={{ height: `${Math.max(5, day.score)}%`, opacity: day.date === selectedDate ? 1 : 0.6 }} />
              <div className="chart-label">{day.label}</div>
            </div>
          ))}
        </div>

        {/* Checklist + Recipes side by side */}
        <div style={{ display: 'grid', gridTemplateColumns: dayRecipes ? '1fr 1fr' : '1fr', gap: '1rem', marginBottom: '2rem' }}>
          {/* Checklist */}
          <div>
            <h2 className="heading-md" style={{ marginBottom: '1rem' }}>
              {selectedDate === todayStr ? "Today's Tasks" : 'Tasks'}
            </h2>
            <div className="checklist-container">
              {[
                { key: 'exercise', label: 'Did Exercise 💪' },
                { key: 'breakfast', label: 'Ate Breakfast 🍳' },
                { key: 'lunch', label: 'Ate Lunch 🥗' },
                { key: 'dinner', label: 'Ate Dinner 🍽️' },
              ].map(item => {
                const isChecked = currentDayData[item.key as keyof typeof currentDayData] as boolean;
                return (
                  <div key={item.key} className={`checklist-item ${isChecked ? 'checked' : ''}`} onClick={() => toggleTask(item.key as any)}>
                    <div className="check-circle">{isChecked && '✓'}</div>
                    <span className="checklist-text">{item.label}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Day's Recipes */}
          {dayRecipes && (
            <div>
              <h2 className="heading-md" style={{ marginBottom: '1rem' }}>
                {selectedDate === todayStr ? "Today's Meals" : 'Meals'}
              </h2>
              {dayRecipes.meals.map((meal: any, i: number) => {
                const mealKey = meal.type.toLowerCase() as 'breakfast' | 'lunch' | 'dinner';
                const isCompleted = currentDayData[mealKey] as boolean;
                return (
                  <div key={i} className={`recipe-mini-card ${isCompleted ? 'completed' : ''}`} onClick={() => setCookbook(meal)}>
                    {meal.image ? (
                      <img src={meal.image} alt={meal.title} style={{ width: '48px', height: '48px', borderRadius: '8px', objectFit: 'cover', flexShrink: 0 }} />
                    ) : (
                      <div style={{ width: '48px', height: '48px', borderRadius: '8px', background: 'var(--bg-card)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>🍲</div>
                    )}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--accent)', textTransform: 'uppercase' }}>{meal.type}</div>
                      <div style={{ fontSize: '0.85rem', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{meal.title}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Calendar */}
        <h2 className="heading-md" style={{ marginBottom: '1rem' }}>Calendar</h2>
        <div className="glass-card" style={{ padding: '1.5rem', marginBottom: '2rem' }}>
          <div style={{ textAlign: 'center', marginBottom: '1rem', fontWeight: 600 }}>
            {new Date(currentYear, currentMonth).toLocaleString('default', { month: 'long', year: 'numeric' })}
          </div>
          <div className="calendar-grid">
            {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
              <div key={i} className="calendar-header">{d}</div>
            ))}
            {Array.from({ length: new Date(currentYear, currentMonth, 1).getDay() }).map((_, i) => (
              <div key={`e-${i}`} />
            ))}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const dn = i + 1;
              const ds = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(dn).padStart(2, '0')}`;
              const isSel = selectedDate === ds;
              const isToday = todayStr === ds;
              const dd = data[ds];
              const hasData = dd && (dd.exercise || dd.breakfast || dd.lunch || dd.dinner);
              return (
                <div key={dn} className={`calendar-day ${isSel ? 'selected' : ''} ${isToday ? 'today' : ''}`}
                  onClick={() => setSelectedDate(ds)}
                  style={hasData && !isSel ? { borderBottom: '2px solid var(--accent)' } : {}}>
                  {dn}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {cookbook && <CookbookModal recipe={cookbook} onClose={() => setCookbook(null)} />}
    </>
  );
}
