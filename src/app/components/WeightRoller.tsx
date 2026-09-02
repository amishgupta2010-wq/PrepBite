'use client';

import { useRef, useEffect, useCallback, useState } from 'react';

interface RollerProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  unit: string;
  id: string;
  formatDisplay?: (value: number) => string;
  labelInterval?: number;
  formatLabel?: (value: number) => string | null;
}

export default function WeightRoller({
  label, value, onChange, min, max, unit, id,
  formatDisplay,
  labelInterval = 10,
  formatLabel,
}: RollerProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const isProgrammatic = useRef(false);
  const startX = useRef(0);
  const startScroll = useRef(0);
  const snapTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const TICK_WIDTH = 14;

  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState('');

  const snapToNearest = useCallback(() => {
    if (!trackRef.current) return;
    const scrollLeft = trackRef.current.scrollLeft;
    const index = Math.round(scrollLeft / TICK_WIDTH);
    const targetScroll = index * TICK_WIDTH;
    const newValue = Math.min(Math.max(min + index, min), max);
    isProgrammatic.current = true;
    trackRef.current.scrollTo({ left: targetScroll, behavior: 'smooth' });
    setTimeout(() => { isProgrammatic.current = false; }, 350);
    if (newValue !== value) onChange(newValue);
  }, [min, max, value, onChange]);

  useEffect(() => {
    if (!trackRef.current) return;
    isProgrammatic.current = true;
    trackRef.current.scrollLeft = (value - min) * TICK_WIDTH;
    requestAnimationFrame(() => { isProgrammatic.current = false; });
  }, [min, max]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleScroll = useCallback(() => {
    if (isProgrammatic.current || !trackRef.current) return;
    const index = Math.round(trackRef.current.scrollLeft / TICK_WIDTH);
    const nv = Math.min(Math.max(min + index, min), max);
    if (nv !== value) onChange(nv);
    if (snapTimer.current) clearTimeout(snapTimer.current);
    snapTimer.current = setTimeout(snapToNearest, 120);
  }, [min, max, value, onChange, snapToNearest]);

  const handleMouseDown = (e: React.MouseEvent) => { isDragging.current = true; startX.current = e.pageX; startScroll.current = trackRef.current?.scrollLeft || 0; e.preventDefault(); };
  const handleMouseMove = (e: React.MouseEvent) => { if (!isDragging.current || !trackRef.current) return; trackRef.current.scrollLeft = startScroll.current + (startX.current - e.pageX); };
  const handleMouseUp = () => { if (isDragging.current) { isDragging.current = false; snapToNearest(); } };
  const handleTouchStart = (e: React.TouchEvent) => { startX.current = e.touches[0].pageX; startScroll.current = trackRef.current?.scrollLeft || 0; };
  const handleTouchMove = (e: React.TouchEvent) => { if (!trackRef.current) return; trackRef.current.scrollLeft = startScroll.current + (startX.current - e.touches[0].pageX); };
  const handleTouchEnd = () => snapToNearest();

  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => { e.preventDefault(); e.stopPropagation(); el.scrollLeft += e.deltaY > 0 ? TICK_WIDTH * 3 : -TICK_WIDTH * 3; if (snapTimer.current) clearTimeout(snapTimer.current); snapTimer.current = setTimeout(snapToNearest, 120); };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [snapToNearest]);

  useEffect(() => () => { if (snapTimer.current) clearTimeout(snapTimer.current); }, []);

  // --- Typing input ---
  const handleValueClick = () => { setEditValue(String(value)); setIsEditing(true); };
  const handleEditSubmit = () => {
    const num = parseInt(editValue, 10);
    if (!isNaN(num) && num >= min && num <= max) {
      onChange(num);
      if (trackRef.current) {
        isProgrammatic.current = true;
        trackRef.current.scrollTo({ left: (num - min) * TICK_WIDTH, behavior: 'smooth' });
        setTimeout(() => { isProgrammatic.current = false; }, 350);
      }
    }
    setIsEditing(false);
  };

  const midInterval = Math.max(1, Math.floor(labelInterval / 2));
  const ticks = [];
  for (let i = min; i <= max; i++) {
    const isMajor = i % labelInterval === 0;
    const isMid = i % midInterval === 0 && !isMajor;
    let tickLabel: string | null = null;
    if (isMajor) tickLabel = formatLabel ? formatLabel(i) : String(i);
    ticks.push(
      <div key={i} className={`roller-tick ${isMajor ? 'roller-tick-major' : isMid ? 'roller-tick-mid' : 'roller-tick-minor'}`}>
        <div className="roller-tick-line" />
        {tickLabel !== null && <span className="roller-tick-label">{tickLabel}</span>}
      </div>
    );
  }

  return (
    <div className="roller-wrapper" id={id}>
      <div className="roller-label">{label}</div>
      <div className="roller-container">
        <div className="roller-indicator" />
        <div ref={trackRef} className="roller-track" style={{ padding: `0 calc(50% - ${TICK_WIDTH / 2}px)` }}
          onScroll={handleScroll} onMouseDown={handleMouseDown} onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp}
          onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd}>
          {ticks}
        </div>
      </div>
      <div className="roller-value" onClick={!isEditing ? handleValueClick : undefined} style={!isEditing ? { cursor: 'pointer' } : undefined} title="Click to type">
        {isEditing ? (
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: '0.5rem' }}>
            <input type="number" className="roller-edit-input" value={editValue}
              onChange={e => setEditValue(e.target.value)}
              onBlur={handleEditSubmit}
              onKeyDown={e => { if (e.key === 'Enter') handleEditSubmit(); if (e.key === 'Escape') setIsEditing(false); }}
              autoFocus min={min} max={max} />
            <span style={{ fontSize: '1.25rem', fontWeight: 500, color: 'var(--text-secondary)' }}>{unit}</span>
          </div>
        ) : formatDisplay ? formatDisplay(value) : (
          <>{value} <span style={{ fontSize: '1.25rem', fontWeight: 500, color: 'var(--text-secondary)' }}>{unit}</span></>
        )}
      </div>
    </div>
  );
}
