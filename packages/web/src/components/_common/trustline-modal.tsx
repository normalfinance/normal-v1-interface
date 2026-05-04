'use client';

import { useTranslate } from '@/locales';
import { useStellarConfig } from '@/hooks';
import { useTrustLine } from '@/hooks/stellar/tokens/use-trustline';
import { getSavingsUsdcIssuer, getSavingsDepositTokenLabel } from '@/utils/token-selectors';

import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import Typography from '@mui/material/Typography';
import DialogTitle from '@mui/material/DialogTitle';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import CircularProgress from '@mui/material/CircularProgress';

import { Iconify } from '@/components/template/iconify';
import { useSnackbar } from '@/components/template/snackbar';

// ----------------------------------------------------------------------

interface TrustlineModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void | Promise<void>;
}

// ----------------------------------------------------------------------

export function TrustlineModal({ open, onClose, onSuccess }: TrustlineModalProps) {
  const { t } = useTranslate();
  const { enqueueSnackbar } = useSnackbar();
  const { addTrustLine, loading } = useTrustLine();
  const config = useStellarConfig();

  const usdcIssuer = getSavingsUsdcIssuer(config);
  const usdcLabel = getSavingsDepositTokenLabel(config);

  const handleAddTrustline = async () => {
    if (!usdcIssuer) return;
    try {
      await addTrustLine('USDC', usdcIssuer);
      enqueueSnackbar(t('{{label}} trustline added!', { label: usdcLabel }), {
        variant: 'success',
      });
      await onSuccess();
    } catch (e: any) {
      enqueueSnackbar(e?.message || t('Failed to add trustline'), { variant: 'error' });
    }
  };

  return (
    <Dialog fullWidth maxWidth="xs" open={open} onClose={loading ? undefined : onClose}>
      <DialogTitle>{t('Trustline Required')}</DialogTitle>

      <DialogContent>
        <Typography variant="body2" color="text.secondary">
          {t(
            'To use savings, you need to enable the {{label}} trustline on your wallet. This is a one-time setup.',
            { label: usdcLabel }
          )}
        </Typography>
      </DialogContent>

      <DialogActions>
        <Button variant="outlined" color="inherit" onClick={onClose} disabled={loading}>
          {t('Cancel')}
        </Button>

        <Button
          variant="contained"
          color="primary"
          onClick={handleAddTrustline}
          disabled={loading}
          startIcon={
            loading ? (
              <CircularProgress size={16} color="inherit" />
            ) : (
              <Iconify icon="solar:add-circle-bold" />
            )
          }
        >
          {loading ? t('Adding trustline...') : t('Add USDC trustline')}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
