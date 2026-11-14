import fs from 'fs';
import path from 'path';

export const TOTAL_LIFETIME_SPOTS = 25;

// File path for persisting lifetime claimed spots count
const DATA_FILE = path.join(process.cwd(), '.lifetime_spots.json');

export interface LifetimeSpotsStatus {
  total: number;
  claimed: number;
  remaining: number;
  soldOut: boolean;
}

export function getLifetimeSpots(): LifetimeSpotsStatus {
  let claimed = 0;
  try {
    if (fs.existsSync(DATA_FILE)) {
      const raw = fs.readFileSync(DATA_FILE, 'utf-8');
      const data = JSON.parse(raw);
      if (typeof data.claimed === 'number') {
        claimed = Math.max(0, Math.min(TOTAL_LIFETIME_SPOTS, data.claimed));
      }
    }
  } catch (err) {
    console.error('[lifetimeSpots] Error reading spots file:', err);
  }

  const remaining = Math.max(0, TOTAL_LIFETIME_SPOTS - claimed);
  return {
    total: TOTAL_LIFETIME_SPOTS,
    claimed,
    remaining,
    soldOut: remaining <= 0,
  };
}

export function claimLifetimeSpot(): LifetimeSpotsStatus {
  const current = getLifetimeSpots();
  if (current.remaining <= 0) {
    return current;
  }

  const newClaimed = current.claimed + 1;
  try {
    fs.writeFileSync(
      DATA_FILE,
      JSON.stringify({ claimed: newClaimed, updatedAt: new Date().toISOString() }, null, 2),
      'utf-8'
    );
  } catch (err) {
    console.error('[lifetimeSpots] Error writing spots file:', err);
  }

  const remaining = Math.max(0, TOTAL_LIFETIME_SPOTS - newClaimed);
  return {
    total: TOTAL_LIFETIME_SPOTS,
    claimed: newClaimed,
    remaining,
    soldOut: remaining <= 0,
  };
}
