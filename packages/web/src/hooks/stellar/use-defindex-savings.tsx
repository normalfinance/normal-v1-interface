'use client';

import type { Dispatch, SetStateAction } from 'react';
import type { OptionsObject, SnackbarMessage } from 'notistack';
import type { VaultInfo, SavingsPosition } from '@/types/savings';

// The savings read (vault metadata + user position), its localStorage cache,
// and the indexer-lag merge now live in `useSavingsPosition` — one deduped SWR
// shared across all views. This hook consumes it for the read and keeps the
// deposit/withdraw transaction engine.
import { useTranslate } from '@/locales';
import { useStellarConfig } from '@/hooks';
import { buildAuthHeaders } from '@/utils/http';
import { usePersistStore } from '@normalfinance/state';
import { postTransactionLog } from '@/lib/log-transaction';
import { getSavingsUsdcIssuer } from '@/utils/token-selectors';
import { useRef, useState, useEffect, useCallback } from 'react';
import { normalizeSignedXDR } from '@/utils/normalize-signed-xdr';
import { FEE_PAIR_TIMEOUT_SECONDS } from '@/lib/build-fee-payment';
import { Asset, Horizon, TransactionBuilder } from '@stellar/stellar-sdk';
import { getYieldCommission, getSavingsDepositFee } from '@/utils/normal-fees';
import { submitFeePair, getTransactionSequence } from '@/lib/stellar/fee-pair';
import { parseHorizonError, createStellarExpertUrl } from '@/utils/transactions.utils';

const WALLET_RECONNECT_REQUIRED_MESSAGE =
  'Your wallet session has expired. Please disconnect and reconnect your wallet, then try again.';

function parseSigningError(err: any): string {
  const msg: string = err?.message ?? '';
  if (msg.toLowerCase().includes('connection key') || msg.toLowerCase().includes('walletconnect')) {
    return WALLET_RECONNECT_REQUIRED_MESSAGE;
  }
  return parseHorizonError(err);
}

import { bumpSavingsReadEpoch } from '@/lib/savings-read-guard';

import Box from '@mui/material/Box';
import Button from '@mui/material/Button';

import { useSnackbar } from '@/components/template/snackbar';

import { useStellarWalletsKit } from './use-stellar-wallets-kit';
import { useSavingsPosition, POSITION_SYNC_EVENT } from '../use-savings-position';
import { useWalletReconnect, WalletSessionExpiredError } from './use-wallet-reconnect';
import { useNormalWallet, NORMAL_WALLET_REIMPORT_REQUIRED_MESSAGE } from './use-normal-wallet';

// ----------------------------------------------------------------------

interface UseDefindexSavingsReturn {
  error: string | null;
  setError: Dispatch<SetStateAction<string | null>>;
  fetchError: string | null;
  loading: boolean;
  fetching: boolean;
  positionFetching: boolean;
  vaultInfo: VaultInfo | null;
  userPosition: SavingsPosition | null;
  needsTrustline: boolean;
  setNeedsTrustline: Dispatch<SetStateAction<boolean>>;
  txStep: string | null;
  deposit: (amount: string) => Promise<string>;
  withdraw: (amount: string) => Promise<string>;
  refreshVaultInfo: () => Promise<void>;
  refreshUserPosition: () => Promise<void>;
}

function enqueueSuccessWithStellarExpert(
  enqueueSnackbar: (message: SnackbarMessage, options?: OptionsObject) => string | number | null,
  t: ReturnType<typeof useTranslate>['t'],
  successMessage: string,
  txHash: string
) {
  const stellarExpertUrl = createStellarExpertUrl('tx', txHash);
  enqueueSnackbar(
    <Box component="span">
      {successMessage}{' '}
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
}

// ----------------------------------------------------------------------

export function useDefindexSavings(): UseDefindexSavingsReturn {
  const { t } = useTranslate();
  const { enqueueSnackbar } = useSnackbar();
  const { wallet, getAllTokens } = usePersistStore();
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
  const [needsTrustline, setNeedsTrustline] = useState(false);
  const [txStep, setTxStep] = useState<string | null>(null);

  // Read (vault metadata + user position) from the shared, deduped savings hook
  // — one fetch across all views instead of one per mount.
  const savings = useSavingsPosition();
  const vaultInfo = savings.vaultInfo;
  const userPosition = savings.position;
  const fetching = savings.vaultLoading;
  const positionFetching = savings.positionLoading;
  const fetchError = savings.vaultError
    ? ((savings.vaultError as Error)?.message ?? 'Failed to fetch vault info')
    : null;

  // Latest savings handle + position, read by the tx callbacks without being deps.
  const savingsRef = useRef(savings);
  useEffect(() => {
    savingsRef.current = savings;
  });
  const userPositionRef = useRef(savings.position);
  useEffect(() => {
    userPositionRef.current = savings.position;
  }, [savings.position]);

  // Post-operation refresh timeouts (cancelled before a new op starts).
  const refreshTimeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  // Refreshes delegate to the shared savings hook (deduped + cached).
  const refreshVaultInfo = useCallback(async () => {
    savingsRef.current.refreshVault();
  }, []);
  const refreshUserPosition = useCallback(async () => {
    savingsRef.current.refreshPosition();
  }, []);

  // Deposit to vault — two transactions signed up front, submitted as a pair
  // (#26): (1) DeFindex deposit for the net amount, (2) classic USDC fee
  // payment chained one sequence number behind it. Nothing is submitted until
  // BOTH signatures exist, and the server escrows the signed fee before
  // submitting the deposit — so a rejection costs nothing, and a successful
  // deposit always ends up paired with its fee (cron sweeper as backstop).
  const deposit = useCallback(
    async (amount: string): Promise<string> => {
      if (!wallet.address) {
        enqueueSnackbar(t('Please connect your wallet first'), { variant: 'error' });
        return '';
      }

      if (!vaultInfo?.address) {
        enqueueSnackbar(t('Vault not configured'), { variant: 'error' });
        return '';
      }

      const parsedAmount = parseFloat(amount);
      if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
        enqueueSnackbar(t('Enter a valid amount'), { variant: 'error' });
        return '';
      }

      // Snapshot the position BEFORE anything moves. The optimistic update at
      // the end must be computed from this fixed point, never from the live
      // ref: a background refresh landing mid-flow would already include this
      // deposit, and applying the delta again would count it twice.
      const positionBefore = userPositionRef.current;

      const feeAmount = getSavingsDepositFee(parsedAmount);
      const netAmount = +(parsedAmount - feeAmount).toFixed(7);

      try {
        setLoading(true);
        setError(null);
        setNeedsTrustline(false);

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

        // Sign WITHOUT submitting — submission happens server-side as a pair.
        const signOnly = async (xdr: string) => {
          const signResult = await signTransaction(xdr, config.NETWORK_PASSPHRASE);
          const signedXDR = normalizeSignedXDR(signResult);
          if (!signedXDR) throw new Error('Transaction signing failed — no signed XDR returned');
          return signedXDR;
        };

        // Pre-flight: verify USDC balance matches the expected issuer and
        // covers the full deposit amount (fee + net) before signing anything.
        const usdcIssuer = getSavingsUsdcIssuer(config);
        if (!usdcIssuer) {
          throw new Error('USDC issuer is not configured for this network');
        }
        const usdcAsset = new Asset('USDC', usdcIssuer);
        const usdcAssetId = usdcAsset.toString(); // "USDC:G..."
        setTxStep('checking');
        try {
          const account = await horizonServer.loadAccount(walletAddress);
          const usdcBalance = account.balances.find(
            (b) =>
              b.asset_type === 'credit_alphanum4' &&
              (b as Horizon.HorizonApi.BalanceLine<'credit_alphanum4'>).asset_code === 'USDC' &&
              (b as Horizon.HorizonApi.BalanceLine<'credit_alphanum4'>).asset_issuer === usdcIssuer
          );
          console.log('usdcBalance', usdcBalance);
          if (!usdcBalance) {
            const anyUsdc = account.balances.find(
              (b) =>
                b.asset_type === 'credit_alphanum4' &&
                (b as Horizon.HorizonApi.BalanceLine<'credit_alphanum4'>).asset_code === 'USDC'
            );
            console.log('anyUsdc', anyUsdc);
            if (anyUsdc) {
              const wrongIssuer = (anyUsdc as Horizon.HorizonApi.BalanceLine<'credit_alphanum4'>)
                .asset_issuer;
              throw new Error(
                `You have USDC from a different issuer (${wrongIssuer.slice(0, 8)}…) — the app requires ${usdcAssetId}. Please fund your wallet with the correct USDC on ${config.NETWORK_PASSPHRASE.includes('Test') ? 'testnet' : 'mainnet'}.`
              );
            }
            throw new Error(
              `No ${usdcAssetId} balance found. Please add a USDC trustline and fund your wallet before depositing.`
            );
          }
          const available = parseFloat(usdcBalance.balance);
          const needed = parsedAmount; // fee + net
          if (available < needed) {
            throw new Error(
              `Insufficient USDC balance: you have ${available.toFixed(2)} USDC but need ${needed.toFixed(2)} USDC (${feeAmount.toFixed(2)} fee + ${netAmount.toFixed(2)} deposit).`
            );
          }
        } catch (balanceErr: any) {
          if (
            balanceErr.message.startsWith('Insufficient') ||
            balanceErr.message.startsWith('You have USDC') ||
            balanceErr.message.startsWith('No ')
          ) {
            throw balanceErr;
          }
          // Horizon load failure — proceed and let the tx surface the error naturally
          console.warn('Could not pre-check USDC balance:', balanceErr.message);
        }

        // 1. Build the DeFindex deposit XDR for the NET amount. It carries
        // the account's next sequence number — the fee tx chains behind it.
        const depositResponse = await fetch('/api/savings/deposit', {
          method: 'POST',
          headers: { ...(await buildAuthHeaders()), 'Content-Type': 'application/json' },
          body: JSON.stringify({ amount: netAmount.toFixed(7), caller: walletAddress }),
        });
        const depositData = await depositResponse.json();
        if (!depositData.success) {
          throw new Error(depositData.error || 'Failed to build deposit transaction');
        }
        if (!depositData.xdr) {
          throw new Error('No transaction XDR returned from DeFindex');
        }

        // 2. Build the Normal fee payment directly behind the deposit
        // (#26: consecutive sequences make the fee unable to apply unless the
        // deposit applied first). Savings uses Blend USDC on testnet and
        // canonical USDC on mainnet — getSavingsUsdcIssuer resolves it.
        const feeResponse = await fetch('/api/fees/build-payment', {
          method: 'POST',
          headers: { ...(await buildAuthHeaders()), 'Content-Type': 'application/json' },
          body: JSON.stringify({
            caller: walletAddress,
            amount: feeAmount.toFixed(7),
            assetCode: 'USDC',
            assetIssuer: getSavingsUsdcIssuer(config),
            sourceSequence: getTransactionSequence(depositData.xdr, config.NETWORK_PASSPHRASE),
            timeoutSeconds: FEE_PAIR_TIMEOUT_SECONDS,
          }),
        });
        const feeData = await feeResponse.json();
        if (!feeData.success || !feeData.xdr) {
          throw new Error(feeData.error || 'Failed to build Normal fee transaction');
        }

        // 3. Collect BOTH signatures before anything is submitted. Rejecting
        // either prompt (or a wallet jam, or closing the tab) aborts the whole
        // action with nothing charged and nothing moved — retry costs nothing.
        setTxStep('deposit_sign');
        const signedDepositXdr = await signOnly(depositData.xdr);
        setTxStep('fee_sign');
        const signedFeeXdr = await signOnly(feeData.xdr);

        // 4. Hand the signed pair to the server: it escrows the fee, submits
        // the deposit, then collects the fee — and the cron sweeper finishes
        // the pair even if this tab dies right here.
        setTxStep('deposit_broadcast');
        const pair = await submitFeePair({
          signedServiceXdr: signedDepositXdr,
          signedFeeXdr,
          kind: 'savings_deposit',
          config,
        });

        // Log deposit to DB (fire-and-forget). Always reached on success —
        // the fee hash is known even when the sweeper still owes the submit.
        postTransactionLog('/api/savings/log-transaction', {
          walletAddress,
          vaultAddress: vaultInfo.address,
          type: 'deposit',
          amount: netAmount.toFixed(7),
          txHash: pair.serviceHash,
          feeAmount: feeAmount.toFixed(2),
          feeTxHash: pair.feeHash,
        });

        enqueueSuccessWithStellarExpert(
          enqueueSnackbar,
          t,
          t('Deposit successful!'),
          pair.serviceHash
        );

        // Optimistically update the shared savings cache so every view reflects
        // the deposit immediately (the events indexer lags 30-120s behind).
        {
          // Computed from the pre-transaction snapshot, so the result is an
          // absolute target rather than a delta applied to whatever the value
          // happens to be now. If a refresh already landed with the deposit
          // included, this writes the same number instead of adding it twice.
          const base = positionBefore ?? {
            shares: '0',
            currentValue: '0',
            totalDeposited: '0',
            earnings: '0',
          };
          savingsRef.current.setPosition({
            ...base,
            currentValue: (parseFloat(base.currentValue) + netAmount).toFixed(7),
            totalDeposited: (parseFloat(base.totalDeposited) + netAmount).toFixed(7),
          });
          // Invalidate any position read still in flight from BEFORE this action
          // (finding #52: a pre-action read resolving late overwrote the
          // correct figure and stuck). Bump BEFORE announcing.
          bumpSavingsReadEpoch(walletAddress);
          window.dispatchEvent(new CustomEvent(POSITION_SYNC_EVENT));
        }

        // Cancel any pending post-operation refreshes from a previous operation
        // before scheduling new ones, so stale API responses don't overwrite
        // the optimistic state we just wrote.
        refreshTimeoutsRef.current.forEach(clearTimeout);
        refreshTimeoutsRef.current = [];

        // Refresh token balances so wallet USDC reflects the deposit immediately.
        getAllTokens().catch(() => {});

        await refreshVaultInfo();
        refreshTimeoutsRef.current = [
          setTimeout(() => refreshUserPosition(), 3_000),
          setTimeout(() => refreshUserPosition(), 15_000),
          setTimeout(() => refreshUserPosition(), 45_000),
        ];

        return pair.serviceHash;
      } catch (err: any) {
        if (err instanceof WalletSessionExpiredError) return '';
        console.error('Error depositing:', err);
        const errorMessage = err.message || 'Deposit failed';
        if (errorMessage.toLowerCase().includes('trustline')) {
          setNeedsTrustline(true);
        }
        setError(errorMessage);
        enqueueSnackbar(errorMessage, { variant: 'error' });
        return '';
      } finally {
        setLoading(false);
        setTxStep(null);
      }
    },
    [
      config,
      wallet.address,
      wallet.walletType,
      normalCanSign,
      vaultInfo,
      normalPublicKey,
      stellarPublicKey,
      signNormalWallet,
      signOrReconnect,
      enqueueSnackbar,
      t,
      getAllTokens,
      refreshVaultInfo,
      refreshUserPosition,
    ]
  );

  // Withdraw from vault — DeFindex withdraw plus (when yield was earned) a
  // USDC commission payment chained behind it, both signed up front and
  // submitted as a pair (#26): rejecting either prompt leaves savings
  // untouched, and a successful withdrawal always gets its commission
  // collected (server escrow + cron sweeper).
  const withdraw = useCallback(
    async (amount: string): Promise<string> => {
      if (!wallet.address) {
        enqueueSnackbar(t('Please connect your wallet first'), { variant: 'error' });
        return '';
      }

      if (!vaultInfo?.address) {
        enqueueSnackbar(t('Vault not configured'), { variant: 'error' });
        return '';
      }

      const parsedAmount = parseFloat(amount);
      if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
        enqueueSnackbar(t('Enter a valid amount'), { variant: 'error' });
        return '';
      }

      // Snapshot before anything moves — see the matching note in deposit().
      // The optimistic update below must subtract from this fixed point, not
      // from the live ref, or a refresh landing mid-withdrawal causes the
      // amount to be deducted twice (observed: 20 -> 15 -> 10 -> 15).
      const positionBefore = userPositionRef.current;

      // Compute yield commission up-front from the current userPosition.
      const currentValue = parseFloat(userPosition?.currentValue || '0');
      const earnings = parseFloat(userPosition?.earnings || '0');
      const commissionAmount = getYieldCommission({
        withdrawAmount: parsedAmount,
        currentValue,
        earnings,
      });

      try {
        setLoading(true);
        setError(null);

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

        const signOnly = async (xdr: string) => {
          const signResult = await signTransaction(xdr, config.NETWORK_PASSPHRASE);
          const signedXDR = normalizeSignedXDR(signResult);
          if (!signedXDR) throw new Error('Transaction signing failed — no signed XDR returned');
          return signedXDR;
        };

        // 1. Build the DeFindex withdraw XDR. The commission (when owed)
        // chains one sequence number behind it, so the commission can only
        // ever apply after the withdrawal put USDC in the wallet — an empty
        // wallet never blocks the user from accessing their savings.
        const withdrawResponse = await fetch('/api/savings/withdraw', {
          method: 'POST',
          headers: { ...(await buildAuthHeaders()), 'Content-Type': 'application/json' },
          body: JSON.stringify({ amount, caller: walletAddress }),
        });
        const withdrawData = await withdrawResponse.json();
        if (!withdrawData.success) {
          throw new Error(withdrawData.error || 'Failed to build withdraw transaction');
        }
        if (!withdrawData.xdr) {
          throw new Error('No transaction XDR returned from DeFindex');
        }

        let withdrawTxHash: string;
        let commissionTxHash: string | null = null;

        if (commissionAmount > 0) {
          // 2. Build the commission behind the withdraw, sign BOTH before
          // anything is submitted (#26): rejecting either prompt aborts the
          // whole action — funds stay in savings, nothing charged.
          const commissionResponse = await fetch('/api/fees/build-payment', {
            method: 'POST',
            headers: { ...(await buildAuthHeaders()), 'Content-Type': 'application/json' },
            body: JSON.stringify({
              caller: walletAddress,
              amount: commissionAmount.toFixed(7),
              assetCode: 'USDC',
              assetIssuer: getSavingsUsdcIssuer(config),
              sourceSequence: getTransactionSequence(withdrawData.xdr, config.NETWORK_PASSPHRASE),
              timeoutSeconds: FEE_PAIR_TIMEOUT_SECONDS,
            }),
          });
          const commissionData = await commissionResponse.json();
          if (!commissionData.success || !commissionData.xdr) {
            throw new Error(commissionData.error || 'Failed to build commission transaction');
          }

          setTxStep('withdraw_sign');
          const signedWithdrawXdr = await signOnly(withdrawData.xdr);
          setTxStep('commission_sign');
          const signedCommissionXdr = await signOnly(commissionData.xdr);

          setTxStep('withdraw_broadcast');
          const pair = await submitFeePair({
            signedServiceXdr: signedWithdrawXdr,
            signedFeeXdr: signedCommissionXdr,
            kind: 'savings_withdraw',
            config,
          });
          withdrawTxHash = pair.serviceHash;
          commissionTxHash = pair.feeHash;
        } else {
          // No commission owed — a single transaction, submitted directly.
          setTxStep('withdraw_sign');
          const signedWithdrawXdr = await signOnly(withdrawData.xdr);
          setTxStep('withdraw_broadcast');
          try {
            const signedTx = TransactionBuilder.fromXDR(
              signedWithdrawXdr,
              config.NETWORK_PASSPHRASE
            );
            const withdrawResult = await horizonServer.submitTransaction(signedTx);
            withdrawTxHash = withdrawResult.hash;
          } catch (withdrawErr: any) {
            throw new Error(parseSigningError(withdrawErr));
          }
        }

        // Log withdrawal to DB (fire-and-forget). Always reached on success —
        // the old flow threw on a commission failure BEFORE this line, so a
        // completed withdrawal could go unrecorded. Structurally impossible
        // now: once the pair is accepted, we log.
        postTransactionLog('/api/savings/log-transaction', {
          walletAddress,
          vaultAddress: vaultInfo.address,
          type: 'withdraw',
          amount,
          txHash: withdrawTxHash,
          feeAmount: commissionAmount > 0 ? commissionAmount.toFixed(7) : null,
          feeTxHash: commissionTxHash,
        });

        enqueueSuccessWithStellarExpert(
          enqueueSnackbar,
          t,
          t('Withdrawal successful!'),
          withdrawTxHash
        );

        // Optimistically update the shared savings cache.
        if (positionBefore) {
          const base = positionBefore;
          const preCV = Math.max(parseFloat(base.currentValue) - parsedAmount, 0);
          const preTD = Math.max(parseFloat(base.totalDeposited) - parsedAmount, 0);
          savingsRef.current.setPosition({
            ...base,
            currentValue: preCV.toFixed(7),
            totalDeposited: preTD.toFixed(7),
            earnings: Math.max(preCV - preTD, 0).toFixed(7),
          });
          // Invalidate any position read still in flight from BEFORE this action
          // (finding #52: a pre-action read resolving late overwrote the
          // correct figure and stuck). Bump BEFORE announcing.
          bumpSavingsReadEpoch(walletAddress);
          window.dispatchEvent(new CustomEvent(POSITION_SYNC_EVENT));
        }

        refreshTimeoutsRef.current.forEach(clearTimeout);
        refreshTimeoutsRef.current = [];

        // Refresh token balances so wallet USDC reflects the withdrawal immediately.
        getAllTokens().catch(() => {});

        await refreshVaultInfo();
        refreshTimeoutsRef.current = [
          setTimeout(() => refreshUserPosition(), 3_000),
          setTimeout(() => refreshUserPosition(), 15_000),
          setTimeout(() => refreshUserPosition(), 45_000),
        ];

        return withdrawTxHash;
      } catch (err: any) {
        if (err instanceof WalletSessionExpiredError) return '';
        console.error('Error withdrawing:', err);
        const errorMessage = err.message || 'Withdraw failed';
        if (errorMessage.toLowerCase().includes('trustline')) {
          setNeedsTrustline(true);
        }
        setError(errorMessage);
        enqueueSnackbar(errorMessage, { variant: 'error' });
        return '';
      } finally {
        setLoading(false);
        setTxStep(null);
      }
    },
    [
      config,
      wallet.address,
      wallet.walletType,
      normalCanSign,
      vaultInfo,
      userPosition,
      normalPublicKey,
      stellarPublicKey,
      signNormalWallet,
      signOrReconnect,
      enqueueSnackbar,
      t,
      getAllTokens,
      refreshVaultInfo,
      refreshUserPosition,
    ]
  );

  return {
    error,
    setError,
    fetchError,
    loading,
    fetching,
    positionFetching,
    vaultInfo,
    userPosition,
    needsTrustline,
    setNeedsTrustline,
    txStep,
    deposit,
    withdraw,
    refreshVaultInfo,
    refreshUserPosition,
  };
}
