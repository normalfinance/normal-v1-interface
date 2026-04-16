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
