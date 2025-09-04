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
} from '@mui/material';

type Props = {
  open: boolean;
  onCancel: () => void;
  onConfirm: (amount: string) => void; // pass as string to avoid float quirks
  defaultAmount?: string; // optional prefill
  // If you're on sandbox/testnet, MoneyGram demo usually wants 10–20 USDC
  min?: number; // default 10
  max?: number; // default 20
};

export default function AmountDialog({
  open,
  onCancel,
  onConfirm,
  defaultAmount = '',
  min = 10,
  max = 20,
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
    // Helpful guard for MoneyGram sandbox thresholds:
    if (n < min || n > max) return `Sandbox amount must be between ${min} and ${max} USDC`;
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
    <Dialog open={open} onClose={onCancel}>
      <DialogTitle>Buy with MoneyGram</DialogTitle>
      <DialogContent>
        <Stack spacing={1} sx={{ pt: 1 }}>
          <Typography variant="body2">
            Enter how much USDC you want to purchase (sandbox typically requires 10–20 USDC).
          </Typography>
          <TextField
            autoFocus
            type="number"
            label="Amount (USDC)"
            value={val}
            onChange={(e) => setVal(e.target.value)}
            inputProps={{ min, max, step: '1' }}
            error={!!err}
            helperText={err || ' '}
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onCancel} color="inherit">
          Cancel
        </Button>
        <Button onClick={handleOk} variant="contained">
          Continue
        </Button>
      </DialogActions>
    </Dialog>
  );
}
