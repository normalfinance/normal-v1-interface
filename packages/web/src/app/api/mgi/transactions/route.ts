import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { j, getAccessToken } from '@/utils/http';
import { getAuthenticatedUser } from '@/lib/createSupabaseServerClient';

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
export async function GET(req: Request) {
  try {
    const user = await getAuthenticatedUser(getAccessToken(req));
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const transactions = await prisma.moneyGramTransaction.findMany({
      where: { supabaseUid: user.id },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    return NextResponse.json({ transactions });
  } catch (e: any) {
    return j(500, { error: e?.message || 'Server error' });
  }
}
