import { NextRequest, NextResponse } from 'next/server';
import DodoPayments from 'dodopayments';
import { claimLifetimeSpot } from '@/lib/lifetimeSpots';

export const runtime = 'nodejs';

// DodoPayments sends a POST with a JSON body and webhook headers
// verified via client.webhooks.unwrap
export async function POST(req: NextRequest) {
  const secret = process.env.DODO_WEBHOOK_SECRET;
  if (!secret) {
    console.error('[webhook/dodo] DODO_WEBHOOK_SECRET not set');
    return NextResponse.json({ error: 'Webhook secret not configured' }, { status: 500 });
  }

  const rawBody = await req.text();
  const headers: Record<string, string> = {};
  req.headers.forEach((value, key) => {
    headers[key] = value;
  });

  const client = new DodoPayments({
    bearerToken: process.env.DODO_PAYMENTS_API_KEY || '',
    webhookKey: secret,
    environment: 'live_mode',
  });

  let event: any;
  try {
    event = client.webhooks.unwrap(rawBody, { headers, key: secret });
  } catch (err: any) {
    console.error('[webhook/dodo] Signature verification failed:', err?.message);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  // Handle payment success — unlock Pro for the customer
  if (
    event.type === 'payment.succeeded' ||
    event.type === 'subscription.active'
  ) {
    console.log('[webhook/dodo] Pro payment confirmed:', JSON.stringify(event, null, 2));

    // If lifetime product was purchased, claim a lifetime spot
    const lifetimeId = process.env.NEXT_PUBLIC_DODO_LIFETIME_PRODUCT_ID;
    const eventProductId = event.data?.product_id || event.data?.product_cart?.[0]?.product_id;
    if (lifetimeId && eventProductId === lifetimeId) {
      claimLifetimeSpot();
    }
  }

  return NextResponse.json({ received: true });
}
