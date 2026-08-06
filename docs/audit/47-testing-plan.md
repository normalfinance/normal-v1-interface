# 47 — Testing: what we have, how to write them, how to run them

Written for someone who has never written a test. The first suite exists and
passes as of 2026-08-06; this explains the thinking, the mechanics, and what
comes next.

---
 
## 1. What a test is, in one paragraph

A test is a small program that calls your code with known inputs and asserts
what must come back. `yarn test` runs all of them in under a second and prints
red or green. The value is not proving the code works today — you did that by
hand — it is that **the check re-runs forever, for free**, so a change made
months from now that quietly breaks an old promise turns red before it ships.
A test protects a *decision* after everyone has forgotten the decision was
made.

## 2. Why this project specifically needs them

Two incidents from our own history, not theory:

- **The deposit-shown-as-earnings bug.** `reconcileSavingsPosition` had a 20%
  threshold that looked right and was wrong. It showed a user's own deposit as
  earnings. A test asserting "a lagging deposits feed must not inflate
  earnings" would have failed the day the threshold was written.
- **The lost swap gate.** The external-wallet gate was committed on 2026-07-11
  and **silently disappeared in the squash that produced PR #466**. Nobody
  noticed for a month, because nothing was watching. A component test asserting
  "external wallet + BTC pair → disabled button" would have gone red the moment
  the gate vanished, in whatever PR did it.

That second one is the important lesson: tests are not only for catching bad
logic. They catch **good code being lost** — rebases, squashes, refactors,
"cleanup".

## 3. What exists today

| Layer | Tool | State |
|---|---|---|
| Unit (logic) | Jest 29 | **Working.** `jest.config.js` + first suite, 16 cases, ~0.7s |
| Component | Jest + Testing Library | Installed, no config conflicts, no tests yet (wave 3) |
| Browser e2e | Playwright | Configured (even loads a Freighter extension) but its 3 specs target a deleted `/explore` page — they fail. Scheduled T4 |

The boundary that keeps them apart: **Jest owns `src/**/*.test.ts`**,
**Playwright owns `tests/*.spec.ts`**. The `roots` setting in `jest.config.js`
is what enforces it.

## 4. How to run them

```bash
cd packages/web
yarn test          # run everything once
yarn test:watch    # re-run automatically as you edit — leave it open while coding
npx jest normalize # run only files matching a name
```

No server, no database, no wallet, no network. Pure functions in, assertions
out. That is why the suite runs in under a second and can run on every commit.

## 5. How to write one — anatomy of a real case

From `src/lib/portfolio/normalize.test.ts`, the case that pins the
deposit-as-earnings bug.

Start every test file with this import — do not rely on `describe`/`it` being
globally available. This monorepo (Yarn 3) hoists `@types/jest` to the root,
which the command-line compiler resolves but editor TS servers often do not;
without the import the file passes CI while the IDE shows phantom
"Cannot find name 'describe'" errors:

```ts
import { it, expect, describe } from '@jest/globals';
```

Then the case itself:

```ts
it('keeps the cached totalDeposited when the deposits feed lags a deposit', () => {
  const prev = pos(14.91, 14.91); // optimistic cache after the deposit
  const api  = pos(10.67, 14.91); // indexer still missing the deposit

  const out = reconcileSavingsPosition(api, prev);

  expect(out.totalDeposited).toBe('14.91');
  expect(parseFloat(out.earnings)).toBe(0); // NOT 4.24
});
```

The pattern is always the same three lines of thought:

1. **Arrange** — build the exact situation, with real numbers from the real
   incident where possible.
2. **Act** — call the function once.
3. **Assert** — state what must be true, and when it is a money figure, assert
   the *wrong* value is absent too (`NOT 4.24`).

House rules, matching how the rest of this project is documented:

- **Name the behaviour, not the function.** "keeps the cached totalDeposited
  when the deposits feed lags" — not "test reconcile 3". A failing test's name
  should explain the breakage by itself.
- **Anchor to incidents.** Where a case exists because of a shipped bug, the
  comment says so with the date. That turns the suite into institutional
  memory.
- **Test through the public API only.** No reaching into internals — internals
  are allowed to change; promises are not.

## 6. What to test next, in order (scheduled as T2–T4 in the roadmap)

**T2 — more pure logic (S).** Zero infrastructure needed, same pattern:
- `lib/wallet-ownership.ts` — the security decision from Block C (with a mocked
  prisma: linked-only passes, turnkey-only passes, neither is rejected)
- `lib/lifi/psbt-debug.ts` — feed `describePsbt` the hex of the real PSBT that
  broke Bitcoin swaps; assert it reports the OP_RETURN and both P2WPKH inputs.
  That fixture is documentation-as-test: the incident, preserved executable
- low-S normalisation in `btc-sign.ts` — high-S in, low-S out, r untouched

**T3 — component tests (M).** Need `@jest-environment jsdom` and Testing
Library. First target is the external-wallet swap gate: render the swap card
with `walletType: 'lobstr'`, pick a BTC pair, assert the button is disabled
with the explanation text. That is the test that makes the lost-gate incident
unrepeatable.

**T4 — Playwright cleanup (S).** Delete or rewrite the three dead specs.
Browser e2e stays *smoke-level* (pages load, gates render) — full money flows
run real transactions and belong to the human tester guide, not CI.

**Explicitly not doing:** chasing a coverage percentage. Coverage measures
lines visited, not promises kept. The order above is by where a silent
regression costs the most money.

## 7. Making them automatic

Today the suite runs when someone types `yarn test`. The follow-up (with #46 in
Block F2) is wiring it into the existing hooks so it cannot be skipped:

- **Now:** add `jest --bail --findRelatedTests` to `lint-staged` in
  `.husky/pre-commit`, so a commit touching a tested file runs its tests.
- **Soon (CI):** a GitHub Action running `tsc --noEmit`, `eslint`, `jest`, and
  `next build` on every PR. That is also the net that would have caught the
  lost gate: PR #466 would have failed its checks.

## 8. The honest limits

Unit tests will not catch: Turnkey changing API behaviour, DeFindex rate
limits, wallet extensions misbehaving, or anything that only breaks with real
network conditions. That is what staging + the tester guide are for. The two
layers cover different failure classes; neither replaces the other.
