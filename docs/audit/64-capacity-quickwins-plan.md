# 64 — Capacity quick-wins: plan

**Branch:** `chore/capacity-quickwins` · GO given 2026-08-12.

## Scope changes from recon (verified in code, not assumed)

- **#19 (auth timeout) is ALREADY DONE** — `createSupabaseServerClient.ts`
  has the full cached/bounded/deduplicated verification (30s TTL, 5s
  negative cache, digest-keyed, size-capped, in-flight dedup, Promise.race
  timeout). Implemented during the withAuth sweep; the register row was
  stale. Action: register correction only.
- Everything else confirmed live: `trailingSlash: true`
  (next.config.mjs:26) with clients fetching slash-less → every API call
  308-redirects (visible in dev logs: handlers execute at `/api/...-slash/`
  while clients call without); the ADMIN_SECRET bypass sits unreachable
  behind withAuth; Onramper survives only as config + a commented call
  site; the Statuspage loader polls from ExternalProvider.

## 1. #13 — kill the double round-trip (one line + empirical proof)

Add `skipTrailingSlashRedirect: true` alongside the existing
`trailingSlash: true`.

- Effect: the server stops 308-ing slash mismatches and serves both forms
  directly → every `/api` fetch becomes ONE round trip. Internally
  generated page links keep their trailing slash (Next still appends it),
  so canonical page URLs and navigation behavior are unchanged.
- Deliberately NOT chosen: (a) removing `trailingSlash: true` — changes
  every page's canonical URL and the vercel.json cron paths' behavior in
  one move, more blast radius than the win needs; (b) adding slashes to
  every fetch call site — ~100 call sites and a convention every future
  PR could forget.
- Honest residual: an externally typed page URL without a slash now serves
  content instead of redirecting (theoretical duplicate-content SEO for
  hand-typed URLs; internal links are unaffected). For an authenticated
  app with one marketing page, this is noise.
- **Verification is empirical, not assumed**: rebuild, `next start`, curl a
  public API route with and without the slash — both must 200 with no
  redirect hop, pages must still redirect to slashed form when navigated.

## 2. Cron heartbeat

`server/cron-heartbeat.ts`: `recordCronHeartbeat(name)` writes
`cron:heartbeat:<name>` = ISO timestamp (7-day TTL) to Redis; wired into
all three cron routes (fee-escrow-sweep, cctp-advance, dune-sync) and
included in each route's JSON response. A silently dead cron becomes a
5-second Upstash lookup instead of a user-discovered incident.

## 3. RPC fallback for the send guard probes

`send-records.ts`: probes try the configured RPC first, then a public
fallback (ETH: publicnode; SOL: api.mainnet-beta.solana.com), deduped when
they're the same. Shrinks the "RPC hiccup → conservative 409" window.
Client-side watcher unchanged (its failure only defers to the timer shots).

## 4–6. Deletions

- **#36** ADMIN_SECRET bypass in `wallets/link` — unreachable (withAuth
  rejects anything that isn't a valid session before the comparison runs);
  dead security code invites future misuse. Also scrub the stale mention in
  with-auth.ts's comment.
- **#31** Onramper — config block + `NEXT_PUBLIC_ONRAMPER_API_KEY` +
  `utils/checkout.ts` (its only caller is a commented line in
  onramp-dialog). Key should also be deleted from Vercel env by Niko.
- **#18** Statuspage — `loadStatuspage` usage in ExternalProvider (+ the
  helper in @normalfinance/utils if nothing else uses it): polls twice a
  minute forever, for a status account nobody owns.

## Tests

- Pure: heartbeat key naming, RPC candidate ordering/dedup.
- Empirical: the #13 curl matrix (both URL forms on an API route + a page).
- Full gates + build as always.

## Rollout

No schema, no new routes (one new lib + edits). vercel.json crons keep
their slashed paths — they resolve identically under the new setting.
