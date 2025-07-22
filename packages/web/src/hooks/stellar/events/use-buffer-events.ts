'use client';

import type { events } from '@normalfinance/types';
import type { RealtimePostgresInsertPayload } from '@supabase/supabase-js';
import type { GoldskyTableRow } from '@normalfinance/types/build/contracts/events';

import { rpc } from '@stellar/stellar-sdk';
import { useState, useEffect } from 'react';
import { captureException } from '@sentry/nextjs';
import { supabase } from '@/lib/createSupabaseClient';
import { constants, parseEvent } from '@normalfinance/utils';

// ----------------------------------------------------------------------

interface ReturnType {
  error: any | null;
  loading: boolean;
  events: events.BufferEvent[];
}

// ----------------------------------------------------------------------

const server = new rpc.Server(constants.RPC_URL);

const CONTRACT_ID = '75bb4470b1a4ff61ecc7295e8b8eb74419dd586eee404cdf5249915d890e0877'; // sconvertContractAddressToHex(constants.BUFFER_ADDRESS);

export function useBufferEvents(): ReturnType {
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  const [events, setEvents] = useState<events.BufferEvent[]>([]);

  useEffect(() => {
    const fetchInitialData = async () => {
      setError(null);
      setLoading(true);

      const { data, error: e } = await supabase
        .from('goldsky')
        .select('*')
        .eq('contract_id', CONTRACT_ID)
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
            const parsedEvent = parseEvent(
              JSON.parse(r.topics!),
              JSON.parse(r.data!),
              r.transaction_hash
            ) as events.BufferEvent;

            const tx = await server.getTransaction(r.transaction_hash);
            if (tx.status === 'SUCCESS') {
              parsedEvent.timestamp = tx.createdAt.toString();
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
      .channel('realtime:goldsky:buffer')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'goldsky',
          filter: `contract_id=eq.${CONTRACT_ID}`,
        },
        async (payload: RealtimePostgresInsertPayload<GoldskyTableRow>) => {
          const { topics, data, transaction_hash } = payload.new;

          if (topics && data) {
            const parsed = parseEvent(
              JSON.parse(topics),
              JSON.parse(data),
              transaction_hash
            ) as events.BufferEvent;

            const tx = await server.getTransaction(transaction_hash);
            if (tx.status === 'SUCCESS') {
              parsed.timestamp = tx.createdAt.toString();
            }

            setEvents((prev) => [parsed, ...prev]);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return {
    error,
    loading,
    events,
  };
}
