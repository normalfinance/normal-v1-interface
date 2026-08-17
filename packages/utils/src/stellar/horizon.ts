import { Horizon, StrKey } from '@stellar/stellar-sdk';
import { NetworkConfig } from '@normalfinance/types';
import { constants } from '..';

/**
 * Fetches and returns details about an account on the Stellar network.
 * @async
 * @function fetchAccount
 * @param {string} publicKey Public Stellar address to query information about
 * @returns {Promise<AccountRecord>} Object containing whether or not the account is funded, and (if it is) account details
 * @throws {error} Will throw an error if the account is not funded on the Stellar network, or if an invalid public key was provided.
 */
export async function fetchAccount(
  publicKey: string,
  config: NetworkConfig = constants.StellarConfig
) {
  if (StrKey.isValidEd25519PublicKey(publicKey)) {
    try {
      const horizonServer = new Horizon.Server(config.HORIZON_URL, {
        allowHttp: config.HORIZON_URL.startsWith('http://'),
      });

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

/**
 * Like `fetchAccount`, but a FAILED lookup is distinguishable from "account
 * does not exist": returns the account, `null` on a genuine Horizon 404
 * (unfunded address), and THROWS on anything else (network failure, timeout,
 * 5xx). Use this wherever the caller shows or caches a "not activated" /
 * "missing" state — the lenient variant maps every failure to `undefined`,
 * which readers then present as a confident empty answer.
 */
export async function fetchAccountStrict(
  publicKey: string,
  config: NetworkConfig = constants.StellarConfig
): Promise<Horizon.ServerApi.AccountRecord | null> {
  if (!StrKey.isValidEd25519PublicKey(publicKey)) {
    throw new Error('invalid public key');
  }
  const horizonServer = new Horizon.Server(config.HORIZON_URL, {
    allowHttp: config.HORIZON_URL.startsWith('http://'),
  });
  try {
    return await horizonServer.accounts().accountId(publicKey).call();
  } catch (err: any) {
    if (err?.response?.status === 404) return null;
    throw err;
  }
}

/**
 * Fetches and returns details about a transaciton on the Stellar network.
 * @async
 * @function fetchTransaction
 * @param {string} transactionHash Stellar transaction hash to query information about
 * @returns {Promise<TransactionRecord>} Object containing transaction details
 * @throws {error} Will throw an error if an invalid  transaction hash was provided.
 */
export async function fetchTransaction(
  transactionHash: string,
  config: NetworkConfig = constants.StellarConfig
) {
  try {
    const horizonServer = new Horizon.Server(config.HORIZON_URL, {
      allowHttp: config.HORIZON_URL.startsWith('http://'),
    });

    let transaction = await horizonServer.transactions().transaction(transactionHash).call();

    return transaction;
  } catch (err) {
    return;
  }
}
