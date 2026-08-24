import type { NextRequest } from 'next/server';
import type { ChainId, AddressField } from '@/lib/chains/registry';

import { prisma } from '@/lib/prisma';
import { withAuth } from '@/lib/with-auth';
import { NextResponse } from 'next/server';
import { logger } from '@normalfinance/utils';
import { turnkey } from '@/lib/turnkey/server';
import { CHAINS, CHAIN_IDS, isChainId, pickAddresses } from '@/lib/chains/registry';
import { isPrimaryWallet, defaultSeedLabel, seedAddressUpdate } from '@/lib/turnkey/wallet-seeds';

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

    // Is this the user's PRIMARY wallet? True for the wallet created at
    // signup, for a first-ever import (import-init leaves walletId ''), and
    // for every lazy chain-add, which re-syncs the same wallet.
    //
    // False means a SECOND seed arrived. Before doc 83 the row's walletId was
    // overwritten while address columns were only filled when empty, so the
    // row ended up describing two seeds at once — walletId from the imported
    // wallet, stellarAddress from the original — and the export dialog, which
    // picks by walletId, handed back a phrase that did not open the wallet on
    // screen. The primary row is now left completely alone in that case.
    const primary = isPrimaryWallet(row.walletId, walletId);
    if (!primary) {
      logger.log('[turnkey/import] Recording a SECOND wallet as a seed; primary row untouched', {
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

    // Every wallet is recorded here, primary or not — this table is the full
    // list, and it is what the export dialog reads so a phrase is always shown
    // with the addresses it actually controls. Best-effort: the table ships as
    // additive SQL, so a deployment where it has not been run yet must still
    // import wallets exactly as before.
    try {
      await prisma.turnkeyWalletSeed.upsert({
        where: { supabaseUid_walletId: { supabaseUid: user.id, walletId } },
        create: {
          supabaseUid: user.id,
          walletId,
          label: defaultSeedLabel(primary, derived.stellar),
          origin: primary ? 'created' : 'imported',
          isPrimary: primary,
          stellarAddress: derived.stellar,
          bitcoinAddress: derived.bitcoin,
          ethereumAddress: derived.ethereum,
          solanaAddress: derived.solana,
        },
        // A lazy chain-add re-syncs the same wallet with one more address, so
        // only overwrite fields we actually derived — never null one out.
        update: seedAddressUpdate(derived),
      });
    } catch (e) {
      logger.warn('[turnkey/import] Could not record wallet seed (migration pending?)', {
        uid: user.id.slice(0, 8),
        error: String((e as Error)?.message ?? e).slice(0, 120),
      });
    }

    // A second seed must NOT rewrite the primary row: that rewrite is the
    // whole defect. The imported wallet is recorded above and surfaces in the
    // UI in phase 2.
    if (!primary) {
      return NextResponse.json(
        { wallet: pickAddresses(row), stellarMatch, secondary: true, walletId },
        { status: 201 }
      );
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
