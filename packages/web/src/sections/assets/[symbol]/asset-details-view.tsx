'use client';

import type { ReactNode } from 'react';
import type { Token } from '@normalfinance/types';
import type { TurnkeyChain } from '@/lib/turnkey/add-account';

import BigNumber from 'bignumber.js';
import { paths } from '@/routes/paths';
import { useTranslate } from '@/locales';
import { useMemo, useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { DashboardContent } from '@/layouts/dashboard';
import { usePersistStore } from '@normalfinance/state';
import { useUsdPrice } from '@/hooks/use-price-history';
import { useBtcPortfolio } from '@/hooks/use-btc-portfolio';
import { MONO, CARD_SX } from '@/sections/portfolio/_shared';
import { cdn, getCryptoIconUrl } from '@normalfinance/utils';
import { useSupabaseAuth } from '@/providers/SupabaseAuthProvider';
import { useCopyToClipboard } from '@/hooks/use-copy-to-clipboard';
import { ActivityCard } from '@/sections/portfolio/portfolio-activity-card';
import { useEthPortfolio, useSolPortfolio } from '@/hooks/use-chain-portfolio';
import { fCurrency, fTokenAmount, fCurrencyTwoDecimals } from '@/utils/format-number';

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
import MoneyOffOutlined from '@mui/icons-material/MoneyOffOutlined';

import { Iconify } from '@/components/template/iconify';
import SendModal from '@/components/_common/send-modal';
import { useSnackbar } from '@/components/template/snackbar';
import OnRampDialog from '@/components/_common/onramp-dialog';
import OffRampDialog from '@/components/_common/offramp-dialog';
import ReceiveModal from '@/components/_common/receive-modal';
import { CoinbaseOfframpModal } from '@/components/_common/coinbase-offramp-modal';
import { SpecificNotFound } from '@/components/_common/specific-not-found';
import { ChainSetupDialog } from '@/components/_common/chain-setup-dialog';
import { ChainReceiveModal } from '@/components/_common/chain-receive-modal';
import { BitcoinReceiveModal } from '@/components/_common/bitcoin-receive-modal';
import { NetworkBadge, getAssetNetwork } from '@/components/_common/network-badge';

import { AssetPriceChart } from './asset-price-chart';

// ---------------------------------------------------------------------------
// Per-asset capabilities. Swap is Soroswap (XLM↔USDC only), Save is the USDC
// savings vault, Buy is the fiat on-ramp. BTC/ETH/SOL get Buy once LI.FI
// lands.
// ---------------------------------------------------------------------------

type AssetActionKey = 'send' | 'receive' | 'swap' | 'save' | 'buy' | 'sell';

function getAssetActions(symbol: string): AssetActionKey[] {
  switch (symbol) {
    // Sell (Coinbase off-ramp) is live for native chains only. USDC/XLM
    // off-ramp via Coinbase needs the Stellar memo question resolved first —
    // re-added in the next step.
    case 'BTC':
    case 'ETH':
    case 'SOL':
      return ['send', 'receive', 'buy', 'sell'];
    case 'USDC':
      return ['send', 'receive', 'swap', 'save', 'buy'];
    case 'XLM':
      return ['send', 'receive', 'swap', 'buy'];
    default:
      return ['send', 'receive'];
  }
}

// Native (non-Stellar) chain config for the synthesized display tokens and
// the per-chain notes shown under the action row.
const NATIVE_CHAINS: Record<
  string,
  { chain: TurnkeyChain; name: string; contract: string; icon: string; decimals: number; note: string }
> = {
  BTC: {
    chain: 'bitcoin',
    name: 'Bitcoin',
    contract: '__btc__',
    icon: cdn('tokens/bitcoin.webp'),
    decimals: 8,
    note: 'Bitcoin lives on its own network. You can send and receive BTC here, but it can’t be swapped or used for savings yet.',
  },
  ETH: {
    chain: 'ethereum',
    name: 'Ethereum',
    contract: '__eth__',
    icon: cdn('tokens/ethereum.webp'),
    decimals: 18,
    note: 'Ethereum lives on its own network. You can send and receive ETH here, but it can’t be swapped or used for savings yet.',
  },
  SOL: {
    chain: 'solana',
    name: 'Solana',
    contract: '__sol__',
    icon: cdn('tokens/solana.webp'),
    decimals: 9,
    note: 'Solana lives on its own network. You can send and receive SOL here, but it can’t be swapped or used for savings yet.',
  },
};

// ---------------------------------------------------------------------------

export default function AssetDetailsView({ symbol }: { symbol: string }) {
  const { t } = useTranslate();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { copy } = useCopyToClipboard();
  const { enqueueSnackbar } = useSnackbar();
  const { user } = useSupabaseAuth();

  const {
    wallet,
    tokenState: { tokens },
  } = usePersistStore();

  const upperSymbol = symbol.toUpperCase();
  const native = NATIVE_CHAINS[upperSymbol];
  const isBtc = upperSymbol === 'BTC';
  const isEth = upperSymbol === 'ETH';
  const isSol = upperSymbol === 'SOL';

  const storeToken = tokens.find((tkn) => tkn.symbol.toLowerCase() === symbol.toLowerCase());

  const btc = useBtcPortfolio(isBtc);
  const eth = useEthPortfolio(isEth);
  const sol = useSolPortfolio(isSol);

  // Live USD price for natives the user has no address for yet (the
  // synthesized token would otherwise show $0.00)
  const nativeUsdPrice = useUsdPrice(upperSymbol, !!native);

  const nativeToken = isBtc ? btc.btcToken : isEth ? eth.ethToken : isSol ? sol.solToken : null;
  const nativeAddress = isBtc ? btc.bitcoinAddress : isEth ? eth.ethereumAddress : isSol ? sol.solanaAddress : null;
  const nativeLoading = isBtc ? btc.loading : isEth ? eth.loading : isSol ? sol.loading : false;
  const nativeError = isEth ? eth.error : isSol ? sol.error : false;
  const refetchNative = isBtc ? btc.refetch : isEth ? eth.refetch : sol.refetch;

  const [sendOpen, setSendOpen] = useState(false);
  const [receiveOpen, setReceiveOpen] = useState(false);
  const [nativeReceiveOpen, setNativeReceiveOpen] = useState(false);
  const [buyOpen, setBuyOpen] = useState(false);
  const [sellOpen, setSellOpen] = useState(false);
  const [coinbaseOfframpOpen, setCoinbaseOfframpOpen] = useState(false);
  const [setupOpen, setSetupOpen] = useState(false);
  // Action the user started before the chain account existed; resumed after setup
  const [pendingAction, setPendingAction] = useState<'send' | 'receive' | 'buy' | 'sell' | null>(null);

  // Returning from a Coinbase off-ramp (native chains): Coinbase can't pull
  // funds from a self-custody wallet, so we resume here to send the crypto.
  useEffect(() => {
    if (searchParams.get('offramp') === 'coinbase' && native && user) {
      setCoinbaseOfframpOpen(true);
      router.replace(paths.assets.details(upperSymbol));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, native, user, upperSymbol]);

  // Native chains have no entry in the Stellar token store — synthesize a
  // display token (zero balance until the address exists and balance loads).
  const token: Token | undefined = useMemo(() => {
    if (!native) return storeToken;
    if (nativeToken && BigNumber(nativeToken.price || 0).gt(0)) return nativeToken;
    return {
      symbol: upperSymbol,
      contract: native.contract,
      name: native.name,
      issuer: '',
      org: '',
      domain: '',
      icon: native.icon,
      decimals: native.decimals,
      featured: false,
      balance: nativeToken?.balance ?? '0',
      price: String(nativeUsdPrice),
      percentageChange: 0,
    } as Token;
  }, [native, storeToken, nativeToken, upperSymbol, nativeUsdPrice]);

  if (native && nativeLoading && !nativeToken) {
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

  // Native-chain actions gate on the address existing. If it doesn't, the
  // user explicitly confirms wallet setup first (lazy provisioning) — the
  // action resumes afterwards. Never create the account silently.
  const openNativeAction = (action: 'send' | 'receive' | 'buy' | 'sell') => {
    if (action === 'send') setSendOpen(true);
    else if (action === 'buy') setBuyOpen(true);
    else if (action === 'sell') setSellOpen(true);
    else setNativeReceiveOpen(true);
  };

  const requireNativeWallet = (action: 'send' | 'receive' | 'buy' | 'sell') => {
    requireLogin(() => {
      if (!nativeAddress) {
        setPendingAction(action);
        setSetupOpen(true);
        return;
      }
      openNativeAction(action);
    });
  };

  const handleSetupSuccess = async () => {
    await refetchNative();
    setSetupOpen(false);
    if (pendingAction) openNativeAction(pendingAction);
    setPendingAction(null);
  };

  const ACTION_CONFIG: Record<AssetActionKey, { label: string; icon: ReactNode; onClick: () => void }> = {
    send: {
      label: t('Send'),
      icon: <CallMadeOutlined sx={{ fontSize: 14 }} />,
      onClick: () => (native ? requireNativeWallet('send') : requireStellarWallet(() => setSendOpen(true))),
    },
    receive: {
      label: t('Receive'),
      icon: <CallReceivedOutlined sx={{ fontSize: 14 }} />,
      onClick: () => (native ? requireNativeWallet('receive') : requireStellarWallet(() => setReceiveOpen(true))),
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
      onClick: () => (native ? requireNativeWallet('buy') : requireStellarWallet(() => setBuyOpen(true))),
    },
    sell: {
      label: t('Sell'),
      icon: <MoneyOffOutlined sx={{ fontSize: 14 }} />,
      onClick: () => (native ? requireNativeWallet('sell') : requireStellarWallet(() => setSellOpen(true))),
    },
  };

  const actions = getAssetActions(token.symbol).map((key) => ACTION_CONFIG[key]);

  const handleCopy = (val: string, message: string) => {
    copy(val);
    enqueueSnackbar(message, { variant: 'success' });
  };

  const infoRows: { label: string; value: string; copyable?: boolean }[] = native
    ? [
        ...(nativeAddress ? [{ label: t('Your address'), value: nativeAddress, copyable: true }] : []),
        { label: t('Network'), value: native.name },
        { label: t('Decimals'), value: String(native.decimals) },
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
            {nativeError ? (
              <>
                <Box sx={{ ...MONO, fontSize: '28px', fontWeight: 600, color: 'rgba(10,10,15,0.3)', letterSpacing: '-0.02em', lineHeight: 1.2 }}>
                  — {token.symbol}
                </Box>
                <Box
                  component="button"
                  onClick={() => refetchNative()}
                  sx={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '5px',
                    mt: '6px',
                    border: 'none',
                    bgcolor: 'transparent',
                    color: '#B45309',
                    fontSize: '13px',
                    fontFamily: 'inherit',
                    cursor: 'pointer',
                    p: 0,
                  }}
                >
                  <Iconify icon="solar:refresh-linear" width={14} />
                  {t("Couldn't load balance — tap to retry")}
                </Box>
              </>
            ) : (
              <>
                <Box sx={{ ...MONO, fontSize: '28px', fontWeight: 600, color: '#0A0A0F', letterSpacing: '-0.02em', lineHeight: 1.2 }}>
                  {fTokenAmount(balance)} {token.symbol}
                </Box>
                <Box sx={{ fontSize: '14px', color: 'rgba(10,10,15,0.5)', mt: '4px' }}>
                  {fCurrencyTwoDecimals(value.toNumber())}
                  <Box component="span" sx={{ mx: '8px', color: 'rgba(10,10,15,0.2)' }}>·</Box>
                  {fCurrency(price.toNumber())} / {token.symbol}
                </Box>
              </>
            )}
          </Box>

          {/* Actions */}
          <Box
            sx={{
              display: 'grid',
              // ≤5 actions sit in one row; 6 (USDC) wrap into a tidy 3×2.
              gridTemplateColumns: `repeat(${actions.length > 5 ? 3 : actions.length}, 1fr)`,
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

          {native && (
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
              {t(native.note)}
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

      {/* Price history */}
      <AssetPriceChart symbol={token.symbol} />

      {/* Asset-scoped activity */}
      <Box sx={{ mt: '20px' }}>
        <ActivityCard
          walletAddress={wallet.address}
          bitcoinAddress={isBtc ? btc.bitcoinAddress : undefined}
          ethereumAddress={isEth ? eth.ethereumAddress : undefined}
          solanaAddress={isSol ? sol.solanaAddress : undefined}
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

      <OnRampDialog
        open={buyOpen}
        amount="100"
        onClose={() => setBuyOpen(false)}
        walletAddress={(native ? nativeAddress : wallet.address) ?? undefined}
        asset={{ symbol: token.symbol, blockchain: native?.chain ?? 'stellar' }}
        providers={['stripe', 'coinbase']}
      />

      {/* Coinbase only — mirrors the Buy dialog on this page, which omits
          MoneyGram. (MoneyGram cash-out is USDC-only and stays in the
          savings/cash flow; it would also be wrong to offer it for XLM.) */}
      <OffRampDialog
        open={sellOpen}
        amount="100"
        onClose={() => setSellOpen(false)}
        walletAddress={(native ? nativeAddress : wallet.address) ?? undefined}
        asset={{ symbol: token.symbol, blockchain: native?.chain ?? 'stellar' }}
        providers={['coinbase']}
        assetBalance={native ? balance.toNumber() : undefined}
      />

      {isBtc && (
        <BitcoinReceiveModal
          open={nativeReceiveOpen}
          address={btc.bitcoinAddress}
          onClose={() => setNativeReceiveOpen(false)}
        />
      )}

      {(isEth || isSol) && (
        <ChainReceiveModal
          open={nativeReceiveOpen}
          onClose={() => setNativeReceiveOpen(false)}
          address={nativeAddress}
          chainLabel={native!.name}
          symbol={token.symbol}
          warning={t('Only send {{symbol}} on the {{chain}} network to this address!', {
            symbol: token.symbol,
            chain: native!.name,
          })}
        />
      )}

      {native && nativeAddress && (
        <CoinbaseOfframpModal
          open={coinbaseOfframpOpen}
          onClose={() => setCoinbaseOfframpOpen(false)}
          chain={native.chain}
          symbol={upperSymbol}
          address={nativeAddress}
          token={token}
        />
      )}

      {user && native && (
        <ChainSetupDialog
          open={setupOpen}
          onClose={() => {
            setSetupOpen(false);
            setPendingAction(null);
          }}
          chain={native.chain}
          userId={user.id}
          userEmail={user.email}
          onSuccess={handleSetupSuccess}
        />
      )}
    </DashboardContent>
  );
}
