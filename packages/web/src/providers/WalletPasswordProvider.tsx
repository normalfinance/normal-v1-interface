'use client';

import { useSnackbar } from 'notistack';
import { usePersistStore, useNormalWalletStore } from '@normalfinance/state';
import { useRef, useState, useContext, useCallback, createContext } from 'react';

import WalletPasswordModal, {
  type WalletPasswordMode,
} from '@/components/_common/wallet-password-modal';

const NORMAL_WALLET_STORAGE_KEY = 'normal-wallet-private-key';

interface WalletPasswordContextValue {
  requestPassword: (mode: WalletPasswordMode) => Promise<string>;
}

const WalletPasswordContext = createContext<WalletPasswordContextValue | null>(null);

export function useWalletPassword() {
  const ctx = useContext(WalletPasswordContext);
  if (!ctx) {
    throw new Error('useWalletPassword must be used within WalletPasswordProvider');
  }
  return ctx;
}

type PendingRequest = {
  resolve: (password: string) => void;
  reject: (reason?: unknown) => void;
};

export function WalletPasswordProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<WalletPasswordMode>('enter');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const pendingRef = useRef<PendingRequest | null>(null);

  const { enqueueSnackbar } = useSnackbar();
  const persistStore = usePersistStore();
  const normalWalletStore = useNormalWalletStore();

  const requestPassword = useCallback(
    (requestMode: WalletPasswordMode): Promise<string> =>
      new Promise<string>((resolve, reject) => {
        // If there's already a pending request, reject the old one
        if (pendingRef.current) {
          pendingRef.current.reject(new Error('New password request superseded previous'));
        }
        pendingRef.current = { resolve, reject };
        setMode(requestMode);
        setError(null);
        setLoading(false);
        setOpen(true);
      }),
    []
  );

  const handleSubmit = useCallback((password: string) => {
    if (pendingRef.current) {
      pendingRef.current.resolve(password);
      pendingRef.current = null;
    }
    setOpen(false);
    setError(null);
    setLoading(false);
  }, []);

  const handleClose = useCallback(() => {
    if (pendingRef.current) {
      pendingRef.current.reject(new Error('User cancelled password entry'));
      pendingRef.current = null;
    }
    setOpen(false);
    setError(null);
    setLoading(false);
  }, []);

  const handleForgotPassword = useCallback(() => {
    // Clear encrypted key and disconnect wallet
    localStorage.removeItem(NORMAL_WALLET_STORAGE_KEY);
    normalWalletStore.setKeypair(null);
    normalWalletStore.setConnected(false);
    normalWalletStore.setPublicKey('');
    persistStore.disconnectWallet();

    if (pendingRef.current) {
      pendingRef.current.reject(new Error('Password reset — wallet cleared'));
      pendingRef.current = null;
    }

    setOpen(false);
    setError(null);
    setLoading(false);

    enqueueSnackbar(
      'Wallet data cleared. Please re-import your wallet using your recovery phrase.',
      {
        variant: 'info',
        autoHideDuration: 8000,
      }
    );
  }, [enqueueSnackbar, normalWalletStore, persistStore]);

  return (
    <WalletPasswordContext.Provider value={{ requestPassword }}>
      {children}
      <WalletPasswordModal
        open={open}
        onClose={handleClose}
        onSubmit={handleSubmit}
        onForgotPassword={mode === 'enter' ? handleForgotPassword : undefined}
        mode={mode}
        error={error}
        loading={loading}
      />
    </WalletPasswordContext.Provider>
  );
}
