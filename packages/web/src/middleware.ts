import type { NextRequest } from 'next/server';

import { NextResponse } from 'next/server';
import { captureException } from '@sentry/nextjs';

const BLOCKED_COUNTRIES = new Set([
  'AG', // Antigua and Barbuda
  'DZ', // Algeria
  'BD', // Bangladesh
  'BO', // Bolivia
  'BY', // Belarus
  'BI', // Burundi
  'MM', // Burma (Myanmar)
  'CI', // Cote D'Ivoire (Ivory Coast)
  'UA', // Crimea and Sevastopol (part of Ukraine, used for Crimea sanction handling)
  'CU', // Cuba
  'CD', // Democratic Republic of Congo
  'EC', // Ecuador
  'IR', // Iran
  'IQ', // Iraq
  'LR', // Liberia
  'LY', // Libya
  'RU', // Russia (Magnitsky sanctions)
  'ML', // Mali
  'MA', // Morocco
  'NP', // Nepal
  'KP', // North Korea
  'SO', // Somalia
  'SD', // Sudan
  'SY', // Syria
  'VE', // Venezuela
  'YE', // Yemen
  'ZW', // Zimbabwe
  // 'US', // United States (commented out for dev)
]);

// Referral tracking constants
const REFERRAL_COOKIE_NAME = 'referral_code';
const REFERRAL_TIMESTAMP_COOKIE_NAME = 'referral_timestamp';
const REFERRAL_PARAM_NAMES = ['ref', 'referral', 'referrer', 'invite'];

async function lookup(ip: string) {
  //   Always include the scheme (https) to avoid 403s
  const endpoint = process.env.GEOIP_ENDPOINT!;
  const key = process.env.GEOIP_KEY!;
  const url = `${endpoint.replace(/\/$/, '')}/${ip}?key=${key}`;

  console.log('[geo] url:', url);

  const res = await fetch(url, { next: { revalidate: 60 * 60 * 24 } }); // 24 h edge cache
  console.log('[geo] res:', res);
  if (!res.ok) throw new Error('Geo API failed');

  const data = await res.json();

  return {
    country: data.location?.country?.code, // "US", "IR"
    isVpn:
      data.security?.is_vpn ||
      data.security?.is_proxy ||
      data.security?.is_tor || // extra flag
      false,
  };
}

function handleReferralTracking(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const existingReferral = req.cookies.get(REFERRAL_COOKIE_NAME);

  // If user already has a referral, don't override it
  if (existingReferral) {
    return null;
  }

  // Check for referral parameters
  let referralCode: string | null = null;
  for (const param of REFERRAL_PARAM_NAMES) {
    const value = searchParams.get(param);
    if (value) {
      referralCode = value;
      break;
    }
  }

  // If no referral code found, return null
  if (!referralCode) {
    return null;
  }

  console.log('[referral] tracking referral code:', referralCode);

  // Create response with referral cookies
  const response = NextResponse.next();

  // Set referral code cookie (expires in 30 days)
  response.cookies.set(REFERRAL_COOKIE_NAME, referralCode, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  });

  // Set timestamp cookie for when referral was captured
  response.cookies.set(REFERRAL_TIMESTAMP_COOKIE_NAME, Date.now().toString(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  });

  return response;
}

export async function middleware(req: NextRequest) {
  console.log('[geo] MW hit:', req.nextUrl.pathname);

  // Handle referral tracking first
  const referralResponse = handleReferralTracking(req);

  let ip =
    req.headers.get('x-real-ip') || // many reverse proxies
    req.headers.get('X-Forwarded-For')?.split(',')[0] ||
    req.ip;

  console.log('[geo] incoming IP:', ip);

  if (process.env.NODE_ENV === 'development' && (ip === '::1' || ip === '127.0.0.1')) {
    ip = '8.8.8.8';
    console.log('[geo] using test IP:', ip);
  }

  if (!ip) {
    return referralResponse || NextResponse.next(); // local dev
  }

  try {
    const { country, isVpn } = await lookup(ip);
    console.log('[geo] lookup result:', country, 'vpn?', isVpn);

    if (isVpn || BLOCKED_COUNTRIES.has(country)) {
      const url = req.nextUrl.clone();
      url.pathname = '/blocked';
      url.search = '';
      return NextResponse.redirect(url);
    }
  } catch (e) {
    // If the API fails, default to *allow* so legit users aren't locked out
    console.error('Geo lookup error', e);
    captureException(e);
  }

  return referralResponse || NextResponse.next();
}

export const config = {
  matcher: ['/', '/((?!_next|assets|favicon.ico|blocked).*)'],
};
