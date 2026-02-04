'use client';

import { usePasteFromClipboard } from '@/hooks';

// @mui
import { Tooltip, IconButton } from '@mui/material';

// components
import { Iconify } from '@/components/template/iconify';
// hooks
import { useSnackbar } from '@/components/template/snackbar';

// ----------------------------------------------------------------------

type Props = {
  alert: string;
  onSubmit: (value: string) => boolean;
};

export default function PasteIconButton({ alert, onSubmit }: Props) {
  const { paste } = usePasteFromClipboard();

  const { enqueueSnackbar } = useSnackbar();

  const handleClick = async () => {
    const value = await paste();
    if (!value || value === '') {
      enqueueSnackbar('Failed to paste', { variant: 'error' });
      return;
    }

    const success = onSubmit(value);
    if (success) enqueueSnackbar(alert, { variant: 'success' });
  };

  return (
    <Tooltip title="Paste">
      <IconButton onClick={handleClick}>
        <Iconify icon="solar:copy-outline" />
      </IconButton>
    </Tooltip>
  );
}
