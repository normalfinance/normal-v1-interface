'use client';

import type { ButtonProps } from '@mui/material/Button';

import { usePrivy } from '@privy-io/react-auth';

import Button from '@mui/material/Button';

// ----------------------------------------------------------------------

type Props = ButtonProps & {
  title: string;
};

export function SignInButton({ title, sx, ...other }: Props) {
  const { ready, authenticated, login } = usePrivy();
  // Disable login when Privy is not ready or the user is already authenticated
  const disableLogin = !ready || (ready && authenticated);

  return (
    <Button
      disabled={disableLogin}
      onClick={login}
      variant="contained"
      color="info"
      sx={sx}
      {...other}
    >
      {title}
    </Button>
  );
}
