import React from 'react';
import { Button, Typography, Box } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { Iconify } from 'src/components/iconify';

interface SwapSendEmptyPopupButtonProps {
  label: string;
  onClick?: () => void;
}

export const SwapSendEmptyPopupButton: React.FC<SwapSendEmptyPopupButtonProps> = ({
  label,
  onClick,
}) => {
  const theme = useTheme();

  return (
    <Button
      onClick={onClick}
      sx={{
        backgroundColor: theme.palette.success.dark,
        textTransform: 'none',
        padding: '5px 12px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '8px',
        width: 'auto',
        borderRadius: '16px',
        '&:hover': {
          backgroundColor: theme.palette.success.main,
        },
      }}
    >
      <Typography
        variant="body1"
        sx={{
          flexGrow: 1,
          textAlign: 'center',
          color: theme.palette.common.white,
        }}
      >
        {label}
      </Typography>

      <Iconify
        icon="eva:arrow-ios-downward-fill"
        width={20}
        sx={{
          color: theme.palette.common.white,
        }}
      />
    </Button>
  );
};

export default SwapSendEmptyPopupButton;
