'use client';

import type { Connector } from '@normalfinance/types';
import type { IconButtonProps } from '@mui/material/IconButton';

import { useSnackbar } from 'notistack';
import * as Sentry from '@sentry/nextjs';
import { useTranslate } from '@/locales';
import { format } from '@normalfinance/utils';
import { useBoolean } from 'minimal-shared/hooks';
import { rateLimiter } from '@/server/rateLimiter';
import { useState, useEffect, useCallback } from 'react';
import { CURRENT_TOS_VERSION } from '@normalfinance/types';
import { hana, xbull, lobstr, freighter, usePersistStore } from '@normalfinance/state';

import { useTheme } from '@mui/material/styles';
import {
  Box,
  Paper,
  Stack,
  Drawer,
  Button,
  Tooltip,
  IconButton,
  Typography,
  CircularProgress,
} from '@mui/material';

import { Iconify } from '@/components/template/iconify';
import CopyIconButton from '@/components/copy-icon-button';
import { Scrollbar } from '@/components/template/scrollbar';
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
      <Typography variant="subtitle1" sx={{ mb: 3 }} textAlign="left">
        {t('Connect your wallet')}
      </Typography>
      {loading ? (
        <CircularProgress />
      ) : (
        <Box
          gap={2}
          width="100%"
          sx={{ backgroundColor: theme.palette.grey[200], p: 1, borderRadius: 1.5 }}
        >
          {[...allowed, ...disallowed].map((c) => (
            <WalletOption
              key={c.id}
              connector={c}
              allowed={allowed.includes(c)}
              onClick={() => allowed.includes(c) && onSelect(c)}
            />
          ))}
        </Box>
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

  // const { data } = useNativeTokenBalance();
  // const { tokens } = useUserTokens();
  // const { positions } = useLPTokens();

  // TODO: Fetch user activity
  // const { activity } = useUserActivity();

  const handleFaucetRequest = useCallback(async () => {
    console.log(address);
    // if (isValidStellarAddress(address)) {
    //   enqueueSnackbar(t('Invalid address'), { variant: 'error' });
    //   return;
    // }
    const res = await fetch('/api/ip');
    const data = await res.json();

    console.log(data);

    const { success } = await rateLimiter.limit(address);
    if (!success) {
      enqueueSnackbar(t('Rate limit'), { variant: 'error' });
      return;
    }

    // const { data } = await axios.get(`https://friendbot.stellar.org?addr=${address}`);

    // if (data) {
    //   enqueueSnackbar('success', { variant: 'success' });
    // }
  }, [address, enqueueSnackbar]);

  if (!address) {
    return null;
  }

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
        sx={{ mb: 2 }}
      >
        {t('Get testnet XLM')}
      </Button>
      <ConnectedWallet balance={0} percentageChange={0} tokens={[]} positions={[]} activity={[]} />
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
  const connectors: Connector[] = [
    freighter(),
    xbull(),
    lobstr(),
    hana(),
    // new WalletConnect(),
  ];

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
    } else {
      Sentry.setUser(null);
    }
  }, [connectedAddress]);

  const disclaimerVersion = usePersistStore((s: any) => s.disclaimer.version);
  const [showTos, setShowTos] = useState(false);

  /** Open drawer OR show ToS dialog, depending on acceptance */
  const handleMainButtonClick = () => {
    if (disclaimerVersion < CURRENT_TOS_VERSION) {
      setShowTos(true);
    } else {
      onOpen();
    }
  };

  /** Called whenever the ToS modal closes (Accept or Decline).
   *  If they accepted, open the wallet drawer right away. */
  const handleTosClose = () => {
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
          onClick={handleMainButtonClick}
          photoURL={avatarURL}
          displayName=" "
          {...props}
        />
      ) : (
        <Button variant="contained" color="info" onClick={handleMainButtonClick}>
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
            <IconButton onClick={onClose}>
              <Iconify icon="mingcute:close-line" />
            </IconButton>
          </Tooltip>

          {isConnected && (
            <Tooltip title="Disconnect">
              <IconButton
                onClick={() => {
                  disconnect();
                  onClose();
                }}
                sx={{ ml: 'auto' }}
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
