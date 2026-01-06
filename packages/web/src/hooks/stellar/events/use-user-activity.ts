'use client';

import type { Activity } from '@/types/activity';
import type { events, PairState, TokenState } from '@normalfinance/types';
import type { RealtimePostgresInsertPayload } from '@supabase/supabase-js';
import type { GoldskyTableRow } from '@normalfinance/types/build/contracts/events';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/createSupabaseClient';
import { usePersistStore } from '@normalfinance/state';
import { format, constants, parseEvent, getCryptoIconUrl } from '@normalfinance/utils';

// ----------------------------------------------------------------------

interface ReturnType {
  error: any | null;
  loading: boolean;
  recentActivity: Activity[];
}

// ----------------------------------------------------------------------

export function useUserActivity(): ReturnType {
  const {
    wallet,
    tokenState: { tokensByAddress },
    pairState: { pairByAddress },
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

                return parseEventToActivity(
                  r.transaction_hash,
                  parsedEvent,
                  pairByAddress,
                  tokensByAddress
                );
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

            const activityParsed = await parseEventToActivity(
              transaction_hash,
              parsed,
              pairByAddress,
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
  pairByAddress: PairState['pairByAddress'],
  tokensByAddress: TokenState['tokensByAddress']
): Promise<Activity | null> {
  switch (event.type) {
    case 'mint': {
      const pair = pairByAddress[event.pair];
      const token = tokensByAddress[pair.addresses.tokenLong];

      return {
        id,
        type: 'Mint',
        timestamp: Number(event.ts),
        asset: {
          address: token.contract,
          symbol: token.symbol,
          iconUrl: token.icon ?? getCryptoIconUrl(token.symbol),
          amount: Number(format.fTokenAmount(event.tokensMinted.toString())),
        },
      };
    }

    case 'redeem': {
      const pair = pairByAddress[event.pair];
      const token = tokensByAddress[pair.addresses.tokenLong];

      return {
        id,
        type: 'Redeem',
        timestamp: Number(event.ts),
        asset: {
          address: token.contract,
          symbol: token.symbol,
          iconUrl: token.icon ?? getCryptoIconUrl(token.symbol),
          amount: Number(format.fTokenAmount(event.tokensRedeemed.toString())),
        },
      };
    }

    case 'trade': {
      const pair = pairByAddress[event.pair];
      const isLong = event.side == BigInt(1);
      const tokenAddress = isLong ? pair.addresses.tokenLong : pair.addresses.tokenShort;
      const token = tokensByAddress[tokenAddress];

      return {
        id,
        type: 'Trade',
        timestamp: Number(event.ts),
        asset: {
          address: token.contract,
          symbol: token.symbol,
          iconUrl: token.icon ?? getCryptoIconUrl(token.symbol),
          amount: Number(format.fTokenAmount(event.amount.toString())),
        },
      };
    }

    case 'deposit': {
      const pair = pairByAddress[event.pair];
      const token = tokensByAddress[pair.addresses.tokenLong];

      return {
        id,
        type: 'Add Liquidity',
        timestamp: Number(event.ts),
        asset: {
          address: token.contract,
          symbol: token.symbol,
          iconUrl: token.icon ?? getCryptoIconUrl(token.symbol),
          amount: Number(format.fTokenAmount(event.amount.toString())),
        },
      };
    }

    case 'withdraw': {
      const pair = pairByAddress[event.pair];
      const token = tokensByAddress[pair.addresses.tokenLong];

      return {
        id,
        type: 'Remove Liquidity',
        timestamp: Number(event.ts),
        asset: {
          address: token.contract,
          symbol: token.symbol,
          iconUrl: token.icon ?? getCryptoIconUrl(token.symbol),
          amount: Number(format.fTokenAmount(event.amount.toString())),
        },
      };
    }

    default:
      return null;
  }
}
