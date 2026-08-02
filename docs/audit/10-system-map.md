# 10 — System Map (Phase 1)

Baseline: commit `aabafbd` · started 2026-07-26 · method per `09-phase1-plan.md`
(read-only; file:line/grep evidence; HAR cross-checks). Chapters land as
completed: **1.A ✅** · 1.B–1.I pending.

---

## 1.A — API route inventory (55 routes, count verified against disk)

Legend — Auth: `SB` = Supabase session required · `CRON` = cron-secret ·
`—` = **no authentication**. RL = rate-limited (Upstash). Cache = Redis
response cache. DB = touches Prisma. Ext = calls third parties (⁽ˡ⁾ = via lib
module — exact targets verified in 1.D).

| Route | Methods | Auth | RL | Cache | DB | External |
|---|---|---|---|---|---|---|
| activity/ethereum | GET | **—** | ✔ | ✔ | | Etherscan |
| activity/solana | GET | **—** | ✔ | ✔ | | Helius |
| cctp/gas-topup | POST | SB | | | ✔ | EVM RPC⁽ˡ⁾ |
| cctp/quote | POST | SB | | | | Soroswap/LI.FI⁽ˡ⁾ |
| cctp/transfers | GET,POST | SB | | | ✔ | Iris/RPC⁽ˡ⁾ |
| cctp/transfers/[id] | GET,PATCH | SB | | | ✔ | Iris/RPC⁽ˡ⁾ |
| coinbase/offramp-status | GET | SB | | | | Coinbase CDP |
| coinbase/session | POST | SB | | | | Coinbase CDP |
| crisp | POST | SB | | | | Crisp⁽ˡ⁾ |
| cron/cctp-advance | GET | CRON | | | ✔ | Iris/RPC⁽ˡ⁾ |
| cron/dune-sync | GET | CRON | | | ✔ | Dune |
| fees/build-payment | POST | **—** | | | | Stellar⁽ˡ⁾ |
| lifi/quote | POST | **—** | | | | LI.FI |
| lifi/record | POST | SB | | ✔ | | |
| lifi/status | GET | **—** | | | | LI.FI |
| lifi/statuses | POST | **—** | ✔ | ✔ | | LI.FI |
| marketing/opt-in | GET,POST | SB | | | | Customer.io⁽ˡ⁾ |
| mgi/info | GET | — *(public by design)* | | HTTP s-maxage | | MoneyGram |
| mgi/sep10/challenge | GET | SB | | | | MoneyGram |
| mgi/sep10/complete | POST | SB | | | | MoneyGram |
| mgi/sep24/deposit | POST | SB | | | ✔ | MoneyGram |
| mgi/sep24/withdraw | POST | SB | | | ✔ | MoneyGram |
| mgi/sep24/withdraw/cancel | POST | SB | | | | MoneyGram |
| mgi/sep24/transactions/moreinfo | POST | SB | | | | MoneyGram |
| mgi/sep24/transactions/proxy/[id] | GET | SB (+x-mgi-token) | | | | MoneyGram |
| mgi/transactions | GET | SB | | | ✔ | |
| mgi/transactions/[id] | PATCH | SB | | | ✔ | |
| portfolio/activity | GET | **—** | | | ✔ | |
| prices/history | GET | **—** | ✔ | ✔ | | CoinGecko, Kraken |
| referral/actions | GET,POST | SB | ✔ | | ✔⁽ˡ⁾ | |
| referral/activate | POST | SB | ✔ | | ✔⁽ˡ⁾ | |
| referral/codes | GET,POST | SB | ✔ | | ✔⁽ˡ⁾ | |
| referral/stats | GET | SB | ✔ | | ✔⁽ˡ⁾ | |
| referral/user | GET,POST | SB | ✔ | | ✔⁽ˡ⁾ | |
| savings/deposit | POST | **—** | | | | Soroban⁽ˡ⁾ |
| savings/log-transaction | POST | **—** | | | ✔ | |
| savings/user-position | GET | **—** | | | ✔ | DeFindex |
| savings/vault-info | GET | **—** | | | | DeFindex⁽ˡ⁾ |
| savings/withdraw | POST | **—** | | | | Soroban⁽ˡ⁾ |
| send | POST | SB | ✔ | | | chain RPCs⁽ˡ⁾ |
| swap/log-transaction | POST | **—** | | | ✔ | |
| swap/quote | POST | **—** | | | | Soroswap |
| transaction | POST | SB | ✔ | | | Stellar RPC |
| turnkey/broadcast-btc | POST | **—** | | | | mempool.space |
| turnkey/build-btc-sweep | POST | SB | | | ✔ | mempool.space |
| turnkey/build-btc-tx | POST | SB | | | ✔ | mempool.space |
| turnkey/import | POST | SB | | | ✔ | Turnkey⁽ˡ⁾ |
| turnkey/import-init | POST | SB | | | ✔ | Turnkey⁽ˡ⁾ |
| turnkey/reattach-btc | POST | SB | | | ✔ | Turnkey⁽ˡ⁾ |
| turnkey/wallet | GET,POST | SB | | | ✔ | Turnkey⁽ˡ⁾ |
| wallet/activity | GET | **—** | | | ✔ | |
| wallet/portfolio | GET | SB | ✔ | ✔ | ✔ | CoinGecko/RPCs/Horizon/mempool⁽ˡ⁾ |
| wallets/check-limit | GET | SB | | | | |
| wallets/link | POST,PATCH,DELETE | SB | | | ✔⁽ˡ⁾ | |
| wallets/linked | GET | SB | | | ✔⁽ˡ⁾ | |

**Coverage arithmetic (exit-criteria check):** 55 rows = 55 route files ✔ ·
Auth: 35 SB + 2 CRON + 18 none · Rate-limited: 12 · Redis-cached: 5 ·
DB-touching: 24 · external-calling: ~30.

### Phase 2 candidates seeded from 1.A (questions, not conclusions)

1. **Unauthenticated WRITES (top candidate):** `swap/log-transaction` and
   `savings/log-transaction` are POST + Prisma-write + no auth + no rate
   limit → can anyone on the internet insert fake rows (poisoning
   swap_logs/vault_deposits → Dune analytics → fee/volume reporting) and
   grow the DB unboundedly? Verify exploitability + fix shape (auth or
   signed-payload verification).
2. **Unauthenticated reads of per-user data:** `wallet/activity`,
   `portfolio/activity`, `savings/user-position` accept any wallet address
   with no session → what exactly do they leak beyond public on-chain data
   (our DB rows: swap fees paid, savings history)?
3. **Quota-theft amplification:** unauth `lifi/quote`(POST), `lifi/status`,
   `swap/quote`, `savings/vault-info`, `prices/history` (RL ✔ but keyless
   CoinGecko), `activity/*` (RL ✔) let outsiders burn our provider quotas
   through our endpoints. Which need auth vs stricter RL?
4. **Open BTC relay:** `turnkey/broadcast-btc` (POST, unauth) relays
   pre-signed transactions — harmless to our funds (signatures required) but
   an open proxy to mempool.space; confirm intended.
5. **`fees/build-payment` + `savings/deposit|withdraw` unauth builders** —
   server builds XDRs for anyone; verify no abuse vector (fee-wallet
   drain? resource use?).
6. **Rate-limit coverage is 12/55** — none of the unauth write/read routes
   above are limited.
7. **Two parallel activity systems** (`wallet/activity` vs
   `portfolio/activity`) — duplication to reconcile in 1.C.
8. **CCTP relayer EVM calls ride viem's default public RPCs**⁽ˡ⁾ — reliability
   risk for money-moving code; verify in 1.D and consider pinning (Phase 3).
9. `transaction/route.ts` has a commented-out edge-runtime handler — confirm
   node handler is intentional (edge-config wrapper naming suggests A/B).

---

## 1.B — Data layer (10 Prisma models + 2 kept legacy tables)

### Table-ownership matrix (grep-verified call sites, commit `aabafbd`)

| Table | Readers | Writers | Index vs filters |
|---|---|---|---|
| users | referral-service (findUnique×4) | referral-service (create) | unique walletAddress ✔ matches lookups |
| referrals | referral-service; dune-sync | referral-service (create/update) | unique code ✔ |
| referral_actions | referral-service; dune-sync | referral-service (create) | unique (userId,referralId,action) ✔ |
| linked_wallets | linked-wallet-service; dune-sync | linked-wallet-service (upsert/update/delete) | unique (supabaseUid,walletAddress) + idx supabaseUid ✔ |
| vault_deposits | wallet/activity · savings/user-position · portfolio/activity · dune-sync | **savings/log-transaction (UNAUTH route)** | idx (walletAddress,vaultAddress) ✔ |
| swap_logs | wallet/activity · portfolio/activity · dune-sync | **swap/log-transaction (UNAUTH)** · lifi/record (SB) | idx walletAddress ✔ |
| turnkey_wallets | turnkey/wallet · wallet/portfolio · import/reattach | turnkey/wallet create · import/reattach update | unique supabaseUid, subOrgId ✔ |
| cctp_transfers | cctp routes · lib/cctp/state.ts | state machine (update/updateMany) · gas-topup · routes | idx userId, status, burnTxHash ✔ |
| moneygram_transactions | mgi/transactions | sep24 deposit/withdraw upsert · [id] PATCH | idx supabaseUid, walletAddress ✔ |
| normal_contract_events | **none — dead table (0 refs, 0 rows in live DB; 593 rows only in old-data archive)** | none | — |
| sponsored_accounts, user_rsa_keys *(not in schema)* | none in current code | none | **kept-on-purpose legacy — `prisma db push/migrate` PROHIBITED against this DB** |

### Hygiene findings

- **No raw SQL anywhere** in app code; **exactly one PrismaClient** (lib/prisma
  singleton). Good.
- **Dual browser Supabase clients — narrower than feared:** the second
  instance (`createSupabaseClientWithUrlDetection`) is used ONLY by
  `auth/reset-password/page.tsx`; everything else uses the singleton (9
  importing files). The stale-in-memory-session caveat is real but scoped to
  the reset-password flow.
- **All observed query filters are index-backed** at current schema — no
  missing-index red flags in app tables (the DB-time problem is P0-2's
  Realtime churn, not our queries).
- **Pooler mode:** live URLs = session pooler (5432); the 6543 entries in
  .env are commented leftovers. **Candidate #10:** session-mode pooling means
  each concurrent serverless invocation holds a DB session — under a
  sponsor-spike, Vercel fan-out can exhaust Supabase's session slots
  (free/NANO tier). Serverless-recommended setup is transaction pooler
  (6543) + `pgbouncer=true&connection_limit=1`, or Pro-tier session limits.
  Verify limits → Phase 3 decision (pairs with the P0-9 Pro upgrade).

### New Phase 2 candidates from 1.B

10. Session-pooler connection exhaustion under spike (above).
11. `users`/`referrals` Prisma tables are vestigial (1 user row; referral
    flows only) — identity truly lives in Supabase Auth; consolidate or
    document the split.
12. The two parallel activity systems confirmed at DB level: `wallet/activity`
    and `portfolio/activity` independently re-query the same tables with
    different shapes — reconcile in 1.C/Phase 3.

---

## 1.C — Client fetch-graph

### SWR hooks (9 files; key · target · timing)

| Hook | Key | Target | refresh | dedupe | onFocus |
|---|---|---|---|---|---|
| use-wallet-balances | portfolio key | `/api/wallet/portfolio` | **30 s** | 10 s | **true** | 
| use-user-activity (6 sources) | per source | activity APIs + **mgi from our DB** | **30 s ×3** + statuses 30 s | 10–60 s | true |
| use-turnkey-wallet | `['turnkey-wallet', uid]` | `/api/turnkey/wallet` | — | 60 s | false |
| use-savings-position | vault / position | savings APIs | — | **300 s / 60 s** | false |
| use-mgi-transactions | `['mgi-db-transactions', uid]` | `/api/mgi/transactions` | 60 s | 15 s | true |
| use-mgi-limits | `'mgi-limits'` | `/api/mgi/info` | — | 3600 s | false |
| use-price-history | symbol+range | `/api/prices/history` | — | 60 s | false |
| use-token-balance | `['token-balance', …]` | **direct browser → Soroban RPC** | immutable | — | — |
| btc-tx-status-modal | txid | **direct browser → mempool.space** | 30 s | — | true |

Also: use-wallet-balances keeps a **localStorage response cache** (fallbackData)
and listens to `nf:activity-updated` (mutate +800 ms).

### Raw timers (setInterval)

| Site | Interval | Purpose / stop condition (verify ⚠ in Phase 2) |
|---|---|---|
| onboarding-wizard:368 | 5 s | fund-xlm polling; stops on funded/step change |
| savings-card:201 / :284 | **2.5 s / 4 s** | post-tx refetch loops — ⚠ verify bounded |
| onramp-dialog:165 | 15 s | MGI post-commit poll; cached-token-gated, dialog-scoped |
| cctp-resume-banner:145 | 30 s | recovery banner refresh |
| use-transaction-status:86/:102 | 2× | tx status + countdown |
| use-ago / landing animations | 1–2.4 s | cosmetic only |

### Custom events

| Event | Emitters | Listeners |
|---|---|---|
| `nf:activity-updated` | **8** (swap engines ×3, onramp, coinbase, …) | use-wallet-balances · use-user-activity ×2 |
| `nf:savings-position-updated` | **0 — NO EMITTER (dead wiring)** | portfolio-activity-card |
| `nf:open-login` | 6 | layout/login modal |
| `nf:open-wallet-setup` | 1 | drawer/wizard |

### Surfaces → data mapping (workstream B enumeration)

| Surface | Feeding hooks |
|---|---|
| Account drawer | usePortfolio · useTurnkeyWallet · useUserActivity |
| Homepage hero card | usePortfolio |
| Portfolio page | usePortfolio · useTurnkeyWallet · ActivityCard(useUserActivity) · bitcoin-card(useTurnkeyWallet) |
| Savings page | useSavingsPosition (via use-defindex-savings) · savings-chart/history (useUserActivity) |
| Swap card | **use-token-balance (direct browser→RPC — outside any future server cache unless migrated)** · useTurnkeyWallet |
| Asset pages | ActivityCard + chain hooks (⚠ finish exact enumeration) |

### Findings from 1.C

13. **`trailingSlash: true` (next.config:26) makes EVERY client API call two
    round-trips** — `fetch('/api/x')` → 308 redirect → `/api/x/`. Confirmed
    by HAR pairs (`info` + `info/`). Doubles HAR counts, adds latency to
    every request. **P0-5 partially explained: 44 turnkey calls = ~22
    logical.** Fix shape: trailing-slash-aware fetch helper or drop the
    setting (Phase 3 decision — changing it affects SEO/redirects).
14. **The savings-refresh event is dead wiring**: `POSITION_SYNC_EVENT`
    (`nf:savings-position-updated`) is defined and listened-to but **never
    dispatched** — post-deposit savings refresh never fires. Likely
    contributor to stale savings UX. 
15. savings-card polls at 2.5 s/4 s — verify the loops are strictly bounded
    to pending-tx windows.
16. P0-5 remainder (~22 logical calls/20 s despite 60 s dedupe): hypotheses
    for Phase 2 runtime repro — hard-navigation cache resets (MPA-style
    transitions ×3 pages), multiple mounted consumers at hydration before
    cache settles, error-retry storms. Needs a runtime repro, not more
    grepping.
17. Well-behaved configs worth preserving as patterns: use-savings-position
    (5 min/60 s dedupe, no timer), use-price-history, use-mgi-limits.

---

## 1.D — External dependency register

**Mystery hosts from HARs — all identified:**
- `grmcl3nnw63w.statuspage.io` → **Statuspage.io embed widget**, loaded
  globally by `ExternalProvider` (root layout → every page, every user) via
  `loadStatuspage()` (@normalfinance/utils). Polls 2×/min forever — **P0-7
  RESOLVED**. Candidate #18: load on-demand (status page link / incident
  banner) instead of globally, or drop.
- `cdn.normalapi.com` → **first-party CDN for token icons** (tokenList
  constants). Harmless; ownership/hosting to confirm (AWS Lightsail box? →
  open question for Justin).
- `rpc.lightsail.network` → **public community Soroban RPC** — the fallback
  in stellar.ts:47 when `NEXT_PUBLIC_MAINNET_RPC_URL` is unset. Same
  no-SLA class as public Horizon; used by browser-direct token-balance
  reads and Soroban flows.

### Register (call sites · auth · limits · failure behavior)

| Provider | Called from | Auth/env | Limits (verified) | Failure behavior |
|---|---|---|---|---|
| Supabase auth (`vunxamog…`) | server `getAuthenticatedUser` (35 routes); browser singleton client | anon key (public) + service key (server) | MAU 50k free | live `getUser` per request — no timeout wrapper ⚠ |
| Supabase Postgres (same project post-consolidation) | Prisma singleton, 24 routes | `DATABASE_*_URL` (session pooler 5432) | NANO tier; **spend-cap freeze (P0-9)**; session slots (cand #10) | Prisma errors bubble; no retry layer |
| Upstash Redis (org acct `meet-kitten…`) | 5 cached routes + rate limiters | `UPSTASH_*` (all-envs ✅ fixed) | free tier | try/catch fallthrough (cache-miss behavior) ✅ good |
| Alchemy (ETH) | server: portfolio aggregate, activity/ethereum, send/CCTP libs | `ALCHEMY_API_KEY` (server-only ✅) | 30M CU/mo, 500 CU/s; getBalance=20 CU | aggregate: 5 s timeout + stale fallback ✅; others ⚠ verify |
| Helius (SOL) | server: aggregate, activity/solana, send libs | server-only ✅ | 1M credits/cycle; **Enhanced API 100 credits/call**; 10 req/s | same pattern ⚠ verify per route |
| Etherscan | activity/ethereum | server key | 100k/day, 5/s | ⚠ verify |
| CoinGecko | server: prices/history, aggregate | **keyless** | public IP limits (unverified #) | 5 s timeout, USDC=1 fallback ✅; Kraken as secondary source |
| Horizon (public) | **browser-direct** (flows, balances) + server aggregate | none | public, already bit us once | aggregate ✅; browser calls ⚠ mixed |
| Soroban RPC (lightsail fallback) | **browser-direct** token balances; savings/swap server libs | `NEXT_PUBLIC_MAINNET_RPC_URL` or public fallback | no SLA | ⚠ verify |
| mempool.space (BTC) | **browser-direct** (btc modal, watcher) + server (build/broadcast btc, aggregate) | none | public | aggregate ✅ |
| LI.FI | server: lifi/* routes, cctp/quote | `LIFI_API_KEY` (server ✅) | per-key (undocumented in portal) | statuses cached in Redis ✅ |
| Soroswap | server: swap/quote, cctp libs | — | ⚠ pull docs | ⚠ |
| MoneyGram | server: mgi/* (9 routes) | SEP-10 + `MGI_ACCESS_HOST` | partner | diagnostics-bubbling pattern ✅ |
| Circle Iris (CCTP) | server: cctp libs + cron | none (public attestation API) | **35 req/s** | poll/retry state machine ✅ |
| Turnkey | server: turnkey/* routes, signing libs; browser passkey ceremonies | org keys (server) | free tier: 100 wallets/25 sigs (34 wallets used) | ⚠ verify error paths |
| Coinbase CDP | server: coinbase/* | CDP keys | — | session-token single-use handling ✅ |
| Customer.io | server: marketing/opt-in lib | server key | — | ⚠ |
| Crisp | crisp route + widget | key | — | — |
| Dune | cron/dune-sync push | `DUNE_API_KEY` | — | cron-scoped |
| Statuspage.io | **browser, every page** (ExternalProvider) | none | — | cosmetic; cand #18 |
| WalletConnect (explorer/relay/verify) | browser via wallets-kit | project id | — | kit-managed |
| cdn.normalapi.com / fontshare | browser static | none | — | cosmetic |

**Exit-check:** every host observed in Phase 0 HARs now has a register row ✔.

### New candidates from 1.D

18. Statuspage widget loaded globally on every page (P0-7 resolved) → load
    on-demand or drop.
19. `getAuthenticatedUser` calls Supabase live on all 35 authed routes with
    **no timeout wrapper** — a slow Supabase auth = every route hangs;
    consider timeout + cached JWKS-style verification (Phase 3).
20. Browser-direct provider calls (Horizon, Soroban, mempool) have
    inconsistent failure handling vs the server aggregate's exemplary
    timeout+fallback pattern — inventory per call-site in Phase 2.

---

## 1.E — Background & scheduled work

### Vercel crons

| Cron | Schedule | Auth | Does | Notes |
|---|---|---|---|---|
| `cctp-advance` | **every 2 min** | CRON_SECRET | `advancePendingTransfers()` — attestation pickup, mint execution, reattest for in-flight transfers (safety net; primary driver = opportunistic advance on client reads) | `maxDuration: 120 s` = can still be running when the next tick fires ⚠ overlap; state machine + gas-topup re-entrant lock claim idempotency — **verify under overlap in Phase 2 (cand #21)** |
| `dune-sync` | every 4 h | CRON_SECRET | `duneClear`+`duneInsert` from Prisma reads + Horizon + Supabase users | clear-then-insert = brief empty window on Dune if insert fails ⚠ |

### Client watchers

| Watcher | Mechanics | Bounds |
|---|---|---|
| **BTC receive** (`use-btc-address-watch`) | mempool.space **WebSocket** + 20 s poll fallback, auto-reconnect | modal-scoped (`enabled`), cleanup on unmount — **exemplary pattern** |
| **ETH/SOL receive** | **DOES NOT EXIST.** `chain-receive-modal` is a static QR/address display; `activity/ethereum|solana` mark everything `confirmed: true` | — |
| MGI post-commit | 15 s, cached-token-gated | dialog-scoped ✅ |
| CCTP recovery banner | 30 s refresh | banner-scoped |
| tx-status / savings-card | 2.5–5 s during pending tx | ⚠ verify stop conditions (cand #15) |

### Corrections & new candidates

21. cctp-advance overlap window (maxDuration ≥ interval) — verify state-machine
    idempotency under concurrent ticks.
22. **CORRECTION to 02-baseline:** there are NO ETH/SOL pending-receive
    watchers (prior belief wrong — only BTC has one). The real Helius burner
    is the **activity feed polling `/api/activity/solana` every 30 s per open
    tab**, where each upstream call is an Enhanced-API request at **100
    credits** → ~12,000 credits/hour per open tab on cache-miss. This is the
    single most expensive polling loop in the app; Layer-1's cached route +
    event-driven refresh kills it. Also: ETH/SOL receives currently show NO
    pending state at all (product gap, not just cost) — the BTC watcher
    pattern is the template if the feature is wanted.
23. dune-sync clear-then-insert lacks atomicity — failed insert leaves Dune
    empty until next 4 h tick.

---

## 1.F — State & storage inventory

### Zustand stores (`packages/state`)
`persist` (main app store, localStorage **`just-some-normal-storage`** — wallet
connection, token state) · `network` (**`normal.network`**) ·
`stellar-wallet-kit` · `normal-wallet` · `modal` · `loading` (in-memory).

### localStorage keys (browser, all evicted by Safari ITP after ~7 idle days)

| Key | Holds | Eviction consequence |
|---|---|---|
| `normal-wallet-private-key` | legacy wallet key — **encrypted, password-derived (v2)**; legacy v1 decrypt path still present | re-import flow exists ✅ (message + wizard path) |
| `just-some-normal-storage` | wallet connection + token state | reconnect on next visit |
| `nf:portfolio:v1` | portfolio response cache (fallbackData) | cold cache |
| `nf_savings_position_cache_v2` / `nf_vault_info_cache` | savings caches (2 consumers) | cold |
| `mgiAuth.v2` | SEP-10 JWTs (~1 h) | re-auth (passkey) |
| `nf:cb-offramp-fills` | Coinbase offramp txHash joins — **device-local only** | offramp status tracking lost cross-device (cand #24) |
| `wallet-selection-modal-seen` · `normal-login-intent` · `announcement_dismissed_*` | UX flags | cosmetic |
| `sb-…-auth-token` | Supabase session | logged out (honest re-auth UX since the P0 fixes) |

### Cookies & Edge Config
Cookies: `normal-network` (server reads it for network/passphrase selection),
`app-settings`, `i18next`, analytics leftovers (`ph_*` PostHog dead cookies,
`_ga`). Edge Config: `logWithConfig` log gating (9 files) +
`createEdgeConfigHandler` wrappers on referral/send/transaction routes.

New candidates: **24.** offramp fills device-local (own code marks DB-backing
as the follow-up — formalize; MoneyGram's DB pattern is the template).
**25.** legacy v1 key-decrypt path — confirm needed or retire.

---

## 1.G — Auth & session flows (consolidates session-incident knowledge)

- **Login**: Google OAuth + email via Supabase (project `vunxamog…`); passkeys
  are TURNKEY credentials (wallet signing), not Supabase login.
- **Token path**: browser singleton client → `buildAuthHeaders()` attaches
  `session.access_token` → server `getAuthenticatedUser` does a **live**
  `auth.getUser(token)` per request (session-revocation-aware ✅, no timeout ⚠
  cand #19, adds a Supabase round-trip to all 35 authed routes — caching
  decision in Phase 3).
- **signOut**: `scope:'local'` (fixed 2026-07-20 after the global-logout
  incident). 401s render as re-auth prompts, never "$0 wallets" (fixed).
- **Wallet-connection state machine**: Turnkey present → **silent
  auto-connect** (fixed 2026-07-26); legacy-only → picker (re-import);
  external wallets (Freighter/Ledger/xBull/Lobstr/WC/HANA) via wallets-kit
  restore-from-persist (no popup on nav ✅); session-based wallets
  (Lobstr/WC) get reconnect-snackbar on dead sessions (fixed 2026-07-20).
- **Middleware**: route-protection matcher list in `middleware.ts` (auth
  pages redirect); `/rewards` removed.
- Dual-browser-client scope: reset-password page only (1.B).

---

## 1.H — Money-flow critical paths (map + strand-point inventory)

| Flow | Sequence (signatures ✍) | State persistence | Recovery | Strand points |
|---|---|---|---|---|
| **Soroswap** XLM↔USDC | quote (server→Soroswap) → ✍ fee payment (classic) → ✍ swap (Soroban) → log | `swap_logs` row **only on success** (via unauth log route) | none — fire-and-log | fee paid + swap fails → **loses 0.5 % fee** (deliberate, code-acknowledged); crash between txs leaves no server record |
| **LI.FI** BTC/ETH/SOL | quote (server) → ✍ 1 source-chain tx (PSBT/viem/web3) → bridge executes → status poll (cached route) | SwapLog w/ `lifi:` ref; status enriches feed (pending/failed/refunded) | LI.FI-side refunds surface as REFUNDED | bridge failure honesty depends on status polling; no local state machine |
| **CCTP composite** Stellar⇄chains | quote → ✍ burn (2-sig Stellar / hook burn EVM) → attestation (Iris) → relayer mint → pivot swap | **full server state machine** (`cctp_transfers`, row created BEFORE burn) | 2-min cron + opportunistic advance + recovery banner (forward-only + refund-to-USDC hatch); relayer never custodies | enumerated + mitigated (this month's hardening); overlap-idempotency = cand #21 |
| **Savings** deposit/withdraw | ✍ fee (classic) → ✍ vault op (Soroban) | `vault_deposits` on success (unauth log route) | none | same fee-first bounded loss (code comment: "user only loses the small flat fee"); **no XLM-fee preflight guard** (known TODO) |
| **Sends** (4 chains) | Stellar: server build+submit · BTC: server build → ✍ passkey → broadcast (unauth relay route) + `reattach-btc` recovery · ETH/SOL: client-signed → RPC | tx hash in activity feeds | BTC reattach path exists | broadcast failure after signing (BTC has recovery; ETH/SOL rely on nonce/retry semantics ⚠ verify Phase 2) |
| **MoneyGram** | SEP-10 → hosted UI → commit → cash leg (physical) | `moneygram_transactions` + status report-backs | status polling + detail modal refresh | "committed, never paid" → MoneyGram expires (~24 h), shown honestly |
| **Coinbase** on/off-ramp | session token (single-use, blank-tab pattern) → hosted → (off-ramp: ✍ on-chain send) | off-ramp joins **device-local** (cand #24) | status API poll | cross-device invisibility of pending off-ramps |

**Maturity gradient (the chapter's key insight):** CCTP got the
gold-standard treatment (persistent state machine, created-before-broadcast,
cron safety net, recovery UX) because it was built last and hardest;
Soroswap/savings — the OLDEST and most-used flows — have **no persistent
state and success-only logging**.

### New candidates from 1.H

26. Fee-first bounded-loss pattern (Soroswap + savings): deliberate, but
    unratified — Phase 3 should explicitly accept it or change the order/add
    a refund note in UX.
27. **Failed/abandoned swaps and deposits are invisible**: success-only,
    unauthenticated logging means a crash or failure between signatures
    leaves no server record (support blind; activity feed shows nothing).
    CCTP's row-before-broadcast pattern is the in-house template.
28. Savings lacks an XLM-fee preflight (tx_insufficient_balance mid-flow —
    known TODO from June, still open).
29. ETH/SOL send failure semantics after signing (nonce reuse/retry) —
    verify in Phase 2.

---

## 1.I — Environment & deploy matrix

### Inventory
**~46 NEXT_PUBLIC (browser-inlined) + ~40 server-only vars read in code.**
Sensitive-exposure audit of NEXT_PUBLIC: **clean** — Supabase anon keys /
Turnstile site key / rpId are public-by-design; the old fear of exposed
Helius/Alchemy keys is DISPROVED (all provider keys are server-only ✅). One
cleanup: `NEXT_PUBLIC_ONRAMPER_API_KEY` — browser-exposed key for Onramper,
whose UI is commented out (unused service, remove — cand #31).

### Finding #30 — turbo env-declaration gap (stale-build risk)
turbo.jsonc declares 57 vars, but **~55 read-in-code vars are NOT declared**
— including ~33 NEXT_PUBLIC ones (Supabase URLs/keys, contract addresses,
RPC URLs) and criticals like the CCTP relayer keys, Turnkey org keys,
SUPABASE_SERVICE_ROLE_KEY. Undeclared vars are excluded from Turborepo's
build-cache hash → **changing a NEXT_PUBLIC value may serve a cached build
with the OLD value inlined**. Server-only vars are runtime-read (unaffected),
so the risk concentrates on the NEXT_PUBLIC set. Fix: declare the full list
(or verify Vercel's env-change invalidation covers turbo cache). 

### Deploy matrix & known landmines
| Branch | Environment | Notes |
|---|---|---|
| master | Production (www.normalfinance.io) | env scope "Production" |
| develop | staging.normalfinance.io | **Preview scope** — the P0-3 lesson: vars must be All-Environments |
| feature branches | Vercel previews | Preview scope |

Landmines (documented, some fixed): schema datasource var-name misnomer
(`DATABASE_TESTNET_URL` = the real DB); `DATABASE_MAINNET_URL` ==
`DATABASE_TESTNET_URL` (split is nominal); squash-merge PRs → phantom
conflicts (5 occurrences — Phase 3 process decision); `FORCE_RATE_LIMIT`
dev bypass; legacy `DATABASE_URL` fallback still read.

### Open questions (for Niko/Justin)
1. `ADMIN_SECRET` — read in code but no admin route surfaced in 1.A; what
   uses it?
2. `cdn.normalapi.com` — hosted where, owned/paid by whom (Lightsail box)?
3. Statuspage.io account (`grmcl3nnw63w`) — owner? keep the widget at all?
4. Onramper — contract dead? (remove key + config if so)
5. `GEOIP_ENDPOINT/KEY` — which flows geo-gate today?

---

# PHASE 1 CLOSURE

### Exit criteria
- [x] Route rows == routes on disk (55 = 55)
- [x] Every Prisma model mapped or marked dead
- [x] Every grep-found SWR key/interval in the fetch-graph
- [x] Env vars classified (NEXT_PUBLIC audit clean; turbo gap = #30)
- [x] Every Phase-0 HAR host identified & registered
- [x] Surfaces→data mapping (asset-page exact hooks → Phase 2 with #16)
- [x] Candidate list + open questions delivered
- [x] Read-only: no src/config changes during mapping
- [~] Deferred to Phase 2 by design: P0-5 runtime repro (#16), Lighthouse
      synthetic runs (superseded by live Speed Insights once deployed)

### Consolidated Phase-2 candidate list (31)
#1-2 unauth DB writes + reads · #3 quota-theft routes · #4 open BTC relay ·
#5 unauth builders · #6 RL coverage 12/55 · #7/#12 dual activity systems ·
#8 relayer on default public RPCs · #9 edge/node handler cruft · #10
session-pooler exhaustion · #11 vestigial users table · #13 trailingSlash
double-calls · #14 dead savings-refresh event · #15 savings-card poll bounds
· #16 P0-5 repro · #17 good-pattern templates · #18 statuspage global load ·
#19 auth round-trip no-timeout · #20 browser-direct failure handling · #21
cron overlap idempotency · #22 SOL activity 100-credit poll (+ETH/SOL pending
gap) · #23 dune-sync atomicity · #24 offramp device-local tracking · #25
legacy v1 key path · #26 fee-first bounded loss ratification · #27 invisible
failed swaps/deposits · #28 savings XLM preflight · #29 ETH/SOL send retry
semantics · #30 turbo env declarations · #31 Onramper cleanup.
Plus P0 carryovers: P0-1/-4 (Layer-1 architecture), P0-2 (Realtime toggle),
P0-9 (Supabase Pro), Turnkey Enterprise (business).

---

## Scope additions (post-map, user-directed 2026-07-27) — 2 architecture workstreams

### #32 — External wallet ↔ Turnkey capability matrix (missing from Phase 0)

Two independent identity axes (verified): connected **Stellar** wallet signs
Stellar; **Turnkey** sub-org (keyed to Supabase user) signs EVM/BTC/SOL via
passkey. What each wallet type can actually do:

| Wallet | Signs | Can do XLM↔USDC (Soroswap) | Can do cross-chain / CCTP |
|---|---|---|---|
| Normal (Turnkey) | Stellar + EVM/BTC/SOL (passkey) | ✅ | ✅ |
| External Stellar (Lobstr/Freighter/xBull/Ledger/WC/HANA) | **Stellar only** | ✅ | ❌ — needs EVM signing they can't provide |

Current state: we **gate** cross-chain/CCTP to Normal-wallet users
(swap-card.tsx) so external wallets never hit an unsignable step. Correct
safety floor, but it means external-wallet users (most of the 400 legacy +
any Lobstr user) are locked out of cross-chain. Unblock paths (Phase 3
decides): (a) offer them a Normal/Turnkey wallet (make the gate an actionable
"create wallet" CTA); (b) the outbound-hook approach in #33 — sign ONE
Stellar burn, relayer/hook does the EVM side → external Stellar wallets could
do outbound CCTP with no EVM signing at all. **Not in Phase 0; add to Phase 2
verification + Phase 3 ranking.**

### #33 — Signature reduction → single-signature goal (esp. CCTP)

Measured user-approval counts today:

| Flow | Signatures | Why |
|---|---|---|
| Soroswap XLM↔USDC | **2** | separate classic fee payment + Soroban swap (Soroban = 1 op/tx, can't merge) |
| Savings deposit/withdraw | **2** | classic fee + Soroban vault op |
| CCTP from USDC, repeat | **~1** ✅ | burn only — approval already cached (Lever A, shipped) |
| CCTP from USDC, first time | **2** | approve + deposit_for_burn |
| **CCTP from XLM → BTC/ETH/SOL** | **up to 4** ⚠ | source swap (2) + burn (2) — the worst UX |
| CCTP destination pivot | **0** ✅ | relayer-executed, no user sig |

Already done: burn-approval caching (repeat CCTP burns skip the approve sig).
Paths to true single-signature (all architectural, Phase 3+):
- **Fee bundling** — collect the 0.5 %/flat fee inside the swap output or
  contract instead of a separate classic payment → removes one sig from
  Soroswap + savings. (Also touches finding #26 fee-first-loss.)
- **USDC-first routing** — for CCTP, avoid the pre-burn source swap where
  possible → drops the XLM-source case from 4 toward 2.
- **Intent/hook model** (the deep fix) — user signs ONE intent; a
  solver/hook/relayer executes swap+burn+pivot. This is the parked Stage-4
  work; it delivers single-sig AND unblocks #32 (external wallets). Biggest
  effort, biggest payoff.

**Both #32 and #33 are architecture workstreams (not quick fixes)** — verify
current-state in Phase 2, size the options, rank in Phase 3.
