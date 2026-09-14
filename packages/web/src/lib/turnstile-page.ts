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

export function buildTurnstilePage(opts: TurnstilePageOptions): string {
  const theme = pick(TURNSTILE_THEMES, opts.theme, 'light');
  const appearance = pick(TURNSTILE_APPEARANCES, opts.appearance, 'always');
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
  var siteKey = ${js(opts.siteKey)};
  function post(msg) {
    var s = JSON.stringify(msg);
    try { if (window.ReactNativeWebView) window.ReactNativeWebView.postMessage(s); } catch (e) {}
    try { if (window.parent && window.parent !== window) window.parent.postMessage(s, '*'); } catch (e) {}
  }
  window.__nfTurnstileReady = function () {
    if (!siteKey) { post({ type: 'turnstile-error', reason: 'missing-site-key' }); return; }
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
  };
})();
</script>
</body>
</html>
`;
}
