'use client';

import type { Token } from '@normalfinance/types';
import type { TurnkeyChain } from '@/lib/turnkey/add-account';

import { useTranslate } from '@/locales';
import { useStellarConfig } from '@/hooks';
import { buildAuthHeaders } from '@/utils/http';
import { usePersistStore } from '@normalfinance/state';
import { useState, useEffect, useCallback } from 'react';
import { useSendToken } from '@/hooks/stellar/use-send-token';
import { fetchSolBalance, fetchEthBalance } from '@/hooks/use-chain-portfolio';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import Typography from '@mui/material/Typography';
import DialogContent from '@mui/material/DialogContent';
import CircularProgress from '@mui/material/CircularProgress';

import { Iconify } from '@/components/template/iconify';

import { createSolanaAdapter } from './send-adapters/solana';
import { createBitcoinAdapter } from './send-adapters/bitcoin';
import { createEthereumAdapter } from './send-adapters/ethereum';

// Kept back from the send so the source chain can pay its own network fee (and,
// for SOL, the account's rent-exempt minimum ~0.00089 SOL + ~0.000005 fee).
// Coinbase's "Max" doesn't know about these, so a max sell would otherwise fail
// simulation. Kept tight so the user can still cash out as much as possible.
const SEND_RESERVE: Record<string, number> = {
  solana: 0.0009,
  ethereum: 0.001, // ~21k gas with headroom for gas-price spikes
  // BTC is a loose backstop here — the build route is the authoritative fee
  // check (it refuses if inputs < amount + live miner fee). The dialog's
  // dynamic, fee-rate-aware reserve is what makes the Max preset sendable.
  bitcoin: 0.00002,
};

// ---------------------------------------------------------------------------
// Completes a Coinbase Offramp (sell) for a self-custody wallet.
//
// Coinbase can't pull funds from the user's wallet — after they confirm a sell
// on Coinbase, the transaction waits in STARTED with a deposit `toAddress` +
// `amount`. This modal finds that pending sell, has the user send the crypto
// on-chain (passkey), then polls until Coinbase reports SUCCESS.
//
// Idempotency: we record fulfilled transactionIds in localStorage AND skip any
// transaction that already has a Coinbase tx_hash — so a refresh can never
// double-send real funds. (Durable DB-backed dedupe is the hardening follow-up.)
// ---------------------------------------------------------------------------

type Stage = 'searching' | 'ready' | 'sending' | 'confirming' | 'done' | 'failed' | 'none';

interface PendingTxn {
  transactionId: string;
  status: string;
  toAddress: string;
  fromAddress: string | null;
  asset: string;
  network: string | null;
  amount: string;
  currency: string | null;
  txHash: string | null;
  createdAt: string | null;
  memo: string | null; // required for Stellar (XLM/USDC) deposits to Coinbase
}

interface CoinbaseOfframpModalProps {
  open: boolean;
  onClose: () => void;
  chain: TurnkeyChain; // 'bitcoin' | 'ethereum' | 'solana' | 'stellar'
  symbol: string; // 'BTC' | 'ETH' | 'SOL' | 'USDC' | 'XLM'
  address: string;
  token: Token;
}

const LS_KEY = 'nf:cb-offramp-fills';
const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

function readFills(): Record<string, string> {
  try {
    return JSON.parse(localStorage.getItem(LS_KEY) || '{}');
  } catch {
    return {};
  }
}
function getFill(id: string): string | undefined {
  return readFills()[id];
}
function markFill(id: string, value: string) {
  const all = readFills();
  all[id] = value;
  localStorage.setItem(LS_KEY, JSON.stringify(all));
}
function clearFill(id: string) {
  const all = readFills();
  delete all[id];
  localStorage.setItem(LS_KEY, JSON.stringify(all));
}

async function fetchTransactions(): Promise<PendingTxn[]> {
  const headers = await buildAuthHeaders();
  const r = await fetch('/api/coinbase/offramp-status', { headers });
  if (!r.ok) return [];
  const data = await r.json();
  return (data.transactions ?? []) as PendingTxn[];
}

// SEP-0029: a Stellar account that needs a memo flags it with a
// `config.memo_required` data entry. Coinbase's offramp deposit addresses don't
// (they match by sender address), so we only refuse a memo-less send when the
// destination genuinely requires one.
async function destinationRequiresMemo(horizonUrl: string, address: string): Promise<boolean> {
  try {
    const r = await fetch(`${horizonUrl}/accounts/${address}`);
    if (!r.ok) return false;
    const acc = await r.json();
    return Boolean(acc?.data?.['config.memo_required']);
  } catch {
    return false;
  }
}

export function CoinbaseOfframpModal({
  open,
  onClose,
  chain,
  symbol,
  address,
  token,
}: CoinbaseOfframpModalProps) {
  const { t } = useTranslate();
  const config = useStellarConfig();
  const { send: sendStellar } = useSendToken();
  // Stellar (USDC/XLM) balances live in the token store, which the chain-portfolio
  // refresh event doesn't cover — refresh it directly after a Stellar off-ramp.
  const getAllTokens = usePersistStore((s) => s.getAllTokens);
  const [stage, setStage] = useState<Stage>('searching');
  const [txn, setTxn] = useState<PendingTxn | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isStellar = chain === 'stellar';

  // The pending sell that needs us to send crypto: STARTED, for this asset,
  // with a deposit address + amount, and not already fulfilled by us.
  const findPending = useCallback(
    (list: PendingTxn[]): PendingTxn | null => {
      const balance = parseFloat(token.balance || '0');
      const candidates = list
        .filter(
          (x) =>
            x.status === 'TRANSACTION_STATUS_STARTED' &&
            x.toAddress &&
            x.amount &&
            String(x.asset).toUpperCase() === symbol.toUpperCase() &&
            // Safety: the amount MUST be denominated in the crypto, not fiat —
            // Coinbase sometimes returns sell_amount in EUR, which we must never
            // send as a crypto amount.
            String(x.currency).toUpperCase() === symbol.toUpperCase() &&
            // Only orders the wallet can actually fulfill. Crucially, this skips
            // stale/abandoned STARTED orders from earlier attempts after the user
            // has already cashed out (balance dropped) — otherwise the modal would
            // re-prompt to send an amount that's no longer in the wallet.
            parseFloat(x.amount) <= balance &&
            !x.txHash && // Coinbase already saw an on-chain send for it
            getFill(x.transactionId) === undefined // we haven't sent for it
        )
        .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
      return candidates[0] ?? null;
    },
    [symbol, token.balance]
  );

  const pollSettle = useCallback(async (id: string) => {
    for (let i = 0; i < 30; i += 1) {
      await delay(10_000);
      const list = await fetchTransactions();
      const found = list.find((x) => x.transactionId === id);
      if (found?.status === 'TRANSACTION_STATUS_SUCCESS') {
        setStage('done');
        window.dispatchEvent(new Event('nf:activity-updated'));
        return;
      }
      if (
        found?.status === 'TRANSACTION_STATUS_FAILED' ||
        found?.status === 'TRANSACTION_STATUS_EXPIRED'
      ) {
        setStage('failed');
        return;
      }
    }
    // Coinbase can take a while to credit fiat — leave the user on a positive
    // terminal state; the crypto send already succeeded on-chain.
    setStage('done');
  }, []);

  // On open: look for the pending sell (Coinbase creates it the moment the user
  // confirms, so a few polls is plenty).
  useEffect(() => {
    if (!open) return undefined;
    let cancelled = false;
    setStage('searching');
    setError(null);
    setTxn(null);

    (async () => {
      for (let i = 0; i < 10 && !cancelled; i += 1) {
        const list = await fetchTransactions();
        if (cancelled) return;
        const match = findPending(list);
        if (match) {
          setTxn(match);
          setStage('ready');
          return;
        }
        // If we already sent for an in-flight sell, resume tracking it.
        const inFlight = list.find(
          (x) =>
            String(x.asset).toUpperCase() === symbol.toUpperCase() &&
            x.status === 'TRANSACTION_STATUS_STARTED' &&
            getFill(x.transactionId) !== undefined
        );
        if (inFlight) {
          setTxn(inFlight);
          setStage('confirming');
          pollSettle(inFlight.transactionId);
          return;
        }
        await delay(3000);
      }
      if (!cancelled) setStage('none');
    })();

    return () => {
      cancelled = true;
    };
  }, [open, findPending, pollSettle, symbol]);

  const handleSend = async () => {
    if (!txn) return;
    setError(null);

    // ---- Stellar (XLM / USDC) ----
    // useSendToken handles the XLM min-reserve, USDC-by-issuer, the optional
    // memo, and the right signer (Turnkey passkey vs connected wallet).
    // Coinbase's offramp matches by sender address, so no memo is provided/needed
    // — but if the destination genuinely flags memo-required (SEP-29) and we have
    // none, refuse rather than risk losing funds.
    if (isStellar) {
      if (!txn.memo && (await destinationRequiresMemo(config.HORIZON_URL, txn.toAddress))) {
        setError(
          t(
            'This destination requires a memo, but Coinbase didn’t provide one — we can’t safely send. Please contact support.'
          )
        );
        return;
      }
      setStage('sending');
      markFill(txn.transactionId, 'pending');
      const hash = await sendStellar({
        destination: txn.toAddress,
        token,
        amount: String(txn.amount),
        memo: txn.memo ?? undefined,
      });
      if (!hash) {
        // useSendToken already surfaced the specific reason via snackbar.
        clearFill(txn.transactionId);
        setStage('failed');
        return;
      }
      markFill(txn.transactionId, hash);
      // No dispatch here: useSendToken announces the send itself now
      // (pending row + refresh) — a second event would double-fetch.
      getAllTokens(true).catch(() => {}); // refresh USDC/XLM balance in the store
      setStage('confirming');
      pollSettle(txn.transactionId);
      return;
    }

    // ---- Native (BTC / ETH / SOL) ----
    // Pre-flight: Coinbase's sell amount (especially "Max") can exceed what the
    // wallet can actually send once the network fee + on-chain minimums are kept
    // back. Catch it here with a clear message instead of a raw simulation error.
    const amountNum = parseFloat(txn.amount);
    let spendable: number;
    try {
      spendable =
        chain === 'solana'
          ? await fetchSolBalance(address)
          : chain === 'ethereum'
            ? await fetchEthBalance(address)
            : parseFloat(token.balance || '0');
    } catch {
      spendable = parseFloat(token.balance || '0');
    }
    const reserve = SEND_RESERVE[chain] ?? 0;
    if (!Number.isFinite(amountNum) || amountNum + reserve > spendable) {
      // Floor so the suggested amount is always safely sendable.
      const avail = Math.max(Math.floor((spendable - reserve) * 1e6) / 1e6, 0);
      const why =
        chain === 'solana'
          ? t('Solana keeps a small minimum (~0.0009 SOL) in every wallet, plus a network fee.')
          : t('A network fee has to stay in the wallet to send.');
      setError(
        t(
          '{{why}} You can sell at most about {{avail}} {{symbol}} right now — start a new sale on Coinbase and enter {{avail}} (or less) instead of using Max.',
          { why, avail, symbol }
        )
      );
      return; // stays on the ready screen; sending would only fail simulation
    }

    setStage('sending');
    // Optimistically claim this transaction so a refresh can't double-send.
    markFill(txn.transactionId, 'pending');

    const onErr = (m: string) => setError(m);
    const adapter =
      chain === 'solana'
        ? createSolanaAdapter(address, onErr)
        : chain === 'ethereum'
          ? createEthereumAdapter(address, onErr)
          : createBitcoinAdapter(address, onErr);

    const txHash = await adapter.send({
      token,
      amount: String(txn.amount),
      destination: txn.toAddress,
    });

    if (!txHash) {
      // Handled error (passkey cancelled, insufficient funds, …) — release the
      // claim so the user can retry.
      clearFill(txn.transactionId);
      setStage('failed');
      return;
    }

    markFill(txn.transactionId, txHash);
    // No dispatch here: the send adapter announces the send itself now
    // (pending row + refresh) — a second event would double-fetch.
    setStage('confirming');
    pollSettle(txn.transactionId);
  };

  const title =
    stage === 'done'
      ? t('Cash-out complete')
      : stage === 'failed'
        ? t('Cash-out didn’t finish')
        : stage === 'none'
          ? t('No pending cash-out')
          : t('Finish your {{symbol}} cash-out', { symbol });

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="xs"
      fullWidth
      slotProps={{ paper: { sx: { borderRadius: '22px' } } }}
    >
      <DialogContent sx={{ px: '22px', py: '26px' }}>
        <Stack spacing={2.5}>
          <Box sx={{ textAlign: 'center' }}>
            <Typography
              sx={{ fontSize: '17px', fontWeight: 700, color: '#0A0A0F', letterSpacing: '-0.02em' }}
            >
              {title}
            </Typography>
            <Typography sx={{ fontSize: '13px', color: 'rgba(10,10,15,0.5)', mt: '4px' }}>
              {stage === 'searching' && t('Looking for your Coinbase sell order…')}
              {stage === 'ready' &&
                t(
                  'To complete your sale, send the crypto to Coinbase. This needs one passkey confirmation.'
                )}
              {stage === 'sending' && t('Approve the send with your passkey…')}
              {stage === 'confirming' &&
                t(
                  'Crypto sent. Coinbase will pay out your cash once it confirms — you can close this.'
                )}
              {stage === 'done' &&
                t('Your crypto is on its way to Coinbase. Cash payout follows automatically.')}
              {stage === 'failed' &&
                t('We couldn’t complete the send. No funds were moved — you can try again.')}
              {stage === 'none' &&
                t(
                  'We didn’t find a pending Coinbase sell order. If you just confirmed one, give it a moment and reopen.'
                )}
            </Typography>
          </Box>

          {(stage === 'ready' ||
            stage === 'sending' ||
            stage === 'confirming' ||
            stage === 'done') &&
            txn && (
              <Box
                sx={{
                  p: '14px',
                  borderRadius: '14px',
                  bgcolor: '#FAFAFB',
                  border: '1px solid rgba(10,10,15,0.08)',
                }}
              >
                <Stack spacing={1.5}>
                  {/* Asset + amount in the send-dialog's visual language, with
                      the dollar equivalent (Niko, 2026-08-13). */}
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <Box
                      component="img"
                      src={token.icon}
                      alt={symbol}
                      sx={{ width: 36, height: 36, borderRadius: '50%', flexShrink: 0 }}
                    />
                    <Box sx={{ minWidth: 0 }}>
                      <Typography
                        sx={{
                          fontSize: '17px',
                          fontWeight: 700,
                          color: '#0A0A0F',
                          letterSpacing: '-0.01em',
                          fontFamily: 'monospace',
                        }}
                      >
                        {txn.amount} {symbol}
                      </Typography>
                      {Number(token.price) > 0 && (
                        <Typography sx={{ fontSize: '12.5px', color: 'rgba(10,10,15,0.5)' }}>
                          ≈ ${(parseFloat(txn.amount) * Number(token.price)).toFixed(2)}
                        </Typography>
                      )}
                    </Box>
                  </Box>
                  <Row label={t('To (Coinbase)')} value={txn.toAddress} mono truncate />
                  {isStellar && txn.memo && (
                    <Row label={t('Memo')} value={txn.memo} mono truncate />
                  )}
                </Stack>
              </Box>
            )}

          {(stage === 'searching' || stage === 'sending' || stage === 'confirming') && (
            <Stack alignItems="center" sx={{ py: 1 }}>
              <CircularProgress size={26} sx={{ color: '#0A0A0F' }} />
            </Stack>
          )}

          {error && (
            <Box
              sx={{
                px: '12px',
                py: '10px',
                borderRadius: '10px',
                bgcolor: 'rgba(220,38,38,0.05)',
                border: '1px solid rgba(220,38,38,0.15)',
              }}
            >
              <Typography sx={{ fontSize: '12.5px', color: '#B91C1C', lineHeight: 1.5 }}>
                {error}
              </Typography>
            </Box>
          )}

          <Stack direction="row" spacing={1.5} justifyContent="flex-end">
            {stage === 'ready' && (
              <Button
                variant="contained"
                onClick={handleSend}
                startIcon={<Iconify icon="solar:shield-keyhole-bold" width={18} />}
                sx={{
                  borderRadius: '12px',
                  bgcolor: '#0A0A0F',
                  textTransform: 'none',
                  fontWeight: 700,
                  '&:hover': { bgcolor: '#1a1a25' },
                }}
              >
                {t('Send with passkey')}
              </Button>
            )}
            {stage === 'failed' && txn && (
              <Button
                variant="contained"
                onClick={handleSend}
                sx={{
                  borderRadius: '12px',
                  bgcolor: '#0A0A0F',
                  textTransform: 'none',
                  fontWeight: 700,
                  '&:hover': { bgcolor: '#1a1a25' },
                }}
              >
                {t('Try again')}
              </Button>
            )}
            <Button
              variant="outlined"
              onClick={onClose}
              disabled={stage === 'sending'}
              sx={{
                borderRadius: '12px',
                textTransform: 'none',
                fontWeight: 500,
                borderColor: 'rgba(10,10,15,0.16)',
                color: '#0A0A0F',
              }}
            >
              {stage === 'confirming' || stage === 'done'
                ? t('Close')
                : stage === 'ready'
                  ? t('Cancel')
                  : t('Close')}
            </Button>
          </Stack>
        </Stack>
      </DialogContent>
    </Dialog>
  );
}

function Row({
  label,
  value,
  mono,
  truncate,
}: {
  label: string;
  value: string;
  mono?: boolean;
  truncate?: boolean;
}) {
  return (
    <Box
      sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px' }}
    >
      <Typography sx={{ fontSize: '12.5px', color: 'rgba(10,10,15,0.5)', flexShrink: 0 }}>
        {label}
      </Typography>
      <Typography
        sx={{
          fontSize: '12.5px',
          fontWeight: 600,
          color: '#0A0A0F',
          fontFamily: mono ? '"Geist Mono", monospace' : 'inherit',
          ...(truncate
            ? { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 200 }
            : {}),
        }}
      >
        {value}
      </Typography>
    </Box>
  );
}
