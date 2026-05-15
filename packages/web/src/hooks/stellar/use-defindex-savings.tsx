'use client';

import type { Dispatch, SetStateAction } from 'react';
import type { OptionsObject, SnackbarMessage } from 'notistack';
import type { VaultInfo, SavingsPosition } from '@/types/savings';

// ---------------------------------------------------------------------------
// Module-level position cache — survives React remounts and page refreshes.
// Keyed by wallet address so multiple accounts never bleed data into each other.
// ---------------------------------------------------------------------------
// ---------------------------------------------------------------------------
// Position cache
// ---------------------------------------------------------------------------
const POSITION_CACHE_KEY = 'nf_savings_position_cache';
const CACHE_KEY = POSITION_CACHE_KEY; // alias used below
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

interface CacheEntry {
  position: SavingsPosition;
  cachedAt: number;
}

function readCache(): Record<string, CacheEntry> {
  if (typeof window === 'undefined') return {};
  try { return JSON.parse(localStorage.getItem(CACHE_KEY) || '{}'); } catch { return {}; }
}

function getCachedPosition(address: string | undefined): SavingsPosition | null {
  if (!address) return null;
  const entry = readCache()[address];
  if (!entry?.cachedAt || Date.now() - entry.cachedAt > CACHE_TTL_MS) return null;
  return entry.position;
}

function setCachedPosition(address: string | undefined, position: SavingsPosition): void {
  if (!address || typeof window === 'undefined') return;
  try {
    const cache = readCache();
    cache[address] = { position, cachedAt: Date.now() };
    localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
  } catch { /* storage full */ }
}

// ---------------------------------------------------------------------------
// Vault info cache — keyed by network so mainnet/testnet never bleed.
// TTL is 5 minutes; address never changes but APY/deposits update.
// ---------------------------------------------------------------------------
const VAULT_CACHE_KEY = 'nf_vault_info_cache';
const VAULT_CACHE_TTL_MS = 5 * 60 * 1000;

function getCachedVaultInfo(network: string): VaultInfo | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(VAULT_CACHE_KEY);
    if (!raw) return null;
    const entry: { vault: VaultInfo; network: string; cachedAt: number } = JSON.parse(raw);
    if (entry.network !== network) return null;
    if (!entry.cachedAt || Date.now() - entry.cachedAt > VAULT_CACHE_TTL_MS) return null;
    return entry.vault;
  } catch { return null; }
}

function setCachedVaultInfo(network: string, vault: VaultInfo): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(VAULT_CACHE_KEY, JSON.stringify({ vault, network, cachedAt: Date.now() }));
  } catch { /* storage full */ }
}

import { useTranslate } from '@/locales';
import { useStellarConfig } from '@/hooks';
import { usePersistStore } from '@normalfinance/state';
import { getSavingsUsdcIssuer } from '@/utils/token-selectors';
import { useRef, useState, useEffect, useCallback } from 'react';
import { normalizeSignedXDR } from '@/utils/normalize-signed-xdr';
import { Asset, Horizon, TransactionBuilder } from '@stellar/stellar-sdk';
import { getYieldCommission, getSavingsDepositFee } from '@/utils/normal-fees';
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

import Box from '@mui/material/Box';
import Button from '@mui/material/Button';

import { useSnackbar } from '@/components/template/snackbar';

import { useStellarWalletsKit } from './use-stellar-wallets-kit';
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
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [needsTrustline, setNeedsTrustline] = useState(false);
  const networkKey = config.NETWORK_PASSPHRASE.includes('Test') ? 'testnet' : 'mainnet';
  const [vaultInfo, setVaultInfo] = useState<VaultInfo | null>(
    () => getCachedVaultInfo(config.NETWORK_PASSPHRASE.includes('Test') ? 'testnet' : 'mainnet')
  );
  // Read cache once so positionFetching and userPosition are consistent on the first render.
  // If there is no cached position, positionFetching starts true so the skeleton shows
  // immediately instead of briefly flashing 0.00 before the fetch effect fires.
  const [userPosition, setUserPosition] = useState<SavingsPosition | null>(
    () => getCachedPosition(wallet.address)
  );
  const [positionFetching, setPositionFetching] = useState(
    () => !getCachedPosition(wallet.address)
  );

  // Separate tokens for vault-info and user-position fetches so they can run
  // concurrently without cancelling each other.
  const vaultTokenRef = useRef(0);
  const positionTokenRef = useRef(0);

  // ── Phase 1: vault metadata (fast, ~3-5 s, no user address needed) ──────
  const refreshVaultInfo = useCallback(async () => {
    const myToken = ++vaultTokenRef.current;
    setFetchError(null);
    setFetching(true);

    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        if (attempt > 0) {
          await new Promise((r) => setTimeout(r, 600 * 2 ** (attempt - 1)));
          if (myToken !== vaultTokenRef.current) return;
        }

        const controller = new AbortController();
        const tid = setTimeout(() => controller.abort(), 12_000);
        let response: Response;
        try {
          response = await fetch('/api/savings/vault-info', { signal: controller.signal });
        } finally {
          clearTimeout(tid);
        }

        if (myToken !== vaultTokenRef.current) return;

        if (!response.ok) {
          const body = await response.json().catch(() => ({}));
          throw new Error(body?.error || `Request failed (${response.status})`);
        }

        const data = await response.json();
        if (!data.success) throw new Error(data.error || 'Failed to fetch vault info');

        if (myToken !== vaultTokenRef.current) return;

        setCachedVaultInfo(networkKey, data.vault);
        setVaultInfo(data.vault);
        setFetchError(null);
        setFetching(false);
        return;
      } catch (err: any) {
        if (myToken !== vaultTokenRef.current) return;
        // Always retry — set error only after the final attempt
        if (attempt < 2) continue;
        console.error('[useDefindexSavings] vault-info fetch failed:', err);
        setFetchError(err.message || 'Failed to fetch vault info');
        setFetching(false);
        return;
      }
    }

    if (myToken !== vaultTokenRef.current) return;
    setFetchError('Failed to fetch vault info');
    setFetching(false);
  }, []);

  // ── Phase 2: user position (slow, up to 30 s for Soroban RPC on mainnet) ─
  const refreshUserPosition = useCallback(async () => {
    if (!wallet.address) return;

    const myToken = ++positionTokenRef.current;
    setPositionFetching(true);

    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        if (attempt > 0) {
          await new Promise((r) => setTimeout(r, 2_000 * attempt));
          if (myToken !== positionTokenRef.current) return;
        }

        const controller = new AbortController();
        // 30 s — Soroban RPC calls on mainnet can take 15-25 s
        const tid = setTimeout(() => controller.abort(), 30_000);
        let response: Response;
        try {
          response = await fetch(`/api/savings/user-position?user=${wallet.address}`, {
            signal: controller.signal,
          });
        } finally {
          clearTimeout(tid);
        }

        if (myToken !== positionTokenRef.current) return;

        if (!response.ok) {
          const body = await response.json().catch(() => ({}));
          throw new Error(body?.error || `Request failed (${response.status})`);
        }

        const data = await response.json();
        if (!data.success) throw new Error(data.error || 'Failed to fetch user position');

        if (myToken !== positionTokenRef.current) return;

        if (data.userPosition) {
          setCachedPosition(wallet.address, data.userPosition);
          setUserPosition(data.userPosition);
        }
        setPositionFetching(false);
        return;
      } catch (err: any) {
        if (myToken !== positionTokenRef.current) return;
        // Retry on all errors (AbortError = timeout; others = network/API issues)
        if (attempt < 2) continue;
        console.error('[useDefindexSavings] user-position fetch failed after retries:', err);
        setPositionFetching(false);
        return;
      }
    }
  }, [wallet.address]);

  // Phase 1: vault metadata on mount (no dependency on wallet address)
  useEffect(() => {
    refreshVaultInfo();
  }, [refreshVaultInfo]);

  // Phase 2: user position when wallet address is available
  useEffect(() => {
    refreshUserPosition();
  }, [refreshUserPosition]);

  // Deposit to vault — two transactions: (1) classic USDC fee payment,
  // (2) DeFindex deposit for the net amount. Fee goes first so if the
  // Soroban deposit fails the user only loses the small flat fee.
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

        const signAndSubmit = async (xdr: string) => {
          const signResult = await signTransaction(xdr, config.NETWORK_PASSPHRASE);
          const signedXDR = normalizeSignedXDR(signResult);
          if (!signedXDR) throw new Error('Transaction signing failed — no signed XDR returned');
          const signedTx = TransactionBuilder.fromXDR(signedXDR, config.NETWORK_PASSPHRASE);
          return horizonServer.submitTransaction(signedTx);
        };

        // Pre-flight: verify USDC balance matches the expected issuer and
        // covers the full deposit amount (fee + net) before signing anything.
        const usdcIssuer = getSavingsUsdcIssuer(config);
        if (!usdcIssuer) {
          throw new Error('USDC issuer is not configured for this network');
        }
        const usdcAsset = new Asset('USDC', usdcIssuer);
        const usdcAssetId = usdcAsset.toString(); // "USDC:G..."
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

        // 1. Build + sign + submit the Normal fee payment first.
        // Savings uses Blend USDC on testnet and canonical USDC on mainnet —
        // getSavingsUsdcIssuer resolves to the right issuer for this network.
        const feeResponse = await fetch('/api/fees/build-payment', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            caller: walletAddress,
            amount: feeAmount.toFixed(7),
            assetCode: 'USDC',
            assetIssuer: getSavingsUsdcIssuer(config),
          }),
        });
        const feeData = await feeResponse.json();
        if (!feeData.success || !feeData.xdr) {
          throw new Error(feeData.error || 'Failed to build Normal fee transaction');
        }

        let feeResult: Awaited<ReturnType<Horizon.Server['submitTransaction']>>;
        try {
          feeResult = await signAndSubmit(feeData.xdr);
        } catch (feeErr: any) {
          throw new Error(`Fee payment failed: ${parseHorizonError(feeErr)}`);
        }

        // 2. Build the DeFindex deposit XDR for the NET amount (fresh sequence)
        const depositResponse = await fetch('/api/savings/deposit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ amount: netAmount.toFixed(7), caller: walletAddress }),
        });
        const depositData = await depositResponse.json();
        if (!depositData.success) {
          throw new Error(
            `${depositData.error || 'Failed to build deposit transaction'} (fee was already charged — please contact support with tx ${feeResult.hash})`
          );
        }
        if (!depositData.xdr) {
          throw new Error('No transaction XDR returned from DeFindex');
        }

        // 3. Sign + submit the deposit
        let depositResult: Awaited<ReturnType<Horizon.Server['submitTransaction']>>;
        try {
          depositResult = await signAndSubmit(depositData.xdr);
        } catch (depositErr: any) {
          throw new Error(
            `${parseHorizonError(depositErr)} (Normal fee already charged — tx ${feeResult.hash})`
          );
        }

        // Log deposit to DB (fire-and-forget)
        fetch('/api/savings/log-transaction', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            walletAddress,
            vaultAddress: vaultInfo.address,
            type: 'deposit',
            amount: netAmount.toFixed(7),
            txHash: depositResult.hash,
            feeAmount: feeAmount.toFixed(2),
            feeTxHash: feeResult.hash,
          }),
        }).catch(console.error);

        enqueueSuccessWithStellarExpert(
          enqueueSnackbar,
          t,
          t('Deposit successful!'),
          depositResult.hash
        );

        // Optimistic position update — show correct value immediately without
        // waiting for DeFindex's API cache to update (can take minutes).
        // Note: only update in-memory state; cache is only written from confirmed API data.
        setUserPosition((prev) => {
          const base = prev ?? { shares: '0', currentValue: '0', totalDeposited: '0', earnings: '0' };
          return {
            ...base,
            currentValue: (parseFloat(base.currentValue) + netAmount).toFixed(7),
            totalDeposited: (parseFloat(base.totalDeposited) + netAmount).toFixed(7),
          };
        });

        // 4. Refresh vault info, then position after a short delay so the DB
        // write and Soroban RPC propagation have time to settle before we query.
        await refreshVaultInfo();
        setTimeout(() => refreshUserPosition(), 3000);

        return depositResult.hash;
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
      refreshVaultInfo,
      refreshUserPosition,
    ]
  );

  // Withdraw from vault — two transactions: (1) classic USDC payment for
  // the 7% yield commission, (2) DeFindex withdraw to the user. Commission
  // fee goes first so the withdrawal is blocked if the fee cannot be sent.
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

        const signAndSubmit = async (xdr: string) => {
          const signResult = await signTransaction(xdr, config.NETWORK_PASSPHRASE);
          const signedXDR = normalizeSignedXDR(signResult);
          if (!signedXDR) throw new Error('Transaction signing failed — no signed XDR returned');
          const signedTx = TransactionBuilder.fromXDR(signedXDR, config.NETWORK_PASSPHRASE);
          return horizonServer.submitTransaction(signedTx);
        };

        // 1. Build + sign + submit the yield commission fee first.
        // If this fails the withdrawal is aborted entirely.
        let commissionTxHash: string | null = null;
        if (commissionAmount > 0) {
          const commissionResponse = await fetch('/api/fees/build-payment', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              caller: walletAddress,
              amount: commissionAmount.toFixed(7),
              assetCode: 'USDC',
              assetIssuer: getSavingsUsdcIssuer(config),
            }),
          });
          const commissionData = await commissionResponse.json();
          if (!commissionData.success || !commissionData.xdr) {
            throw new Error(commissionData.error || 'Failed to build commission transaction');
          }

          let commissionResult: Awaited<ReturnType<Horizon.Server['submitTransaction']>>;
          try {
            commissionResult = await signAndSubmit(commissionData.xdr);
          } catch (commissionErr: any) {
            throw new Error(`Yield commission payment failed: ${parseSigningError(commissionErr)}`);
          }
          commissionTxHash = commissionResult.hash;
        }

        // 2. Build + sign + submit the DeFindex withdraw.
        const withdrawResponse = await fetch('/api/savings/withdraw', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ amount, caller: walletAddress }),
        });
        const withdrawData = await withdrawResponse.json();
        if (!withdrawData.success) {
          throw new Error(
            `${withdrawData.error || 'Failed to build withdraw transaction'}${commissionTxHash ? ` (Normal fee already charged — tx ${commissionTxHash})` : ''}`
          );
        }
        if (!withdrawData.xdr) {
          throw new Error(
            `No transaction XDR returned from DeFindex${commissionTxHash ? ` (Normal fee already charged — tx ${commissionTxHash})` : ''}`
          );
        }

        let withdrawResult: Awaited<ReturnType<Horizon.Server['submitTransaction']>>;
        try {
          withdrawResult = await signAndSubmit(withdrawData.xdr);
        } catch (withdrawErr: any) {
          throw new Error(
            `${parseSigningError(withdrawErr)}${commissionTxHash ? ` (Normal fee already charged — tx ${commissionTxHash})` : ''}`
          );
        }

        // Log withdrawal to DB (fire-and-forget)
        fetch('/api/savings/log-transaction', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            walletAddress,
            vaultAddress: vaultInfo.address,
            type: 'withdraw',
            amount,
            txHash: withdrawResult.hash,
            feeAmount: commissionAmount > 0 ? commissionAmount.toFixed(7) : null,
            feeTxHash: commissionTxHash,
          }),
        }).catch(console.error);

        enqueueSuccessWithStellarExpert(
          enqueueSnackbar,
          t,
          t('Withdrawal successful!'),
          withdrawResult.hash
        );

        // Optimistic position update — reflect withdrawal immediately.
        // Note: only update in-memory state; cache is only written from confirmed API data.
        setUserPosition((prev) => {
          if (!prev) return prev;
          const newCurrentValue = Math.max(parseFloat(prev.currentValue) - parsedAmount, 0);
          const newTotalDeposited = Math.max(parseFloat(prev.totalDeposited) - parsedAmount, 0);
          return {
            ...prev,
            currentValue: newCurrentValue.toFixed(7),
            totalDeposited: newTotalDeposited.toFixed(7),
            earnings: Math.max(newCurrentValue - newTotalDeposited, 0).toFixed(7),
          };
        });

        await refreshVaultInfo();
        setTimeout(() => refreshUserPosition(), 3000);

        return withdrawResult.hash;
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
    deposit,
    withdraw,
    refreshVaultInfo,
    refreshUserPosition,
  };
}
