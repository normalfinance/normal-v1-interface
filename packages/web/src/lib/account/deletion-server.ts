import type { NetworkType } from '@normalfinance/utils';

import { prisma } from '@/lib/prisma';
import { createHash } from 'node:crypto';
import { turnkey } from '@/lib/turnkey/server';
import { constants } from '@normalfinance/utils';
import { createClient } from '@supabase/supabase-js';
import { withRateLimitRetry } from '@/server/defindex';
import { PENDING_MGI_STATUSES } from '@/lib/mgi/statuses';
import { DefindexSDK, SupportedNetworks } from '@defindex/sdk';
import { aggregatePortfolio } from '@/lib/portfolio/aggregate';
import { TERMINAL_STATUSES as RAMP_TERMINAL } from '@/lib/ramp/status';
import {
  CCTP_TERMINAL,
  type HeldBalance,
  anonymousOwnerKey,
  turnkeyTimestampMs,
  type ExportActivity,
  type InFlightCounts,
} from '@/lib/account/deletion-policy';

// ---------------------------------------------------------------------------
// Account deletion — the side-effecting half. Each function does ONE thing the
// route composes; none of them decides policy (that is deletion-policy.ts).
// ---------------------------------------------------------------------------

export interface WalletFacts {
  subOrgId: string | null;
  walletIds: string[];
  addresses: {
    stellar: string | null;
    bitcoin: string | null;
    ethereum: string | null;
    solana: string | null;
  };
  stellarAddresses: string[]; // every Stellar address tied to the user (seeds + linked)
}

export async function loadWalletFacts(supabaseUid: string): Promise<WalletFacts> {
  const [primary, seeds, linked] = await Promise.all([
    prisma.turnkeyWallet.findFirst({ where: { supabaseUid } }),
    // Same order as GET /api/turnkey/wallets so the app's per-seed labels line up
    // with the `wallets` array in an EXPORT_REQUIRED reply.
    prisma.turnkeyWalletSeed
      .findMany({ where: { supabaseUid }, orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }] })
      .catch(() => []),
    prisma.linkedWallet.findMany({ where: { supabaseUid }, select: { walletAddress: true } }),
  ]);
  const walletIds = new Set<string>();
  for (const s of seeds) if (s.walletId) walletIds.add(s.walletId);
  // No seed rows (migration pending or wallet predates it): the primary row
  // is the one wallet, exactly as the wallets route falls back.
  if (walletIds.size === 0 && primary?.walletId) walletIds.add(primary.walletId);
  const stellar = new Set<string>();
  if (primary?.stellarAddress) stellar.add(primary.stellarAddress);
  for (const s of seeds) if (s.stellarAddress) stellar.add(s.stellarAddress);
  for (const l of linked) stellar.add(l.walletAddress);
  return {
    subOrgId: primary?.subOrgId ?? null,
    walletIds: [...walletIds],
    addresses: {
      stellar: primary?.stellarAddress ?? null,
      bitcoin: primary?.bitcoinAddress ?? null,
      ethereum: primary?.ethereumAddress ?? null,
      solana: primary?.solanaAddress ?? null,
    },
    stellarAddresses: [...stellar],
  };
}

/** Completed EXPORT_WALLET activities in the user's sub-org (newest 100). */
export async function listExportActivities(subOrgId: string): Promise<ExportActivity[]> {
  const { activities } = await turnkey.apiClient().getActivities({
    organizationId: subOrgId,
    filterByType: ['ACTIVITY_TYPE_EXPORT_WALLET'],
    paginationOptions: { limit: '100' },
  });
  return activities
    .map((a) => ({
      walletId: String(a.intent?.exportWalletIntent?.walletId ?? ''),
      status: String(a.status),
      createdAtMs: turnkeyTimestampMs(a.createdAt),
    }))
    .filter((a) => a.walletId);
}

export async function countInFlight(supabaseUid: string): Promise<InFlightCounts> {
  const [cctp, ramp, moneygram] = await Promise.all([
    prisma.cctpTransfer.count({
      where: { userId: supabaseUid, status: { notIn: [...CCTP_TERMINAL] } },
    }),
    prisma.rampTransfer.count({
      where: { supabaseUid, status: { notIn: [...RAMP_TERMINAL] } },
    }),
    prisma.moneyGramTransaction.count({
      where: { supabaseUid, status: { in: [...PENDING_MGI_STATUSES] } },
    }),
  ]);
  return { cctp, ramp, moneygram };
}

/** Live balances for every address the user controls, plus the savings
 *  position. A source that cannot be read yields balance: null. */
export async function readHeldBalances(
  facts: WalletFacts,
  network: NetworkType
): Promise<HeldBalance[]> {
  const out: HeldBalance[] = [];
  const hasAny = Object.values(facts.addresses).some(Boolean);
  if (hasAny) {
    try {
      const payload = await aggregatePortfolio(facts.addresses, network, Date.now());
      for (const a of payload.assets) {
        if (!a.address) continue; // chain never set up — nothing can be there
        out.push({
          symbol: a.symbol,
          chain: a.chain,
          balance: a.balance === null ? null : Number(a.balance),
        });
      }
    } catch {
      for (const [chain, address] of Object.entries(facts.addresses)) {
        if (address) out.push({ symbol: chain.toUpperCase(), chain, balance: null });
      }
    }
  }
  // Savings: every Stellar address could hold a vault position (hybrid users
  // keep savings in an external wallet).
  const vault =
    network === 'mainnet'
      ? process.env.NEXT_PUBLIC_MAINNET_DEFINDEX_VAULT
      : process.env.NEXT_PUBLIC_TESTNET_DEFINDEX_VAULT;
  if (vault && facts.stellarAddresses.length) {
    const sdk = new DefindexSDK({
      apiKey: process.env.DEFINDEX_API_KEY,
      defaultNetwork: network === 'mainnet' ? SupportedNetworks.MAINNET : SupportedNetworks.TESTNET,
    });
    for (const address of facts.stellarAddresses) {
      try {
        const b: any = await withRateLimitRetry(
          () => sdk.getVaultBalance(vault, address),
          'account-delete:getVaultBalance'
        );
        const raw = Array.isArray(b?.underlyingBalance)
          ? b.underlyingBalance.reduce((s: number, v: unknown) => s + (Number(v) || 0), 0)
          : Number(b?.underlyingBalance) || 0;
        out.push({ symbol: 'SAVINGS_USDC', chain: 'stellar', balance: raw / 1e7 });
      } catch {
        out.push({ symbol: 'SAVINGS_USDC', chain: 'stellar', balance: null });
      }
    }
  }
  return out;
}

/** Everything personal goes; money history keeps an unlinkable owner key.
 *  One transaction: either the whole account is gone or none of it is. */
export async function purgeAccountRows(supabaseUid: string, facts: WalletFacts) {
  const anon = anonymousOwnerKey(
    supabaseUid,
    createHash('sha256').update(supabaseUid).digest('hex')
  );
  const stellarAddrs = facts.stellarAddresses;
  return prisma.$transaction(async (tx) => {
    // Referral graph is keyed by the users table (walletAddress), not the uid.
    const users = stellarAddrs.length
      ? await tx.user.findMany({
          where: { walletAddress: { in: stellarAddrs } },
          select: { id: true },
        })
      : [];
    const userIds = users.map((u) => u.id);
    if (userIds.length) {
      await tx.referralAction.deleteMany({ where: { userId: { in: userIds } } });
      await tx.referralAction.deleteMany({
        where: {
          referral: { OR: [{ referrerId: { in: userIds } }, { refereeId: { in: userIds } }] },
        },
      });
      await tx.referral.deleteMany({
        where: { OR: [{ referrerId: { in: userIds } }, { refereeId: { in: userIds } }] },
      });
      await tx.user.deleteMany({ where: { id: { in: userIds } } });
    }
    const [pushDevices, fills, linked, enrollments, seeds, wallets] = await Promise.all([
      tx.pushDevice.deleteMany({ where: { supabaseUid } }),
      tx.offrampFill.deleteMany({ where: { supabaseUid } }),
      tx.linkedWallet.deleteMany({ where: { supabaseUid } }),
      tx.turnkeyEnrollment.deleteMany({ where: { supabaseUid } }).catch(() => ({ count: 0 })),
      tx.turnkeyWalletSeed.deleteMany({ where: { supabaseUid } }).catch(() => ({ count: 0 })),
      tx.turnkeyWallet.deleteMany({ where: { supabaseUid } }),
    ]);
    const [cctp, ramp, mgi] = await Promise.all([
      tx.cctpTransfer.updateMany({ where: { userId: supabaseUid }, data: { userId: anon } }),
      tx.rampTransfer.updateMany({ where: { supabaseUid }, data: { supabaseUid: anon } }),
      tx.moneyGramTransaction.updateMany({ where: { supabaseUid }, data: { supabaseUid: anon } }),
    ]);
    return {
      deleted: {
        users: userIds.length,
        pushDevices: pushDevices.count,
        offrampFills: fills.count,
        linkedWallets: linked.count,
        enrollments: enrollments.count,
        walletSeeds: seeds.count,
        wallets: wallets.count,
      },
      anonymised: { cctpTransfers: cctp.count, rampTransfers: ramp.count, moneygram: mgi.count },
    };
  });
}

/** Remove the person from Customer.io (marketing). Best effort. */
export async function deleteMarketingProfile(supabaseUid: string): Promise<void> {
  const siteId = process.env.CUSTOMERIO_SITE_ID;
  const apiKey = process.env.CUSTOMERIO_API_KEY;
  if (!siteId || !apiKey) return;
  try {
    await fetch('https://track.customer.io/api/v2/entity', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Basic ${Buffer.from(`${siteId}:${apiKey}`).toString('base64')}`,
      },
      body: JSON.stringify({ type: 'person', identifiers: { id: supabaseUid }, action: 'delete' }),
      signal: AbortSignal.timeout(8000),
    });
  } catch {
    /* marketing cleanup is best effort; the auth user is still deleted */
  }
}

/** The last step: the Supabase auth user. Needs the service-role key. */
/** Checked BEFORE any row is touched: a deployment without the service-role
 *  key must refuse up front, never delete the rows and then fail the login.
 *  (Staging 2026-10-13: rows gone, login survived — this is the guard.) */
/** The Supabase URL the SAME way every other server client resolves it
 *  (createSupabaseServerClient): the deployment's network picks the TESTNET or
 *  MAINNET variable, with NEXT_PUBLIC_SUPABASE_URL as the legacy fallback.
 *  Staging only has the TESTNET-named variable set (one shared project), so
 *  reading MAINNET alone failed there (2026-10-13). */
function supabaseUrl(): string {
  return constants.getNetworkConfig(
    process.env.NEXT_PUBLIC_TESTNET_SUPABASE_URL ?? '',
    process.env.NEXT_PUBLIC_MAINNET_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || ''
  );
}

export function authDeleteConfigured(): boolean {
  return Boolean(supabaseUrl() && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

export async function deleteAuthUser(supabaseUid: string): Promise<void> {
  const url = supabaseUrl();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Supabase URL / SUPABASE_SERVICE_ROLE_KEY not configured');
  const admin = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  // Three attempts: this is the step that turns "data removed" into "account
  // gone", and a transient GoTrue blip must not leave a login behind.
  let last: string = '';
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    const { error } = await admin.auth.admin.deleteUser(supabaseUid);
    if (!error) return;
    last = error.message;
    // Already gone (a retry after a partial run) counts as success.
    if (/not found|does not exist/i.test(last)) return;
    if (attempt < 3) await new Promise((r) => setTimeout(r, 700 * attempt));
  }
  throw new Error(`auth delete failed: ${last}`);
}
