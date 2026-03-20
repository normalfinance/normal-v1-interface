import type { NextRequest } from 'next/server';

import { NextResponse } from 'next/server';
import { logger } from '@normalfinance/utils';
import { getAccessToken } from '@/utils/http';
import { getAuthenticatedUser } from '@/lib/createSupabaseServerClient';
import { getTransitPublicKey } from '@/lib/transit-encryption';

export async function GET(request: NextRequest) {
  try {
    const token = getAccessToken(request);
    const user = await getAuthenticatedUser(token);

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const publicKey = getTransitPublicKey();

    return NextResponse.json({ publicKey });
  } catch (error) {
    logger.error('[API /user/transit-public-key] Error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
