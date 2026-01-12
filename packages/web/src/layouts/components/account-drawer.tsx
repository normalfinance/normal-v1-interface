'use client';

import type { IconButtonProps } from '@mui/material/IconButton';

import posthog from 'posthog-js';
import { paths } from '@/routes/paths';
import { useSnackbar } from 'notistack';
import { BigNumber } from 'bignumber.js';
import { useTranslate } from '@/locales';
import { useBoolean } from 'minimal-shared/hooks';
import { cdn, format, logger } from '@normalfinance/utils';
import { useRouter, useSearchParams } from 'next/navigation';
import { useUserActivity, useManageLiquidity } from '@/hooks';
import { useRef, useState, useEffect, useCallback } from 'react';
import { useSupabaseAuth } from '@/providers/SupabaseAuthProvider';
import { useAppStore, usePersistStore } from '@normalfinance/state';
import { useNormalWallet } from '@/hooks/stellar/use-normal-wallet';
import { useStellarWalletsKit } from '@/hooks/stellar/use-stellar-wallets-kit';
import { clearLoginIntent, consumeLoginIntent, rememberLoginIntent } from '@/lib/loginIntent';

import {
  Box,
  Stack,
  Avatar,
  Button,
  Drawer,
  Tooltip,
  IconButton,
  Typography,
  CircularProgress,
} from '@mui/material';

import { Iconify } from '@/components/template/iconify';
import CopyIconButton from '@/components/copy-icon-button';
import { Scrollbar } from '@/components/template/scrollbar';
import AuthLoginModal from '@/components/_common/auth-login-modal';
import NormalWalletCreate from '@/components/_common/normal-wallet-create';
import NormalWalletImport from '@/components/_common/normal-wallet-import';
import ConnectedWallet from '@/components/_common/drawer-components/connected-wallet';
import WalletSelectionModal, {
  hasSeenWalletSelectionModal,
} from '@/components/_common/wallet-selection-modal';

import { AccountButton } from './account-button';

function WalletConnected({ address }: { address: string }) {
  const { setGlobalIsLoading } = useAppStore();

  const {
    tokenState: { tokens },
    getAllTokens,
  } = usePersistStore();

  const { liquidityPositions } = useManageLiquidity();

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
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'start',
      }}
    >
      <ConnectedWallet
        address={address}
        balance={totalBalance.toNumber()}
        percentageChange={0}
        tokens={tokens}
        positions={liquidityPositions}
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
  const router = useRouter();
  const searchParams = useSearchParams();
  const { connectWallet, publicKey, isConnected, disconnectWallet } = useStellarWalletsKit();
  const {
    connectWallet: connectNormalWallet,
    publicKey: normalPublicKey,
    isConnected: isNormalConnected,
    disconnectWallet: disconnectNormalWallet,
  } = useNormalWallet();
  const { session, isLoading: authLoading, signOut } = useSupabaseAuth();
  const { enqueueSnackbar } = useSnackbar();

  /*  drawer UI toggle ------------------------------------------- */
  const { value: open, onTrue: onOpen, onFalse: onClose } = useBoolean();

  const {
    value: isDisconnecting,
    onTrue: startDisconnecting,
    onFalse: stopDisconnecting,
  } = useBoolean();

  const {
    value: isNavigatingToSettings,
    onTrue: startNavigatingToSettings,
    onFalse: stopNavigatingToSettings,
  } = useBoolean();

  const avatarURL = cdn('logo/logo-single.svg');

  /* ↓ derived state ---------------------------------------------- */
  const connectedAddress = persist.wallet.address || publicKey || normalPublicKey;
  const isWalletConnected = !!connectedAddress || isConnected || isNormalConnected;

  const [showLoginModal, setShowLoginModal] = useState(false);
  const [passwordResetSuccess, setPasswordResetSuccess] = useState(false);
  const [showWalletSelection, setShowWalletSelection] = useState(false);
  const [showCreateNormalWallet, setShowCreateNormalWallet] = useState(false);
  const [showImportNormalWallet, setShowImportNormalWallet] = useState(false);
  const [resetEmail, setResetEmail] = useState<string | null>(null);

  const handleDisconnect = async () => {
    if (isDisconnecting) {
      return;
    }

    try {
      startDisconnecting();

      const walletTypeBeforeDisconnect = persist.wallet.walletType;

      await signOut();

      if (walletTypeBeforeDisconnect === 'normal-wallet') {
        await disconnectNormalWallet();
      } else {
        await disconnectWallet();
      }

      persist.disconnectWallet();

      const WALLET_SELECTION_SEEN_KEY = 'wallet-selection-modal-seen';
      localStorage.removeItem(WALLET_SELECTION_SEEN_KEY);

      posthog.reset();

      enqueueSnackbar('Logged out successfully', { variant: 'success' });

      window.location.reload();
    } catch (error) {
      logger.error('Error disconnecting wallet:', error);

      enqueueSnackbar('Error disconnecting wallet', { variant: 'error' });
    } finally {
      stopDisconnecting();
      onClose();
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

  const handleConnectStellarWallet = useCallback(async () => {
    try {
      await connectWallet();
      onClose(); // Close the drawer after connecting
    } catch (error) {
      logger.error('Error connecting wallet:', error);
    }
  }, [connectWallet, onClose]);

  const handlePostAuthFlow = useCallback(async () => {
    // TOS is now handled in AuthLoginModal, proceed directly to wallet selection
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
    if (session) {
      onOpen(); // Open drawer to show account info
    } else {
      handleConnectClick(); // Show login modal
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

  const hasHandledAuthRef = useRef(false);

  useEffect(() => {
    const passwordResetParam = searchParams.get('passwordResetSuccess');
    const emailParam = searchParams.get('email');
    if (passwordResetParam === 'true') {
      setPasswordResetSuccess(true);
      if (emailParam) {
        setResetEmail(decodeURIComponent(emailParam));
      }
      setShowLoginModal(true);
      router.replace('/', { scroll: false });
    }
  }, [searchParams, router]);

  useEffect(() => {
    if (authLoading) return;

    console.log('session before handlePostAuthFlow', session);

    if (!session) {
      if (hasHandledAuthRef.current) {
        clearLoginIntent();
        hasHandledAuthRef.current = false;
      }
      if (!passwordResetSuccess) {
        setShowLoginModal(false);
      }
      return;
    }

    const hadIntent = consumeLoginIntent();
    if (hadIntent && !hasHandledAuthRef.current) {
      hasHandledAuthRef.current = true;
      setShowLoginModal(false);
      void handlePostAuthFlow();
    }
  }, [authLoading, session, handlePostAuthFlow, passwordResetSuccess]);

  return (
    <>
      {session ? (
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

          {session && (
            <Tooltip title={isDisconnecting ? 'Logging out...' : 'Logout'}>
              <Button
                variant="soft"
                color="error"
                size="small"
                onClick={handleDisconnect}
                disabled={isDisconnecting}
                sx={{ ml: 'auto' }}
                data-testid="logout-button"
                startIcon={<Iconify icon="solar:logout-2-bold" />}
              >
                {t('Logout')}
              </Button>
            </Tooltip>
          )}
        </Box>
        {session && (
          <Scrollbar>
            <Stack spacing={2} sx={{ px: 2, pt: 8 }}>
              <Stack direction="row" alignItems="center" spacing={2}>
                <Avatar src={userAvatar} alt={displayName} />
                <Box>
                  <Typography variant="subtitle1">{displayName}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    {userEmail}
                  </Typography>
                  {connectedAddress && (
                    <Stack
                      direction="row"
                      width={1}
                      justifyContent="space-between"
                      alignItems="center"
                    >
                      <Typography variant="subtitle2">
                        {format.fTruncate(connectedAddress, 25)}
                      </Typography>
                      <CopyIconButton value={connectedAddress} alert="Account ID copied" />
                    </Stack>
                  )}
                </Box>
              </Stack>
              <Button
                variant="soft"
                color="primary"
                fullWidth
                startIcon={
                  isNavigatingToSettings ? (
                    <CircularProgress size={16} color="inherit" />
                  ) : (
                    <Iconify icon="solar:settings-bold" />
                  )
                }
                onClick={() => {
                  startNavigatingToSettings();
                  router.push(paths.settings);
                  stopNavigatingToSettings();
                  onClose();
                }}
                disabled={isNavigatingToSettings}
                sx={{ mb: 1 }}
              >
                {isNavigatingToSettings ? t('Loading...') : t('Settings')}
              </Button>
              {isWalletConnected && connectedAddress ? (
                <WalletConnected address={connectedAddress} />
              ) : (
                <Box sx={{ px: 2, py: 4 }}>
                  <Typography variant="h6" sx={{ mb: 2 }}>
                    {t('Account Setup')}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                    {t('Complete your account to start investing')}
                  </Typography>
                  <Button
                    variant="contained"
                    color="primary"
                    fullWidth
                    onClick={handleConnectClick}
                    sx={{ mb: 2 }}
                  >
                    {t('Complete')}
                  </Button>
                </Box>
              )}
            </Stack>
          </Scrollbar>
        )}
      </Drawer>
      <AuthLoginModal
        open={showLoginModal}
        onClose={() => {
          setShowLoginModal(false);
          setPasswordResetSuccess(false);
          setResetEmail(null);
        }}
        passwordResetSuccess={passwordResetSuccess}
        resetEmail={resetEmail}
      />
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
