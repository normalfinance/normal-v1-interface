'use client';

import type { events } from '@normalfinance/types';
import type { GoldskyTableRow } from '@normalfinance/types/build/contracts/events';

import { BigNumber } from 'bignumber.js';
import { supabase } from '@/lib/createSupabaseClient';
import { usePersistStore } from '@normalfinance/state';
import { useState, useEffect, useCallback } from 'react';
import { logger, format, constants, parseEvent } from '@normalfinance/utils';

// ----------------------------------------------------------------------

interface ReturnType {
  error: any | null;
  loading: boolean;
  total1dVolume: BigNumber;
}

// ----------------------------------------------------------------------

const TIMESTAMP_COLUMN = 'ledger_closed_at';
const now = new Date();
const past24Hours = new Date(now.getTime() - 24 * 60 * 60 * 1000); // 24h ago

export function useTotal1dSwapVolume(): ReturnType {
  const {
    tokenState: { tokensByAddress },
  } = usePersistStore();

  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  const [total1dVolume, setTotal1dVolume] = useState<BigNumber>(BigNumber(0));

  const getSwapVolume = useCallback(async (): Promise<void> => {
    setError(null);
    setLoading(true);

    // TODO: add rate limiter

    const { data, error: e } = await supabase
      .from(constants.StellarConfig.EVENTS_TABLENAME)
      .select('*')
      .eq('contract_id', constants.StellarConfig.POOL_ROUTER_ADDRESS)
      .eq('type', 'contract')
      .eq('in_successful_contract_call', true)
      .eq('transaction_successful', true)
      .gt(TIMESTAMP_COLUMN, past24Hours.toISOString())
      .ilike('topics', '%swap%')
      .order('id', { ascending: false });

    if (e) {
      setError(e as any);
      logger.error('Error fetching swap volume:', e);
    } else {
      const rows = data as GoldskyTableRow[];

      let result = BigNumber(0);

      rows
        .filter((r) => r.topics !== undefined && r.data !== undefined)
        .forEach((r) => {
          const parsedEvent = parseEvent(
            JSON.parse(r.topics!),
            JSON.parse(r.data!),
            r.transaction_hash
          ) as events.RouterSwapEvent;

          if (!Object.keys(tokensByAddress).length) return; // no tokens

          const tokenIn = tokensByAddress[parsedEvent.tokenIn];

          if (tokenIn) {
            const amount = format.fTokenAmount(parsedEvent.inAmount, tokenIn.decimals ?? 7);
            const volume = BigNumber(tokenIn.price).multipliedBy(amount);

            result = result.plus(volume);
          }
        });

      setTotal1dVolume(result);
    }
  }, [tokensByAddress]);

  // On component mount, fetch volume
  useEffect(() => {
    getSwapVolume();
  }, [getSwapVolume]);

  return {
    error,
    loading,
    total1dVolume,
  };
}
