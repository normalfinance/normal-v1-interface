'use client';

import type { Token } from '@normalfinance/types';
import type { Dispatch, SetStateAction } from 'react';

import { useState } from 'react';
import { useTranslate } from '@/locales';
import { usePersistStore } from '@normalfinance/state';
import { constants, detectMemoType } from '@normalfinance/utils';
import { Memo, Asset, Horizon, Operation, TransactionBuilder } from '@stellar/stellar-sdk';

import { useSnackbar } from '@/components/template/snackbar';

import { useNormalWallet } from './use-normal-wallet';
import { useStellarWalletsKit } from './use-stellar-wallets-kit';

// ----------------------------------------------------------------------

export type TransferArgs = {
  destination: string;
  token: Token;
  amount: string;
  memo?: string;
};

interface ReturnType {
  error: string | null;
  setError: Dispatch<SetStateAction<string | null>>;
  loading: boolean;
  send: (args: TransferArgs) => Promise<string>;
}

// ----------------------------------------------------------------------

export function useSendToken(): ReturnType {
  const { t } = useTranslate();

  const { enqueueSnackbar } = useSnackbar();

  const { wallet } = usePersistStore();

  const { signTransaction: signStellarWalletKit, publicKey: stellarPublicKey } =
    useStellarWalletsKit();
  const { signTransaction: signNormalWallet, publicKey: normalPublicKey } = useNormalWallet();

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const send = async (args: TransferArgs) => {
    if (!wallet.address) {
      enqueueSnackbar(t('Cannot send asset without account or balance'), { variant: 'error' });
      return '';
    }

    try {
      setLoading(true);

      const walletType = wallet.walletType;
      const isNormalWallet = walletType === 'normal-wallet';
      const walletAddress = isNormalWallet
        ? normalPublicKey || wallet.address
        : stellarPublicKey || wallet.address;
      const signTransaction = isNormalWallet ? signNormalWallet : signStellarWalletKit;

      const horizonServer = new Horizon.Server(constants.StellarConfig.HORIZON_URL, {
        allowHttp: constants.StellarConfig.HORIZON_URL.startsWith('http://'),
      });

      const account = await horizonServer.loadAccount(walletAddress);

      const tx = new TransactionBuilder(account, {
        fee: '2000',
        timebounds: { minTime: 0, maxTime: Math.floor(Date.now() / 1000) + 2 * 60 * 1000 },
        networkPassphrase: constants.StellarConfig.NETWORK_PASSPHRASE,
      });

      // BigInt((tokenValue * 10 ** (sendToken?.decimals || 7)).toFixed(0)),
      if (args.token.symbol === 'XLM') {
        tx.addOperation(
          Operation.payment({
            destination: args.destination,
            asset: Asset.native(),
            amount: args.amount,
          })
        );
      } else {
        tx.addOperation(
          Operation.payment({
            destination: args.destination,
            asset: new Asset(args.token.symbol, args.token.issuer),
            amount: args.amount,
          })
        );
      }

      if (args.memo) {
        const memoType = detectMemoType(args.memo);

        switch (memoType) {
          case 'MEMO_TEXT':
            tx.addMemo(Memo.text(args.memo));
            break;

          case 'MEMO_ID':
            tx.addMemo(Memo.id(args.memo));
            break;

          default:
            break;
        }
      }

      const builtTx = tx.build();

      const unsignedXDR = builtTx.toXDR();

      const signedXDR = isNormalWallet
        ? await signTransaction(unsignedXDR, constants.StellarConfig.NETWORK_PASSPHRASE)
        : await signTransaction(unsignedXDR);

      if (signedXDR) {
        const transaction = TransactionBuilder.fromXDR(
          signedXDR,
          constants.StellarConfig.NETWORK_PASSPHRASE
        );

        const result = await horizonServer.submitTransaction(transaction);
        return result.hash;
      }

      return '';
    } catch (err: any) {
      console.log({ err });
      setError(err);
      return '';
    } finally {
      setLoading(false);
    }
  };

  return {
    error,
    setError,
    loading,
    send,
  };
}
