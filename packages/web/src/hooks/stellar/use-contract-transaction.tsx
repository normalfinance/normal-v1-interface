'use client';

import type { AssembledTransaction } from '@stellar/stellar-sdk/lib/contract';
import type { AppStore, ContractType, AppStorePersist } from '@normalfinance/types';

import { useCallback } from 'react';
import { useTranslate } from '@/locales';
import { Signer } from '@normalfinance/utils/build/stellar';
import { constants, trackEvent } from '@normalfinance/utils';
import { useRestoreModal } from '@/providers/RestoreModalProvider';
import { useAppStore, usePersistStore } from '@normalfinance/state';
import { TransactionType, type TransactionDetails } from '@/types/transaction';
import { getTransactionMessages, createStellarExpertUrl } from '@/utils/transactions.utils';
import {
  PoolContract,
  BufferContract,
  PoolRouterContract,
  PoolSwapFeeContract,
  SorobanTokenContract,
  InsuranceFundContract,
  OracleRegistryContract,
  LiquidityCalculatorContract,
} from '@normalfinance/contracts';

import Box from '@mui/material/Box';
import Button from '@mui/material/Button';

import { closeSnackbar, enqueueSnackbar } from '@/components/template/snackbar';

const logToFile = async (message: string) => {
  try {
    await fetch('/api/log', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message }),
    });
  } catch (error) {
    console.error('Failed to log to file:', error);
  }
};

const contractClients = {
  oracle_registry: OracleRegistryContract.Client,
  pool_swap_fee: PoolSwapFeeContract.Client,
  pool: PoolContract.Client,
  pool_router: PoolRouterContract.Client,
  buffer: BufferContract.Client,
  insurance_fund: InsuranceFundContract.Client,
  liquidity_calculator: LiquidityCalculatorContract.Client,
  token: SorobanTokenContract.Client,
};

type ContractClientType<T extends ContractType> = T extends 'oracle_registry'
  ? OracleRegistryContract.Client
  : T extends 'pool_swap_fee'
    ? PoolSwapFeeContract.Client
    : T extends 'pool'
      ? PoolContract.Client
      : T extends 'pool_router'
        ? PoolRouterContract.Client
        : T extends 'buffer'
          ? BufferContract.Client
          : T extends 'insurance_fund'
            ? InsuranceFundContract.Client
            : T extends 'liquidity_calculator'
              ? LiquidityCalculatorContract.Client
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
      const networkPassphrase = constants.StellarConfig.NETWORK_PASSPHRASE;
      const rpcUrl = constants.StellarConfig.RPC_URL;
      const publicKey = storePersist.wallet.address!;

      const run = async (
        restore: boolean = false
      ): Promise<{ txHash?: string; notify: boolean }> => {
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

        console.log('Transaction from backend: ', transaction);

        try {
          if (restore) {
            console.log('Restoring transaction state...');
            await transaction.simulate({ restore: true });
            return { notify: transactionDetails.type !== TransactionType.ESTIMATE_SWAP };
          }
          const txHash = (transaction as any).hash || null;

          if (txHash) {
            const timestamp = new Date().toISOString();
            const transactionType = transactionDetails.type || 'unknown';
            const walletAddress = publicKey || 'unknown';
            const logMessage = `[${timestamp}], ${transactionType}, ${txHash}, ${walletAddress}`;
            await logToFile(logMessage);
          }

          trackEvent('transaction_successful', {
            txHash,
            contractName: contractType,
            contractAddress,
            method: transactionDetails.type,
          });

          return {
            txHash,
            notify: transactionDetails.type !== TransactionType.ESTIMATE_SWAP,
          };
        } catch (error) {
          console.error('Error during returning transaction hash: ', error);

          trackEvent('transaction_failed', {
            error: (error as any).toString(),
            contractName: contractType,
            contractAddress,
            method: transactionDetails.type,
          });

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

          if (result.notify) {
            if (result.txHash) {
              const stellarExpertUrl = createStellarExpertUrl('tx', result.txHash);

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
                  autoHideDuration: 7500,
                }
              );
            } else {
              enqueueSnackbar(messages.success, {
                variant: 'success',
                persist: false,
                autoHideDuration: 7500,
              });
            }
          }

          return result;
        })
        .catch((error) => {
          closeSnackbar(loadingKey);

          enqueueSnackbar(messages.error, {
            variant: 'error',
            persist: true,
            autoHideDuration: 7500,
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
