'use client';

import type { ReactNode } from 'react';
import type { AssetActionKey } from '@/hooks/use-asset-actions';

import { useContext, createContext } from 'react';
import { useAssetActions } from '@/hooks/use-asset-actions';

// ---------------------------------------------------------------------------
// Global provider for the shared Buy/Sell/Send/Receive flows. Owns ONE
// useAssetActions instance and renders its flow modals (asset picker → chain
// setup → onramp/receive) at the app root, so the modals persist regardless of
// which component triggered them — a transient trigger (e.g. the get-started
// picker on an empty portfolio) can unmount while the flow stays open, and the
// page behind it can unlock in place. Components call startAction/startFlow via
// useAssetActionsContext instead of instantiating their own copy.
// ---------------------------------------------------------------------------

interface AssetActionsContextValue {
  startAction: (action: AssetActionKey) => void;
  startFlow: (action: 'buy' | 'sell' | 'receive', symbol: string) => void;
}

const AssetActionsContext = createContext<AssetActionsContextValue | null>(null);

export function AssetActionsProvider({ children }: { children: ReactNode }) {
  const { startAction, startFlow, flowModals } = useAssetActions();
  return (
    <AssetActionsContext.Provider value={{ startAction, startFlow }}>
      {children}
      {flowModals}
    </AssetActionsContext.Provider>
  );
}

export function useAssetActionsContext(): AssetActionsContextValue {
  const ctx = useContext(AssetActionsContext);
  if (!ctx) {
    throw new Error('useAssetActionsContext must be used within an AssetActionsProvider');
  }
  return ctx;
}
