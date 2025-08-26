'use client';

import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/createSupabaseClient';
import { constants, parseEvent } from '@normalfinance/utils';
import { POINTS } from '@/utils/rewards-points';

type Action = 'Swap' | 'Add Liquidity' | 'Stake' | 'Create Index' | 'Mint Index';

type GoldskyRow = {
  id: string | number;
  contract_id: string;
  topics: string | null;
  data: string | null;
  transaction_hash: string;
  transaction_account: string;
  ledger_closed_at: string | null;
  in_successful_contract_call: boolean | null;
  type: string | null;
};

type NormalizedEvent = {
  tx: string;
  account: string;
  dateISO: string;
  action: Action;
  rawAmount: number;
  tokenSymbol?: string;
  usdValue: number;
  points: number;
};

export type LeaderboardRow = {
  address: string;
  totalPoints: number;
  swaps: number;
  addLiquidity: number;
  stake: number;
  createIndex: number;
  mintIndex: number;
  lastActivity?: string;
};

function classifyAction(contractId: string, topics: any[]): Action | undefined {
  const evt = topics?.[0]?.symbol?.toLowerCase?.();
  if (contractId === constants.StellarConfig.POOL_ROUTER_ADDRESS) {
    if (evt === 'swap') return 'Swap';
    if (evt === 'deposit_liquidity') return 'Add Liquidity';
  } else if (contractId === constants.StellarConfig.INSURANCE_FUND_ADDRESS) {
    if (evt === 'stake' || evt === 'deposit') return 'Stake';
  } else if (contractId === constants.StellarConfig.ORACLE_REGISTRY_ADDRESS) {
    if (evt === 'create_index') return 'Create Index';
    if (evt === 'mint_index') return 'Mint Index';
  }
  return undefined;
}

function guessDecimals(sym?: string) {
  if (!sym) return 7;
  return sym.toUpperCase() === 'XLM' ? (constants.StellarConfig.XLM_DECIMALS ?? 7) : 7;
}

function getFirstU128FromData(data: any) {
  try {
    const vec = data?.vec;
    if (!Array.isArray(vec)) return undefined;
    for (const item of vec) if (item?.u128) return item.u128 as string;
  } catch {}
  return undefined;
}

function tokenFromTopics(topics: any[]) {
  try {
    return topics?.[1]?.symbol as string | undefined;
  } catch {
    return undefined;
  }
}

function pointsFor(action: Action, usd: number) {
  switch (action) {
    case 'Swap':
      return Math.floor((usd / 1000) * POINTS.SWAP_PER_1000);
    case 'Add Liquidity':
      return Math.floor((usd / 1000) * POINTS.ADD_LIQ_PER_1000);
    case 'Stake':
      return Math.floor((usd / 1000) * POINTS.STAKE_PER_1000);
    case 'Create Index':
      return POINTS.CREATE_INDEX_FLAT;
    case 'Mint Index':
      return Math.floor((usd / 1000) * POINTS.MINT_INDEX_PER_1000);
  }
}

async function normalize(row: GoldskyRow): Promise<NormalizedEvent | null> {
  const topics = row.topics ? JSON.parse(row.topics) : [];
  const data = row.data ? JSON.parse(row.data) : {};
  const action = classifyAction(row.contract_id, topics);
  if (!action) return null;

  let token = tokenFromTopics(topics);
  let raw = 0;

  try {
    const parsed = parseEvent(topics, data, row.transaction_hash) as any;
    const candidates = [parsed?.amount, parsed?.amountIn, parsed?.amountOut, parsed?.value].filter(
      (v) => typeof v === 'number' && isFinite(v)
    );
    if (candidates.length) raw = candidates[0];
    if (!token && typeof parsed?.token === 'string') token = parsed.token;
    if (!token && typeof parsed?.asset === 'string') token = parsed.asset;
  } catch {}

  if (!raw) {
    const u128 = getFirstU128FromData(data);
    if (u128) raw = Number(BigInt(u128)) / 10 ** guessDecimals(token);
  }

  // Simple pricing: treat stables as $1, others 0 for now
  const price =
    token && ['USDC', 'USDT', 'USD', 'USDC.E', 'USDCET', 'USDCET'].includes(token.toUpperCase())
      ? 1
      : 0;
  const usd = raw * price;

  return {
    tx: row.transaction_hash,
    account: row.transaction_account,
    dateISO: row.ledger_closed_at
      ? new Date(row.ledger_closed_at).toISOString()
      : new Date().toISOString(),
    action,
    rawAmount: raw,
    tokenSymbol: token,
    usdValue: usd,
    points: pointsFor(action, usd),
  };
}

export function useProtocolLeaderboard(limitRows = 2000, days = 30) {
  const TABLE = constants.StellarConfig.EVENTS_TABLENAME;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<LeaderboardRow[]>([]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError(null);

      // pull recent rows across all accounts
      const sinceISO = new Date(Date.now() - days * 86400_000).toISOString();

      const { data, error } = await supabase
        .from(TABLE)
        .select(
          'id, contract_id, topics, data, transaction_hash, transaction_account, ledger_closed_at, in_successful_contract_call, type'
        )
        .in('contract_id', [
          constants.StellarConfig.POOL_ROUTER_ADDRESS,
          constants.StellarConfig.INSURANCE_FUND_ADDRESS,
          constants.StellarConfig.ORACLE_REGISTRY_ADDRESS,
        ])
        .eq('type', 'contract')
        .eq('in_successful_contract_call', true)
        .gte('ledger_closed_at', sinceISO)
        .order('id', { ascending: false })
        .limit(limitRows);

      if (error) {
        setError(error.message || 'Failed to fetch events');
        setLoading(false);
        return;
      }

      const events = (await Promise.all((data ?? []).map(normalize))).filter(
        (e): e is NormalizedEvent => !!e
      );

      // aggregate by account
      const map = new Map<string, LeaderboardRow>();
      for (const e of events) {
        if (!map.has(e.account)) {
          map.set(e.account, {
            address: e.account,
            totalPoints: 0,
            swaps: 0,
            addLiquidity: 0,
            stake: 0,
            createIndex: 0,
            mintIndex: 0,
            lastActivity: e.dateISO,
          });
        }
        const acc = map.get(e.account)!;
        acc.totalPoints += e.points;
        if (e.action === 'Swap') acc.swaps++;
        if (e.action === 'Add Liquidity') acc.addLiquidity++;
        if (e.action === 'Stake') acc.stake++;
        if (e.action === 'Create Index') acc.createIndex++;
        if (e.action === 'Mint Index') acc.mintIndex++;
        if (!acc.lastActivity || e.dateISO > acc.lastActivity) acc.lastActivity = e.dateISO;
      }

      const list = Array.from(map.values()).sort((a, b) => b.totalPoints - a.totalPoints);
      setRows(list);
      setLoading(false);
    })();
  }, [TABLE, limitRows, days]);

  return { loading, error, rows };
}
