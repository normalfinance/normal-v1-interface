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
  volumeByPair: Record<string, BigNumber>;
}

// ----------------------------------------------------------------------

const TIMESTAMP_COLUMN = 'ledger_closed_at';
const now = new Date();
const past24Hours = new Date(now.getTime() - 24 * 60 * 60 * 1000); // 24h ago

export function useTotal1dTradeVolume(): ReturnType {
  const {
    tokenState: { tokensByAddress },
  } = usePersistStore();

  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const [total1dVolume, setTotal1dVolume] = useState<BigNumber>(BigNumber(0));
  const [volumeByPair, setVolumeByPair] = useState<Record<string, BigNumber>>({});

  const getTradeVolume = useCallback(async (): Promise<void> => {
    setError(null);
    setLoading(true);

    // TODO: add rate limiter

    const { data, error: e } = await supabase
      .from(constants.StellarConfig.EVENTS_TABLENAME)
      .select('*')
      .eq('contract_id', constants.StellarConfig.TREASURY_ADDRESS)
      .eq('type', 'contract')
      .eq('in_successful_contract_call', true)
      .eq('transaction_successful', true)
      .gt(TIMESTAMP_COLUMN, past24Hours.toISOString())
      .ilike('topics', '%trade%')
      .order('id', { ascending: false });

    if (e) {
      setError(e as any);
      logger.error('Error fetching trade volume:', e);
    } else {
      const rows = data as GoldskyTableRow[];

      let total = BigNumber(0);
      const totalByPair: Record<string, BigNumber> = {};

      const addToPair = (pair: string, v: BigNumber) => {
        totalByPair[pair] = (totalByPair[pair] ?? BigNumber(0)).plus(v);
      };

      rows
        .filter((r) => r.topics !== undefined && r.data !== undefined)
        .forEach((r) => {
          const parsedEvent = parseEvent(
            JSON.parse(r.topics!),
            JSON.parse(r.data!),
            r.transaction_hash
          ) as events.TreasuryTradeEvent;

          const usdcToken = tokensByAddress[constants.StellarConfig.USDC_ADDRESS];

          const buying = parsedEvent.direction === 'Buy';

          // amount is in 7-dec fixed units -> formatted to display units
          const amount = format.fTokenAmount(
            buying ? parsedEvent.inAmount : parsedEvent.outAmount,
            7
          );

          // Compute "volume" the same way you were doing total:
          // - if no usdcToken/price, fall back to raw amount
          // - else USD value via USDC price
          const volume = !usdcToken
            ? BigNumber(amount)
            : BigNumber(amount).multipliedBy(usdcToken.price);

          total = total.plus(volume);
          addToPair(parsedEvent.pair, volume);
        });

      setTotal1dVolume(total);
      setVolumeByPair(totalByPair);
      setLoading(false);
    }
  }, [tokensByAddress]);

  // On component mount, fetch volume
  useEffect(() => {
    getTradeVolume();
  }, [getTradeVolume]);

  return {
    error,
    loading,
    total1dVolume,
    volumeByPair,
  };
}
