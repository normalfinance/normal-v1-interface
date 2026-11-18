'use client';

import type { ReactNode } from 'react';
import type { Token } from '@normalfinance/types';
import type { TurnkeyChain } from '@/lib/turnkey/add-account';

import BigNumber from 'bignumber.js';
import { paths } from '@/routes/paths';
import { useTranslate } from '@/locales';
import { useMemo, useState } from 'react';
import { cdn } from '@normalfinance/utils';
import { useRouter } from 'next/navigation';
import { CHAINS } from '@/lib/chains/registry';
import { useMarkets } from '@/hooks/use-markets';
import { BRAND_COLORS } from '@/theme/brand-colors';
import { MONO } from '@/sections/portfolio/_shared';
import { usePortfolio } from '@/hooks/use-portfolio';
import { DashboardContent } from '@/layouts/dashboard';
import { usePersistStore } from '@normalfinance/state';
import { useUsdPrice } from '@/hooks/use-price-history';
import { useBtcPortfolio } from '@/hooks/use-btc-portfolio';
import { useStellarTokens } from '@/hooks/use-stellar-tokens';
import { connectedWalletLabel } from '@/lib/portfolio/display';
import { useWalletBalances } from '@/hooks/use-wallet-balances';
import { useSupabaseAuth } from '@/providers/SupabaseAuthProvider';
import { useCopyToClipboard } from '@/hooks/use-copy-to-clipboard';
import { ActivityCard } from '@/sections/portfolio/portfolio-activity-card';
import { useEthPortfolio, useSolPortfolio } from '@/hooks/use-chain-portfolio';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Skeleton from '@mui/material/Skeleton';
import Typography from '@mui/material/Typography';
import ButtonBase from '@mui/material/ButtonBase';
import IconButton from '@mui/material/IconButton';
import AddRounded from '@mui/icons-material/AddRounded';
import SavingsOutlined from '@mui/icons-material/SavingsOutlined';
import NorthEastRounded from '@mui/icons-material/NorthEastRounded';
import SouthWestRounded from '@mui/icons-material/SouthWestRounded';
import SwapHorizRounded from '@mui/icons-material/SwapHorizRounded';
import ArrowBackOutlined from '@mui/icons-material/ArrowBackOutlined';
import ContentCopyRounded from '@mui/icons-material/ContentCopyRounded';
import AccountBalanceOutlined from '@mui/icons-material/AccountBalanceOutlined';

import SendModal from '@/components/_common/send-modal';
import { useSnackbar } from '@/components/template/snackbar';
import OnRampDialog from '@/components/_common/onramp-dialog';
import ReceiveModal from '@/components/_common/receive-modal';
import OffRampDialog from '@/components/_common/offramp-dialog';
import { AssetAvatar } from '@/components/_common/asset-avatar';
import { getAssetNetwork } from '@/components/_common/network-badge';
import { SpecificNotFound } from '@/components/_common/specific-not-found';
import { ChainSetupDialog } from '@/components/_common/chain-setup-dialog';
import { ChainReceiveModal } from '@/components/_common/chain-receive-modal';
import { BitcoinReceiveModal } from '@/components/_common/bitcoin-receive-modal';
import MoneyGramPendingBanner from '@/components/_common/moneygram-pending-banner';
import RampPendingBanner, { RampInflightInline } from '@/components/_common/ramp-pending-banner';
import {
  BOX_PX,
  FIGURES,
  RowList,
  AppBlock,
  Headline,
  ActionRow,
  assetName,
  formatUsd,
  formatCoin,
  ASSET_NAMES,
  ActionButton,
  SummaryBlock,
} from '@/components/_common/app-ui';

import { AssetAbout } from './asset-about';
import { AssetMarketCard } from './asset-market';
import { AssetPriceChart } from './asset-price-chart';

// ---------------------------------------------------------------------------
// Per-asset capabilities. Swap opens the Swap page with the coin picked
// (Soroswap for XLM and USDC; LI.FI, and CCTP to digital dollars, for BTC, ETH
// and SOL). Save is the USDC savings vault, Buy the fiat on-ramp.
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
      return ['send', 'receive', 'swap', 'buy', 'sell'];
    case 'USDC':
      return ['send', 'receive', 'swap', 'save', 'buy', 'sell'];
    case 'XLM':
      return ['send', 'receive', 'swap', 'buy', 'sell'];
    default:
      return ['send', 'receive'];
  }
}

// Native (non-Stellar) chain config for the synthesized display tokens.
const NATIVE_CHAINS: Record<
  string,
  {
    chain: TurnkeyChain;
    name: string;
    contract: string;
    icon: string;
    decimals: number;
  }
> = {
  BTC: {
    chain: 'bitcoin',
    name: 'Bitcoin',
    contract: '__btc__',
    icon: cdn('tokens/bitcoin.webp'),
    decimals: 8,
  },
  ETH: {
    chain: 'ethereum',
    name: 'Ethereum',
    contract: '__eth__',
    icon: cdn('tokens/ethereum.webp'),
    decimals: 18,
  },
  SOL: {
    chain: 'solana',
    name: 'Solana',
    contract: '__sol__',
    icon: cdn('tokens/solana.webp'),
    decimals: 9,
  },
};

// ---------------------------------------------------------------------------

export default function AssetDetailsView({ symbol }: { symbol: string }) {
  const { t } = useTranslate();
  const router = useRouter();
  const { copy } = useCopyToClipboard();
  const { enqueueSnackbar } = useSnackbar();
  const { user } = useSupabaseAuth();

  const { wallet } = usePersistStore();
  const tokens = useStellarTokens();

  const upperSymbol = symbol.toUpperCase();
  const native = NATIVE_CHAINS[upperSymbol];
  const isBtc = upperSymbol === 'BTC';
  const isEth = upperSymbol === 'ETH';
  const isSol = upperSymbol === 'SOL';

  const storeToken = tokens.find((tkn) => tkn.symbol.toLowerCase() === symbol.toLowerCase());

  // #75 Phase 2b: account-wide view for Stellar assets. The page showed the
  // SLOT wallet's balance only (and read it from the legacy store) — a hybrid
  // user opening /assets/XLM saw the near-empty Lobstr number while their
  // XLM sat in the Normal wallet. Balances come from the aggregate; the big
  // number is the ACCOUNT total, with a per-wallet split line under it.
  const { companionStellar, assets: aggAssets } = useWalletBalances(true);
  const aggSlotBalance = aggAssets.find(
    (a) => a.chain === 'stellar' && a.symbol === upperSymbol
  )?.balance;
  const companionBalance = BigNumber(
    companionStellar?.assets.find((a) => a.symbol === upperSymbol)?.balance ?? 0
  );

  const btc = useBtcPortfolio(isBtc);
  const eth = useEthPortfolio(isEth);
  const sol = useSolPortfolio(isSol);

  // Live USD price for natives the user has no address for yet (the
  // synthesized token would otherwise show $0.00)
  const nativeUsdPrice = useUsdPrice(upperSymbol, !!native);

  const { markets, isLoading: marketsLoading } = useMarkets();
  const market = markets[upperSymbol];
  const portfolio = usePortfolio(!!user);

  const nativeToken = isBtc ? btc.btcToken : isEth ? eth.ethToken : isSol ? sol.solToken : null;
  const nativeAddress = isBtc
    ? btc.bitcoinAddress
    : isEth
      ? eth.ethereumAddress
      : isSol
        ? sol.solanaAddress
        : null;
  const nativeLoading = isBtc ? btc.loading : isEth ? eth.loading : isSol ? sol.loading : false;
  const nativeError = isEth ? eth.error : isSol ? sol.error : isBtc ? btc.error : false;
  const refetchNative = isBtc ? btc.refetch : isEth ? eth.refetch : sol.refetch;

  const [sendOpen, setSendOpen] = useState(false);
  const [receiveOpen, setReceiveOpen] = useState(false);
  const [nativeReceiveOpen, setNativeReceiveOpen] = useState(false);
  const [buyOpen, setBuyOpen] = useState(false);
  const [sellOpen, setSellOpen] = useState(false);
  const [setupOpen, setSetupOpen] = useState(false);
  // Action the user started before the chain account existed; resumed after setup
  const [pendingAction, setPendingAction] = useState<'send' | 'receive' | 'buy' | 'sell' | null>(
    null
  );
  // Note: completing a Coinbase off-ramp on return is handled globally by
  // OfframpResumeHandler (mounted in ModalProvider) — not per-page.

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
      <DashboardContent>
        <Skeleton variant="text" sx={{ width: 220, fontSize: 28, mb: 4 }} />
        <Skeleton variant="rectangular" height={180} />
        <Skeleton variant="rectangular" height={360} sx={{ mt: 5 }} />
      </DashboardContent>
    );
  }

  if (!token) {
    return <SpecificNotFound type="asset" />;
  }

  // Stellar assets: slot balance from the aggregate (store kept only for
  // identity/price fallback), display total = slot + companion.
  const slotBalance = native
    ? BigNumber(token.balance || 0)
    : BigNumber(aggSlotBalance ?? token.balance ?? 0);
  const balance = slotBalance.plus(native ? 0 : companionBalance);
  const price = BigNumber(token.price || 0);
  const value = balance.multipliedBy(price);
  // Split line only when BOTH wallets hold some — one owner needs no labels.
  const showWalletSplit = !native && companionBalance.gt(0);

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

  const ACTION_CONFIG: Record<
    AssetActionKey,
    { label: string; icon: ReactNode; onClick: () => void }
  > = {
    send: {
      label: t('Send'),
      icon: <NorthEastRounded />,
      onClick: () =>
        native ? requireNativeWallet('send') : requireStellarWallet(() => setSendOpen(true)),
    },
    receive: {
      label: t('Receive'),
      icon: <SouthWestRounded />,
      onClick: () =>
        native ? requireNativeWallet('receive') : requireStellarWallet(() => setReceiveOpen(true)),
    },
    swap: {
      label: t('Swap'),
      icon: <SwapHorizRounded />,
      onClick: () => router.push(`${paths.swap}?from=${token.symbol}`),
    },
    save: {
      label: t('Save'),
      icon: <SavingsOutlined />,
      onClick: () => router.push(paths.savings),
    },
    buy: {
      label: t('Buy'),
      icon: <AddRounded />,
      onClick: () =>
        native ? requireNativeWallet('buy') : requireStellarWallet(() => setBuyOpen(true)),
    },
    sell: {
      label: t('Cash out'),
      icon: <AccountBalanceOutlined />,
      onClick: () =>
        native ? requireNativeWallet('sell') : requireStellarWallet(() => setSellOpen(true)),
    },
  };

  const actions = getAssetActions(token.symbol).map((key) => ACTION_CONFIG[key]);

  const handleCopy = (val: string, message: string) => {
    copy(val);
    enqueueSnackbar(message, { variant: 'success' });
  };

  const infoRows: { label: string; value: string; copyable?: boolean }[] = native
    ? [
        ...(nativeAddress
          ? [{ label: t('Your address'), value: nativeAddress, copyable: true }]
          : []),
        { label: t('Network'), value: native.name },
        { label: t('Decimals'), value: String(native.decimals) },
      ]
    : [
        ...(wallet.address && !companionStellar
          ? [{ label: t('Your address'), value: wallet.address, copyable: true }]
          : []),
        { label: t('Network'), value: 'Stellar' },
        { label: t('Contract'), value: token.contract, copyable: true },
        ...(token.issuer ? [{ label: t('Issuer'), value: token.issuer, copyable: true }] : []),
        { label: t('Decimals'), value: String(token.decimals) },
      ];

  const network = getAssetNetwork(token);
  const displayName = ASSET_NAMES[token.symbol] ? assetName(token.symbol) : token.name;
  const amount = formatCoin(balance.toNumber(), token.symbol);

  // How the holding moved today, from the coin's 24-hour change: value ×
  // pct / (100 + pct) is what it was worth less a day ago.
  const pct24h =
    aggAssets.find((a) => a.symbol === upperSymbol)?.change24h ?? market?.change24h ?? null;
  const today =
    pct24h != null && Number.isFinite(pct24h) && value.gt(0)
      ? (value.toNumber() * pct24h) / (100 + pct24h)
      : null;
  const moved = today !== null && Math.abs(today) >= 0.005;

  // Its share of everything held, once the whole account has loaded.
  const accountLoaded =
    !portfolio.isLoading &&
    !portfolio.savings.positionLoading &&
    !portfolio.savings.companionPositionLoading;
  const share =
    accountLoaded && portfolio.totalUsd > 0 && value.gt(0)
      ? Math.min(100, (value.toNumber() / portfolio.totalUsd) * 100)
      : null;

  // The holder's own address on the chain's explorer (one-wallet accounts:
  // with two Stellar wallets there is no single address to show).
  const explorerAddress = native
    ? nativeAddress
      ? CHAINS[native.chain as keyof typeof CHAINS].explorerAddress(nativeAddress)
      : null
    : wallet.address && !companionStellar
      ? CHAINS.stellar.explorerAddress(wallet.address)
      : null;
  const explorer = explorerAddress
    ? {
        href: explorerAddress,
        label: t('Your address on {{site}}', { site: new URL(explorerAddress).hostname }),
      }
    : null;

  return (
    <DashboardContent>
      <ButtonBase
        onClick={() => router.push(paths.assets.root)}
        sx={{
          alignSelf: 'flex-start',
          gap: 0.75,
          ml: -1,
          mb: 2,
          px: 1,
          py: 0.5,
          fontSize: 14,
          fontWeight: 500,
          color: 'text.secondary',
          '&:hover': { color: 'text.primary', bgcolor: 'action.hover' },
        }}
      >
        <ArrowBackOutlined sx={{ fontSize: 16 }} />
        {t('Assets')}
      </ButtonBase>

      {/* The page's title: the coin, its everyday name, its ticker and network. */}
      <Stack direction="row" alignItems="center" spacing={1.75} sx={{ mb: { xs: 3, md: 4 } }}>
        <AssetAvatar token={token} size={48} />
        <Box sx={{ minWidth: 0 }}>
          <Typography
            component="h1"
            sx={{ fontSize: { xs: 24, md: 28 }, fontWeight: 500, letterSpacing: '-0.025em' }}
          >
            {displayName}
          </Typography>
          <Typography sx={{ fontSize: 15, color: 'text.secondary' }}>
            {`${token.symbol} · ${network} network`}
          </Typography>
        </Box>
      </Stack>

      <SummaryBlock
        aria-label={t('Your balance')}
        actions={
          <ActionRow count={actions.length}>
            {actions.map((action, index) => (
              <ActionButton
                key={action.label}
                primary={index === 0}
                icon={action.icon}
                label={action.label}
                onClick={action.onClick}
              />
            ))}
          </ActionRow>
        }
      >
        {nativeError ? (
          <Headline
            label={t('Your balance')}
            value={t('Unavailable')}
            note={
              <ButtonBase
                onClick={() => refetchNative()}
                sx={{ font: 'inherit', fontWeight: 500, textDecoration: 'underline' }}
              >
                {t("Couldn't load the balance. Try again")}
              </ButtonBase>
            }
          />
        ) : (
          <Headline
            label={t('Your balance')}
            value={price.isZero() ? amount : formatUsd(value.toNumber())}
            note={
              <>
                {[
                  price.isZero() ? null : amount,
                  share !== null
                    ? t('{{pct}}% of your money', {
                        pct: share < 1 ? share.toFixed(1) : Math.round(share),
                      })
                    : null,
                ]
                  .filter(Boolean)
                  .join(' · ')}
                {/* #75 2b: per-wallet split. The big number is the account
                    total; this line says who holds what. */}
                {showWalletSplit && (
                  <Box sx={{ mt: 0.5 }}>
                    {`${t('Normal wallet')} ${formatCoin(companionBalance.toNumber(), token.symbol)} · ${connectedWalletLabel(wallet.walletType)} ${formatCoin(slotBalance.toNumber(), token.symbol)}`}
                  </Box>
                )}
                {/* Today's move, in the shared Change colours */}
                {moved && (
                  <Box
                    sx={{ mt: 0.5, color: today > 0 ? BRAND_COLORS.mint.deep : 'text.secondary' }}
                  >
                    {`${today > 0 ? '+' : '−'}${formatUsd(Math.abs(today))} ${t('today')}`}
                  </Box>
                )}
              </>
            }
          />
        )}
        {/* Money on the way (Niko 2026-08-26): the in-flight indicator lives
            in the balance block, right under the number it explains. */}
        <RampInflightInline symbol={token.symbol} />
      </SummaryBlock>

      {/* The price, edge to edge in the coin's colour. A digital dollar's
          line draws flat (it never spans less than 2% of its price), which
          is the honest picture of a dollar. */}
      <Box sx={{ mt: { xs: 4, md: 5 } }}>
        <AssetPriceChart symbol={token.symbol} />
      </Box>

      <Box sx={{ mt: 4 }}>
        <AssetMarketCard symbol={token.symbol} market={market} loading={marketsLoading} />
      </Box>

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: 'minmax(0, 1fr)', lg: 'minmax(0, 7fr) minmax(0, 5fr)' },
          gap: { xs: 4, lg: 3 },
          alignItems: 'start',
          mt: 4,
        }}
      >
        <AssetAbout symbol={token.symbol} explorer={explorer} />

        <AppBlock flush open title={t('Details')}>
          <RowList>
            {infoRows.map((row) => (
              <Box
                key={row.label}
                className="nf-row"
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 2,
                  minHeight: 52,
                  px: BOX_PX,
                  py: 1,
                }}
              >
                <Typography sx={{ flexShrink: 0, fontSize: 14, color: 'text.secondary' }}>
                  {row.label}
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, minWidth: 0 }}>
                  <Typography
                    sx={{
                      ...(row.copyable ? MONO : FIGURES),
                      fontSize: row.copyable ? 13 : 14,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      maxWidth: 220,
                    }}
                  >
                    {row.value}
                  </Typography>
                  {row.copyable && (
                    <IconButton
                      size="small"
                      aria-label={t('Copy')}
                      onClick={() => handleCopy(row.value, t('Copied to clipboard'))}
                      sx={{ mr: -0.75 }}
                    >
                      <ContentCopyRounded sx={{ fontSize: 16 }} />
                    </IconButton>
                  )}
                </Box>
              </Box>
            ))}
          </RowList>
        </AppBlock>
      </Box>

      {/* Asset-scoped activity */}
      <Box sx={{ mt: 4 }}>
        {/* In-flight MoneyGram cash deposits/outs — USDC (Stellar) is the only
            asset MoneyGram ramps, so the banner only belongs here. */}
        {/* doc 89 F2: FAILED ramp handoffs for THIS asset (dismissible).
            In-flight rows render inside the balance card since 2026-08-26
            (RampInflightInline); MoneyGram keeps its own banner below. */}
        <RampPendingBanner symbol={token.symbol} />
        {token.symbol === 'USDC' && <MoneyGramPendingBanner />}
        <ActivityCard
          walletAddress={wallet.address}
          bitcoinAddress={isBtc ? btc.bitcoinAddress : undefined}
          ethereumAddress={isEth ? eth.ethereumAddress : undefined}
          solanaAddress={isSol ? sol.solanaAddress : undefined}
          assetSymbol={token.symbol}
        />
      </Box>

      {/* Modals — rendered locally so the asset is preselected */}
      <SendModal open={sendOpen} onClose={() => setSendOpen(false)} initialSymbol={token.symbol} />

      <ReceiveModal open={receiveOpen} context="receive" onClose={() => setReceiveOpen(false)} />

      {/* USDC can also be bought with cash via MoneyGram (Stellar USDC deposit);
          other assets are Stripe + Coinbase only. */}
      <OnRampDialog
        open={buyOpen}
        amount="100"
        onClose={() => setBuyOpen(false)}
        walletAddress={(native ? nativeAddress : wallet.address) ?? undefined}
        asset={{ symbol: token.symbol, blockchain: native?.chain ?? 'stellar' }}
        providers={
          // Stripe offered LAST (Niko 2026-08-26) until the session integration
          // replaces the bare link (doc 88 B3).
          token.symbol === 'USDC' ? ['coinbase', 'moneygram', 'stripe'] : ['coinbase', 'stripe']
        }
      />

      {/* USDC offers Coinbase + MoneyGram (both cash out Stellar USDC); BTC/ETH/
          SOL/XLM are Coinbase only. The amount step caps to the spendable
          balance; the global resume handler completes the send on return. */}
      <OffRampDialog
        open={sellOpen}
        amount="100"
        onClose={() => setSellOpen(false)}
        walletAddress={(native ? nativeAddress : wallet.address) ?? undefined}
        asset={{ symbol: token.symbol, blockchain: native?.chain ?? 'stellar' }}
        providers={token.symbol === 'USDC' ? ['coinbase', 'moneygram'] : ['coinbase']}
        assetBalance={balance.toNumber()}
        assetPrice={Number(token.price) || undefined}
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
