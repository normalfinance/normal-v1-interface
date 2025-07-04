'use client';

import type { Token } from '@/types/token';
import type { Activity } from '@/types/activity';
import type { Connector } from '@normalfinance/types';
import type { IconButtonProps } from '@mui/material/IconButton';
import type { PoolDetails } from '@/components/_common/pools-explore/explorer-chart-data';

import { useState, useEffect } from 'react';
import { format } from '@normalfinance/utils';
import { useBoolean } from 'minimal-shared/hooks';
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

import { useTranslate } from '@/locales';
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
  tokens,
  pools,
  activity,
}: {
  address: string;
  onDisconnect: () => void;
  tokens?: Token[];
  pools?: PoolDetails[];
  activity?: Activity[];
}) {
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
        pools={pools}
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
  const [isConnected, setIsConnected] = useState(
    connectedAddress != '' && connectedAddress != undefined
  );

  const tokens: Token[] = [
    {
      id: 1,
      url: 'https://token-icons.s3.amazonaws.com/eth.png',
      name: 'Ethereum',
      shortname: 'ETH',
      countstatus: 0.02106,
      pricestatus: 2814.25,
      featured: true,
      percentageChange: 3.45,
    },
    {
      id: 2,
      url: 'https://coin-images.coingecko.com/coins/images/6319/large/usdc.png?1696506694',
      name: 'USDC',
      shortname: 'USDC',
      countstatus: 1444,
      pricestatus: 0.9998,
      featured: true,
      percentageChange: 3.45,
    },
    {
      id: 3,
      url: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xdAC17F958D2ee523a2206206994597C13D831ec7/logo.png',
      name: 'Tether',
      shortname: 'USDT',
      countstatus: 1231,
      pricestatus: 0.9999,
      featured: true,
      percentageChange: 3.45,
    },
    {
      id: 4,
      url: 'https://coin-images.coingecko.com/coins/images/7598/large/wrapped_bitcoin_wbtc.png?1696507857',
      name: 'Wrapped Bitcoin',
      shortname: 'WBTC',
      countstatus: 0.2,
      pricestatus: 95799.17,
      featured: true,
      percentageChange: 3.45,
    },
    {
      id: 5,
      url: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2/logo.png',
      name: 'Wrapped Ether',
      shortname: 'WETH',
      countstatus: 0.4,
      pricestatus: 2806.75,
      featured: true,
      percentageChange: -3.45,
    },
    {
      id: 6,
      url: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2/logo.png',
      name: 'Wrapped Ether',
      shortname: 'WETH',
      countstatus: 1.2,
      pricestatus: 2806.75,
      featured: false,
      percentageChange: 3.45,
    },
  ];

  const activity: Activity[] = [
    {
      id: 1,
      type: 'Sent',
      timestamp: Date.now() - 60_000,
      address: 'GABCDQWERTY1234567890EXAMPLEADDRESS1111',
      asset: {
        token: 'USDC',
        iconUrl: 'https://coin-images.coingecko.com/coins/images/6319/large/usdc.png',
        amount: 250,
      },
    },
    {
      id: 2,
      type: 'Received',
      timestamp: Date.now() - 50_000,
      address: 'GXYZASDFGH9876543210EXAMPLEADDRESS2222',
      asset: {
        token: 'BTC',
        iconUrl: 'https://cryptologos.cc/logos/bitcoin-btc-logo.png',
        amount: 0.015,
      },
    },
    {
      id: 3,
      type: 'Swapped',
      timestamp: Date.now() - 40_000,
      sell: {
        token: 'ETH',
        iconUrl: 'https://token-icons.s3.amazonaws.com/eth.png',
        amount: 0.5,
      },
      buy: {
        token: 'USDC',
        iconUrl: 'https://coin-images.coingecko.com/coins/images/6319/large/usdc.png',
        amount: 1500,
      },
    },
    {
      id: 4,
      type: 'Add Liquidity',
      timestamp: Date.now() - 30_000,
      lpToken: {
        token: 'UNI-ETH/USDC-LP',
        iconUrl: '/assets/icons/lp.svg',
        amount: 12.34,
      },
    },
    {
      id: 5,
      type: 'Remove Liquidity',
      timestamp: Date.now() - 20_000,
      lpToken: {
        token: 'UNI-ETH/USDC-LP',
        iconUrl: '/assets/icons/lp.svg',
        amount: 4.56,
      },
    },
    {
      id: 6,
      type: 'Stake',
      timestamp: Date.now() - 10_000,
      asset: {
        token: 'NORMAL',
        iconUrl: '/assets/icons/normal.svg',
        amount: 2000,
      },
    },
    {
      id: 7,
      type: 'Unstake',
      timestamp: Date.now() - 5_000,
      asset: {
        token: 'NORMAL',
        iconUrl: '/assets/icons/normal.svg',
        amount: 500,
      },
    },
  ];

  const pools: PoolDetails[] = [
    {
      pairInfo: {
        tokenA: {
          name: 'USDC',
          iconUrl: 'https://coin-images.coingecko.com/coins/images/6319/large/usdc.png?1696506694',
        },
        tokenB: {
          name: 'ETH',
          iconUrl: 'https://token-icons.s3.amazonaws.com/eth.png',
        },
        address: '0x88e6...5640',
      },
      metadata: {
        version: 'v1',
        feeTier: '0.30%',
      },
      performance: {
        position: 220.12,
        fees: 21.22,
      },
    },
  ];

  return (
    <>
      {isConnected ? (
        <AccountButton onClick={onOpen} photoURL={avatarURL} displayName=" " {...props} />
      ) : (
        <Button variant="contained" color="info" onClick={onOpen}>
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
              tokens={tokens}
              pools={pools}
              activity={activity}
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
    </>
  );
}
