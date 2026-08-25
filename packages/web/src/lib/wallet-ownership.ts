import { prisma } from '@/lib/prisma';

// ---------------------------------------------------------------------------
// Does this authenticated user actually own the wallet they're claiming?
//
// Authentication alone is not enough for the transaction-log routes. The
// wallet address arrives in the request body, which is attacker-controlled, so
// without this check any logged-in user could write swap/deposit rows against
// someone else's address — and those rows feed both the public Dune dashboard
// and `totalDeposited`, which users read as their money.
//
// Two legitimate sources of ownership:
//   - linked_wallets   — wallets the user connected themselves
//   - turnkey_wallets  — the Stellar wallet we provisioned for them
//
// Shared so both routes enforce the same rule rather than each growing its own
// slightly different version. See docs/audit/41-block-c-plan.md.
// ---------------------------------------------------------------------------

export async function userOwnsWallet(supabaseUid: string, walletAddress: string): Promise<boolean> {
  if (!supabaseUid || !walletAddress) return false;

  const [linked, turnkey] = await Promise.all([
    prisma.linkedWallet.findUnique({
      where: { supabaseUid_walletAddress: { supabaseUid, walletAddress } },
      select: { id: true },
    }),
    prisma.turnkeyWallet.findFirst({
      where: { supabaseUid, stellarAddress: walletAddress },
      select: { id: true },
    }),
  ]);

  return !!linked || !!turnkey;
}

/** Ownership across EVERY chain we hold addresses for (doc 89 F2): the ramp
 *  routes accept a walletAddress that may be Stellar, Bitcoin, Ethereum or
 *  Solana — userOwnsWallet above is Stellar-shaped (linked wallets are
 *  Stellar-only), so this widens the check to the Turnkey wallet's chain
 *  columns and the seed list, plus linked wallets for Stellar. Same failure
 *  stance: any lookup error reads as NOT owned.
 */
export async function userOwnsAnyWalletAddress(
  supabaseUid: string,
  walletAddress: string
): Promise<boolean> {
  if (!supabaseUid || !walletAddress) return false;
  try {
    const [linked, turnkey, seed] = await Promise.all([
      prisma.linkedWallet.findUnique({
        where: { supabaseUid_walletAddress: { supabaseUid, walletAddress } },
        select: { id: true },
      }),
      prisma.turnkeyWallet.findFirst({
        where: {
          supabaseUid,
          OR: [
            { stellarAddress: walletAddress },
            { bitcoinAddress: walletAddress },
            { ethereumAddress: walletAddress },
            { solanaAddress: walletAddress },
          ],
        },
        select: { id: true },
      }),
      prisma.turnkeyWalletSeed
        .findFirst({
          where: {
            supabaseUid,
            OR: [
              { stellarAddress: walletAddress },
              { bitcoinAddress: walletAddress },
              { ethereumAddress: walletAddress },
              { solanaAddress: walletAddress },
            ],
          },
          select: { id: true },
        })
        .catch(() => null), // seed table is additive SQL — absence must not block
    ]);
    return !!linked || !!turnkey || !!seed;
  } catch {
    return false;
  }
}
