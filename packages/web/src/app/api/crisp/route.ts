import type { NextRequest } from 'next/server';

import crypto from 'crypto';
import { withAuth } from '@/lib/with-auth';
import { NextResponse } from 'next/server';

export const POST = withAuth(async (request: NextRequest, { user }) => {
  try {
    // Authenticate

    const secretKey = process.env.CRISP_SECRET_KEY;

    if (!secretKey) {
      throw 'Invalid secret key';
    }

    if (!user.email) {
      return NextResponse.json({ error: 'User has no email' }, { status: 404 });
    }

    const signature = crypto.createHmac('sha256', secretKey).update(user.email).digest('hex');

    return NextResponse.json({ signature });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Crisp signature failed' },
      { status: 500 }
    );
  }
});
