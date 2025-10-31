import type { ButtonProps } from '@mui/material/Button';

import { useCallback } from 'react';
import { useTranslate } from '@/locales';
import { useRouter } from '@/routes/hooks';
import { logger } from '@normalfinance/utils';
import { usePrivy } from '@privy-io/react-auth';

import Button from '@mui/material/Button';

import { enqueueSnackbar } from '@/components/template/snackbar';

// ----------------------------------------------------------------------

type Props = ButtonProps & {
  onClose?: () => void;
};

export function SignOutButton({ onClose, sx, ...other }: Props) {
  const router = useRouter();

  const { logout } = usePrivy();

  const { t } = useTranslate();

  const handleLogout = useCallback(async () => {
    try {
      await logout();

      onClose?.();
      router.refresh();
    } catch (error) {
      logger.error(error);
      enqueueSnackbar('Unable to logout!', { variant: 'error' });
    }
  }, [logout, onClose, router]);

  return (
    <Button
      fullWidth
      variant="soft"
      size="large"
      color="error"
      onClick={handleLogout}
      sx={sx}
      {...other}
    >
      {t('Logout')}
    </Button>
  );
}
