'use client';

import type { ChainAddresses } from '@/lib/chains/registry';
import type { IconButtonProps } from '@mui/material/IconButton';

import { paths } from '@/routes/paths';
import { useSnackbar } from 'notistack';
import { BigNumber } from 'bignumber.js';
import { useTranslate } from '@/locales';
import { useUserActivity } from '@/hooks';
import { useBoolean } from 'minimal-shared/hooks';
import { cdn, logger } from '@normalfinance/utils';
import { usePortfolio } from '@/hooks/use-portfolio';
import { useRouter, useSearchParams } from 'next/navigation';
import { getLinkedWallets } from '@/services/linked-wallets';
import { useTurnkeyWallet } from '@/hooks/use-turnkey-wallet';
import { useSupabaseAuth } from '@/providers/SupabaseAuthProvider';
import { useNormalWallet } from '@/hooks/stellar/use-normal-wallet';
import { useRef, useMemo, useState, useEffect, useCallback } from 'react';
import { useStellarWalletsKit } from '@/hooks/stellar/use-stellar-wallets-kit';
import { useAppStore, usePersistStore, useNetworkStore } from '@normalfinance/state';
import { connectedWalletLabel, portfolioAssetToToken } from '@/lib/portfolio/display';
import { CHAINS, CHAIN_IDS, getChainAddress, availableChains } from '@/lib/chains/registry';
import { clearLoginIntent, consumeLoginIntent, rememberLoginIntent } from '@/lib/loginIntent';

import AddOutlined from '@mui/icons-material/AddOutlined';
import SyncOutlined from '@mui/icons-material/SyncOutlined';
import CloseOutlined from '@mui/icons-material/CloseOutlined';
import SettingsOutlined from '@mui/icons-material/SettingsOutlined';
import {
  Box,
  Stack,
  Avatar,
  Button,
  Dialog,
  Drawer,
  Tooltip,
  IconButton,
  Typography,
  DialogTitle,
  DialogActions,
  DialogContent,
  CircularProgress,
} from '@mui/material';

import CopyIconButton from '@/components/copy-icon-button';
import { Scrollbar } from '@/components/template/scrollbar';
import NormalWalletCreate from '@/components/_common/normal-wallet-create';
import NormalWalletImport from '@/components/_common/normal-wallet-import';
import WalletSelectionModal from '@/components/_common/wallet-selection-modal';
import ConnectedWallet from '@/components/_common/drawer-components/connected-wallet';
import OnboardingWizard, { type WizardStep } from '@/components/_common/onboarding-wizard';

import { AccountButton } from './account-button';

function WalletConnected({
  address,
  drawerOpen,
  addresses,
}: {
  address: string;
  drawerOpen: boolean;
  addresses: ChainAddresses | null | undefined;
}) {
  const { setGlobalIsLoading } = useAppStore();

  const {
    tokenState: { tokens },
    wallet: persistWallet,
    getAllTokens,
  } = usePersistStore();
  const network = useNetworkStore((s) => s.network);
  const [tokensFetching, setTokensFetching] = useState(true);

  const { recentActivity } = useUserActivity(address, addresses);
  const bitcoinAddress = getChainAddress(addresses, 'bitcoin');

  // Unified, deduped source: native balances + savings from one place.
  const { getAsset, savings, wallet: walletBalances } = usePortfolio(true);
  const userPosition = savings.position;
  const savingsFetching = savings.positionLoading;
  const savingsRef = useRef(savings);
  useEffect(() => {
    savingsRef.current = savings;
  });

  // Effect hook to fetch all tokens when the component mounts, address changes, or network toggles
  useEffect(() => {
    const refreshTokens = async (): Promise<void> => {
      if (!address) return;

      setTokensFetching(true);
      setGlobalIsLoading(true);
      try {
        await getAllTokens(true);
      } catch (e) {
        logger.error(e);
      } finally {
        setGlobalIsLoading(false);
        setTokensFetching(false);
      }
    };

    const timer = setTimeout(() => {
      refreshTokens();
    }, 100);

    return () => clearTimeout(timer);
  }, [address, getAllTokens, network, setGlobalIsLoading]);

  // Refresh savings when the drawer opens.
  useEffect(() => {
    if (drawerOpen && address) savingsRef.current.refresh();
  }, [drawerOpen, address]);

  const btcToken = useMemo(() => {
    const a = getAsset('BTC');
    return a ? portfolioAssetToToken(a) : null;
  }, [getAsset]);
  const ethToken = useMemo(() => {
    const a = getAsset('ETH');
    return a ? portfolioAssetToToken(a) : null;
  }, [getAsset]);
  const solToken = useMemo(() => {
    const a = getAsset('SOL');
    return a ? portfolioAssetToToken(a) : null;
  }, [getAsset]);

  const allTokens = useMemo(
    () =>
      [...tokens, btcToken, ethToken, solToken]
        .filter((tkn): tkn is NonNullable<typeof tkn> => !!tkn)
        // Only assets the user actually holds. The portfolio aggregator always
        // emits a BTC/ETH/SOL/XLM/USDC entry (0 when there's no address/balance),
        // so without this a Stellar-only user sees a phantom "BTC $0". Mirrors the
        // balance>0 filtering the holdings/hero views already use.
        .filter((tkn) => BigNumber(tkn.balance).gt(0)),
    [tokens, btcToken, ethToken, solToken]
  );

  // #32 chunk 2 — dual-wallet display. When the CONNECTED wallet is external
  // and the account also owns a Turnkey (Normal) wallet with a funded Stellar
  // address, the drawer shows two SPLIT sections (doc 72 §4f): every number
  // stays spendable by exactly one wallet — never a combined sum no action
  // could spend. Companion with zero balances is NOT shown (an unactivated
  // creation would only confuse; the guided flow introduces it properly).
  const isExternalConnected =
    persistWallet.walletType != null && persistWallet.walletType !== 'normal-wallet';
  const companion = walletBalances.companionStellar;
  const companionTokens = useMemo(
    () =>
      (companion?.assets ?? [])
        .map(portfolioAssetToToken)
        .filter((tkn) => BigNumber(tkn.balance).gt(0)),
    [companion]
  );
  const walletSections = useMemo(() => {
    if (!isExternalConnected || !companion) return null;
    const chainTokens = [btcToken, ethToken, solToken].filter(
      (tkn): tkn is NonNullable<typeof tkn> => !!tkn && BigNumber(tkn.balance).gt(0)
    );
    const normalTokens = [...companionTokens, ...chainTokens];
    if (normalTokens.length === 0) return null; // nothing to show for the companion yet
    const externalTokens = tokens.filter((tkn) => BigNumber(tkn.balance).gt(0));
    return [
      { label: 'Normal wallet', address: companion.address, tokens: normalTokens },
      {
        label: connectedWalletLabel(persistWallet.walletType),
        address,
        tokens: externalTokens,
      },
    ];
  }, [
    isExternalConnected,
    companion,
    companionTokens,
    btcToken,
    ethToken,
    solToken,
    tokens,
    address,
    persistWallet.walletType,
  ]);

  const assetsBalance = useMemo(() => {
    const base = allTokens.reduce(
      (acc, tkn) => acc.plus(BigNumber(tkn.balance).multipliedBy(tkn.price)),
      BigNumber(0)
    );
    // Total balance = everything the ACCOUNT owns; in dual-wallet mode the
    // companion's funds are part of it (the per-wallet split lives in the
    // sections below, where numbers must map to actions).
    return walletSections
      ? companionTokens.reduce(
          (acc, tkn) => acc.plus(BigNumber(tkn.balance).multipliedBy(tkn.price)),
          base
        )
      : base;
  }, [allTokens, walletSections, companionTokens]);

  // #32: account-wide savings display — slot wallet's position + the
  // companion Normal wallet's (one product; actions stay per-wallet).
  const savingsValue =
    Math.max(parseFloat(userPosition?.currentValue || '0'), 0) + savings.companionValue;
  const savingsLoaded = userPosition !== null || savings.companionValue > 0;

  // Render whenever the user has ANY wallet — a Turnkey-only (e.g. BTC-first)
  // user has no Stellar `address` but should still see their real drawer.
  // ConnectedWallet ignores `address`; balances come from the portfolio.
  const hasWallet = !!address || availableChains(addresses).length > 0;
  if (!hasWallet) {
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
        tokensFetching={tokensFetching}
        percentageChange={0}
        tokens={allTokens}
        sections={walletSections ?? undefined}
        activity={recentActivity}
        bitcoinAddress={bitcoinAddress}
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

  const {
    addresses: turnkeyAddresses,
    hasWallet: turnkeyHasWallet,
    authFailed: turnkeyAuthFailed,
  } = useTurnkeyWallet(open && !!session);
  // Has ANY wallet — a Stellar wallet OR a Turnkey chain wallet (BTC/ETH/SOL).
  // Asset-first users may have e.g. only BTC and no Stellar address yet.
  const hasAnyWallet = isWalletConnected || availableChains(turnkeyAddresses).length > 0;

  // The address list rendered further down: one row per chain that has an
  // address, built from the registry instead of four hand-written blocks.
  const chainRows = CHAIN_IDS.flatMap((id) => {
    const chain = CHAINS[id];
    // Stellar shows the *connected* wallet, which may be an imported one
    // rather than the Turnkey address (see finding #40).
    const addr = id === 'stellar' ? connectedAddress : getChainAddress(turnkeyAddresses, id);
    if (!addr) return [];
    return [
      { id: id as string, name: chain.name as string, color: chain.brandColor as string, addr },
    ];
  });
  // #32 chunk 2: with an external wallet connected, the companion Normal
  // wallet's Stellar address gets its own labeled row — previously invisible
  // (the Stellar row only ever showed the slot; finding #40).
  const companionStellarAddr = getChainAddress(turnkeyAddresses, 'stellar');
  if (companionStellarAddr && connectedAddress && companionStellarAddr !== connectedAddress) {
    chainRows.push({
      id: 'stellar-normal',
      name: 'Normal',
      color: CHAINS.stellar.brandColor as string,
      addr: companionStellarAddr,
    });
  }

  // Turnkey lookup not resolved yet (still loading, or the API errored — e.g.
  // a revoked session returning 401). While unresolved we must NOT claim the
  // user has no wallets: that renders a false "$0 — pick an asset" account.
  const turnkeyUnknown = !!session && turnkeyHasWallet === null;

  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
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

  const handlePostAuthFlow = useCallback(async () => {
    if (!session) {
      return;
    }

    // Clear any stale local wallet state if the DB record was removed
    if (normalPublicKey && isNormalConnected) {
      const linkedWallets = await getLinkedWallets();
      const isStillLinked = linkedWallets.some((w) => w.walletAddress === normalPublicKey);
      if (!isStillLinked) {
        await disconnectNormalWallet();
        persist.disconnectWallet();
      }
    }

    // Open the wizard so the user can pick their wallet
    setWizardInitialStep('linked-accounts');
    setShowLoginModal(true);
  }, [session, normalPublicKey, isNormalConnected, disconnectNormalWallet, persist]);

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
  useEffect(() => {
    showLoginModalRef.current = showLoginModal;
  }, [showLoginModal]);

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
    if (searchParams.get('setup') !== 'continue') return;
    // Legacy onramp return: savings setup (activation + trustline) now completes
    // on /savings itself, so just land the user there — the savings card guides
    // the next step based on real account state.
    router.replace(paths.savings, { scroll: false });
  }, [searchParams, router]);

  useEffect(() => {
    const handler = () => {
      if (!session) {
        rememberLoginIntent();
        setShowLoginModal(true);
      }
    };
    window.addEventListener('nf:open-login', handler);
    return () => window.removeEventListener('nf:open-login', handler);
  }, [session]);

  // Opens the wizard regardless of session — used when a logged-in user
  // starts an action that needs a wallet they don't have yet (lazy setup).
  useEffect(() => {
    const handler = () => setShowLoginModal(true);
    window.addEventListener('nf:open-wallet-setup', handler);
    return () => window.removeEventListener('nf:open-wallet-setup', handler);
  }, []);

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

    // Check loginIntent BEFORE the isWalletConnected guard.
    // If the user explicitly clicked Login, always open the wizard so they
    // can pick a wallet — even if the old wallet was auto-restored from
    // localStorage after an expired session.
    const hadIntent = consumeLoginIntent();
    if (hadIntent && !hasHandledAuthRef.current) {
      hasHandledAuthRef.current = true;
      if (!showLoginModalRef.current) {
        setShowLoginModal(true);
      }
      return;
    }

    if (isWalletConnected) {
      setIsAutoConnecting(false);
      return;
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
          onClick={handleMainButtonClick}
          data-testid="connect-wallet-button"
          sx={{
            bgcolor: '#0A0A0F',
            color: '#fff',
            borderRadius: '999px',
            textTransform: 'none',
            fontWeight: 500,
            px: '12px',
            py: '6px',
            fontSize: '14px',
            minWidth: 'unset',
            boxShadow: 'none',
            '&:hover': { bgcolor: '#1a1a2e', boxShadow: 'none' },
          }}
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
            <IconButton
              onClick={onClose}
              data-testid="close-drawer-button"
              sx={{
                color: '#6B6B76',
                borderRadius: '8px',
                '&:hover': { bgcolor: 'rgba(10,10,15,0.04)', color: '#0A0A0F' },
              }}
            >
              <CloseOutlined sx={{ fontSize: 20 }} />
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
                    sx={{
                      color: '#6B6B76',
                      borderRadius: '8px',
                      '&:hover': { bgcolor: 'rgba(10,10,15,0.04)', color: '#0A0A0F' },
                    }}
                  >
                    {isNavigatingToSettings ? (
                      <CircularProgress size={18} color="inherit" />
                    ) : (
                      <SettingsOutlined sx={{ fontSize: 20 }} />
                    )}
                  </IconButton>
                </span>
              </Tooltip>

              <Tooltip
                title={
                  turnkeyHasWallet === true ? t('Connect external wallet') : t('Create New Account')
                }
              >
                <IconButton
                  size="small"
                  onClick={() => {
                    // #32 chunk 3: a user who already HAS a Normal wallet adds
                    // an EXTERNAL wallet here (kit picker, links + connects —
                    // doc 72 §4d/§4f); only wallet-less users get the wizard.
                    if (turnkeyHasWallet === true) {
                      connectWallet();
                      onClose();
                      return;
                    }
                    setWizardInitialStep('choose-wallet');
                    setShowLoginModal(true);
                    onClose();
                  }}
                  sx={{
                    color: '#6B6B76',
                    borderRadius: '8px',
                    '&:hover': { bgcolor: 'rgba(10,10,15,0.04)', color: '#0A0A0F' },
                  }}
                >
                  <AddOutlined sx={{ fontSize: 20 }} />
                </IconButton>
              </Tooltip>

              <Tooltip title={t('All wallets')}>
                <IconButton
                  size="small"
                  onClick={() => {
                    setWizardInitialStep('linked-accounts');
                    setShowLoginModal(true);
                    onClose();
                  }}
                  sx={{
                    color: '#6B6B76',
                    borderRadius: '8px',
                    '&:hover': { bgcolor: 'rgba(10,10,15,0.04)', color: '#0A0A0F' },
                  }}
                >
                  <SyncOutlined sx={{ fontSize: 20 }} />
                </IconButton>
              </Tooltip>
            </Stack>
          )}

          {session && (
            <Tooltip title={isDisconnecting ? 'Logging out...' : 'Logout'}>
              <Button
                size="small"
                onClick={() => setShowLogoutConfirm(true)}
                disabled={isDisconnecting}
                data-testid="logout-button"
                sx={{
                  bgcolor: '#0A0A0F',
                  color: '#fff',
                  borderRadius: '999px',
                  textTransform: 'none',
                  fontWeight: 500,
                  fontSize: '13px',
                  px: '12px',
                  py: '7px',
                  minWidth: 'unset',
                  boxShadow: 'none',
                  '&:hover': { bgcolor: '#1a1a22', boxShadow: 'none' },
                  '&.Mui-disabled': {
                    bgcolor: 'rgba(10,10,15,0.4)',
                    color: 'rgba(255,255,255,0.6)',
                  },
                }}
              >
                {t('Logout')}
              </Button>
            </Tooltip>
          )}
        </Box>
        {session && (
          <Scrollbar sx={{ flexGrow: 1 }}>
            <Stack spacing={2} sx={{ px: 2, pt: 2 }}>
              <Box sx={{ pb: '2px' }}>
                <Stack direction="row" alignItems="center" spacing={2}>
                  <Avatar
                    src={userAvatar}
                    alt={displayName}
                    sx={{ width: 44, height: 44, flexShrink: 0 }}
                  />
                  <Box sx={{ minWidth: 0, flex: 1 }}>
                    <Typography
                      sx={{
                        fontSize: '15px',
                        fontWeight: 600,
                        letterSpacing: '-0.01em',
                        color: '#0A0A0F',
                      }}
                    >
                      {displayName}
                    </Typography>
                    <Typography sx={{ fontSize: '13px', color: '#6B6B76', mt: '1px' }}>
                      {userEmail}
                    </Typography>
                  </Box>
                </Stack>
                {/* One row per chain the user has an address for. Driven by the
                    registry, so a new chain appears here without another copy
                    of this block — these were four near-identical stanzas.
                    Note the Stellar row prefers the *connected* address, which
                    is why an imported wallet currently hides the Turnkey one
                    (finding #40 — the list should eventually show both). */}
                {chainRows.length > 0 && (
                  <Box sx={{ mt: '10px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    {chainRows.map(({ id, name, color, addr }) => (
                      <Stack key={id} direction="row" alignItems="center" gap="8px">
                        <Box
                          sx={{
                            width: 6,
                            height: 6,
                            borderRadius: '50%',
                            bgcolor: color,
                            flexShrink: 0,
                          }}
                        />
                        <Box sx={{ fontSize: '11px', color: '#6B6B76', width: 40, flexShrink: 0 }}>
                          {name}
                        </Box>
                        <Box
                          sx={{
                            fontFamily: '"Geist Mono", ui-monospace, monospace',
                            fontSize: '11.5px',
                            color: '#2A2A33',
                            letterSpacing: '-0.01em',
                            flex: 1,
                            minWidth: 0,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {`${addr.slice(0, 8)}...${addr.slice(-6)}`}
                        </Box>
                        <CopyIconButton value={addr} alert={`${name} address copied`} />
                      </Stack>
                    ))}
                  </Box>
                )}
              </Box>
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
              ) : hasAnyWallet ? (
                // Any wallet (incl. a Turnkey-only BTC/ETH/SOL user with no
                // Stellar address yet) → the real drawer. Savings-specific setup
                // is no longer nagged here; it lives on /savings, on demand.
                <WalletConnected
                  address={connectedAddress ?? ''}
                  drawerOpen={open}
                  addresses={turnkeyAddresses}
                />
              ) : turnkeyAuthFailed ? (
                // The server rejected our session token (revoked elsewhere, or
                // expired) — the wallets are NOT gone, so never show the $0
                // empty state here. Prompt a clean re-auth instead.
                <Box sx={{ px: 2, py: 5 }}>
                  <Stack spacing={2.5} alignItems="center" textAlign="center">
                    <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 260 }}>
                      {t('Your session has expired. Sign in again to see your wallets.')}
                    </Typography>
                    <Button
                      variant="contained"
                      onClick={async () => {
                        try {
                          await signOut();
                        } catch {
                          /* stale session — nothing to clear */
                        }
                        setWizardInitialStep(undefined);
                        setShowLoginModal(true);
                      }}
                      sx={{ borderRadius: 1.5, px: 3 }}
                    >
                      {t('Sign in again')}
                    </Button>
                  </Stack>
                </Box>
              ) : turnkeyUnknown ? (
                // Wallet lookup still in flight (or transiently failing) —
                // show progress, not a false "$0" account.
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
                </Box>
              ) : (
                // No wallet yet — a calm $0 empty state. The pick-an-asset prompt
                // only shows here (never once the user has created any wallet).
                <Box sx={{ px: 2, py: 5 }}>
                  <Stack spacing={2.5} alignItems="center" textAlign="center">
                    <Typography
                      sx={{
                        fontFamily: '"Geist Mono", ui-monospace, monospace',
                        fontFeatureSettings: '"ss01","ss02","zero"',
                        fontSize: '30px',
                        fontWeight: 500,
                        color: 'text.primary',
                        letterSpacing: '-0.02em',
                      }}
                    >
                      $0.00
                    </Typography>
                    {session ? (
                      <>
                        <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 260 }}>
                          {t(
                            'Pick an asset to get started — we’ll set up your wallet for it in one tap.'
                          )}
                        </Typography>
                        <Button
                          variant="contained"
                          onClick={() => {
                            setWizardInitialStep(undefined);
                            setShowLoginModal(true);
                          }}
                          sx={{
                            bgcolor: '#0A0A0F',
                            color: '#fff',
                            borderRadius: 1.5,
                            px: 3,
                            '&:hover': { bgcolor: '#1a1a25' },
                          }}
                        >
                          {t('Pick an asset')}
                        </Button>
                      </>
                    ) : (
                      <>
                        <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 260 }}>
                          {t('Sign in to start buying, earning, and holding crypto.')}
                        </Typography>
                        <Button
                          variant="contained"
                          onClick={handleConnectClick}
                          sx={{ borderRadius: 1.5, px: 3 }}
                        >
                          {t('Sign in')}
                        </Button>
                      </>
                    )}
                  </Stack>
                </Box>
              )}
            </Stack>
          </Scrollbar>
        )}
      </Drawer>

      {/* Logout confirmation — an extra, deliberate step so a wallet can't be
          disconnected (and an unbacked-up wallet effectively lost) in one tap. */}
      <Dialog
        open={showLogoutConfirm}
        onClose={() => !isDisconnecting && setShowLogoutConfirm(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>{t('Log out of this device?')}</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary">
            {t(
              "You'll be signed out and your wallet disconnected from this device. Make sure you've backed up your recovery phrase — without it, an imported wallet can't be restored."
            )}
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button
            onClick={() => setShowLogoutConfirm(false)}
            disabled={isDisconnecting}
            sx={{ textTransform: 'none', color: 'text.secondary' }}
          >
            {t('Cancel')}
          </Button>
          <Button
            variant="contained"
            color="error"
            disabled={isDisconnecting}
            startIcon={isDisconnecting ? <CircularProgress size={16} color="inherit" /> : undefined}
            onClick={async () => {
              await handleDisconnect();
              setShowLogoutConfirm(false);
            }}
            sx={{ textTransform: 'none', borderRadius: '999px' }}
          >
            {isDisconnecting ? t('Logging out…') : t('Log out')}
          </Button>
        </DialogActions>
      </Dialog>

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
