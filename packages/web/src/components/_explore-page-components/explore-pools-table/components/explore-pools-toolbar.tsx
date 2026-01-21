import type { IPairTableFilters } from '@/types/pairTable';
import type { UseSetStateReturn } from 'minimal-shared/hooks';

import { useCallback } from 'react';
import { logger } from '@/middleware';
import { useSnackbar } from 'notistack';
import { useTranslate } from '@/locales';
import { usePersistStore } from '@normalfinance/state';

import Box from '@mui/material/Box';
import TextField from '@mui/material/TextField';
import InputAdornment from '@mui/material/InputAdornment';

import { Iconify } from '@/components/template/iconify';
import RefreshButton from '@/components/_common/refresh-button';

// ----------------------------------------------------------------------

type Props = {
  onResetPage: () => void;
  filters: UseSetStateReturn<IPairTableFilters>;
};

export function ExplorePoolsTableToolbar({ filters, onResetPage }: Props) {
  const { t } = useTranslate();

  const { enqueueSnackbar } = useSnackbar();

  const { getAllPairs } = usePersistStore();

  const { state: currentFilters, setState: updateFilters } = filters;

  const handleFilterName = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      onResetPage();
      updateFilters({ name: event.target.value });
    },
    [onResetPage, updateFilters]
  );

  const onRefresh = async () => {
    enqueueSnackbar('Refreshing assets', { variant: 'info' });

    try {
      await getAllPairs();
    } catch (error) {
      logger.error('Asset refresh error:', error);
    } finally {
      // setCreatingTrustline(false);
    }
  };

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
          placeholder={t('Search assets...')}
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
      <RefreshButton onRefresh={onRefresh} />
    </Box>
  );
}
