import type { NextRequest } from 'next/server';

import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { isTerminal, canTransition, type RampStatus } from '@/lib/ramp/status';
import {
  rampStatusForStripe,
  verifyStripeSignature,
  type StripeOnrampSessionObject,
} from '@/lib/stripe/onramp';

// ---------------------------------------------------------------------------
// POST /api/stripe/webhook
// Stripe → us. Unauthenticated BY DESIGN (Stripe cannot hold a Supabase
// session); the Stripe-Signature header is the authentication. Register the
// endpoint in the Stripe dashboard for `crypto.onramp_session.updated` and
// put its signing secret in STRIPE_WEBHOOK_SECRET.
//
// Each event advances the matching ramp_transfers row (providerRef = session
// id) through the forward-only machine. `fulfillment_complete` becomes
// provider_complete — the reconciler marks `arrived` only when the balance
// actually moves (doc 89 rule 3). Always 200 after a valid signature, so
// Stripe does not retry an event we have already applied.
// ---------------------------------------------------------------------------

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    // Misconfiguration must be loud, not a silent 200 that swallows events.
    return NextResponse.json({ error: 'Webhook not configured' }, { status: 503 });
  }
  const raw = await req.text();
  if (!verifyStripeSignature(raw, req.headers.get('stripe-signature'), secret)) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  let event: { id?: string; type?: string; data?: { object?: StripeOnrampSessionObject } };
  try {
    event = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  if (!event.type?.startsWith('crypto.onramp_session.')) {
    return NextResponse.json({ received: true, ignored: event.type ?? null });
  }
  const session = event.data?.object;
  if (!session?.id) return NextResponse.json({ received: true, ignored: 'no session' });

  const to = rampStatusForStripe(session.status);
  if (!to) return NextResponse.json({ received: true, status: session.status ?? null });

  try {
    const row = await prisma.rampTransfer.findFirst({
      where: { provider: 'stripe', providerRef: session.id },
    });
    if (!row) {
      // The client writes the row right after minting the session; a webhook
      // that outruns it is retried by Stripe (non-2xx), which is exactly what
      // we want for a transient race — but only for a short while.
      console.warn('[stripe/webhook] no ramp row for session', session.id, session.status);
      return NextResponse.json({ error: 'Unknown session' }, { status: 404 });
    }
    const from = row.status as RampStatus;
    if (!canTransition(from, to)) {
      return NextResponse.json({ received: true, status: from, unchanged: true });
    }
    const details = session.transaction_details ?? null;
    await prisma.rampTransfer.update({
      where: { id: row.id },
      data: {
        status: to,
        ...(details?.destination_amount ? { amountFinal: String(details.destination_amount) } : {}),
        ...(to === 'failed' ? { failureReason: `Stripe: ${session.status}` } : {}),
        ...(isTerminal(to) ? { settledAt: new Date() } : {}),
      },
    });
    return NextResponse.json({ received: true, status: to });
  } catch (e: any) {
    console.error('[stripe/webhook] exception:', e?.message ?? e);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
