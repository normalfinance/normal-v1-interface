'use client';

import type { AppStore, AppStorePersist } from '@normalfinance/types';
import type { AssembledTransaction } from '@stellar/stellar-sdk/contract';

import { useCallback } from 'react';
import { constants } from '@normalfinance/utils';
import { useSnackbar } from '@/components/template/snackbar';
import { Signer } from '@normalfinance/utils/build/stellar';
import { useAppStore, usePersistStore } from '@normalfinance/state';
import { useRestoreModal } from '@/providers/RestoreModalProvider';
import {
  NormalPoolContract,
  SorobanTokenContract,
  NormalPoolRouterContract,
} from '@normalfinance/contracts';

// Define Contract Types
type ContractType = 'pool' | 'pool_router' | 'token';

const contractClients = {
  pool: NormalPoolContract.Client,
  pool_router: NormalPoolRouterContract.Client,
  token: SorobanTokenContract.Client,
};

type ContractClientType<T extends ContractType> = T extends 'pool'
  ? NormalPoolContract.Client
  : T extends 'pool_router'
    ? NormalPoolRouterContract.Client
    : T extends 'token'
      ? SorobanTokenContract.Client
      : never;

interface BaseExecuteContractTransactionParams<T extends ContractType> {
  contractAddress: string;
  transactionFunction: (
    client: ContractClientType<T>,
    restore?: boolean
  ) => Promise<AssembledTransaction<any>>;
}

interface ExecuteContractTransactionParams<T extends ContractType>
  extends BaseExecuteContractTransactionParams<T> {
  contractType: T;
}

const getSigner = (storePersist: AppStorePersist, appStore: AppStore) =>
  storePersist.wallet.walletType === 'wallet-connect'
    ? appStore.walletConnectInstance
    : new Signer();

const getSignerFunction = (signer: any, storePersist: any) => (tx: string) =>
  storePersist.wallet.walletType === 'wallet-connect'
    ? signer.signTransaction(tx)
    : signer.sign(tx);

const getContractClient = <T extends ContractType>(
  contractType: T,
  contractAddress: string,
  signer: any,
  networkPassphrase: string,
  rpcUrl: string,
  publicKey: string,
  storePersist: any
): ContractClientType<T> => {
  const signTransaction = getSignerFunction(signer, storePersist);
  const commonOptions = {
    publicKey,
    contractId: contractAddress,
    networkPassphrase,
    rpcUrl,
    signTransaction: signTransaction.bind(signer),
  };

  const ClientConstructor = contractClients[contractType] as any;
  return new ClientConstructor(commonOptions);
};

export const useContractTransaction = () => {
  const { enqueueSnackbar } = useSnackbar();

  const storePersist = usePersistStore();
  const appStore = useAppStore();

  const { openRestoreModal, closeRestoreModal } = useRestoreModal();

  const executeContractTransaction = useCallback(
    async <T extends ContractType>({
      contractType,
      contractAddress,
      transactionFunction,
    }: ExecuteContractTransactionParams<T>) => {
      const signer = getSigner(storePersist, appStore);
      const networkPassphrase = constants.NETWORK_PASSPHRASE;
      const rpcUrl = constants.RPC_URL;
      const loadingMessage = 'Transaction in progress...';
      const publicKey = storePersist.wallet.address!;

      const executeTransaction = async (restore: boolean = false) => {
        try {
          // Step 1: Create the contract client and call the transaction function
          const contractClient = getContractClient(
            contractType,
            contractAddress,
            signer,
            networkPassphrase,
            rpcUrl,
            publicKey,
            storePersist
          );

          const transaction = await transactionFunction(contractClient, restore);

          console.log('Attempting to sign and send transaction...');

          // Step 2: Handle signing and sending the transaction with async toast
          // eslint-disable-next-line no-async-promise-executor
          const promise = new Promise<{ transactionId?: string }>(async (resolve, reject) => {
            try {
              if (restore) {
                console.log('Restoring transaction state...');
                await transaction.simulate({ restore: true });
                resolve({});
              } else {
                const sentTransaction = await transaction.signAndSend();
                resolve({
                  transactionId: sentTransaction.sendTransactionResponse?.hash,
                });
              }
            } catch (error) {
              console.error('Error during signing and sending:', error);

              // Check if restore is required
              if (error instanceof Error && error.message.includes('restore some contract state')) {
                openRestoreModal(async () => {
                  try {
                    await executeTransaction(true); // Retry with restore
                    resolve({});
                  } catch (restoreError) {
                    console.error('Error during restoring transaction:', restoreError);
                    reject(restoreError); // Reject with the restoration error
                  } finally {
                    closeRestoreModal();
                  }
                });
                return; // Exit early since restore will handle the resolution
              }

              reject(error); // Reject with the error
            }
          });

          // Add the promise to the toast for UI updates
          // addAsyncToast(promise, loadingMessage);
          enqueueSnackbar(loadingMessage, { variant: 'info' });

          // Delay at least 5 seconds before finishing the transaction process
          await promise;
          await new Promise((resolve) => setTimeout(resolve, 5000));
        } catch (error) {
          console.log('Unexpected error executing contract transaction', error);
          // addAsyncToast(Promise.reject(error), loadingMessage);
          enqueueSnackbar(loadingMessage, { variant: 'info' });
        }
      };

      // Start transaction execution
      await executeTransaction();
    },
    [enqueueSnackbar, storePersist, openRestoreModal, closeRestoreModal]
  );

  return {
    executeContractTransaction,
  };
};
