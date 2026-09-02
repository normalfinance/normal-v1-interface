import type { NetworkConfig } from '@normalfinance/types';

import { constants } from '@normalfinance/utils';
import { isValidStellarAddress } from '@/utils/stellar-address';
import {
  Asset,
  Account,
  Horizon,
  Operation,
  TransactionBuilder,
  BASE_FEE as SDK_BASE_FEE,
} from '@stellar/stellar-sdk';

// ----------------------------------------------------------------------

const BASE_FEE: string = typeof SDK_BASE_FEE === 'string' ? SDK_BASE_FEE : '100';

const DEFAULT_TIMEOUT_SECONDS = 180;

// Fee txs built as the second half of a sign-both-first pair (#26) get a
// longer window: the server escrow may need to retry submission after the
// service tx lands, and the timebounds are what guarantee the escrowed tx
// eventually dies if we can't.
export const FEE_PAIR_TIMEOUT_SECONDS = 900;

export type FeeAssetCode = 'XLM' | 'USDC';

export interface BuildFeePaymentParams {
  caller: string;
  destination: string;
  amount: string; // human-readable (e.g. "0.99")
  assetCode: FeeAssetCode;
  assetIssuer?: string; // required for non-native assets
  config?: NetworkConfig;
  /**
   * Sequence number the transaction should be built ON TOP OF, i.e. the tx
   * gets sequence `sourceSequence + 1`. Pass the SERVICE transaction's own
   * sequence here to chain the fee directly behind it (#26 pairing). When
   * omitted, the account's live sequence is loaded from Horizon (legacy
   * standalone behavior).
   */
  sourceSequence?: string;
  timeoutSeconds?: number;
}

/**
 * Builds a classic Stellar payment XDR that sends `amount` of `assetCode`
 * from `caller` to `destination`. Used to route Normal Finance fees and
 * commissions as a separate pre-step around Soroban invocations.
 */
export async function buildFeePaymentXdr(params: BuildFeePaymentParams): Promise<string> {
  const {
    caller,
    destination,
    amount,
    assetCode,
    assetIssuer,
    config = constants.StellarConfig,
    sourceSequence,
    timeoutSeconds = DEFAULT_TIMEOUT_SECONDS,
  } = params;

  if (!isValidStellarAddress(caller)) {
    throw new Error('Invalid caller address');
  }
  if (!isValidStellarAddress(destination)) {
    throw new Error('Invalid fee destination address');
  }

  const numeric = Number(amount);
  if (!Number.isFinite(numeric) || numeric <= 0) {
    throw new Error('Fee amount must be a positive number');
  }

  let asset: Asset;
  if (assetCode === 'XLM') {
    asset = Asset.native();
  } else {
    if (!assetIssuer) {
      throw new Error(`Asset issuer required for ${assetCode}`);
    }
    asset = new Asset(assetCode, assetIssuer);
  }

  let account: Account;
  if (sourceSequence !== undefined) {
    if (!/^\d+$/.test(sourceSequence)) {
      throw new Error('sourceSequence must be a decimal sequence number string');
    }
    // Chained mode (#26): build directly behind the given sequence without
    // touching Horizon — the pair must not race the account's live sequence.
    account = new Account(caller, sourceSequence);
  } else {
    const horizonServer = new Horizon.Server(config.HORIZON_URL, {
      allowHttp: config.HORIZON_URL.startsWith('http://'),
    });
    account = await horizonServer.loadAccount(caller);
  }

  // Stellar payment amounts are fixed-point with 7 decimals.
  const normalizedAmount = numeric.toFixed(7);

  const tx = new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase: config.NETWORK_PASSPHRASE,
  })
    .addOperation(
      Operation.payment({
        destination,
        asset,
        amount: normalizedAmount,
      })
    )
    .setTimeout(timeoutSeconds)
    .build();

  return tx.toXDR();
}

/**
 * Reads and validates the `NORMAL_FEES_DEPOSIT_ADDRESS` env var.
 * Throws if missing or malformed.
 */
export function getFeesDepositAddress(): string {
  const addr = process.env.NORMAL_FEES_DEPOSIT_ADDRESS;
  if (!addr) {
    throw new Error('NORMAL_FEES_DEPOSIT_ADDRESS is not configured');
  }
  if (!isValidStellarAddress(addr)) {
    throw new Error('NORMAL_FEES_DEPOSIT_ADDRESS is not a valid Stellar address');
  }
  return addr;
}
