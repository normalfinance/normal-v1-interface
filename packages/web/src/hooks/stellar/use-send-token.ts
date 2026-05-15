'use client';

import type { Token } from '@normalfinance/types';
import type { Dispatch, SetStateAction } from 'react';

import { useState } from 'react';
import { useTranslate } from '@/locales';
import { BigNumber } from 'bignumber.js';
import { useStellarConfig } from '@/hooks';
import { detectMemoType } from '@normalfinance/utils';
import { usePersistStore } from '@normalfinance/state';
import { Memo, Asset, Horizon, Operation, TransactionBuilder } from '@stellar/stellar-sdk';

import { useSnackbar } from '@/components/template/snackbar';

import { useStellarWalletsKit } from './use-stellar-wallets-kit';
import { useWalletReconnect, WalletSessionExpiredError } from './use-wallet-reconnect';
import { useNormalWallet, NORMAL_WALLET_REIMPORT_REQUIRED_MESSAGE } from './use-normal-wallet';
import { useWalletReconnect, WalletSessionExpiredError } from './use-wallet-reconnect';

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
  const config = useStellarConfig();

  const { publicKey: stellarPublicKey } = useStellarWalletsKit();
  const { signOrReconnect } = useWalletReconnect();
  const {
    signTransaction: signNormalWallet,
    publicKey: normalPublicKey,
    canSign: normalCanSign,
  } = useNormalWallet();

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
      if (isNormalWallet && !normalCanSign) {
        throw new Error(NORMAL_WALLET_REIMPORT_REQUIRED_MESSAGE);
      }
      const walletAddress = isNormalWallet
        ? normalPublicKey || wallet.address
        : stellarPublicKey || wallet.address;
      const signTransaction = isNormalWallet ? signNormalWallet : signOrReconnect;

      const horizonServer = new Horizon.Server(config.HORIZON_URL, {
        allowHttp: config.HORIZON_URL.startsWith('http://'),
      });

      const account = await horizonServer.loadAccount(walletAddress);

      if (args.token.symbol === 'XLM') {
        const xlmBalance = account.balances.find((b) => b.asset_type === 'native');
        const rawBalance = xlmBalance?.balance ?? '0';
        const minReserve = BigNumber(2 + account.subentry_count).multipliedBy('0.5');
        const spendable = BigNumber(rawBalance).minus(minReserve).minus('0.0002');
        if (BigNumber(args.amount).gt(spendable)) {
          throw new Error(
            t('Insufficient balance. You can send at most {{max}} XLM (minimum reserve: {{reserve}} XLM)', {
              max: BigNumber.max(spendable, 0).toFixed(7, BigNumber.ROUND_DOWN),
              reserve: minReserve.toFixed(1),
            })
          );
        }
      }

      const tx = new TransactionBuilder(account, {
        fee: '2000',
        timebounds: { minTime: 0, maxTime: Math.floor(Date.now() / 1000) + 2 * 60 },
        networkPassphrase: config.NETWORK_PASSPHRASE,
      });

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
        ? await signTransaction(unsignedXDR, config.NETWORK_PASSPHRASE)
        : await signTransaction(unsignedXDR);

      if (!signedXDR) {
        throw new Error('Transaction signing failed — no signed XDR returned');
      }

      const transaction = TransactionBuilder.fromXDR(
        signedXDR,
        config.NETWORK_PASSPHRASE
      );

      const result = await horizonServer.submitTransaction(transaction);
      return result.hash;
    } catch (err: any) {
      if (err instanceof WalletSessionExpiredError) return '';
      const resultCodes = err?.response?.data?.extras?.result_codes;
      const stellarError = resultCodes
        ? `${resultCodes.transaction ?? ''} ${(resultCodes.operations ?? []).join(' ')}`.trim()
        : null;
      const message = stellarError || err?.message || 'Transaction failed';
      console.error('[SEND TOKEN] Transaction failed:', err, resultCodes ?? '');
      enqueueSnackbar(t(message), { variant: 'error' });
      setError(message);
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
