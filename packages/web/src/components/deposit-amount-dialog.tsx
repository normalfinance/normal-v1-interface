import * as React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Stack,
  Typography,
  InputAdornment,
  Avatar,
  Box,
} from '@mui/material';
import Image from 'next/image';

type Props = {
  open: boolean;
  onCancel: () => void;
  onConfirm: (amount: string) => void;
  defaultAmount?: string;
  min?: number;
  max?: number;
};

export default function AmountDialog({
  open,
  onCancel,
  onConfirm,
  defaultAmount = '',
  min = 1,
  max = 900,
}: Props) {
  const [val, setVal] = React.useState<string>(defaultAmount);
  const [err, setErr] = React.useState<string>('');

  React.useEffect(() => {
    if (!open) return;
    setVal(defaultAmount);
    setErr('');
  }, [open, defaultAmount]);

  const validate = (s: string) => {
    if (!s?.trim()) return 'Enter an amount';
    const n = Number(s);
    if (!Number.isFinite(n)) return 'Amount must be a number';
    if (n <= 0) return 'Amount must be > 0';
    if (n < min || n > max) return `Amount must be between ${min} and ${max} USDC`;
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
          <Image
            src="/assets/images/token-action-card/usdc.webp"
            alt="USDC"
            width={48}
            height={48}
          />
        </Avatar>
        Buy USDC with MoneyGram
      </DialogTitle>

      <DialogContent sx={{ pt: 2 }}>
        <Stack spacing={2} alignItems="center">
          <Typography variant="body2" sx={{ textAlign: 'center', color: 'text.secondary' }}>
            Enter how much <strong>USDC</strong> you’d like to purchase.
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
            helperText={err || ' '}
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
                      src="/assets/images/token-action-card/usdc.webp"
                      alt="USDC"
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
          Cancel
        </Button>
        <Button onClick={handleOk} variant="contained" sx={{ borderRadius: 2 }}>
          Continue
        </Button>
      </DialogActions>
    </Dialog>
  );
}
