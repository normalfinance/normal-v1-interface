'use client';

import type { IconButtonProps } from '@mui/material/IconButton';

import posthog from 'posthog-js';
import { BigNumber } from 'bignumber.js';
import { useTranslate } from '@/locales';
import { useCallback, useEffect, useState } from 'react';
import { useBoolean } from 'minimal-shared/hooks';
import { CURRENT_TOS_VERSION } from '@normalfinance/types';
import { cdn, format, logger } from '@normalfinance/utils';
import { useUserActivity, useLiquidityPositions } from '@/hooks';
import { useAppStore, usePersistStore } from '@normalfinance/state';
import { useStellarWalletsKit } from '@/hooks/stellar/use-stellar-wallets-kit';
import { useNormalWallet } from '@/hooks/stellar/use-normal-wallet';

import { Avatar, Box, Stack, Button, Drawer, Tooltip, IconButton, Typography } from '@mui/material';

import { Iconify } from '@/components/template/iconify';
import CopyIconButton from '@/components/copy-icon-button';
import { Scrollbar } from '@/components/template/scrollbar';
import ConnectedWallet from '@/components/_common/drawer-components/connected-wallet';
import TermsOfServiceDialog from '@/components/_common/drawer-components/terms-of-service-dialog';
import WalletSelectionModal, {
  hasSeenWalletSelectionModal,
} from '@/components/_common/wallet-selection-modal';
import NormalWalletCreate from '@/components/_common/normal-wallet-create';
import NormalWalletImport from '@/components/_common/normal-wallet-import';
import AuthLoginModal from '@/components/_common/auth-login-modal';
import { useSupabaseAuth } from '@/providers/SupabaseAuthProvider';

import { AccountButton } from './account-button';
import AddUsdcTrustlineButton from './add-trustline-button';

const LOGIN_INTENT_KEY = 'normal-login-intent';

const rememberLoginIntent = () => {
  if (typeof window === 'undefined') return;
  localStorage.setItem(LOGIN_INTENT_KEY, 'true');
};

const consumeLoginIntent = () => {
  if (typeof window === 'undefined') return false;
  const hadIntent = localStorage.getItem(LOGIN_INTENT_KEY) === 'true';
  if (hadIntent) {
    localStorage.removeItem(LOGIN_INTENT_KEY);
  }
  return hadIntent;
};

function WalletConnected({ address }: { address: string }) {
  const { setGlobalIsLoading } = useAppStore();

  const {
    tokenState: { tokens },
    getAllTokens,
  } = usePersistStore();

  const { positions } = useLiquidityPositions();

  const { recentActivity } = useUserActivity();

  // Effect hook to fetch all tokens when the component mounts or address changes
  useEffect(() => {
    const refreshTokens = async (): Promise<void> => {
      if (!address) return; // Don't fetch tokens if no address

      setGlobalIsLoading(true);
      try {
        await getAllTokens(true);
      } catch (e) {
        logger.error(e);
      } finally {
        setGlobalIsLoading(false);
      }
    };

    const timer = setTimeout(() => {
      refreshTokens();
    }, 100);

    return () => clearTimeout(timer);
  }, [address, getAllTokens]);

  // Total balance
  const totalBalance = tokens.reduce((acc, tkn) => {
    const holdings = BigNumber(tkn.balance).multipliedBy(tkn.price);
    return acc.plus(holdings);
  }, BigNumber(0));

  if (!address) {
    return null;
  }

  return (
    <Box
      data-testid="wallet-connected"
      sx={{
        p: 2,
        pt: 10,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'start',
      }}
    >
      <Stack direction="row" width={1} justifyContent="space-between" alignItems="center">
        <Typography variant="subtitle1">{format.fTruncate(address, 25)}</Typography>
        <CopyIconButton value={address} alert="Address copied" />
      </Stack>

      <Stack direction="row" width={1} spacing={1} alignItems="stretch" py={2}>
        <Box sx={{ flex: 1, display: 'flex' }}>
          <AddUsdcTrustlineButton
            fullWidth
            size="large"
            variant="outlined"
            sx={{ borderRadius: 2, height: '100%' }}
          />
        </Box>
      </Stack>

      <ConnectedWallet
        address={address}
        balance={totalBalance.toNumber()}
        percentageChange={0}
        tokens={tokens}
        positions={positions}
        activity={recentActivity}
      />
    </Box>
  );
}

/* ------------------------------------------------------------------ */
/* Main Drawer component                                              */
/* ------------------------------------------------------------------ */
export type AccountDrawerProps = IconButtonProps;

export function AccountDrawer(props: AccountDrawerProps) {
  /*  stores ------------------------------------------------------ */
  const persist = usePersistStore();
  const { t } = useTranslate();
  const { connectWallet, publicKey, isConnected, disconnectWallet } = useStellarWalletsKit();
  const {
    connectWallet: connectNormalWallet,
    publicKey: normalPublicKey,
    isConnected: isNormalConnected,
    disconnectWallet: disconnectNormalWallet,
  } = useNormalWallet();
  const { session, isLoading: authLoading } = useSupabaseAuth();

  /*  drawer UI toggle ------------------------------------------- */
  const { value: open, onTrue: onOpen, onFalse: onClose } = useBoolean();

  const {
    value: isDisconnecting,
    onTrue: startDisconnecting,
    onFalse: stopDisconnecting,
  } = useBoolean();

  const avatarURL = cdn('logo/logo-single.svg');

  /* ↓ derived state ---------------------------------------------- */
  const connectedAddress = persist.wallet.address || publicKey || normalPublicKey;
  const isWalletConnected = !!connectedAddress || isConnected || isNormalConnected;

  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showWalletSelection, setShowWalletSelection] = useState(false);
  const [showCreateNormalWallet, setShowCreateNormalWallet] = useState(false);
  const [showImportNormalWallet, setShowImportNormalWallet] = useState(false);

  const handleDisconnect = async () => {
    if (isDisconnecting) {
      return;
    }

    try {
      startDisconnecting();

      persist.disconnectWallet();

      // Disconnect based on wallet type
      if (persist.wallet.walletType === 'normal-wallet') {
        await disconnectNormalWallet();
      } else {
        await disconnectWallet();
      }
      const WALLET_SELECTION_SEEN_KEY = 'wallet-selection-modal-seen';

      localStorage.removeItem(WALLET_SELECTION_SEEN_KEY);

      posthog.reset();

      onClose();
    } catch (error) {
      logger.error('Error disconnecting wallet:', error);

      onClose();
    } finally {
      stopDisconnecting();
    }
  };

  const userMetadata = session?.user?.user_metadata as
    | { picture?: string; avatar_url?: string; name?: string }
    | undefined;
  const userEmail = session?.user?.email ?? '';
  const userAvatar = userMetadata?.picture || userMetadata?.avatar_url || avatarURL;
  const displayName = userMetadata?.name || userEmail || ' ';

  useEffect(() => {
    if (connectedAddress) {
      posthog.identify(
        connectedAddress,
        { last_login: new Date() }, // updates every time
        { signup_date: new Date() } // sets only once
      );
    }
  }, [connectedAddress]);

  const disclaimerVersion = usePersistStore((s: any) => s.disclaimer.version);
  const [showTos, setShowTos] = useState(false);

  const handleConnectStellarWallet = useCallback(async () => {
    try {
      await connectWallet();
      onClose(); // Close the drawer after connecting
    } catch (error) {
      logger.error('Error connecting wallet:', error);
    }
  }, [connectWallet, onClose]);

  const handlePostAuthFlow = useCallback(async () => {
    if (disclaimerVersion < CURRENT_TOS_VERSION) {
      setShowTos(true);
      return;
    }

    if (!hasSeenWalletSelectionModal()) {
      setShowWalletSelection(true);
      return;
    }

    if (normalPublicKey && isNormalConnected) {
      await connectNormalWallet();
      onClose();
      return;
    }

    await handleConnectStellarWallet();
  }, [
    disclaimerVersion,
    handleConnectStellarWallet,
    normalPublicKey,
    isNormalConnected,
    connectNormalWallet,
    onClose,
  ]);

  /** Handle Normal wallet creation success */
  const handleNormalWalletCreated = async () => {
    setShowCreateNormalWallet(false);
    if (normalPublicKey) {
      await connectNormalWallet();
    }
    onClose();
  };

  /** Handle Normal wallet import success */
  const handleNormalWalletImported = async () => {
    setShowImportNormalWallet(false);
    if (normalPublicKey) {
      await connectNormalWallet();
    }
    onClose();
  };

  const handleMainButtonClick = () => {
    if (isWalletConnected) {
      onOpen(); // Open drawer to show wallet info
    } else {
      handleConnectClick(); // Connect wallet
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

  const handleConnectClick = async () => {
    if (!session) {
      rememberLoginIntent();
      setShowLoginModal(true);
      return;
    }

    await handlePostAuthFlow();
  };

  useEffect(() => {
    if (authLoading || !session) return;
    const hadIntent = consumeLoginIntent();
    if (hadIntent) {
      setShowLoginModal(false);
      void handlePostAuthFlow();
    }
  }, [authLoading, session, handlePostAuthFlow]);

  return (
    <>
      {isWalletConnected ? (
        <AccountButton
          data-testid="account-button"
          onClick={handleMainButtonClick}
          photoURL={userAvatar}
          displayName={displayName}
          {...props}
        />
      ) : (
        <Button
          variant="contained"
          color="info"
          onClick={handleMainButtonClick}
          data-testid="connect-wallet-button"
        >
          {t('Login')}
        </Button>
      )}
      <Drawer
        open={open}
        onClose={onClose}
        anchor="right"
        slotProps={{ backdrop: { invisible: true } }}
        PaperProps={{
          sx: {
            width: { xs: '100%', sm: 420 },
          },
        }}
      >
        {/* close (X) */}
        <Box
          sx={{
            position: 'absolute',
            top: 12,
            left: 12,
            right: 12,
            zIndex: 9,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          {/* ← close (X) */}
          <Tooltip title="Close">
            <IconButton onClick={onClose} data-testid="close-drawer-button">
              <Iconify icon="mingcute:close-line" />
            </IconButton>
          </Tooltip>

          {isWalletConnected && (
            <Tooltip title={isDisconnecting ? 'Disconnecting...' : 'Disconnect'}>
              <IconButton
                onClick={handleDisconnect}
                sx={{ ml: 'auto' }}
                disabled={isDisconnecting}
                data-testid="disconnect-wallet-button"
              >
                <Iconify icon="solar:power-bold" />
              </IconButton>
            </Tooltip>
          )}
        </Box>
        {isWalletConnected && connectedAddress && (
          <Scrollbar>
            <Stack spacing={2} sx={{ px: 2, pt: 8 }}>
              <Stack direction="row" alignItems="center" spacing={2}>
                <Avatar src={userAvatar} alt={displayName} />
                <Box>
                  <Typography variant="subtitle1">{displayName}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    {userEmail}
                  </Typography>
                </Box>
              </Stack>
            </Stack>
            <WalletConnected address={connectedAddress} />
          </Scrollbar>
        )}
      </Drawer>
      <AuthLoginModal open={showLoginModal} onClose={() => setShowLoginModal(false)} />
      <TermsOfServiceDialog open={showTos} onClose={handleTosClose} />
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
}
