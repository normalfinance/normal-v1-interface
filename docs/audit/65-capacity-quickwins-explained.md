# 65 — Capacity quick-wins, explained for juniors

Branch: `chore/capacity-quickwins`. Design: [64-capacity-quickwins-plan.md](64-capacity-quickwins-plan.md).

## The theme

The money-correctness work is done. This batch makes the app cheaper per
user, harder to silently break, and smaller in attack surface — six small
items, each independently safe.

## 1. Every API call was two API calls (#13)

- The app's config says URLs end with a slash (`/api/thing/`), but our code
  fetches without one (`/api/thing`).
- Cause and effect: every single API request → server answers "wrong URL,
  go to /api/thing/" (a 308 redirect) → the browser sends the request AGAIN
  → double the round trips, double the latency, double the request volume,
  on every interaction, for every user.
- Fix: one config line (`skipTrailingSlashRedirect`) — the server now
  answers both forms directly. Internal page links are untouched.
- We didn't trust the docs: we built the app, started a production server,
  and curled both URL forms — API answers 200 directly on both, no
  redirect hop.

## 2. Auth timeout (#19) — turned out to be already done

The register said "auth verification has no timeout, one slow Supabase
minute hangs every route." Recon showed it was fixed during the withAuth
sweep: verification is cached 30s, deduplicated, and timeout-raced. Lesson
worth keeping: **verify the register against the code before doing the
work** — we corrected the books instead of redoing a fix.

## 3. Crons now prove they're alive

- Your question from this week: "cron jobs sometimes fail — how would we
  know?" Answer before today: we wouldn't, until a user hit something.
- Now every cron run stamps a timestamp in Redis (`cron:heartbeat:<name>`)
  and echoes it in its response. "Are the crons alive?" is a 5-second
  lookup in Upstash.

## 4. The send guard got a second opinion

- The "is your previous send settled?" check asks the blockchain through
  one RPC endpoint. If that endpoint hiccuped → conservative "still
  confirming" even for a confirmed send.
- Now it tries a second, independent endpoint before giving up.
- Bonus bug found while wiring it: the Ethereum probe treated a DEAD RPC
  the same as "transaction not found" — which, for an old record, could
  have been escalated to "abandoned" (a lying record). A transport failure
  now clearly says "I couldn't check" instead of "it doesn't exist."

## 5–6. Three deletions

- **Admin backdoor code (#36):** a rate-limit bypass keyed on ADMIN_SECRET
  sat in wallets/link. It was provably unreachable (the auth wrapper
  rejects anything that isn't a real session before the check could run) —
  but dead security code is how future refactors accidentally create live
  backdoors. Deleted.
- **Onramper (#31):** an API key shipped to every browser for a service
  that's been commented out for months. An unused credential is pure
  liability. Deleted (the Vercel env var too — Niko's step).
- **Statuspage (#18):** a widget polling an unowned status account twice a
  minute, forever, for every user. Deleted.

## How to test (do → see)

1. Open DevTools → Network → do anything (load portfolio, open savings) →
   each `/api/...` request appears ONCE with status 200 — before this you'd
   see pairs: a 308 followed by the real call.
2. App works exactly as before — sends, swaps, savings, MoneyGram — because
   nothing user-facing changed except the redirect hop.
3. In Upstash → `cron:heartbeat:fee-escrow-sweep` (staging/prod only —
   localhost has no crons) → a timestamp under 2 minutes old.
4. Nothing references Onramper or Statuspage anymore: DevTools Network on a
   fresh load shows no `statuspage.io` request.
