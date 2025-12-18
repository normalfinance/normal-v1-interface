import type { IndexFundComponent } from '@normalfinance/types';

import { useTranslate } from '@/locales';
import { useState, useEffect } from 'react';
import { usePersistStore } from '@normalfinance/state';

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

type CustomComponentPercentageDialogProps = {
  open: boolean;
  components: IndexFundComponent[];
  onClose: () => void;
  onSave: (updatedComponents: IndexFundComponent[]) => void;
};

export default function CustomComponentPercentageDialog({
  open,
  components,
  onClose,
  onSave,
}: CustomComponentPercentageDialogProps) {
  const [localComponents, setLocalComponents] = useState<IndexFundComponent[]>([]);
  const { t } = useTranslate('auto');

  const {
    tokenState: { tokensByAddress },
  } = usePersistStore();

  // On open, copy props.components into local state so user can edit
  useEffect(() => {
    if (open) {
      // Make a fresh copy
      setLocalComponents(components.map((c) => ({ ...c })));
    }
  }, [open, components]);

  const handlePercentageChange = (componentId: string, value: number) => {
    setLocalComponents((prev) =>
      prev.map((c) => (c.contract === componentId ? { ...c, indexPercentage: value } : c))
    );
  };

  const handleSave = () => {
    // Return these updated components
    onSave(localComponents);
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
      <DialogTitle>{t('Enter Custom Percentages')}</DialogTitle>
      <DialogContent sx={{ width: '100%' }}>
        {localComponents.map((component) => {
          const token = tokensByAddress[component.contract];

          return (
            <Box key={component.contract} sx={{ mt: 2, width: '100%' }}>
              <Typography variant="subtitle2">
                {token.name}
                {t('(')}
                {token.symbol}
                {t(')')}
              </Typography>
              <TextField
                type="number"
                value={component.indexPercentage ?? ''}
                onChange={(e) => handlePercentageChange(component.contract, Number(e.target.value))}
                fullWidth
                InputProps={{ inputProps: { min: 0, max: 100 } }}
                label="Weight (%)"
                sx={{ mt: 1 }}
              />
            </Box>
          );
        })}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>{t('Cancel')}</Button>
        <Button onClick={handleSave} variant="contained">
          {t('Save')}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
