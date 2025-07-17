'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/createSupabaseClient';
import { constants, convertContractAddressToHex } from '@normalfinance/utils';

// ----------------------------------------------------------------------

interface ReturnType {
  error: any | null;
  loading: boolean;
  events: ParsedEvent[];
}

interface ParsedEvent {
  eventType: string;
  token?: string;
  user?: string;
  amount?: string;
  raw: any;
}

// ----------------------------------------------------------------------

const CONTRACT_ID = convertContractAddressToHex(constants.INSURANCE_FUND_ADDRESS);

export function useInsuranceFundEvents(): ReturnType {
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  const [events, setEvents] = useState<ParsedEvent[]>([]);

  useEffect(() => {
    const fetchInitialData = async () => {
      setError(null);
      setLoading(true);
      const { data, error: e } = await supabase
        .from('goldsky')
        .select('*')
        .eq('contract_id', CONTRACT_ID)
        .order('id', { ascending: false });
      if (e) {
        setError(e.toString() as any);
        console.error('Initial fetch error:', e);
      } else {
        const parsed = data.map(parseBufferEvent);
        setEvents(parsed);
      }
      setLoading(false);
    };

    fetchInitialData();

    const channel = supabase
      .channel('realtime goldsky')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'goldsky',
          filter: `contract_id=eq.${CONTRACT_ID}`,
        },
        (payload: any) => {
          console.log('Realtime update:', payload);

          const parsed = parseBufferEvent(payload.new);
          setEvents((prev) => [parsed, ...prev]);
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

function parseBufferEvent(row: any): ParsedEvent {
  const topics: string[] = row.topics || [];
  const eventType = topics[0] || 'unknown';

  const token = topics[1] || undefined;
  const user = topics[2] || undefined;
  const amount = parseAmount(row.data);

  return {
    eventType,
    token,
    user,
    amount,
    raw: row,
  };
}

function parseAmount(data: any): string | undefined {
  if (!data) return undefined;

  // If numeric: u128/i128
  if (typeof data === 'number' || typeof data === 'bigint') {
    return data.toString();
  }

  // If data is stringified JSON (some indexers wrap it this way)
  try {
    const parsed = typeof data === 'string' ? JSON.parse(data) : data;
    return parsed.toString();
  } catch {
    return undefined;
  }
}
