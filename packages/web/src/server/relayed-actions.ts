import type { RelayedStep, RelayedAction } from '@prisma/client';

import { prisma } from '@/lib/prisma';
import { STELLAR_CCTP } from '@/lib/cctp/config';
import { SAVINGS_DEPOSIT_FEE_BPS } from '@/utils/normal-fees';
import { permissionHash, buildPermission } from '@/lib/stellar/permissions';
import { savingsVaultOf, vaultWithdrawOf } from '@/lib/stellar/vault-withdraw';
import { type NetworkType, getStellarConfigForNetwork } from '@normalfinance/utils';
import {
  rpc,
  xdr,
  Asset,
  Horizon,
  Keypair,
  Networks,
  Transaction,
  TransactionBuilder,
  type FeeBumpTransaction,
} from '@stellar/stellar-sdk';
import {
  amountToUnits,
  unitsToAmount,
  sacTransferCall,
  classicPaymentTx,
  classicSwapWithFeeTx,
  vaultDepositPermission,
} from '@/lib/stellar/action-calls';

import type { Refusal } from './relayed-steps';

// ---------------------------------------------------------------------------
// Doc 129 Phase 5c: XLM → Savings and Savings → XLM, one signature each.
//
// The person's own transactions go first and fund the rest; the server sends
// them in order, then any permissions Normal's relayer sends for them
// (server/relayed-steps.ts runs both, with the same gate and records as a
// Circle transfer):
//
//   XLM → Savings   their swap (a classic path payment to exactly the USDC
//                   needed, with the swap's 0.5% fee in XLM, ONE transaction),
//                   then the relayed deposit and, right after it, the relayed
//                   deposit fee.
//   Savings → XLM   their withdrawal, then its commission, then the swap
//                   (classic path payment with its 0.5% fee in USDC, ONE
//                   transaction). Nothing relayed: every one is theirs, sent
//                   as signed, after the one before it has landed.
//
// Both swaps use Stellar's own exchange: Soroswap's direct USDC/XLM pool is
// shallow (about 8% worse for 100 USDC, doc 129 §11). Fees are what the same
// steps cost one by one (Niko, 2026-11-19: "it should pay the fee to us"),
// and a fee is never sent before what it pays for: inside the swap's own
// transaction, chained right behind the withdrawal, or the relayed step right
// after the deposit.
// ---------------------------------------------------------------------------

export type ActionKind =
  | 'xlm_to_savings'
  | 'savings_to_xlm'
  // Doc 129 Phase 6: what happens on Stellar once a coin's Circle transfer lands.
  | 'bridge_to_xlm'
  | 'bridge_to_savings';
const KINDS: ActionKind[] = [
  'xlm_to_savings',
  'savings_to_xlm',
  'bridge_to_xlm',
  'bridge_to_savings',
];
const BRIDGE_KINDS = new Set<string>(['bridge_to_xlm', 'bridge_to_savings']);

/** Doc 129 Phase 6: an action that waits for a Circle transfer instead of a first transaction. */
export const isBridgeKind = (kind: string) => BRIDGE_KINDS.has(kind);

/** A swap's fee: 0.5% of the coin paid with (utils/normal-fees getSwapFeeAmount). */
const SWAP_FEE_BPS = 50n;
const DEPOSIT_FEE_BPS = BigInt(SAVINGS_DEPOSIT_FEE_BPS);
/** Room on a classic swap's price, from Horizon's path finding at signing. */
export const PATH_SLIPPAGE_BPS = 100n;
/** The least Savings takes, or a swap moves, here: 1 USDC (7-decimal units). */
const MIN_UNITS = 10_000_000n;
/** A permission is good for about 10 minutes (as a Circle transfer's). */
const PERMISSION_WINDOW_LEDGERS = 120;
/** The first transaction expires before the gate gives up on it (10 minutes). */
const FIRST_TX_TIMEOUT_S = 300;
/** A chained transaction's window: 15 minutes, as the fee pairs'. */
const CHAINED_TX_TIMEOUT_S = 900;
/**
 * Doc 129 Phase 6: a coin's route takes up to about an hour, then Circle about
 * 20 minutes; the Stellar step is signed for about 3 hours, and the action
 * stops waiting after that (anything that arrives later stays as dollars).
 */
const BRIDGE_WINDOW_LEDGERS = 2160;
export const BRIDGE_ACTION_MAX_MS = 3 * 60 * 60_000;
const BRIDGE_TX_TIMEOUT_S = 3 * 60 * 60;
/** Its own sequence number this far ahead (CAP-21 `minAccountSequence`). */
const BRIDGE_SEQUENCE_ROOM = 1000n;
/** More room on a swap that runs 20 to 90 minutes after its price was quoted. */
const BRIDGE_SWAP_ROOM_BPS = 300n;

const passphraseOf = (network: NetworkType) =>
  network === 'mainnet' ? Networks.PUBLIC : Networks.TESTNET;

// ---- the amounts (pure) --------------------------------------------------------

export interface XlmToSavingsPlan {
  /** What the person pays, the swap's fee out of it, and the most the swap may spend. */
  xlm: bigint;
  swapFee: bigint;
  sendMax: bigint;
  /** Exactly what the swap buys: the quote for `sendMax`, less the swap's room. */
  usdc: bigint;
  depositFee: bigint;
  /** What goes into Savings. */
  deposit: bigint;
}

/** XLM → Savings, from what the person pays and the USDC quoted for its net. Pure. */
export function planXlmToSavings(xlm: bigint, quotedUsdc: bigint): XlmToSavingsPlan {
  const swapFee = (xlm * SWAP_FEE_BPS) / 10_000n;
  const usdc = withSlippage(quotedUsdc);
  const depositFee = (usdc * DEPOSIT_FEE_BPS) / 10_000n;
  return { xlm, swapFee, sendMax: xlm - swapFee, usdc, depositFee, deposit: usdc - depositFee };
}

export interface SavingsSwapAmounts {
  /** What the withdrawal guarantees, less its commission. */
  available: bigint;
  swapFee: bigint;
  /** Exactly what the swap sells. */
  swapIn: bigint;
}

/** Savings → XLM, from the withdrawal's guaranteed minimum and its commission. Pure. */
export function savingsSwapAmounts(minOut: bigint, commission: bigint): SavingsSwapAmounts {
  const available = minOut - commission;
  const swapFee = (available * SWAP_FEE_BPS) / 10_000n;
  return { available, swapFee, swapIn: available - swapFee };
}

/** A quote less the swap's room. Pure. */
export function withSlippage(quoted: bigint): bigint {
  return (quoted * (10_000n - PATH_SLIPPAGE_BPS)) / 10_000n;
}

// ---- Stellar's own exchange: Horizon path finding --------------------------------

type PathAsset = { asset_type: string; asset_code?: string; asset_issuer?: string };
const assetOf = (a: PathAsset) =>
  a.asset_type === 'native' ? Asset.native() : new Asset(a.asset_code!, a.asset_issuer!);

/** The most `destAsset` that exactly `sendUnits` of `sendAsset` buys, and its path. */
async function bestSend(
  horizon: Horizon.Server,
  sendAsset: Asset,
  sendUnits: bigint,
  destAsset: Asset
): Promise<{ destUnits: bigint; path: Asset[] } | null> {
  const page = await horizon
    .strictSendPaths(sendAsset, unitsToAmount(sendUnits), [destAsset])
    .call();
  let best: { destUnits: bigint; path: Asset[] } | null = null;
  for (const r of page.records) {
    const destUnits = amountToUnits(r.destination_amount);
    if (!best || destUnits > best.destUnits) {
      best = { destUnits, path: (r.path as PathAsset[]).map(assetOf) };
    }
  }
  return best;
}

/** The least `sendAsset` that buys exactly `destUnits` of `destAsset`, and its path. */
async function bestReceive(
  horizon: Horizon.Server,
  sendAsset: Asset,
  destAsset: Asset,
  destUnits: bigint
): Promise<{ sendUnits: bigint; path: Asset[] } | null> {
  const page = await horizon
    .strictReceivePaths([sendAsset], destAsset, unitsToAmount(destUnits))
    .call();
  let best: { sendUnits: bigint; path: Asset[] } | null = null;
  for (const r of page.records) {
    const sendUnits = amountToUnits(r.source_amount);
    if (!best || sendUnits < best.sendUnits) {
      best = { sendUnits, path: (r.path as PathAsset[]).map(assetOf) };
    }
  }
  return best;
}

// ---- creating an action ------------------------------------------------------------

interface Context {
  network: NetworkType;
  passphrase: string;
  /** The person's own Stellar address, from their wallet row. */
  account: string;
  vault: string;
  usdc: Asset;
  usdcSac: string;
  feeAddress: string;
  horizon: Horizon.Server;
  server: rpc.Server;
}

async function contextFor(userId: string, network: NetworkType): Promise<Context | Refusal> {
  const wallet = await prisma.turnkeyWallet.findFirst({
    where: { supabaseUid: userId },
    select: { stellarAddress: true },
  });
  if (!wallet?.stellarAddress) {
    return { ok: false, status: 403, error: 'This needs your Normal wallet on Stellar' };
  }
  const config = getStellarConfigForNetwork(network) as {
    BLEND_USDC_ISSUER?: string;
    USDC_ISSUER?: string;
    HORIZON_URL: string;
    RPC_URL: string;
  };
  const vault = savingsVaultOf(network === 'mainnet' ? 'mainnet' : 'testnet');
  const issuer = config.BLEND_USDC_ISSUER || config.USDC_ISSUER;
  if (!vault || !issuer) return { ok: false, status: 503, error: 'Savings is not available here' };
  const passphrase = passphraseOf(network);
  const usdc = new Asset('USDC', issuer);
  const { getFeesDepositAddress } = await import('@/lib/build-fee-payment');
  return {
    network,
    passphrase,
    account: wallet.stellarAddress,
    vault,
    usdc,
    usdcSac: usdc.contractId(passphrase),
    feeAddress: getFeesDepositAddress(),
    horizon: new Horizon.Server(config.HORIZON_URL, {
      allowHttp: config.HORIZON_URL.startsWith('http://'),
    }),
    server: new rpc.Server(config.RPC_URL, { allowHttp: config.RPC_URL.startsWith('http://') }),
  };
}

const isRefusal = (x: unknown): x is Refusal => (x as Refusal)?.ok === false;

/** A positive 7-decimal amount, or null. */
function unitsOf(v: unknown, allowZero = false): bigint | null {
  if (typeof v !== 'string' || !/^\d+(\.\d{1,7})?$/.test(v.trim())) return null;
  const units = amountToUnits(v);
  return units > 0n || (allowZero && units === 0n) ? units : null;
}

export interface CreatedAction {
  ok: true;
  id: string;
  kind: ActionKind;
  /** The amounts, as classic amount strings, for the review. */
  plan: Record<string, string>;
  /** What to sign for the steps Normal sends: their hashes. */
  steps: { id: string; kind: string; payloadHash: string }[];
  /** The person's own transactions the server built, unsigned, first one first. */
  ownTxs: string[];
}

/** Create an action and everything to sign for it, from the person's own wallet. */
export async function createRelayedAction(
  userId: string,
  network: NetworkType,
  body: unknown
): Promise<CreatedAction | Refusal> {
  const kind = (body as { kind?: unknown })?.kind as ActionKind;
  if (!KINDS.includes(kind)) return { ok: false, status: 400, error: 'Unknown action' };
  const ctx = await contextFor(userId, network);
  if (isRefusal(ctx)) return ctx;
  try {
    if (isBridgeKind(kind)) {
      return await createBridgeAction(userId, ctx, kind, body as Record<string, unknown>);
    }
    return kind === 'xlm_to_savings'
      ? await createXlmToSavings(userId, ctx, body as Record<string, unknown>)
      : await createSavingsToXlm(userId, ctx, body as Record<string, unknown>);
  } catch (e) {
    console.warn('[relayed-actions] create failed:', String((e as Error)?.message ?? e));
    return {
      ok: false,
      status: 502,
      error: 'Stellar did not answer in time. Nothing was sent: try again in a moment.',
    };
  }
}

async function createXlmToSavings(
  userId: string,
  ctx: Context,
  body: Record<string, unknown>
): Promise<CreatedAction | Refusal> {
  const xlm = unitsOf(body.amountXlm);
  if (!xlm) return { ok: false, status: 400, error: 'Enter an amount of XLM' };
  const first = planXlmToSavings(xlm, 0n);
  const quote = await bestSend(ctx.horizon, Asset.native(), first.sendMax, ctx.usdc);
  if (!quote) {
    return { ok: false, status: 409, error: 'There is no XLM to USDC route right now' };
  }
  const plan = planXlmToSavings(xlm, quote.destUnits);
  if (plan.deposit < MIN_UNITS) {
    return { ok: false, status: 400, error: 'Savings takes at least 1 USDC: use more XLM' };
  }
  const route = await bestReceive(ctx.horizon, Asset.native(), ctx.usdc, plan.usdc);
  if (!route || route.sendUnits > plan.sendMax) {
    return { ok: false, status: 409, error: 'The price moved: get a fresh one' };
  }
  const source = await ctx.horizon.loadAccount(ctx.account);
  const swapTx = classicSwapWithFeeTx({
    source: ctx.account,
    sequence: BigInt(source.sequenceNumber()) + 1n,
    networkPassphrase: ctx.passphrase,
    path: route.path,
    mode: 'strict-receive',
    sendAsset: Asset.native(),
    sendUnits: plan.sendMax,
    destAsset: ctx.usdc,
    destUnits: plan.usdc,
    fee: { asset: Asset.native(), units: plan.swapFee, to: ctx.feeAddress },
    timeoutSeconds: FIRST_TX_TIMEOUT_S,
  });

  const { sequence: ledger } = await ctx.server.getLatestLedger();
  const expires = ledger + PERMISSION_WINDOW_LEDGERS;
  const deposit = vaultDepositPermission(ctx.vault, ctx.usdcSac, ctx.account, plan.deposit);
  const permissions: { kind: string; entry: xdr.SorobanAuthorizationEntry }[] = [
    {
      kind: 'deposit',
      entry: buildPermission(ctx.account, deposit.call, expires, undefined, deposit.inner),
    },
  ];
  if (plan.depositFee > 0n) {
    permissions.push({
      kind: 'fee',
      entry: buildPermission(
        ctx.account,
        sacTransferCall(ctx.usdcSac, ctx.account, ctx.feeAddress, plan.depositFee),
        expires
      ),
    });
  }

  const shown = {
    xlm: unitsToAmount(plan.xlm),
    swapFee: unitsToAmount(plan.swapFee),
    sendMax: unitsToAmount(plan.sendMax),
    usdc: unitsToAmount(plan.usdc),
    depositFee: unitsToAmount(plan.depositFee),
    deposit: unitsToAmount(plan.deposit),
  };
  const action = await prisma.relayedAction.create({
    data: {
      userId,
      network: ctx.network,
      kind: 'xlm_to_savings',
      account: ctx.account,
      planJson: JSON.stringify({
        ...shown,
        vault: ctx.vault,
        usdcSac: ctx.usdcSac,
        swapTxHash: swapTx.hash().toString('hex'),
      }),
    },
  });
  const steps = [];
  for (const [i, p] of permissions.entries()) {
    const payloadHash = permissionHash(p.entry, ctx.passphrase).toString('hex');
    const row = await prisma.relayedStep.create({
      data: {
        userId,
        network: ctx.network,
        transferId: action.id,
        order: i + 1,
        kind: p.kind,
        account: ctx.account,
        entryXdr: p.entry.toXDR('base64'),
        payloadHash,
        expiresLedger: expires,
      },
    });
    steps.push({ id: row.id, kind: p.kind, payloadHash });
  }
  return {
    ok: true,
    id: action.id,
    kind: 'xlm_to_savings',
    plan: shown,
    steps,
    ownTxs: [swapTx.toXDR()],
  };
}

async function createSavingsToXlm(
  userId: string,
  ctx: Context,
  body: Record<string, unknown>
): Promise<CreatedAction | Refusal> {
  let withdrawal: Transaction;
  try {
    const parsed = TransactionBuilder.fromXDR(String(body.withdrawXdr ?? ''), ctx.passphrase);
    if (!(parsed instanceof Transaction)) throw new Error('fee bump');
    withdrawal = parsed;
  } catch {
    return { ok: false, status: 400, error: 'The withdrawal could not be read' };
  }
  const call = vaultWithdrawOf(withdrawal, ctx.vault);
  if (!call || call.from !== ctx.account) {
    return { ok: false, status: 400, error: 'This must be a withdrawal from your own Savings' };
  }
  const asked = unitsOf(body.amount);
  // The amount the Savings record shows: what was asked for, which the
  // withdrawal's own guaranteed minimum must be within 5% of.
  if (!asked || asked * 100n < call.minOut * 95n || asked * 100n > call.minOut * 105n) {
    return { ok: false, status: 400, error: 'The amount does not match the withdrawal' };
  }
  const commission = unitsOf(body.commission ?? '0', true);
  // A commission is a share of earnings: never more than a fifth of what comes out.
  if (commission === null || commission * 5n > call.minOut) {
    return { ok: false, status: 400, error: 'The commission does not fit this withdrawal' };
  }
  const amounts = savingsSwapAmounts(call.minOut, commission);
  if (amounts.swapIn < MIN_UNITS) {
    return { ok: false, status: 400, error: 'Swap at least 1 USDC from Savings' };
  }
  const quote = await bestSend(ctx.horizon, ctx.usdc, amounts.swapIn, Asset.native());
  if (!quote) {
    return { ok: false, status: 409, error: 'There is no USDC to XLM route right now' };
  }
  const destMin = withSlippage(quote.destUnits);
  const withdrawalSeq = BigInt(withdrawal.sequence);
  const commissionTx =
    commission > 0n
      ? classicPaymentTx({
          source: ctx.account,
          sequence: withdrawalSeq + 1n,
          networkPassphrase: ctx.passphrase,
          asset: ctx.usdc,
          units: commission,
          to: ctx.feeAddress,
          timeoutSeconds: CHAINED_TX_TIMEOUT_S,
        })
      : null;
  const swapTx = classicSwapWithFeeTx({
    source: ctx.account,
    sequence: withdrawalSeq + (commissionTx ? 2n : 1n),
    networkPassphrase: ctx.passphrase,
    path: quote.path,
    mode: 'strict-send',
    sendAsset: ctx.usdc,
    sendUnits: amounts.swapIn,
    destAsset: Asset.native(),
    destUnits: destMin,
    fee: { asset: ctx.usdc, units: amounts.swapFee, to: ctx.feeAddress },
    timeoutSeconds: CHAINED_TX_TIMEOUT_S,
  });

  const shown = {
    amount: unitsToAmount(asked),
    minOut: unitsToAmount(call.minOut),
    commission: unitsToAmount(commission),
    swapIn: unitsToAmount(amounts.swapIn),
    swapFee: unitsToAmount(amounts.swapFee),
    xlmQuoted: unitsToAmount(quote.destUnits),
    xlmMin: unitsToAmount(destMin),
  };
  const ownSteps = [
    ...(commissionTx ? [{ kind: 'user_tx', tx: commissionTx }] : []),
    { kind: 'user_tx', tx: swapTx },
  ];
  const action = await prisma.relayedAction.create({
    data: {
      userId,
      network: ctx.network,
      kind: 'savings_to_xlm',
      account: ctx.account,
      planJson: JSON.stringify({
        ...shown,
        vault: ctx.vault,
        usdcSac: ctx.usdcSac,
        withdrawHash: withdrawal.hash().toString('hex'),
        commissionTxHash: commissionTx?.hash().toString('hex') ?? null,
        swapTxHash: swapTx.hash().toString('hex'),
      }),
    },
  });
  const steps = [];
  for (const [i, s] of ownSteps.entries()) {
    const payloadHash = s.tx.hash().toString('hex');
    const row = await prisma.relayedStep.create({
      data: {
        userId,
        network: ctx.network,
        transferId: action.id,
        order: i + 1,
        kind: s.kind,
        account: ctx.account,
        entryXdr: s.tx.toXDR(),
        payloadHash,
        expiresLedger: 0,
      },
    });
    steps.push({ id: row.id, kind: s.kind, payloadHash });
  }
  return { ok: true, id: action.id, kind: 'savings_to_xlm', plan: shown, steps, ownTxs: [] };
}

/**
 * Doc 129 Phase 6: BTC/ETH/SOL → XLM or → Savings. Created right after the
 * coin's Circle transfer row and before anything is signed: its Stellar step
 * is signed first (declining it costs nothing), for exactly the bridge's
 * quoted minimum (Circle's fee is zero, and the Base burn takes at least that
 * whenever it arrived). It runs once the transfer has landed on Stellar.
 */
async function createBridgeAction(
  userId: string,
  ctx: Context,
  kind: ActionKind,
  body: Record<string, unknown>
): Promise<CreatedAction | Refusal> {
  const transferId = typeof body.transferId === 'string' ? body.transferId : '';
  const transfer = transferId
    ? await prisma.cctpTransfer.findUnique({ where: { id: transferId } })
    : null;
  if (!transfer || transfer.userId !== userId)
    return { ok: false, status: 404, error: 'Not found' };
  if (
    transfer.direction !== 'crosschain_to_stellar' ||
    !['BTC', 'ETH', 'SOL'].includes(transfer.srcAsset) ||
    transfer.dstAsset !== 'USDC' ||
    transfer.network !== ctx.network
  ) {
    return {
      ok: false,
      status: 400,
      error: 'Only a swap from BTC, ETH or SOL can continue on Stellar',
    };
  }
  // The money lands in the person's own Normal wallet: the one that signs.
  if (transfer.destAddress !== ctx.account) {
    return { ok: false, status: 403, error: 'It must arrive in your own Normal wallet' };
  }
  if (transfer.status !== 'CREATED') {
    return { ok: false, status: 409, error: 'This swap has already started' };
  }
  const taken = await prisma.relayedAction.findFirst({
    where: { userId, planJson: { contains: transfer.id } },
    select: { id: true },
  });
  if (taken) return { ok: false, status: 409, error: 'This swap already has its next step' };

  const amount = BigInt(transfer.amountWire) * 10n;
  // What lands is Circle's own USDC; Savings must take that very token.
  const circleUsdc = new Asset('USDC', STELLAR_CCTP[ctx.network].usdcIssuer);
  if (kind === 'bridge_to_savings' && !ctx.usdc.equals(circleUsdc)) {
    return { ok: false, status: 400, error: 'Savings does not take this USDC here' };
  }
  const { sequence: ledger } = await ctx.server.getLatestLedger();
  const expires = ledger + BRIDGE_WINDOW_LEDGERS;

  if (kind === 'bridge_to_savings') {
    const depositFee = (amount * DEPOSIT_FEE_BPS) / 10_000n;
    const toSave = amount - depositFee;
    if (toSave < MIN_UNITS) {
      return { ok: false, status: 400, error: 'Savings takes at least 1 USDC' };
    }
    const deposit = vaultDepositPermission(ctx.vault, ctx.usdcSac, ctx.account, toSave);
    const permissions = [
      {
        kind: 'deposit',
        entry: buildPermission(ctx.account, deposit.call, expires, undefined, deposit.inner),
      },
      ...(depositFee > 0n
        ? [
            {
              kind: 'fee',
              entry: buildPermission(
                ctx.account,
                sacTransferCall(ctx.usdcSac, ctx.account, ctx.feeAddress, depositFee),
                expires
              ),
            },
          ]
        : []),
    ];
    const shown = {
      usdc: unitsToAmount(amount),
      depositFee: unitsToAmount(depositFee),
      deposit: unitsToAmount(toSave),
    };
    const action = await prisma.relayedAction.create({
      data: {
        userId,
        network: ctx.network,
        kind,
        account: ctx.account,
        status: 'CREATED',
        planJson: JSON.stringify({
          ...shown,
          afterTransferId: transfer.id,
          vault: ctx.vault,
          usdcSac: ctx.usdcSac,
        }),
      },
    });
    const steps = [];
    for (const [i, p] of permissions.entries()) {
      const payloadHash = permissionHash(p.entry, ctx.passphrase).toString('hex');
      const row = await prisma.relayedStep.create({
        data: {
          userId,
          network: ctx.network,
          transferId: action.id,
          order: i + 1,
          kind: p.kind,
          account: ctx.account,
          entryXdr: p.entry.toXDR('base64'),
          payloadHash,
          expiresLedger: expires,
        },
      });
      steps.push({ id: row.id, kind: p.kind, payloadHash });
    }
    return { ok: true, id: action.id, kind, plan: shown, steps, ownTxs: [] };
  }

  // → XLM: one classic transaction, signed now and sent when the USDC lands.
  const swapFee = (amount * SWAP_FEE_BPS) / 10_000n;
  const swapIn = amount - swapFee;
  if (swapIn < MIN_UNITS) return { ok: false, status: 400, error: 'Swap at least 1 USDC' };
  const quote = await bestSend(ctx.horizon, circleUsdc, swapIn, Asset.native());
  if (!quote) return { ok: false, status: 409, error: 'There is no USDC to XLM route right now' };
  const xlmMin = (quote.destUnits * (10_000n - BRIDGE_SWAP_ROOM_BPS)) / 10_000n;
  const source = await ctx.horizon.loadAccount(ctx.account);
  const current = BigInt(source.sequenceNumber());
  const swapTx = classicSwapWithFeeTx({
    source: ctx.account,
    sequence: current + BRIDGE_SEQUENCE_ROOM,
    minSequence: current,
    networkPassphrase: ctx.passphrase,
    path: quote.path,
    mode: 'strict-send',
    sendAsset: circleUsdc,
    sendUnits: swapIn,
    destAsset: Asset.native(),
    destUnits: xlmMin,
    fee: { asset: circleUsdc, units: swapFee, to: ctx.feeAddress },
    timeoutSeconds: BRIDGE_TX_TIMEOUT_S,
  });
  const shown = {
    usdc: unitsToAmount(amount),
    swapIn: unitsToAmount(swapIn),
    swapFee: unitsToAmount(swapFee),
    xlmQuoted: unitsToAmount(quote.destUnits),
    xlmMin: unitsToAmount(xlmMin),
  };
  const swapTxHash = swapTx.hash().toString('hex');
  const action = await prisma.relayedAction.create({
    data: {
      userId,
      network: ctx.network,
      kind,
      account: ctx.account,
      status: 'CREATED',
      planJson: JSON.stringify({
        ...shown,
        afterTransferId: transfer.id,
        usdcSac: circleUsdc.contractId(ctx.passphrase),
        swapTxHash,
      }),
    },
  });
  const row = await prisma.relayedStep.create({
    data: {
      userId,
      network: ctx.network,
      transferId: action.id,
      order: 1,
      kind: 'user_tx',
      account: ctx.account,
      entryXdr: swapTx.toXDR(),
      payloadHash: swapTxHash,
      expiresLedger: 0,
    },
  });
  return {
    ok: true,
    id: action.id,
    kind,
    plan: shown,
    steps: [{ id: row.id, kind: 'user_tx', payloadHash: swapTxHash }],
    ownTxs: [],
  };
}

// ---- commit: checks and records ---------------------------------------------------------

/** An action's plan, as stored. */
export function planOf(action: Pick<RelayedAction, 'planJson'>): Record<string, string | null> {
  try {
    return JSON.parse(action.planJson);
  } catch {
    return {};
  }
}

/**
 * The person's own first transaction for an action: exactly the one this
 * action was built around (the server-built swap, or the withdrawal it was
 * created from), from their own wallet, signed by it. Pure.
 */
export function actionFirstTxRefusal(
  txs: (Transaction | FeeBumpTransaction)[],
  action: Pick<RelayedAction, 'kind' | 'account' | 'planJson' | 'firstTxHash'>
): Refusal | null {
  if (txs.length !== 1 || !(txs[0] instanceof Transaction)) {
    return { ok: false, status: 400, error: 'One transaction goes first' };
  }
  const tx = txs[0];
  const plan = planOf(action);
  const expected = action.kind === 'xlm_to_savings' ? plan.swapTxHash : plan.withdrawHash;
  const hash = tx.hash().toString('hex');
  if (!expected || hash !== expected) {
    return {
      ok: false,
      status: 400,
      error: 'This is not the transaction this action was built for',
    };
  }
  if (tx.source !== action.account) {
    return { ok: false, status: 403, error: 'It must come from your own wallet' };
  }
  const key = Keypair.fromPublicKey(tx.source);
  const signed = tx.signatures.some(
    (d) => d.hint().equals(key.signatureHint()) && key.verify(tx.hash(), d.signature())
  );
  if (!signed) return { ok: false, status: 400, error: 'It is not signed by your wallet' };
  if (action.firstTxHash && action.firstTxHash !== hash) {
    return { ok: false, status: 409, error: 'This action already has its first transaction' };
  }
  return null;
}

/**
 * One of the person's own transactions a step sends as it is: the stored
 * unsigned transaction with their signature over its hash, checked first.
 * Pure.
 */
export function attachUserTxSignature(
  entryXdr: string,
  account: string,
  passphrase: string,
  signature: Buffer
): string {
  const tx = TransactionBuilder.fromXDR(entryXdr, passphrase);
  if (!(tx instanceof Transaction) || tx.source !== account) {
    throw new Error('Not this account’s transaction');
  }
  const key = Keypair.fromPublicKey(account);
  if (signature.length !== 64 || !key.verify(tx.hash(), signature)) {
    throw new Error('The signature does not match this transaction');
  }
  tx.signatures.push(new xdr.DecoratedSignature({ hint: key.signatureHint(), signature }));
  return tx.toXDR();
}

/**
 * Record what the first transaction starts, BEFORE it is broadcast (as the
 * pair route does): the swap (XLM → Savings), or the withdrawal and the swap
 * that follows it (Savings → XLM). A relayed deposit is recorded when it
 * lands (its transaction is the relayer's, rebuilt if it has to be).
 */
export async function recordActionStart(action: RelayedAction): Promise<void> {
  const plan = planOf(action);
  const network = action.network as NetworkType;
  const { createPendingRecord } = await import('@/server/tx-records');
  if (action.kind === 'xlm_to_savings') {
    await createPendingRecord({
      input: {
        kind: 'swap',
        record: {
          tokenInAddress: 'native',
          tokenOutAddress: plan.usdcSac ?? '',
          tokenInSymbol: 'XLM',
          tokenOutSymbol: 'USDC',
          amountIn: plan.sendMax ?? '0',
          amountOut: plan.usdc ?? '0',
          feeAmount: plan.swapFee ?? '0',
        },
      },
      walletAddress: action.account,
      network,
      serviceHash: plan.swapTxHash!,
      // The fee is inside the swap's own transaction.
      feeHash: plan.swapTxHash!,
    });
    return;
  }
  // Doc 129 Phase 6: a bridge action's records are written as its steps land
  // (the reconciler would abandon a record pending for the bridge's hour).
  if (action.kind !== 'savings_to_xlm') return;
  const commission = plan.commission && amountToUnits(plan.commission) > 0n;
  await createPendingRecord({
    input: {
      kind: 'savings_withdraw',
      record: {
        vaultAddress: plan.vault ?? '',
        amount: plan.amount ?? '0',
        feeAmount: commission ? plan.commission! : null,
      },
    },
    walletAddress: action.account,
    network,
    serviceHash: plan.withdrawHash!,
    feeHash: plan.commissionTxHash ?? null,
  });
  await createPendingRecord({
    input: {
      kind: 'swap',
      record: {
        tokenInAddress: plan.usdcSac ?? '',
        tokenOutAddress: 'native',
        tokenInSymbol: 'USDC',
        tokenOutSymbol: 'XLM',
        amountIn: plan.swapIn ?? '0',
        amountOut: plan.xlmMin ?? '0',
        feeAmount: plan.swapFee ?? '0',
      },
    },
    walletAddress: action.account,
    network,
    serviceHash: plan.swapTxHash!,
    feeHash: plan.swapTxHash!,
  });
}

/** The first transaction landed or never will: settle its record. Idempotent. */
export async function settleActionFirstTx(
  action: RelayedAction,
  outcome: 'confirmed' | 'failed'
): Promise<void> {
  if (!action.firstTxHash) return;
  const { settleRecord } = await import('@/server/tx-records');
  await settleRecord({
    kind: action.kind === 'xlm_to_savings' ? 'swap' : 'savings_withdraw',
    serviceHash: action.firstTxHash,
    status: outcome,
    ...(outcome === 'failed' ? { reason: 'did not land before its action gave up' } : {}),
    walletAddress: action.account,
    network: action.network,
  }).catch(() => {});
  if (outcome === 'failed' && action.kind === 'savings_to_xlm') {
    // Its swap can never follow a withdrawal that did not happen.
    const plan = planOf(action);
    if (plan.swapTxHash) {
      await settleRecord({
        kind: 'swap',
        serviceHash: plan.swapTxHash,
        status: 'failed',
        reason: 'its withdrawal did not land',
      }).catch(() => {});
    }
  }
}

/** What the person reads when the first transaction did not go through. */
export function actionFirstTxWords(kind: string): { refused: string; failed: string } {
  if (isBridgeKind(kind)) {
    // Doc 129 Phase 6: the coin's transfer did not land on Stellar in time.
    const words =
      'The money did not reach your Stellar wallet in time, so Normal did nothing more with it. Anything that arrives stays there as digital dollars.';
    return { refused: words, failed: words };
  }
  return kind === 'xlm_to_savings'
    ? {
        refused:
          'The swap from XLM was refused, so nothing moved: your XLM is still in your wallet.',
        failed:
          'The swap from XLM did not go through, so nothing moved: your XLM is still in your wallet.',
      }
    : {
        refused:
          'Taking it out of Savings was refused, so nothing moved: your money is still in Savings.',
        failed:
          'Taking it out of Savings did not go through, so nothing moved: your money is still in Savings.',
      };
}

// ---- as the steps land ----------------------------------------------------------------

/**
 * A step of an action landed: write what it did. A relayed deposit gets its
 * Savings record now (with its fee to come); its fee step fills that record's
 * fee; the person's own swap settles the swap record written at commit. The
 * last step done finishes the action.
 */
export async function onActionStepLanded(step: RelayedStep, action: RelayedAction): Promise<void> {
  const plan = planOf(action);
  const network = action.network as NetworkType;
  const records = await import('@/server/tx-records');
  if (step.kind === 'deposit' && step.txHash) {
    const fee = plan.depositFee && amountToUnits(plan.depositFee) > 0n ? plan.depositFee : null;
    await records
      .createPendingRecord({
        input: {
          kind: 'savings_deposit',
          record: { vaultAddress: plan.vault ?? '', amount: plan.deposit ?? '0', feeAmount: fee },
        },
        walletAddress: action.account,
        network,
        serviceHash: step.txHash,
        feeHash: null,
      })
      .catch(() => {});
    await records.settleRecord({
      kind: 'savings_deposit',
      serviceHash: step.txHash,
      status: 'confirmed',
      walletAddress: action.account,
      network: action.network,
    });
  } else if (step.kind === 'fee' && step.txHash) {
    const deposit = await prisma.relayedStep.findFirst({
      where: { transferId: action.id, kind: 'deposit' },
      select: { txHash: true },
    });
    if (deposit?.txHash) {
      await prisma.vaultDeposit.updateMany({
        where: { txHash: deposit.txHash },
        data: { feeTxHash: step.txHash },
      });
    }
  } else if (step.kind === 'user_tx' && plan.swapTxHash && step.payloadHash === plan.swapTxHash) {
    // The swap, by its own hash (Normal may have paid its fee from outside it).
    if (action.kind === 'bridge_to_xlm') {
      await records
        .createPendingRecord({
          input: {
            kind: 'swap',
            record: {
              tokenInAddress: plan.usdcSac ?? '',
              tokenOutAddress: 'native',
              tokenInSymbol: 'USDC',
              tokenOutSymbol: 'XLM',
              amountIn: plan.swapIn ?? '0',
              amountOut: plan.xlmMin ?? '0',
              feeAmount: plan.swapFee ?? '0',
            },
          },
          walletAddress: action.account,
          network,
          serviceHash: plan.swapTxHash,
          feeHash: plan.swapTxHash,
        })
        .catch(() => {});
    }
    await records.settleRecord({
      kind: 'swap',
      serviceHash: plan.swapTxHash,
      status: 'confirmed',
      walletAddress: action.account,
      network: action.network,
    });
  }
  const open = await prisma.relayedStep.count({
    where: { transferId: action.id, status: { not: 'DONE' } },
  });
  if (open === 0) {
    await prisma.relayedAction.updateMany({
      where: { id: action.id, status: { in: ['CREATED', 'RUNNING'] } },
      data: { status: 'DONE' },
    });
  }
}

/** A step of an action stopped: the action stops with it, and says why. */
export async function onActionStepStopped(
  step: RelayedStep,
  action: RelayedAction,
  detail: string | null
): Promise<void> {
  const plan = planOf(action);
  if (step.kind === 'user_tx' && plan.swapTxHash && step.payloadHash === plan.swapTxHash) {
    const { settleRecord } = await import('@/server/tx-records');
    await settleRecord({
      kind: 'swap',
      serviceHash: plan.swapTxHash,
      status: 'failed',
      reason: (detail ?? 'did not go through').slice(0, 200),
    }).catch(() => {});
  }
  await prisma.relayedAction.updateMany({
    where: { id: action.id, status: { in: ['CREATED', 'RUNNING'] } },
    data: { status: 'FAILED', errorDetail: detail?.slice(0, 500) ?? null },
  });
}
