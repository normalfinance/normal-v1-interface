'use client';

import { useCopyToClipboard } from '@/hooks/use-copy-to-clipboard';

// @mui
import { Tooltip, IconButton } from '@mui/material';

// components
import { Iconify } from '@/components/template/iconify';
// hooks
import { useSnackbar } from '@/components/template/snackbar';

// ----------------------------------------------------------------------

type Props = {
  value: string;
  alert: string;
};

export default function CopyIconButton({ value, alert }: Props) {
  const { copy } = useCopyToClipboard();

  const { enqueueSnackbar } = useSnackbar();

  return (
    <Tooltip title="Copy">
      <IconButton
        onClick={() => {
          // trackEvent('button_clicked', {
          //   label: 'Copy',
          //   location: 'Home',
          // });
          copy(value);
          enqueueSnackbar(alert);
        }}
      >
        <Iconify icon="solar:copy-outline" />
      </IconButton>
    </Tooltip>
  );
}
