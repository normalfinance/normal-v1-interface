import {
  Account,
  Asset,
  Horizon,
  Operation,
  StrKey,
  TransactionBuilder,
} from '@stellar/stellar-sdk';
import { NetworkConfig } from '@normalfinance/types';
import { constants } from '..';
import { logger } from '../logger';
import { fetchAccount } from './horizon';

export async function checkTrustline(
  publicKey: string,
  assetCode: string,
  assetIssuer: string,
  config: NetworkConfig = constants.StellarConfig
) {
  // Fetch Account
  const account = await fetchAccount(publicKey, config);

  if (!account) {
    return {
      exists: false,
      asset: null,
    };
  }

  // Check trustlines
  const balances = account.balances;

  // Handle native XLM - no trustline needed, always "exists" if account is funded
  const isNativeAsset = assetCode === 'XLM' && (!assetIssuer || assetIssuer === '');
  if (isNativeAsset) {
    const nativeBalance = balances.find((a) => a.asset_type === 'native');
    return {
      exists: !!nativeBalance,
      asset: Asset.native(),
    };
  }

  // Check if trustline exists for non-native assets
  const trustlineExists = balances.some((a) => {
    const hasIssuer = 'asset_issuer' in a;
    const hasCode = 'asset_code' in a;
    const issuerMatch = hasIssuer ? a.asset_issuer === assetIssuer : false;
    const codeMatch = hasCode ? a.asset_code === assetCode : false;
    const matches = hasIssuer && hasCode && issuerMatch && codeMatch;

    return matches;
  });

  const result = {
    exists: trustlineExists,
    asset: new Asset(assetCode, assetIssuer),
  };

  return result;
}

// NOTE: Trustline creation is now handled through the Stellar Wallets Kit
// This function creates a trustline transaction that needs to be signed by the wallet
export async function createTrustline(
  publicKey: string,
  assetCode: string,
  assetIssuer: string,
  signTransaction?: (xdr: string) => Promise<string>,
  config: NetworkConfig = constants.StellarConfig
) {
  // Fetch Account
  const account = await fetchAccount(publicKey, config);

  if (!account) {
    throw new Error('Account not found');
  }

  // Create Asset
  const asset = new Asset(assetCode, assetIssuer);

  // Build transaction
  const stellarAccount = new Account(account.account_id, account.sequence);
  const horizonServer = new Horizon.Server(config.HORIZON_URL, {
    allowHttp: config.HORIZON_URL.startsWith('http://'),
  });
  const transaction = new TransactionBuilder(stellarAccount, {
    fee: await horizonServer.feeStats().then((fs) => fs.fee_charged.p90),
    networkPassphrase: config.NETWORK_PASSPHRASE,
  })
    .addOperation(
      Operation.changeTrust({
        asset: asset,
      })
    )
    .setTimeout(30)
    .build();

  if (signTransaction) {
    // If signTransaction is provided, sign and submit the transaction
    const signedXDR = await signTransaction(transaction.toXDR());
    const signedTransaction = TransactionBuilder.fromXDR(
      signedXDR,
      config.NETWORK_PASSPHRASE
    );

    const result = await horizonServer.submitTransaction(signedTransaction);
    logger.log('[TRUSTLINE] Trustline created successfully:', result.hash);
    return result;
  } else {
    // Return the unsigned transaction XDR for external signing
    return transaction.toXDR();
  }
}

export async function fetchAndIssueTrustline(
  publicKey: string,
  assetCode: string,
  assetIssuer: string,
  config: NetworkConfig = constants.StellarConfig
) {
  // Fetch Account
  const account = await fetchAccount(publicKey, config);

  if (!account) {
    throw new Error('Account not found');
  }

  // Check trustlines
  const balances = account.balances;

  // Check if trustline exists
  const trustlineExists = balances.some(
    (a) =>
      'asset_issuer' in a &&
      'asset_code' in a &&
      a.asset_issuer === assetIssuer &&
      a.asset_code === assetCode
  );

  // If trustline does not exist, issue trustline
  if (!trustlineExists) {
    const result = await createTrustline(publicKey, assetCode, assetIssuer, undefined, config);
    return result;
  }
}

async function waitForTrustline(
  publicKey: string,
  assetCode: string,
  assetIssuer: string
): Promise<void> {
  let attempts = 0;
  while (attempts < 5) {
    attempts++;

    const result = await checkTrustline(publicKey, assetCode, assetIssuer);

    if (result.exists) {
      return;
    }

    await new Promise((resolve) => setTimeout(resolve, 5000)); // Wait for 5 seconds
  }

  throw new Error('Trustline creation timeout - trustline not found after 5 attempts');
}
