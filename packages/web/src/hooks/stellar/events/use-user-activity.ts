'use client';

import type { Activity } from '@/types/activity';
import type { events } from '@normalfinance/types';
import type { RealtimePostgresInsertPayload } from '@supabase/supabase-js';
import type { GoldskyTableRow } from '@normalfinance/types/build/contracts/events';

import { rpc } from '@stellar/stellar-sdk';
import { useState, useEffect } from 'react';
import { captureException } from '@sentry/nextjs';
import { supabase } from '@/lib/createSupabaseClient';
import { usePersistStore } from '@normalfinance/state';
import { constants, parseEvent } from '@normalfinance/utils';

// ----------------------------------------------------------------------

interface ReturnType {
  error: any | null;
  loading: boolean;
  recentActivity: Activity[];
}

// ----------------------------------------------------------------------

const server = new rpc.Server(constants.RPC_URL);

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
        .from('goldsky')
        .select('*')
        .eq('transaction_account', userAddress)
        .eq('type', 'contract')
        .eq('in_successful_contract_call', true)
        .order('id', { ascending: false });

      if (e) {
        captureException(e);
        setError(e.toString() as any);
      } else {
        const rows = data as GoldskyTableRow[];

        const parsed = rows
          .filter((r) => r.topics !== undefined && r.data !== undefined)
          .map(async (r) => {
            // parseRowToActivity()?
            const parsedEvent = parseEvent(
              JSON.parse(r.topics!),
              JSON.parse(r.data!),
              r.transaction_hash
            ) as events.BufferEvent; // FIXME:

            const tx = await server.getTransaction(r.transaction_hash);
            if (tx.status === 'SUCCESS') {
              parsedEvent.timestamp = tx.createdAt.toString();
            }

            return parsedEvent;
          });

        const _parsed = await Promise.all(parsed);

        setRecentActivity(_parsed);
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
          table: 'goldsky',
        },
        async (payload: RealtimePostgresInsertPayload<GoldskyTableRow>) => {
          const { topics, data, transaction_hash } = payload.new;

          if (topics && data) {
            // parseRowToActivity()?
            const parsed = parseEvent(
              JSON.parse(topics),
              JSON.parse(data),
              transaction_hash
            ) as events.BufferEvent; // FIXME:

            const tx = await server.getTransaction(transaction_hash);
            if (tx.status === 'SUCCESS') {
              parsed.timestamp = tx.createdAt.toString();
            }

            setRecentActivity((prev) => [parsed, ...prev]);
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

function parseRowToActivity(
  event: events.NormalContractEvent,
  userAddress: string,
  timestamp: string
): Activity | null {
  // const { id, timestamp, event_type, data } = event;
  //   // const ts = new Date(timestamp).getTime();
  //   // const amount = typeof data.amount === 'string' ? parseFloat(data.amount) : Number(data.amount);
  //   // const token = data.token || data.token_in || data.token_out;
  //   switch (event.type) {
  //     case 'deposit':
  //       return {
  //         id: 1,
  //         type: 'Sent',
  //         timestamp: ts,
  //         address: data.to,
  //         asset: {
  //           token,
  //           iconUrl: getCryptoIconUrl(token),
  //           amount,
  //         },
  //       };
  //       break;
  //     case 'trade':
  //       return {
  //         id,
  //         type: 'Swapped',
  //         timestamp: ts,
  //         sell: {
  //           token: data.token_in,
  //           iconUrl: getCryptoIconUrl(data.token_in),
  //           amount: Number(data.in_amount),
  //         },
  //         buy: {
  //           token: data.token_out,
  //           iconUrl: getCryptoIconUrl(data.token_out),
  //           amount: Number(data.out_amount),
  //         },
  //       };
  //     case 'deposit_liquidity':
  //       return {
  //         id: 1,
  //         type: 'Add Liquidity',
  //         timestamp: ts,
  //         lpToken: {
  //           token: event.,
  //           iconUrl: getCryptoIconUrl(token),
  //           amount: event.amount,
  //         },
  //       };
  //     case 'remove_liquidity':
  //       return {
  //         id,
  //         type: 'Remove Liquidity',
  //         timestamp: ts,
  //         lpToken: {
  //           token,
  //           iconUrl: getCryptoIconUrl(token),
  //           amount,
  //         },
  //       };
  //     case 'if_stake_record':
  //       return {
  //         id: 0,
  //         type: event.action,
  //         timestamp: ts,
  //         asset: {
  //           token: 'XLM',
  //           iconUrl: getCryptoIconUrl('XLM'),
  //           amount: event.amount,
  //         },
  //       };
  //     default:
  //       return null;
  //   }
}
