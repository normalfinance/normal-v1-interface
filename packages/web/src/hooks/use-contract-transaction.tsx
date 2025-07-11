'use client';

import type { TransactionDetails } from '@/types/transaction';
import type { AppStore, AppStorePersist } from '@normalfinance/types';
import type { AssembledTransaction } from '@stellar/stellar-sdk/lib/contract';

import { useCallback } from 'react';
import { useTranslate } from '@/locales';
import { constants } from '@normalfinance/utils';
import { Signer } from '@normalfinance/utils/build/stellar';
import { useRestoreModal } from '@/providers/RestoreModalProvider';
import { useAppStore, usePersistStore } from '@normalfinance/state';
import { getTransactionMessages, createStellarExpertUrl } from '@/utils/transactions.utils';
import {
  NormalPoolContract,
  SorobanTokenContract,
  NormalPoolRouterContract,
} from '@normalfinance/contracts';

import Box from '@mui/material/Box';
import Button from '@mui/material/Button';

import { closeSnackbar, enqueueSnackbar } from '@/components/template/snackbar';

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
  transactionDetails: TransactionDetails;
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
  const storePersist = usePersistStore();
  const appStore = useAppStore();
  const { t } = useTranslate();

  const { openRestoreModal, closeRestoreModal } = useRestoreModal();

  const executeContractTransaction = useCallback(
    <T extends ContractType>({
      contractType,
      contractAddress,
      transactionFunction,
      transactionDetails,
    }: ExecuteContractTransactionParams<T>) => {
      const signer = getSigner(storePersist, appStore);
      const networkPassphrase = constants.NETWORK_PASSPHRASE;
      const rpcUrl = constants.RPC_URL;
      const publicKey = storePersist.wallet.address!;

      const run = async (restore: boolean = false): Promise<{ transactionId?: string }> => {
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

        try {
          if (restore) {
            console.log('Restoring transaction state...');
            await transaction.simulate({ restore: true });
            return {};
          }
          const sentTransaction = await transaction.signAndSend();
          return {
            transactionId: sentTransaction.sendTransactionResponse?.hash,
          };
        } catch (error) {
          console.error('Error during signing and sending:', error);

          if (error instanceof Error && error.message.includes('restore some contract state')) {
            return new Promise((resolve, reject) => {
              openRestoreModal(async () => {
                try {
                  const result = await run(true);
                  resolve(result);
                } catch (restoreError) {
                  console.error('Error during restoring transaction:', restoreError);
                  reject(restoreError);
                } finally {
                  closeRestoreModal();
                }
              });
            });
          }
          throw error;
        }
      };

      const messages = getTransactionMessages(transactionDetails);

      const loadingKey = enqueueSnackbar(messages.loading, {
        variant: 'info',
        persist: true,
      });

      return run()
        .then((result) => {
          closeSnackbar(loadingKey);

          if (result.transactionId) {
            const stellarExpertUrl = createStellarExpertUrl(result.transactionId);

            enqueueSnackbar(
              <Box component="span">
                {messages.success}{' '}
                <Button
                  size="small"
                  onClick={() => window.open(stellarExpertUrl, '_blank', 'noopener,noreferrer')}
                  sx={{
                    textTransform: 'none',
                    minWidth: 'auto',
                    p: 0,
                    textDecoration: 'underline',
                    '&:hover': {
                      textDecoration: 'underline',
                      backgroundColor: 'transparent',
                    },
                  }}
                >
                  {t('View More')}
                </Button>
              </Box>,
              {
                variant: 'success',
                persist: false,
              }
            );
          } else {
            enqueueSnackbar(messages.success, {
              variant: 'success',
              persist: false,
            });
          }

          return result;
        })
        .catch((error) => {
          closeSnackbar(loadingKey);

          enqueueSnackbar(messages.error, {
            variant: 'error',
            persist: true,
          });

          throw error;
        });
    },
    [storePersist, appStore, openRestoreModal, closeRestoreModal]
  );

  return {
    executeContractTransaction,
  };
};
