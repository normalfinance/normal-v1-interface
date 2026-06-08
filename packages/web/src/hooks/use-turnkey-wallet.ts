'use client';

import { useState, useEffect, useCallback } from 'react';
import { buildAuthHeaders } from '@/utils/http';

export interface TurnkeyAddresses {
  bitcoinAddress: string | null;
  ethereumAddress: string | null;
  stellarAddress: string | null;
}

interface State {
  addresses: TurnkeyAddresses | null;
  loading: boolean;
  hasWallet: boolean | null; // null = not yet checked
}

export function useTurnkeyWallet(enabled = true) {
  const [state, setState] = useState<State>({
    addresses: null,
    loading: false,
    hasWallet: null,
  });

  const fetchWallet = useCallback(async () => {
    setState((s) => ({ ...s, loading: true }));
    try {
      const headers = await buildAuthHeaders();
      const res = await fetch('/api/turnkey/wallet', { headers });
      if (!res.ok) throw new Error('fetch failed');
      const data = await res.json();
      if (data.wallet) {
        setState({ addresses: data.wallet, loading: false, hasWallet: true });
      } else {
        setState({ addresses: null, loading: false, hasWallet: false });
      }
    } catch {
      setState({ addresses: null, loading: false, hasWallet: false });
    }
  }, []);

  useEffect(() => {
    if (enabled) fetchWallet();
  }, [enabled, fetchWallet]);

  return { ...state, refetch: fetchWallet };
}
