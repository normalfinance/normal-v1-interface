// @mui
import Box from '@mui/material/Box';
import { Stack, Typography } from '@mui/material';
import { ReactNode } from 'react';

// ----------------------------------------------------------------------

type Props = {
  title: ReactNode;
  subheader?: ReactNode;
  data?: number;
};

export default function PageHeader({ title, subheader, data }: Props) {
  return (
    <Box
      sx={{
        mb: { xs: 3, md: 5 },
      }}
    >
      <Stack spacing={0.5}>
        <Stack spacing={1} direction="row" alignItems="center">
          <Typography variant="h4">
            {title} {data !== undefined && `(${data})`}
          </Typography>
        </Stack>

        {subheader && (
          <Typography variant="body2" sx={{ color: 'text.disabled' }}>
            {subheader}
          </Typography>
        )}
      </Stack>
    </Box>
  );
}
