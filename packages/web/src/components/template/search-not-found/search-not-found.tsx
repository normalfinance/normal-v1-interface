import type { BoxProps } from '@mui/material/Box';
import type { Theme, SxProps } from '@mui/material/styles';
import type { TypographyProps } from '@mui/material/Typography';

import { useTranslate } from '@/locales';

import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';

// ----------------------------------------------------------------------

type SearchNotFoundProps = BoxProps & {
  query?: string;
  sx?: SxProps<Theme>;
  slotProps?: {
    title?: TypographyProps;
    description?: TypographyProps;
  };
};

export function SearchNotFound({ query, sx, slotProps, ...other }: SearchNotFoundProps) {
  const { t } = useTranslate();
  if (!query) {
    return (<Typography variant="body2" {...slotProps?.description}>{t('Please enter keywords')}</Typography>);
  }

  return (
    <Box
      sx={[
        {
          gap: 1,
          display: 'flex',
          borderRadius: 1.5,
          textAlign: 'center',
          flexDirection: 'column',
        },
        ...(Array.isArray(sx) ? sx : [sx]),
      ]}
      {...other}
    >
      <Typography
        variant="h6"
        {...slotProps?.title}
        sx={[
          { color: 'text.primary' },
          ...(Array.isArray(slotProps?.title?.sx)
            ? (slotProps?.title?.sx ?? [])
            : [slotProps?.title?.sx]),
        ]}
      >{t('Not found')}</Typography>
      <Typography variant="body2" {...slotProps?.description}>{t('No results found for')}<strong>{`"${query}"`}</strong>{t('.')}<br />{t('Try checking for typos or using complete words.')}</Typography>
    </Box>
  );
}
