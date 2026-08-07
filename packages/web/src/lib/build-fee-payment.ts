import type { NetworkConfig } from '@normalfinance/types';

import { constants } from '@normalfinance/utils';
import { isValidStellarAddress } from '@/utils/stellar-address';
import {
  Asset,
  Horizon,
  Operation,
  TransactionBuilder,
  BASE_FEE as SDK_BASE_FEE,
} from '@stellar/stellar-sdk';

// ----------------------------------------------------------------------

const BASE_FEE: string = typeof SDK_BASE_FEE === 'string' ? SDK_BASE_FEE : '100';

export type FeeAssetCode = 'XLM' | 'USDC';

export interface BuildFeePaymentParams {
  caller: string;
  destination: string;
  amount: string; // human-readable (e.g. "0.99")
  assetCode: FeeAssetCode;
  assetIssuer?: string; // required for non-native assets
  config?: NetworkConfig;
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

  const horizonServer = new Horizon.Server(config.HORIZON_URL, {
    allowHttp: config.HORIZON_URL.startsWith('http://'),
  });

  const account = await horizonServer.loadAccount(caller);

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
    .setTimeout(180)
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
