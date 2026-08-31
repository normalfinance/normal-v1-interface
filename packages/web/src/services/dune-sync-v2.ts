// ---------------------------------------------------------------------------
// Dune dashboard v2 — IO orchestrators (doc 119). Pure row logic lives in
// lib/dune/activity-v2.ts; this file only reads (prisma, chain balances,
// DeFindex TVL, spot prices) and hands the data to the builders.
// ---------------------------------------------------------------------------

import type {
  PriceMap,
  CctpOpsRow,
  ActivityV2Row,
  ChainHoldings,
  WalletChainRow,
  HoldingsSnapshotRow,
} from '@/lib/dune/activity-v2';

import { prisma } from '@/lib/prisma';
import { getSpotPrices } from '@/lib/portfolio/aggregate';
import { getStellarConfigForNetwork } from '@normalfinance/utils';
import { fetchStellarBalancesFromPool } from '@/lib/stellar/horizon-pool';
import {
  buildCctpOpsRows,
  buildHoldingsRows,
  buildActivityV2Rows,
  buildWalletChainRows,
} from '@/lib/dune/activity-v2';

const NETWORK =
  process.env.NEXT_PUBLIC_NETWORK?.toLowerCase() === 'mainnet' ? 'mainnet' : 'testnet';

async function priceMap(): Promise<PriceMap> {
  const spot = await getSpotPrices();
  return spot.prices;
}

const CCTP_SELECT = {
  createdAt: true,
  updatedAt: true,
  userId: true,
  direction: true,
  status: true,
  srcAsset: true,
  dstAsset: true,
  srcAmount: true,
  srcAddress: true,
  quoteJson: true,
  errorDetail: true,
  network: true,
} as const;

const CCTP_TERMINAL = ['COMPLETED', 'FAILED', 'REFUNDED'];

export async function fetchActivityV2(): Promise<ActivityV2Row[]> {
  const [prices, swaps, deposits, cctp, sends, ramps, mgi] = await Promise.all([
    priceMap(),
    prisma.swapLog.findMany({
      where: { status: 'confirmed' },
      select: {
        createdAt: true,
        walletAddress: true,
        tokenInAddress: true,
        tokenInSymbol: true,
        tokenOutSymbol: true,
        amountIn: true,
        feeAmount: true,
        txHash: true,
        network: true,
      },
      orderBy: { createdAt: 'asc' },
    }),
    prisma.vaultDeposit.findMany({
      where: { status: 'confirmed' },
      select: {
        createdAt: true,
        walletAddress: true,
        type: true,
        amount: true,
        feeAmount: true,
        txHash: true,
        network: true,
      },
      orderBy: { createdAt: 'asc' },
    }),
    prisma.cctpTransfer.findMany({
      where: { status: { in: CCTP_TERMINAL } },
      select: CCTP_SELECT,
      orderBy: { createdAt: 'asc' },
    }),
    prisma.sendLog.findMany({
      where: { status: 'confirmed' },
      select: {
        createdAt: true,
        walletAddress: true,
        chain: true,
        symbol: true,
        amount: true,
        txHash: true,
        network: true,
      },
      orderBy: { createdAt: 'asc' },
    }),
    prisma.rampTransfer.findMany({
      where: { status: 'arrived' },
      select: {
        createdAt: true,
        walletAddress: true,
        direction: true,
        provider: true,
        asset: true,
        chain: true,
        amountFinal: true,
        amountExpected: true,
        status: true,
      },
      orderBy: { createdAt: 'asc' },
    }),
    prisma.moneyGramTransaction.findMany({
      where: { status: 'completed' },
      select: {
        createdAt: true,
        walletAddress: true,
        kind: true,
        status: true,
        amount: true,
      },
      orderBy: { createdAt: 'asc' },
    }),
  ]);

  return buildActivityV2Rows({ swaps, deposits, cctp, sends, ramps, mgi }, prices, NETWORK);
}

export async function fetchCctpOps(): Promise<CctpOpsRow[]> {
  const [prices, cctp] = await Promise.all([
    priceMap(),
    prisma.cctpTransfer.findMany({
      where: { status: { in: CCTP_TERMINAL } },
      select: CCTP_SELECT,
      orderBy: { createdAt: 'asc' },
    }),
  ]);
  return buildCctpOpsRows(cctp, prices);
}

export async function fetchWalletChains(): Promise<WalletChainRow[]> {
  const wallets = await prisma.turnkeyWallet.findMany({
    select: {
      createdAt: true,
      bitcoinAddress: true,
      ethereumAddress: true,
      solanaAddress: true,
      stellarAddress: true,
    },
  });
  return buildWalletChainRows(wallets, NETWORK);
}

// ---------------------------------------------------------------------------
// Holdings snapshot — "how much of every asset do our users hold RIGHT NOW".
// One append-only row set per day; combined-TVL charts join this with the
// savings snapshots. History starts the day this ships — balances cannot be
// read retroactively.
// ---------------------------------------------------------------------------

const BATCH = 5;
const BATCH_DELAY_MS = 400;

async function rpcCall(url: string, method: string, params: unknown[]): Promise<any> {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
    signal: AbortSignal.timeout(8_000),
  });
  if (!res.ok) throw new Error(`rpc ${method} ${res.status}`);
  const data = await res.json();
  if (data.error) throw new Error(data.error.message ?? `rpc ${method}`);
  return data.result;
}

export async function fetchHoldingsSnapshot(savingsTvlUsd: number): Promise<HoldingsSnapshotRow[]> {
  const [prices, wallets, linked] = await Promise.all([
    priceMap(),
    prisma.turnkeyWallet.findMany({
      select: {
        bitcoinAddress: true,
        ethereumAddress: true,
        solanaAddress: true,
        stellarAddress: true,
      },
    }),
    prisma.linkedWallet.findMany({ select: { walletAddress: true } }),
  ]);

  const btcAddrs = wallets.map((w) => w.bitcoinAddress).filter((a): a is string => !!a);
  const ethAddrs = wallets.map((w) => w.ethereumAddress).filter((a): a is string => !!a);
  const solAddrs = wallets.map((w) => w.solanaAddress).filter((a): a is string => !!a);
  const stellarAddrs = Array.from(
    new Set([
      ...wallets.map((w) => w.stellarAddress).filter((a): a is string => !!a),
      ...linked.map((l) => l.walletAddress),
    ])
  );

  const ethUrl = process.env.NEXT_PUBLIC_ETH_RPC_URL || 'https://ethereum-rpc.publicnode.com';
  const solUrl = process.env.NEXT_PUBLIC_SOLANA_RPC_URL || 'https://solana-rpc.publicnode.com';
  const cfg = getStellarConfigForNetwork(NETWORK as 'mainnet' | 'testnet');
  const horizonUrls = cfg.HORIZON_URLS ?? [cfg.HORIZON_URL];

  let btcTotal = 0;
  let btcOk = 0;
  let ethTotal = 0;
  let ethOk = 0;
  let solTotal = 0;
  let solOk = 0;
  let xlmTotal = 0;
  let usdcTotal = 0;
  let stellarOk = 0;

  const runBatched = async (addrs: string[], one: (a: string) => Promise<void>) => {
    for (let i = 0; i < addrs.length; i += BATCH) {
      await Promise.allSettled(addrs.slice(i, i + BATCH).map(one));
      if (i + BATCH < addrs.length) await new Promise((r) => setTimeout(r, BATCH_DELAY_MS));
    }
  };

  await runBatched(btcAddrs, async (a) => {
    const res = await fetch(`https://mempool.space/api/address/${a}`, {
      signal: AbortSignal.timeout(8_000),
    });
    if (!res.ok) return;
    const d = await res.json();
    btcTotal +=
      (Number(d.chain_stats?.funded_txo_sum ?? 0) - Number(d.chain_stats?.spent_txo_sum ?? 0)) /
      1e8;
    btcOk += 1;
  });

  await runBatched(ethAddrs, async (a) => {
    const hex: string = await rpcCall(ethUrl, 'eth_getBalance', [a, 'latest']);
    ethTotal += Number(BigInt(hex)) / 1e18;
    ethOk += 1;
  });

  await runBatched(solAddrs, async (a) => {
    const result = await rpcCall(solUrl, 'getBalance', [a]);
    solTotal += Number(result?.value ?? 0) / 1e9;
    solOk += 1;
  });

  await runBatched(stellarAddrs, async (a) => {
    const { xlm, usdc } = await fetchStellarBalancesFromPool(horizonUrls, a, cfg.USDC_ISSUER, {
      timeoutMs: 6_000,
    });
    xlmTotal += xlm;
    usdcTotal += usdc;
    stellarOk += 1;
  });

  const holdings: ChainHoldings[] = [
    { chain: 'bitcoin', asset: 'BTC', wallets: btcOk, total: btcTotal },
    { chain: 'ethereum', asset: 'ETH', wallets: ethOk, total: ethTotal },
    { chain: 'solana', asset: 'SOL', wallets: solOk, total: solTotal },
    { chain: 'stellar', asset: 'XLM', wallets: stellarOk, total: xlmTotal },
    { chain: 'stellar', asset: 'USDC', wallets: stellarOk, total: usdcTotal },
  ].filter((h) => h.total > 0);

  return buildHoldingsRows(
    holdings,
    savingsTvlUsd,
    prices,
    NETWORK,
    new Date().toISOString().slice(0, 10) + 'T00:00:00.000Z'
  );
}
