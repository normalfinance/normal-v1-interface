import type { IconButtonProps } from '@mui/material/IconButton';

import { m } from 'framer-motion';

import { Box } from '@mui/material';
import IconButton from '@mui/material/IconButton';
import { useColorScheme } from '@mui/material/styles';
import DarkModeOutlined from '@mui/icons-material/DarkModeOutlined';
import LightModeOutlined from '@mui/icons-material/LightModeOutlined';

import { varHover } from '@/components/template/animate';
import { useSettingsContext } from '@/components/template/settings';

export function LightDarkModeButton({ sx, ...other }: IconButtonProps) {
  const settings = useSettingsContext();
  const { setMode } = useColorScheme();

  const handleToggle = () => {
    const nextMode = settings.state.colorScheme === 'light' ? 'dark' : 'light';
    setMode(nextMode);
    settings.setField('colorScheme', nextMode);
  };

  return (
    <Box component={m.div}>
      <IconButton
        component={m.button}
        whileTap="tap"
        whileHover="hover"
        variants={varHover(1.05)}
        aria-label="Toggle dark mode"
        onClick={handleToggle}
        sx={[{ p: 0, width: 40, height: 40 }, ...(Array.isArray(sx) ? sx : [sx])]}
        {...other}
      >
        {settings.state.colorScheme === 'light' ? (
          <DarkModeOutlined sx={{ width: 22, height: 22, color: 'text.primary' }} />
        ) : (
          <LightModeOutlined sx={{ width: 22, height: 22, color: 'text.primary' }} />
        )}
      </IconButton>
    </Box>
  );
}
