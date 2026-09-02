# 53 — Component tests, explained through the swap gate

The app's first component test exists: `src/sections/swap/swap-card.test.tsx`,
five cases pinning the external-wallet swap gate. This explains what a
component test is, why this gate earned the first one, and how to copy the
pattern — because the whole point of the first one is that every later one is
cheap.

---

## 1. The three layers of testing, and where this fits

- **Unit tests** call a pure function with inputs and check outputs
  (`normalize.test.ts` — money math).
- **Conformance tests** scan the codebase for structural promises
  (`route-auth-conformance.test.ts` — every route authenticates).
- **Component tests** — this layer — render a real piece of UI in a simulated
  browser and assert **what a user would actually see and touch**: this
  button is disabled, this warning is visible, this text says why.

The third layer catches what the first two can't: logic that lives in the
wiring between state and screen. The swap gate is exactly that — a `useMemo`
and a ternary inside a component. No pure function to unit-test; no file
pattern to scan for. Either you render the card, or you don't test it.

## 2. Why the swap gate got the first one

It is the only code in this project that was **written, shipped, silently
deleted by a squash-merge (PR #466, July 2026), and rewritten a month
later**. Nobody noticed the deletion for weeks, because nothing was watching.
Every guard built since — CI, merge-commit policy, the auth conformance test
— lowers the odds of a repeat. This test makes the odds zero: any change that
drops the gate turns CI red **on the PR that drops it**, with a test name
that explains what was lost.

That's the deeper idea worth internalizing: **a component test protects a
decision, not just code.** "External wallets are Stellar-only" is a product
decision. Code implementing a decision can be lost in a refactor by someone
who never knew the decision existed. A failing test named after the decision
is how the decision defends itself.

## 3. What the five cases pin — including the invisible half

1. External wallet + BTC pair → the CTA is the **disabled** gate button with
   the explanation text, and the engine's own button is unreachable.
2. External wallet + BTC pair → **quote fetching is switched off** — the
   mocks capture the props the card passes to its engines and assert
   `enabled: false`. This is the half of the gate no screenshot shows: a
   hybrid user would otherwise burn LI.FI quota on quotes the button will
   never execute. UI tests can and should assert invisible contracts too.
3. External wallet + XLM↔USDC → **no gate, fully enabled.** Protecting what
   must keep working is as important as protecting what must be blocked —
   without this case, someone could "fix" a bug by gating everything.
4. Normal wallet + BTC → no gate. The decision's other side.
5. Signed in with no wallet at all → no gate, engines enabled — documents
   that the per-chain setup dialogs own that scenario, so nobody "helpfully"
   extends the gate over it later.

## 4. How it's built — the pattern to copy

**Render the real component; mock its boundaries.** The gate lives in
`SwapCard`, so the card must be real — a mocked card tests nothing. Around
it, everything that talks to the world is replaced: the three engines (they
fetch quotes), the balance hooks, the stores, the translation hook. The mocks
are *contract-faithful* — the first run failed because the stub returned a
string where the engine contract says BigNumber. A mock that violates the
contract tests a component that doesn't exist.

Mechanics a copier needs to know (all learned the hard way, all already
paid for):

- `@jest-environment jsdom` docblock at the top — components need a DOM;
  logic tests stay on node.
- **Mock-then-require**: `jest.mock(...)` calls first, then
  `require('./swap-card')` — this repo's transform doesn't reliably hoist
  mocks above ESM imports (documented in 47-testing-plan.md).
- Mutable state the factories close over must be `mock`-prefixed
  (`mockWalletState`) — tests then flip `walletType` per case instead of
  re-mocking.
- Import `@testing-library/jest-dom/jest-globals` — the `/jest-globals`
  entry, because our tests import `expect` from `@jest/globals`; the default
  entry only types the ambient global.
- Drive scenarios through **props** (`initial="BTC"`), not click
  choreography, when the same code path is reached either way — clicking
  through pickers adds brittleness without adding proof.

## 5. What this unlocks

The expensive part of the first component test is the scaffolding — the
environment, the boundary mocks, the entry-point quirks. That's now paid.
Queued candidates that copy this file almost line for line: the memo-required
send gate (finding #48's UI), the pending-send badge, the savings-card
loading states.

## 6. A bonus fix that rode along

The recurring "N files fail Prettier that nobody touched" churn on Windows
was diagnosed and permanently fixed: committed content is LF (CI proves it —
prettier passes there), but Windows checkouts were materializing CRLF, which
local Prettier flags. A `.gitattributes` (`* text=auto eol=lf`) now pins
checkouts to LF on every machine. That class of noise is over.
