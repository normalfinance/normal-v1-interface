'use client';

import { POINTS } from '@/utils/rewards-points';
import { useMemo, useState, useEffect } from 'react';
import { priceProvider } from '@/lib/price-provider';
import { supabase } from '@/lib/createSupabaseClient';
import { constants, parseEvent } from '@normalfinance/utils';

export type Action = 'Swap' | 'Add Liquidity' | 'Stake' | 'Create Index' | 'Mint Index';

type HistoryItem = { date: string; action: Action; points: number };

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
  id: string | number;
  tx: string;
  dateISO: string;
  action: Action;
  rawAmount: number;
  tokenSymbol?: string;
  usdValue: number;
  points: number;
};

export type UseProtocolPointsOptions = {
  tableName?: string;
  routerAddress?: string;
  insuranceAddress?: string;
  indexAddress?: string;
  limit?: number; // default 500
};

/* ---------------- helpers ---------------- */

function safeJsonParse<T>(src: string | null): T | null {
  try {
    return src ? (JSON.parse(src) as T) : null;
  } catch {
    return null;
  }
}

function guessDecimals(tokenSymbol?: string): number {
  if (!tokenSymbol) return 7;
  return tokenSymbol.toUpperCase() === 'XLM' ? (constants.StellarConfig.XLM_DECIMALS ?? 7) : 7;
}

function getFirstU128FromData(data: any): string | undefined {
  const vec = data?.vec;
  if (!Array.isArray(vec)) return undefined;
  for (const item of vec) {
    if (item && typeof item.u128 === 'string') return item.u128;
  }
  return undefined;
}

function getTokenSymbolFromTopics(topics: any[]): string | undefined {
  return topics?.[1]?.symbol as string | undefined;
}

function classifyAction(
  contractId: string,
  topics: any[],
  router: string,
  insurance: string,
  index: string
): Action | undefined {
  const event = topics?.[0]?.symbol?.toLowerCase?.();
  if (contractId === router) {
    if (event === 'swap') return 'Swap';
    if (event === 'deposit_liquidity') return 'Add Liquidity';
  } else if (contractId === insurance) {
    if (event === 'stake' || event === 'deposit') return 'Stake';
  } else if (contractId === index) {
    if (event === 'create_index') return 'Create Index';
    if (event === 'mint_index') return 'Mint Index';
  }
  return undefined;
}

function computePoints(action: Action, usdValue: number): number {
  switch (action) {
    case 'Swap':
      return Math.floor((usdValue / 1000) * POINTS.SWAP_PER_1000);
    case 'Add Liquidity':
      return Math.floor((usdValue / 1000) * POINTS.ADD_LIQ_PER_1000);
    case 'Stake':
      return Math.floor((usdValue / 1000) * POINTS.STAKE_PER_1000);
    case 'Create Index':
      return POINTS.CREATE_INDEX_FLAT;
    case 'Mint Index':
      return Math.floor((usdValue / 1000) * POINTS.MINT_INDEX_PER_1000);
    default:
      return 0;
  }
}

function safeParseEvent(topics: any[], data: any, tx: string) {
  try {
    return parseEvent(topics, data, tx) as any;
  } catch {
    return null;
  }
}

async function rowToNormalizedEvent(
  row: GoldskyRow,
  router: string,
  insurance: string,
  index: string
): Promise<NormalizedEvent | null> {
  const topics = safeJsonParse<any[]>(row.topics) ?? [];
  const data = safeJsonParse<any>(row.data) ?? {};
  const action = classifyAction(row.contract_id, topics, router, insurance, index);
  if (!action) return null;

  let tokenSymbol: string | undefined = getTokenSymbolFromTopics(topics);
  let rawAmount = 0;

  const parsed = safeParseEvent(topics, data, row.transaction_hash);
  if (parsed) {
    const candidates = [parsed?.amount, parsed?.amountIn, parsed?.amountOut, parsed?.value].filter(
      (v) => typeof v === 'number' && isFinite(v)
    );
    if (candidates.length > 0) rawAmount = candidates[0] as number;
    if (!tokenSymbol && typeof parsed?.token === 'string') tokenSymbol = parsed.token;
    if (!tokenSymbol && typeof parsed?.asset === 'string') tokenSymbol = parsed.asset;
  }

  if (!rawAmount) {
    const u128 = getFirstU128FromData(data);
    if (u128) {
      const decimals = guessDecimals(tokenSymbol);
      rawAmount = Number(BigInt(u128)) / 10 ** decimals;
    }
  }

  let usdValue = 0;
  if (action !== 'Create Index') {
    const price = await priceProvider.getUSDPrice(tokenSymbol ?? '');
    if (price && rawAmount) usdValue = rawAmount * price;
  }
  const points = computePoints(action, usdValue);

  const dateISO = row.ledger_closed_at
    ? new Date(row.ledger_closed_at).toISOString().slice(0, 10)
    : new Date().toISOString().slice(0, 10);

  return {
    id: row.id,
    tx: row.transaction_hash,
    dateISO,
    action,
    rawAmount,
    tokenSymbol,
    usdValue,
    points,
  };
}

/* ---------------- the hook ---------------- */

export function useProtocolPoints(userAddress?: string, opts: UseProtocolPointsOptions = {}) {
  const TABLE = opts.tableName ?? constants.StellarConfig.EVENTS_TABLENAME;
  const ROUTER = opts.routerAddress ?? constants.StellarConfig.POOL_ROUTER_ADDRESS;
  const INSURANCE = opts.insuranceAddress ?? constants.StellarConfig.INSURANCE_FUND_ADDRESS;
  const INDEX = opts.indexAddress ?? constants.StellarConfig.ORACLE_REGISTRY_ADDRESS;
  const LIMIT = opts.limit ?? 500;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [events, setEvents] = useState<NormalizedEvent[]>([]);

  useEffect(() => {
    let cancelled = false;

    const fetchData = async () => {
      if (!userAddress) {
        setEvents([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      const { data, error: dbError } = await supabase
        .from(TABLE)
        .select(
          'id, contract_id, topics, data, transaction_hash, transaction_account, ledger_closed_at, in_successful_contract_call, type'
        )
        .in('contract_id', [ROUTER, INSURANCE, INDEX])
        .eq('transaction_account', userAddress)
        .eq('type', 'contract')
        .eq('in_successful_contract_call', true)
        .order('id', { ascending: false })
        .limit(LIMIT);

      if (dbError) {
        if (!cancelled) {
          setError(dbError.message || 'Failed to fetch events');
          setEvents([]);
          setLoading(false);
        }
        return;
      }

      const rows = (data || []) as GoldskyRow[];
      const parsed = await Promise.all(
        rows.map((r) => rowToNormalizedEvent(r, ROUTER, INSURANCE, INDEX))
      );
      const valid = parsed.filter((e): e is NormalizedEvent => !!e);

      if (!cancelled) {
        setEvents(valid);
        setLoading(false);
      }
    };

    fetchData();

    // always return a cleanup function
    return () => {
      cancelled = true;
    };
  }, [userAddress, TABLE, ROUTER, INSURANCE, INDEX, LIMIT]);

  // realtime
  useEffect(() => {
    if (!userAddress) {
      // return a no-op cleanup to satisfy consistent-return
      return () => {};
    }

    const channel = supabase.channel('realtime:protocol-points');

    const handleInsert = async (payload: any) => {
      const row = payload.new as GoldskyRow;
      if (row.transaction_account === userAddress) {
        const ev = await rowToNormalizedEvent(row, ROUTER, INSURANCE, INDEX);
        if (ev) setEvents((prev) => [ev, ...prev]);
      }
    };

    channel
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: TABLE, filter: `contract_id=eq.${ROUTER}` },
        handleInsert
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: TABLE, filter: `contract_id=eq.${INSURANCE}` },
        handleInsert
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: TABLE, filter: `contract_id=eq.${INDEX}` },
        handleInsert
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userAddress, TABLE, ROUTER, INSURANCE, INDEX]);

  const totalPoints = useMemo(() => events.reduce((s, e) => s + (e.points || 0), 0), [events]);

  const history: HistoryItem[] = useMemo(
    () => events.map((e) => ({ date: e.dateISO, action: e.action, points: e.points })),
    [events]
  );

  return { loading, error, totalPoints, history, rawEvents: events };
}
