import type { Token } from '@normalfinance/types';

import React from 'react';
import { useSnackbar } from 'notistack';
import { useTranslate } from '@/locales';
import { useContractTransaction } from '@/hooks';
import { TransactionType } from '@/types/transaction';
import { usePersistStore } from '@normalfinance/state';
import { shortenAddress } from '@/utils/format-address';
import { getCryptoIconUrl } from '@normalfinance/utils';
import { fCurrencyTwoDecimals } from '@/utils/format-number';

import { useTheme } from '@mui/material/styles';
import {
  Box,
  Dialog,
  Button,
  Typography,
  IconButton,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';

import { Iconify } from '../template/iconify';

export interface SendReviewProps {
  open: boolean;
  onClose: () => void;
  sendToken?: Token | null;
  tokenValue: number;
  fiatValue: number;
  address: string;
  networkCost: number;
}

const SendReview: React.FC<SendReviewProps> = ({
  open,
  onClose,
  sendToken,
  tokenValue,
  fiatValue,
  address,
  networkCost,
}) => {
  const theme = useTheme();
  const { t } = useTranslate('auto');
  const { enqueueSnackbar } = useSnackbar();
  const store = usePersistStore();
  const { executeContractTransaction } = useContractTransaction();

  const executeSend = async (
    signedTransactionXDR: string,
    transactionType: string = 'Send Token'
  ) => {
    if (!store.wallet.address) return null;
    const res = await fetch('/api/transaction', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        walletAddress: store.wallet.address,
        signedTransactionXDR,
        transactionType,
      }),
    });

    if (res.status === 429) {
      throw new Error('Rate limit exceeded. Please try again later.');
    }

    const data = await res.json();
    if (!data.success) {
      throw new Error(data.error || 'Send execution failed');
    }

    return data;
  };

  const onSubmit = async () => {
    if (!store.wallet.address || !sendToken) {
      enqueueSnackbar(t('Cannot send token without wallet or token'), { variant: 'error' });
      return;
    }

    const processedArgs = {
      from: store.wallet.address!,
      to: address,
      amount: BigInt((tokenValue * 10 ** (sendToken?.decimals || 7)).toFixed(0)),
    };

    await executeContractTransaction({
      contractType: 'token',
      contractAddress: sendToken.contract,
      transactionDetails: {
        type: TransactionType.SEND,
        token1: { name: sendToken.symbol, amount: tokenValue.toString() },
      },
      transactionFunction: async (client, restore) => {
        const tx = await client.transfer(processedArgs, { simulate: !restore });
        if (restore) {
          await tx.simulate({ restore: true });
          return tx;
        } else {
          // Get the unsigned transaction XDR and manually sign it with the wallet
          const unsignedXDR = tx.built?.toXDR();

          if (unsignedXDR) {
            // Use the safeSignTransaction function to sign the transaction
            const signedXDR = await client.options.signTransaction(unsignedXDR);

            const apiRes = await executeSend(signedXDR, 'Send Token');
            if (apiRes?.transactionHash) {
              (tx as any).hash = apiRes.transactionHash;
            }
          }

          return tx;
        }
      },
    });

    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      slotProps={{
        paper: {
          sx: {
            gap: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-start',
            width: '100%',
            maxWidth: '400px',
            maxHeight: 'auto',
          },
        },
      }}
    >
      <DialogTitle sx={{ p: 2, pb: 0, width: '100%' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6" component="div" color="text.primary">
            {t('Review send')}
          </Typography>
          <IconButton onClick={onClose}>
            <Iconify icon="mingcute:close-line" width={24} />
          </IconButton>
        </Box>
      </DialogTitle>
      <DialogContent
        sx={{
          p: 2,
          width: '100%',
          '&::-webkit-scrollbar': {
            width: '2px',
          },
          '&::-webkit-scrollbar-thumb': {
            backgroundColor: theme.palette.divider,
            borderRadius: '4px',
          },
          scrollbarWidth: 'thin',
          scrollbarColor: `${theme.palette.divider} transparent`,
        }}
      >
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
          <Box>
            <Typography variant="caption" color="text.secondary" mb={1}>
              {t("You're sending")}
            </Typography>

            <Box
              sx={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                mb: 2,
              }}
            >
              <Box>
                <Typography variant="h4">
                  {t('$')}
                  {fiatValue}
                </Typography>
                <Typography
                  variant="body1"
                  sx={{
                    color: theme.palette.text.secondary,
                    fontSize: 'var(--components-nav-item-size, 14px)',
                    fontStyle: 'normal',
                    fontWeight: 'var(--components-nav-item-weight, 500)',
                    lineHeight: 'var(--components-nav-item-line-height, 22px)',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'clip',
                    minWidth: 0,
                  }}
                >
                  {tokenValue.toFixed(4)} {sendToken?.symbol}
                </Typography>
              </Box>

              <Box
                component="img"
                src={sendToken ? getCryptoIconUrl(sendToken.symbol) : ''}
                sx={{
                  width: 40,
                  height: 40,
                  borderRadius: '50%',
                  objectFit: 'cover',
                }}
              />
            </Box>

            <Typography variant="caption" color="text.secondary" mb={1}>
              {t('To')}
            </Typography>
            <Box
              sx={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <Box>
                <Typography variant="h4">{shortenAddress(address)}</Typography>
              </Box>
            </Box>
          </Box>

          <Box sx={{ width: '100%', height: '1px', bgcolor: theme.palette.text.disabled }} />
          <Box
            sx={{
              width: '100%',
              display: 'flex',
              justifyContent: 'space-between',
              gap: 1,
            }}
          >
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 1,
              }}
            >
              <Typography
                variant="body2"
                sx={{
                  fontWeight: 500,
                  color: theme.palette.text.secondary,
                  fontSize: '12px',
                }}
              >
                {t('Network cost')}
              </Typography>
              <Iconify
                icon="solar:info-circle-bold"
                width={14}
                sx={{ color: theme.palette.text.secondary, cursor: 'pointer' }}
              />
            </Box>

            <Typography
              variant="body2"
              sx={{
                fontWeight: 500,
                color: theme.palette.text.primary,
                fontSize: '12px',
              }}
            >
              {fCurrencyTwoDecimals(networkCost)}
            </Typography>
          </Box>
        </Box>
      </DialogContent>
      <DialogActions sx={{ p: 2, pt: 0, width: '100%' }}>
        <Box sx={{ width: '100%' }}>
          <Button fullWidth variant="soft" color="success" size="large" onClick={onSubmit}>
            {t('Send')}
          </Button>
        </Box>
      </DialogActions>
    </Dialog>
  );
};

export default SendReview;
