import type { Connector } from '@normalfinance/types';

import { useBlux } from '@bluxcc/react';
import { useTranslate } from '@/locales';
import { format } from '@normalfinance/utils';
import { useBoolean } from 'minimal-shared/hooks';
import React, { useState, useEffect } from 'react';
import { ENABLE_BLUX_AUTH } from '@/lib/blux-config';
import { CURRENT_TOS_VERSION } from '@normalfinance/types';
import { hana, xbull, lobstr, freighter, usePersistStore } from '@normalfinance/state';

import {
  Box,
  Paper,
  Stack,
  Button,
  Drawer,
  Tooltip,
  Typography,
  IconButton,
  CircularProgress,
} from '@mui/material';

import { Iconify } from '@/components/template/iconify';
import CopyIconButton from '@/components/copy-icon-button';
import { Scrollbar } from '@/components/template/scrollbar';
import ConnectedWallet from '@/components/_common/drawer-components/connected-wallet';
import TermsOfServiceDialog from '@/components/_common/drawer-components/terms-of-service-dialog';

interface WalletGateProps {
  children: React.ReactNode;
  buttonText?: string;
  fullWidth?: boolean;
  variant?: 'contained' | 'soft' | 'outlined';
  color?: 'info' | 'success' | 'primary' | 'secondary' | 'error' | 'warning';
}

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
        <Box gap={2} width="100%" sx={{ backgroundColor: 'grey.200', p: 1, borderRadius: 1.5 }}>
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
  // const { data: tokenBalances, isLoading: balancesLoading } = useUserTokens();

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
      {/* TODO: replace balance with tokenBalances */}
      <ConnectedWallet balance={0} percentageChange={0} tokens={[]} positions={[]} activity={[]} />
    </Box>
  );
}

export const WalletGate: React.FC<WalletGateProps> = ({
  children,
  buttonText = 'Connect Wallet',
  fullWidth = true,
  variant = 'contained',
  color = 'info',
}) => {
  const persist = usePersistStore();
  const { t } = useTranslate();

  // Use actual Blux hook
  const blux = useBlux();

  console.log('🔍 WalletGate: Component rendered', {
    ENABLE_BLUX_AUTH,
    bluxReady: blux?.isReady,
    bluxAuthenticated: blux?.isAuthenticated,
    bluxUser: blux?.user,
    legacyWalletAddress: persist.wallet.address,
  });

  // Check connection status - prioritize Blux if enabled and authenticated
  const isConnected =
    ENABLE_BLUX_AUTH && blux
      ? blux.isAuthenticated && blux.user?.wallet?.address
      : !!persist.wallet.address;

  console.log('✅ WalletGate: Connection status determined', { isConnected });

  /* ↓ drawer UI toggle ------------------------------------------- */
  const { value: open, onTrue: onOpen, onFalse: onClose } = useBoolean();

  /* ↓ connectors -------------------------------------------------- */
  const connectors: Connector[] = [freighter(), xbull(), lobstr(), hana()];

  const connect = (c: Connector) => {
    console.log('🔗 WalletGate: Connecting legacy wallet', c.id);
    return persist.connectWallet(c.id);
  };

  const disconnect = () => {
    console.log('🔌 WalletGate: Disconnecting wallet', {
      bluxEnabled: ENABLE_BLUX_AUTH,
      bluxAuthenticated: blux?.isAuthenticated,
    });

    if (ENABLE_BLUX_AUTH && blux?.isAuthenticated) {
      console.log('🚪 WalletGate: Using Blux logout');
      blux.logout();
    } else {
      console.log('🚪 WalletGate: Using legacy wallet disconnect');
      persist.disconnectWallet();
    }
  };

  const disclaimerVersion = usePersistStore((s: any) => s.disclaimer.version);
  const [showTos, setShowTos] = useState(false);

  /** Open drawer OR show ToS dialog, depending on acceptance */
  const handleMainButtonClick = () => {
    console.log('👆 WalletGate: Main button clicked', {
      disclaimerVersion,
      currentTosVersion: CURRENT_TOS_VERSION,
      bluxEnabled: ENABLE_BLUX_AUTH,
    });

    if (disclaimerVersion < CURRENT_TOS_VERSION) {
      console.log('📋 WalletGate: Showing ToS dialog');
      setShowTos(true);
    } else if (ENABLE_BLUX_AUTH && blux) {
      console.log('🚀 WalletGate: Opening Blux login modal');
      blux.login();
    } else {
      console.log('📱 WalletGate: Opening legacy wallet drawer');
      onOpen();
    }
  };

  /** Called whenever the ToS modal closes (Accept or Decline).
   *  If they accepted, open the wallet drawer right away. */
  const handleTosClose = () => {
    console.log('📋 WalletGate: ToS dialog closed');
    setShowTos(false);

    // read the latest store value directly (no hooks inside a callback)
    const latestVersion = usePersistStore.getState().disclaimer.version;
    console.log('📋 WalletGate: Checking ToS acceptance', {
      latestVersion,
      required: CURRENT_TOS_VERSION,
    });

    if (latestVersion >= CURRENT_TOS_VERSION) {
      if (ENABLE_BLUX_AUTH && blux) {
        console.log('🚀 WalletGate: ToS accepted, opening Blux login');
        blux.login();
      } else {
        console.log('📱 WalletGate: ToS accepted, opening legacy wallet drawer');
        onOpen();
      }
    }
  };

  if (isConnected) return <>{children}</>;

  return (
    <>
      <Button
        fullWidth={fullWidth}
        variant={variant}
        color={color}
        onClick={handleMainButtonClick}
        data-testid="wallet-gate-connect-btn"
      >
        {t(buttonText)}
      </Button>

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
          {isConnected ? (
            <WalletConnected
              address={
                ENABLE_BLUX_AUTH && blux?.isAuthenticated
                  ? blux.user?.wallet?.address || ''
                  : persist.wallet.address!
              }
            />
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
};

export default WalletGate;
