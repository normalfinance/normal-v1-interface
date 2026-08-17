'use client';

import type { Token } from '@normalfinance/types';
import type { Dispatch, SetStateAction } from 'react';

import { useState } from 'react';
import { useTranslate } from '@/locales';
import { BigNumber } from 'bignumber.js';
import { useStellarConfig } from '@/hooks';
import { announceTransaction } from '@/lib/tx-events';
import { detectMemoType } from '@normalfinance/utils';
import { usePersistStore } from '@normalfinance/state';
import { spendableXlm, stellarMinReserve } from '@/utils/stellar-reserve';
import { planStellarSend, MIN_ACTIVATION_XLM } from '@/lib/stellar/send-plan';
import { Memo, Asset, Horizon, Operation, TransactionBuilder } from '@stellar/stellar-sdk';

import { useSnackbar } from '@/components/template/snackbar';

import { useStellarWalletsKit } from './use-stellar-wallets-kit';
import { useWalletReconnect, WalletSessionExpiredError } from './use-wallet-reconnect';
import { useNormalWallet, NORMAL_WALLET_REIMPORT_REQUIRED_MESSAGE } from './use-normal-wallet';

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
        // Same reserve math as the send modal's MAX/validation — single source
        // of truth, so a MAX'd amount can never be rejected here.
        const spendable = spendableXlm(rawBalance, account.subentry_count);
        if (BigNumber(args.amount).gt(spendable)) {
          throw new Error(
            t(
              'Insufficient balance. You can send at most {{max}} XLM (minimum reserve: {{reserve}} XLM)',
              {
                max: spendable.toFixed(7, BigNumber.ROUND_DOWN),
                reserve: stellarMinReserve(account.subentry_count).toFixed(1),
              }
            )
          );
        }
      }

      // #32 4e — plan the send against the DESTINATION's real state BEFORE any
      // signature: a brand-new account needs createAccount (≥1 XLM), and a
      // non-XLM asset needs the destination's trustline. These used to fail
      // ON-CHAIN (op_no_destination / op_no_trust) with the fee burned and a
      // raw code as the error. Probe only classic G addresses — muxed/other
      // formats keep today's behavior.
      let destinationExists = true;
      let destinationHasTrustline: boolean | null = null;
      if (/^G[A-Z2-7]{55}$/.test(args.destination)) {
        try {
          const destAccount = await horizonServer.loadAccount(args.destination);
          if (args.token.symbol !== 'XLM') {
            destinationHasTrustline = !!destAccount.balances.find(
              (b) =>
                'asset_code' in b &&
                b.asset_code === args.token.symbol &&
                b.asset_issuer === args.token.issuer
            );
          }
        } catch (probeErr: any) {
          if (probeErr?.response?.status === 404 || probeErr?.name === 'NotFoundError') {
            destinationExists = false;
          }
          // Any other Horizon failure: leave the defaults (exists, unknown
          // trustline) — the chain stays the judge rather than a guess.
        }
      }

      const plan = planStellarSend({
        symbol: args.token.symbol,
        amount: args.amount,
        destinationExists,
        destinationHasTrustline,
      });
      if (plan.kind === 'blocked') {
        const sym = args.token.symbol;
        const messages = {
          'activation-minimum': t(
            'This account isn’t active on Stellar yet — the first transfer must be at least {{min}} XLM to activate it.',
            { min: MIN_ACTIVATION_XLM }
          ),
          'destination-not-active': t(
            'This account isn’t active on Stellar yet. Send it at least {{min}} XLM first, add a {{sym}} trustline there, and then send {{sym}}.',
            { min: MIN_ACTIVATION_XLM, sym }
          ),
          'destination-needs-trustline': t(
            'That wallet can’t hold {{sym}} yet — it needs a {{sym}} trustline. Add the asset in that wallet’s app, then try again.',
            { sym }
          ),
        } as const;
        throw new Error(messages[plan.reason]);
      }

      const tx = new TransactionBuilder(account, {
        fee: '2000',
        timebounds: { minTime: 0, maxTime: Math.floor(Date.now() / 1000) + 2 * 60 },
        networkPassphrase: config.NETWORK_PASSPHRASE,
      });

      if (plan.kind === 'create-account') {
        // First XLM to a brand-new account activates it on-chain.
        tx.addOperation(
          Operation.createAccount({
            destination: args.destination,
            startingBalance: args.amount,
          })
        );
      } else if (args.token.symbol === 'XLM') {
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

      const transaction = TransactionBuilder.fromXDR(signedXDR, config.NETWORK_PASSPHRASE);

      const result = await horizonServer.submitTransaction(transaction);

      // Announce at the primitive, not the UI: every caller (send modal,
      // withdraw card, off-ramp) gets the pending row + cache-bypassed
      // refresh, and a future caller cannot forget it.
      announceTransaction({
        chain: 'stellar',
        pendingSend: {
          txHash: result.hash,
          symbol: args.token.symbol,
          amount: args.amount,
          destination: args.destination,
        },
      });

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
