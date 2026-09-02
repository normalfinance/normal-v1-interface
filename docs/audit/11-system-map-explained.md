# 11 — The System Map, Explained (junior-friendly companion)

This is the plain-language version of `10-system-map.md`. Same findings, no
jargon left unexplained. Candidate numbers (#1–#31) match the technical map,
so you can jump between the two. Nothing here has been *fixed* yet — Phase 2
verifies these, Phase 3 ranks them, Phase 4 fixes them in order.

---

## 1.A — The 55 doors (our API routes)

Every URL under `/api/` is a door into our backend. We checked each door for
a lock (login required?), a bouncer (rate limiting?), and what's behind it.

- **35 doors need a Normal login, 2 need a robot secret** (our cron jobs).
- **18 doors are unlocked — anyone on the internet can open them.**
- The worst two unlocked doors (#1): `swap/log-transaction` and
  `savings/log-transaction` let a stranger **write fake records into our
  database** — fake swaps, fake deposits. Nobody can steal money this way,
  but they could poison our analytics (the numbers we show Stellar!) and
  bloat the database.
- Three unlocked doors (#2) answer questions about **any user's activity**
  if you know their wallet address — a privacy question.
- Several unlocked doors (#3) forward requests to services we pay for
  (LI.FI, CoinGecko) — a stranger hammering them burns **our** quotas.
- Only **12 of 55** doors have a bouncer (#6) — and none of the problem
  doors above are among them.
- **Reassurance:** every door that moves money or touches keys IS locked.
  These are integrity/cost/privacy holes, not theft holes.

## 1.B — The warehouse (our database)

Each table is a room; we checked who reads it, who writes it, and whether
lookups use a proper index (card-catalog) instead of walking every shelf.

- **Good news:** every query we make is index-backed, there's zero
  hand-written SQL, and exactly one shared database client. Tidy.
- The unlocked doors from 1.A write into the exact rooms our analytics are
  built from — that's why #1 matters.
- **#10 — "too many people in the room":** with serverless, every
  simultaneous request holds its own database connection. During a traffic
  spike, hundreds of parallel functions each grab one → the free-tier
  database runs out of connection slots and requests fail *even though the
  database isn't busy*. Known fix (transaction pooling + the Pro upgrade).
- The `users` table holds one row (#11) — real identity lives in Supabase
  Auth; the table only serves referrals. Misleading name.
- We have **two separate activity systems** doing the same job (#7/#12).

## 1.C — Who asks for data, and how often (the browser)

- **#13 — every API call knocks twice.** A config option
  (`trailingSlash: true`) makes the browser call `/api/x`, get told "it's
  `/api/x/`", and call again. EVERY request in the app = two round-trips.
  This also explained half of a mystery: "44 calls in 20 s" was really 22,
  each counted twice.
- **#14 — the savings bell has no ringer.** The code defines an event
  "savings-position-updated" and the portfolio page listens for it to
  refresh savings after a deposit… but a full-code search shows **nobody
  ever sends it**. That's a named cause of "savings looks stale".
- The idle-tab leak has names now: portfolio re-asks every 30 s, activity
  runs four 30-second timers, savings-card has 2.5 s/4 s loops (#15).
- Some hooks are exemplary (savings-vault caches 5 min, price history 60 s,
  no timers) — the team knows the good pattern (#17); it's just applied
  inconsistently.
- The **swap card's balances never touch our server** — the browser asks
  the Stellar RPC directly. Any future server cache must migrate this hook
  too, or the swap card stays a leak.
- #16: the remaining "22 calls where 3 are expected" needs a runtime
  experiment in Phase 2.

## 1.D — The 20 outside services we depend on

- All three mystery hosts from our measurements are identified: a
  **Statuspage widget** loaded on every page for every visitor, polling
  2×/min forever (#18 — load it on demand instead); our own icon CDN
  (harmless); and a free community Stellar RPC we silently fall back to.
- The register's big theme: our "what if this service hangs?" handling is
  **inconsistent** — the portfolio aggregator is perfect (5 s timeout on
  everything, graceful fallback), while other code calls the same services
  with no timeout at all (#20).
- **#19 — the sharpest one:** all 35 locked doors verify your login by
  calling Supabase live, with **no timeout**. If Supabase auth has a slow
  day, every route in the app hangs together. Same disease class as the
  22-second Redis incident — not yet triggered.

## 1.E — The robots and watchers (background work)

- **We fact-checked ourselves and were wrong:** only **Bitcoin** has a
  pending-receive watcher (and it's the best-built polling code in the app
  — WebSocket + fallback, stops when the modal closes). **ETH and SOL have
  no pending detection at all** — their receive modal is a static QR code
  (#22). Users watching an incoming ETH/SOL deposit see nothing until
  final.
- The real Solana cost-burner is the **activity feed**: every open tab
  re-asks Solana history every 30 s, and each uncached ask costs **100
  credits** (~12,000 credits/hour/tab). That's the "Enhanced API 94 %"
  line on the Helius bill, precisely attributed.
- The CCTP robot (every 2 min) may overlap itself — its max runtime equals
  the interval (#21). It claims to handle that; Phase 2 verifies.
- The Dune sync robot **wipes then re-writes** the dashboard — if the
  write half fails, the public dashboard is empty for up to 4 hours (#23).

## 1.F — What the browser remembers (storage)

- The scary-sounding localStorage key `normal-wallet-private-key` is
  **properly encrypted** with a password-derived key. Good.
- Safari deletes all site storage after ~7 idle days — the map records
  what breaks per key. Mostly "cold cache, fine". Two exceptions:
  Coinbase off-ramp tracking is **device-only** (#24 — switch phones and
  your pending sell disappears from view), and a legacy decryption path to
  retire (#25).
- Comedy entry: the main app store persists under the key
  `just-some-normal-storage`.

## 1.G — How logins actually work

Now written down instead of tribal: Google/email log you into Supabase;
**passkeys are wallet credentials (Turnkey), not logins** — a distinction
that confused everyone repeatedly. Every locked door re-verifies your
session live (revocation-aware — good; no timeout — #19). All the session
bugs from July (global logout, false "$0 wallets", blocking picker) are
fixed and their fixes documented here.

## 1.H — The money flows (the chapter that matters most)

**Key insight: the newest flow is the safest; the oldest is the most
fragile.** CCTP (newest, hardest) was built like a bank: a database record
exists *before* money moves, a robot re-checks every 2 min, there's
recovery UX and a refund hatch. Soroswap swaps and savings deposits (the
flows real users touch daily) are fire-and-forget:

- **#26** — you sign the fee payment FIRST, then the real transaction. If
  the second fails, you paid ~0.5 % for nothing. Deliberate (a code
  comment admits it) but never formally accepted — Phase 3 ratifies or
  changes it.
- **#27** — records are written **only on success**, via an unlocked door.
  A failed or interrupted swap leaves **no trace on the server**: support
  is blind, the activity feed shows nothing. CCTP's record-first pattern
  is the in-house template for fixing this.
- **#28** — savings still lacks the "do you have XLM for fees?" check
  flagged in June; users fail mid-flow instead of being warned upfront.
- BTC sends have a proper recovery path; ETH/SOL send retry semantics need
  a Phase 2 look (#29). MoneyGram and Coinbase paths are mapped with their
  edges.

## 1.I — The environment variables (config)

- **Good surprise:** the old fear that paid API keys leak to the browser
  is **disproven** — all provider secrets are server-side. Only cleanup:
  a browser-exposed key for Onramper, a service whose UI is commented out
  (#31 — delete).
- **#30 — the stale-build trap:** browser-visible variables get baked into
  the app at build time, and the build tool only rebuilds when a variable
  it *knows about* changes. It knows 57; the code reads **~55 more it
  doesn't know**, including Supabase URLs. Change one of those in Vercel
  and you can be served a cached build with the OLD value still inside —
  a "we changed it but nothing changed" ghost bug. One config list fixes
  it.
- Deploy map + landmines documented (the Preview-scope lesson from P0-3,
  the squash-merge phantom conflicts, the misnamed database variable).

---

## The scoreboard

**31 candidates** + the Phase-0 carryovers (the big fetching re-architecture,
the Supabase Realtime toggle, the Pro upgrade, the Turnkey Enterprise deal).
Every one has file-level evidence in `10-system-map.md`. **Nothing is fixed
yet by design** — Phase 2 confirms each is real and scores it; Phase 3 is
where we rank them together and choose the fix order; Phase 4 fixes them one
small PR at a time.
