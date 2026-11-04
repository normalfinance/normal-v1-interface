import React, { useState } from 'react';
import { logger } from '@/utils/logger';
import { useTranslate } from '@/locales';
import { useGoToLogin } from '@/hooks/use-go-to-login';
import { usePersistStore } from '@normalfinance/state';
import { useSupabaseAuth } from '@/providers/SupabaseAuthProvider';
import { useNormalWallet } from '@/hooks/stellar/use-normal-wallet';
import { useStellarWalletsKit } from '@/hooks/stellar/use-stellar-wallets-kit';

import { Button } from '@mui/material';

import NormalWalletCreate from '@/components/_common/normal-wallet-create';
import WalletSelectionModal, {
  hasSeenWalletSelectionModal,
} from '@/components/_common/wallet-selection-modal';

interface WalletGateProps {
  children: React.ReactNode;
  buttonText?: string;
  fullWidth?: boolean;
  variant?: 'contained' | 'soft' | 'outlined';
  color?: 'info' | 'success' | 'primary' | 'secondary' | 'error' | 'warning';
  requireWalletConnection?: boolean;
}

export const WalletGate: React.FC<WalletGateProps> = ({
  children,
  buttonText = 'Login',
  fullWidth = true,
  variant = 'soft',
  color = 'info',
  requireWalletConnection = true,
}) => {
  const persist = usePersistStore();
  const { t } = useTranslate();
  const goToLogin = useGoToLogin();
  const { session, isLoading } = useSupabaseAuth();
  const { connectWallet, isConnected } = useStellarWalletsKit();
  const {
    connectWallet: connectNormalWallet,
    publicKey: normalPublicKey,
    isConnected: isNormalConnected,
  } = useNormalWallet();
  const isWalletConnected = !!persist.wallet.address || isConnected || isNormalConnected;
  const isGatePassed = !isLoading && !!session && (!requireWalletConnection || isWalletConnected);

  const [showWalletSelection, setShowWalletSelection] = useState(false);
  const [showCreateNormalWallet, setShowCreateNormalWallet] = useState(false);

  const handleConnectClick = async () => {
    if (!session) {
      goToLogin();
      return;
    }
    if (!requireWalletConnection) {
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
        variant="contained"
        onClick={handleConnectClick}
        data-testid="wallet-gate-connect-btn"
        size="large"
        sx={{
          mt: 2,
          bgcolor: '#0A0A0F',
          color: '#fff',
          borderRadius: 'var(--radius-md)',
          textTransform: 'none',
          fontWeight: 500,
          boxShadow: 'none',
          '&:hover': { bgcolor: '#2A2A33', boxShadow: 'none' },
        }}
      >
        {t(buttonText)}
      </Button>
      {requireWalletConnection && (
        <>
          <WalletSelectionModal
            open={showWalletSelection}
            onClose={() => setShowWalletSelection(false)}
            onCreateNormalWallet={() => setShowCreateNormalWallet(true)}
            onContinueToOtherWallets={handleConnectStellarWallet}
          />
          <NormalWalletCreate
            open={showCreateNormalWallet}
            onClose={() => setShowCreateNormalWallet(false)}
            onSuccess={handleNormalWalletCreated}
          />
        </>
      )}
    </>
  );
};

export default WalletGate;
