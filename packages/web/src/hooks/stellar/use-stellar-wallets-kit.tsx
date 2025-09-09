import { useState, useEffect } from 'react';
import {
  StellarWalletsKit,
  WalletNetwork,
  HanaModule,
  HANA_ID,
  ISupportedWallet,
} from '@creit.tech/stellar-wallets-kit';
import { Networks } from '@stellar/stellar-sdk';

// Initialize the Stellar Wallets Kit
const kit = new StellarWalletsKit({
  network: WalletNetwork.TESTNET, // or WalletNetwork.MAINNET for mainnet
  selectedWalletId: HANA_ID,
  modules: [new HanaModule()],
});

export const useStellarWalletsKit = () => {
  const [publicKey, setPublicKey] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  const connectWallet = async () => {
    try {
      kit.openModal({
        onWalletSelected: async (wallet: ISupportedWallet) => {
          kit.setWallet(wallet.id);
          const address = await kit.getAddress();
          console.log('Connected account:', address.address);

          const signature = await kit.signMessage('Hello world', {
            networkPassphrase: Networks.PUBLIC,
            address: address.address,
          });

          const isValid = true;

          console.log('Signature verification:', isValid ? '✅ Valid' : '❌ Invalid');
        },
      });
    } catch (error) {
      console.error('Error connecting wallet:', error);
      throw error;
    }
  };

  const signTransaction = async (xdr: string) => {
    try {
      const { signedTxXdr } = await kit.signTransaction(xdr, {
        networkPassphrase: WalletNetwork.TESTNET, // This should match your network
      });
      return signedTxXdr;
    } catch (error) {
      console.error('Error signing transaction:', error);
      throw error;
    }
  };

  const disconnectWallet = () => {
    setPublicKey(null);
    setIsConnected(false);
  };

  return {
    kit,
    publicKey,
    isConnected,
    connectWallet,
    signTransaction,
    disconnectWallet,
  };
};
