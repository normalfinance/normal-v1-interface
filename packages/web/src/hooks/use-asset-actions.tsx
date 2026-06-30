'use client';

import type { Token } from '@normalfinance/types';
import type { TurnkeyChain } from '@/lib/turnkey/add-account';

import { useState } from 'react';
import { BigNumber } from 'bignumber.js';
import { ModalType } from '@normalfinance/types';
import { usePortfolio } from '@/hooks/use-portfolio';
import { assetDisplay } from '@/lib/portfolio/display';
import { useTurnkeyWallet } from '@/hooks/use-turnkey-wallet';
import { useSupabaseAuth } from '@/providers/SupabaseAuthProvider';
import { useAppStore, usePersistStore } from '@normalfinance/state';

import PickToken from '@/components/_common/pick-token';
import OnRampDialog from '@/components/_common/onramp-dialog';
import ReceiveModal from '@/components/_common/receive-modal';
import OffRampDialog from '@/components/_common/offramp-dialog';
import { ChainSetupDialog } from '@/components/_common/chain-setup-dialog';
import { ChainReceiveModal } from '@/components/_common/chain-receive-modal';
import { BitcoinReceiveModal } from '@/components/_common/bitcoin-receive-modal';

// ---------------------------------------------------------------------------
// Shared Buy / Sell / Send / Receive action flows. Each action opens the asset
// picker (PickToken) first, then routes the chosen asset into the right flow —
// on/off-ramp dialog, or the correct per-chain receive modal — provisioning a
// native chain lazily if its address doesn't exist yet (mirrors the asset
// detail page). Used by the hero portfolio card AND the account drawer so the
// two can never drift. Send keeps its own global modal (it already has a picker).
// ---------------------------------------------------------------------------

type Blockchain = 'stellar' | 'bitcoin' | 'ethereum' | 'solana';
interface AssetMeta {
  symbol: string;
  blockchain: Blockchain;
  name: string;
  icon: string;
  decimals: number;
  contract: string;
}

// Assets offered in the Buy / Receive pickers (Sell filters to held only).
const SUPPORTED: AssetMeta[] = [
  { symbol: 'USDC', blockchain: 'stellar', name: 'USD Coin', icon: assetDisplay('USDC').icon, decimals: 7, contract: '__usdc__' },
  { symbol: 'XLM', blockchain: 'stellar', name: 'Stellar Lumens', icon: assetDisplay('XLM').icon, decimals: 7, contract: '__xlm__' },
  { symbol: 'BTC', blockchain: 'bitcoin', name: 'Bitcoin', icon: assetDisplay('BTC').icon, decimals: 8, contract: '__btc__' },
  { symbol: 'ETH', blockchain: 'ethereum', name: 'Ethereum', icon: assetDisplay('ETH').icon, decimals: 18, contract: '__eth__' },
  { symbol: 'SOL', blockchain: 'solana', name: 'Solana', icon: assetDisplay('SOL').icon, decimals: 9, contract: '__sol__' },
];

export type AssetActionKey = 'buy' | 'sell' | 'send' | 'receive';

export function useAssetActions(): {
  startAction: (action: AssetActionKey) => void;
  flowModals: React.ReactNode;
} {
  const { user } = useSupabaseAuth();
  const isAuthed = !!user;
  const portfolio = usePortfolio(isAuthed);
  const persist = usePersistStore();
  const { setModalView } = useAppStore();
  const { addresses, refetch: refetchAddresses } = useTurnkeyWallet(isAuthed);

  const [picker, setPicker] = useState<'buy' | 'sell' | 'receive' | null>(null);
  const [flow, setFlow] = useState<{ action: 'buy' | 'sell' | 'receive'; symbol: string } | null>(null);
  const [setup, setSetup] = useState<{ chain: TurnkeyChain; action: 'buy' | 'sell' | 'receive'; symbol: string } | null>(null);

  const addressFor = (bc: Blockchain): string | null => {
    if (bc === 'stellar') return persist.wallet.address || null;
    if (bc === 'bitcoin') return addresses?.bitcoinAddress ?? null;
    if (bc === 'ethereum') return addresses?.ethereumAddress ?? null;
    return addresses?.solanaAddress ?? null;
  };

  // Token objects for the picker: real store tokens for Stellar (USDC/XLM),
  // synthesized from portfolio data for the native chains.
  const pickerTokens: Token[] = SUPPORTED.map((m) => {
    const stored = m.blockchain === 'stellar'
      ? persist.tokenState.tokens.find((tk) => tk.symbol === m.symbol)
      : undefined;
    if (stored) return stored;
    const a = portfolio.getAsset(m.symbol);
    return {
      symbol: m.symbol,
      contract: m.contract,
      name: m.name,
      issuer: '',
      org: '',
      domain: '',
      icon: m.icon,
      decimals: m.decimals,
      featured: false,
      balance: a?.balance ?? '0',
      price: a?.price ?? '0',
      percentageChange: a?.change24h ?? 0,
    } as Token;
  });
  const sellTokens = pickerTokens.filter((tk) => BigNumber(tk.balance).gt(0));

  // Open the chosen asset's flow — provisioning the native chain first if its
  // address doesn't exist yet (lazy, like the asset detail page).
  const startFlow = (action: 'buy' | 'sell' | 'receive', symbol: string) => {
    const m = SUPPORTED.find((x) => x.symbol === symbol);
    if (!m) return;
    if (m.blockchain === 'stellar') {
      if (!persist.wallet.address) {
        window.dispatchEvent(new CustomEvent('nf:open-wallet-setup'));
        return;
      }
    } else if (!addressFor(m.blockchain)) {
      setSetup({ chain: m.blockchain as TurnkeyChain, action, symbol });
      return;
    }
    setFlow({ action, symbol });
  };

  const startAction = (action: AssetActionKey) => {
    if (!isAuthed) {
      window.dispatchEvent(new CustomEvent('nf:open-login'));
      return;
    }
    if (action === 'send') {
      setModalView(ModalType.SEND_CRYPTO, true);
      return;
    }
    setPicker(action);
  };

  const handleSetupSuccess = async () => {
    await refetchAddresses();
    const s = setup;
    setSetup(null);
    if (s) setFlow({ action: s.action, symbol: s.symbol });
  };

  const flowMeta = flow ? SUPPORTED.find((m) => m.symbol === flow.symbol) ?? null : null;
  const flowBlockchain: Blockchain = flowMeta?.blockchain ?? 'stellar';
  const flowAddress = flowMeta ? addressFor(flowMeta.blockchain) : null;
  const flowBalanceNum = flow ? Number(portfolio.getAsset(flow.symbol)?.balance ?? 0) : 0;
  const isReceive = flow?.action === 'receive';

  const flowModals = (
    <>
      {/* Asset picker → routes Buy / Sell / Receive into the chosen asset's flow */}
      <PickToken
        open={picker !== null}
        onClose={() => setPicker(null)}
        buttonSource={picker ?? undefined}
        tokens={picker === 'sell' ? sellTokens : pickerTokens}
        onTokenSelect={(token) => {
          const action = picker;
          setPicker(null);
          if (action) startFlow(action, token.symbol);
        }}
      />

      <OnRampDialog
        open={flow?.action === 'buy'}
        amount="100"
        onClose={() => setFlow(null)}
        walletAddress={flowAddress ?? undefined}
        asset={{ symbol: flow?.symbol ?? 'USDC', blockchain: flowBlockchain }}
        providers={flow?.symbol === 'USDC' ? ['stripe', 'coinbase', 'moneygram'] : ['stripe', 'coinbase']}
      />

      <OffRampDialog
        open={flow?.action === 'sell'}
        amount="100"
        onClose={() => setFlow(null)}
        walletAddress={flowAddress ?? undefined}
        asset={{ symbol: flow?.symbol ?? 'USDC', blockchain: flowBlockchain }}
        providers={flow?.symbol === 'USDC' ? ['coinbase', 'moneygram'] : ['coinbase']}
        assetBalance={flowBalanceNum}
      />

      <ReceiveModal
        open={isReceive && flowBlockchain === 'stellar'}
        context="receive"
        onClose={() => setFlow(null)}
      />

      <BitcoinReceiveModal
        open={isReceive && flowBlockchain === 'bitcoin'}
        address={addressFor('bitcoin')}
        onClose={() => setFlow(null)}
      />

      <ChainReceiveModal
        open={isReceive && (flowBlockchain === 'ethereum' || flowBlockchain === 'solana')}
        onClose={() => setFlow(null)}
        address={flowAddress}
        chainLabel={flowMeta?.name ?? ''}
        symbol={flow?.symbol ?? ''}
        warning={`Only send ${flow?.symbol ?? ''} on the ${flowMeta?.name ?? ''} network to this address!`}
      />

      {user && setup && (
        <ChainSetupDialog
          open
          onClose={() => setSetup(null)}
          chain={setup.chain}
          userId={user.id}
          userEmail={user.email}
          onSuccess={handleSetupSuccess}
        />
      )}
    </>
  );

  return { startAction, flowModals };
}
