'use client';

import type { IndexCoin } from '@/types/indexes';

import { useTranslate } from '@/locales';
import { useState, useEffect } from 'react';

import {
  Box,
  Dialog,
  Button,
  TextField,
  Typography,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';

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
  const { t } = useTranslate();
  const [localCoins, setLocalCoins] = useState<IndexCoin[]>([]);

  useEffect(() => {
    if (open) {
      setLocalCoins(coins.map((c) => ({ ...c })));
    }
  }, [open, coins]);

  const handlePercentageChange = (coinId: number, value: number) => {
    setLocalCoins((prev) =>
      prev.map((c) => (c.id === coinId ? { ...c, indexPercentage: value } : c))
    );
  };

  const handleSave = () => {
    onSave(localCoins);
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
      <DialogTitle>
        {t('createIndex.customPercentages.title', 'Enter Custom Percentages')}
      </DialogTitle>
      <DialogContent sx={{ width: '100%' }}>
        {localCoins.map((coin) => (
          <Box key={coin.id} sx={{ mt: 2, width: '100%' }}>
            <Typography variant="subtitle2">
              {coin.name} ({coin.shortName})
            </Typography>
            <TextField
              type="number"
              value={coin.indexPercentage ?? ''}
              onChange={(e) => handlePercentageChange(coin.id, Number(e.target.value))}
              fullWidth
              InputProps={{ inputProps: { min: 0, max: 100 } }}
              label={t('createIndex.customPercentages.weightLabel', 'Weight (%)')}
              sx={{ mt: 1 }}
            />
          </Box>
        ))}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>{t('common.cancel', 'Cancel')}</Button>
        <Button onClick={handleSave} variant="contained">
          {t('common.save', 'Save')}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
