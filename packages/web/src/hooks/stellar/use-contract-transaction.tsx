'use client';

import type { ContractType } from '@normalfinance/types';
import type { SnackbarKey } from '@/components/template/snackbar';
import type { AssembledTransaction } from '@stellar/stellar-sdk/lib/contract';

import { useCallback } from 'react';
import { useTranslate } from '@/locales';
import { usePersistStore } from '@normalfinance/state';
import { constants, trackEvent, logger } from '@normalfinance/utils';
import { useRestoreModal } from '@/providers/RestoreModalProvider';
import { useStellarWalletsKit } from '@/hooks/stellar/use-stellar-wallets-kit';
import { TransactionType, type TransactionDetails } from '@/types/transaction';
import { getTransactionMessages, createStellarExpertUrl } from '@/utils/transactions.utils';
import {
  PoolContract,
  LpTokenContract,
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

const contractClients = {
  oracle_registry: OracleRegistryContract.Client,
  pool_swap_fee: PoolSwapFeeContract.Client,
  pool: PoolContract.Client,
  pool_router: PoolRouterContract.Client,
  insurance_fund: InsuranceFundContract.Client,
  liquidity_calculator: LiquidityCalculatorContract.Client,
  lp_token: LpTokenContract.Client,
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
        : T extends 'insurance_fund'
          ? InsuranceFundContract.Client
          : T extends 'liquidity_calculator'
            ? LiquidityCalculatorContract.Client
            : T extends 'lp_token'
              ? LpTokenContract.Client
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

const getContractClient = <T extends ContractType>(
  contractType: T,
  contractAddress: string,
  signTransaction: (xdr: string) => Promise<string>,
  networkPassphrase: string,
  rpcUrl: string,
  publicKey: string
): ContractClientType<T> => {
  const commonOptions = {
    publicKey,
    contractId: contractAddress,
    networkPassphrase,
    rpcUrl,
    signTransaction,
  };

  const ClientConstructor = contractClients[contractType] as any;
  return new ClientConstructor(commonOptions);
};

export const useContractTransaction = () => {
  const storePersist = usePersistStore();
  const { signTransaction, publicKey } = useStellarWalletsKit();
  const { t } = useTranslate();

  const { openRestoreModal, closeRestoreModal } = useRestoreModal();

  const executeContractTransaction = useCallback(
    <T extends ContractType>({
      contractType,
      contractAddress,
      transactionFunction,
      transactionDetails,
    }: ExecuteContractTransactionParams<T>) => {
      const networkPassphrase = constants.StellarConfig.NETWORK_PASSPHRASE;
      const rpcUrl = constants.StellarConfig.RPC_URL;
      const walletAddress = publicKey || storePersist.wallet.address;

      if (!walletAddress) {
        throw new Error('No wallet connected');
      }

      logger.log('[USE CONTRACT TRANSACTION] Wallet address:', walletAddress);
      logger.log('[USE CONTRACT TRANSACTION] PublicKey from kit:', publicKey);
      logger.log('[USE CONTRACT TRANSACTION] Address from persist:', storePersist.wallet.address);

      logger.log('[USE CONTRACT TRANSACTION] Network passphrase:', networkPassphrase);

      const run = async (
        restore: boolean = false
      ): Promise<{ txHash?: string; notify: boolean }> => {
        // Add safety check for signTransaction function
        const safeSignTransaction = async (xdr: string) => {
          try {
            logger.log('[USE CONTRACT TRANSACTION] Attempting to sign transaction...');
            if (!signTransaction) {
              throw new Error('Sign transaction function not available');
            }
            const result = await signTransaction(xdr);
            logger.log('[USE CONTRACT TRANSACTION] Transaction signed successfully');
            return result;
          } catch (error) {
            logger.error('[USE CONTRACT TRANSACTION] Error during transaction signing:', error);
            throw error;
          }
        };

        const contractClient = getContractClient(
          contractType,
          contractAddress,
          safeSignTransaction,
          networkPassphrase,
          rpcUrl,
          walletAddress
        );

        const transaction = await transactionFunction(contractClient, restore);

        logger.log('Transaction from backend: ', transaction);

        try {
          if (restore) {
            logger.log('Restoring transaction state...');
            await transaction.simulate({ restore: true });
            return { notify: transactionDetails.type !== TransactionType.ESTIMATE_SWAP };
          }
          const txHash = (transaction as any).hash || null;

          if (txHash) {
            const timestamp = new Date().toISOString();
            const transactionType = transactionDetails.type || 'unknown';
            logger.log('[USE CONTRACT TRANSACTION] Transactionn hash:', txHash);
            logger.log('[USE CONTRACT TRANSACTION] Transactionn type:', transactionType);
            logger.log('[USE CONTRACT TRANSACTION] Transactionn Time:', timestamp);

            logger.log(
              `[${timestamp}] Transaction ${transactionType} completed for ${walletAddress}: ${txHash}`
            );
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
          logger.error('Error during returning transaction hash: ', error);

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
                  logger.error('Error during restoring transaction:', restoreError);
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

      let loadingKey: SnackbarKey | null = null;
      if (transactionDetails.type !== TransactionType.ESTIMATE_SWAP) {
        loadingKey = enqueueSnackbar(messages.loading, {
          variant: 'info',
          persist: true,
        });
      }

      return run()
        .then((result) => {
          if (loadingKey) closeSnackbar(loadingKey);

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
          logger.error('Error during contract transaction: ', error);
          if (loadingKey) closeSnackbar(loadingKey);

          enqueueSnackbar(messages.error, {
            variant: 'error',
            persist: true,
            autoHideDuration: 7500,
          });

          throw error;
        });
    },
    [storePersist, signTransaction, openRestoreModal, closeRestoreModal, t]
  );

  return {
    executeContractTransaction,
  };
};
