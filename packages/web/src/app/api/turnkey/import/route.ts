import type { NextRequest } from 'next/server';
import type { ChainId, AddressField } from '@/lib/chains/registry';

import { prisma } from '@/lib/prisma';
import { withAuth } from '@/lib/with-auth';
import { NextResponse } from 'next/server';
import { logger } from '@normalfinance/utils';
import { turnkey } from '@/lib/turnkey/server';
import { CHAINS, CHAIN_IDS, isChainId, pickAddresses } from '@/lib/chains/registry';

// ---------------------------------------------------------------------------
// POST /api/turnkey/import
// Records a wallet import completed client-side (the import activities are
// stamped by the user's passkey in the browser).
//
// Body: { walletId, expectedStellarAddress? }
// The client only reports the walletId — we read the derived addresses
// straight from Turnkey (parent orgs have read access to sub-orgs), so a
// client can't write spoofed addresses into its row.
// ---------------------------------------------------------------------------
export const POST = withAuth(async (request: NextRequest, { user }) => {
  let body: { walletId?: string; expectedStellarAddress?: string; chain?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { walletId, expectedStellarAddress, chain } = body;
  if (!walletId) {
    return NextResponse.json({ error: 'Missing walletId' }, { status: 400 });
  }

  const row = await prisma.turnkeyWallet.findUnique({ where: { supabaseUid: user.id } });
  if (!row) {
    return NextResponse.json(
      { error: 'No import in progress — call import-init first' },
      { status: 409 }
    );
  }

  try {
    // Authoritative read of the imported wallet's accounts from Turnkey
    const { accounts } = await turnkey.apiClient().getWalletAccounts({
      organizationId: row.subOrgId,
      walletId,
    });

    const byFormat = (format: string) =>
      accounts.find((a) => a.addressFormat === format)?.address ?? null;

    // Address formats come from the registry, so a new chain is picked up here
    // without another line being added.
    const derived = Object.fromEntries(
      CHAIN_IDS.map((id) => [id, byFormat(CHAINS[id].turnkeyAddressFormat)])
    ) as Record<ChainId, string | null>;

    const bitcoinAddress = derived.bitcoin;
    const stellarAddress = derived.stellar;

    // `chain` arrives from the request body as a plain string — narrow it
    // through the registry before using it as a key.
    const requestedChain = chain && isChainId(chain) ? chain : null;

    // This guard belongs to the IMPORT case only: a mnemonic import must land
    // on a wallet we recognise. A LAZY CHAIN ADD must NOT be held to it —
    // a wallet legitimately holds only SOL (or only ETH) when the user
    // onboarded on that asset, and rejecting the sync there would strand the
    // account Turnkey had just created, exactly the dead end fixed in
    // addWalletAccounts. The lazy branch below has the right check: does the
    // REQUESTED chain's address exist.
    if (!requestedChain && !stellarAddress && !bitcoinAddress) {
      return NextResponse.json(
        { error: 'Imported wallet has no recognizable accounts' },
        { status: 422 }
      );
    }

    // Both our local derivation and Turnkey's XLM account use the standard
    // SEP-0005 path m/44'/148'/0', so a mismatch here means a bug — surface
    // it rather than silently routing signing to the wrong key.
    const stellarMatch = expectedStellarAddress ? stellarAddress === expectedStellarAddress : true;
    if (!stellarMatch) {
      logger.error('[turnkey/import] Stellar address mismatch after import', {
        uid: user.id.slice(0, 8),
        expected: expectedStellarAddress,
        derived: stellarAddress,
      });
    }

    if (row.walletId && row.walletId !== walletId) {
      logger.warn('[turnkey/import] Replacing existing wallet reference with imported wallet', {
        uid: user.id.slice(0, 8),
      });
    }

    // Address writes are ADDITIVE and chain-scoped so adding one chain can
    // never clobber another (chains may live on different seeds — e.g. a
    // reattached BTC address). Two modes:
    //   - chain provided (lazy add)  → write ONLY that chain's column
    //   - chain absent (first import) → fill only columns still empty
    const columnFor = Object.fromEntries(
      CHAIN_IDS.map((id) => [id, CHAINS[id].addressField])
    ) as Record<ChainId, AddressField>;

    const data: Record<string, string> = { walletId };
    if (requestedChain) {
      const addr = derived[requestedChain];
      if (!addr) {
        return NextResponse.json({ error: `Wallet has no ${chain} account` }, { status: 422 });
      }
      data[columnFor[requestedChain]] = addr;
    } else {
      // Genuine import — only fill empty columns, never overwrite an
      // already-linked (possibly reattached) address.
      for (const id of CHAIN_IDS) {
        const col = columnFor[id];
        const addr = derived[id];
        if (addr && !row[col]) data[col] = addr;
      }
    }

    const saved = await prisma.turnkeyWallet.update({
      where: { supabaseUid: user.id },
      data,
    });

    logger.log('[turnkey/import] Imported wallet recorded', { uid: user.id.slice(0, 8) });

    return NextResponse.json(
      {
        wallet: pickAddresses(saved),
        stellarMatch,
      },
      { status: 201 }
    );
  } catch (error) {
    logger.error('[turnkey/import] Error recording wallet import:', error);
    const detail = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: `Failed to import wallet: ${detail}` }, { status: 500 });
  }
});
