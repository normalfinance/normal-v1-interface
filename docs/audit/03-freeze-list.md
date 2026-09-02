# 03 — Freeze List (PROPOSED — awaiting ratification)

Status: **DRAFT for Niko to mark up.**

## What this document is

The list of things the optimization effort **will not change**, agreed up
front. Purpose: the audit (Phase 2) does not waste days evaluating "should we
replace X" for an X we'd never replace this summer — and no fix (Phase 4)
quietly rewrites something load-bearing. Frozen ≠ perfect; frozen = "not this
effort." Anything can still be *criticized* in the findings; it just can't be
*replaced* before the deadline.

## Proposed frozen items

| Item | What stays | Why frozen |
|------|-----------|------------|
| Turnkey custody | Passkey sub-org wallet model for BTC/ETH/SOL/Stellar | Core product architecture; replacement = months |
| Supabase | Auth + Postgres as the platform | Migration risk during a scale push is maximal |
| Vercel | Hosting/serverless platform | Same |
| Next.js app-router + MUI | Frontend stack | Rewrite ≠ optimization |
| CCTP integration | Contracts, pilot caps, relayer design as shipped | Just stabilized; audited separately |
| MoneyGram integration | As shipped July 2026 | Just stabilized; blockers are on MoneyGram's side |
| Stellar as core chain | XLM/USDC rails, Soroswap, DeFindex savings | Product identity |
| Product scope | No new features land inside the optimization window | Scope discipline until the deadline |

## Explicitly NOT frozen (fair game for Phase 4 fixes)

Data-fetching architecture (caching, batching, invalidation), provider/API
selection and tiers (e.g. which RPC or price API, free-tier moves), database
indexes and query shapes, client state/hook structure, polling intervals and
event wiring, error handling and observability tooling, build/deploy hygiene
(migrations, env naming, branch workflow).

## Ratification

- [ ] Items added/struck by Niko
- [ ] Ratified on: ____
