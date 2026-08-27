# 96 — LI.FI support report: poisoned "fly" DEX step on Base (copy-paste ready)

**Status:** ready to send. Channels: LI.FI Discord `#dev-support`, or support@li.fi, or the partner
Telegram if Justin has one. Integrator: `normalfinance`.

**Why urgent:** this single DEX step has reverted **five** live user transactions across **three
different bridges** in two days. Every LI.FI integrator quoting USDC on Base is likely affected.
We have blocked it locally (`denyExchanges=fly`) — they need to fix it at the routing layer.

---

## Message to send

> **Subject: Routes including the "fly" exchange step on Base revert 100% — fake TSLA token in the path**
>
> Hi — integrator `normalfinance`. We're reporting a routing bug that has cost us five reverted
> mainnet transactions in two days. Every failure shares one element, and it is not the bridge.
>
> **Summary:** any quote we receive for **USDC (Base, 8453) → SOL / ETH** that includes the
> `fly` exchange step as the pre-swap reverts on-chain. We have seen it wrapped in three
> different bridges — `mayan`, `relay`, and `across` — so the bridge is incidental; the swap step
> is the constant.
>
> **Root cause (verified by replaying each transaction at its historic block):** the route's swap
> step calls `transfer()` on `0x030B6C444B1074Fce5112839b3613a6Efb52F784`, an unverified contract
> on Base that identifies itself as "Tesla (TSLA)". That call always reverts, so the whole
> transaction reverts inside the LI.FI diamond:
>
> ```
> WrappedError(
>   target   = 0x030B6C444B1074Fce5112839b3613a6Efb52F784,
>   selector = 0xa9059cbb,            // transfer(address,uint256)
>   details  = 0xf27f64e4             // ERC20TransferFailed()
> )
> ```
>
> **Affected transactions (Base mainnet, all from `0xc8351b803fdbb9f6b8738f201d6cdfca34c0784d`):**
>
> | tx | outer function | bridge in route |
> |---|---|---|
> | `0x7aa6440cfacc686f7eb026b019a2f76f1dab9fdd955b750f8c1cf756101a69d8` | `swapAndStartBridgeTokensViaMayan` (0x80c65808) | mayan |
> | `0x8623b4aeb4f01212ebde014d6d8f907b7e66ec4404c9430bf617c3de2341218f` | `swapAndStartBridgeTokensViaRelayDepository` (0xa3443faa) | relay |
> | `0x900a7bb1ab3d75b7371fc9d3cace22c9fe509e76044bf5eea9ccc1d25515448e` | `swapAndStartBridgeTokensViaMayan` | mayan |
> | `0x3bc6c80b9908af61a05d853d78658d5db659d9c36e3d3f514bb70269fc75d96b` | `swapAndStartBridgeTokensViaMayan` | mayan |
> | `0xd93f48472543658930d63049814dd30e01bddecda9fa5eea7cf451d62bf39071` | (0x1794958f) | across |
>
> In every case the TSLA address appears in the calldata, and the transaction consumed ~500k gas
> before reverting with zero logs.
>
> **Reproducible right now:** request a quote for USDC (8453) → SOL with no deny list. The quote
> we get back includes `includedSteps: [{ type: "swap", tool: "fly" }, { type: "cross", ... }]`,
> and its `transactionRequest.data` contains `030b6c444b1074fce5112839b3613a6efb52f784`. Adding
> `denyExchanges=fly` produces a clean route (e.g. NEAR intents) that succeeds — that is our
> current workaround.
>
> **What we're asking:** please blacklist that token/pool from the `fly` step's routing on Base
> (or de-list the step there until it is fixed). Happy to provide anything else — full traces,
> quote payloads, or timing.
>
> Thanks!

---

## Notes for us (do not send)

- Our workaround is `LIFI_DENY_EXCHANGES` (default `fly`) in `server/lifi-quote.ts` — applied to
  every quote, not just retries. Remove the default once LI.FI confirms the fix, and re-test one
  USDC→SOL swap before trusting it.
- Doc 95 finding: `??` only catches `undefined`, so setting the env to `""` silently disables the
  blocklist — Wave 6 hardens that.
- If they ask how we found it: `eth_call` replay of each reverted tx at its block, decoding the
  ERC-7751 `WrappedError` (selector `0x90bfb865`) and its inner `details`.
