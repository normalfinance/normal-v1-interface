'use client';

import { useEffect, useMemo, useState } from 'react';
import { constants, parseEvent } from '@normalfinance/utils';
import { POINTS } from '@/utils/rewards-points'; // adjust path if needed
import { mockRows, JOSH_ADDRESS, MockGoldskyRow } from './mock-events';

/** same Action union as your real hook */
export type Action = 'Swap' | 'Add Liquidity' | 'Stake' | 'Create Index' | 'Mint Index';

type NormalizedEvent = {
  id: string;
  tx: string;
  dateISO: string;
  action: Action;
  rawAmount: number;
  tokenSymbol?: string;
  usdValue: number;
  points: number;
};

function guessDecimals(tokenSymbol?: string): number {
  if ((tokenSymbol || '').toUpperCase() === 'XLM') return constants.StellarConfig.XLM_DECIMALS ?? 7;
  return 7;
}
function getFirstU128FromData(data: any): string | undefined {
  try {
    const vec = data?.vec;
    if (!Array.isArray(vec)) return undefined;
    for (const item of vec) {
      if (item && typeof item.u128 === 'string') return item.u128;
    }
  } catch {}
  return undefined;
}
function getTokenSymbolFromTopics(topics: any[]): string | undefined {
  try {
    return topics?.[1]?.symbol;
  } catch {}
  return undefined;
}
function classifyAction(contractId: string, topics: any[]): Action | undefined {
  const event = topics?.[0]?.symbol?.toLowerCase?.();
  if (contractId === constants.StellarConfig.POOL_ROUTER_ADDRESS) {
    if (event === 'swap') return 'Swap';
    if (event === 'deposit_liquidity') return 'Add Liquidity';
  } else if (contractId === constants.StellarConfig.INSURANCE_FUND_ADDRESS) {
    if (event === 'stake' || event === 'deposit') return 'Stake';
  } else if (contractId === constants.StellarConfig.ORACLE_REGISTRY_ADDRESS) {
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
  }
}

async function rowToNormalizedEvent(row: MockGoldskyRow): Promise<NormalizedEvent | null> {
  const topics = row.topics ? JSON.parse(row.topics) : [];
  const data = row.data ? JSON.parse(row.data) : {};
  const action = classifyAction(row.contract_id, topics);
  if (!action) return null;

  let tokenSymbol: string | undefined = getTokenSymbolFromTopics(topics);
  let rawAmount = 0;

  try {
    const parsed = parseEvent(topics, data, row.transaction_hash) as any;
    const candidates = [parsed?.amount, parsed?.amountIn, parsed?.amountOut, parsed?.value].filter(
      (v) => typeof v === 'number' && isFinite(v)
    );
    if (candidates.length > 0) rawAmount = candidates[0];
    if (!tokenSymbol && typeof parsed?.token === 'string') tokenSymbol = parsed.token;
    if (!tokenSymbol && typeof parsed?.asset === 'string') tokenSymbol = parsed.asset;
  } catch {
    // ignore, we'll fallback
  }

  if (!rawAmount) {
    const u128 = getFirstU128FromData(data);
    if (u128) {
      const decimals = guessDecimals(tokenSymbol);
      rawAmount = Number(BigInt(u128)) / 10 ** decimals;
    }
  }

  // Price: treat USDC as $1 so points > 0 in this demo
  const price = (tokenSymbol || '').toUpperCase() === 'USDC' ? 1 : 0;
  const usdValue = price * rawAmount;
  const points = computePoints(action, usdValue);

  const dateISO = row.ledger_closed_at
    ? new Date(row.ledger_closed_at).toISOString().slice(0, 10)
    : new Date().toISOString().slice(0, 10);

  return {
    id: String(row.id),
    tx: row.transaction_hash,
    dateISO,
    action,
    rawAmount,
    tokenSymbol,
    usdValue,
    points,
  };
}

/**
 * Hardcoded hook: no Supabase, just uses mockRows.
 * Logs exactly what we parse/normalize so you can see "something like ..." right now.
 */
export function useProtocolPointsHardcoded(overrideAddress?: string) {
  const [events, setEvents] = useState<NormalizedEvent[] | null>(null);
  const effectiveAddress = overrideAddress || JOSH_ADDRESS;

  useEffect(() => {
    (async () => {
      // In a real app we'd filter by transaction_account === effectiveAddress.
      const mine = mockRows.filter((r) => r.transaction_account === effectiveAddress);

      console.log('[DEMO] mock goldsky rows (raw):', mine);

      const parsed = await Promise.all(mine.map(rowToNormalizedEvent));
      const valid = parsed.filter((e): e is NormalizedEvent => !!e);

      console.log('[DEMO] normalized events:', valid);

      setEvents(valid);
    })();
  }, [effectiveAddress]);

  const totalPoints = useMemo(() => {
    if (!events) return 0;
    return events.reduce((s, e) => s + (e.points || 0), 0);
  }, [events]);

  const history = useMemo(() => {
    if (!events) return [];
    return events.map((e) => ({ date: e.dateISO, action: e.action, points: e.points }));
  }, [events]);

  return {
    loading: events === null,
    error: null as string | null,
    totalPoints,
    history,
    rawEvents: events ?? [],
    viewingAddress: effectiveAddress,
  };
}
