import React, { useState } from 'react';
import { useTranslate } from '@/locales';
import { logger } from '@normalfinance/utils';
import { useBoolean } from 'minimal-shared/hooks';
import { usePersistStore } from '@normalfinance/state';
import { CURRENT_TOS_VERSION } from '@normalfinance/types';
import { useStellarWalletsKit } from '@/hooks/stellar/use-stellar-wallets-kit';

import { Button } from '@mui/material';

import TermsOfServiceDialog from '@/components/_common/drawer-components/terms-of-service-dialog';

interface WalletGateProps {
  children: React.ReactNode;
  buttonText?: string;
  fullWidth?: boolean;
  variant?: 'contained' | 'soft' | 'outlined';
  color?: 'info' | 'success' | 'primary' | 'secondary' | 'error' | 'warning';
}

/* ------------------------------------------------------------------ */
/* ② Connected: simple summary / logout                               */
/* ------------------------------------------------------------------ */

export const WalletGate: React.FC<WalletGateProps> = ({
  children,
  buttonText = 'Connect Wallet',
  fullWidth = true,
  variant = 'contained',
  color = 'info',
}) => {
  const persist = usePersistStore();
  const { t } = useTranslate();
  const { connectWallet, publicKey, isConnected, disconnectWallet } = useStellarWalletsKit();
  const isWalletConnected = !!persist.wallet.address || isConnected;

  /* ↓ drawer UI toggle (only used when wallet is connected) -------- */
  const { value: open, onTrue: onOpen, onFalse: onClose } = useBoolean();

  const disclaimerVersion = usePersistStore((s: any) => s.disclaimer.version);
  const [showTos, setShowTos] = useState(false);

  /** Handle connecting wallet - show Stellar Wallets Kit popup OR ToS */
  const handleConnectClick = async () => {
    if (disclaimerVersion < CURRENT_TOS_VERSION) {
      setShowTos(true);
      return;
    }

    try {
      await connectWallet();

      // After successful connection, store the wallet info in our state
      if (publicKey) {
        await persist.connectWallet(publicKey, 'stellar-wallets-kit');
      }
    } catch (error) {
      logger.error('Error connecting wallet:', error);
    }
  };

  /** Handle wallet disconnect */
  const handleDisconnectClick = async () => {
    try {
      await disconnectWallet();
      persist.disconnectWallet();
      onClose();
    } catch (error) {
      logger.error('Error disconnecting wallet:', error);
    }
  };

  /** Called when ToS dialog closes */
  const handleTosClose = async () => {
    setShowTos(false);

    // Check if user accepted ToS, then connect wallet
    const latestVersion = usePersistStore.getState().disclaimer.version;
    if (latestVersion >= CURRENT_TOS_VERSION) {
      await handleConnectClick();
    }
  };

  if (isWalletConnected) {
    return children;
  }

  return (
    <>
      <Button
        fullWidth={fullWidth}
        variant={variant}
        color={color}
        onClick={handleConnectClick}
        data-testid="wallet-gate-connect-btn"
      >
        {t(buttonText)}
      </Button>
      <TermsOfServiceDialog open={showTos} onClose={handleTosClose} />
    </>
  );
};

export default WalletGate;
