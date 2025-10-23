'use client';

import type { Activity } from '@/types/activity';
import type { events } from '@normalfinance/types';
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
  getTokenSymbol,
  getCryptoIconUrl,
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
  const store = usePersistStore();

  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  const [recentActivity, setRecentActivity] = useState<Activity[]>([]);

  useEffect(() => {
    const userAddress = store.wallet.address;

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

                return parseEventToActivity(r.id, parsedEvent);
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

            const activityParsed = await parseEventToActivity(payload.new.id, parsed);

            if (activityParsed) setRecentActivity((prev) => [activityParsed, ...prev]);
          }
        }
      )
      .subscribe();

    // eslint-disable-next-line consistent-return
    return () => {
      supabase.removeChannel(channel);
    };
  }, [store.wallet.address]);

  return {
    error,
    loading,
    recentActivity,
  };
}

async function parseEventToActivity(
  id: string,
  event: events.UserActivityEvent
): Promise<Activity | null> {
  switch (event.type) {
    case 'swap': {
      // const normalTokenSymbol = format.formatNormalToken(event.asset, 'with-n');

      const tokenInSymbol = (await getTokenSymbol(event.tokenIn)) ?? 'Unknown';
      const tokenOutSymbol = (await getTokenSymbol(event.tokenOut)) ?? 'Unknown';

      return {
        id,
        type: 'Swapped',
        timestamp: event.timestamp ?? 0,
        asset: 'idk',
        sell: {
          address: event.tokenIn,
          symbol: tokenInSymbol,
          iconUrl: getCryptoIconUrl(tokenInSymbol),
          amount: Number(format.formatTokenAmount(event.inAmount.toString())),
        },
        buy: {
          address: event.tokenOut,
          symbol: tokenOutSymbol,
          iconUrl: getCryptoIconUrl(tokenOutSymbol),
          amount: Number(format.formatTokenAmount(event.outAmount.toString())),
        },
      };
    }
    case 'deposit_liquidity':
      return {
        id,
        type: 'Add Liquidity',
        timestamp: event.timestamp ?? 0,
        // asset: format.formatNormalToken(event.asset, 'with-n'),
        asset: 'idk',
        tokenA: {
          address: event.tokens[0],
          symbol: 'NORMAL',
          iconUrl: getCryptoIconUrl('XLM'),
          amount: Number(format.formatTokenAmount(event.amounts[0].toString())),
        },
        tokenB: {
          address: event.tokens[1],
          symbol: 'USDC',
          iconUrl: getCryptoIconUrl('USDC'),
          amount: Number(format.formatTokenAmount(event.amounts[1].toString())),
        },
      };
    case 'withdraw_liquidity':
      return {
        id,
        type: 'Remove Liquidity',
        timestamp: event.timestamp ?? 0,
        // asset: format.formatNormalToken(event.asset, 'with-n'),
        asset: 'idk',
        tokenA: {
          address: event.tokens[0],
          symbol: 'XLM',
          iconUrl: getCryptoIconUrl('XLM'),
          amount: Number(format.formatTokenAmount(event.amounts[0].toString())),
        },
        tokenB: {
          address: event.tokens[1],
          symbol: 'USDC',
          iconUrl: getCryptoIconUrl('USDC'),
          amount: Number(format.formatTokenAmount(event.amounts[1].toString())),
        },
      };
    default:
      return null;
  }
}
