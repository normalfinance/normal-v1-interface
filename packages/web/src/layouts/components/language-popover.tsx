'use client';

import type { LanguageValue } from '@/locales';
import type { IconButtonProps } from '@mui/material/IconButton';

import { m } from 'framer-motion';
import { useCallback } from 'react';
import { useTranslate } from '@/locales';
import { usePopover } from 'minimal-shared/hooks';
import { trackEvent } from '@normalfinance/utils';

import MenuList from '@mui/material/MenuList';
import MenuItem from '@mui/material/MenuItem';
import IconButton from '@mui/material/IconButton';

import { FlagIcon } from '@/components/template/flag-icon';
import { CustomPopover } from '@/components/template/custom-popover';
import { varTap, varHover, transitionTap } from '@/components/template/animate';

// ----------------------------------------------------------------------

export type LanguagePopoverProps = IconButtonProps & {
  data?: {
    value: string;
    label: string;
    countryCode: string;
  }[];
};

export function LanguagePopover({ data = [], sx, ...other }: LanguagePopoverProps) {
  const { open, anchorEl, onClose, onOpen } = usePopover();

  const { onChangeLang, currentLang } = useTranslate();

  const handleChangeLang = useCallback(
    (newLang: LanguageValue) => {
      trackEvent('button_clicked', {
        label: 'Manage Stake',
        location: 'Insurance',
      });
      onChangeLang(newLang);
      onClose();
    },
    [onChangeLang, onClose]
  );

  const renderMenuList = () => (
    <CustomPopover open={open} anchorEl={anchorEl} onClose={onClose}>
      <MenuList sx={{ width: 160, minHeight: 72 }}>
        {data?.map((option) => (
          <MenuItem
            key={option.value}
            selected={option.value === currentLang.value}
            onClick={() => handleChangeLang(option.value as LanguageValue)}
          >
            <FlagIcon code={option.countryCode} />
            {option.label}
          </MenuItem>
        ))}
      </MenuList>
    </CustomPopover>
  );

  return (
    <>
      <IconButton
        component={m.button}
        whileTap={varTap(0.96)}
        whileHover={varHover(1.04)}
        transition={transitionTap()}
        data-testid="languages-button"
        aria-label="languages-button"
        onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
          trackEvent('button_clicked', {
            label: 'Manage Stake',
            location: 'Insurance',
          });
          onOpen(e);
        }}
        sx={[
          (theme) => ({
            p: 0,
            width: 40,
            height: 40,
            ...(open && { bgcolor: theme.vars.palette.action.selected }),
          }),
          ...(Array.isArray(sx) ? sx : [sx]),
        ]}
        {...other}
      >
        <FlagIcon code={currentLang.countryCode} />
      </IconButton>

      {renderMenuList()}
    </>
  );
}
