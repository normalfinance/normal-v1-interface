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
