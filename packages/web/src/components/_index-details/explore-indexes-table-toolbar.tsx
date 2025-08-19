'use client';

import type { UseSetStateReturn } from 'minimal-shared/hooks';
import type { IMarketTableFilters } from '@/types/marketTable';

import Link from 'next/link';
import { useTranslate } from '@/locales';
import { forwardRef, useCallback } from 'react';

import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import { alpha } from '@mui/material/styles';
import TextField from '@mui/material/TextField';
import InputAdornment from '@mui/material/InputAdornment';

import { Iconify } from '@/components/template/iconify';

type Props = {
  filters: UseSetStateReturn<IMarketTableFilters>;
  onResetPage: () => void;
  onCreateIndex?: () => void;
  createHref?: string;
  createLabel?: string;
  placeholder?: string;
};

export const ExploreIndexesTableToolbar = ({
  filters,
  onResetPage,
  onCreateIndex,
  createHref,
  createLabel,
  placeholder,
}: Props) => {
  const { t } = useTranslate();
  const { state: currentFilters, setState: updateFilters } = filters;

  const handleFilterName = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      onResetPage();
      updateFilters({ name: event.target.value });
    },
    [onResetPage, updateFilters]
  );

  // Button as Link when createHref is provided
  const ButtonComponent = createHref
    ? forwardRef<HTMLAnchorElement, any>((props, ref) => (
        <Button ref={ref} component={Link} href={createHref} {...props} />
      ))
    : Button;

  return (
    <Box
      sx={{
        py: 2.5,
        display: 'flex',
        gap: 2,
        alignItems: { xs: 'stretch', md: 'center' },
        flexDirection: { xs: 'column', md: 'row' },
      }}
    >
      {/* Left: Create index */}
      <Box sx={{ flexShrink: 0 }}>
        <ButtonComponent
          variant="contained"
          color="secondary"
          startIcon={<Iconify icon="solar:add-square-bold" />}
          onClick={createHref ? undefined : onCreateIndex}
          sx={{ borderRadius: 2 }}
          href=""
        >
          {createLabel ?? t('Create index')}
        </ButtonComponent>
      </Box>

      {/* Right: Search */}
      <Box sx={{ flex: 1, display: 'flex', justifyContent: { xs: 'stretch', md: 'flex-end' } }}>
        <TextField
          value={currentFilters.name}
          onChange={handleFilterName}
          placeholder={placeholder ?? t('Search indexes...')}
          sx={{
            ml: { xs: 0, md: 'auto' },
            maxWidth: 260,
            width: { xs: '100%', md: 1 },
            '& .MuiOutlinedInput-root': {
              bgcolor: (theme) => alpha(theme.palette.grey[500], 0.08),
              borderRadius: 9999,
              '& fieldset': { borderColor: 'divider' },
              '&:hover fieldset': { borderColor: 'divider' },
              '&.Mui-focused fieldset': { borderColor: 'divider' },
            },
            '& .MuiInputBase-input': { py: '12px', px: '16px' },
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
};
