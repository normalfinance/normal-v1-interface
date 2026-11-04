import type { NextRequest } from 'next/server';

import { prisma } from '@/lib/prisma';
import { cookies } from 'next/headers';
import { withAuth } from '@/lib/with-auth';
import { NextResponse } from 'next/server';
import { redis, rateLimiter } from '@/server/rateLimiter';
import { networkFromCookie } from '@/server/network-cookie';
import { isValidStellarAddress } from '@/utils/stellar-address';
import { getStellarConfigForNetwork } from '@normalfinance/utils';
import {
  linkChallengeKey,
  buildLinkChallenge,
  LINK_CHALLENGE_TTL_SECONDS,
} from '@/lib/stellar/wallet-proof';

// ---------------------------------------------------------------------------
// POST /api/wallets/link/challenge — what a wallet signs to prove it's yours.
//
// Body: { walletAddress }
// 200 { required: false }                                — your Normal wallet: no proof needed
// 200 { required: true, challengeXdr, networkPassphrase } — sign it, then POST /api/wallets/link
//     with { walletAddress, walletName?, signedChallengeXdr }
// 400 invalid address · 429 too many · 503 challenge store unavailable
//
// The challenge lives 5 minutes and works once. It is stored per user and
// address, so a signature from one account's challenge can't link another's.
// ---------------------------------------------------------------------------

export const dynamic = 'force-dynamic';

export const POST = withAuth(async (request: NextRequest, { user }) => {
  const body = (await request.json().catch(() => null)) as { walletAddress?: unknown } | null;
  const walletAddress = typeof body?.walletAddress === 'string' ? body.walletAddress : '';
  if (!isValidStellarAddress(walletAddress)) {
    return NextResponse.json({ error: 'Invalid Stellar wallet address' }, { status: 400 });
  }

  // The server already knows the user's own Normal wallet.
  const turnkey = await prisma.turnkeyWallet.findUnique({
    where: { supabaseUid: user.id },
    select: { stellarAddress: true },
  });
  if (turnkey?.stellarAddress === walletAddress) {
    return NextResponse.json({ required: false });
  }

  const { success: withinLimit } = await rateLimiter.limit(user.id);
  if (!withinLimit) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

  const cookieStore = await cookies();
  const { NETWORK_PASSPHRASE } = getStellarConfigForNetwork(networkFromCookie(cookieStore));
  const challenge = buildLinkChallenge(walletAddress, NETWORK_PASSPHRASE);

  try {
    // Wrapped in an object: Upstash parses stored strings as JSON, and a hash
    // made only of digits would come back as a number.
    await redis.set(
      linkChallengeKey(user.id, walletAddress),
      { hash: challenge.hash },
      { ex: LINK_CHALLENGE_TTL_SECONDS }
    );
  } catch {
    // Without the stored hash no signature could ever be checked: fail closed.
    return NextResponse.json(
      { error: 'Linking is unavailable right now. Please try again.' },
      { status: 503 }
    );
  }

  return NextResponse.json({
    required: true,
    challengeXdr: challenge.xdr,
    networkPassphrase: NETWORK_PASSPHRASE,
  });
});
