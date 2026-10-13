import type { NextRequest } from 'next/server';

import { cookies } from 'next/headers';
import { withAuth } from '@/lib/with-auth';
import { NextResponse } from 'next/server';
import { networkFromCookie } from '@/server/network-cookie';
import { hasInFlight, fundsVerdict, walletsMissingExport } from '@/lib/account/deletion-policy';
import {
  countInFlight,
  deleteAuthUser,
  loadWalletFacts,
  purgeAccountRows,
  readHeldBalances,
  authDeleteConfigured,
  listExportActivities,
  deleteMarketingProfile,
} from '@/lib/account/deletion-server';

// ---------------------------------------------------------------------------
// DELETE /api/account — delete the caller's Normal account (App Store 5.1.1(v)).
//
// Body: { confirm: 'DELETE', override?: boolean, dryRun?: boolean }
//   dryRun: run every gate and report, delete nothing (for the app's checklist).
//
// Responses (all JSON):
//   200 { success: true, deleted, anonymised }             — done; the session is now invalid
//   200 { success: true, dryRun: true, ok: true }           — all gates pass
//   400 { error, code: 'CONFIRM' }                          — confirm !== 'DELETE'
//   409 { error, code: 'EXPORT_REQUIRED', wallets: [...] }  — export the phrase first (never overridable)
//   409 { error, code: 'IN_FLIGHT', counts }                — money mid-transit (never overridable)
//   409 { error, code: 'FUNDS_PRESENT', balances, unreadable } — unless override: true
//   503 { error, code: 'UNAVAILABLE' }                      — a check could not run, or this deployment lacks the service-role key; nothing deleted
//   503 { error, code: 'AUTH_DELETE_FAILED', deleted, anonymised } — rows removed, login survived; sign in and retry (idempotent)
//
// The Turnkey sub-organization and passkeys are NOT deleted: funds are
// self-custodial and the recovery phrase the user just exported restores them
// in any wallet. Deleting the sub-org would turn "I closed my account" into
// "I lost my money".
// ---------------------------------------------------------------------------

export const dynamic = 'force-dynamic';

export const DELETE = withAuth(async (req: NextRequest, { user }) => {
  const body = await req.json().catch(() => ({}));
  if (String(body?.confirm ?? '') !== 'DELETE') {
    return NextResponse.json({ error: 'Type DELETE to confirm', code: 'CONFIRM' }, { status: 400 });
  }
  const override = body?.override === true;
  const dryRun = body?.dryRun === true;
  const uid = user.id;
  const network = networkFromCookie(await cookies());

  const facts = await loadWalletFacts(uid);

  // Gate 1: the recovery phrase. Server-verified through Turnkey's activity
  // log — the client cannot fake a completed EXPORT_WALLET.
  if (facts.subOrgId && facts.walletIds.length) {
    let missing: string[];
    try {
      missing = walletsMissingExport(facts.walletIds, await listExportActivities(facts.subOrgId));
    } catch (e: any) {
      console.error('[account/delete] export check failed:', e?.message ?? e);
      return NextResponse.json(
        {
          error: 'Could not verify your recovery-phrase export. Try again in a moment.',
          code: 'UNAVAILABLE',
        },
        { status: 503 }
      );
    }
    if (missing.length) {
      return NextResponse.json(
        {
          error:
            'Export your recovery phrase first. It is the only way to reach your funds after the account is deleted.',
          code: 'EXPORT_REQUIRED',
          wallets: missing,
        },
        { status: 409 }
      );
    }
  }

  // Gate 2: nothing mid-transit.
  const counts = await countInFlight(uid);
  if (hasInFlight(counts)) {
    return NextResponse.json(
      {
        error:
          'A swap, purchase or cash-out is still in progress. Wait for it to finish, then try again.',
        code: 'IN_FLIGHT',
        counts,
      },
      { status: 409 }
    );
  }

  // Gate 3: funds. Overridable — but an unreadable balance is never "zero".
  const balances = await readHeldBalances(facts, network);
  const verdict = fundsVerdict(balances);
  if (verdict.unreadable.length && !override) {
    return NextResponse.json(
      {
        error: 'Some balances could not be checked right now. Try again in a moment.',
        code: 'UNAVAILABLE',
        unreadable: verdict.unreadable,
      },
      { status: 503 }
    );
  }
  if (verdict.present.length && !override) {
    return NextResponse.json(
      {
        error:
          'Your wallet still holds funds. Withdraw them, or confirm that only your recovery phrase will reach them from now on.',
        code: 'FUNDS_PRESENT',
        balances: verdict.present,
        unreadable: verdict.unreadable,
      },
      { status: 409 }
    );
  }

  if (dryRun) {
    return NextResponse.json({ success: true, dryRun: true, ok: true, balances: verdict.present });
  }

  // Refuse before touching anything if this deployment cannot finish the job
  // (staging 2026-10-13: rows were purged, then the login survived because the
  // service-role key was not set on that environment).
  if (!authDeleteConfigured()) {
    console.error('[account/delete] SUPABASE_SERVICE_ROLE_KEY / MAINNET_SUPABASE_URL missing');
    return NextResponse.json(
      { error: 'Account deletion is not available in this environment.', code: 'UNAVAILABLE' },
      { status: 503 }
    );
  }

  // Point of no return. Rows first (one transaction), marketing, then the auth
  // user last. The route is idempotent: a retry after a partial run finds no
  // rows, passes every gate trivially and deletes the login.
  let result: Awaited<ReturnType<typeof purgeAccountRows>>;
  try {
    result = await purgeAccountRows(uid, facts);
  } catch (e: any) {
    console.error('[account/delete] purge failed (nothing deleted):', e?.message ?? e);
    return NextResponse.json(
      {
        error: 'Deletion did not complete. Nothing was removed — please try again.',
        code: 'UNAVAILABLE',
      },
      { status: 503 }
    );
  }
  await deleteMarketingProfile(uid);
  try {
    await deleteAuthUser(uid);
  } catch (e: any) {
    console.error('[account/delete] AUTH DELETE FAILED after purge', {
      uid: uid.slice(0, 8),
      err: e?.message ?? e,
    });
    return NextResponse.json(
      {
        error:
          'Your data was removed, but your login could not be deleted. Sign in and try again to finish.',
        code: 'AUTH_DELETE_FAILED',
        ...result,
      },
      { status: 503 }
    );
  }
  console.log('[account/delete] deleted', { uid: uid.slice(0, 8), ...result });
  return NextResponse.json({ success: true, ...result });
});
