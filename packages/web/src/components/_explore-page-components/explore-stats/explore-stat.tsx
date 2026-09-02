import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

// ----------------------------------------------------------------------

type Props = {
  title: string;
  total: number;
  percent: number;
  formatter: (value: number) => string;
};

export function ExploreStat({ title, total, percent, formatter }: Props) {
  return (
    <Box
      sx={{
        width: 1,
        gap: 2.5,
        minWidth: 200,
        display: 'flex',
        alignItems: 'start',
        justifyContent: 'start',
        p: 4,
      }}
      data-testid={`explore-stat-${title.toLowerCase().replace(/\s+/g, '-')}`}
    >
      <Stack spacing={0.5}>
        <Typography sx={{ typography: 'h5', fontSize: 20, mb: 1 }} color="text.primary">
          {title}
        </Typography>

        <Box component="span" sx={{ my: 1.5, typography: 'h3', fontSize: 32 }} mt={8}>
          {formatter(total)}
        </Box>
        {/* <Stack direction="row" spacing={0.5} alignItems="center">
          <Box
            sx={{
              gap: 0.5,
              display: 'inline-flex',
              alignItems: 'center',
              px: '12px',
              py: '6px',
              backgroundColor: 'grey.100',
              border: 1,
              borderColor: 'divider',
              borderRadius: 9999,
            }}
          >
            <Iconify
              width={16}
              icon={
                percent < 0
                  ? 'solar:double-alt-arrow-down-bold-duotone'
                  : 'solar:double-alt-arrow-up-bold-duotone'
              }
              sx={{ color: percent < 0 ? 'error.main' : 'success.main' }}
            />

            <Box component="span" sx={{ typography: 'subtitle2', fontWeight: 700 }}>
              {percent > 0 && '+'}
              {fPercent(percent)}
            </Box>

            <Box component="span" sx={{ color: 'text.secondary', typography: 'body2' }}>
              {t('last 7 days')}
            </Box>
          </Box>
        </Stack> */}
      </Stack>
    </Box>
  );
}
