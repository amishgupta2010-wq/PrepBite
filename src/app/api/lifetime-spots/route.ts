import { NextRequest, NextResponse } from 'next/server';
import { getLifetimeSpots, claimLifetimeSpot } from '@/lib/lifetimeSpots';

export const runtime = 'nodejs';

// GET /api/lifetime-spots — return current spots count
export async function GET() {
  const status = getLifetimeSpots();
  return NextResponse.json(status);
}

// POST /api/lifetime-spots — claim a lifetime spot
export async function POST(req: NextRequest) {
  try {
    const status = claimLifetimeSpot();
    return NextResponse.json(status);
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Failed to claim spot' }, { status: 500 });
  }
}
