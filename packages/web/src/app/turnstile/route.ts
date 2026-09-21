import type { NextRequest } from 'next/server';

import { buildTurnstilePage } from '@/lib/turnstile-page';

// ---------------------------------------------------------------------------
// GET /turnstile — public, unauthenticated, no layout.
//
// The mobile app loads this in a WebView to obtain a Cloudflare Turnstile
// token, then passes it as `options.captchaToken` to Supabase auth calls,
// exactly as the web modals do (src/services/auth.ts). Same site key as the
// web widget (NEXT_PUBLIC_TURNSTILE_SITE_KEY). Why a route handler and not a
// page: src/lib/turnstile-page.ts.
//
// Query: ?theme=light|dark|auto  ?appearance=always|execute|interaction-only
// Emits (ReactNativeWebView.postMessage + parent.postMessage):
//   { type: 'turnstile', token }  |  { type: 'turnstile-error', reason }
//
// Public on purpose: there is nothing to protect (a site key is already in
// the web bundle) and the token itself is single-use and bound to the
// hostname by Cloudflare. NOT under /api, so withAuth conformance does not
// apply; noindex via meta + header.
// ---------------------------------------------------------------------------
export const dynamic = 'force-dynamic';

export function GET(request: NextRequest): Response {
  const q = request.nextUrl.searchParams;
  const html = buildTurnstilePage({
    siteKey: process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? '',
    theme: q.get('theme'),
    appearance: q.get('appearance'),
    // Optional return-by-navigation target; only the app scheme is honoured.
    redirect: q.get('redirect'),
  });
  return new Response(html, {
    status: 200,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Robots-Tag': 'noindex, nofollow',
    },
  });
}
