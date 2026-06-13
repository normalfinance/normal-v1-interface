'use client';

import type { ReactNode } from 'react';
import type { Token } from '@normalfinance/types';

import BigNumber from 'bignumber.js';
import { paths } from '@/routes/paths';
import { useTranslate } from '@/locales';
import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ModalType } from '@normalfinance/types';
import { DashboardContent } from '@/layouts/dashboard';
import { useBtcPortfolio } from '@/hooks/use-btc-portfolio';
import { cdn, getCryptoIconUrl } from '@normalfinance/utils';
import { MONO, CARD_SX } from '@/sections/portfolio/_shared';
import { useSupabaseAuth } from '@/providers/SupabaseAuthProvider';
import { useCopyToClipboard } from '@/hooks/use-copy-to-clipboard';
import { useAppStore, usePersistStore } from '@normalfinance/state';
import { fCurrency, fCurrencyTwoDecimals } from '@/utils/format-number';
import { ActivityCard } from '@/sections/portfolio/portfolio-activity-card';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Avatar from '@mui/material/Avatar';
import Skeleton from '@mui/material/Skeleton';
import SavingsOutlined from '@mui/icons-material/SavingsOutlined';
import SwapVertOutlined from '@mui/icons-material/SwapVertOutlined';
import CallMadeOutlined from '@mui/icons-material/CallMadeOutlined';
import ArrowBackOutlined from '@mui/icons-material/ArrowBackOutlined';
import AttachMoneyOutlined from '@mui/icons-material/AttachMoneyOutlined';
import CallReceivedOutlined from '@mui/icons-material/CallReceivedOutlined';

import { Iconify } from '@/components/template/iconify';
import SendModal from '@/components/_common/send-modal';
import { useSnackbar } from '@/components/template/snackbar';
import ReceiveModal from '@/components/_common/receive-modal';
import { SpecificNotFound } from '@/components/_common/specific-not-found';
import { BitcoinSetupDialog } from '@/components/_common/bitcoin-setup-dialog';
import { BitcoinReceiveModal } from '@/components/_common/bitcoin-receive-modal';
import { NetworkBadge, getAssetNetwork } from '@/components/_common/network-badge';

// ---------------------------------------------------------------------------
// Per-asset capabilities. Swap is Soroswap (XLM↔USDC only), Save is the USDC
// savings vault, Buy is the fiat on-ramp. BTC gets Buy once LI.FI lands.
// ---------------------------------------------------------------------------

type AssetActionKey = 'send' | 'receive' | 'swap' | 'save' | 'buy';

function getAssetActions(symbol: string): AssetActionKey[] {
  switch (symbol) {
    case 'BTC':
      return ['send', 'receive'];
    case 'USDC':
      return ['send', 'receive', 'swap', 'save', 'buy'];
    case 'XLM':
      return ['send', 'receive', 'swap', 'buy'];
    default:
      return ['send', 'receive'];
  }
}

// ---------------------------------------------------------------------------

export default function AssetDetailsView({ symbol }: { symbol: string }) {
  const { t } = useTranslate();
  const router = useRouter();
  const { copy } = useCopyToClipboard();
  const { enqueueSnackbar } = useSnackbar();
  const { user } = useSupabaseAuth();
  const { setModalView } = useAppStore();

  const {
    wallet,
    tokenState: { tokens },
  } = usePersistStore();

  const isBtc = symbol.toUpperCase() === 'BTC';
  const storeToken = tokens.find((tkn) => tkn.symbol.toLowerCase() === symbol.toLowerCase());

  const { btcToken, bitcoinAddress, loading: btcLoading, refetch: refetchBtc } = useBtcPortfolio(isBtc);

  const [sendOpen, setSendOpen] = useState(false);
  const [receiveOpen, setReceiveOpen] = useState(false);
  const [btcReceiveOpen, setBtcReceiveOpen] = useState(false);
  const [btcSetupOpen, setBtcSetupOpen] = useState(false);
  // BTC action the user started before the wallet existed; resumed after setup
  const [pendingBtcAction, setPendingBtcAction] = useState<'send' | 'receive' | null>(null);

  // BTC has no entry in the Stellar token store — synthesize a display token
  // (zero balance until the address exists and the balance loads).
  const token: Token | undefined = useMemo(() => {
    if (!isBtc) return storeToken;
    if (btcToken) return btcToken;
    return {
      symbol: 'BTC',
      contract: '__btc__',
      name: 'Bitcoin',
      issuer: '',
      org: '',
      domain: '',
      icon: cdn('tokens/bitcoin.webp'),
      decimals: 8,
      featured: false,
      balance: '0',
      price: storeToken?.price ?? '0',
      percentageChange: 0,
    } as Token;
  }, [isBtc, storeToken, btcToken]);

  if (isBtc && btcLoading && !btcToken) {
    return (
      <DashboardContent maxWidth="xl">
        <Skeleton variant="rectangular" height={220} sx={{ borderRadius: '22px', bgcolor: 'rgba(10,10,15,0.06)' }} />
        <Skeleton variant="rectangular" height={280} sx={{ borderRadius: '22px', bgcolor: 'rgba(10,10,15,0.06)', mt: '20px' }} />
      </DashboardContent>
    );
  }

  if (!token) {
    return <SpecificNotFound type="asset" />;
  }

  const balance = BigNumber(token.balance || 0);
  const price = BigNumber(token.price || 0);
  const value = balance.multipliedBy(price);

  const requireLogin = (action: () => void) => {
    if (!user) {
      window.dispatchEvent(new CustomEvent('nf:open-login'));
      return;
    }
    action();
  };

  // Stellar actions need a connected Stellar wallet. "Skip for now" users
  // don't have one — route them into the onboarding wizard, which runs the
  // explicit create-with-passkey / import / connect flow (lazy provisioning).
  const requireStellarWallet = (action: () => void) => {
    requireLogin(() => {
      if (!wallet.address) {
        window.dispatchEvent(new CustomEvent('nf:open-wallet-setup'));
        return;
      }
      action();
    });
  };

  // BTC actions gate on the address existing. If it doesn't, the user
  // explicitly confirms wallet setup first (lazy provisioning) — the action
  // resumes afterwards. Never create the account silently.
  const requireBtcWallet = (action: 'send' | 'receive') => {
    requireLogin(() => {
      if (!bitcoinAddress) {
        setPendingBtcAction(action);
        setBtcSetupOpen(true);
        return;
      }
      if (action === 'send') setSendOpen(true);
      else setBtcReceiveOpen(true);
    });
  };

  const handleBtcSetupSuccess = async () => {
    await refetchBtc();
    setBtcSetupOpen(false);
    if (pendingBtcAction === 'send') setSendOpen(true);
    else if (pendingBtcAction === 'receive') setBtcReceiveOpen(true);
    setPendingBtcAction(null);
  };

  const ACTION_CONFIG: Record<AssetActionKey, { label: string; icon: ReactNode; onClick: () => void }> = {
    send: {
      label: t('Send'),
      icon: <CallMadeOutlined sx={{ fontSize: 14 }} />,
      onClick: () => (isBtc ? requireBtcWallet('send') : requireStellarWallet(() => setSendOpen(true))),
    },
    receive: {
      label: t('Receive'),
      icon: <CallReceivedOutlined sx={{ fontSize: 14 }} />,
      onClick: () => (isBtc ? requireBtcWallet('receive') : requireStellarWallet(() => setReceiveOpen(true))),
    },
    swap: {
      label: t('Swap'),
      icon: <SwapVertOutlined sx={{ fontSize: 14 }} />,
      onClick: () => router.push(`${paths.swap}?from=${token.symbol}`),
    },
    save: {
      label: t('Save'),
      icon: <SavingsOutlined sx={{ fontSize: 14 }} />,
      onClick: () => router.push(paths.savings),
    },
    buy: {
      label: t('Buy'),
      icon: <AttachMoneyOutlined sx={{ fontSize: 14 }} />,
      onClick: () => requireStellarWallet(() => setModalView(ModalType.ON_RAMP, true)),
    },
  };

  const actions = getAssetActions(token.symbol).map((key) => ACTION_CONFIG[key]);

  const handleCopy = (val: string, message: string) => {
    copy(val);
    enqueueSnackbar(message, { variant: 'success' });
  };

  const infoRows: { label: string; value: string; copyable?: boolean }[] = isBtc
    ? [
        ...(bitcoinAddress ? [{ label: t('Your address'), value: bitcoinAddress, copyable: true }] : []),
        { label: t('Network'), value: 'Bitcoin' },
        { label: t('Decimals'), value: '8' },
      ]
    : [
        { label: t('Network'), value: 'Stellar' },
        { label: t('Contract'), value: token.contract, copyable: true },
        ...(token.issuer ? [{ label: t('Issuer'), value: token.issuer, copyable: true }] : []),
        { label: t('Decimals'), value: String(token.decimals) },
      ];

  return (
    <DashboardContent maxWidth="xl">
      {/* Back to portfolio */}
      <Box
        component="button"
        onClick={() => router.push(paths.portfolio)}
        sx={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          border: 'none',
          bgcolor: 'transparent',
          color: 'rgba(10,10,15,0.5)',
          fontSize: '13px',
          fontWeight: 500,
          cursor: 'pointer',
          fontFamily: 'inherit',
          p: 0,
          mb: '16px',
          transition: 'color 150ms ease',
          '&:hover': { color: '#0A0A0F' },
        }}
      >
        <ArrowBackOutlined sx={{ fontSize: 15 }} />
        {t('Portfolio')}
      </Box>

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: '3fr 2fr' },
          gap: '20px',
          alignItems: 'start',
        }}
      >
        {/* Overview + actions */}
        <Box sx={{ ...CARD_SX, minWidth: 0 }}>
          <Stack direction="row" alignItems="center" spacing="14px" sx={{ mb: '22px' }}>
            <Avatar
              src={token.icon || getCryptoIconUrl(token.symbol)}
              alt={token.name}
              sx={{ width: 44, height: 44 }}
            />
            <Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Box sx={{ fontSize: '17px', fontWeight: 600, color: '#0A0A0F', letterSpacing: '-0.01em', lineHeight: 1.3 }}>
                  {token.name}
                </Box>
                <NetworkBadge network={getAssetNetwork(token)} />
              </Box>
              <Box sx={{ fontSize: '13px', color: 'rgba(10,10,15,0.45)', lineHeight: 1.3 }}>
                {token.symbol}
              </Box>
            </Box>
          </Stack>

          <Box sx={{ mb: '22px' }}>
            <Box sx={{ fontSize: '12px', fontWeight: 500, color: 'rgba(10,10,15,0.45)', textTransform: 'uppercase', letterSpacing: '0.08em', mb: '6px' }}>
              {t('Your Balance')}
            </Box>
            <Box sx={{ ...MONO, fontSize: '28px', fontWeight: 600, color: '#0A0A0F', letterSpacing: '-0.02em', lineHeight: 1.2 }}>
              {balance.toFormat(token.decimals > 4 ? 4 : token.decimals)} {token.symbol}
            </Box>
            <Box sx={{ fontSize: '14px', color: 'rgba(10,10,15,0.5)', mt: '4px' }}>
              {fCurrencyTwoDecimals(value.toNumber())}
              <Box component="span" sx={{ mx: '8px', color: 'rgba(10,10,15,0.2)' }}>·</Box>
              {fCurrency(price.toNumber())} / {token.symbol}
            </Box>
          </Box>

          {/* Actions */}
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: `repeat(${Math.min(actions.length, 5)}, 1fr)`,
              gap: '6px',
            }}
          >
            {actions.map((action) => (
              <Box
                key={action.label}
                component="button"
                onClick={action.onClick}
                sx={{
                  appearance: 'none',
                  border: '1px solid rgba(10,10,15,0.08)',
                  borderRadius: '12px',
                  padding: '10px 6px',
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '7px',
                  fontSize: '12px',
                  fontWeight: 500,
                  color: '#6B6B76',
                  background: 'transparent',
                  transition: 'all .15s ease',
                  '&:hover': { bgcolor: 'rgba(10,10,15,0.03)', color: '#0A0A0F', borderColor: 'rgba(10,10,15,0.14)' },
                  '&:hover .action-icon-box': { bgcolor: '#0A0A0F', color: '#fff' },
                }}
              >
                <Box
                  className="action-icon-box"
                  sx={{
                    width: 28,
                    height: 28,
                    borderRadius: '8px',
                    bgcolor: '#F4F4F7',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#0A0A0F',
                    transition: 'all .15s ease',
                  }}
                >
                  {action.icon}
                </Box>
                {action.label}
              </Box>
            ))}
          </Box>

          {isBtc && (
            <Box
              sx={{
                mt: '14px',
                px: '12px',
                py: '10px',
                borderRadius: '10px',
                bgcolor: 'rgba(247,147,26,0.06)',
                border: '1px solid rgba(247,147,26,0.18)',
                fontSize: '12.5px',
                color: 'rgba(10,10,15,0.6)',
                lineHeight: 1.5,
              }}
            >
              {t(
                'Bitcoin lives on its own network. You can send and receive BTC here, but it can’t be swapped or used for savings yet.'
              )}
            </Box>
          )}
        </Box>

        {/* Token info */}
        <Box sx={{ ...CARD_SX, minWidth: 0 }}>
          <Box sx={{ fontSize: '15px', fontWeight: 500, color: '#0A0A0F', mb: '16px' }}>
            {t('Token Information')}
          </Box>
          <Stack spacing="12px">
            {infoRows.map((row) => (
              <Box
                key={row.label}
                sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px' }}
              >
                <Box sx={{ fontSize: '13px', color: 'rgba(10,10,15,0.5)', flexShrink: 0 }}>
                  {row.label}
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0 }}>
                  <Box
                    sx={{
                      ...MONO,
                      fontSize: '12.5px',
                      color: '#0A0A0F',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      maxWidth: 220,
                    }}
                  >
                    {row.value}
                  </Box>
                  {row.copyable && (
                    <Iconify
                      icon="solar:copy-linear"
                      width={15}
                      sx={{ cursor: 'pointer', color: 'rgba(10,10,15,0.35)', flexShrink: 0, '&:hover': { color: '#0A0A0F' } }}
                      onClick={() => handleCopy(row.value, t('Copied to clipboard'))}
                    />
                  )}
                </Box>
              </Box>
            ))}
          </Stack>
        </Box>
      </Box>

      {/* Asset-scoped activity */}
      <Box sx={{ mt: '20px' }}>
        <ActivityCard
          walletAddress={wallet.address}
          bitcoinAddress={isBtc ? bitcoinAddress : undefined}
          assetSymbol={token.symbol}
        />
      </Box>

      {/* Modals — rendered locally so the asset is preselected */}
      <SendModal
        open={sendOpen}
        onClose={() => setSendOpen(false)}
        initialSymbol={token.symbol}
      />

      <ReceiveModal
        open={receiveOpen}
        context="receive"
        onClose={() => setReceiveOpen(false)}
      />

      <BitcoinReceiveModal
        open={btcReceiveOpen}
        address={bitcoinAddress}
        onClose={() => setBtcReceiveOpen(false)}
      />

      {user && (
        <BitcoinSetupDialog
          open={btcSetupOpen}
          onClose={() => {
            setBtcSetupOpen(false);
            setPendingBtcAction(null);
          }}
          userId={user.id}
          userEmail={user.email}
          onSuccess={handleBtcSetupSuccess}
        />
      )}
    </DashboardContent>
  );
}
