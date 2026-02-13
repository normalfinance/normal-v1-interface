'use client';

import type { IconButtonProps } from '@mui/material/IconButton';

import posthog from 'posthog-js';
import { paths } from '@/routes/paths';
import { useSnackbar } from 'notistack';
import { BigNumber } from 'bignumber.js';
import { useTranslate } from '@/locales';
import { useBoolean } from 'minimal-shared/hooks';
import { useRouter, useSearchParams } from 'next/navigation';
import { useUserActivity, useManageLiquidity } from '@/hooks';
import { useRef, useState, useEffect, useCallback } from 'react';
import { useSupabaseAuth } from '@/providers/SupabaseAuthProvider';
import { useAppStore, usePersistStore } from '@normalfinance/state';
import { useNormalWallet } from '@/hooks/stellar/use-normal-wallet';
import { useStellarWalletsKit } from '@/hooks/stellar/use-stellar-wallets-kit';
import { clearLoginIntent, consumeLoginIntent, rememberLoginIntent } from '@/lib/loginIntent';
import {
  getLinkedWallets,
  type LinkedWallet,
  checkWalletCreationLimit,
} from '@/services/linked-wallets';
import {
  cdn,
  format,
  logger,
  createKeypairFromSecret,
} from '@normalfinance/utils';

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
    connectWalletWithoutKeypair,
    publicKey: normalPublicKey,
    isConnected: isNormalConnected,
    disconnectWallet: disconnectNormalWallet,
    importWalletFromMnemonic,
    importWalletFromPrivateKey,
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
  const [showImportOptionInSelection, setShowImportOptionInSelection] = useState(false);
  const [resetEmail, setResetEmail] = useState<string | null>(null);
  const [isAutoConnecting, setIsAutoConnecting] = useState(false);
  const [isCheckingRateLimit, setIsCheckingRateLimit] = useState(false);

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
      onClose();
    } catch (error) {
      logger.error('Error connecting wallet:', error);
    }
  }, [connectWallet, onClose]);

  const attemptAutoConnect = useCallback(
    async (wallet: LinkedWallet): Promise<boolean> => {
      try {
        if (wallet.custodyChoice === 'platform') {
          await connectWalletWithoutKeypair(wallet.walletAddress);
          logger.log('[AccountDrawer] Successfully auto-connected platform custody wallet');
          return true;
        } else if (wallet.custodyChoice === 'self') {
          const NORMAL_WALLET_STORAGE_KEY = 'normal-wallet-private-key';
          const storedPrivateKey = localStorage.getItem(NORMAL_WALLET_STORAGE_KEY);
          if (storedPrivateKey) {
            try {
              const privateKey = atob(storedPrivateKey);
              const keypair = createKeypairFromSecret(privateKey);
              if (keypair.publicKey() === wallet.walletAddress) {
                await importWalletFromPrivateKey(privateKey, wallet.walletName ?? undefined);
                logger.log(
                  '[AccountDrawer] Successfully auto-connected self-custody wallet from localStorage'
                );
                return true;
              }
            } catch (err) {
              logger.warn('[AccountDrawer] Failed to restore from localStorage:', err);
            }
          }
        }
        return false;
      } catch (error) {
        logger.error('[AccountDrawer] Error during auto-connect:', error);
        return false;
      }
    },
    [connectWalletWithoutKeypair, importWalletFromPrivateKey]
  );

  const handlePostAuthFlow = useCallback(async () => {
    if (!session) {
      return;
    }

    if (normalPublicKey && isNormalConnected) {
      await connectNormalWallet();
      onClose();
      return;
    }

    if (isAutoConnecting) {
      return;
    }

    setIsAutoConnecting(true);

    try {
      const linkedWallets = await getLinkedWallets();

      if (linkedWallets.length === 0) {
        if (!hasSeenWalletSelectionModal()) {
          setShowImportOptionInSelection(false);
          setShowWalletSelection(true);
        } else {
          await handleConnectStellarWallet();
        }
        return;
      }

      const mostRecentWallet = linkedWallets[0];

      const autoConnected = await attemptAutoConnect(mostRecentWallet);

      if (autoConnected) {
        enqueueSnackbar(t('Wallet connected successfully'), { variant: 'success' });
        return;
      }

      logger.warn(
        '[AccountDrawer] Auto-connect failed for wallet:',
        mostRecentWallet.walletAddress
      );
      enqueueSnackbar(t('Could not auto-connect wallet. Use Switch Wallets to reconnect.'), {
        variant: 'warning',
      });
    } catch (error) {
      logger.error('[AccountDrawer] Error in handlePostAuthFlow:', error);
      enqueueSnackbar(t('Could not connect wallet. Use Switch Wallets to try again.'), {
        variant: 'error',
      });
    } finally {
      setIsAutoConnecting(false);
    }
  }, [
    session,
    normalPublicKey,
    isNormalConnected,
    connectNormalWallet,
    onClose,
    isAutoConnecting,
    attemptAutoConnect,
    handleConnectStellarWallet,
    enqueueSnackbar,
    t,
  ]);

  /** Handle Normal wallet creation success */
  const handleNormalWalletCreated = async () => {
    setShowCreateNormalWallet(false);
    if (normalPublicKey) {
      await connectNormalWallet();
    }
    onClose();
  };

  const handleNormalWalletImported = async () => {
    setShowImportNormalWallet(false);
    if (normalPublicKey) {
      await connectNormalWallet();
    }
    onClose();
  };

  /** Format remaining time until rate limit reset */
  const formatRateLimitReset = (resetTimestamp: number): string => {
    const diffMs = resetTimestamp - Date.now();
    if (diffMs <= 0) return 'now';

    const days = Math.floor(diffMs / 86400000);
    const hours = Math.floor((diffMs % 86400000) / 3600000);

    const parts: string[] = [];
    if (days > 0) parts.push(`${days} day${days !== 1 ? 's' : ''}`);
    if (hours > 0) parts.push(`${hours} hour${hours !== 1 ? 's' : ''}`);

    return parts.length > 0 ? parts.join(', ') : 'less than an hour';
  };

  /** Handle Create New Account button click with rate limit check */
  const handleCreateNewAccountClick = useCallback(async () => {
    if (isCheckingRateLimit) return;
    setIsCheckingRateLimit(true);

    try {
      const status = await checkWalletCreationLimit();
      if (!status.allowed) {
        const remaining = formatRateLimitReset(status.reset);
        enqueueSnackbar(t(`You can only create 2 wallets per week. Try again in ${remaining}.`), {
          variant: 'warning',
        });
        return;
      }
      setShowCreateNormalWallet(true);
    } catch (error) {
      logger.error('[AccountDrawer] Error checking rate limit:', error);
      // On error, allow opening modal - actual rate limit enforced on submit
      setShowCreateNormalWallet(true);
    } finally {
      setIsCheckingRateLimit(false);
    }
  }, [isCheckingRateLimit, enqueueSnackbar, t]);

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

    if (!session) {
      if (hasHandledAuthRef.current) {
        clearLoginIntent();
        hasHandledAuthRef.current = false;
      }
      setIsAutoConnecting(false);
      if (!passwordResetSuccess) {
        setShowLoginModal(false);
      }
      return;
    }

    if (isWalletConnected) {
      setIsAutoConnecting(false);
      return;
    }

    const hadIntent = consumeLoginIntent();
    if (hadIntent && !hasHandledAuthRef.current) {
      hasHandledAuthRef.current = true;
      setShowLoginModal(false);
      void handlePostAuthFlow();
    }
  }, [authLoading, session, handlePostAuthFlow, passwordResetSuccess, isWalletConnected]);

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
              {isAutoConnecting ? (
                <Box
                  sx={{
                    px: 2,
                    py: 4,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                  }}
                >
                  <CircularProgress sx={{ mb: 2 }} />
                  <Typography variant="body2" color="text.secondary">
                    {t('Connecting to your wallet...')}
                  </Typography>
                </Box>
              ) : isWalletConnected && connectedAddress ? (
                <>
                  <Stack spacing={1} sx={{ mb: 2 }}>
                    <Button
                      variant="outlined"
                      color="primary"
                      fullWidth
                      startIcon={
                        isCheckingRateLimit ? (
                          <CircularProgress size={16} color="inherit" />
                        ) : (
                          <Iconify icon="mingcute:add-line" />
                        )
                      }
                      onClick={handleCreateNewAccountClick}
                      disabled={isCheckingRateLimit}
                    >
                      {t('Create New Account')}
                    </Button>
                    <Button
                      variant="outlined"
                      color="primary"
                      fullWidth
                      startIcon={<Iconify icon="solar:refresh-bold" />}
                      onClick={() => {
                        setShowImportOptionInSelection(true);
                        setShowWalletSelection(true);
                      }}
                    >
                      {t('Switch Wallets')}
                    </Button>
                  </Stack>
                  <WalletConnected address={connectedAddress} />
                </>
              ) : (
                <Box sx={{ px: 2, py: 4 }}>
                  <Typography variant="h6" sx={{ mb: 2 }}>
                    {t('Account Setup')}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                    {t('Complete your account to start investing')}
                  </Typography>
                  <Stack spacing={1.5}>
                    <Button
                      variant="contained"
                      color="primary"
                      fullWidth
                      onClick={handleConnectClick}
                    >
                      {t('Complete')}
                    </Button>
                    <Button
                      variant="outlined"
                      color="primary"
                      fullWidth
                      startIcon={<Iconify icon="solar:refresh-bold" />}
                      onClick={() => {
                        setShowImportOptionInSelection(true);
                        setShowWalletSelection(true);
                      }}
                    >
                      {t('Switch Wallets')}
                    </Button>
                  </Stack>
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
        onClose={() => {
          setShowWalletSelection(false);
          setShowImportOptionInSelection(false);
        }}
        onCreateNormalWallet={() => setShowCreateNormalWallet(true)}
        onConnectNormalWallet={() => setShowImportNormalWallet(true)}
        onContinueToOtherWallets={handleConnectStellarWallet}
        showImportOption={showImportOptionInSelection}
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
        onBack={() => {
          setShowImportNormalWallet(false);
          setShowImportOptionInSelection(true);
          setShowWalletSelection(true);
        }}
      />
    </>
  );
}
