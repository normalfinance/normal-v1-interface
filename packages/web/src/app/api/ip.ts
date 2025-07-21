// pages/api/ip.ts

import type { NextRequest } from 'next/server';

import { NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    console.log(request.headers.get('x-forwarded-for'))
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0] || '';
    // const ip = request.headers['x-forwarded-for']?.split(',')[0] || req.socket.remoteAddress;
    // res.status(200).json({ ip });

    return NextResponse.json({ ip });
  } catch (error) {
    console.error('Error fetching IP address:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
