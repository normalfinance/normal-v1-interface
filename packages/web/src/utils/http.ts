import type { NextRequest, NextResponse, type NextRequest } from 'next/server';

import { supabase } from '@/lib/createSupabaseClient';

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

export function j(status: number, payload: any) {
  return NextResponse.json(payload, { status });
}

export async function buildAuthHeaders(): Promise<HeadersInit> {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };

  if (session?.access_token) {
    headers.Authorization = `Bearer ${session.access_token}`;
  }

  return headers;
}
