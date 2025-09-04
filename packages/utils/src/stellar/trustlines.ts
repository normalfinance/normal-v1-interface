import {
  Asset,
  Horizon,
  Operation,
  rpc as SorobanRpc,
  StrKey,
  TransactionBuilder,
} from '@stellar/stellar-sdk';
import { constants, horizonServer, rpcServer } from '..';
import { xBull } from './wallets/xbull';
import { lobstr } from './wallets/lobstr';
import { hana } from './wallets/hana';
import { Wallet } from './wallets/types';

/**
 * Fetches and returns details about an account on the Stellar network.
 * @async
 * @function fetchAccount
 * @param {string} publicKey Public Stellar address to query information about
 * @returns {Promise<AccountRecord>} Object containing whether or not the account is funded, and (if it is) account details
 * @throws {error} Will throw an error if the account is not funded on the Stellar network, or if an invalid public key was provided.
 */
export async function fetchAccount(publicKey: string) {
  if (StrKey.isValidEd25519PublicKey(publicKey)) {
    try {
      let account: Horizon.ServerApi.AccountRecord = await horizonServer
        .accounts()
        .accountId(publicKey)
        .call();
      return account;
    } catch (err) {
      return;
    }
  } else {
    throw new Error('invalid public key');
  }
}

function getWalletType(): string {
  const appStorageValue = localStorage.getItem('app-storage');
  if (appStorageValue !== null) {
    try {
      const parsedValue = JSON.parse(appStorageValue);
      const walletType = parsedValue?.state?.wallet?.walletType;
      return walletType;
    } catch (error) {
      console.log('Error parsing app-storage value:', error);
    }
  } else {
    console.log('app-storage key not found in localStorage.');
  }
  return '';
}

export async function checkTrustline(publicKey: string, assetCode: string, assetIssuer: string) {
  // Fetch Account
  const account = await fetchAccount(publicKey);

  if (!account) {
    return {
      exists: false,
      asset: null,
    };
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

  return {
    exists: trustlineExists,
    asset: new Asset(assetCode, assetIssuer),
  };
}

export async function createTrustline(publicKey: string, assetCode: string, assetIssuer: string) {
  // Issue trustline
  const transaction = new TransactionBuilder(await rpcServer.getAccount(publicKey), {
    fee: '100000',
    networkPassphrase: constants.StellarConfig.NETWORK_PASSPHRASE,
  })
    .addOperation(
      Operation.changeTrust({
        asset: new Asset(assetCode, assetIssuer),
      })
    )
    .setTimeout(0)
    .build();

  // Get Wallet type
  const walletType = getWalletType();

  // Set wallet to sign
  let wallet: Wallet;

  switch (walletType) {
    case 'xbull':
      wallet = new xBull();
      break;
    case 'lobstr':
      wallet = new lobstr();
      break;
    case 'hana':
      wallet = new hana();
      break;
    default:
      wallet = (await import('@stellar/freighter-api')).default;
  }

  const signature = await wallet.signTransaction(transaction.toXDR());

  const signed = TransactionBuilder.fromXDR(
    signature.signedTxXdr.toString(),
    constants.StellarConfig.NETWORK_PASSPHRASE
  );

  await rpcServer.sendTransaction(signed);

  return await waitForTrustline(publicKey, assetCode, assetIssuer);
}

export async function fetchAndIssueTrustline(
  publicKey: string,
  assetCode: string,
  assetIssuer: string
) {
  // Fetch Account
  const account = await fetchAccount(publicKey);

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
    return await createTrustline(publicKey, assetCode, assetIssuer);
  }
}

async function waitForTrustline(
  publicKey: string,
  assetCode: string,
  assetIssuer: string
): Promise<void> {
  let attempts = 0;
  while (attempts < 5) {
    const result = await checkTrustline(publicKey, assetCode, assetIssuer);
    if (result.exists) {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 5000)); // Wait for 5 seconds
    attempts++;
  }
}
