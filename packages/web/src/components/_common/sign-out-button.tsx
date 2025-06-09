import type { ButtonProps } from '@mui/material/Button';

import Button from '@mui/material/Button';

// ----------------------------------------------------------------------

type Props = ButtonProps & {
  onLogout?: () => void;
};

export function SignOutButton({ onLogout, sx, ...other }: Props) {
  return (
    <Button
      fullWidth
      variant="soft"
      size="large"
      color="error"
      onClick={onLogout}
      sx={sx}
      {...other}
    >
      Logout
    </Button>
  );
}
