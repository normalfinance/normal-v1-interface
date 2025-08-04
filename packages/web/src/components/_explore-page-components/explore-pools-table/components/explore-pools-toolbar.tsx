import type { UseSetStateReturn } from 'minimal-shared/hooks';
import type { IMarketTableFilters } from '@/types/marketTable';

import { useCallback } from 'react';
import { useTranslate } from '@/locales';

import Box from '@mui/material/Box';
import TextField from '@mui/material/TextField';
import InputAdornment from '@mui/material/InputAdornment';

import { Iconify } from '@/components/template/iconify';

// ----------------------------------------------------------------------

type Props = {
  onResetPage: () => void;
  filters: UseSetStateReturn<IMarketTableFilters>;
};

export function ExplorePoolsTableToolbar({ filters, onResetPage }: Props) {
  const { t } = useTranslate();
  const { state: currentFilters, setState: updateFilters } = filters;

  const handleFilterName = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      // trackEvent('button_clicked', {
      //   label: 'Learn more',
      //   location: 'Home',
      // });
      onResetPage();
      updateFilters({ name: event.target.value });
    },
    [onResetPage, updateFilters]
  );

  return (
    <Box
      sx={{
        p: 2.5,
        gap: 2,
        display: 'flex',
        pr: { xs: 2.5, md: 1 },
        flexDirection: { xs: 'column', md: 'row' },
        alignItems: { xs: 'flex-end', md: 'center' },
      }}
    >
      <Box
        sx={{
          gap: 2,
          width: 1,
          flexGrow: 1,
          display: 'flex',
          alignItems: 'center',
        }}
      >
        <TextField
          fullWidth
          value={currentFilters.name}
          onChange={handleFilterName}
          placeholder={t('Search pools...')}
          sx={{
            ml: 'auto',
            maxWidth: 200,

            // ---- wrapper that draws the outline -----------------------------
            '& .MuiOutlinedInput-root': {
              bgcolor: 'grey.250',
              borderRadius: 9999,

              '& fieldset': {
                borderColor: 'divider',
              },
              '&:hover fieldset': {
                borderColor: 'divider',
              },
              '&.Mui-focused fieldset': {
                borderColor: 'divider',
              },
            },

            // ---- actual <input> element ------------------------------------
            '& .MuiInputBase-input': {
              py: '12px',
              px: '16px',
            },
          }}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <Iconify icon="eva:search-fill" sx={{ color: 'text.disabled' }} />
                </InputAdornment>
              ),
            },
          }}
        />
      </Box>
    </Box>
  );
}
