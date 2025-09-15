import type { NextRequest } from 'next/server';

import { NextResponse } from 'next/server';
import { constants } from '@normalfinance/utils';
import { InviteCodeService } from '@/lib/invite-code-service';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const walletAddress = searchParams.get('walletAddress');

    // If checking for a specific wallet address
    if (walletAddress) {
      const walletInviteCode = await InviteCodeService.getWalletInviteCode(walletAddress);

      return NextResponse.json({
        hasUsedCode: !!walletInviteCode,
        inviteCode: walletInviteCode?.inviteCode || null,
        usedAt: walletInviteCode?.usedAt || null,
      });
    }

    // If checking a specific code
    if (!code) {
      return NextResponse.json(
        { error: 'Invite code or wallet address is required' },
        { status: 400 }
      );
    }

    const result = await InviteCodeService.verifyInviteCode(code);

    return NextResponse.json(result);
  } catch (error) {
    const network = constants.getNetworkDisplayName();
    console.error(`GET /api/invite-codes error (${network}):`, error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { inviteCode, action, walletAddress } = body;

    if (!inviteCode) {
      return NextResponse.json({ error: 'Invite code is required' }, { status: 400 });
    }

    if (action === 'verify') {
      // Just verify the code without consuming it
      const result = await InviteCodeService.verifyInviteCode(inviteCode);
      return NextResponse.json(result);
    } else if (action === 'consume') {
      // Consume the code and mark it as used
      const result = await InviteCodeService.consumeInviteCode(inviteCode, walletAddress);
      return NextResponse.json(result);
    } else {
      // Default action is to verify and consume in one step
      const verification = await InviteCodeService.verifyInviteCode(inviteCode);

      if (!verification.isValid) {
        return NextResponse.json(verification, { status: 400 });
      }

      const result = await InviteCodeService.consumeInviteCode(inviteCode, walletAddress);

      return NextResponse.json(result);
    }
  } catch (error) {
    const network = constants.getNetworkDisplayName();
    console.error(`POST /api/invite-codes error (${network}):`, error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
