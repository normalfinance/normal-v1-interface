// Single source of truth for the "leave gas behind" reserve that MAX applies on
// a source chain. Both engines that spend ETH on the source leg — the LI.FI
// same-group engine and the CCTP cross-ecosystem engine — call this, so their
// ETH reserves can never drift apart again (they used to: LI.FI computed it live
// while CCTP used a flat 0.003, which over-reserved ~40% of a small balance).

import { ETH_RPC_URL } from '@/hooks/use-chain-portfolio';

// The reserve is sized to the LIVE gas price so it tracks real conditions, then
// clamped: a floor for ultra-low gas, and a ceiling so a spike can't gut MAX.
// Under-reserving is the dangerous side (the swap fails "insufficient funds for
// gas"), so the gas limit passed by callers is deliberately generous and the
// fallback is the old safe flat value.
const ETH_RESERVE_MIN = 0.0005;
const ETH_RESERVE_MAX = 0.02;
const ETH_RESERVE_FALLBACK = 0.003;
const GAS_PRICE_BUFFER_NUM = 16n; // 1.6× headroom for gas drift between the MAX
const GAS_PRICE_BUFFER_DEN = 10n; // click and the actual signature/broadcast.

/**
 * ETH (in whole ETH) to leave behind for the source swap's gas, from the live
 * mainnet gas price × `gasLimit` × 1.6, clamped. Never throws — a failed/slow
 * RPC falls back to a safe flat reserve so MAX always resolves.
 *
 * @param gasLimit expected gas for the source tx. LI.FI same-group swap ≈ 250k;
 *   the CCTP path is a bridge and passes more (400k) for safety headroom.
 */
import useSWR from 'swr';
import { abortTimeout } from '@/utils/abort-timeout';

/**
 * Live ETH gas reserve as a hook — the swap card holds this back from
 * SPENDABLE ETH (like #67 holds the XLM reserve), so typed amounts, MAX,
 * display and validation all inherit it from one number. Falls back to the
 * flat 0.003 until the live figure arrives; refreshes every minute.
 */
export function useEthGasReserve(enabled: boolean, gasLimit: bigint = 250_000n): number {
  const { data } = useSWR(
    enabled ? ['eth-gas-reserve', gasLimit.toString()] : null,
    () => ethGasReserve(gasLimit),
    { refreshInterval: 60_000, dedupingInterval: 30_000, revalidateOnFocus: false }
  );
  return data ?? 0.003;
}

/** The raw node error for value+gas > balance, mapped so users never see an
 *  RPC dump (observed live 2026-08-19). */
export function isInsufficientGasError(err: unknown): boolean {
  return /insufficient funds for gas/i.test(
    String((err as { message?: string })?.message ?? err ?? '')
  );
}

export async function ethGasReserve(gasLimit: bigint = 250_000n): Promise<number> {
  try {
    const res = await fetch(ETH_RPC_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'eth_gasPrice', params: [] }),
      signal: abortTimeout(6000),
    });
    const data = await res.json();
    const gasPriceWei = BigInt(data.result);
    // All-BigInt math, then a single Number() (safe). Never `**` on a BigInt —
    // it transpiles to Math.pow() and throws at runtime.
    const gasCostEth =
      Number((gasPriceWei * gasLimit * GAS_PRICE_BUFFER_NUM) / GAS_PRICE_BUFFER_DEN) / 1e18;
    return Math.min(Math.max(gasCostEth, ETH_RESERVE_MIN), ETH_RESERVE_MAX);
  } catch {
    return ETH_RESERVE_FALLBACK;
  }
}
