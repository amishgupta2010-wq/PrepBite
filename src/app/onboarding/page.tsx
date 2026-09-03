'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import WeightRoller from '../components/WeightRoller';
import { LANGUAGES, TRANSLATIONS, LanguageCode } from '../lib/translations';
import { registerUser, loginUser } from '../../lib/auth';

type WeightUnit = 'kg' | 'lbs';
type HeightUnit = 'cm' | 'ft';
type TimeUnit = 'Days' | 'Weeks' | 'Months' | 'Years';

interface OnboardingData {
  language: LanguageCode;
  email: string;
  password: string;
  confirmPassword: string;
  name: string;
  gender: 'male' | 'female' | 'other' | null;
  currentWeight: number;
  idealWeight: number;
  weightUnit: WeightUnit;
  currentHeight: number; // cm when heightUnit='cm', total inches when heightUnit='ft'
  heightUnit: HeightUnit;
  exerciseDays: number | null;
  timelinePreset: string | null;
  customTimeValue: string;
  customTimeUnit: TimeUnit;
  referralSource: string | null;
  customReferral: string;
}

const KG_TO_LBS = 2.20462;
const LBS_TO_KG = 1 / KG_TO_LBS;
const MAX_SAFE_KG_PER_WEEK = 1.0;
const MAX_SAFE_GAIN_KG_PER_WEEK = 0.5;

const HEIGHT_LABELS: Record<LanguageCode, string> = {
  en: 'Height', zh: '身高', hi: 'ऊंचाई', ja: '身長',
  es: 'Altura', fr: 'Taille', ko: '키', pt: 'Altura',
  ar: 'الطول', de: 'Größe',
};

function convertTimeToWeeks(value: number, unit: TimeUnit): number {
  switch (unit) {
    case 'Days': return value / 7;
    case 'Weeks': return value;
    case 'Months': return value * 4.333;
    case 'Years': return value * 52;
  }
}

function getWeightBounds(unit: WeightUnit) {
  if (unit === 'kg') return { min: 30, max: 130 };
  return { min: 66, max: 286 };
}

function getHeightBounds(unit: HeightUnit) {
  if (unit === 'cm') return { min: 100, max: 250 };
  return { min: 39, max: 98 }; // total inches
}

function convertWeight(value: number, from: WeightUnit, to: WeightUnit): number {
  if (from === to) return value;
  if (from === 'kg') return Math.round(value * KG_TO_LBS);
  return Math.round(value * LBS_TO_KG);
}

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const totalSteps = 8;

  const [data, setData] = useState<OnboardingData>({
    language: 'en',
    email: '',
    password: '',
    confirmPassword: '',
    name: '',
    gender: null,
    currentWeight: 70,
    idealWeight: 65,
    weightUnit: 'kg',
    currentHeight: 170,
    heightUnit: 'cm',
    exerciseDays: null,
    timelinePreset: null,
    customTimeValue: '',
    customTimeUnit: 'Months',
    referralSource: null,
    customReferral: '',
  });

  const [showCustomTimeline, setShowCustomTimeline] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [usernameError, setUsernameError] = useState('');
  const t = TRANSLATIONS[data.language];

  const weightBounds = getWeightBounds(data.weightUnit);
  const heightBounds = getHeightBounds(data.heightUnit);

  const toggleWeightUnit = () => {
    const newUnit: WeightUnit = data.weightUnit === 'kg' ? 'lbs' : 'kg';
    const newBounds = getWeightBounds(newUnit);
    setData((prev) => ({
      ...prev,
      weightUnit: newUnit,
      currentWeight: Math.min(Math.max(convertWeight(prev.currentWeight, prev.weightUnit, newUnit), newBounds.min), newBounds.max),
      idealWeight: Math.min(Math.max(convertWeight(prev.idealWeight, prev.weightUnit, newUnit), newBounds.min), newBounds.max),
    }));
  };

  const toggleHeightUnit = () => {
    if (data.heightUnit === 'cm') {
      const inches = Math.round(data.currentHeight / 2.54);
      setData(prev => ({ ...prev, heightUnit: 'ft', currentHeight: Math.min(Math.max(inches, 39), 98) }));
    } else {
      const cm = Math.round(data.currentHeight * 2.54);
      setData(prev => ({ ...prev, heightUnit: 'cm', currentHeight: Math.min(Math.max(cm, 100), 250) }));
    }
  };

  const formatHeightDisplay = (val: number) => {
    if (data.heightUnit === 'ft') {
      const ft = Math.floor(val / 12);
      const inch = val % 12;
      return `${ft}'${inch}"`;
    }
    return `${val} cm`;
  };

  const formatHeightLabel = (val: number): string | null => {
    if (data.heightUnit === 'ft') {
      return val % 12 === 0 ? `${val / 12}'` : null;
    }
    return String(val);
  };

  const timelineValidation = useMemo(() => {
    const weightDiffKg = data.weightUnit === 'kg'
      ? Math.abs(data.currentWeight - data.idealWeight)
      : Math.abs(data.currentWeight - data.idealWeight) * LBS_TO_KG;

    if (weightDiffKg === 0) return { valid: true, message: '' };

    let weeks = 0;
    if (data.timelinePreset && data.timelinePreset !== 'other') {
      switch (data.timelinePreset) {
        case '3months': weeks = convertTimeToWeeks(3, 'Months'); break;
        case '6months': weeks = convertTimeToWeeks(6, 'Months'); break;
        case '1year': weeks = convertTimeToWeeks(1, 'Years'); break;
        case '2years': weeks = convertTimeToWeeks(2, 'Years'); break;
      }
    } else if (data.timelinePreset === 'other' && data.customTimeValue) {
      const val = parseFloat(data.customTimeValue);
      if (isNaN(val) || val <= 0) return { valid: false, message: 'Invalid number' };
      weeks = convertTimeToWeeks(val, data.customTimeUnit);
    } else {
      return { valid: false, message: '' };
    }

    if (weeks <= 0) return { valid: false, message: 'Invalid timeframe' };
    const ratePerWeek = weightDiffKg / weeks;
    const isLosing = data.currentWeight > data.idealWeight;

    if (isLosing && ratePerWeek > MAX_SAFE_KG_PER_WEEK) {
      return { valid: false, message: '⚠️ Select a safer and more realistic time frame.' };
    }
    if (!isLosing && ratePerWeek > MAX_SAFE_GAIN_KG_PER_WEEK) {
      return { valid: false, message: '⚠️ Select a safer and more realistic time frame.' };
    }
    return { valid: true, message: '' };
  }, [data]);

  const { data: oauthSession } = useSession();

  const isStepValid = useMemo(() => {
    switch (step) {
      case 1: return true;
      case 2:
        if (oauthSession) return true;
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(data.email) && data.password.length >= 8 && data.password === data.confirmPassword;
      case 3: return data.name.trim().length >= 2 && data.name.trim().length <= 30;
      case 4: return data.gender !== null;
      case 5: {
        const wb = getWeightBounds(data.weightUnit);
        const hb = getHeightBounds(data.heightUnit);
        const gainLimit = data.weightUnit === 'kg' ? 50 : 110;
        const isSafeGain = (data.idealWeight - data.currentWeight) < gainLimit;
        return data.currentWeight >= wb.min && data.currentWeight <= wb.max &&
               data.idealWeight >= wb.min && data.idealWeight <= wb.max &&
               data.currentHeight >= hb.min && data.currentHeight <= hb.max &&
               isSafeGain;
      }
      case 6: return data.exerciseDays !== null;
      case 7:
        if (!data.timelinePreset) return false;
        if (data.timelinePreset === 'other') {
          if (!data.customTimeValue || parseFloat(data.customTimeValue) <= 0) return false;
        }
        return timelineValidation.valid;
      case 8: return data.referralSource !== null;
      default: return false;
    }
  }, [step, data, timelineValidation, oauthSession]);

  useEffect(() => {
    if (oauthSession?.user) {
      if (!data.email) {
        setData(prev => ({ 
          ...prev, 
          email: oauthSession.user!.email || '', 
          name: oauthSession.user!.name || '' 
        }));
      }
      if (step === 2) setStep(3);
    }
  }, [oauthSession, step, data.email]);

  const handleNext = async () => {
    if (!isStepValid) return;
    
    setEmailError('');
    setUsernameError('');
    
    if (step === 2 && !oauthSession) {
      const usersStr = localStorage.getItem('prepbite-users');
      if (usersStr) {
        const users = JSON.parse(usersStr);
        if (users.some((u: any) => u.email.toLowerCase() === data.email.toLowerCase())) {
          setEmailError('Email already in use');
          return;
        }
      }
    }
    
    if (step === 3) {
      const usersStr = localStorage.getItem('prepbite-users');
      if (usersStr) {
        const users = JSON.parse(usersStr);
        if (users.some((u: any) => u.username.toLowerCase() === data.name.trim().toLowerCase())) {
          setUsernameError('Username already exists');
          return;
        }
      }
    }

    if (step < totalSteps) {
      setStep(step + 1);
    } else {
      try {
        const isOAuth = !!oauthSession;
        await registerUser(data.name.trim(), data.email, data.password, data.gender || 'other', isOAuth);
        if (!isOAuth) {
          await loginUser(data.email, data.password, true);
        }
        localStorage.setItem('prepbite-onboarding', JSON.stringify(data));
        router.push('/dashboard');
      } catch (err: any) {
        alert(err.message || 'Registration failed');
      }
    }
  };

  const handleBack = () => {
    if (step > 1) {
      if (oauthSession && step === 3) setStep(1);
      else setStep(step - 1);
    }
  };

  const presetTimelines = [
    { key: '3months', label: t.months_3 },
    { key: '6months', label: t.months_6 },
    { key: '1year', label: t.year_1 },
    { key: '2years', label: t.years_2 },
  ];

  const referralOptions = [
    { key: 'youtube', label: t.youtube },
    { key: 'instagram', label: t.instagram },
    { key: 'tiktok', label: t.tiktok },
    { key: 'ai', label: t.ai },
    { key: 'google', label: t.google },
    { key: 'reddit', label: 'Reddit' },
  ];

  return (
    <div className="onboarding-container">
      {/* Header */}
      <div className="onboarding-header animate-fade-in">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
          {step > 1 ? (
            <button className="btn-back" onClick={handleBack} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', fontSize: '1.5rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', fontFamily: 'var(--font-body)' }}>
              ← <span style={{ fontSize: '1rem' }}>{t.back}</span>
            </button>
          ) : (
            <button className="btn-back" onClick={() => router.push('/')} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', fontSize: '1.5rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', fontFamily: 'var(--font-body)' }}>
              ← <span style={{ fontSize: '1rem' }}>Home</span>
            </button>
          )}
          <span className="text-sm" style={{ color: 'var(--text-muted)' }}>{t.step} {step} {t.of} {totalSteps}</span>
        </div>
        <div className="progress-bar">
          <div className="progress-fill" style={{ width: `${(step / totalSteps) * 100}%` }} />
        </div>
      </div>

      {/* Step Content */}
      <div className="step-content" key={step}>
        {/* Step 1: Language */}
        {step === 1 && (
          <div className="animate-slide-up">
            <h2 className="step-question">{t.select_lang || "Select comfortable language 🌐"}</h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              {LANGUAGES.map(lang => (
                <button
                  key={lang.code}
                  className={`timeline-card ${data.language === lang.code ? 'selected' : ''}`}
                  onClick={() => setData({ ...data, language: lang.code as LanguageCode })}
                  style={{ padding: '0.75rem 1rem' }}
                >
                  {lang.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 2: Account Credentials */}
        {step === 2 && (
          <div className="animate-slide-up">
            <h2 className="step-question">Account Credentials</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1.5rem' }}>
              {!oauthSession && (
                <div>
                  <input 
                    className="input" 
                    type="email" 
                    placeholder="Email address" 
                    value={data.email} 
                    onChange={(e) => setData({ ...data, email: e.target.value })} 
                  />
                  {emailError && <p style={{ color: '#FF4757', fontSize: '0.875rem', marginTop: '0.5rem' }}>{emailError}</p>}
                  {data.email.length > 0 && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email) && <p style={{ color: '#FF4757', fontSize: '0.875rem', marginTop: '0.5rem' }}>Invalid email format</p>}
                </div>
              )}
              <div style={{ position: 'relative' }}>
                <input 
                  className="input" 
                  type={showPassword ? 'text' : 'password'} 
                  placeholder="Password" 
                  value={data.password} 
                  onChange={(e) => setData({ ...data, password: e.target.value })} 
                  style={{ paddingRight: '2.5rem' }}
                />
                <button 
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', background: 'transparent', border: 'none', cursor: 'pointer' }}
                >
                  {showPassword ? '👁️' : '🙈'}
                </button>
                {data.password.length > 0 && data.password.length < 8 && <p style={{ color: '#FF4757', fontSize: '0.875rem', marginTop: '0.5rem' }}>Password must be at least 8 characters</p>}
              </div>
              <div style={{ position: 'relative' }}>
                <input 
                  className="input" 
                  type={showPassword ? 'text' : 'password'} 
                  placeholder="Confirm Password" 
                  value={data.confirmPassword} 
                  onChange={(e) => setData({ ...data, confirmPassword: e.target.value })} 
                  style={{ paddingRight: '2.5rem' }}
                />
                {data.confirmPassword.length > 0 && data.password !== data.confirmPassword && <p style={{ color: '#FF4757', fontSize: '0.875rem', marginTop: '0.5rem' }}>Passwords do not match</p>}
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Username */}
        {step === 3 && (
          <div className="animate-slide-up">
            <h2 className="step-question">Choose a username</h2>
            <p className="text-body" style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>{t.name_desc}</p>
            <input className="input" type="text" placeholder={t.name_placeholder} value={data.name} onChange={(e) => setData({ ...data, name: e.target.value })} maxLength={30} autoFocus />
            <p className="text-xs" style={{ color: 'var(--text-muted)', marginTop: '0.5rem' }}>{data.name.length}/30</p>
            {usernameError && <p style={{ color: '#FF4757', fontSize: '0.875rem', marginTop: '0.5rem' }}>{usernameError}</p>}
          </div>
        )}

        {/* Step 4: Gender */}
        {step === 4 && (
          <div className="animate-slide-up">
            <h2 className="step-question">Gender</h2>
            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', justifyContent: 'center', marginTop: '2rem' }}>
              {[
                { id: 'male', label: 'Male', icon: '🧔' },
                { id: 'female', label: 'Female', icon: '👩' },
                { id: 'other', label: 'Other', icon: '🧑' }
              ].map((g) => (
                <button 
                  key={g.id} 
                  className={`day-card ${data.gender === g.id ? 'selected' : ''}`} 
                  onClick={() => setData({ ...data, gender: g.id as any })}
                  style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '1rem', flex: 1, minWidth: '80px', height: '100px' }}
                >
                  <span style={{ fontSize: '2rem', marginBottom: '0.25rem' }}>{g.icon}</span>
                  <span style={{ fontSize: '0.875rem' }}>{g.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 5: Weight + Height */}
        {step === 5 && (
          <div className="animate-slide-up">
            <h2 className="step-question">{t.what_weight}</h2>

            {/* Weight Unit Toggle */}
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.5rem' }}>
              <div className="unit-toggle">
                <button className={`unit-toggle-option ${data.weightUnit === 'kg' ? 'active' : ''}`} onClick={() => data.weightUnit !== 'kg' && toggleWeightUnit()}>Kg</button>
                <button className={`unit-toggle-option ${data.weightUnit === 'lbs' ? 'active' : ''}`} onClick={() => data.weightUnit !== 'lbs' && toggleWeightUnit()}>Lbs</button>
              </div>
            </div>

            <WeightRoller label={t.current_weight} value={data.currentWeight} onChange={(val) => setData({ ...data, currentWeight: val })} min={weightBounds.min} max={weightBounds.max} unit={data.weightUnit} id="current-weight" />
            <div style={{ height: '1.5rem' }} />
            <WeightRoller label={t.ideal_weight} value={data.idealWeight} onChange={(val) => setData({ ...data, idealWeight: val })} min={weightBounds.min} max={weightBounds.max} unit={data.weightUnit} id="ideal-weight" />

            {(!isStepValid && data.idealWeight - data.currentWeight >= (data.weightUnit === 'kg' ? 50 : 110)) && (
              <p style={{ color: '#FF4757', marginTop: '1rem', textAlign: 'center', fontWeight: 600, fontSize: '0.9rem' }}>
                ⚠️ Please choose a realistic weight.
              </p>
            )}

            {/* Divider */}
            <div style={{ height: '2rem', borderBottom: '1px solid var(--border)', marginBottom: '2rem' }} />

            {/* Height Section */}
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.5rem' }}>
              <div className="unit-toggle">
                <button className={`unit-toggle-option ${data.heightUnit === 'cm' ? 'active' : ''}`} onClick={() => data.heightUnit !== 'cm' && toggleHeightUnit()}>cm</button>
                <button className={`unit-toggle-option ${data.heightUnit === 'ft' ? 'active' : ''}`} onClick={() => data.heightUnit !== 'ft' && toggleHeightUnit()}>ft</button>
              </div>
            </div>

            <WeightRoller
              label={HEIGHT_LABELS[data.language]}
              value={data.currentHeight}
              onChange={(val) => setData({ ...data, currentHeight: val })}
              min={heightBounds.min}
              max={heightBounds.max}
              unit={data.heightUnit}
              id="height"
              formatDisplay={formatHeightDisplay}
              labelInterval={data.heightUnit === 'ft' ? 12 : 10}
              formatLabel={formatHeightLabel}
            />
          </div>
        )}

        {/* Step 6: Exercise */}
        {step === 6 && (
          <div className="animate-slide-up">
            <h2 className="step-question">{t.how_many_days}</h2>
            <p className="text-body" style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>{t.exercise_desc}</p>
            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', justifyContent: 'center' }}>
              {[0, 1, 2, 3, 4, 5, 6, 7].map((day) => (
                <button key={day} className={`day-card ${data.exerciseDays === day ? 'selected' : ''}`} onClick={() => setData({ ...data, exerciseDays: day })}>
                  {day}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 7: Timeline */}
        {step === 7 && (
          <div className="animate-slide-up">
            <h2 className="step-question">{t.how_much_time}</h2>
            <p className="text-body" style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>{t.time_desc}</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
              {presetTimelines.map((preset) => (
                <button key={preset.key} className={`timeline-card ${data.timelinePreset === preset.key ? 'selected' : ''}`} onClick={() => { setData({ ...data, timelinePreset: preset.key, customTimeValue: '' }); setShowCustomTimeline(false); }}>
                  {preset.label}
                </button>
              ))}
            </div>
            <button className={`timeline-card ${data.timelinePreset === 'other' ? 'selected' : ''}`} onClick={() => { setData({ ...data, timelinePreset: 'other' }); setShowCustomTimeline(true); }} style={{ width: '100%', marginBottom: '1rem' }}>
              {t.other}
            </button>
            {showCustomTimeline && data.timelinePreset === 'other' && (
              <div className="animate-slide-up" style={{ marginBottom: '1rem' }}>
                <div className="input-row">
                  <input className="input" type="number" placeholder={t.enter_time} value={data.customTimeValue} onChange={(e) => setData({ ...data, customTimeValue: e.target.value })} min={1} />
                  <select className="select" value={data.customTimeUnit} onChange={(e) => setData({ ...data, customTimeUnit: e.target.value as TimeUnit })} style={{ flex: '0 0 140px' }}>
                    <option value="Days">Days</option>
                    <option value="Weeks">Weeks</option>
                    <option value="Months">Months</option>
                    <option value="Years">Years</option>
                  </select>
                </div>
              </div>
            )}
            {timelineValidation.message && <div className="warning-banner">{timelineValidation.message}</div>}
          </div>
        )}

        {/* Step 8: Referral */}
        {step === 8 && (
          <div className="animate-slide-up">
            <h2 className="step-question">{t.how_hear}</h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
              {referralOptions.map((opt) => (
                <button key={opt.key} className={`timeline-card ${data.referralSource === opt.key ? 'selected' : ''}`} onClick={() => setData({ ...data, referralSource: opt.key, customReferral: '' })}>
                  {opt.label}
                </button>
              ))}
            </div>
            <button className={`timeline-card ${data.referralSource === 'other' ? 'selected' : ''}`} onClick={() => setData({ ...data, referralSource: 'other' })} style={{ width: '100%', marginBottom: '1rem' }}>
              {t.others_optional?.replace(' (optional)', '').replace(' (可选)', '').replace(' (वैकल्पिक)', '').replace(' (任意)', '').replace(' (opcional)', '').replace(' (facultatif)', '').replace(' (선택사항)', '').replace(' (اختياري)', '') || 'Others'}
            </button>
            {(data.referralSource === 'other' || data.referralSource === 'ai') && (
              <div className="animate-slide-up">
                <input className="input" type="text" placeholder={data.referralSource === 'ai' ? '(AI Name)' : 'Optional'} value={data.customReferral} onChange={(e) => setData({ ...data, customReferral: e.target.value })} />
              </div>
            )}
          </div>
        )}
      </div>

      {/* Next button area */}
      <div style={{ padding: '1.5rem 0', marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <p style={{ textAlign: 'center', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
          Already have an account?{' '}
          <button 
            onClick={() => router.push('/?login=true')}
            style={{
              background: 'none', border: 'none', color: '#4285F4',
              fontWeight: 600, cursor: 'pointer', fontSize: '0.9rem',
              textDecoration: 'underline',
            }}
          >
            Sign in!
          </button>
        </p>
        <button className="btn btn-primary" disabled={!isStepValid} onClick={handleNext} style={{ width: '100%', fontSize: '1.125rem', padding: '1rem' }}>
          {step === totalSteps ? t.complete : t.next}
        </button>
      </div>
    </div>
  );
}
