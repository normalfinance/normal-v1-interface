'use client';

import type { Connector } from '@normalfinance/types';
import type { IconButtonProps } from '@mui/material/IconButton';

import axios from 'axios';
import posthog from 'posthog-js';
import { paths } from '@/routes/paths';
import { useSnackbar } from 'notistack';
import { useTranslate } from '@/locales';
import * as Sentry from '@sentry/nextjs';
import { useBoolean } from 'minimal-shared/hooks';
import { ZEALY_QUEST_IDS } from '@/global-config';
import { useState, useEffect, useCallback } from 'react';
import { format, trackEvent } from '@normalfinance/utils';
import { CURRENT_TOS_VERSION } from '@normalfinance/types';
import { useUserActivity, useLiquidityPositions } from '@/hooks';
import {
  hana,
  xbull,
  lobstr,
  freighter,
  useAppStore,
  WalletConnect,
  usePersistStore,
} from '@normalfinance/state';

import { useTheme } from '@mui/material/styles';
import {
  Box,
  Paper,
  Stack,
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
import ZealyHighlight from '@/components/_common/zealy/zealy-highlight';
import ConnectedWallet from '@/components/_common/drawer-components/connected-wallet';
import TermsOfServiceDialog from '@/components/_common/drawer-components/terms-of-service-dialog';

import { AccountButton } from './account-button';

/* ------------------------------------------------------------------ */
/* tiny wallet tile (re-used in the grid)                              */
/* ------------------------------------------------------------------ */
function WalletOption({
  connector,
  allowed,
  onClick,
}: {
  connector: Connector;
  allowed: boolean;
  onClick: () => void;
}) {
  const theme = useTheme();
  const { t } = useTranslate();

  return (
    <Paper
      variant="outlined"
      onClick={onClick}
      sx={{
        display: 'flex',
        p: '10px',
        my: '4px',
        textAlign: 'center',
        cursor: allowed ? 'pointer' : 'default',
        opacity: allowed ? 1 : 0.4,
        borderRadius: '8px',
        border: `1px solid ${theme.palette.divider}`,
        ...(allowed && {
          '&:hover': { boxShadow: 4 },
        }),
        gap: 2,
        alignItems: 'center',
      }}
    >
      <img src={connector.iconUrl} width={48} height={48} alt={connector.name} />
      <Typography variant="h6" sx={{ mt: 0.5 }}>
        {connector.name}
      </Typography>
      {!allowed && (
        <Typography variant="body2" color="text.secondary">
          {t('Not installed')}
        </Typography>
      )}
    </Paper>
  );
}

/* ------------------------------------------------------------------ */
/* ① Disconnected: list the wallets                                   */
/* ------------------------------------------------------------------ */
function WalletDisconnected({
  connectors,
  onSelect,
}: {
  connectors: Connector[];
  onSelect: (c: Connector) => void;
}) {
  const theme = useTheme();

  const [allowed, setAllowed] = useState<Connector[]>([]);
  const [disallowed, setDisallowed] = useState<Connector[]>([]);
  const [loading, setLoading] = useState(true);
  const { t } = useTranslate();

  const handleWalletHelp = () => {
    trackEvent('button_clicked', {
      label: 'Manage Stake',
      location: 'Insurance',
    });
    window.open(`${paths.docs}/getting-started/guides`, '_blank', 'noopener');
  };

  useEffect(() => {
    (async () => {
      const ok: Connector[] = [];
      const no: Connector[] = [];

      for (const c of connectors) {
        if (await c.isConnected()) {
          ok.push(c);
        } else {
          no.push(c);
        }
      }
      setAllowed(ok);
      setDisallowed(no);
      setLoading(false);
    })();
  }, [connectors]);

  return (
    <Box
      sx={{
        p: 2,
        pt: 10,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'start',
      }}
    >
      <Box sx={{ position: 'relative' }}>
        <Typography
          variant="subtitle1"
          sx={{ mb: 3 }}
          textAlign="left"
          data-testid="connect-wallet-title"
        >
          {t('Connect your wallet')}
        </Typography>
        <ZealyHighlight
          questId={ZEALY_QUEST_IDS.connectWallet}
          position={{ top: -22, right: -32 }}
        />
      </Box>
      {loading ? (
        <CircularProgress />
      ) : (
        <>
          {/* How to create a wallet? */}
          <Button
            fullWidth
            variant="soft"
            color="secondary"
            size="large"
            startIcon={<Iconify icon="eva:question-mark-circle-outline" />}
            onClick={handleWalletHelp}
            sx={{ mb: 2 }}
          >
            {t('Need help creating a wallet?')}
            <ZealyHighlight questId={ZEALY_QUEST_IDS.createWallet} position={{ right: 10 }} />
          </Button>
          <Box
            gap={2}
            width="100%"
            sx={{ backgroundColor: theme.palette.grey[200], p: 1, borderRadius: 1.5 }}
          >
            {/* Wallet options */}
            {[...allowed, ...disallowed].map((c) => (
              <WalletOption
                key={c.id}
                connector={c}
                allowed={allowed.includes(c)}
                onClick={() => allowed.includes(c) && onSelect(c)}
              />
            ))}
          </Box>
        </>
      )}
    </Box>
  );
}

/* ------------------------------------------------------------------ */
/* ② Connected: simple summary / logout                               */
/* ------------------------------------------------------------------ */
function WalletConnected({ address }: { address: string }) {
  const { t } = useTranslate();
  const { enqueueSnackbar } = useSnackbar();

  const { tokens, getAllTokens, setGlobalIsLoading } = useAppStore();

  const { positions } = useLiquidityPositions();

  const { loading, error, recentActivity } = useUserActivity();

  // Faucet
  const [faucetLoading, setFaucetLoading] = useState(false);
  const [faucetOff, setFaucetOff] = useState(false);

  const handleFaucetRequest = useCallback(async () => {
    try {
      setFaucetLoading(true);
      const { data } = await axios.get(`https://friendbot.stellar.org?addr=${address}`);

      if (data) {
        enqueueSnackbar(t('Account funded!'), { variant: 'success' });
      }
    } catch (e) {
      if (axios.isAxiosError(e)) {
        if (e?.response?.data.detail === 'account already funded to starting balance') {
          setFaucetOff(true);
          enqueueSnackbar(t('Account already funded'), { variant: 'warning' });
        }
      }
    } finally {
      setFaucetLoading(false);
    }
  }, [address, enqueueSnackbar, t]);

  // Effect hook to fetch all tokens once the component mounts
  useEffect(() => {
    const refreshTokens = async (): Promise<void> => {
      setGlobalIsLoading(true);
      try {
        await getAllTokens();
        setGlobalIsLoading(false);
      } catch (e) {
        Sentry.captureException(e);
        console.error(e);
      } finally {
        setGlobalIsLoading(false);
      }
    };
    refreshTokens();
  }, []);

  // Total balance
  const totalBalance = tokens.reduce((acc, tkn) => {
    const holdings = tkn.balance * tkn.usdValue;
    return acc + holdings;
  }, 0);

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
      <Button
        fullWidth
        variant="soft"
        color="info"
        size="large"
        startIcon={<Iconify icon="eva:droplet-fill" />}
        onClick={handleFaucetRequest}
        sx={{ my: 1 }}
        loading={faucetLoading}
        disabled={faucetOff}
      >
        {t('Get testnet XLM')}
        <ZealyHighlight questId={ZEALY_QUEST_IDS.receiveFaucet} position={{ right: 20 }} />
      </Button>
      <ConnectedWallet
        balance={totalBalance}
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
  /* ↓ stores ------------------------------------------------------ */
  const persist = usePersistStore();

  const { t } = useTranslate();

  /* ↓ connectors -------------------------------------------------- */
  const connectors: Connector[] = [freighter(), xbull(), lobstr(), hana(), new WalletConnect(true)];

  const connect = (c: Connector) => persist.connectWallet(c.id);
  const disconnect = () => persist.disconnectWallet();

  /* ↓ drawer UI toggle ------------------------------------------- */
  const { value: open, onTrue: onOpen, onFalse: onClose } = useBoolean();

  /* ↓ main button uses dummy avatar ------------------------------ */
  const avatarURL = '/assets/icons/navbar/logo.webp';

  /* ↓ derived state ---------------------------------------------- */
  const connectedAddress = persist.wallet.address;

  const isConnected = !!connectedAddress;

  useEffect(() => {
    if (connectedAddress) {
      Sentry.setUser({ id: connectedAddress });
      posthog.identify(
        connectedAddress,
        { last_login: new Date() }, // updates every time
        { signup_date: new Date() } // sets only once
      );
    } else {
      Sentry.setUser(null);
    }
  }, [connectedAddress]);

  const disclaimerVersion = usePersistStore((s: any) => s.disclaimer.version);
  const [showTos, setShowTos] = useState(false);

  /** Open drawer OR show ToS dialog, depending on acceptance */
  const handleMainButtonClick = () => {
    // trackEvent('button_clicked', {
    //   label: 'Manage Stake',
    //   location: 'Insurance',
    // });
    if (disclaimerVersion < CURRENT_TOS_VERSION) {
      setShowTos(true);
    } else {
      onOpen();
    }
  };

  /** Called whenever the ToS modal closes (Accept or Decline).
   *  If they accepted, open the wallet drawer right away. */
  const handleTosClose = () => {
    // trackEvent('button_clicked', {
    //   label: 'Manage Stake',
    //   location: 'Insurance',
    // });

    setShowTos(false);

    // read the latest store value directly (no hooks inside a callback)
    const latestVersion = usePersistStore.getState().disclaimer.version;
    if (latestVersion >= CURRENT_TOS_VERSION) {
      onOpen(); // open the drawer immediately
    }
  };

  return (
    <>
      {isConnected ? (
        <AccountButton
          data-testid="account-button"
          onClick={handleMainButtonClick}
          photoURL={avatarURL}
          displayName=" "
          {...props}
        />
      ) : (
        <Button
          variant="contained"
          color="info"
          onClick={handleMainButtonClick}
          data-testid="connect-wallet-button"
        >
          {t('Connect Wallet')}
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

          {isConnected && (
            <Tooltip title="Disconnect">
              <IconButton
                onClick={() => {
                  // trackEvent('button_clicked', {
                  //   label: 'Manage Stake',
                  //   location: 'Insurance',
                  // });
                  disconnect();
                  onClose();
                }}
                sx={{ ml: 'auto' }}
                data-testid="disconnect-wallet-button"
              >
                <Iconify icon="solar:power-bold" />
              </IconButton>
            </Tooltip>
          )}
        </Box>
        <Scrollbar>
          {isConnected && connectedAddress ? (
            <WalletConnected address={connectedAddress} />
          ) : (
            <WalletDisconnected
              connectors={connectors}
              onSelect={async (c) => {
                // trackEvent('button_clicked', {
                //   label: 'Manage Stake',
                //   location: 'Insurance',
                // });
                await connect(c);
                onClose();
              }}
            />
          )}
        </Scrollbar>
      </Drawer>
      <TermsOfServiceDialog open={showTos} onClose={handleTosClose} />
    </>
  );
}
