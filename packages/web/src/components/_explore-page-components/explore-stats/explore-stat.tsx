import { useTranslate } from '@/locales';
import { varAlpha } from 'minimal-shared/utils';
import { fPercent } from '@/utils/format-number';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import { useTheme } from '@mui/material/styles';
import Typography from '@mui/material/Typography';

import { Iconify } from '@/components/template/iconify';

// ----------------------------------------------------------------------

type Props = {
  title: string;
  total: number;
  percent: number;
  formatter: (value: number) => string;
};

export function ExploreStat({ title, total, percent, formatter }: Props) {
  const theme = useTheme();
  const { t } = useTranslate('auto');

  return (
    <Box
      sx={{
        width: 1,
        gap: 2.5,
        minWidth: 200,
        display: 'flex',
        alignItems: 'start',
        justifyContent: 'start',
        p: 2.5,
      }}
    >
      <Stack spacing={0.5}>
        <Typography variant="subtitle1" color="text.secondary">
          {title}
        </Typography>

        <Box component="span" sx={{ color: 'text.primary', typography: 'h4' }}>
          {formatter(total)}
        </Box>
        <Stack direction="row" spacing={0.5} alignItems="center">
          <Box
            component="span"
            sx={{
              width: 24,
              height: 24,
              display: 'flex',
              borderRadius: '50%',
              position: 'relative',
              alignItems: 'center',
              justifyContent: 'center',
              bgcolor: varAlpha(theme.vars.palette.success.mainChannel, 0.16),
              color: 'success.dark',
              ...theme.applyStyles('dark', {
                color: 'success.light',
              }),
              ...(percent < 0 && {
                bgcolor: varAlpha(theme.vars.palette.error.mainChannel, 0.16),
                color: 'error.dark',
                ...theme.applyStyles('dark', {
                  color: 'error.light',
                }),
              }),
            }}
          >
            <Iconify
              width={16}
              icon={percent < 0 ? 'eva:trending-down-fill' : 'eva:trending-up-fill'}
              color={performance && percent < 0 ? 'error.main' : 'success.main'}
            />
          </Box>
          <Typography
            variant="caption"
            sx={{
              color: percent < 0 ? 'error.main' : 'success.main',
            }}
          >
            {percent >= 0 && '+'}
            {fPercent(percent)}
          </Typography>
        </Stack>
      </Stack>
    </Box>
  );
}
