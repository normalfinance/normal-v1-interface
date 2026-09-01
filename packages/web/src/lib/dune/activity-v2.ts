// ---------------------------------------------------------------------------
// Dune dashboard v2 — PURE row builders (doc 119).
//
// The old dashboard was Stellar-only. v2 covers every product: Soroswap and
// LI.FI swaps (both live in swap_logs — LI.FI rows are marked by their
// synthetic `lifi:` token address), CCTP bridges, savings, sends and ramps.
// Everything here is dependency-free and jest-covered; the IO (prisma reads,
// balance fan-out, Dune upload) lives in services/dune-sync-v2.ts.
//
// Honesty rules (doc 118 §2):
//  - only terminal rows are uploaded; `status` is normalized so queries can
//    filter `status = 'completed'` for volume without knowing each product's
//    private vocabulary;
//  - CCTP amounts prefer the REALIZED source amount recorded at creation;
//  - amount_usd is stamped ONCE at sync time from our own price source. For
//    non-stable assets that means historical rows are valued at today's
//    price — stated plainly on the dashboard rather than hidden.
// ---------------------------------------------------------------------------

import { parseFailedTool, parseFailedExchanges } from '@/lib/cctp/failure-class';

export interface ActivityV2Row {
  date: string; // ISO
  wallet_address: string;
  product: 'soroswap' | 'lifi' | 'cctp' | 'savings' | 'send' | 'ramp';
  action: 'swap' | 'deposit' | 'withdraw' | 'send' | 'onramp' | 'offramp';
  provider: string; // soroswap | lifi | cctp | defindex | native | moneygram | coinbase | ...
  chain: string; // source chain of the action
  asset_in: string;
  asset_out: string;
  amount_token: number; // in asset_in units
  amount_usd: number;
  fee_usd: number;
  status: 'completed' | 'failed' | 'refunded';
  tx_hash: string;
  network: string;
}

export interface CctpOpsRow {
  created_at: string;
  completed_at: string | null;
  direction: 'in' | 'out';
  status: string; // raw machine status — COMPLETED | FAILED | REFUNDED
  src_asset: string;
  dst_asset: string;
  amount_usd: number;
  duration_seconds: number | null; // COMPLETED rows only
  revert_tool: string | null; // which bridge reverted, parsed from errorDetail
  revert_exchanges: string | null; // which DEX steps reverted
  network: string;
}

export interface WalletChainRow {
  date: string; // day the address was provisioned
  chain: 'bitcoin' | 'ethereum' | 'solana' | 'stellar';
  wallets_added: number;
  network: string;
}

export interface HoldingsSnapshotRow {
  snapshot_date: string;
  chain: string;
  asset: string; // BTC | ETH | SOL | XLM | USDC | SAVINGS
  wallets_counted: number;
  balance_total: number; // token units (USD for SAVINGS)
  usd_total: number;
  network: string;
}

export type PriceMap = Record<string, number>; // symbol -> USD

const CHAIN_OF_ASSET: Record<string, string> = {
  BTC: 'bitcoin',
  ETH: 'ethereum',
  SOL: 'solana',
  XLM: 'stellar',
  USDC: 'stellar',
  nUSDC: 'stellar',
};

export function usdOf(symbol: string, amount: number, prices: PriceMap): number {
  if (!Number.isFinite(amount) || amount <= 0) return 0;
  if (symbol === 'USDC' || symbol === 'nUSDC') return amount;
  const p = prices[symbol];
  return Number.isFinite(p) && p > 0 ? amount * p : 0;
}

/** LI.FI rows in swap_logs carry synthetic `lifi:<SYM>` token addresses —
 *  the one reliable discriminator (pairs alone would misfile nothing today,
 *  but the address was written for exactly this purpose). */
export function swapEngineOf(tokenInAddress: string | null | undefined): 'soroswap' | 'lifi' {
  return String(tokenInAddress ?? '').startsWith('lifi:') ? 'lifi' : 'soroswap';
}

// ---- input shapes: exactly the prisma selects, no ORM types ---------------

export interface SwapLogInput {
  createdAt: Date;
  walletAddress: string;
  tokenInAddress: string;
  tokenInSymbol: string | null;
  tokenOutSymbol: string | null;
  amountIn: string;
  feeAmount: string | null;
  txHash: string | null;
  network: string | null;
}

export interface VaultDepositInput {
  createdAt: Date;
  walletAddress: string;
  type: string;
  amount: string;
  feeAmount: string | null;
  txHash: string | null;
  network: string | null;
}

export interface CctpInput {
  createdAt: Date;
  updatedAt: Date;
  userId: string;
  direction: string;
  status: string;
  srcAsset: string;
  dstAsset: string;
  srcAmount: string | null;
  srcAddress: string;
  quoteJson: string | null;
  errorDetail: string | null;
  network: string;
}

export interface SendLogInput {
  createdAt: Date;
  walletAddress: string;
  chain: string;
  symbol: string | null;
  amount: string;
  txHash: string | null;
  network: string | null;
}

export interface RampInput {
  createdAt: Date;
  walletAddress: string;
  direction: string; // onramp | offramp
  provider: string;
  asset: string;
  chain: string;
  amountFinal: string | null;
  amountExpected: string | null;
  status: string;
}

export interface MgiInput {
  createdAt: Date;
  walletAddress: string;
  kind: string; // deposit | withdrawal
  status: string;
  amount: string | null;
}

export function buildActivityV2Rows(
  input: {
    swaps: SwapLogInput[];
    deposits: VaultDepositInput[];
    cctp: CctpInput[];
    sends: SendLogInput[];
    ramps: RampInput[];
    mgi: MgiInput[];
  },
  prices: PriceMap,
  defaultNetwork: string
): ActivityV2Row[] {
  const rows: ActivityV2Row[] = [];

  for (const s of input.swaps) {
    const engine = swapEngineOf(s.tokenInAddress);
    const assetIn = s.tokenInSymbol ?? 'UNKNOWN';
    const amount = Number(s.amountIn ?? 0);
    rows.push({
      date: s.createdAt.toISOString(),
      wallet_address: s.walletAddress,
      product: engine,
      action: 'swap',
      provider: engine,
      chain: CHAIN_OF_ASSET[assetIn] ?? 'stellar',
      asset_in: assetIn,
      asset_out: s.tokenOutSymbol ?? 'UNKNOWN',
      amount_token: amount,
      amount_usd: usdOf(assetIn, amount, prices),
      // Soroswap fees are charged in the source token; LI.FI integrator fees
      // are configured in bps of the source amount and settle on-chain.
      fee_usd: usdOf(assetIn, Number(s.feeAmount ?? 0), prices),
      status: 'completed', // only confirmed rows are passed in
      tx_hash: s.txHash ?? '',
      network: s.network ?? defaultNetwork,
    });
  }

  for (const d of input.deposits) {
    const isDeposit = d.type === 'deposit';
    const amount = Number(d.amount ?? 0);
    rows.push({
      date: d.createdAt.toISOString(),
      wallet_address: d.walletAddress,
      product: 'savings',
      action: isDeposit ? 'deposit' : 'withdraw',
      provider: 'defindex',
      chain: 'stellar',
      asset_in: isDeposit ? 'USDC' : 'nUSDC',
      asset_out: isDeposit ? 'nUSDC' : 'USDC',
      amount_token: amount,
      amount_usd: amount, // USDC
      fee_usd: Number(d.feeAmount ?? 0),
      status: 'completed',
      tx_hash: d.txHash ?? '',
      network: d.network ?? defaultNetwork,
    });
  }

  for (const c of input.cctp) {
    const amount = Number(c.srcAmount ?? 0);
    const amountUsd = usdOf(c.srcAsset, amount, prices);
    rows.push({
      date: c.createdAt.toISOString(),
      wallet_address: c.srcAddress,
      product: 'cctp',
      action: 'swap',
      provider: 'cctp',
      chain: CHAIN_OF_ASSET[c.srcAsset] ?? 'stellar',
      asset_in: c.srcAsset,
      asset_out: c.dstAsset,
      amount_token: amount,
      amount_usd: amountUsd,
      fee_usd: amountUsd * cctpFeePercent(c.quoteJson),
      status: normalizeCctpStatus(c.status),
      tx_hash: '', // multi-leg — leg hashes live in normal_cctp_ops
      network: c.network,
    });
  }

  for (const s of input.sends) {
    const sym = s.symbol ?? 'UNKNOWN';
    const amount = Number(s.amount ?? 0);
    rows.push({
      date: s.createdAt.toISOString(),
      wallet_address: s.walletAddress,
      product: 'send',
      action: 'send',
      provider: 'native',
      chain: s.chain,
      asset_in: sym,
      asset_out: sym,
      amount_token: amount,
      amount_usd: usdOf(sym, amount, prices),
      fee_usd: 0,
      status: 'completed',
      tx_hash: s.txHash ?? '',
      network: s.network ?? defaultNetwork,
    });
  }

  for (const r of input.ramps) {
    const amount = Number(r.amountFinal ?? r.amountExpected ?? 0);
    rows.push({
      date: r.createdAt.toISOString(),
      wallet_address: r.walletAddress,
      product: 'ramp',
      action: r.direction === 'offramp' ? 'offramp' : 'onramp',
      provider: r.provider,
      chain: r.chain,
      asset_in: r.asset,
      asset_out: r.asset,
      amount_token: amount,
      amount_usd: usdOf(r.asset, amount, prices),
      fee_usd: 0,
      status: 'completed', // only arrived/settled rows are passed in
      tx_hash: '',
      network: defaultNetwork,
    });
  }

  for (const m of input.mgi) {
    const amount = Number(m.amount ?? 0);
    if (amount <= 0) continue;
    rows.push({
      date: m.createdAt.toISOString(),
      wallet_address: m.walletAddress,
      product: 'ramp',
      action: m.kind === 'withdrawal' ? 'offramp' : 'onramp',
      provider: 'moneygram',
      chain: 'stellar',
      asset_in: 'USDC',
      asset_out: 'USDC',
      amount_token: amount,
      amount_usd: amount,
      fee_usd: 0,
      status: 'completed',
      tx_hash: '',
      network: defaultNetwork,
    });
  }

  return rows;
}

function normalizeCctpStatus(status: string): 'completed' | 'failed' | 'refunded' {
  if (status === 'COMPLETED') return 'completed';
  if (status === 'REFUNDED') return 'refunded';
  return 'failed';
}

/** The fee share for a CCTP swap, from the quote snapshot on the row. A
 *  malformed snapshot means 0 — never a guess. */
export function cctpFeePercent(quoteJson: string | null): number {
  if (!quoteJson) return 0;
  try {
    const q = JSON.parse(quoteJson);
    const p = Number(q?.feePercent);
    return Number.isFinite(p) && p > 0 && p < 1 ? p : 0;
  } catch {
    return 0;
  }
}

export function buildCctpOpsRows(rows: CctpInput[], prices: PriceMap): CctpOpsRow[] {
  return rows.map((c) => {
    const completed = c.status === 'COMPLETED';
    const amount = Number(c.srcAmount ?? 0);
    return {
      created_at: c.createdAt.toISOString(),
      completed_at: completed ? c.updatedAt.toISOString() : null,
      direction: c.direction === 'crosschain_to_stellar' ? 'in' : 'out',
      status: c.status,
      src_asset: c.srcAsset,
      dst_asset: c.dstAsset,
      amount_usd: usdOf(c.srcAsset, amount, prices),
      duration_seconds: completed
        ? Math.max(0, Math.round((c.updatedAt.getTime() - c.createdAt.getTime()) / 1000))
        : null,
      revert_tool: parseFailedTool(c.errorDetail) ?? null,
      revert_exchanges: parseFailedExchanges(c.errorDetail)?.join('+') || null,
      network: c.network,
    };
  });
}

export interface TurnkeyWalletInput {
  createdAt: Date;
  bitcoinAddress: string | null;
  ethereumAddress: string | null;
  solanaAddress: string | null;
  stellarAddress: string | null;
}

export function buildWalletChainRows(
  wallets: TurnkeyWalletInput[],
  network: string
): WalletChainRow[] {
  const byDayChain = new Map<string, number>();
  for (const w of wallets) {
    const day = w.createdAt.toISOString().slice(0, 10) + 'T00:00:00.000Z';
    const chains: WalletChainRow['chain'][] = [];
    if (w.bitcoinAddress) chains.push('bitcoin');
    if (w.ethereumAddress) chains.push('ethereum');
    if (w.solanaAddress) chains.push('solana');
    if (w.stellarAddress) chains.push('stellar');
    for (const chain of chains) {
      const key = `${day}|${chain}`;
      byDayChain.set(key, (byDayChain.get(key) ?? 0) + 1);
    }
  }
  return Array.from(byDayChain.entries()).map(([key, wallets_added]) => {
    const [date, chain] = key.split('|');
    return { date, chain: chain as WalletChainRow['chain'], wallets_added, network };
  });
}

export interface ChainHoldings {
  chain: string;
  asset: string;
  wallets: number;
  total: number; // token units
}

export function buildHoldingsRows(
  holdings: ChainHoldings[],
  savingsTvlUsd: number,
  prices: PriceMap,
  network: string,
  snapshotDate: string
): HoldingsSnapshotRow[] {
  const rows: HoldingsSnapshotRow[] = holdings.map((h) => ({
    snapshot_date: snapshotDate,
    chain: h.chain,
    asset: h.asset,
    wallets_counted: h.wallets,
    balance_total: h.total,
    usd_total: usdOf(h.asset, h.total, prices),
    network,
  }));
  if (savingsTvlUsd > 0) {
    rows.push({
      snapshot_date: snapshotDate,
      chain: 'stellar',
      asset: 'SAVINGS',
      wallets_counted: 0,
      balance_total: savingsTvlUsd,
      usd_total: savingsTvlUsd,
      network,
    });
  }
  return rows;
}
