import React from 'react';
import { Button, Typography, Box } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { Iconify } from 'src/components/iconify';

interface SwapSendPopupButtonProps {
  imgUrl: string;
  label: string;
  onClick?: () => void;
}

export const SwapSendPopupButton: React.FC<SwapSendPopupButtonProps> = ({
  imgUrl,
  label,
  onClick,
}) => {
  const theme = useTheme();

  return (
    <Button
      onClick={onClick}
      sx={{
        border: `1px solid ${theme.palette.divider}`,
        textTransform: 'none',
        padding: '4px 4px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '8px',
        width: 'auto',
        borderRadius: '16px',
      }}
    >
      <Box
        component="img"
        src={imgUrl}
        alt="button image"
        sx={{
          width: '27px',
          height: '27px',
          flexShrink: 0,
          borderRadius: '50%',
          objectFit: 'cover',
          aspectRatio: '1 / 1',
        }}
      />

      <Typography
        variant="body1"
        sx={{
          textTransform: 'uppercase',
          flexGrow: 1,
          textAlign: 'center',
        }}
      >
        {label}
      </Typography>

      <Iconify
        icon="eva:arrow-ios-downward-fill"
        width={20}
        sx={{
          color: theme.palette.text.primary,
        }}
      />
    </Button>
  );
};

export default SwapSendPopupButton;
