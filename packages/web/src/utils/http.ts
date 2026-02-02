import type { NextRequest } from 'next/server';

export function getClientIP(request: NextRequest): string {
  const ip =
    request.headers.get('x-real-ip') ||
    request.headers.get('X-Forwarded-For')?.split(',')[0] ||
    request.ip ||
    'unknown';
  return ip;
}

export function getAccessToken(request: NextRequest | Request): string | undefined {
  const authHeader = request.headers.get('authorization');
  if (!authHeader) return undefined;
  return authHeader.split(' ')[1];
}
