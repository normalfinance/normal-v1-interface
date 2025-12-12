import * as React from 'react';
import Image from 'next/image';
import { useTranslate } from '@/locales';

import {
  Box,
  Stack,
  Dialog,
  Button,
  Avatar,
  TextField,
  Typography,
  DialogTitle,
  DialogContent,
  DialogActions,
  InputAdornment,
} from '@mui/material';
import { cdn } from '@normalfinance/utils';

type Props = {
  open: boolean;
  onCancel: () => void;
  onConfirm: (amount: string) => void;
  defaultAmount?: string;
  min?: number;
  max?: number;

  /** NEW: controls copy */
  kind?: 'deposit' | 'withdraw';
  /** OPTIONAL: token name in copy */
  tokenLabel?: string;
};

export default function AmountDialog({
  open,
  onCancel,
  onConfirm,
  defaultAmount = '',
  min = 1,
  max = 900,
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
  const title = isWithdraw
    ? t('Sell {{token}} with MoneyGram', { token: tokenLabel })
    : t('Buy {{token}} with MoneyGram', { token: tokenLabel });

  const subtitle = isWithdraw
    ? t('Enter how much {{token}} you’d like to cash out.', { token: tokenLabel })
    : t('Enter how much {{token}} you’d like to purchase.', { token: tokenLabel });

  return (
    <Dialog
      open={open}
      onClose={onCancel}
      PaperProps={{
        sx: { borderRadius: 3, p: 1.5, minWidth: 360 },
      }}
    >
      <DialogTitle
        sx={{
          fontWeight: 600,
          textAlign: 'center',
          pb: 2,
          alignItems: 'center',
          justifyContent: 'center',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <Avatar sx={{ width: 56, height: 56, bgcolor: 'transparent', mb: 1 }}>
          <Image src={cdn('/tokens/usdc.webp')} alt={t(tokenLabel)} width={48} height={48} />
        </Avatar>
        {title}
      </DialogTitle>

      <DialogContent sx={{ pt: 2 }}>
        <Stack spacing={2} alignItems="center">
          <Typography variant="body2" sx={{ textAlign: 'center', color: 'text.secondary' }}>
            {subtitle}
          </Typography>

          <TextField
            fullWidth
            autoFocus
            type="number"
            placeholder="0"
            value={val}
            onChange={(e) => setVal(e.target.value)}
            inputProps={{ min, max, step: '1' }}
            error={!!err}
            helperText={err || <span aria-hidden="true">&nbsp;</span>}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Box
                    sx={{
                      width: 20,
                      height: 20,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Image
                      src={cdn('/tokens/usdc.webp')}
                      alt={t(tokenLabel)}
                      width={20}
                      height={20}
                      style={{ objectFit: 'contain' }}
                    />
                  </Box>
                </InputAdornment>
              ),
            }}
          />
        </Stack>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2, pt: 0 }}>
        <Button onClick={onCancel} variant="outlined" sx={{ borderRadius: 2 }}>
          {t('Cancel')}
        </Button>
        <Button onClick={handleOk} variant="contained" sx={{ borderRadius: 2 }}>
          {t('Continue')}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
