import { NextRequest, NextResponse } from 'next/server';
import DodoPayments from 'dodopayments';

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
  }

  return NextResponse.json({ received: true });
}
