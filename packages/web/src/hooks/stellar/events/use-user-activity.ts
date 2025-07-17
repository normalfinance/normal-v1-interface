'use client';

import type { Activity } from '@/types/activity';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/createSupabaseClient';
import { usePersistStore } from '@normalfinance/state';
import { getCryptoIconUrl } from '@normalfinance/utils';

// ----------------------------------------------------------------------

interface ReturnType {
  error: any | null;
  loading: boolean;
  recentActivity: Activity[];
}

// ----------------------------------------------------------------------

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
        // .filter('data->>user', 'eq', userAddress); // or data->>from/to
        // .eq('contract_id', CONTRACT_ID)
        .order('ledger_sequence', { ascending: true });
      if (e) {
        setError(e.toString() as any);
        console.error('Initial fetch error:', e);
      } else {
        const parsed = (data || [])
          .map((row) => parseRowToActivity(row as SupabaseEventRow, userAddress))
          .filter(Boolean) as Activity[];

        setRecentActivity(parsed);
      }
      setLoading(false);
    };

    fetchInitialData();

    const channel = supabase
      .channel('user-activity-channel')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'events',
        },
        (payload: any) => {
          const row = payload.new as SupabaseEventRow;

          // Only process events that mention this user address in the data payload
          if (
            row.data?.user === userAddress ||
            row.data?.from === userAddress ||
            row.data?.to === userAddress
          ) {
            const act = parseRowToActivity(row, userAddress);
            if (act) {
              setRecentActivity((prev) => [...prev, act]);
            }
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

function parseRowToActivity(row: SupabaseEventRow, userAddress: string): Activity | null {
  const { id, timestamp, event_type, data } = row;
  const ts = new Date(timestamp).getTime();

  const amount = typeof data.amount === 'string' ? parseFloat(data.amount) : Number(data.amount);
  const token = data.token || data.token_in || data.token_out;

  switch (event_type) {
    case 'deposit':
      return {
        id,
        type: 'Sent',
        timestamp: ts,
        address: data.to,
        asset: {
          token,
          iconUrl: getCryptoIconUrl(token),
          amount,
        },
      };

      break;

    case 'trade':
      return {
        id,
        type: 'Swapped',
        timestamp: ts,
        sell: {
          token: data.token_in,
          iconUrl: getCryptoIconUrl(data.token_in),
          amount: Number(data.in_amount),
        },
        buy: {
          token: data.token_out,
          iconUrl: getCryptoIconUrl(data.token_out),
          amount: Number(data.out_amount),
        },
      };

    case 'add_liquidity':
      return {
        id,
        type: 'Add Liquidity',
        timestamp: ts,
        lpToken: {
          token,
          iconUrl: getCryptoIconUrl(token),
          amount,
        },
      };

    case 'remove_liquidity':
      return {
        id,
        type: 'Remove Liquidity',
        timestamp: ts,
        lpToken: {
          token,
          iconUrl: getCryptoIconUrl(token),
          amount,
        },
      };

    case 'stake':
      return {
        id,
        type: 'Stake',
        timestamp: ts,
        asset: {
          token,
          iconUrl: getCryptoIconUrl(token),
          amount,
        },
      };

    case 'unstake':
      return {
        id,
        type: 'Unstake',
        timestamp: ts,
        asset: {
          token,
          iconUrl: getCryptoIconUrl(token),
          amount,
        },
      };

    default:
      return null;
  }
}
