'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface UserData {
  language: string;
  name: string;
  currentWeight: number;
  idealWeight: number;
  weightUnit: string;
  currentHeight: number;
  heightUnit: string;
  exerciseDays: number;
  timelinePreset: string;
  customTimeValue: string;
  customTimeUnit: string;
}

function getTimelineLabel(data: UserData): string {
  if (data.timelinePreset === '3months') return '3 Months';
  if (data.timelinePreset === '6months') return '6 Months';
  if (data.timelinePreset === '1year') return '1 Year';
  if (data.timelinePreset === '2years') return '2 Years';
  if (data.timelinePreset === 'other') {
    return `${data.customTimeValue} ${data.customTimeUnit}`;
  }
  return 'Not set';
}

function calculateCalories(data: UserData) {
  // Mifflin-St Jeor equation
  const weightKg = data.weightUnit === 'kg' ? data.currentWeight : data.currentWeight / 2.20462;
  
  // Get height in cm
  let heightCm = 170; // fallback
  if (data.currentHeight) {
    heightCm = data.heightUnit === 'ft' ? data.currentHeight * 2.54 : data.currentHeight;
  }
  
  const isLosing = data.currentWeight > data.idealWeight;
  const idealWeightKg = data.weightUnit === 'kg' ? data.idealWeight : data.idealWeight / 2.20462;
  const diffKg = Math.abs(weightKg - idealWeightKg);

  // Get weeks based on timeline
  let weeks = 12;
  if (data.timelinePreset === '3months') weeks = 13;
  else if (data.timelinePreset === '6months') weeks = 26;
  else if (data.timelinePreset === '1year') weeks = 52;
  else if (data.timelinePreset === '2years') weeks = 104;
  else if (data.timelinePreset === 'other') {
    const val = parseFloat(data.customTimeValue) || 1;
    if (data.customTimeUnit === 'Days') weeks = val / 7;
    else if (data.customTimeUnit === 'Weeks') weeks = val;
    else if (data.customTimeUnit === 'Months') weeks = val * 4.33;
    else if (data.customTimeUnit === 'Years') weeks = val * 52;
  }
  if (weeks <= 0) weeks = 12;

  const rateKgPerWeek = diffKg / weeks;
  const dailyCaloricChange = (rateKgPerWeek * 7700) / 7; // ~7700 kcal per kg of fat

  // BMR using Mifflin-St Jeor (estimating age ~25, gender neutral middle ground)
  const bmr = 10 * weightKg + 6.25 * heightCm - 5 * 25 - 78;
  const activityMultiplier = 1.2 + (data.exerciseDays * 0.05);
  const tdee = bmr * activityMultiplier;

  return Math.round(isLosing ? tdee - dailyCaloricChange : tdee + dailyCaloricChange);
}

function calculateWater(weightKg: number, heightCm: number) {
  // ~35ml per kg, slightly adjusted for height
  const base = weightKg * 35;
  const heightFactor = heightCm > 175 ? 1.05 : heightCm < 160 ? 0.95 : 1;
  const litres = (base * heightFactor) / 1000;
  return {
    litres: litres.toFixed(1),
    glasses: Math.round(litres / 0.25) // 250ml glasses
  };
}

export default function DashboardPage() {
  const [userData, setUserData] = useState<UserData | null>(null);
  const router = useRouter();

  useEffect(() => {
    const saved = localStorage.getItem('prepbite-onboarding');
    if (saved) {
      setUserData(JSON.parse(saved));
    }
  }, []);

  if (!userData) {
    return (
      <div className="onboarding-container" style={{ alignItems: 'center', justifyContent: 'center' }}>
        <div className="animate-pulse text-body" style={{ color: 'var(--text-muted)' }}>
          Loading your profile...
        </div>
      </div>
    );
  }

  const weightDiff = Math.abs(userData.currentWeight - userData.idealWeight);
  const isLosing = userData.currentWeight > userData.idealWeight;
  const targetCals = calculateCalories(userData);

  const weightKg = userData.weightUnit === 'kg' ? userData.currentWeight : userData.currentWeight / 2.20462;
  let heightCm = 170;
  if (userData.currentHeight) {
    heightCm = userData.heightUnit === 'ft' ? userData.currentHeight * 2.54 : userData.currentHeight;
  }
  const waterInfo = calculateWater(weightKg, heightCm);

  // Format height for display
  let heightDisplay = `${Math.round(heightCm)} cm`;
  if (userData.heightUnit === 'ft' && userData.currentHeight) {
    const ft = Math.floor(userData.currentHeight / 12);
    const inch = userData.currentHeight % 12;
    heightDisplay = `${ft}'${inch}"`;
  }

  const stats = [
    { label: 'Daily Calories', value: `${targetCals} kcal`, icon: '🔥' },
    { label: 'Water Intake', value: `${waterInfo.litres}L (${waterInfo.glasses} glasses)`, icon: '💧' },
    { label: 'Height', value: heightDisplay, icon: '📏' },
    { label: 'Current Weight', value: `${userData.currentWeight} ${userData.weightUnit}`, icon: '⚖️' },
    { label: 'Goal Weight', value: `${userData.idealWeight} ${userData.weightUnit}`, icon: '🎯' },
    { label: isLosing ? 'To Lose' : 'To Gain', value: `${weightDiff} ${userData.weightUnit}`, icon: isLosing ? '📉' : '📈' },
    { label: 'Exercise Days', value: `${userData.exerciseDays}/week`, icon: '💪' },
    { label: 'Timeline', value: getTimelineLabel(userData), icon: '⏱️' },
  ];

  return (
    <div className="onboarding-container">
      <div className="animate-slide-up" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <div style={{ textAlign: 'center', marginBottom: '2.5rem', marginTop: '2rem' }}>
          <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>👋</div>
          <h1 className="heading-lg" style={{ marginBottom: '0.5rem' }}>
            Welcome, <span style={{ color: 'var(--accent)' }}>{userData.name}</span>!
          </h1>
          <p className="text-body" style={{ color: 'var(--text-secondary)' }}>
            {"Here's your fitness profile & daily targets."}
          </p>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
          gap: '1rem',
          marginBottom: '2rem',
        }}>
          {stats.map((stat, i) => (
            <div key={stat.label} className="glass-card" style={{ padding: '1.25rem', textAlign: 'center', animationDelay: `${i * 0.1}s`, animationFillMode: 'both' }}>
              <div style={{ fontSize: '1.75rem', marginBottom: '0.5rem' }}>{stat.icon}</div>
              <div className="heading-sm" style={{ color: 'var(--accent)', marginBottom: '0.25rem' }}>{stat.value}</div>
              <div className="text-xs" style={{ color: 'var(--text-muted)' }}>{stat.label}</div>
            </div>
          ))}
        </div>

        <div style={{ marginTop: 'auto', paddingBottom: '1.5rem' }}>
          <button className="btn btn-primary" onClick={() => router.push('/app')} style={{ width: '100%', fontSize: '1.125rem', padding: '1rem' }}>
            Get Started 🚀
          </button>
        </div>
      </div>
    </div>
  );
}
