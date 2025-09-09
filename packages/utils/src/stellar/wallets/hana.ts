import { Wallet } from './types';
import {
  HANA_ID,
  HanaModule,
  StellarWalletsKit,
  WalletNetwork,
} from '@creit.tech/stellar-wallets-kit';

// Initialize the Stellar Wallets Kit for Hana
console.log(
  '[HANA STELLAR KIT] Environment variable NEXT_PUBLIC_STELLAR_NETWORK:',
  process.env.NEXT_PUBLIC_STELLAR_NETWORK
);
console.log('[HANA STELLAR KIT] Forcing TESTNET network');

const stellarKit = new StellarWalletsKit({
  network: WalletNetwork.TESTNET, // Force testnet
  selectedWalletId: HANA_ID,
  modules: [new HanaModule()],
});

interface SignTransactionProps {
  xdr: string;
  accountToSign?: string;
  networkPassphrase?: string;
}

interface SignBlobProps {
  blob: string;
  accountToSign: string;
}

interface SignAuthEntryProps {
  xdr: string;
  accountToSign?: string;
}

interface SignMessageProps {
  message: string;
  accountToSign?: string;
}

declare const window: Window & {
  hanaWallet?: {
    stellar?: {
      getPublicKey(): Promise<string>;
      signTransaction({
        xdr,
        accountToSign,
        networkPassphrase,
      }: SignTransactionProps): Promise<string>;
      signBlob({ blob, accountToSign }: SignBlobProps): Promise<string>;
      signAuthEntry({ xdr, accountToSign }: SignAuthEntryProps): Promise<string>;
      signMessage({ message, accountToSign }: SignMessageProps): Promise<string>;
    };
  };
};

/**
 * hana wallet implementation
 * @implements {Wallet}
 * @class hana
 * @export hana
 * @see {https://github.com/hanaco/hana-browser-extension}
 */
export class hana implements Wallet {
  /**
   * Check if hana is connected
   * @returns {Promise<boolean>}
   * @memberof hana
   * @instance isConnected
   */
  async isConnected(): Promise<boolean> {
    try {
      stellarKit.setWallet(HANA_ID);
      const publicKey = await stellarKit.getAddress();
      return !!publicKey?.address;
    } catch {
      return false;
    }
  }

  /**
   * Check if hana is allowed
   * @returns {Promise<boolean>}
   * @memberof hana
   * @instance isAllowed
   */
  async isAllowed(): Promise<boolean> {
    return true;
  }

  /**
   * Get user info from hana
   * @returns {Promise<{ publicKey?: string }>}
   * @memberof hana
   * @instance getUserInfo
   */
  async getAddress(): Promise<{ address?: string }> {
    try {
      // Ensure wallet is set
      stellarKit.setWallet(HANA_ID);

      const addressResult = await stellarKit.getAddress();
      return { address: addressResult.address };
    } catch (error) {
      console.error('Error getting address from Hana Stellar Kit:', error);
      throw new Error('Hana Stellar Kit is not connected');
    }
  }

  /**
   * Sign a transaction using hana
   * @param {string} tx - Transaction XDR
   * @param {{ network?: string; networkPassphrase?: string; accountToSign?: string }} [opts] - Options
   * @returns {Promise<string>}
   * @memberof hana
   * @instance signTransaction
   */
  async signTransaction(
    tx: string,
    opts?: {
      network?: string;
      networkPassphrase?: string;
      accountToSign?: string;
    }
  ): Promise<{ signedTxXdr: string; signerAddress: string }> {
    console.log('[HANA STELLAR KIT UTILS] Checking if connected...');

    try {
      const connected = await this.isConnected();
      console.log('[HANA STELLAR KIT UTILS] Connection check result:', connected);

      if (!connected) {
        throw new Error(`hana is not connected`);
      }
    } catch (connectionError) {
      console.error('[HANA STELLAR KIT UTILS] Error checking connection:', connectionError);
      throw connectionError;
    }

    console.log('[HANA STELLAR KIT UTILS] Signing transaction with opts:', opts);

    try {
      console.log('[HANA STELLAR KIT UTILS] About to ensure wallet is set to Hana');
      console.log('[HANA STELLAR KIT UTILS] HANA_ID:', HANA_ID);
      console.log('[HANA STELLAR KIT UTILS] stellarKit object:', stellarKit);

      // Ensure the wallet is set to Hana before signing
      stellarKit.setWallet(HANA_ID);
      console.log('[HANA STELLAR KIT UTILS] Successfully set wallet to Hana');

      // Get the public key to ensure we're connected
      const publicKey = await stellarKit.getAddress();
      console.log('[HANA STELLAR KIT UTILS] Connected with address:', publicKey);

      console.log('[HANA STELLAR KIT UTILS] Attempting to sign transaction');

      console.log('[HANA STELLAR KIT UTILS] Calling stellarKit.signTransaction with just XDR...');

      const { address } = await stellarKit.getAddress();
      console.log('[HANA STELLAR KIT UTILS] Address:', address);
      console.log('[HANA STELLAR KIT UTILS] Network passphrase:', WalletNetwork.TESTNET);
      const { signedTxXdr } = await stellarKit.signTransaction(tx, {
        address: address,
        networkPassphrase: WalletNetwork.TESTNET,
      });

      return {
        signedTxXdr,
        signerAddress: publicKey.address!,
      };
    } catch (error) {
      console.error('[HANA STELLAR KIT UTILS] Error signing transaction:', error);
      throw error;
    }
  }

  /**
   * Sign an authorization entry using hana
   * @param {string} entryXdr - Authorization entry XDR
   * @param {{ accountToSign?: string }} [opts] - Options
   * @returns {Promise<string>}
   * @memberof hana
   * @instance signAuthEntry
   * @throws {Error} hana does not support signing authorization entries
   */
  async signAuthEntry(
    entryXdr: string,
    opts?:
      | {
          networkPassphrase?: string | undefined;
          address?: string | undefined;
        }
      | undefined
  ): Promise<{
    signedAuthEntry: Buffer | null;
    signerAddress: string;
  }> {
    throw new Error('hana does not support signing authorization entries');
  }
}

/**
 * Get address from local storage by key
 * @param {string} key
 * @returns {string | undefined}
 * @memberof hana
 * @instance getAddressFromLocalStorageByKey
 */
function getAddressFromLocalStorageByKey(key: string): string | undefined {
  const localStorageData = JSON.parse(localStorage.getItem(key) || '{}');
  if (
    localStorageData &&
    localStorageData.state &&
    localStorageData.state.wallet &&
    localStorageData.state.wallet.address
  ) {
    return localStorageData.state.wallet.address;
  } else {
    return undefined;
  }
}
