# 09 — Phase 1 Plan: The Verified System Map

Status: **PROPOSED — awaiting Niko's go.** Phase 1 is strictly read-only:
nothing is fixed, changed, or refactored. Its single product is a map of the
system that is *complete and evidenced*, so Phase 2's audit findings and
Phase 3's ranking stand on verified ground instead of tribal knowledge.
Phase 0 proved why this matters: the app's real architecture (which database,
which project, which region, what polls what) did not match what anyone
believed.

## Objective

Produce `10-system-map.md`: every route, model, hook, poller, store, external
dependency, and scheduled job — each entry carrying **file:line evidence**,
and where Phase 0 produced runtime numbers (HARs, dev logs, dashboards), the
measured behavior cross-referenced against the code's claimed behavior.
Discrepancies between "what the code says" and "what the HAR shows" are
flagged — they are Phase 2's highest-value leads.

## Ground rules

1. **Read-only.** No code changes, no config changes, no "while I'm here."
   Anything broken found on the way is logged as a Phase 2 candidate, not
   fixed (the sole exception rule from Phase 0 — actively-lying
   infrastructure — has no known remaining instances).
2. **Pinned baseline.** The map is built against a single commit SHA
   (recorded in the doc header) so entries stay verifiable even as the code
   moves.
3. **No guessing.** Every factual claim carries file:line or a dated runtime
   measurement. Unknowns are recorded as unknowns in a dedicated "open
   questions" list — never silently assumed.
4. **Completeness is verified by arithmetic**, not by feel (see exit
   criteria: inventory counts must match filesystem/grep counts).

## The map's chapters

### 1.A — API route inventory
One table row per route under `src/app/api/` (count pinned at start). Per
route: HTTP methods · auth model (Supabase / SEP-10 / cron secret / none) ·
inputs · Prisma tables touched · external calls made (provider + endpoint) ·
caching (Redis key + TTL / none) · timeout & retry behavior · rate-limiting ·
known callers (client hooks/components, crons) · Phase 0 evidence (measured
latency, call counts) where it exists.

### 1.B — Data layer
Every Prisma model × every query call-site; existing indexes vs observed
query patterns; write paths per table (who inserts/updates); the dual
Supabase client instances and every consumer of each; connection handling
under serverless; the manual-SQL guardrail tables (old-only tables that
`prisma db push` must never touch). Output includes a table-ownership matrix:
table → readers → writers → indexes.

### 1.C — Client fetch-graph (workstream A/B foundation)
The full data-flow of the browser app: every SWR hook (key, fetcher, target
route, `refreshInterval`, `dedupingInterval`, `revalidateOnFocus`,
`keepPreviousData`) · every `setInterval`/`setTimeout` poller with its
interval and stop condition · every custom event (`nf:activity-updated` etc.)
with emitters and listeners · every direct browser→third-party call (Horizon,
Soroban RPC, mempool.space, WalletConnect, statuspage) · **the
surfaces-to-data mapping**: for each UI surface showing balances/prices/
activity (portfolio page, homepage hero, account drawer, asset pages, swap
card, savings, send/receive modals), which hooks feed it — the complete
enumeration the Layer-1 cache refactor requires so no surface keeps a private
fetch path. Cross-checked against Phase 0's HAR captures (theoretical rates
vs measured rates; P0-5's dedupe failure gets located here).

### 1.D — External dependency register
One entry per third party: endpoints used · call sites (browser vs server) ·
auth (which env var; NEXT_PUBLIC-exposed or server-only) · documented rate
limits & cost meter · failure behavior in our code (timeout? fallback? silent
catch?) · Phase 0 usage numbers. Includes the unidentified parties Phase 0
surfaced: the statuspage.io widget (P0-7 — identify which component embeds
it), `cdn.normalapi.com`, `rpc.lightsail.network` (Soroban), WalletConnect
explorer/relay/verify. Register covers: Supabase (auth + DB), Upstash,
Alchemy, Helius, Etherscan, CoinGecko, Horizon, Soroban RPC, mempool.space,
LI.FI, Soroswap, MoneyGram, Circle Iris, Turnkey, Vercel, Dune, statuspage,
fontshare/CDNs.

### 1.E — Background & scheduled work
The two Vercel crons (`dune-sync` 4h, `cctp-advance` 2min): what each reads/
writes, auth, failure modes, what happens if they double-run or stall. All
client-side watchers (BTC/ETH/SOL receive watchers, tx-status pollers, CCTP
recovery banner, MGI post-commit poll): trigger, interval, stop condition,
provider cost per tick.

### 1.F — State & storage inventory
Every Zustand store (incl. persist keys and what survives reload) · every
localStorage key (`mgiAuth.v2`, token-store caches, `nf:cb-offramp-fills`,
wallet persist, app-settings…) with writer/reader/expiry · cookies
(`normal-network` and friends) and who honors them · Edge Config usage.
For each: what happens when it's stale, wiped (Safari ITP), or lies.

### 1.G — Auth & session flows
Login flows (Google OAuth, email, passkey) → session storage → how every API
call carries auth (`buildAuthHeaders`) → server validation path → middleware
route protection list → the dual-client caveat → wallet-connection state
machine (Turnkey auto-connect, legacy picker, external wallet kit,
session-based wallets' reconnect rules).

### 1.H — Money-flow critical paths (map, not audit)
For each flow — Soroswap swap, LI.FI swap, CCTP composite swap, savings
deposit/withdraw, per-chain send/receive, MoneyGram deposit/withdraw,
Coinbase on/off-ramp: the step sequence (client → routes → providers →
chain), signature points, where state persists, retry/recovery mechanisms,
and where funds could strand. Phase 2 audits these paths; Phase 1 draws them.

### 1.I — Environment & deploy matrix
Every env var referenced in code (turbo.jsonc's declared list vs actually
read) · which are NEXT_PUBLIC (browser-exposed — flagging any that shouldn't
be) · per-environment values state (prod/staging/local) for the
already-known landmines · build/deploy pipeline (branch → environment table,
the squash-merge conflict problem documented once with its Phase 3 decision).

## Method & order of work

Day 1: 1.A routes → 1.B data layer → 1.E background work (these three share
evidence). Day 2: 1.C fetch-graph + 1.D dependency register (cross-checked
against HARs) → 1.F/1.G state & auth → 1.H money flows → 1.I env matrix →
completeness pass. Tooling: systematic grep/glob inventories with counts,
file reading for every entry, HAR/dev-log cross-reference; a running "open
questions for Niko/Justin" list instead of mid-work interruptions.

## Deliverables

1. `docs/audit/10-system-map.md` — the map, all chapters above.
2. An updated fetch-graph section feeding directly into
   `04-workstream-b-design-draft.md` (the surfaces enumeration).
3. `docs/audit/20-findings.md` seeded with Phase 2 candidates: every
   discrepancy, smell, or unknown found while mapping — recorded as
   *questions to investigate*, not conclusions.
4. The open-questions list (things only the team can answer).

## Exit criteria (Phase 1 is done when)

- [ ] Route table rows == routes on disk (count check)
- [ ] Every Prisma model appears with ≥1 verified reader/writer or is
      explicitly marked dead
- [ ] Every SWR key and interval found by grep appears in the fetch-graph
- [ ] Every env var in `.env`/turbo.jsonc is classified (used-by/exposure)
- [ ] Every third-party host observed in Phase 0 HARs has a register entry
      (incl. the currently-unidentified ones)
- [ ] All 9 UI surfaces showing balances are mapped to their hooks
- [ ] Phase 2 candidate list and open-questions list delivered
- [ ] No code/config was modified (git status clean over `src/`)

## Timeline & effort

Two working days of mapping + half a day of write-up/completeness pass.
Calendar: start on ratification; Phase 2 begins immediately after, using the
map's candidate list as its worklist.

## What I need from Niko

Nothing during execution (fully read-only, no credentials, no windows).
Just: **ratify this plan**, and answer the open-questions list when it
arrives at the end.
