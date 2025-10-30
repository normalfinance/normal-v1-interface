'use client';

import type { Activity } from '@/types/activity';
import type { events, TokenState } from '@normalfinance/types';
import type { RealtimePostgresInsertPayload } from '@supabase/supabase-js';
import type { GoldskyTableRow } from '@normalfinance/types/build/contracts/events';

import { rpc } from '@stellar/stellar-sdk';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/createSupabaseClient';
import { usePersistStore } from '@normalfinance/state';
import {
  format,
  constants,
  parseEvent,
  getCryptoIconUrl,
  sortTokenAddreses,
} from '@normalfinance/utils';

// ----------------------------------------------------------------------

interface ReturnType {
  error: any | null;
  loading: boolean;
  recentActivity: Activity[];
}

// ----------------------------------------------------------------------

const server = new rpc.Server(constants.StellarConfig.RPC_URL);

export function useUserActivity(): ReturnType {
  const {
    wallet,
    tokenState: { tokensByAddress },
  } = usePersistStore();

  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  const [recentActivity, setRecentActivity] = useState<Activity[]>([]);

  useEffect(() => {
    const userAddress = wallet.address;

    if (!userAddress) return;

    const fetchInitialData = async () => {
      setError(null);
      setLoading(true);

      const { data, error: e } = await supabase
        .from(constants.StellarConfig.EVENTS_TABLENAME)
        .select('*')
        .eq('transaction_account', userAddress)
        .eq('type', 'contract')
        .eq('in_successful_contract_call', true)
        .eq('transaction_successful', true)
        .order('id', { ascending: false });

      if (e) {
        setError(e.toString() as any);
      } else {
        const rows = data as GoldskyTableRow[];

        const compact = <T>(arr: (T | null | undefined)[]): T[] =>
          arr.filter((x): x is T => x != null);

        const parsed = compact(
          await Promise.all(
            rows
              .filter((r) => r.topics && r.data)
              .map(async (r) => {
                const parsedEvent = parseEvent(
                  JSON.parse(r.topics!),
                  JSON.parse(r.data!),
                  r.transaction_hash
                ) as events.UserActivityEvent;

                const tx = await server.getTransaction(r.transaction_hash);
                if (tx.status === 'SUCCESS') {
                  parsedEvent.timestamp = tx.createdAt * 1000;
                }

                return parseEventToActivity(r.id, parsedEvent, tokensByAddress);
              })
          )
        );

        setRecentActivity(parsed);
      }
      setLoading(false);
    };

    fetchInitialData();

    const channel = supabase
      .channel('realtime:goldsky:user_activity')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: constants.StellarConfig.EVENTS_TABLENAME,
        },
        async (payload: RealtimePostgresInsertPayload<GoldskyTableRow>) => {
          const { topics, data, transaction_hash } = payload.new;

          if (topics && data) {
            const parsed = parseEvent(
              JSON.parse(topics),
              JSON.parse(data),
              transaction_hash
            ) as events.UserActivityEvent;

            const tx = await server.getTransaction(transaction_hash);
            if (tx.status === 'SUCCESS') {
              parsed.timestamp = tx.createdAt * 1000;
            }

            const activityParsed = await parseEventToActivity(
              payload.new.id,
              parsed,
              tokensByAddress
            );

            if (activityParsed) setRecentActivity((prev) => [activityParsed, ...prev]);
          }
        }
      )
      .subscribe();

    // eslint-disable-next-line consistent-return
    return () => {
      supabase.removeChannel(channel);
    };
  }, [wallet.address]);

  return {
    error,
    loading,
    recentActivity,
  };
}

async function parseEventToActivity(
  id: string,
  event: events.UserActivityEvent,
  tokensByAddress: TokenState['tokensByAddress']
): Promise<Activity | null> {
  switch (event.type) {
    case 'swap': {
      const tokenIn = tokensByAddress[event.tokenIn];
      const tokenOut = tokensByAddress[event.tokenOut];

      return {
        id,
        type: 'Swap',
        timestamp: event.timestamp ?? 0,
        sell: {
          address: event.tokenIn,
          symbol: tokenIn.symbol,
          iconUrl: tokenIn.icon ?? getCryptoIconUrl(tokenIn.symbol),
          amount: Number(format.formatTokenAmount(event.inAmount.toString())),
        },
        buy: {
          address: event.tokenOut,
          symbol: tokenOut.symbol,
          iconUrl: tokenOut.icon ?? getCryptoIconUrl(tokenOut.symbol),
          amount: Number(format.formatTokenAmount(event.outAmount.toString())),
        },
      };
    }
    case 'deposit': {
      const { idx: tokenIdx } = sortTokenAddreses(event.tokens[0], event.tokens[1]);
      const tokenA = tokensByAddress[event.tokens[tokenIdx.a]];
      const tokenB = tokensByAddress[event.tokens[tokenIdx.b]];

      return {
        id,
        type: 'Add Liquidity',
        timestamp: event.timestamp ?? 0,
        tokenA: {
          address: tokenA.contract,
          symbol: tokenA.symbol,
          iconUrl: tokenA.icon ?? getCryptoIconUrl(tokenA.symbol),
          amount: Number(format.formatTokenAmount(event.amounts[tokenIdx.a].toString())),
        },
        tokenB: {
          address: tokenB.contract,
          symbol: tokenB.symbol,
          iconUrl: tokenB.icon ?? getCryptoIconUrl(tokenB.symbol),
          amount: Number(format.formatTokenAmount(event.amounts[tokenIdx.b].toString())),
        },
      };
    }

    case 'withdraw': {
      const { idx: tokenIdx } = sortTokenAddreses(event.tokens[0], event.tokens[1]);
      const tokenA = tokensByAddress[event.tokens[tokenIdx.a]];
      const tokenB = tokensByAddress[event.tokens[tokenIdx.b]];

      return {
        id,
        type: 'Remove Liquidity',
        timestamp: event.timestamp ?? 0,
        tokenA: {
          address: tokenA.contract,
          symbol: tokenA.symbol,
          iconUrl: tokenA.icon ?? getCryptoIconUrl(tokenA.symbol),
          amount: Number(format.formatTokenAmount(event.amounts[tokenIdx.a].toString())),
        },
        tokenB: {
          address: tokenB.contract,
          symbol: tokenB.symbol,
          iconUrl: tokenB.icon ?? getCryptoIconUrl(tokenB.symbol),
          amount: Number(format.formatTokenAmount(event.amounts[tokenIdx.b].toString())),
        },
      };
    }

    default:
      return null;
  }
}
