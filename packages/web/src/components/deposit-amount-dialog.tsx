import * as React from 'react';
import Image from 'next/image';
import { useTranslate } from '@/locales';
import { cdn } from '@normalfinance/utils';

import { Box, Stack, Dialog, IconButton, Typography } from '@mui/material';

import { Iconify } from '@/components/template/iconify';

type Props = {
  open: boolean;
  onCancel: () => void;
  onConfirm: (amount: string) => void;
  defaultAmount?: string;
  min?: number;
  max?: number;

  /** Controls copy */
  kind?: 'deposit' | 'withdraw';
  /** Token name in copy */
  tokenLabel?: string;
};

export default function AmountDialog({
  open,
  onCancel,
  onConfirm,
  defaultAmount = '',
  min = 1,
  max = 950,
  kind = 'deposit',
  tokenLabel = 'USDC',
}: Props) {
  const { t } = useTranslate();

  const [val, setVal] = React.useState<string>(defaultAmount);
  const [err, setErr] = React.useState<string>('');

  React.useEffect(() => {
    if (!open) return;
    setVal(defaultAmount);
    setErr('');
  }, [open, defaultAmount]);

  const validate = (s: string) => {
    if (!s?.trim()) return t('Enter an amount');
    const n = Number(s);
    if (!Number.isFinite(n)) return t('Amount must be a number');
    if (n <= 0) return t('Amount must be > 0');
    if (n < min || n > max) {
      return t('Amount must be between {{min}} and {{max}} {{token}}', {
        min,
        max,
        token: tokenLabel,
      });
    }
    return '';
  };

  const handleOk = () => {
    const e = validate(val);
    if (e) {
      setErr(e);
      return;
    }
    onConfirm(val.trim());
  };

  const isWithdraw = kind === 'withdraw';
  const title = isWithdraw ? t('Withdraw cash with MoneyGram') : t('Deposit cash with MoneyGram');
  const subtitle = isWithdraw
    ? t('Enter how much you’d like to cash out.')
    : t('Enter how much cash you’d like to deposit.');

  const fmt = (n: number) => `$${n.toLocaleString('en-US')}`;

  return (
    <Dialog
      open={open}
      onClose={onCancel}
      fullWidth
      maxWidth="xs"
      PaperProps={{
        sx: {
          borderRadius: '24px',
          p: { xs: '18px', sm: '22px' },
          maxWidth: 400,
          boxShadow: '0 1px 2px rgba(10,10,15,0.04), 0 30px 60px -20px rgba(10,10,15,0.18)',
        },
      }}
    >
      {/* Header */}
      <Stack direction="row" justifyContent="space-between" alignItems="flex-start" sx={{ mb: '6px' }}>
        <Box>
          <Typography sx={{ fontSize: '17px', fontWeight: 600, color: '#0A0A0F', lineHeight: 1.3 }}>
            {title}
          </Typography>
          <Typography sx={{ fontSize: '13px', color: '#6B6B76', mt: '3px' }}>
            {subtitle}
          </Typography>
        </Box>
        <IconButton onClick={onCancel} size="small" sx={{ color: 'rgba(10,10,15,0.4)', mt: '-4px', mr: '-6px' }}>
          <Iconify icon="mingcute:close-line" width={20} />
        </IconButton>
      </Stack>

      {/* Amount input block */}
      <Box
        sx={{
          mt: '14px',
          p: '16px',
          borderRadius: '16px',
          bgcolor: '#FAFAFB',
          border: '1px solid',
          borderColor: err ? 'error.main' : 'rgba(10,10,15,0.08)',
          transition: 'border-color 150ms ease',
          '&:focus-within': { borderColor: err ? 'error.main' : 'rgba(10,10,15,0.24)' },
        }}
      >
        <Typography
          sx={{
            fontSize: '12px',
            fontWeight: 500,
            color: 'rgba(10,10,15,0.45)',
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            mb: '10px',
          }}
        >
          {t('Amount')}
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Typography sx={{ fontSize: '24px', fontWeight: 600, color: 'rgba(10,10,15,0.35)', letterSpacing: '-0.02em', lineHeight: 1 }}>
            $
          </Typography>
          <Box
            component="input"
            type="number"
            autoFocus
            value={val}
            placeholder="0"
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
              setVal(e.target.value);
              if (err) setErr('');
            }}
            onKeyDown={(e: React.KeyboardEvent) => {
              if (e.key === '-') e.preventDefault();
              if (e.key === 'Enter') handleOk();
            }}
            sx={{
              flex: 1,
              border: 'none',
              outline: 'none',
              bgcolor: 'transparent',
              fontSize: '24px',
              fontWeight: 600,
              color: err ? 'error.main' : '#0A0A0F',
              letterSpacing: '-0.02em',
              fontFamily: '"Geist Mono", "Courier New", monospace',
              width: '100%',
              minWidth: 0,
              '&::placeholder': { color: 'rgba(10,10,15,0.2)' },
              '&::-webkit-inner-spin-button, &::-webkit-outer-spin-button': { appearance: 'none' },
            }}
          />
          {/* Token pill */}
          <Box
            sx={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              px: '10px',
              py: '6px',
              borderRadius: '100px',
              bgcolor: '#FFFFFF',
              border: '1px solid rgba(10,10,15,0.08)',
              flexShrink: 0,
            }}
          >
            <Image src={cdn('/tokens/USDC.webp')} alt={tokenLabel} width={18} height={18} style={{ objectFit: 'contain' }} />
            <Typography sx={{ fontSize: '13px', fontWeight: 600, color: '#0A0A0F' }}>
              {tokenLabel}
            </Typography>
          </Box>
        </Box>
      </Box>

      {/* Error / limits row */}
      {err ? (
        <Typography sx={{ fontSize: '12px', color: 'error.main', mt: '10px', px: '2px' }}>
          {err}
        </Typography>
      ) : (
        <Typography sx={{ fontSize: '12px', color: 'rgba(10,10,15,0.45)', mt: '10px', px: '2px' }}>
          {t('Min {{min}} · Max {{max}} · No MoneyGram fees', { min: fmt(min), max: fmt(max) })}
        </Typography>
      )}

      {/* CTA */}
      <Box
        component="button"
        onClick={handleOk}
        sx={{
          all: 'unset',
          boxSizing: 'border-box',
          width: '100%',
          mt: '16px',
          padding: '14px 16px',
          borderRadius: '14px',
          bgcolor: '#0A0A0F',
          color: '#FFFFFF',
          fontSize: '14px',
          fontWeight: 600,
          textAlign: 'center',
          cursor: 'pointer',
          transition: 'background 150ms ease, transform 150ms ease',
          '&:hover': { bgcolor: '#1A1A28', transform: 'translateY(-1px)' },
        }}
      >
        {t('Continue')}
      </Box>
    </Dialog>
  );
}
