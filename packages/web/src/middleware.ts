import type { NextRequest } from 'next/server';

import { NextResponse } from 'next/server';

const BLOCKED_COUNTRIES = new Set([
  'AG', // Antigua and Barbuda
  'DZ', // Algeria
  'BD', // Bangladesh
  'BO', // Bolivia
  'BY', // Belarus
  'BI', // Burundi
  'MM', // Burma (Myanmar)
  'CI', // Cote D’Ivoire (Ivory Coast)
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

export async function middleware(req: NextRequest) {
  console.log('[geo] MW hit:', req.nextUrl.pathname);
  let ip =
    req.headers.get('x-real-ip') || // many reverse proxies
    req.headers.get('X-Forwarded-For')?.split(',')[0] ||
    req.ip;

  console.log('[geo] incoming IP:', ip);

  if (process.env.NODE_ENV === 'development' && (ip === '::1' || ip === '127.0.0.1')) {
    ip = '8.8.8.8';
    console.log('[geo] using test IP:', ip);
  }

  if (!ip) return NextResponse.next(); // local dev

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
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/', '/((?!_next|assets|favicon.ico|blocked).*)'],
};
