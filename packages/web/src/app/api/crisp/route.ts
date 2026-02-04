import type { NextRequest } from 'next/server';

import crypto from 'crypto';
import { NextResponse } from 'next/server';
import { getAccessToken } from '@/utils/http';
import { getAuthenticatedUser } from '@/lib/createSupabaseServerClient';

export async function POST(request: NextRequest) {
  try {
    // Authenticate
    const token = getAccessToken(request);
    const user = await getAuthenticatedUser(token);

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

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
}
