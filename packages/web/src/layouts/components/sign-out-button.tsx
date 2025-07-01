import { useTranslate } from '@/locales';
import type { ButtonProps } from '@mui/material/Button';

import { useCallback } from 'react';
import { usePrivy } from '@privy-io/react-auth';

import Button from '@mui/material/Button';

import { useRouter } from '@/routes/hooks';

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
      console.error(error);
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
