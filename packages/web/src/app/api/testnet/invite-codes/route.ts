import { NextRequest, NextResponse } from 'next/server';
import { InviteCodeService } from '@/lib/invite-code-service';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');

    if (!code) {
      return NextResponse.json({ error: 'Invite code is required' }, { status: 400 });
    }

    const result = await InviteCodeService.verifyInviteCode(code);

    return NextResponse.json(result);
  } catch (error) {
    console.error('GET /api/testnet/invite-codes error:', error);
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
    console.error('POST /api/testnet/invite-codes error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
