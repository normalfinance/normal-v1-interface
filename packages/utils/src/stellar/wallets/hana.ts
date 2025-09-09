import { Wallet } from './types';
import {
  HANA_ID,
  HanaModule,
  StellarWalletsKit,
  WalletNetwork,
} from '@creit.tech/stellar-wallets-kit';

// Initialize the Stellar Wallets Kit for Hana
console.log('[HANA STELLAR KIT] Environment variable NEXT_PUBLIC_STELLAR_NETWORK:', process.env.NEXT_PUBLIC_STELLAR_NETWORK);
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
      const publicKey = await stellarKit.getAddress();
      return !!publicKey;
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
      const address = await stellarKit.getAddress();
      return { address: address.address };
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
    if (!(await this.isConnected())) {
      throw new Error(`hana is not connected`);
    }

    console.log('[HANA STELLAR KIT UTILS] Signing transaction with opts:', opts);

    try {
      console.log('[HANA STELLAR KIT UTILS] Signing without explicit networkPassphrase - letting kit handle it');
      
      // Don't pass networkPassphrase - let the Stellar Wallets Kit handle it based on its initialization
      const { signedTxXdr } = await stellarKit.signTransaction(tx);

      const signerAddress = (await this.getAddress()).address!;

      return {
        signedTxXdr,
        signerAddress,
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
