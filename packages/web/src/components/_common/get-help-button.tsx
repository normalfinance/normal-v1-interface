import React from 'react';
import { Button, ButtonProps, Typography } from '@mui/material';
import { useTheme, alpha } from '@mui/material/styles';
import { Iconify } from '../iconify';

/**
 * Small utility button for opening a support / help flow.
 * Accepts all regular MUI `Button` props.
 */
export interface GetHelpButtonProps extends ButtonProps {
  /** Overwrite the default label ("Get help") */
  label?: string;
}

const GetHelpButton: React.FC<GetHelpButtonProps> = ({ label = 'Get help', sx, ...other }) => {
  const theme = useTheme();

  return (
    <Button
      variant="outlined"
      {...other}
      sx={{
        border: `1px solid ${theme.palette.divider}`,
        backgroundColor: alpha(theme.palette.grey[500], 0.08),
        textTransform: 'none',
        ...sx,
        '&:hover': {
          backgroundColor: alpha(theme.palette.grey[500], 0.16),
          border: `1px solid ${theme.palette.divider}`,
        },
        gap: 1,
        borderRadius: '32px',
        px: '6px',
        py: '4px',
      }}
    >
      <Iconify icon="fluent:mail-checkmark-24-filled" width={14} />

      <Typography
        sx={{
          fontSize: '12px',
        }}
      >
        {label}
      </Typography>
    </Button>
  );
};

export default GetHelpButton;
