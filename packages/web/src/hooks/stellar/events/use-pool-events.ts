'use client';

import type { events } from '@normalfinance/types';
import type { RealtimePostgresInsertPayload } from '@supabase/supabase-js';
import type { GoldskyTableRow } from '@normalfinance/types/build/contracts/events';

import { useState, useEffect } from 'react';
import { captureException } from '@sentry/nextjs';
import { supabase } from '@/lib/createSupabaseClient';
import { constants, rpcServer, parseEvent } from '@normalfinance/utils';

// ----------------------------------------------------------------------

interface ReturnType {
  error: any | null;
  loading: boolean;
  events: events.PoolRouterEvent[];
}

// ----------------------------------------------------------------------

export function usePoolEvents(poolAddress: string | undefined, limit: number): ReturnType {
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  const [events, setEvents] = useState<events.PoolRouterEvent[]>([]);

  useEffect(() => {
    const fetchInitialData = async () => {
      if (!poolAddress) return;

      setError(null);
      setLoading(true);

      const { data, error: e } = await supabase
        .from(constants.StellarConfig.EVENTS_TABLENAME)
        .select('*')
        .eq('contract_id', constants.StellarConfig.POOL_ROUTER_ADDRESS)
        .eq('type', 'contract')
        .eq('in_successful_contract_call', true)
        .eq('transaction_successful', true)
        .ilike('topics', `%${poolAddress}%`)
        .or(`topics.ilike.%deposit%,topics.ilike.%swap%,topics.ilike.%withdraw%`)
        .order('id', { ascending: false })
        .limit(limit);

      if (e) {
        captureException(e);
        setError(e.toString() as any);
      } else {
        const rows = data as GoldskyTableRow[];

        const parsed = rows
          .filter((r) => r.topics !== undefined && r.data !== undefined)
          .map(async (r) => {
            const parsedEvent = parseEvent(
              JSON.parse(r.topics!),
              JSON.parse(r.data!),
              r.transaction_hash
            ) as events.PoolRouterEvent;

            const tx = await rpcServer.getTransaction(r.transaction_hash);
            if (tx.status === 'SUCCESS') {
              parsedEvent.timestamp = tx.createdAt * 1000;
            }

            return parsedEvent;
          });

        const _parsed = await Promise.all(parsed);

        setEvents(_parsed);
      }

      setLoading(false);
    };

    fetchInitialData();

    const channel = supabase
      .channel(`realtime:goldsky:pool:${poolAddress}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: constants.StellarConfig.EVENTS_TABLENAME,
          filter: `contract_id=eq.${constants.StellarConfig.POOL_ROUTER_ADDRESS}&topics=ilike.%${poolAddress}%&or=(topics.ilike.%deposit%,topics.ilike.%swap%,topics.ilike.%withdraw%)`,
        },
        async (payload: RealtimePostgresInsertPayload<GoldskyTableRow>) => {
          const { topics, data, transaction_hash } = payload.new;
          if (topics && data) {
            const parsed = parseEvent(
              JSON.parse(topics),
              JSON.parse(data),
              transaction_hash
            ) as events.PoolRouterEvent;

            const tx = await rpcServer.getTransaction(transaction_hash);
            if (tx.status === 'SUCCESS') {
              parsed.timestamp = tx.createdAt * 1000;
            }

            setEvents((prev) => [parsed, ...prev]);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [poolAddress]);

  return {
    error,
    loading,
    events,
  };
}
