import type { NextRequest } from 'next/server';

import { NextResponse } from 'next/server';
// import { logger } from '@normalfinance/utils';

// const isDev = process.env.NODE_ENV === 'development';
const isDev = true;

export const logger = {
  log: isDev ? console.log : () => {},
  error: isDev ? console.error : () => {},
  warn: isDev ? console.warn : () => {},
  info: isDev ? console.info : () => {},
  debug: isDev ? console.debug : () => {},
};

// import PostHogClient from './lib/posthog';

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
]);

// Referral tracking constants
const REFERRAL_COOKIE_NAME = 'referral_code';
const REFERRAL_TIMESTAMP_COOKIE_NAME = 'referral_timestamp';
const REFERRAL_PARAM_NAMES = ['ref', 'referral', 'referrer', 'invite'];

// Geo caching constants
const GEO_CACHE_COOKIE_NAME = 'geo_data';
const GEO_TIMESTAMP_COOKIE_NAME = 'geo_timestamp';
const GEO_CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
const COOKIE_VERSION = '1.0';

// In-memory cache for request deduplication
const activeRequests = new Map<string, Promise<any>>();

interface GeoCacheData {
  country: string;
  isVpn: boolean;
  isDangerous: boolean;
  timestamp: number;
  version: string;
}

async function lookup(ip: string) {
  //   Always include the scheme (https) to avoid 403s
  const endpoint = process.env.GEOIP_ENDPOINT!;
  const key = process.env.GEOIP_KEY!;
  const url = `${endpoint.replace(/\/$/, '')}/${ip}?key=${key}`;

  logger.log('[API] Calling IPRegistry:', url);
  const fetchStart = Date.now();

  const res = await fetch(url, { next: { revalidate: 60 * 60 * 24 } }); // 24 h edge cache
  const fetchDuration = Date.now() - fetchStart;
  logger.log(`[API] Response status: ${res.status} (${fetchDuration}ms)`);
  if (!res.ok) throw new Error('Geo API failed');

  const data = await res.json();

  const isDangerous = data.security?.is_bogon || data.security?.is_threat || false;

  return {
    country: data.location?.country?.code, // "US", "IR"
    isVpn:
      data.security?.is_vpn ||
      data.security?.is_proxy ||
      data.security?.is_tor || // extra flag
      false,
    isDangerous,
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

  logger.log('[referral] tracking referral code:', referralCode);

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

function parseGeoCookie(cookieValue: string): GeoCacheData | null {
  try {
    const data = JSON.parse(decodeURIComponent(cookieValue));

    // Validate required fields and version
    if (
      typeof data.country === 'string' &&
      typeof data.isVpn === 'boolean' &&
      typeof data.isDangerous === 'boolean' &&
      typeof data.timestamp === 'number' &&
      data.version === COOKIE_VERSION
    ) {
      return data;
    }
  } catch (e) {
    logger.error('[geo] Failed to parse geo cookie:', e);
  }

  return null;
}

function isCacheValid(timestamp: number): boolean {
  return Date.now() - timestamp < GEO_CACHE_DURATION;
}

function setCacheResponse(response: NextResponse, geoData: any): void {
  const cacheData: GeoCacheData = {
    country: geoData.country,
    isVpn: geoData.isVpn,
    isDangerous: geoData.isDangerous,
    timestamp: Date.now(),
    version: COOKIE_VERSION,
  };

  response.cookies.set(GEO_CACHE_COOKIE_NAME, encodeURIComponent(JSON.stringify(cacheData)), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: GEO_CACHE_DURATION / 1000, // maxAge is in seconds
  });

  response.cookies.set(GEO_TIMESTAMP_COOKIE_NAME, Date.now().toString(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: GEO_CACHE_DURATION / 1000,
  });
}

export async function middleware(req: NextRequest) {
  const startTime = Date.now();
  const requestId = Math.random().toString(36).substring(7);
  console.log('request', req);
  logger.log(`\n[${requestId}] MIDDLEWARE START - Path: ${req.nextUrl.pathname}`);
  logger.log(`⏱[${requestId}] Start time: ${new Date().toISOString()}`);

  // Skip geo-blocking for mobile app requests
  if (req.headers.get('x-mobile-app') === 'true') {
    logger.log(`[${requestId}] Mobile app request, skipping geo-blocking`);
    return NextResponse.next();
  }

  // Handle referral tracking first
  logger.log(`[${requestId}] Handling referral tracking...`);
  // const referralResponse = handleReferralTracking(req);
  // if (referralResponse) {
  //   logger.log(`[${requestId}] Referral response created`);
  // }

  let ip =
    req.headers.get('x-real-ip') || // many reverse proxies
    req.headers.get('X-Forwarded-For')?.split(',')[0] ||
    req.ip;

  logger.log(`[${requestId}] Incoming IP: ${ip}`);
  logger.log(`[${requestId}] Active requests count: ${activeRequests.size}`);

  // Log active requests for debugging
  if (activeRequests.size > 0) {
    logger.log(`🔄 [${requestId}] Active IPs:`, Array.from(activeRequests.keys()));
  }

  if (process.env.NODE_ENV === 'development' && (ip === '::1' || ip === '127.0.0.1')) {
    ip = '8.8.8.8';
    logger.log(`[${requestId}] DEV MODE: Using test IP: ${ip}`);
  }

  if (!ip) {
    const duration = Date.now() - startTime;
    logger.log(`[${requestId}] No IP detected, skipping geo lookup (${duration}ms)`);
    return NextResponse.next();
  }

  // Check for cached geo data first
  // const cacheCheckStart = Date.now();
  // const geoCookie = req.cookies.get(GEO_CACHE_COOKIE_NAME);
  // let cachedGeoData: GeoCacheData | null = null;

  // logger.log(`[${requestId}] Checking cache... Cookie present: ${!!geoCookie?.value}`);

  // if (geoCookie?.value) {
  //   cachedGeoData = parseGeoCookie(geoCookie.value);

  //   if (cachedGeoData) {
  //     const cacheAge = Date.now() - cachedGeoData.timestamp;
  //     const isValid = isCacheValid(cachedGeoData.timestamp);

  //     logger.log(`[${requestId}] Cached data found:`);
  //     logger.log(`   • Country: ${cachedGeoData.country}`);
  //     logger.log(`   • VPN: ${cachedGeoData.isVpn}`);
  //     logger.log(`   • Dangerous: ${cachedGeoData.isDangerous}`);
  //     logger.log(
  //       `   • Age: ${Math.round(cacheAge / 1000)}s (${Math.round(cacheAge / (1000 * 60))}min)`
  //     );
  //     logger.log(`   • Valid: ${isValid}`);
  //     logger.log(`   • Version: ${cachedGeoData.version}`);

  //     if (isValid) {
  //       const cacheCheckDuration = Date.now() - cacheCheckStart;
  //       const totalDuration = Date.now() - startTime;

  //       logger.log(
  //         `[${requestId}] CACHE HIT! Using cached data (cache check: ${cacheCheckDuration}ms, total: ${totalDuration}ms)`
  //       );

  //       // Use cached data for blocking decisions
  //       if (BLOCKED_COUNTRIES.has(cachedGeoData.country) || cachedGeoData.isDangerous) {
  //         const blockReason = BLOCKED_COUNTRIES.has(cachedGeoData.country) ? 'country' : 'security';
  //         logger.log(`[${requestId}] BLOCKED via cache (${blockReason}): ${cachedGeoData.country}`);
  //         const url = req.nextUrl.clone();
  //         url.pathname = '/blocked';
  //         url.search = '';
  //         return NextResponse.redirect(url);
  //       }

  //       logger.log(`✅ [${requestId}] ALLOWED via cache - Request completed in ${totalDuration}ms`);
  //       return referralResponse || NextResponse.next();
  //     } else {
  //       logger.log(`❌ [${requestId}] Cache expired, will fetch fresh data`);
  //     }
  //   } else {
  //     logger.log(`❌ [${requestId}] Failed to parse cached data`);
  //   }
  // } else {
  //   logger.log(`❌ [${requestId}] No cache cookie found`);
  // }

  // Check for active request to prevent duplicate API calls
  // let lookupPromise = activeRequests.get(ip);
  // const apiStart = Date.now();

  // if (lookupPromise) {
  //   logger.log(`🔄 [${requestId}] DEDUPLICATION: Reusing active request for IP: ${ip}`);
  //   logger.log(`📊 [${requestId}] Total active requests: ${activeRequests.size}`);
  // } else {
  //   logger.log(`🌍 [${requestId}] CACHE MISS: Starting new API call for IP: ${ip}`);
  //   lookupPromise = lookup(ip);
  //   activeRequests.set(ip, lookupPromise);
  //   logger.log(`📈 [${requestId}] Active requests after adding: ${activeRequests.size}`);
  // }

  // try {
  //   const geoData = await lookupPromise;
  //   const apiDuration = Date.now() - apiStart;

  //   logger.log(`[${requestId}] API Response received (${apiDuration}ms):`);
  //   logger.log(`   • Country: ${geoData.country}`);
  //   logger.log(`   • VPN: ${geoData.isVpn}`);
  //   logger.log(`   • Dangerous: ${geoData.isDangerous}`);
  //   logger.log(`   • API call duration: ${apiDuration}ms`);

  //   // Create response object to set cookies
  //   const response = referralResponse || NextResponse.next();

  //   // Cache the geo data
  //   const cacheStart = Date.now();
  //   setCacheResponse(response, geoData);
  //   const cacheDuration = Date.now() - cacheStart;

  //   logger.log(`[${requestId}] Data cached successfully (${cacheDuration}ms)`);

  //   // Check for blocking conditions
  //   if (BLOCKED_COUNTRIES.has(geoData.country) || geoData.isDangerous) {
  //     const blockReason = BLOCKED_COUNTRIES.has(geoData.country) ? 'country' : 'security';
  //     const totalDuration = Date.now() - startTime;

  //     logger.log(
  //       `[${requestId}] BLOCKED via API (${blockReason}): ${geoData.country} - Total: ${totalDuration}ms`
  //     );

  //     const url = req.nextUrl.clone();
  //     url.pathname = '/blocked';
  //     url.search = '';
  //     return NextResponse.redirect(url);
  //   }

  //   const totalDuration = Date.now() - startTime;
  //   logger.log(`[${requestId}] ALLOWED via API - Total duration: ${totalDuration}ms`);

  //   return response;
  // } catch (e) {
  //   const apiDuration = Date.now() - apiStart;
  //   const totalDuration = Date.now() - startTime;

  //   logger.error(`[${requestId}] API ERROR after ${apiDuration}ms:`, e);

  //   // If we have stale cached data, use it as fallback
  //   if (cachedGeoData) {
  //     logger.log(`[${requestId}] Using stale cached data as fallback:`);
  //     logger.log(`   • Country: ${cachedGeoData.country}`);
  //     logger.log(`   • VPN: ${cachedGeoData.isVpn}`);
  //     logger.log(`   • Dangerous: ${cachedGeoData.isDangerous}`);

  //     if (BLOCKED_COUNTRIES.has(cachedGeoData.country) || cachedGeoData.isDangerous) {
  //       const blockReason = BLOCKED_COUNTRIES.has(cachedGeoData.country) ? 'country' : 'security';
  //       logger.log(
  //         `[${requestId}] BLOCKED via stale cache (${blockReason}): ${cachedGeoData.country}`
  //       );

  //       const url = req.nextUrl.clone();
  //       url.pathname = '/blocked';
  //       url.search = '';
  //       return NextResponse.redirect(url);
  //     }

  //     logger.log(`[${requestId}] ALLOWED via stale cache - Total: ${totalDuration}ms`);
  //   } else {
  //     logger.log(
  //       `[${requestId}] No cache fallback available, allowing by default - Total: ${totalDuration}ms`
  //     );
  //   }
  // } finally {
  //   // Clean up active request
  //   activeRequests.delete(ip);
  //   const remainingActive = activeRequests.size;
  //   logger.log(`[${requestId}] Cleaned up request. Remaining active: ${remainingActive}`);
  // }

  const totalDuration = Date.now() - startTime;
  logger.log(`[${requestId}] MIDDLEWARE END - Total duration: ${totalDuration}ms\n`);
  return NextResponse.next();
}

export const config = {
  matcher: [
    '/assets',
    '/assets/:path*',
    '/invest',
    '/earn',
    '/rewards',
    '/indexes',
    '/indexes/:path*',
    '/indexes/create',
    '/trx/:path*',
    '/api/:path*',
  ],
};
