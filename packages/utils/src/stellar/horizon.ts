import { Horizon, StrKey } from '@stellar/stellar-sdk';
import { NetworkConfig } from '@normalfinance/types';
import { constants } from '..';

/** Preference-ordered Horizon endpoints; configs without a pool degrade to
 *  their single primary. */
function horizonUrls(config: NetworkConfig): string[] {
  const urls = config.HORIZON_URLS?.length ? config.HORIZON_URLS : [config.HORIZON_URL];
  return [...new Set(urls.filter(Boolean))];
}

/**
 * Run a read against each Horizon in turn until one ANSWERS.
 *
 * A 404 is an answer ("this account is not funded") and is rethrown
 * immediately -- failing over on it would just re-ask a question that has
 * already been answered, and make "unfunded" cost every endpoint a round
 * trip. Everything else (connection failure, timeout, 5xx, 429) moves to the
 * next endpoint. 2026-08-28: horizon.stellar.org unreachable from a dev
 * machine blanked every Stellar surface in the app because readers had
 * exactly one URL.
 */
async function withHorizonFailover<T>(
  config: NetworkConfig,
  read: (server: Horizon.Server) => Promise<T>
): Promise<T> {
  let lastErr: unknown;
  for (const url of horizonUrls(config)) {
    const server = new Horizon.Server(url, { allowHttp: url.startsWith('http://') });
    try {
      return await read(server);
    } catch (err: any) {
      if (err?.response?.status === 404) throw err; // a real answer, not an outage
      lastErr = err;
    }
  }
  throw lastErr ?? new Error('no horizon endpoints configured');
}

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
      return await withHorizonFailover(config, (server) =>
        server.accounts().accountId(publicKey).call()
      );
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
  try {
    return await withHorizonFailover(config, (server) =>
      server.accounts().accountId(publicKey).call()
    );
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
    return await withHorizonFailover(config, (server) =>
      server.transactions().transaction(transactionHash).call()
    );
  } catch (err) {
    return;
  }
}
