import type { IconButtonProps } from '@mui/material/IconButton';

import { m } from 'framer-motion';
import { cdn } from '@normalfinance/utils';

import { Box } from '@mui/material';
import IconButton from '@mui/material/IconButton';
import { useColorScheme } from '@mui/material/styles';

import { varHover } from '@/components/template/animate';
import { SvgColor } from '@/components/template/svg-color';
import { useSettingsContext } from '@/components/template/settings';

// ----------------------------------------------------------------------

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
        <SvgColor
          src={cdn(`/nav/ic_${settings.state.colorScheme === 'light' ? 'moon' : 'sun'}.svg`)}
          sx={{ width: 24, height: 24 }}
        />
      </IconButton>
    </Box>
  );
}
