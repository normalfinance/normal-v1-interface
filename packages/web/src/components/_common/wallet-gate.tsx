import React, { useState } from 'react';
import { useTranslate } from '@/locales';
import { logger } from '@normalfinance/utils';
import { useBoolean } from 'minimal-shared/hooks';
import { CURRENT_TOS_VERSION } from '@normalfinance/types';
import { useAppStore, usePersistStore } from '@normalfinance/state';
import { useStellarWalletsKit } from '@/hooks/stellar/use-stellar-wallets-kit';
import { useNormalWallet } from '@/hooks/stellar/use-normal-wallet';

import { Button } from '@mui/material';

import TermsOfServiceDialog from '@/components/_common/drawer-components/terms-of-service-dialog';
import WalletSelectionModal, {
  hasSeenWalletSelectionModal,
} from '@/components/_common/wallet-selection-modal';
import NormalWalletCreate from '@/components/_common/normal-wallet-create';
import NormalWalletImport from '@/components/_common/normal-wallet-import';

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
  const { connectWallet: connectNormalWallet, publicKey: normalPublicKey, isConnected: isNormalConnected } = useNormalWallet();
  const isWalletConnected = !!persist.wallet.address || isConnected || isNormalConnected;

  /* ↓ drawer UI toggle (only used when wallet is connected) -------- */
  const { value: open, onTrue: onOpen, onFalse: onClose } = useBoolean();

  const disclaimerVersion = usePersistStore((s: any) => s.disclaimer.version);
  const { modalState, setModalView } = useAppStore();

  const [showWalletSelection, setShowWalletSelection] = useState(false);
  const [showCreateNormalWallet, setShowCreateNormalWallet] = useState(false);
  const [showImportNormalWallet, setShowImportNormalWallet] = useState(false);

  /** Handle connecting wallet - show wallet selection modal or Stellar Wallets Kit popup */
  const handleConnectClick = async () => {
    if (disclaimerVersion < CURRENT_TOS_VERSION) {
      setModalView('disclaimer', true);
      return;
    }

    // Check if user has seen wallet selection modal before
    if (!hasSeenWalletSelectionModal()) {
      setShowWalletSelection(true);
      return;
    }

    // If Normal wallet is already connected, just ensure persist store is updated
    if (normalPublicKey && isNormalConnected) {
      await connectNormalWallet();
      return;
    }

    // Otherwise, proceed to Stellar Wallet Kit
    await handleConnectStellarWallet();
  };

  /** Handle connecting to Stellar Wallet Kit */
  const handleConnectStellarWallet = async () => {
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

  /** Handle Normal wallet creation success */
  const handleNormalWalletCreated = async () => {
    setShowCreateNormalWallet(false);
    if (normalPublicKey) {
      await connectNormalWallet();
    }
  };

  /** Handle Normal wallet import success */
  const handleNormalWalletImported = async () => {
    setShowImportNormalWallet(false);
    if (normalPublicKey) {
      await connectNormalWallet();
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
    setModalView('disclaimer', false);

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
      <TermsOfServiceDialog open={modalState.disclaimer} onClose={handleTosClose} />
      <WalletSelectionModal
        open={showWalletSelection}
        onClose={() => setShowWalletSelection(false)}
        onCreateNormalWallet={() => setShowCreateNormalWallet(true)}
        onConnectNormalWallet={() => setShowImportNormalWallet(true)}
        onContinueToOtherWallets={handleConnectStellarWallet}
      />
      <NormalWalletCreate
        open={showCreateNormalWallet}
        onClose={() => setShowCreateNormalWallet(false)}
        onSuccess={handleNormalWalletCreated}
      />
      <NormalWalletImport
        open={showImportNormalWallet}
        onClose={() => setShowImportNormalWallet(false)}
        onSuccess={handleNormalWalletImported}
      />
    </>
  );
};

export default WalletGate;
