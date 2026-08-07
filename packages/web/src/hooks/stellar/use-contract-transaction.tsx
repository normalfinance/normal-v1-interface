'use client';

import type { ContractType } from '@normalfinance/types';
import type { SnackbarKey } from '@/components/template/snackbar';
import type { AssembledTransaction } from '@stellar/stellar-sdk/contract';

import { useCallback } from 'react';
import { paths } from '@/routes/paths';
import { useTranslate } from '@/locales';
import { useStellarConfig } from '@/hooks';
import { useRouter } from 'next/navigation';
import { logger } from '@normalfinance/utils';
import { usePersistStore } from '@normalfinance/state';
import { type TransactionDetails } from '@/types/transaction';
import { useStellarWalletsKit } from '@/hooks/stellar/use-stellar-wallets-kit';
import { getTransactionMessages, createStellarExpertUrl } from '@/utils/transactions.utils';
import {
  useWalletReconnect,
  WalletSessionExpiredError,
} from '@/hooks/stellar/use-wallet-reconnect';
import {
  useNormalWallet,
  NORMAL_WALLET_REIMPORT_REQUIRED_MESSAGE,
} from '@/hooks/stellar/use-normal-wallet';
import {
  TreasuryContract,
  IndexFundContract,
  SorobanTokenContract,
  LongShortPairContract,
  IndexFundFactoryContract,
  LongShortPairFactoryContract,
} from '@normalfinance/contracts';

import Box from '@mui/material/Box';
import Button from '@mui/material/Button';

import { closeSnackbar, enqueueSnackbar } from '@/components/template/snackbar';

const contractClients = {
  long_short_pair_factory: LongShortPairFactoryContract.Client,
  long_short_pair: LongShortPairContract.Client,
  treasury: TreasuryContract.Client,
  token: SorobanTokenContract.Client,
  index_fund: IndexFundContract.Client,
  index_fund_factory: IndexFundFactoryContract.Client,
};

type ContractClientType<T extends ContractType> = T extends 'treasury'
  ? TreasuryContract.Client
  : T extends 'long_short_pair'
    ? LongShortPairContract.Client
    : T extends 'long_short_pair_factory'
      ? LongShortPairFactoryContract.Client
      : T extends 'token'
        ? SorobanTokenContract.Client
        : T extends 'index_fund'
          ? IndexFundContract.Client
          : T extends 'index_fund_factory'
            ? IndexFundFactoryContract.Client
            : never;

interface BaseExecuteContractTransactionParams<T extends ContractType> {
  contractAddress: string;
  transactionFunction: (client: ContractClientType<T>) => Promise<AssembledTransaction<any>>;
  transactionDetails: TransactionDetails;
}

interface ExecuteContractTransactionParams<T extends ContractType>
  extends BaseExecuteContractTransactionParams<T> {
  contractType: T;
}

const getContractClient = <T extends ContractType>(
  contractType: T,
  contractAddress: string,
  signTransaction: (xdr: string) => Promise<{ signedTxXdr: string }>,
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
  const config = useStellarConfig();
  const { publicKey: stellarPublicKey } = useStellarWalletsKit();
  const {
    signTransaction: signNormalWallet,
    publicKey: normalPublicKey,
    canSign: normalCanSign,
  } = useNormalWallet();
  const { signOrReconnect } = useWalletReconnect();
  const { t } = useTranslate();
  const router = useRouter();

  const executeContractTransaction = useCallback(
    <T extends ContractType>({
      contractType,
      contractAddress,
      transactionFunction,
      transactionDetails,
    }: ExecuteContractTransactionParams<T>) => {
      const networkPassphrase = config.NETWORK_PASSPHRASE;
      const rpcUrl = config.RPC_URL;

      // Determine wallet type and get appropriate address and sign function
      const walletType = storePersist.wallet.walletType;
      const isNormalWallet = walletType === 'normal-wallet';
      if (isNormalWallet && !normalCanSign) {
        throw new Error(NORMAL_WALLET_REIMPORT_REQUIRED_MESSAGE);
      }
      const walletAddress = isNormalWallet
        ? normalPublicKey || storePersist.wallet.address
        : stellarPublicKey || storePersist.wallet.address;
      const signTransaction = isNormalWallet ? signNormalWallet : signOrReconnect;

      if (!walletAddress) {
        throw new Error('No wallet connected');
      }

      logger.log('[USE CONTRACT TRANSACTION] Wallet address:', walletAddress);
      logger.log('[USE CONTRACT TRANSACTION] Wallet type:', walletType);
      logger.log('[USE CONTRACT TRANSACTION] PublicKey from kit:', stellarPublicKey);
      logger.log('[USE CONTRACT TRANSACTION] PublicKey from Normal wallet:', normalPublicKey);
      logger.log('[USE CONTRACT TRANSACTION] Address from persist:', storePersist.wallet.address);

      logger.log('[USE CONTRACT TRANSACTION] Network passphrase:', networkPassphrase);

      const run = async (): Promise<{ txHash?: string; notify: boolean }> => {
        // Add safety check for signTransaction function
        const safeSignTransaction = async (xdr: string) => {
          try {
            logger.log('[USE CONTRACT TRANSACTION] signTransaction input XDR length:', xdr?.length);
            logger.log(
              '[USE CONTRACT TRANSACTION] signTransaction input XDR prefix:',
              xdr?.slice?.(0, 20)
            );

            if (!signTransaction) {
              throw new Error('Sign transaction function not available');
            }

            const res = await signTransaction(xdr, networkPassphrase);

            logger.log('[USE CONTRACT TRANSACTION] signTransaction raw result:', res);
            logger.log('[USE CONTRACT TRANSACTION] signTransaction raw typeof:', typeof res);

            // Many wallet kits return { signedXDR } / { signedXdr } rather than a string
            const signedXdr =
              typeof res === 'string'
                ? res
                : ((res as any)?.signedXDR ??
                  (res as any)?.signedXdr ??
                  (res as any)?.xdr ??
                  (res as any)?.result?.signedXDR ??
                  (res as any)?.result?.signedXdr);

            if (!signedXdr || typeof signedXdr !== 'string') {
              throw new Error(
                `Wallet did not return a signed XDR string. Got: ${JSON.stringify(res)}`
              );
            }

            logger.log('[USE CONTRACT TRANSACTION] signed XDR length:', signedXdr.length);
            logger.log('[USE CONTRACT TRANSACTION] signed XDR prefix:', signedXdr.slice(0, 20));

            // Return Freighter-compatible shape expected by stellar-sdk contracts
            return { signedTxXdr: signedXdr };
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

        let transaction: AssembledTransaction<any>;
        try {
          transaction = await transactionFunction(contractClient);
          logger.log('[USE CONTRACT TRANSACTION] got AssembledTransaction:', transaction);
        } catch (e) {
          logger.error('[USE CONTRACT TRANSACTION] transactionFunction failed:', e);
          throw e;
        }

        logger.log('Transaction from backend: ', transaction);

        try {
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

          return {
            txHash,
            notify: true,
          };
        } catch (error) {
          logger.error('Error during returning transaction hash: ', error);
          throw error;
        }
      };

      const messages = getTransactionMessages(transactionDetails);

      let loadingKey: SnackbarKey | null = null;

      loadingKey = enqueueSnackbar(messages.loading, {
        variant: 'info',
        persist: true,
      });

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

          // router push
          if (result.txHash) router.replace(paths.transaction.details(result.txHash));

          return result;
        })
        .catch((error) => {
          if (error instanceof WalletSessionExpiredError) {
            if (loadingKey) closeSnackbar(loadingKey);
            throw error;
          }
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
    [
      storePersist,
      config,
      signOrReconnect,
      signNormalWallet,
      stellarPublicKey,
      normalPublicKey,
      normalCanSign,
      router,
      t,
    ]
  );

  return {
    executeContractTransaction,
  };
};
