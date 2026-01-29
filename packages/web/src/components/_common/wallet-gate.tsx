import React, { useState } from 'react';
import { useTranslate } from '@/locales';
import { logger } from '@normalfinance/utils';
import { usePersistStore } from '@normalfinance/state';
import { useNormalWallet } from '@/hooks/stellar/use-normal-wallet';
import { useStellarWalletsKit } from '@/hooks/stellar/use-stellar-wallets-kit';
import { useSupabaseAuth } from '@/providers/SupabaseAuthProvider';

import { Button } from '@mui/material';

import AuthLoginModal from '@/components/_common/auth-login-modal';
import NormalWalletCreate from '@/components/_common/normal-wallet-create';
import NormalWalletImport from '@/components/_common/normal-wallet-import';
import WalletSelectionModal, {
  hasSeenWalletSelectionModal,
} from '@/components/_common/wallet-selection-modal';

interface WalletGateProps {
  children: React.ReactNode;
  buttonText?: string;
  fullWidth?: boolean;
  variant?: 'contained' | 'soft' | 'outlined';
  color?: 'info' | 'success' | 'primary' | 'secondary' | 'error' | 'warning';
}

export const WalletGate: React.FC<WalletGateProps> = ({
  children,
  buttonText = 'Login',
  fullWidth = true,
  variant = 'soft',
  color = 'info',
}) => {
  const persist = usePersistStore();
  const { t } = useTranslate();
  const { session, isLoading } = useSupabaseAuth();
  const { connectWallet, publicKey, isConnected, disconnectWallet } = useStellarWalletsKit();
  const {
    connectWallet: connectNormalWallet,
    publicKey: normalPublicKey,
    isConnected: isNormalConnected,
  } = useNormalWallet();
  const isWalletConnected = !!persist.wallet.address || isConnected || isNormalConnected;
  const isGatePassed = !isLoading && !!session && isWalletConnected;

  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showWalletSelection, setShowWalletSelection] = useState(false);
  const [showCreateNormalWallet, setShowCreateNormalWallet] = useState(false);
  const [showImportNormalWallet, setShowImportNormalWallet] = useState(false);

  const handleConnectClick = async () => {
    if (!session) {
      setShowAuthModal(true);
      return;
    }
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

  if (isGatePassed) {
    return children;
  }
  if (isLoading) {
    return null;
  }

  return (
    <>
      <Button
        fullWidth={fullWidth}
        variant={variant}
        color={color}
        onClick={handleConnectClick}
        data-testid="wallet-gate-connect-btn"
        size="large"
        sx={{ mt: 2 }}
      >
        {t(buttonText)}
      </Button>
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
      <AuthLoginModal
        open={showAuthModal}
        onClose={() => setShowAuthModal(false)}
      />
    </>
  );
};

export default WalletGate;
