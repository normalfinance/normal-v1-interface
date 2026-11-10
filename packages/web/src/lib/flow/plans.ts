import { CHAINS } from '@/lib/chains/registry';
import { assetNoun } from '@/lib/portfolio/asset-names';
import { PIVOT_CHAIN, CCTP_ETA_SECONDS } from '@/lib/cctp/config';

import type { FlowItem, FlowPlan, Translate, FlowPlace, FlowStepDef } from './types';

// ---------------------------------------------------------------------------
// The plan for every way money moves: the places it passes through and every
// step between them, in plain words, built from what the engine knows before
// anything is signed. The step ids are the contract with the engines, which
// report progress against them (see the engine files for who reports what).
//
// The words follow the app's rules: for people who don't know crypto, no
// jargon without a reason, and only what really happens.
// ---------------------------------------------------------------------------

/** A wallet or address that belongs to the person. */
export interface WalletRef {
  address?: string | null;
  /** Its explorer page. */
  href?: string;
  /** Overrides the default name: "Your Normal wallet", "Your Lobstr wallet". */
  label?: string;
}

type Coin = 'BTC' | 'ETH' | 'SOL';
type ChainOfCoin = 'bitcoin' | 'ethereum' | 'solana';

const CHAIN_OF: Record<Coin, ChainOfCoin> = { BTC: 'bitcoin', ETH: 'ethereum', SOL: 'solana' };

export const shortAddress = (address?: string | null): string | undefined =>
  address
    ? address.length > 12
      ? `${address.slice(0, 4)}…${address.slice(-4)}`
      : address
    : undefined;

const place = (p: FlowPlace): FlowItem => ({ kind: 'place', place: p });
const step = (s: FlowStepDef): FlowItem => ({ kind: 'step', step: s });

function walletPlace(
  id: string,
  label: string,
  wallet: WalletRef | undefined,
  asset: string,
  amount: string | undefined,
  network: FlowPlace['network']
): FlowPlace {
  return {
    id,
    label: wallet?.label ?? label,
    asset,
    amount,
    network,
    own: true,
    address: shortAddress(wallet?.address),
    href: wallet?.href,
  };
}

/** "Usually 10 to 60 minutes", from the chain's settlement window in the registry. */
function settlementText(t: Translate, coin: Coin): string {
  const { minMinutes, maxMinutes } = CHAINS[CHAIN_OF[coin]].settlement;
  return maxMinutes <= 5
    ? t('A few minutes')
    : t('Usually {{min}} to {{max}} minutes', { min: minMinutes, max: maxMinutes });
}

const chainName = (coin: Coin) => CHAINS[CHAIN_OF[coin]].name;

/** A coin inside a sentence. XLM keeps its ticker: "your Stellar" reads as the network. */
const coinWords = (symbol: string) => (symbol === 'XLM' ? 'XLM' : assetNoun(symbol));

// ---- shared steps -----------------------------------------------------------

const recordStep = (t: Translate): FlowStepDef => ({
  id: 'record',
  title: t('Save the plan'),
  detail: t(
    'Normal records this swap before anything moves, so it can be finished even if this page closes.'
  ),
  actor: t('Normal'),
  money: 'here',
  eta: t('A second'),
});

const balanceStep = (t: Translate, detail: string): FlowStepDef => ({
  id: 'balance',
  title: t('Balances updated'),
  detail,
  actor: t('Normal'),
  money: 'here',
});

const circlePlace = (t: Translate): FlowPlace => ({
  id: 'circle',
  label: t('Circle'),
  detail: t('The company behind digital dollars. It moves them from one network to another.'),
  asset: 'USDC',
  glyph: 'bridge',
});

const exchangePlace = (t: Translate, tool: string, asset: string): FlowPlace => ({
  id: 'exchange',
  label: tool,
  detail: t('The exchange service LI.FI picked for this swap.'),
  asset,
  glyph: 'exchange',
});

const basePlace = (t: Translate, wallet: WalletRef | undefined, amount?: string): FlowPlace => ({
  ...walletPlace(
    'base',
    t('Your {{chain}} address', { chain: PIVOT_CHAIN.name }),
    wallet,
    'USDC',
    amount,
    'base'
  ),
  detail: t('A fast network where the exchange happens. Only you control this address.'),
});

// ---- savings ----------------------------------------------------------------

export function depositPlan(p: {
  t: Translate;
  /** "100.00 USDC" */
  amount: string;
  fee: string;
  net: string;
  wallet?: WalletRef;
  /** "7.20% a year", when known. */
  rate?: string | null;
}): FlowPlan {
  const { t } = p;
  return {
    items: [
      place(walletPlace('wallet', t('Your Stellar wallet'), p.wallet, 'USDC', p.amount, 'stellar')),
      step({
        id: 'check',
        title: t('Check your balance'),
        detail: t('Normal makes sure the {{amount}} is in your wallet before you sign anything.', {
          amount: p.amount,
        }),
        actor: t('Normal'),
        money: 'here',
        eta: t('A second'),
      }),
      step({
        id: 'prepare',
        title: t('Prepare the deposit'),
        detail: t(
          'The savings vault writes the deposit, and Normal writes its {{fee}} fee as a second transaction right after it.',
          { fee: p.fee }
        ),
        actor: t('Normal'),
        money: 'here',
        eta: t('A few seconds'),
      }),
      step({
        id: 'sign-deposit',
        title: t('Approve the deposit'),
        detail: t('Your passkey signs the deposit. Nothing moves yet.'),
        actor: t('You'),
        money: 'here',
        eta: t('Signature 1 of 2'),
        signature: true,
      }),
      step({
        id: 'sign-fee',
        title: t('Approve the fee'),
        detail: t(
          'Your passkey signs the {{fee}} fee. Turning down either prompt cancels both, and nothing is charged.',
          { fee: p.fee }
        ),
        actor: t('You'),
        money: 'here',
        eta: t('Signature 2 of 2'),
        signature: true,
      }),
      step({
        id: 'submit',
        title: t('Send to Stellar'),
        detail: t(
          'Normal sends the deposit to the Stellar network and keeps the signed fee back until the deposit is in.'
        ),
        actor: t('Normal'),
        money: 'moving',
        eta: t('About 5 seconds'),
      }),
      place({
        id: 'vault',
        label: t('Normal Savings'),
        detail: t('The savings vault, lending to Blend’s USDC pool.'),
        asset: 'USDC',
        glyph: 'vault',
        amount: p.net,
      }),
      step({
        id: 'confirmed',
        title: t('Deposit confirmed'),
        detail: p.rate
          ? t('The vault received {{net}} and put it to work, earning {{rate}}.', {
              net: p.net,
              rate: p.rate,
            })
          : t('The vault received {{net}} and put it to work.', { net: p.net }),
        actor: t('Stellar network'),
        money: 'here',
      }),
      step({
        id: 'fee',
        title: t('Fee paid'),
        detail: t('The {{fee}} fee went to Normal.', { fee: p.fee }),
        actor: t('Normal'),
        money: 'here',
      }),
      step(balanceStep(t, t('Your savings and your wallet show the new amounts.'))),
    ],
  };
}

export function withdrawPlan(p: {
  t: Translate;
  amount: string;
  /** null when this withdrawal carries no earnings to charge. */
  commission: string | null;
  /** What lands in the wallet after the commission. */
  net: string;
  wallet?: WalletRef;
}): FlowPlan {
  const { t, commission } = p;
  return {
    items: [
      place({
        id: 'vault',
        label: t('Normal Savings'),
        detail: t('The savings vault, lending to Blend’s USDC pool.'),
        asset: 'USDC',
        glyph: 'vault',
        amount: p.amount,
      }),
      step({
        id: 'prepare',
        title: t('Prepare the withdrawal'),
        detail: commission
          ? t(
              'The savings vault writes the withdrawal, and Normal writes its {{commission}} commission on your earnings right after it.',
              { commission }
            )
          : t('The savings vault writes the withdrawal. There is no commission on this one.'),
        actor: t('Normal'),
        money: 'here',
        eta: t('A few seconds'),
      }),
      step({
        id: 'sign-withdraw',
        title: t('Approve the withdrawal'),
        detail: t('Your passkey signs it. Nothing moves yet.'),
        actor: t('You'),
        money: 'here',
        eta: commission ? t('Signature 1 of 2') : t('One signature'),
        signature: true,
      }),
      ...(commission
        ? [
            step({
              id: 'sign-fee',
              title: t('Approve the commission'),
              detail: t(
                'Your passkey signs the {{commission}} commission. Turning down either prompt cancels both.',
                { commission }
              ),
              actor: t('You'),
              money: 'here',
              eta: t('Signature 2 of 2'),
              signature: true,
            }),
          ]
        : []),
      step({
        id: 'submit',
        title: t('Send to Stellar'),
        detail: t('The vault takes your USDC out of Blend’s pool and sends it to your wallet.'),
        actor: t('Stellar network'),
        money: 'moving',
        eta: t('About 5 seconds'),
      }),
      place(walletPlace('wallet', t('Your Stellar wallet'), p.wallet, 'USDC', p.net, 'stellar')),
      step({
        id: 'confirmed',
        title: t('Withdrawal confirmed'),
        detail: t('{{amount}} arrived in your wallet.', { amount: p.amount }),
        actor: t('Stellar network'),
        money: 'here',
      }),
      ...(commission
        ? [
            step({
              id: 'fee',
              title: t('Commission paid'),
              detail: t('{{commission}} of your earnings went to Normal.', { commission }),
              actor: t('Normal'),
              money: 'here',
            }),
          ]
        : []),
      step(balanceStep(t, t('Your wallet and your savings show the new amounts.'))),
    ],
  };
}

// ---- swaps on Stellar ---------------------------------------------------------

export function stellarSwapPlan(p: {
  t: Translate;
  from: string;
  to: string;
  amountIn: string;
  amountOut: string;
  minOut: string;
  fee: string;
  /** One transaction with the fee inside it (one signature). */
  embedded: boolean;
  wallet?: WalletRef;
}): FlowPlan {
  const { t, embedded } = p;
  const fromNoun = coinWords(p.from);
  const toNoun = coinWords(p.to);
  return {
    items: [
      place(walletPlace('from', t('Your Stellar wallet'), p.wallet, p.from, p.amountIn, 'stellar')),
      step({
        id: 'prepare',
        title: t('Lock in the price'),
        detail: embedded
          ? t(
              'Soroswap builds the swap at the current price, with the Normal fee inside it. If you would get less than {{min}}, the swap does not happen.',
              { min: p.minOut }
            )
          : t(
              'Soroswap builds the swap at the current price, and Normal writes its {{fee}} fee right after it. If you would get less than {{min}}, the swap does not happen.',
              { fee: p.fee, min: p.minOut }
            ),
        actor: t('Soroswap'),
        money: 'here',
        eta: t('A few seconds'),
      }),
      step({
        id: 'sign-swap',
        title: t('Approve the swap'),
        detail: t('Your passkey signs it. Nothing moves yet.'),
        actor: t('You'),
        money: 'here',
        eta: embedded ? t('One signature') : t('Signature 1 of 2'),
        signature: true,
      }),
      ...(embedded
        ? []
        : [
            step({
              id: 'sign-fee',
              title: t('Approve the fee'),
              detail: t(
                'Your passkey signs the {{fee}} fee. Turning down either prompt cancels both, and nothing is charged.',
                { fee: p.fee }
              ),
              actor: t('You'),
              money: 'here',
              eta: t('Signature 2 of 2'),
              signature: true,
            }),
          ]),
      step({
        id: 'submit',
        title: t('Swap on Stellar'),
        detail: t(
          'Stellar’s exchange swaps your {{from}} for {{to}} in one transaction. It happens in full or not at all.',
          { from: fromNoun, to: toNoun }
        ),
        actor: t('Stellar network'),
        money: 'moving',
        eta: t('About 5 seconds'),
      }),
      place(walletPlace('to', t('Your Stellar wallet'), p.wallet, p.to, p.amountOut, 'stellar')),
      step({
        id: 'confirmed',
        title: t('Swap confirmed'),
        detail: t('It went through in one transaction, straight into your wallet.'),
        actor: t('Stellar network'),
        money: 'here',
      }),
      ...(embedded
        ? []
        : [
            step({
              id: 'fee',
              title: t('Fee paid'),
              detail: t('The {{fee}} fee went to Normal.', { fee: p.fee }),
              actor: t('Normal'),
              money: 'here',
            }),
          ]),
      step(balanceStep(t, t('Your wallet shows the new amounts.'))),
    ],
  };
}

// ---- cross-chain swaps (LI.FI) ----------------------------------------------

export function crossChainSwapPlan(p: {
  t: Translate;
  from: Coin;
  to: Coin;
  amountIn: string;
  amountOut: string;
  tool: string;
  fromWallet?: WalletRef;
  toWallet?: WalletRef;
  /** The quote's own estimate for the whole swap, in minutes. */
  etaMinutes?: number | null;
}): FlowPlan {
  const { t, tool } = p;
  const fromChain = chainName(p.from);
  const toChain = chainName(p.to);
  return {
    items: [
      place(
        walletPlace(
          'from',
          t('Your {{chain}} wallet', { chain: fromChain }),
          p.fromWallet,
          p.from,
          p.amountIn,
          CHAIN_OF[p.from]
        )
      ),
      step({
        id: 'price',
        title: t('Check the price'),
        detail: t(
          'Normal makes sure the price is still current. If it got worse by more than 1%, you are asked again before anything happens.'
        ),
        actor: t('Normal'),
        money: 'here',
        eta: t('A second'),
      }),
      step({
        id: 'sign',
        title: t('Approve with your passkey'),
        detail: t(
          'Your passkey signs one {{chain}} transaction to {{tool}}. Nothing moves until you do.',
          {
            chain: fromChain,
            tool,
          }
        ),
        actor: t('You'),
        money: 'here',
        eta: t('One signature'),
        signature: true,
      }),
      step({
        id: 'send',
        title: t('Send to {{tool}}', { tool }),
        detail: t('Your {{coin}} leaves your wallet for {{tool}}.', {
          coin: assetNoun(p.from),
          tool,
        }),
        actor: t('{{chain}} network', { chain: fromChain }),
        money: 'moving',
      }),
      place(exchangePlace(t, tool, p.from)),
      step({
        id: 'source-confirm',
        title: t('{{chain}} confirms the payment', { chain: fromChain }),
        detail: t('{{tool}} waits until the {{chain}} network has confirmed it.', {
          tool,
          chain: fromChain,
        }),
        actor: t('{{chain}} network', { chain: fromChain }),
        money: 'here',
      }),
      step({
        id: 'bridge-send',
        title: t('{{tool}} sends your {{coin}}', { tool, coin: assetNoun(p.to) }),
        detail: t('{{tool}} exchanges it and sends {{coin}} to your {{chain}} wallet.', {
          tool,
          coin: assetNoun(p.to),
          chain: toChain,
        }),
        actor: tool,
        money: 'moving',
        eta: p.etaMinutes ? t('About {{n}} min in all', { n: p.etaMinutes }) : undefined,
      }),
      place(
        walletPlace(
          'to',
          t('Your {{chain}} wallet', { chain: toChain }),
          p.toWallet,
          p.to,
          p.amountOut,
          CHAIN_OF[p.to]
        )
      ),
      step({
        id: 'arrived',
        title: t('{{coin}} arrived', { coin: assetNoun(p.to) }),
        detail: t('It is in your {{chain}} wallet.', { chain: toChain }),
        actor: t('{{chain}} network', { chain: toChain }),
        money: 'here',
      }),
      step(balanceStep(t, t('Your wallets show the new amounts.'))),
    ],
  };
}

// ---- swaps over Circle's bridge (CCTP) --------------------------------------

const AUTO = (t: Translate) => t('Auto-finish');

export function cctpOutboundPlan(p: {
  t: Translate;
  to: Coin;
  amountUsdc: string;
  amountOut: string;
  tool: string;
  stellarWallet?: WalletRef;
  baseWallet?: WalletRef;
  destWallet?: WalletRef;
  /** The Base leg is signed by auto-finish: no prompt there. */
  autopilot: boolean;
  /** The USDC first moves from the person's external Stellar wallet. */
  funding?: { walletName: string; wallet?: WalletRef } | null;
}): FlowPlan {
  const { t, tool, autopilot } = p;
  const destChain = chainName(p.to);
  const coin = assetNoun(p.to);
  return {
    items: [
      ...(p.funding
        ? [
            place(
              walletPlace(
                'external',
                t('Your {{wallet}} wallet', { wallet: p.funding.walletName }),
                p.funding.wallet,
                'USDC',
                p.amountUsdc,
                'stellar'
              )
            ),
            step({
              id: 'funding',
              title: t('Move it to your Normal wallet'),
              detail: t(
                'Approve one transfer in {{wallet}}. The swap runs from your Normal wallet, which can sign on every network.',
                { wallet: p.funding.walletName }
              ),
              actor: t('You'),
              money: 'moving',
              signature: true,
            }),
          ]
        : []),
      place(
        walletPlace(
          'stellar',
          t('Your Stellar wallet'),
          p.stellarWallet,
          'USDC',
          p.amountUsdc,
          'stellar'
        )
      ),
      step(recordStep(t)),
      step({
        id: 'prepare',
        title: t('Prepare the transfer'),
        detail: t(
          'Normal checks the transfer with the Stellar network before you are asked to sign.'
        ),
        actor: t('Normal'),
        money: 'here',
        eta: t('A few seconds'),
      }),
      step({
        id: 'approve',
        title: t('Allow Circle to collect it'),
        detail: t(
          'A one-time permission for Circle’s contract to take the USDC you send. Later swaps skip this.'
        ),
        actor: t('You'),
        money: 'here',
        optional: t('First time only'),
        signature: true,
      }),
      step({
        id: 'burn-sign',
        title: t('Approve the transfer'),
        detail: t('Your passkey signs the transfer to Circle.'),
        actor: t('You'),
        money: 'here',
        signature: true,
      }),
      step({
        id: 'burn',
        title: t('Hand it to Circle'),
        detail: t(
          'Circle takes {{amount}} off Stellar. The same amount can only be created at your own {{chain}} address.',
          { amount: p.amountUsdc, chain: PIVOT_CHAIN.name }
        ),
        actor: t('Stellar network'),
        money: 'moving',
        eta: t('Seconds'),
      }),
      place(circlePlace(t)),
      step({
        id: 'attest',
        title: t('Circle confirms'),
        detail: t('Circle checks the transfer on Stellar and signs a release for {{chain}}.', {
          chain: PIVOT_CHAIN.name,
        }),
        actor: t('Circle'),
        money: 'here',
        eta: t('About {{n}} seconds', { n: CCTP_ETA_SECONDS.fromStellar }),
      }),
      step({
        id: 'mint',
        title: t('Created on {{chain}}', { chain: PIVOT_CHAIN.name }),
        detail: t(
          'Normal delivers Circle’s release to {{chain}}, which creates {{amount}} at your address. Normal pays this network fee.',
          { chain: PIVOT_CHAIN.name, amount: p.amountUsdc }
        ),
        actor: t('Normal'),
        money: 'moving',
        eta: t('Seconds'),
      }),
      place(basePlace(t, p.baseWallet, p.amountUsdc)),
      step({
        id: 'gas',
        title: t('Cover the exchange fee'),
        detail: autopilot
          ? t('Normal takes care of the network fee for the next step.')
          : t(
              'Normal sends a few cents of ETH to your {{chain}} address to pay the network fee for the exchange.',
              { chain: PIVOT_CHAIN.name }
            ),
        actor: t('Normal'),
        money: 'here',
      }),
      step({
        id: 'pivot-approve',
        title: t('Allow the exchange'),
        detail: t(
          'A one-time permission for the exchange to take your USDC. Later swaps skip this.'
        ),
        actor: autopilot ? AUTO(t) : t('You'),
        money: 'here',
        optional: t('First time only'),
        signature: !autopilot,
      }),
      step({
        id: 'pivot-sign',
        title: t('Approve the exchange'),
        detail: autopilot
          ? t('Signed for you by auto-finish, the way you set it up. No prompt.')
          : t('Your passkey signs the exchange of USDC for {{coin}}.', { coin }),
        actor: autopilot ? AUTO(t) : t('You'),
        money: 'here',
        signature: !autopilot,
      }),
      step({
        id: 'pivot-send',
        title: t('Send to {{tool}}', { tool }),
        detail: t('Your USDC leaves your {{chain}} address for {{tool}}.', {
          chain: PIVOT_CHAIN.name,
          tool,
        }),
        actor: t('{{chain}} network', { chain: PIVOT_CHAIN.name }),
        money: 'moving',
        eta: t('Seconds'),
      }),
      place(exchangePlace(t, tool, 'USDC')),
      step({
        id: 'bridge-receive',
        title: t('{{tool}} receives it', { tool }),
        detail: t('{{tool}} waits until {{chain}} has confirmed the payment.', {
          tool,
          chain: PIVOT_CHAIN.name,
        }),
        actor: tool,
        money: 'here',
      }),
      step({
        id: 'bridge-send',
        title: t('{{tool}} sends your {{coin}}', { tool, coin }),
        detail: t('{{tool}} exchanges the USDC and sends {{coin}} to your {{chain}} wallet.', {
          tool,
          coin,
          chain: destChain,
        }),
        actor: tool,
        money: 'moving',
        eta: settlementText(t, p.to),
      }),
      place(
        walletPlace(
          'dest',
          t('Your {{chain}} wallet', { chain: destChain }),
          p.destWallet,
          p.to,
          p.amountOut,
          CHAIN_OF[p.to]
        )
      ),
      step({
        id: 'arrived',
        title: t('{{coin}} arrived', { coin }),
        detail: t('It is in your {{chain}} wallet.', { chain: destChain }),
        actor: t('{{chain}} network', { chain: destChain }),
        money: 'here',
      }),
      step(balanceStep(t, t('Your wallets show the new amounts.'))),
    ],
  };
}

export function cctpInboundPlan(p: {
  t: Translate;
  from: Coin;
  amountIn: string;
  usdcOut: string;
  tool: string;
  srcWallet?: WalletRef;
  baseWallet?: WalletRef;
  stellarWallet?: WalletRef;
  autopilot: boolean;
}): FlowPlan {
  const { t, tool, autopilot } = p;
  const srcChain = chainName(p.from);
  const finalityMinutes = Math.round(CCTP_ETA_SECONDS.fromEvm / 60 / 5) * 5;
  return {
    items: [
      place(
        walletPlace(
          'src',
          t('Your {{chain}} wallet', { chain: srcChain }),
          p.srcWallet,
          p.from,
          p.amountIn,
          CHAIN_OF[p.from]
        )
      ),
      step(recordStep(t)),
      step({
        id: 'sign',
        title: t('Approve with your passkey'),
        detail: t(
          'Your passkey signs one {{chain}} transaction to {{tool}}. Nothing moves until you do.',
          {
            chain: srcChain,
            tool,
          }
        ),
        actor: t('You'),
        money: 'here',
        signature: true,
      }),
      step({
        id: 'send',
        title: t('Send to {{tool}}', { tool }),
        detail: t('Your {{coin}} leaves your wallet for {{tool}}.', {
          coin: assetNoun(p.from),
          tool,
        }),
        actor: t('{{chain}} network', { chain: srcChain }),
        money: 'moving',
      }),
      place(exchangePlace(t, tool, p.from)),
      step({
        id: 'source-confirm',
        title: t('{{chain}} confirms the payment', { chain: srcChain }),
        detail: t('{{tool}} waits until the {{chain}} network has confirmed it.', {
          tool,
          chain: srcChain,
        }),
        actor: t('{{chain}} network', { chain: srcChain }),
        money: 'here',
      }),
      step({
        id: 'bridge-send',
        title: t('{{tool}} sends USDC to {{chain}}', { tool, chain: PIVOT_CHAIN.name }),
        detail: t(
          '{{tool}} exchanges your {{coin}} for USDC and sends it to your {{chain}} address.',
          {
            tool,
            coin: assetNoun(p.from),
            chain: PIVOT_CHAIN.name,
          }
        ),
        actor: tool,
        money: 'moving',
        eta: settlementText(t, p.from),
      }),
      place(basePlace(t, p.baseWallet, p.usdcOut)),
      step({
        id: 'arrived-base',
        title: t('USDC arrived on {{chain}}', { chain: PIVOT_CHAIN.name }),
        detail: t('Normal sees the USDC at your {{chain}} address.', { chain: PIVOT_CHAIN.name }),
        actor: t('Normal'),
        money: 'here',
      }),
      step({
        id: 'gas',
        title: t('Cover the network fee'),
        detail: autopilot
          ? t('Normal takes care of the network fee for the next step.')
          : t(
              'Normal sends a few cents of ETH to your {{chain}} address to pay the network fee for the transfer.',
              { chain: PIVOT_CHAIN.name }
            ),
        actor: t('Normal'),
        money: 'here',
      }),
      step({
        id: 'burn-approve',
        title: t('Allow Circle to collect it'),
        detail: t(
          'A one-time permission for Circle’s contract to take the USDC you send. Later swaps skip this.'
        ),
        actor: autopilot ? AUTO(t) : t('You'),
        money: 'here',
        optional: t('First time only'),
        signature: !autopilot,
      }),
      step({
        id: 'burn-sign',
        title: t('Approve the transfer'),
        detail: autopilot
          ? t('Signed for you by auto-finish, the way you set it up. No prompt.')
          : t('Your passkey signs the transfer to Circle.'),
        actor: autopilot ? AUTO(t) : t('You'),
        money: 'here',
        signature: !autopilot,
      }),
      step({
        id: 'burn',
        title: t('Hand it to Circle'),
        detail: t(
          'Circle takes the USDC off {{chain}}. The same amount can only be created in your own Stellar wallet.',
          { chain: PIVOT_CHAIN.name }
        ),
        actor: t('{{chain}} network', { chain: PIVOT_CHAIN.name }),
        money: 'moving',
        eta: t('Seconds'),
      }),
      place(circlePlace(t)),
      step({
        id: 'attest',
        title: t('Circle confirms'),
        detail: t(
          'Circle waits until the transfer on {{chain}} can never be undone, then signs a release for Stellar. You can close this page now: Normal finishes the rest.',
          { chain: PIVOT_CHAIN.name }
        ),
        actor: t('Circle'),
        money: 'here',
        eta: t('About {{n}} minutes', { n: finalityMinutes }),
      }),
      step({
        id: 'mint',
        title: t('Created on Stellar'),
        detail: t(
          'Normal delivers Circle’s release to Stellar, which creates the USDC in your wallet. Normal pays this network fee.'
        ),
        actor: t('Normal'),
        money: 'moving',
        eta: t('Seconds'),
      }),
      place(
        walletPlace(
          'stellar',
          t('Your Stellar wallet'),
          p.stellarWallet,
          'USDC',
          p.usdcOut,
          'stellar'
        )
      ),
      step({
        id: 'arrived',
        title: t('USDC arrived'),
        detail: t('It is in your Stellar wallet.'),
        actor: t('Stellar network'),
        money: 'here',
      }),
      step(balanceStep(t, t('Your wallets show the new amounts.'))),
    ],
  };
}

/** Bringing the USDC back to Stellar after the exchange on Base failed. */
export function cctpRefundPlan(p: {
  t: Translate;
  amountUsdc?: string;
  baseWallet?: WalletRef;
  stellarWallet?: WalletRef;
}): FlowPlan {
  const { t } = p;
  const finalityMinutes = Math.round(CCTP_ETA_SECONDS.fromEvm / 60 / 5) * 5;
  return {
    items: [
      place(basePlace(t, p.baseWallet, p.amountUsdc)),
      step({
        id: 'refund-gas',
        title: t('Cover the network fee'),
        detail: t('Normal sends a few cents of ETH to your {{chain}} address for the return.', {
          chain: PIVOT_CHAIN.name,
        }),
        actor: t('Normal'),
        money: 'here',
      }),
      step({
        id: 'refund-sign',
        title: t('Approve the return'),
        detail: t('Your passkey signs the transfer back to Circle.'),
        actor: t('You'),
        money: 'here',
        signature: true,
      }),
      step({
        id: 'refund-burn',
        title: t('Hand it back to Circle'),
        detail: t(
          'Circle takes the USDC off {{chain}}. It can only be created again in your own Stellar wallet.',
          { chain: PIVOT_CHAIN.name }
        ),
        actor: t('{{chain}} network', { chain: PIVOT_CHAIN.name }),
        money: 'moving',
        eta: t('Seconds'),
      }),
      place(circlePlace(t)),
      step({
        id: 'refund-attest',
        title: t('Circle confirms'),
        detail: t(
          'Circle waits until the transfer on {{chain}} can never be undone. Normal finishes the rest, so you can close this page.',
          { chain: PIVOT_CHAIN.name }
        ),
        actor: t('Circle'),
        money: 'here',
        eta: t('About {{n}} minutes', { n: finalityMinutes }),
      }),
      step({
        id: 'refund-mint',
        title: t('Created on Stellar'),
        detail: t('Normal delivers Circle’s release to Stellar. Normal pays this network fee.'),
        actor: t('Normal'),
        money: 'moving',
      }),
      place(
        walletPlace(
          'stellar',
          t('Your Stellar wallet'),
          p.stellarWallet,
          'USDC',
          p.amountUsdc,
          'stellar'
        )
      ),
      step({
        id: 'refund-arrived',
        title: t('Your USDC is back'),
        detail: t('It is in your Stellar wallet.'),
        actor: t('Stellar network'),
        money: 'here',
      }),
    ],
  };
}

// ---- crypto index (2026-11-09) ----------------------------------------------
// One purchase of several coins, with one signature: the person signs the
// Stellar transfer to Circle; Circle releases the digital dollars on Base;
// auto-finish buys each coin there and the exchanges deliver them. Same words
// as the single-coin Circle swap up to Base, then one step per coin.

export interface IndexPlanLeg {
  symbol: Coin;
  /** This coin's share: "60.00 USDC". */
  amountUsdc: string;
  /** "60%". */
  weight: string;
  /** "≈ 0.00071 BTC", when a price is known. */
  amountOut?: string;
}

/** The step id for buying one coin of an index: "buy-btc". */
export const indexBuyStepId = (symbol: string) => `buy-${symbol.toLowerCase()}`;

const listWords = (t: Translate, words: string[]) =>
  words.length <= 1
    ? (words[0] ?? '')
    : t('{{head}} and {{last}}', {
        head: words.slice(0, -1).join(', '),
        last: words[words.length - 1],
      });

export function indexPurchasePlan(p: {
  t: Translate;
  amountUsdc: string;
  legs: IndexPlanLeg[];
  stellarWallet?: WalletRef;
  baseWallet?: WalletRef;
}): FlowPlan {
  const { t } = p;
  const coins = listWords(
    t,
    p.legs.map((l) => assetNoun(l.symbol))
  );
  const chains = listWords(
    t,
    p.legs.map((l) => chainName(l.symbol))
  );
  // The slowest network sets how long delivery can take.
  const slowest = p.legs.reduce<Coin | null>(
    (worst, l) =>
      !worst ||
      CHAINS[CHAIN_OF[l.symbol]].settlement.maxMinutes >
        CHAINS[CHAIN_OF[worst]].settlement.maxMinutes
        ? l.symbol
        : worst,
    null
  );

  return {
    items: [
      place(
        walletPlace(
          'stellar',
          t('Your Stellar wallet'),
          p.stellarWallet,
          'USDC',
          p.amountUsdc,
          'stellar'
        )
      ),
      step({
        id: 'record',
        title: t('Save the plan'),
        detail: t(
          'Normal records this purchase and each coin’s share before anything moves, so it can be finished even if this page closes.'
        ),
        actor: t('Normal'),
        money: 'here',
        eta: t('A second'),
      }),
      step({
        id: 'prepare',
        title: t('Prepare the transfer'),
        detail: t(
          'Normal checks the transfer with the Stellar network before you are asked to sign.'
        ),
        actor: t('Normal'),
        money: 'here',
        eta: t('A few seconds'),
      }),
      step({
        id: 'approve',
        title: t('Allow Circle to collect it'),
        detail: t(
          'A one-time permission for Circle’s contract to take the USDC you send. Later purchases skip this.'
        ),
        actor: t('You'),
        money: 'here',
        optional: t('First time only'),
        signature: true,
      }),
      step({
        id: 'burn-sign',
        title: t('Approve the purchase'),
        detail: t(
          'Your passkey signs once. Everything after this is done for you, by auto-finish.'
        ),
        actor: t('You'),
        money: 'here',
        signature: true,
      }),
      step({
        id: 'burn',
        title: t('Hand it to Circle'),
        detail: t(
          'Circle takes {{amount}} off Stellar. The same amount can only be created at your own {{chain}} address.',
          { amount: p.amountUsdc, chain: PIVOT_CHAIN.name }
        ),
        actor: t('Stellar network'),
        money: 'moving',
        eta: t('Seconds'),
      }),
      place(circlePlace(t)),
      step({
        id: 'attest',
        title: t('Circle confirms'),
        detail: t('Circle checks the transfer on Stellar and signs a release for {{chain}}.', {
          chain: PIVOT_CHAIN.name,
        }),
        actor: t('Circle'),
        money: 'here',
        eta: t('About {{n}} seconds', { n: CCTP_ETA_SECONDS.fromStellar }),
      }),
      step({
        id: 'mint',
        title: t('Created on {{chain}}', { chain: PIVOT_CHAIN.name }),
        detail: t(
          'Normal delivers Circle’s release to {{chain}}, which creates {{amount}} at your address. Normal pays this network fee.',
          { chain: PIVOT_CHAIN.name, amount: p.amountUsdc }
        ),
        actor: t('Normal'),
        money: 'moving',
        eta: t('Seconds'),
      }),
      place(basePlace(t, p.baseWallet, p.amountUsdc)),
      step({
        id: 'gas',
        title: t('Cover the exchange fees'),
        detail: t('Normal takes care of the network fees for the exchanges.'),
        actor: t('Normal'),
        money: 'here',
      }),
      ...p.legs.map((leg) =>
        step({
          id: indexBuyStepId(leg.symbol),
          title: t('Buy {{coin}}', { coin: assetNoun(leg.symbol) }),
          detail: t(
            '{{amount}} ({{weight}}) is exchanged for {{coin}} and sent to your {{chain}} wallet. Signed for you by auto-finish, the way you set it up.',
            {
              amount: leg.amountUsdc,
              weight: leg.weight,
              coin: assetNoun(leg.symbol),
              chain: chainName(leg.symbol),
            }
          ),
          actor: AUTO(t),
          money: 'moving',
          eta: t('Seconds'),
        })
      ),
      step({
        id: 'deliver',
        title: t('The exchanges deliver your coins'),
        detail: t('Each exchange sends its coin to your own wallet on that coin’s network.'),
        actor: t('The exchanges'),
        money: 'moving',
        eta: slowest ? settlementText(t, slowest) : undefined,
      }),
      place({
        id: 'wallets',
        label: t('Your {{chains}} wallets', { chains }),
        detail: t('Each coin in its own wallet, only you control them.'),
        glyph: 'wallets',
        // The coins themselves stand for this place (Niko 2026-11-09: the
        // index screens needed their coins, not a grey wallet icon).
        assets: p.legs.map((l) => l.symbol),
        own: true,
      }),
      step({
        id: 'arrived',
        title: t('Your coins arrived'),
        detail: t('{{coins}} are in your wallets.', { coins }),
        actor: t('The networks'),
        money: 'here',
      }),
      step(balanceStep(t, t('Your wallets show the new amounts.'))),
    ],
  };
}

// ---- a journey that is sent back --------------------------------------------

/** The step ids `refundedPlan` adds, for the engines to report into. */
export const REFUND_STEP = { send: 'refund-send', arrived: 'refund-arrived' } as const;

/**
 * The exchange could not complete the swap and sends the money back (Niko
 * 2026-11-09: "if a swap fails and goes into a refund, the steps should
 * update"). Everything from `fromStepId` on (the exchange's delivery and what
 * came after it) is replaced by what happens instead: the exchange sends it
 * back, to the wallet it came from, and it is there again. Steps before it keep
 * their ids, so their ticks and links stay. Calling it again changes nothing,
 * and a plan without that step or without a first wallet is returned as is.
 */
export function refundedPlan(
  plan: FlowPlan,
  opts: { t: Translate; fromStepId: string; tool: string; coin: string }
): FlowPlan {
  const { t, tool } = opts;
  if (plan.items.some((i) => i.kind === 'step' && i.step.id === REFUND_STEP.send)) return plan;
  const cut = plan.items.findIndex((i) => i.kind === 'step' && i.step.id === opts.fromStepId);
  const first = plan.items.find((i) => i.kind === 'place');
  if (cut < 0 || !first || first.kind !== 'place') return plan;
  const coin = assetNoun(opts.coin);
  return {
    items: [
      ...plan.items.slice(0, cut),
      step({
        id: REFUND_STEP.send,
        title: t('{{tool}} sends it back', { tool }),
        detail: t(
          '{{tool}} could not complete the swap and returns your {{coin}} to the wallet it came from.',
          { tool, coin }
        ),
        actor: tool,
        money: 'moving',
      }),
      place({ ...first.place, id: `${first.place.id}-back`, amount: undefined, back: true }),
      step({
        id: REFUND_STEP.arrived,
        title: t('Back in your wallet'),
        detail: t(
          'Your {{coin}} is in your wallet again, less any network fees. Nothing was lost.',
          {
            coin,
          }
        ),
        // The wallet's own network, from the registry (never read from its
        // label: a connected wallet is called by its own name, "Lobstr").
        actor:
          first.place.network && first.place.network in CHAINS
            ? t('{{chain}} network', {
                chain: CHAINS[first.place.network as keyof typeof CHAINS].name,
              })
            : t('The network'),
        money: 'here',
      }),
    ],
  };
}
