import { j } from '@/utils/http';
import { prisma } from '@/lib/prisma';
import { withAuth } from '@/lib/with-auth';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * GET /api/mgi/transactions
 *
 * The user's MoneyGram transactions from OUR database (rows are written by the
 * sep24 deposit/withdraw routes at initiation; statuses are reported back by
 * clients after they fetch fresh state from MoneyGram). No SEP-10 token needed
 * — this is what the activity feed and pending banner render from, so history
 * stays visible without a passkey ceremony. MoneyGram remains the source of
 * truth; `updatedAt` says how fresh a row is.
 */
export const GET = withAuth(async (req: Request, { user }) => {
  try {
    const transactions = await prisma.moneyGramTransaction.findMany({
      where: { supabaseUid: user.id },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    return NextResponse.json({ transactions });
  } catch (e: any) {
    return j(500, { error: e?.message || 'Server error' });
  }
});
