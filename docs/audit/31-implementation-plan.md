# 31 — Phase 4 Implementation Plan (task by task)

Companion to `30-roadmap.md`. One section per task: what, evidence, the
options considered, **why the chosen one is optimal**, files touched,
verification, rollback. Written **after** re-reading the live code — which
corrected two Phase-1/2 claims (see the correction box below).

**Working rules for every task:** one finding per commit · no drive-by
refactors · behaviour verified before/after · nothing committed by me (Niko
commits) · a task blocked on a business decision is left unstarted, not
guessed.

---

## ⚠️ Corrections to earlier findings (found while planning #22)

Re-reading `use-user-activity.ts` and the two activity routes disproved two
things I had recorded:

1. **"Activity runs four 30-second timers"** — wrong. ETH, SOL, Stellar and
   BTC activity have **no `refreshInterval`**; they are
   `revalidateOnFocus: true` with a dedupe window. Only **three** SWRs carry a
   real 30 s timer (CCTP + two siblings, lines 447/464/503). Idle-tab cost is
   therefore lower than stated, and **tab-switching** (focus) is the real
   trigger.
2. **"#22 fix = swap the 100-credit Enhanced API for a 1-credit RPC call"** —
   wrong, and it would have been a bad change. `getSignaturesForAddress`
   returns *signatures only*; to rebuild what the UI shows we'd need
   `getTransaction` per signature (25 × 1 credit = ~26 credits, not 1) **plus**
   hand-parsing raw Solana transactions — more code, more risk, ~4× saving.
   The real waste is elsewhere (below): the **server cache TTL equals the
   client dedupe window**, so the cache almost never absorbs a request.

This is the audit working as intended: the plan is written against the code,
not against the memo. Both corrections are reflected in `20-findings.md`.

---

## Task 1 — #22: make SOL/ETH activity cheap without making it stale

**Objective.** Cut Helius (and Etherscan) upstream calls per address by ~10×
without the UI feeling slower.

**Evidence.** `activity/solana/route.ts:14` `CACHE_TTL_SECONDS = 30`;
`activity/ethereum/route.ts:15` the same; client SWRs use
`dedupingInterval: 30_000` (`use-user-activity.ts:433,439`). The cache expires
exactly as often as the client is willing to re-ask, so a user switching tabs
generates a fresh upstream call roughly every 30 s. Helius Enhanced API is
~100 credits/call, and it is 94 % of our Helius spend (`02-baseline.md:31`).

**Options considered.**
| Option | Verdict |
|---|---|
| A. Swap to plain RPC methods | ✗ ~26 credits not 1, plus hand-parsing raw txs — more risk for less gain |
| B. Drop the client dedupe/focus revalidation | ✗ fixes cost by degrading UX, and only for *our* client — a second tab or a scripted caller still burns quota |
| C. **Raise the server TTL (30 s → 300 s) + align the client, with an explicit refresh bypass** | ✓ chosen |

**Why C is optimal.** The cache sits **server-side**, so it bounds cost no
matter how many tabs, devices or anonymous callers hit the route — the ceiling
is per *address*, not per *client*. Raising TTL alone would make post-send
activity stale for up to 5 minutes, so it is paired with an explicit
`?refresh=1` bypass used only after a user action. That yields cheap for the
99 % passive case and instant for the 1 % that matters. The bypass keeps a
**30 s floor** so it cannot be used to burn quota faster than today's worst
case — the route is public (#2), so the abuse path must not widen.

**Files.** `api/activity/solana/route.ts`, `api/activity/ethereum/route.ts`,
`hooks/stellar/use-user-activity.ts`.

**Verification.** Load activity twice within 5 min → one upstream call
(Upstash key TTL + Helius dashboard delta). Send SOL → list updates
immediately via the bypass. Confirm the floor by calling `?refresh=1` twice in
a row.

**Rollback.** Revert the TTL constants; the bypass is additive and inert
without callers.

---

## Task 2 — #14: WITHDRAWN — the finding was wrong (no code written)

**What I expected.** A dead refresh event with listeners but no dispatcher.

**What the code actually shows.** The event **is** dispatched, on both success
paths: `use-defindex-savings.tsx:341` (deposit) and `:538` (withdraw), each
alongside an optimistic cache update. The refresh path is alive and, in fact,
carefully built (it also cancels stale in-flight refreshes so late responses
can't overwrite the optimistic write).

**Why the audit got it wrong.** The Phase-1 search looked for the *string*
`'nf:savings-position-updated'`. The listeners use the literal, but the
dispatcher uses the exported constant `POSITION_SYNC_EVENT` — so the emitter
was invisible to a literal-only grep. **Lesson for the remaining tasks: search
for the constant AND the literal before declaring anything dead.**

**Outcome.** #14 is **cleared**, not fixed — one line of code that would have
double-dispatched the event was *not* written. If "savings looks stale" is
still reported, the cause is elsewhere (the 30–120 s indexer lag noted at
`:333` is the likelier culprit) and needs its own investigation with a real
reproduction.

---

## Task 3 — #16: single-flight guard for the Turnkey wallet lookup

**Objective.** Collapse the ~22-request stampede to one request per 60 s.

**Evidence.** `lib/turnkey/wallet-info.ts:29-42` caches the *result* (60 s TTL)
but not the *in-flight promise*, so every caller arriving before the first
response fires its own `fetch`. Nine call sites mount together.

**Options.** (A) move every caller to the SWR hook — ✗ correct end-state but a
wide refactor across signing paths (send adapters, CCTP, LI.FI, MGI) — high
blast radius on money code for a performance fix. (B) **add an in-flight
promise to the existing module** — ✓ chosen. (C) do both now — ✗ mixes a
one-line safety fix with a risky refactor in one change.

**Why optimal.** The in-flight promise is the textbook single-flight pattern:
~5 lines, no API change, no caller touched, and it fixes the stampede for
*all* nine call sites at once. Unifying with SWR stays on the roadmap as a
separate hygiene task (#7/12 neighbourhood) where it can be reviewed on its
own merits.

**Files.** `lib/turnkey/wallet-info.ts`.

**Verification.** DevTools network on a cold portfolio load: `turnkey/wallet`
count should drop from ~22 to 1–2. Also confirm `invalidateTurnkeyWalletInfo()`
still forces a refetch (import/add-account flows depend on it).

**Rollback.** Single file, self-contained.

---

## Task 4 — #23: dune-sync insert-then-swap

**Objective.** The public dashboard must never be empty for 4 hours.

**Approach.** Build the new rows first, then swap; only clear after a
successful write. **Why optimal:** it removes the failure window entirely
rather than narrowing it, and needs no new infrastructure.

**Files.** `api/cron/dune-sync/route.ts`. **Verify:** dry-run with a forced
mid-way failure; dashboard still shows the previous data.

---

## Task 5 — #18/#31/#36: dead-weight removal (three tiny, separate commits)

- **#18** remove the globally-loaded Statuspage widget (nobody owns the
  account; it costs every visitor a script + 2 polls/min).
- **#31** delete the Onramper key and config (service commented out).
- **#36** delete the unreachable `ADMIN_SECRET` bypass in `wallets/link`.

**Why optimal:** deletion is the cheapest and safest possible fix, and #36
specifically removes a footgun before a future maintainer "repairs" it into a
working auth bypass.

---

## Not started, and why

- **#35 (geo-blocking)** — blocked on Niko/Justin: was it disabled
  deliberately? Restoring it **changes who can use the product**, so it is a
  business decision, not a code decision. Plan is ready (Vercel edge geo).
- **P0-2 (Realtime off)** — a Supabase dashboard toggle, Niko's click.
- **Waves 2–5** — sequenced in `30-roadmap.md`; several depend on the six
  open decisions.
