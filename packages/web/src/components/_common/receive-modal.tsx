'use client';

import QRCode from 'qrcode';
import { paths } from '@/routes/paths';
import { useTranslate } from '@/locales';
import { buildAuthHeaders } from '@/utils/http';
import { supabase } from '@/lib/createSupabaseClient';
import { usePersistStore } from '@normalfinance/state';
import React, { useState, useEffect, useCallback } from 'react';
import { useCopyToClipboard } from '@/hooks/use-copy-to-clipboard';
import { createStellarExpertUrl } from '@/utils/transactions.utils';
import { useAccountStatus } from '@/hooks/stellar/use-account-status';
import { logger, isTestnet, createCoinbasePayOnrampURL } from '@normalfinance/utils';

import {
  Box,
  Stack,
  Dialog,
  Button,
  Divider,
  Typography,
  DialogTitle,
  DialogContent,
  CircularProgress,
} from '@mui/material';

import { Iconify } from '@/components/template/iconify';
import { useSnackbar } from '@/components/template/snackbar';
import WalletReadinessNotice from '@/components/_common/wallet-readiness-notice';

export type ReceiveModalContext = 'deposit' | 'receive';

interface ReceiveModalProps {
  open: boolean;
  onClose: () => void;
  context?: ReceiveModalContext;
}

export default function ReceiveModal({ open, onClose, context = 'deposit' }: ReceiveModalProps) {
  const { t } = useTranslate();
  const { copy } = useCopyToClipboard();
  const { enqueueSnackbar } = useSnackbar();
  const persist = usePersistStore();

  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
  const [isGeneratingQR, setIsGeneratingQR] = useState(false);
  const [isCoinbaseLoading, setIsCoinbaseLoading] = useState(false);

  const walletAddress = persist.wallet.address;
  const isReceiveContext = context === 'receive';

  // Account status check
  const {
    isLoading: isCheckingAccount,
    accountExists,
    error: accountStatusError,
  } = useAccountStatus(walletAddress);

  const generateQRCode = useCallback(async () => {
    if (!walletAddress) return;

    setIsGeneratingQR(true);
    try {
      const qrDataUrl = await QRCode.toDataURL(walletAddress, {
        width: 200,
        margin: 1,
        color: {
          dark: '#0A0A0F',
          light: '#FFFFFF',
        },
      });
      setQrCodeUrl(qrDataUrl);
    } catch (error) {
      // Doc 90 W4: cosmetic — the inline text + copyable address below cover
      // it; an ERROR toast overstated a non-problem.
      logger.error('Error generating QR code:', error);
    } finally {
      setIsGeneratingQR(false);
    }
  }, [walletAddress]);

  useEffect(() => {
    if (open && walletAddress) {
      generateQRCode();
    }
  }, [open, walletAddress, generateQRCode]);

  const handleCopyAddress = () => {
    if (walletAddress) {
      copy(walletAddress);
      enqueueSnackbar('Wallet address copied to clipboard', { variant: 'success' });
    }
  };

  const handleCoinbaseXlm = async () => {
    if (!walletAddress) return;
    const win = window.open('', '_blank');
    setIsCoinbaseLoading(true);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        win?.close();
        enqueueSnackbar(t('Please log in first'), { variant: 'warning' });
        return;
      }
      const headers = await buildAuthHeaders();
      const r = await fetch('/api/coinbase/session', {
        method: 'POST',
        headers,
        credentials: 'include',
        body: JSON.stringify({ address: walletAddress, asset: 'XLM' }),
      });
      const { token: sessionToken, error } = await r.json();
      if (error || !sessionToken) {
        win?.close();
        enqueueSnackbar(t('Failed to start Coinbase checkout. Try again later.'), {
          variant: 'error',
        });
        return;
      }
      const url = createCoinbasePayOnrampURL({
        amountUsd: '5',
        assetSymbol: 'XLM',
        sessionToken,
        fiat: 'USD',
        sandbox: isTestnet(),
        path: 'buy/select-asset',
        redirectUrl: `${window.location.origin}${paths.savings}`,
      });
      if (win) {
        win.opener = null;
        win.location.href = url;
      }
    } catch (err: any) {
      win?.close();
      logger.error('Coinbase XLM onramp error:', err);
      enqueueSnackbar(t('Failed to start Coinbase checkout. Try again later.'), {
        variant: 'error',
      });
    } finally {
      setIsCoinbaseLoading(false);
    }
  };

  const handleViewOnExplorer = () => {
    if (walletAddress) {
      const url = createStellarExpertUrl('account', walletAddress);
      window.open(url, '_blank', 'noopener');
    }
  };

  if (!walletAddress) {
    return null;
  }

  // Reusable QR code box
  const QrBox = (
    <Box
      sx={{
        p: '16px',
        borderRadius: '16px',
        bgcolor: '#FAFAFB',
        border: '1px solid rgba(10,10,15,0.08)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: 220,
      }}
    >
      {isGeneratingQR ? (
        <CircularProgress size={36} sx={{ color: 'rgba(10,10,15,0.3)' }} />
      ) : qrCodeUrl ? (
        <Box
          component="img"
          src={qrCodeUrl}
          alt="Wallet Address QR Code"
          sx={{ maxWidth: '100%', height: 'auto', borderRadius: '4px' }}
        />
      ) : (
        <Typography sx={{ fontSize: '13px', color: 'rgba(10,10,15,0.4)' }}>
          {t('QR unavailable — copy the address below.')}
        </Typography>
      )}
    </Box>
  );

  // Reusable address + buttons + coinbase block
  const AddressBlock = (
    <Stack spacing={1.5} alignItems="center" sx={{ width: '100%' }}>
      {/* Address */}
      <Box
        sx={{
          px: '14px',
          py: '12px',
          borderRadius: '12px',
          bgcolor: '#FAFAFB',
          border: '1px solid rgba(10,10,15,0.08)',
          width: '100%',
          wordBreak: 'break-all',
        }}
      >
        <Typography
          sx={{
            fontSize: '12px',
            color: '#0A0A0F',
            fontFamily: '"Geist Mono", "Courier New", monospace',
            lineHeight: 1.6,
          }}
        >
          {walletAddress}
        </Typography>
      </Box>

      {/* Action buttons */}
      <Stack direction="row" spacing={1}>
        <Box
          component="button"
          onClick={handleCopyAddress}
          sx={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            px: '14px',
            py: '8px',
            borderRadius: '10px',
            border: '1px solid rgba(10,10,15,0.12)',
            bgcolor: '#FFFFFF',
            color: '#0A0A0F',
            fontSize: '13px',
            fontWeight: 500,
            cursor: 'pointer',
            fontFamily: 'inherit',
            transition: 'background 150ms ease',
            '&:hover': { bgcolor: '#F4F4F7' },
          }}
        >
          <Iconify icon="solar:copy-outline" width={15} />
          {t('Copy Account ID')}
        </Box>

        <Box
          component="button"
          onClick={handleViewOnExplorer}
          sx={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            px: '14px',
            py: '8px',
            borderRadius: '10px',
            border: '1px solid rgba(10,10,15,0.12)',
            bgcolor: '#FFFFFF',
            color: '#0A0A0F',
            fontSize: '13px',
            fontWeight: 500,
            cursor: 'pointer',
            fontFamily: 'inherit',
            transition: 'background 150ms ease',
            '&:hover': { bgcolor: '#F4F4F7' },
          }}
        >
          <Iconify icon="eva:external-link-outline" width={15} />
          {t('View Explorer')}
        </Box>
      </Stack>

      <Divider sx={{ width: '100%' }}>
        <Typography sx={{ fontSize: '12px', color: 'rgba(10,10,15,0.4)' }}>{t('or')}</Typography>
      </Divider>

      {/* Coinbase CTA */}
      <Button
        fullWidth
        variant="contained"
        disabled={isCoinbaseLoading}
        onClick={handleCoinbaseXlm}
        startIcon={
          isCoinbaseLoading ? (
            <CircularProgress size={18} color="inherit" />
          ) : (
            <Box
              component="img"
              src="https://avatars.githubusercontent.com/u/1885080?s=200&v=4"
              sx={{ width: 18, height: 18, borderRadius: '50%' }}
            />
          )
        }
        sx={{
          borderRadius: '12px',
          bgcolor: '#0A0A0F',
          fontWeight: 700,
          fontSize: '15px',
          py: '13px',
          textTransform: 'none',
          letterSpacing: '-0.01em',
          '&:hover': { bgcolor: '#1a1a25' },
          '&.Mui-disabled': { bgcolor: 'rgba(10,10,15,0.08)', color: 'rgba(10,10,15,0.3)' },
        }}
      >
        {isCoinbaseLoading ? t('Opening Coinbase…') : t('Buy XLM via Coinbase')}
      </Button>
    </Stack>
  );

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="xs"
      fullWidth
      slotProps={{ paper: { sx: { borderRadius: '22px' } } }}
    >
      <DialogTitle sx={{ px: '22px', pt: '22px', pb: '12px' }}>
        <Box
          sx={{
            position: 'relative',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            mb: '2px',
          }}
        >
          <Typography
            sx={{
              fontSize: '17px',
              fontWeight: 700,
              color: '#0A0A0F',
              letterSpacing: '-0.02em',
              textAlign: 'center',
            }}
          >
            {t(isReceiveContext ? 'Receive Crypto' : 'Deposit Crypto')}
          </Typography>
          <Box
            component="button"
            onClick={onClose}
            sx={{
              position: 'absolute',
              right: 0,
              width: 28,
              height: 28,
              borderRadius: '8px',
              border: 'none',
              bgcolor: 'rgba(10,10,15,0.06)',
              color: '#0A0A0F',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              fontFamily: 'inherit',
              transition: 'background 150ms ease',
              '&:hover': { bgcolor: 'rgba(10,10,15,0.1)' },
            }}
          >
            <Iconify icon="mingcute:close-line" width={16} />
          </Box>
        </Box>

        {!isCheckingAccount && accountExists && (
          <Typography
            sx={{ fontSize: '13px', color: 'rgba(10,10,15,0.5)', textAlign: 'center', mt: '4px' }}
          >
            {t('Scan the QR code or copy your account ID below')}
          </Typography>
        )}
        {!isCheckingAccount && !accountExists && !accountStatusError && (
          <Typography
            sx={{ fontSize: '13px', color: 'rgba(10,10,15,0.5)', textAlign: 'center', mt: '4px' }}
          >
            {t(
              isReceiveContext
                ? 'Activate your Stellar account first, then receive other Stellar assets'
                : 'Activate your Stellar account first, then deposit other Stellar assets'
            )}
          </Typography>
        )}
      </DialogTitle>

      <DialogContent sx={{ px: '22px', pt: '16px', pb: '22px' }}>
        {/* Loading */}
        {isCheckingAccount && (
          <Stack alignItems="center" justifyContent="center" sx={{ py: '32px' }}>
            <CircularProgress size={32} sx={{ color: 'rgba(10,10,15,0.3)' }} />
            <Typography sx={{ fontSize: '13px', color: 'rgba(10,10,15,0.5)', mt: '12px' }}>
              {t('Checking account status...')}
            </Typography>
          </Stack>
        )}

        {/* Error */}
        {!isCheckingAccount && accountStatusError && (
          <Stack spacing={1.5} alignItems="center">
            <Box
              sx={{
                px: '14px',
                py: '12px',
                borderRadius: '12px',
                bgcolor: 'rgba(239,68,68,0.05)',
                border: '1px solid rgba(239,68,68,0.15)',
                width: '100%',
              }}
            >
              <Typography sx={{ fontSize: '13px', color: 'rgba(10,10,15,0.7)', lineHeight: 1.55 }}>
                {t(
                  'We could not check your Stellar account right now. Please try again in a moment.'
                )}
              </Typography>
            </Box>
            <Box
              component="button"
              onClick={handleCopyAddress}
              sx={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                px: '14px',
                py: '8px',
                borderRadius: '10px',
                border: '1px solid rgba(10,10,15,0.12)',
                bgcolor: '#FFFFFF',
                color: '#0A0A0F',
                fontSize: '13px',
                fontWeight: 500,
                cursor: 'pointer',
                fontFamily: 'inherit',
                '&:hover': { bgcolor: '#F4F4F7' },
              }}
            >
              <Iconify icon="solar:copy-outline" width={15} />
              {t('Copy Account ID')}
            </Box>
          </Stack>
        )}

        {/* Not activated yet */}
        {!isCheckingAccount && !accountExists && !accountStatusError && (
          <Stack spacing={1.5} alignItems="center">
            <Box
              sx={{
                px: '14px',
                py: '12px',
                borderRadius: '12px',
                bgcolor: 'rgba(59,130,246,0.05)',
                border: '1px solid rgba(59,130,246,0.15)',
                width: '100%',
              }}
            >
              <Typography
                sx={{ fontSize: '13px', color: 'rgba(10,10,15,0.7)', lineHeight: 1.55, mb: '6px' }}
              >
                {t('This Stellar account is not active on-chain yet.')}
              </Typography>
              <Typography sx={{ fontSize: '13px', color: 'rgba(10,10,15,0.7)', lineHeight: 1.55 }}>
                {t(
                  'Send at least 1 XLM to this account ID first. Once the account is funded, you can receive USDC and other Stellar assets here.'
                )}
              </Typography>
            </Box>

            {QrBox}
            {AddressBlock}
          </Stack>
        )}

        {/* Account active */}
        {!isCheckingAccount && accountExists && (
          <Stack spacing={1.5} alignItems="center">
            {QrBox}

            {/* #74: warn BEFORE the address is shared — USDC sent to a wallet
                without the trustline bounces back to the sender on-chain. The
                notice self-hides when ready; activation is this modal's own
                UI above, hence hideActivation. Copying stays allowed (the
                user may add the trustline in their wallet app instead). */}
            <Box sx={{ width: '100%' }}>
              <WalletReadinessNotice
                address={walletAddress}
                walletLabel={t('This wallet')}
                kind="slot"
                hideActivation
              />
            </Box>

            {/* Stellar-only warning */}
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                px: '12px',
                py: '10px',
                borderRadius: '10px',
                bgcolor: 'rgba(245,158,11,0.06)',
                border: '1px solid rgba(245,158,11,0.2)',
                width: '100%',
              }}
            >
              <Iconify
                icon="eva:alert-triangle-outline"
                width={15}
                sx={{ color: 'warning.main', flexShrink: 0 }}
              />
              <Typography sx={{ fontSize: '12px', color: 'rgba(10,10,15,0.65)', lineHeight: 1.5 }}>
                {t(
                  'This is a Stellar address — only send assets on the Stellar network here (XLM, USDC). Assets sent from other networks cannot be recovered.'
                )}
              </Typography>
            </Box>

            {AddressBlock}
          </Stack>
        )}
      </DialogContent>
    </Dialog>
  );
}
