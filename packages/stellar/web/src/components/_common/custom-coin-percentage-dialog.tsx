import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Typography,
  Box,
} from '@mui/material';
import { IndexCoin } from '@/types/indexes';

type CustomCoinPercentageDialogProps = {
  open: boolean;
  coins: IndexCoin[];
  onClose: () => void;
  onSave: (updatedCoins: IndexCoin[]) => void;
};

export default function CustomCoinPercentageDialog({
  open,
  coins,
  onClose,
  onSave,
}: CustomCoinPercentageDialogProps) {
  const [localCoins, setLocalCoins] = useState<IndexCoin[]>([]);

  // On open, copy props.coins into local state so user can edit
  useEffect(() => {
    if (open) {
      // Make a fresh copy
      setLocalCoins(coins.map((c) => ({ ...c })));
    }
  }, [open, coins]);

  const handlePercentageChange = (coinId: number, value: number) => {
    setLocalCoins((prev) =>
      prev.map((c) => (c.id === coinId ? { ...c, indexPercentage: value } : c))
    );
  };

  const handleSave = () => {
    // Return these updated coins
    onSave(localCoins);
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth>
      <DialogTitle>Enter Custom Percentages</DialogTitle>
      <DialogContent>
        {localCoins.map((coin) => (
          <Box key={coin.id} sx={{ mt: 2 }}>
            <Typography variant="subtitle2">
              {coin.name} ({coin.shortName})
            </Typography>
            <TextField
              type="number"
              value={coin.indexPercentage ?? ''}
              onChange={(e) => handlePercentageChange(coin.id, Number(e.target.value))}
              fullWidth
              InputProps={{ inputProps: { min: 0, max: 100 } }}
              label="Weight (%)"
              sx={{ mt: 1 }}
            />
          </Box>
        ))}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={handleSave} variant="contained">
          Save
        </Button>
      </DialogActions>
    </Dialog>
  );
}
