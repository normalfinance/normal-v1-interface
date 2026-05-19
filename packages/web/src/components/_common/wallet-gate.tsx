import React, { useState } from 'react';
import { useTranslate } from '@/locales';
import { logger } from '@normalfinance/utils';
import { usePersistStore } from '@normalfinance/state';
import { useSupabaseAuth } from '@/providers/SupabaseAuthProvider';
import { useNormalWallet } from '@/hooks/stellar/use-normal-wallet';
import { useStellarWalletsKit } from '@/hooks/stellar/use-stellar-wallets-kit';

import { Button } from '@mui/material';

import OnboardingWizard from '@/components/_common/onboarding-wizard';
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
  const { session, isLoading } = useSupabaseAuth();
  const { connectWallet, isConnected } = useStellarWalletsKit();
  const {
    connectWallet: connectNormalWallet,
    publicKey: normalPublicKey,
    isConnected: isNormalConnected,
  } = useNormalWallet();
  const isWalletConnected = !!persist.wallet.address || isConnected || isNormalConnected;
  const isGatePassed = !isLoading && !!session && (!requireWalletConnection || isWalletConnected);

  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showWalletSelection, setShowWalletSelection] = useState(false);
  const [showCreateNormalWallet, setShowCreateNormalWallet] = useState(false);

  const handleConnectClick = async () => {
    if (!session) {
      setShowAuthModal(true);
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
          borderRadius: '999px',
          textTransform: 'none',
          fontWeight: 500,
          boxShadow: 'none',
          '&:hover': { bgcolor: '#1a1a2e', boxShadow: 'none' },
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
      <OnboardingWizard open={showAuthModal} onClose={() => setShowAuthModal(false)} />
    </>
  );
};

export default WalletGate;
