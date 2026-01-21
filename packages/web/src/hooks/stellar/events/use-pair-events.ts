'use client';

import type { events } from '@normalfinance/types';
import type { RealtimePostgresInsertPayload } from '@supabase/supabase-js';
import type { GoldskyTableRow } from '@normalfinance/types/build/contracts/events';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/createSupabaseClient';
import { constants, parseEvent } from '@normalfinance/utils';

// ----------------------------------------------------------------------

interface ReturnType {
  error: any | null;
  loading: boolean;
  events: events.PairEvent[];
}

// ----------------------------------------------------------------------

export function usePairEvents(pairAddress: string | undefined, limit: number): ReturnType {
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  const [events, setEvents] = useState<events.PairEvent[]>([]);

  useEffect(() => {
    const fetchInitialData = async () => {
      if (!pairAddress) return;

      setError(null);
      setLoading(true);

      // Treasury Events: trade, deposit, withdraw
      const { data, error: e } = await supabase
        .from(constants.StellarConfig.EVENTS_TABLENAME)
        .select('*')
        .in('contract_id', [
          constants.StellarConfig.TREASURY_ADDRESS,
          constants.StellarConfig.LONG_SHORT_PAIR_FACTORY_ADDRESS,
        ])
        .eq('type', 'contract')
        .eq('in_successful_contract_call', true)
        .eq('transaction_successful', true)
        .ilike('topics', `%${pairAddress}%`)
        .or(
          `topics.ilike.%deposit%,topics.ilike.%trade%,topics.ilike.%withdraw%,topics.ilike.%mint%,topics.ilike.%redeem%`
        )
        .order('id', { ascending: false })
        .limit(limit);

      if (e) {
        setError(e.toString() as any);
      } else {
        const rows = data as GoldskyTableRow[];

        const parsed = rows
          // .filter((r) => r.topics !== undefined && r.data !== undefined)
          .map(async (r) => {
            const parsedEvent = parseEvent(
              JSON.parse(r.topics!),
              JSON.parse(r.data!),
              r.transaction_hash
            ) as events.PairEvent;

            return parsedEvent;
          });

        const _parsed = await Promise.all(parsed);

        setEvents(_parsed);
      }

      setLoading(false);
    };

    fetchInitialData();

    const channel = supabase
      .channel(`realtime:goldsky:pair:${pairAddress}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: constants.StellarConfig.EVENTS_TABLENAME,
          filter:
            `or=(contract_id.eq.${constants.StellarConfig.TREASURY_ADDRESS},contract_id.eq.${constants.StellarConfig.LONG_SHORT_PAIR_FACTORY_ADDRESS})` +
            `&topics=ilike.%${pairAddress}%` +
            `&or=(topics.ilike.%deposit%,topics.ilike.%trade%,topics.ilike.%withdraw%,topics.ilike.%mint%,topics.ilike.%redeem%)`,
        },
        async (payload: RealtimePostgresInsertPayload<GoldskyTableRow>) => {
          const { topics, data, transaction_hash } = payload.new;
          if (topics && data) {
            const parsed = parseEvent(
              JSON.parse(topics),
              JSON.parse(data),
              transaction_hash
            ) as events.PairEvent;

            setEvents((prev) => [parsed, ...prev]);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [pairAddress]);

  return {
    error,
    loading,
    events,
  };
}
