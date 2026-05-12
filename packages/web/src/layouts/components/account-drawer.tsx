'use client';

import type { IconButtonProps } from '@mui/material/IconButton';

import { paths } from '@/routes/paths';
import { useSnackbar } from 'notistack';
import { BigNumber } from 'bignumber.js';
import { useTranslate } from '@/locales';
import { useUserActivity, useStellarConfig } from '@/hooks';
import { useBoolean } from 'minimal-shared/hooks';
import { cdn, format, logger } from '@normalfinance/utils';
import { useRouter, useSearchParams } from 'next/navigation';
import { useRef, useState, useEffect, useCallback } from 'react';
import { useSupabaseAuth } from '@/providers/SupabaseAuthProvider';
import { useStellarWalletsKit } from '@/hooks/stellar/use-stellar-wallets-kit';
import { useAccountStatus } from '@/hooks/stellar/use-account-status';
import { useAppStore, usePersistStore, useNetworkStore } from '@normalfinance/state';
import { useDefindexSavings } from '@/hooks/stellar/use-defindex-savings';
import { getSavingsUsdcIssuer } from '@/utils/token-selectors';
import { clearLoginIntent, consumeLoginIntent, rememberLoginIntent } from '@/lib/loginIntent';
import {
  getLinkedWallets,
  type LinkedWallet,
} from '@/services/linked-wallets';
import {
  useNormalWallet,
  hasStoredNormalWalletKey,
  NORMAL_WALLET_REIMPORT_REQUIRED_MESSAGE,
} from '@/hooks/stellar/use-normal-wallet';

import { alpha, useTheme } from '@mui/material/styles';
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
import OnboardingWizard, { type WizardStep } from '@/components/_common/onboarding-wizard';
import NormalWalletCreate from '@/components/_common/normal-wallet-create';
import NormalWalletImport from '@/components/_common/normal-wallet-import';
import ConnectedWallet from '@/components/_common/drawer-components/connected-wallet';
import WalletSelectionModal, {
  hasSeenWalletSelectionModal,
} from '@/components/_common/wallet-selection-modal';

import { AccountButton } from './account-button';

function WalletConnected({ address, drawerOpen }: { address: string; drawerOpen: boolean }) {
  const { setGlobalIsLoading } = useAppStore();

  const {
    tokenState: { tokens },
    getAllTokens,
  } = usePersistStore();
  const network = useNetworkStore((s) => s.network);

  const { recentActivity } = useUserActivity(address);
  const { userPosition, fetching: savingsFetching, refreshVaultInfo } = useDefindexSavings();

  // Effect hook to fetch all tokens when the component mounts, address changes, or network toggles
  useEffect(() => {
    const refreshTokens = async (): Promise<void> => {
      if (!address) return;

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
  }, [address, getAllTokens, network, setGlobalIsLoading]);

  // Refetch savings every time the drawer opens (skip if already in flight)
  useEffect(() => {
    if (drawerOpen && address && !savingsFetching) {
      refreshVaultInfo();
    }
  }, [drawerOpen, address, refreshVaultInfo]); // eslint-disable-line react-hooks/exhaustive-deps

  const assetsBalance = tokens.reduce((acc, tkn) => {
    const holdings = BigNumber(tkn.balance).multipliedBy(tkn.price);
    return acc.plus(holdings);
  }, BigNumber(0));

  const savingsValue = Math.max(parseFloat(userPosition?.currentValue || '0'), 0);
  const savingsLoaded = userPosition !== null;

  if (!address) {
    return null;
  }

  return (
    <Box
      data-testid="wallet-connected"
      sx={{
        pb: 2,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'start',
      }}
    >
      <ConnectedWallet
        address={address}
        balance={assetsBalance.toNumber()}
        savingsValue={savingsValue}
        savingsFetching={savingsFetching && !savingsLoaded}
        percentageChange={0}
        tokens={tokens}
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
  const theme = useTheme();
  const { t } = useTranslate();
  const router = useRouter();
  const searchParams = useSearchParams();
  const config = useStellarConfig();
  const savingsUsdcIssuer = getSavingsUsdcIssuer(config);
  const { connectWallet, publicKey, isConnected, disconnectWallet } = useStellarWalletsKit();
  const {
    connectWallet: connectNormalWallet,
    connectWalletWithoutKeypair,
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

  // Only fetch account status while the drawer is open and a wallet is connected
  const { isLoading: isCheckingSetup, accountExists, hasUsdcTrustline } = useAccountStatus(
    open && connectedAddress ? connectedAddress : '',
    { assetIssuer: savingsUsdcIssuer }
  );
  const isSetupIncomplete =
    !!connectedAddress &&
    !isCheckingSetup &&
    (!accountExists || !!(savingsUsdcIssuer && !hasUsdcTrustline));

  const [showLoginModal, setShowLoginModal] = useState(false);
  const [wizardInitialStep, setWizardInitialStep] = useState<WizardStep | undefined>(undefined);
  const [passwordResetSuccess, setPasswordResetSuccess] = useState(false);
  const [showWalletSelection, setShowWalletSelection] = useState(false);
  const [showCreateNormalWallet, setShowCreateNormalWallet] = useState(false);
  const [showImportNormalWallet, setShowImportNormalWallet] = useState(false);
  const [showImportOptionInSelection, setShowImportOptionInSelection] = useState(false);
  const [resetEmail, setResetEmail] = useState<string | null>(null);
  const [isAutoConnecting, setIsAutoConnecting] = useState(false);

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

  const handleConnectStellarWallet = useCallback(async () => {
    try {
      await connectWallet();
      onClose();
    } catch (error) {
      logger.error('Error connecting wallet:', error);
    }
  }, [connectWallet, onClose]);

  const attemptAutoConnect = useCallback(
    async (wallet: LinkedWallet): Promise<'connected' | 'requires-reimport' | 'failed'> => {
      try {
        if (!hasStoredNormalWalletKey()) {
          return 'requires-reimport';
        }

        // Self-custody only: connect address-only. The restoreWallet useEffect
        // in use-normal-wallet handles the password prompt and keypair restoration.
        await connectWalletWithoutKeypair(wallet.walletAddress);
        logger.log('[AccountDrawer] Auto-connected wallet in address-only mode');
        return 'connected';
      } catch (error) {
        logger.error('[AccountDrawer] Error during auto-connect:', error);
        return 'failed';
      }
    },
    [connectWalletWithoutKeypair]
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

      if (autoConnected === 'connected') {
        enqueueSnackbar(t('Wallet connected successfully'), { variant: 'success' });
        return;
      }

      if (autoConnected === 'requires-reimport') {
        enqueueSnackbar(NORMAL_WALLET_REIMPORT_REQUIRED_MESSAGE, {
          variant: 'info',
          autoHideDuration: 8000,
        });
        setShowImportNormalWallet(true);
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
  // Tracks showLoginModal without adding it as an effect dependency (avoids
  // the effect re-firing and immediately closing the modal on open).
  const showLoginModalRef = useRef(showLoginModal);
  useEffect(() => { showLoginModalRef.current = showLoginModal; }, [showLoginModal]);

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
      // Don't close the wizard if it's currently open handling its own flow
      if (!passwordResetSuccess && !showLoginModalRef.current) {
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
      // Always use the wizard for post-auth wallet setup (covers OAuth redirects
      // where the wizard was closed by the page reload).
      // If it's already open it handles itself; if not, open it now.
      if (!showLoginModalRef.current) {
        setShowLoginModal(true);
      }
    }
  }, [authLoading, session, passwordResetSuccess, isWalletConnected]);

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
            bgcolor: '#ffffff',
            backgroundImage: 'none',
            backdropFilter: 'none',
            WebkitBackdropFilter: 'none',
            display: 'flex',
            flexDirection: 'column',
          },
        }}
      >
        {/* close (X) + action icons + logout — sticky header, never scrolls */}
        <Box
          sx={{
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            px: 1.5,
            py: 1.5,
          }}
        >
          <Tooltip title="Close">
            <IconButton onClick={onClose} data-testid="close-drawer-button">
              <Iconify icon="mingcute:close-line" />
            </IconButton>
          </Tooltip>

          {session && (
            <Stack direction="row" alignItems="center" spacing={0.5} sx={{ ml: 'auto', mr: 1 }}>
              <Tooltip title={isNavigatingToSettings ? t('Loading...') : t('Settings')}>
                <span>
                  <IconButton
                    size="small"
                    disabled={isNavigatingToSettings}
                    onClick={() => {
                      startNavigatingToSettings();
                      router.push(paths.settings);
                      stopNavigatingToSettings();
                      onClose();
                    }}
                  >
                    {isNavigatingToSettings
                      ? <CircularProgress size={18} color="inherit" />
                      : <Iconify icon="solar:settings-bold" />}
                  </IconButton>
                </span>
              </Tooltip>

              <Tooltip title={t('Create New Account')}>
                <IconButton
                  size="small"
                  onClick={() => {
                    setWizardInitialStep('choose-wallet');
                    setShowLoginModal(true);
                    onClose();
                  }}
                >
                  <Iconify icon="mingcute:add-line" />
                </IconButton>
              </Tooltip>

              <Tooltip title={t('Switch Wallets')}>
                <IconButton
                  size="small"
                  onClick={() => {
                    setWizardInitialStep('linked-accounts');
                    setShowLoginModal(true);
                    onClose();
                  }}
                >
                  <Iconify icon="solar:refresh-bold" />
                </IconButton>
              </Tooltip>
            </Stack>
          )}

          {session && (
            <Tooltip title={isDisconnecting ? 'Logging out...' : 'Logout'}>
              <Button
                variant="soft"
                color="error"
                size="small"
                onClick={handleDisconnect}
                disabled={isDisconnecting}
                data-testid="logout-button"
                startIcon={<Iconify icon="solar:logout-2-bold" />}
              >
                {t('Logout')}
              </Button>
            </Tooltip>
          )}
        </Box>
        {session && (
          <Scrollbar sx={{ flexGrow: 1 }}>
            <Stack spacing={2} sx={{ px: 2, pt: 2 }}>
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
                  {isSetupIncomplete && (
                    <Box
                      sx={{
                        mx: 1,
                        mb: 0.5,
                        p: 2,
                        borderRadius: 2,
                        bgcolor: alpha(theme.palette.warning.main, 0.08),
                        border: `1px solid ${alpha(theme.palette.warning.main, 0.25)}`,
                      }}
                    >
                      <Stack spacing={1.5}>
                        <Stack direction="row" spacing={1.5} alignItems="flex-start">
                          <Iconify
                            icon="solar:info-circle-bold"
                            width={18}
                            sx={{ color: 'warning.main', flexShrink: 0, mt: 0.15 }}
                          />
                          <Box>
                            <Typography variant="subtitle2" sx={{ mb: 0.25 }}>
                              {!accountExists ? t('Activate your wallet') : t('Add USDC trustline')}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {!accountExists
                                ? t('Send 1+ XLM to activate your wallet on Stellar.')
                                : t('One quick step to hold and earn USDC.')}
                            </Typography>
                          </Box>
                        </Stack>
                        <Button
                          variant="contained"
                          size="small"
                          onClick={() => { setShowLoginModal(true); onClose(); }}
                          sx={{
                            borderRadius: 1.5,
                            bgcolor: 'warning.main',
                            color: 'warning.contrastText',
                            '&:hover': { bgcolor: 'warning.dark' },
                            alignSelf: 'flex-start',
                            fontSize: '0.8rem',
                            px: 1.75,
                          }}
                        >
                          {t('Continue setup')}
                        </Button>
                      </Stack>
                    </Box>
                  )}
                  <WalletConnected address={connectedAddress} drawerOpen={open} />
                </>
              ) : (
                <Box sx={{ px: 1, py: 3 }}>
                  <Box
                    sx={{
                      border: 1,
                      borderColor: 'warning.light',
                      borderRadius: 2,
                      p: 2.5,
                      bgcolor: alpha(theme.palette.warning.main, 0.04),
                    }}
                  >
                    <Stack spacing={2}>
                      <Stack direction="row" spacing={1.5} alignItems="center">
                        <Box
                          sx={{
                            width: 40,
                            height: 40,
                            borderRadius: 1.5,
                            bgcolor: alpha(theme.palette.warning.main, 0.12),
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                          }}
                        >
                          <Iconify
                            icon="solar:rocket-bold"
                            width={22}
                            sx={{ color: 'warning.dark' }}
                          />
                        </Box>
                        <Box>
                          <Typography variant="subtitle1" fontWeight={600}>
                            {t('Account Setup')}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {t('Complete your setup to start investing')}
                          </Typography>
                        </Box>
                      </Stack>
                      <Button
                        variant="contained"
                        fullWidth
                        onClick={() => {
                          if (session) {
                            setShowLoginModal(true);
                          } else {
                            handleConnectClick();
                          }
                        }}
                        sx={{
                          bgcolor: 'warning.main',
                          color: 'warning.contrastText',
                          '&:hover': { bgcolor: 'warning.dark' },
                          borderRadius: 1.5,
                        }}
                      >
                        {t('Continue setup')}
                      </Button>
                    </Stack>
                  </Box>
                </Box>
              )}
            </Stack>
          </Scrollbar>
        )}
      </Drawer>
      <OnboardingWizard
        open={showLoginModal}
        initialStep={wizardInitialStep}
        onClose={() => {
          setShowLoginModal(false);
          setWizardInitialStep(undefined);
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
