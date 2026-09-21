// ---------------------------------------------------------------------------
// The HTML for GET /turnstile — a bare Cloudflare Turnstile widget the mobile
// app loads in a WebView to obtain a captcha token for Supabase.
//
// Why a page at all (2026-09-14): Supabase's captcha protection stays ON, so
// signInWithOtp from the phone is refused without a token ("captcha
// protection: request disallowed (no captcha_token found)"); OAuth is exempt,
// which is why Google sign-in worked. Turnstile only issues tokens to a page
// served from an allow-listed hostname, so the app renders THIS page from
// our own domain and receives the token by postMessage.
//
// Why not a React page: every page under app/ inherits the dashboard layout
// (nav, providers, fonts). A route handler returning this string is a few KB,
// has no layout, and needs no client bundle. Pure so it is unit-tested.
// ---------------------------------------------------------------------------

export const TURNSTILE_THEMES = ['light', 'dark', 'auto'] as const;
export const TURNSTILE_APPEARANCES = ['always', 'execute', 'interaction-only'] as const;

export type TurnstileTheme = (typeof TURNSTILE_THEMES)[number];
export type TurnstileAppearance = (typeof TURNSTILE_APPEARANCES)[number];

export interface TurnstilePageOptions {
  siteKey: string;
  theme?: string | null;
  appearance?: string | null;
  /**
   * Where to send the result by navigation, for hosts that cannot receive
   * postMessage (ASWebAuthenticationSession on iOS: Cloudflare scores the
   * in-app WKWebView as a bot, so the app opens a real Safari sheet and
   * reads `?token=` / `?error=` off the return URL). Only the app's own
   * scheme is ever honoured — see `allowedRedirect`.
   */
  redirect?: string | null;
}

/** The one scheme the page may navigate to. Never http(s): that would be an open redirect. */
export const REDIRECT_SCHEME = 'normalapp:';

/**
 * A redirect target the page may use, or null. Must parse as a URL and carry
 * exactly the app scheme; everything else (https, javascript:, relative
 * paths, garbage) is dropped silently and the page falls back to postMessage.
 */
export function allowedRedirect(raw: string | null | undefined): string | null {
  if (!raw) return null;
  try {
    const u = new URL(raw);
    if (u.protocol !== REDIRECT_SCHEME) return null;
    if (u.hash) return null; // a fragment would swallow the query we append
    return u.toString();
  } catch {
    return null;
  }
}

function pick<T extends readonly string[]>(
  allowed: T,
  value: string | null | undefined,
  fallback: T[number]
): T[number] {
  return value && (allowed as readonly string[]).includes(value) ? (value as T[number]) : fallback;
}

/** Text → safe JS string literal (via JSON) so no query value can break out. */
const js = (v: string) => JSON.stringify(v);

/**
 * The env value as a bare key. Live 2026-09-21: NEXT_PUBLIC_TURNSTILE_SITE_KEY
 * had been entered in Vercel WITH its quotes, so the page shipped
 * `var siteKey = "\"0x4AAA…\""` and turnstile.render() threw on the phone.
 * A site key is `0x` + base64url-ish characters; anything else around it is
 * noise from a paste, never part of the key.
 */
export function normalizeSiteKey(raw: string | null | undefined): string {
  return (raw ?? '')
    .trim()
    .replace(/^["'`]+|["'`]+$/g, '')
    .trim();
}

export function buildTurnstilePage(opts: TurnstilePageOptions): string {
  const siteKey = normalizeSiteKey(opts.siteKey);
  const theme = pick(TURNSTILE_THEMES, opts.theme, 'light');
  const appearance = pick(TURNSTILE_APPEARANCES, opts.appearance, 'always');
  const redirect = allowedRedirect(opts.redirect);
  const bg = theme === 'dark' ? '#0A0A0F' : '#ffffff';

  // Messages the app listens for: { type: 'turnstile', token } on success,
  // { type: 'turnstile-error', reason } on error/expiry/timeout.
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>Verification</title>
<style>
  html, body { margin: 0; height: 100%; background: ${bg}; }
  body { display: flex; align-items: center; justify-content: center; font-family: system-ui, -apple-system, sans-serif; }
  #w { min-height: 65px; }
</style>
<script src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit&onload=__nfTurnstileReady" async defer></script>
</head>
<body>
<div id="w"></div>
<script>
(function () {
  var siteKey = ${js(siteKey)};
  var redirect = ${js(redirect ?? '')};
  var navigated = false;
  // Hand the result back by navigation when the host asked for it (Safari
  // sheet), in addition to postMessage. Only ever fires once per page.
  function deliver(query) {
    if (!redirect || navigated) return;
    navigated = true;
    location.replace(redirect + (redirect.indexOf('?') >= 0 ? '&' : '?') + query);
  }
  function post(msg) {
    var s = JSON.stringify(msg);
    try { if (window.ReactNativeWebView) window.ReactNativeWebView.postMessage(s); } catch (e) {}
    try { if (window.parent && window.parent !== window) window.parent.postMessage(s, '*'); } catch (e) {}
    if (msg.type === 'turnstile') deliver('token=' + encodeURIComponent(msg.token));
    else if (msg.type === 'turnstile-error') deliver('error=' + encodeURIComponent(msg.reason));
  }
  window.__nfTurnstileReady = function () {
    if (!siteKey) { post({ type: 'turnstile-error', reason: 'missing-site-key' }); return; }
    // A thrown render (bad key, blocked script) must surface on the phone as a
    // message, not as a silent hang behind a blank widget box.
    try {
      window.turnstile.render('#w', {
        sitekey: siteKey,
        theme: ${js(theme)},
        appearance: ${js(appearance)},
        callback: function (token) {
          window.__turnstileToken = token;
          post({ type: 'turnstile', token: token });
        },
        'error-callback': function (code) { post({ type: 'turnstile-error', reason: 'error:' + (code || 'unknown') }); return true; },
        'expired-callback': function () { post({ type: 'turnstile-error', reason: 'expired' }); },
        'timeout-callback': function () { post({ type: 'turnstile-error', reason: 'timeout' }); }
      });
    } catch (e) {
      post({ type: 'turnstile-error', reason: 'render:' + String(e && e.message ? e.message : e) });
    }
  };
  window.addEventListener('error', function (ev) {
    post({ type: 'turnstile-error', reason: 'script:' + String(ev && ev.message ? ev.message : 'unknown') });
  });
})();
</script>
</body>
</html>
`;
}
