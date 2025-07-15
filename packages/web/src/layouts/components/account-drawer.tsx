'use client';

import type { Activity } from '@/types/activity';
import type { Connector } from '@normalfinance/types';
import type { IconButtonProps } from '@mui/material/IconButton';

import * as Sentry from '@sentry/nextjs';
import { useTranslate } from '@/locales';
import { usePools } from '@/hooks/stellar';
import { useState, useEffect } from 'react';
import { format } from '@normalfinance/utils';
import { useBoolean } from 'minimal-shared/hooks';
import { CURRENT_TOS_VERSION } from '@normalfinance/types';
// import { useUserBalances } from '@/hooks/stellar/use-user-balances';
import { hana, xbull, lobstr, freighter, useAppStore, usePersistStore } from '@normalfinance/state';

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
function WalletConnected({
  address,
  onDisconnect,
  activity,
}: {
  address: string;
  onDisconnect: () => void;
  // pools?: PoolDetails[];
  activity?: Activity[];
}) {
  // const { tokens } = useUserBalances();
  const tokens: any[] = [];

  // Fetch LP tokens
  const { pools } = usePools();

  // const positions: PoolDetails[] = tokens
  //   .map((token) => {
  //     const match = pools.find((pool) => pool.pool_response.token_share.address === token.contract);

  //     if (match) {
  //       const details: PoolDetails = {
  //         poolInfo: {
  //           tokenA: {
  //             name: '',
  //             iconUrl: '',
  //           },
  //           tokenB: {
  //             name: '',
  //             iconUrl: '',
  //           },
  //           address: match.address,
  //           feeTier: match.pool.fee_fraction,
  //         },
  //         metadata: {
  //           version: '1',
  //           feeTier: '3'
  //         },
  //         performance: {
  //           position: 0,
  //           fees: 0,
  //         },
  //       };
  //       return details;
  //     }
  //   })
  //   .filter((v) => v != null);

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
        <Typography variant="subtitle1">{format.fTruncate(address, 12)}</Typography>
        {/* <CopyIconButton value={address} alert="Address copied" /> */}
      </Stack>
      <ConnectedWallet
        balance={83.42}
        percentageChange={3.56}
        tokens={tokens}
        poolPositions={[]}
        activity={activity}
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
  const store = useAppStore();
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

  useEffect(() => {
    if (connectedAddress) {
      Sentry.setUser({ id: connectedAddress });
    } else {
      Sentry.setUser(null);
    }
  }, [connectedAddress]);

  const [isConnected, setIsConnected] = useState(connectedAddress != '');
  // console.log(isConnected);

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
                  setIsConnected(false);
                  disconnect();
                }}
                sx={{ ml: 'auto' }}
              >
                <Iconify icon="solar:power-bold" />
              </IconButton>
            </Tooltip>
          )}
        </Box>
        <Scrollbar>
          {isConnected ? (
            <WalletConnected
              address={connectedAddress!}
              activity={[]}
              onDisconnect={() => {
                disconnect();
                onClose();
              }}
            />
          ) : (
            <WalletDisconnected
              connectors={connectors}
              onSelect={async (c) => {
                await connect(c);
                // setIsConnected(true);
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
