'use client';

import type { Token } from '@normalfinance/types';
import type { BoxProps } from '@mui/material/Box';
import type { Breakpoint } from '@mui/material/styles';

import { paths } from '@/routes/paths';
import { BigNumber } from 'bignumber.js';
import { useTranslate } from '@/locales';
import { useRouter } from '@/routes/hooks';
import parse from 'autosuggest-highlight/parse';
import match from 'autosuggest-highlight/match';
import { useBoolean } from 'minimal-shared/hooks';
import { fCurrency } from '@/utils/format-number';
import { getCryptoIconUrl } from '@normalfinance/utils';
import { useMemo, useState, useEffect, useCallback } from 'react';
import { useAppStore, usePersistStore } from '@normalfinance/state';

import Box from '@mui/material/Box';
import Avatar from '@mui/material/Avatar';
import SvgIcon from '@mui/material/SvgIcon';
import MenuList from '@mui/material/MenuList';
import { useTheme } from '@mui/material/styles';
import Typography from '@mui/material/Typography';
import ListItemText from '@mui/material/ListItemText';
import InputAdornment from '@mui/material/InputAdornment';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemAvatar from '@mui/material/ListItemAvatar';
import Dialog, { dialogClasses } from '@mui/material/Dialog';
import MenuItem, { menuItemClasses } from '@mui/material/MenuItem';
import InputBase, { inputBaseClasses } from '@mui/material/InputBase';

import { Label } from '@/components/template/label';
import { Iconify } from '@/components/template/iconify';
import { Scrollbar } from '@/components/template/scrollbar';
import { SearchNotFound } from '@/components/template/search-not-found';

// ----------------------------------------------------------------------

const breakpoint: Breakpoint = 'sm';

export function Searchbar({ sx, ...other }: BoxProps) {
  const { t } = useTranslate('auto');
  const theme = useTheme();
  const router = useRouter();

  const { globalIsLoading } = useAppStore();
  const {
    tokenState: { tokens },
  } = usePersistStore();

  const { value: open, onFalse: onClose, onTrue: onOpen, onToggle } = useBoolean();
  const [searchQuery, setSearchQuery] = useState('');

  const handleClose = useCallback(() => {
    onClose();
    setSearchQuery('');
  }, [onClose]);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (event.metaKey && event.key.toLowerCase() === 'k') {
        onToggle();
        setSearchQuery('');
      }
    },
    [onToggle]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);

  // Filter tokens with balance > 0
  const tokensWithBalance = useMemo(
    () => tokens.filter((token) => BigNumber(token.balance).gt(0)),
    [tokens]
  );

  // Filter tokens based on search query
  const dataFiltered = useMemo(() => {
    if (!searchQuery) return tokensWithBalance;

    const query = searchQuery.toLowerCase();
    return tokensWithBalance.filter(
      (token) =>
        token.symbol.toLowerCase().includes(query) || token.name.toLowerCase().includes(query)
    );
  }, [tokensWithBalance, searchQuery]);

  const handleAssetClick = useCallback(
    (token: Token) => {
      setTimeout(() => handleClose(), 50);
      router.push(paths.assets.details(token.symbol));
    },
    [router, handleClose]
  );

  const handleSearch = useCallback((event: React.ChangeEvent<HTMLTextAreaElement>) => {
    setSearchQuery(event.target.value);
  }, []);

  const notFound = searchQuery.length > 0 && dataFiltered.length === 0;

  const renderButton = () => (
    <Box
      onClick={onOpen}
      sx={[
        // Base: look like the Explore TextField on every breakpoint
        (_theme) => ({
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          pr: 1,
          pl: 0.5,
          py: 0.25,
          borderRadius: 9999,
          cursor: 'pointer',
          bgcolor: _theme.palette.grey[100],
          border: `1px solid ${_theme.palette.divider}`,
          ..._theme.applyStyles('dark', { bgcolor: _theme.palette.grey[800] }),
          transition: _theme.transitions.create('background-color', {
            easing: _theme.transitions.easing.easeInOut,
            duration: _theme.transitions.duration.shortest,
          }),
          '&:hover': {
            bgcolor: _theme.vars
              ? `color-mix(in srgb, rgba(${_theme.vars.palette.grey['500Channel']} / 1) 16%, transparent)`
              : _theme.palette.action.hover,
          },
          color: 'text.secondary',
        }),
        // Allow caller to override/extend
        ...(Array.isArray(sx) ? sx : [sx]),
      ]}
      {...other}
    >
      {/* Left icon (same on all sizes now) */}
      <Box
        component="span"
        sx={{
          p: 1,
          display: 'inline-flex',
          color: 'text.disabled',
        }}
      >
        <SvgIcon sx={{ width: 20, height: 20 }}>
          <path
            fill="currentColor"
            d="m20.71 19.29l-3.4-3.39A7.92 7.92 0 0 0 19 11a8 8 0 1 0-8 8a7.92 7.92 0 0 0 4.9-1.69l3.39 3.4a1 1 0 0 0 1.42 0a1 1 0 0 0 0-1.42M5 11a6 6 0 1 1 6 6a6 6 0 0 1-6-6"
          />
        </SvgIcon>
      </Box>

      {/* "Placeholder" text */}
      <Box component="span" sx={{ typography: 'body2', flexShrink: 0 }}>
        {t('Search assets...')}
      </Box>

      {/* ⌘K helper shown at sm+  */}
      <Label
        sx={(_theme) => ({
          ml: 'auto',
          color: 'text.primary',
          cursor: 'inherit',
          bgcolor: _theme.palette.background.paper,
          fontSize: _theme.typography.pxToRem(12),
          boxShadow: _theme.vars.customShadows.z1,
          display: { xs: 'none', [breakpoint]: 'inline-flex' },
          ..._theme.applyStyles('dark', {
            border: `1px solid ${_theme.palette.divider}`,
          }),
        })}
      >
        {t('⌘K')}
      </Label>
    </Box>
  );

  const renderList = () => {
    if (globalIsLoading) {
      return (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 4 }}>
          <Typography variant="body2" color="text.secondary">
            {t('Loading assets...')}
          </Typography>
        </Box>
      );
    }

    // Show empty state when no tokens are available
    if (tokensWithBalance.length === 0) {
      return (
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 4 }}>
          <Iconify icon="eva:search-fill" width={48} sx={{ color: 'text.disabled', mb: 2 }} />
          <Typography variant="body2" color="text.secondary" align="center">
            {t('No assets in wallet')}
          </Typography>
          <Typography variant="caption" color="text.disabled" align="center">
            {t('Connect your wallet to see your assets')}
          </Typography>
        </Box>
      );
    }

    return (
      <MenuList
        disablePadding
        sx={{
          [`& .${menuItemClasses.root}`]: {
            p: 0,
            mb: 0,
            '&:hover': { bgcolor: 'transparent' },
          },
        }}
      >
        {dataFiltered.map((token) => {
          const partsSymbol = parse(token.symbol, match(token.symbol, searchQuery));
          const partsName = parse(token.name, match(token.name, searchQuery));
          const balance = BigNumber(token.balance);
          const value = balance.multipliedBy(token.price);

          return (
            <MenuItem disableRipple key={token.contract}>
              <ListItemButton
                onClick={() => handleAssetClick(token)}
                sx={{
                  borderWidth: 1,
                  borderStyle: 'dashed',
                  borderColor: 'transparent',
                  borderBottomColor: theme.vars?.palette.divider || theme.palette.divider,
                  '&:hover': {
                    borderRadius: 1,
                    borderColor: theme.vars?.palette.primary.main || theme.palette.primary.main,
                    backgroundColor:
                      theme.vars?.palette.action.hover || theme.palette.action.hover,
                  },
                }}
              >
                <ListItemAvatar>
                  <Avatar
                    src={token.icon || getCryptoIconUrl(token.symbol)}
                    sx={{ width: 32, height: 32 }}
                  >
                    {token.symbol.substring(0, 2)}
                  </Avatar>
                </ListItemAvatar>

                <ListItemText
                  primary={
                    <Box component="span">
                      {partsSymbol.map((part, index) => (
                        <Box
                          key={index}
                          component="span"
                          sx={{
                            color: part.highlight
                              ? theme.vars?.palette.primary.main || theme.palette.primary.main
                              : theme.vars?.palette.text.primary || theme.palette.text.primary,
                          }}
                        >
                          {part.text}
                        </Box>
                      ))}
                    </Box>
                  }
                  secondary={
                    <Box component="span">
                      {partsName.map((part, index) => (
                        <Box
                          key={index}
                          component="span"
                          sx={{
                            color: part.highlight
                              ? theme.vars?.palette.primary.main || theme.palette.primary.main
                              : theme.vars?.palette.text.secondary || theme.palette.text.secondary,
                          }}
                        >
                          {part.text}
                        </Box>
                      ))}
                    </Box>
                  }
                />

                <Box sx={{ textAlign: 'right', minWidth: 80 }}>
                  <Typography variant="body2" color="text.primary">
                    {fCurrency(value.toNumber())}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {balance.toFixed(token.decimals > 4 ? 4 : token.decimals)} {token.symbol}
                  </Typography>
                </Box>
              </ListItemButton>
            </MenuItem>
          );
        })}
      </MenuList>
    );
  };

  return (
    <>
      {renderButton()}
      <Dialog
        fullWidth
        closeAfterTransition
        maxWidth="sm"
        open={open}
        onClose={handleClose}
        transitionDuration={{ enter: theme.transitions.duration.shortest, exit: 100 }}
        sx={[
          {
            [`& .${dialogClasses.paper}`]: { mt: 15, overflow: 'unset' },
            [`& .${dialogClasses.container}`]: { alignItems: 'flex-start' },
          },
        ]}
      >
        <InputBase
          fullWidth
          autoFocus={open}
          placeholder="Search assets..."
          value={searchQuery}
          onChange={handleSearch}
          startAdornment={
            <InputAdornment position="start">
              <Iconify icon="eva:search-fill" width={24} sx={{ color: 'text.disabled' }} />
            </InputAdornment>
          }
          endAdornment={
            <Label sx={{ letterSpacing: 1, color: 'text.secondary' }}>{t('esc')}</Label>
          }
          inputProps={{ id: 'search-input' }}
          sx={{
            p: 3,
            borderBottom: `solid 1px ${theme.vars.palette.divider}`,
            [`& .${inputBaseClasses.input}`]: { typography: 'h6' },
          }}
        />

        {notFound ? (
          <SearchNotFound query={searchQuery} sx={{ py: 15, px: 2.5 }} />
        ) : (
          <Scrollbar sx={{ p: 2.5, height: 400 }}>{renderList()}</Scrollbar>
        )}
      </Dialog>
    </>
  );
}
