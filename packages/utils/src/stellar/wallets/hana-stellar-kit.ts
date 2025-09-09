import { Wallet } from './types';
import {
  StellarWalletsKit,
  WalletNetwork,
  HANA_ID,
  HanaModule,
} from '@creit.tech/stellar-wallets-kit';

// Initialize the Stellar Wallets Kit for Hana
const stellarKit = new StellarWalletsKit({
  network:
    process.env.NEXT_PUBLIC_STELLAR_NETWORK === 'MAINNET'
      ? WalletNetwork.PUBLIC
      : WalletNetwork.TESTNET,
  selectedWalletId: HANA_ID,
  modules: [new HanaModule()],
});

/**
 * Hana wallet implementation using Stellar Wallets Kit
 * @implements {Wallet}
 * @class HanaStellarKit
 */
export class HanaStellarKit implements Wallet {
  /**
   * Check if Hana is connected
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
   * Check if Hana is allowed
   */
  async isAllowed(): Promise<boolean> {
    return true;
  }

  /**
   * Get address from Hana wallet
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
   * Sign a transaction using Hana via Stellar Wallets Kit
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
      throw new Error('Hana Stellar Kit is not connected');
    }

    console.log('[HANA STELLAR KIT UTILS] Signing transaction with opts:', opts);

    try {
      const { signedTxXdr } = await stellarKit.signTransaction(tx, {
        networkPassphrase:
          opts?.networkPassphrase ||
          (process.env.NEXT_PUBLIC_STELLAR_NETWORK === 'MAINNET'
            ? WalletNetwork.PUBLIC
            : WalletNetwork.TESTNET),
      });

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
   * Sign an authorization entry using Hana
   */
  async signAuthEntry(
    entryXdr: string,
    opts?: {
      networkPassphrase?: string | undefined;
      address?: string | undefined;
    }
  ): Promise<{
    signedAuthEntry: Buffer | null;
    signerAddress: string;
  }> {
    throw new Error('Hana via Stellar Kit does not support signing authorization entries');
  }
}
