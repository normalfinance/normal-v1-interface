'use client';

import type { BoxProps } from '@mui/material/Box';
import type { Breakpoint } from '@mui/material/styles';
import type { NavSectionProps } from '@/components/template/nav-section';

import { paths } from '@/routes/paths';
import { useTranslate } from '@/locales';
import { useRouter } from '@/routes/hooks';
import parse from 'autosuggest-highlight/parse';
import match from 'autosuggest-highlight/match';
import { useBoolean } from 'minimal-shared/hooks';
import { fCurrency } from '@/utils/format-number';
import { getCryptoIconUrl } from '@normalfinance/utils';
import { useState, useEffect, useCallback } from 'react';
import { useAppStore, usePersistStore } from '@normalfinance/state';

import Box from '@mui/material/Box';
import Avatar from '@mui/material/Avatar';
import SvgIcon from '@mui/material/SvgIcon';
import MenuList from '@mui/material/MenuList';
import { useTheme } from '@mui/material/styles';
import Typography from '@mui/material/Typography';
import ListItemText from '@mui/material/ListItemText';
import useMediaQuery from '@mui/material/useMediaQuery';
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

import { applyFilter } from './utils';

// ----------------------------------------------------------------------

export type SearchbarProps = BoxProps & {
  data?: NavSectionProps['data'];
};

const breakpoint: Breakpoint = 'sm';

export function Searchbar({ data: navItems = [], sx, ...other }: SearchbarProps) {
  const { t } = useTranslate('auto');
  const theme = useTheme();
  const router = useRouter();
  const smUp = useMediaQuery(theme.breakpoints.up(breakpoint));

  const { value: open, onFalse: onClose, onTrue: onOpen, onToggle } = useBoolean();
  const [searchQuery, setSearchQuery] = useState('');

  // Get tokens from the app store
  const { globalIsLoading } = useAppStore();
  const {
    tokenState: { tokens },
    getAllTokens,
  } = usePersistStore();

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

  // Fetch tokens when dialog opens
  useEffect(() => {
    if (open && tokens.length === 0) {
      getAllTokens();
    }
  }, [open, getAllTokens, tokens.length]);

  const handleTokenClick = useCallback(
    (token: any) => {
      const isNormalToken = token.symbol.toLowerCase().startsWith('n');
      const destination = isNormalToken
        ? paths.pools.details(token.symbol)
        : `${paths.swap}?token_in=${token.symbol}`;

      setTimeout(() => handleClose(), 50);
      router.push(destination);
    },
    [router, handleClose]
  );

  const handleSearch = useCallback((event: React.ChangeEvent<HTMLTextAreaElement>) => {
    setSearchQuery(event.target.value);
  }, []);

  const dataFiltered = applyFilter({
    inputData: tokens,
    query: searchQuery,
  });

  const notFound = searchQuery && !dataFiltered.length;

  const renderButton = () => (
    <Box
      onClick={onOpen}
      sx={[
        // Base: look like the Explore TextField on every breakpoint
        {
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          pr: 1, // space for the ⌘K label on sm+
          pl: 0.5,
          py: 0.25, // ~12px like your TextField input
          borderRadius: 9999, // pill
          cursor: 'pointer',
          bgcolor: 'grey.250', // same background
          border: (_theme) => `1px solid ${_theme.palette.divider}`,
          transition: (_theme) =>
            _theme.transitions.create('background-color', {
              easing: _theme.transitions.easing.easeInOut,
              duration: _theme.transitions.duration.shortest,
            }),
          '&:hover': {
            bgcolor: (_theme) =>
              // subtle lift on hover (works with CSS vars or without)
              _theme.vars
                ? `color-mix(in srgb, rgba(${_theme.vars.palette.grey['500Channel']} / 1) 16%, transparent)`
                : _theme.palette.action.hover,
          },
          color: 'text.secondary', // placeholder-ish text color
        },
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

      {/* “Placeholder” text */}
      <Box component="span" sx={{ typography: 'body2', flexShrink: 0 }}>
        {t('Search tokens...')}
      </Box>

      {/* ⌘K helper shown at sm+ 
      <Label
        sx={(t) => ({
          ml: 'auto',
          color: 'grey.800',
          cursor: 'inherit',
          bgcolor: 'common.white',
          fontSize: t.typography.pxToRem(12),
          boxShadow: t.vars.customShadows.z1,
          display: { xs: 'none', [breakpoint]: 'inline-flex' },
        })}
      >
        ⌘K
      </Label>*/}
    </Box>
  );

  const renderList = () => {
    // Show loading state when tokens are being fetched
    if (globalIsLoading && tokens.length === 0) {
      return (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 4 }}>
          <Typography variant="body2" color="text.secondary">
            {t('Loading tokens...')}
          </Typography>
        </Box>
      );
    }

    // Show empty state when no tokens are available
    if (!globalIsLoading && tokens.length === 0) {
      return (
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 4 }}>
          <Iconify icon="eva:search-fill" width={48} sx={{ color: 'text.disabled', mb: 2 }} />
          <Typography variant="body2" color="text.secondary" align="center">
            {t('No tokens available')}
          </Typography>
          <Typography variant="caption" color="text.disabled" align="center">
            {t('Try refreshing the page or check your connection')}
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
        {dataFiltered.map((item) => {
          const partsTitle = parse(item.name, match(item.name, searchQuery));
          const partsSymbol = parse(item.symbol, match(item.symbol, searchQuery));

          return (
            <MenuItem disableRipple key={item.symbol}>
              <ListItemButton
                onClick={() => handleTokenClick(item)}
                sx={{
                  borderWidth: 1,
                  borderStyle: 'dashed',
                  borderColor: 'transparent',
                  borderBottomColor: theme.vars?.palette.divider || theme.palette.divider,
                  '&:hover': {
                    borderRadius: 1,
                    borderColor: theme.vars?.palette.primary.main || theme.palette.primary.main,
                    backgroundColor: theme.vars?.palette.action.hover || theme.palette.action.hover,
                  },
                }}
              >
                <ListItemAvatar>
                  <Avatar src={getCryptoIconUrl(item.symbol)} sx={{ width: 32, height: 32 }}>
                    {item.symbol.substring(0, 2)}
                  </Avatar>
                </ListItemAvatar>

                <ListItemText
                  primary={
                    <Box component="span">
                      {partsTitle.map((part, index) => (
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
                      {partsSymbol.map((part, index) => (
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
                  {item.balance > 0 && (
                    <Typography variant="body2" color="text.primary">
                      {fCurrency(item.balance)}
                    </Typography>
                  )}
                  {item.price > 0 && (
                    <Typography variant="caption" color="text.secondary">
                      {fCurrency(item.price)}
                    </Typography>
                  )}
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
          placeholder="Search tokens..."
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
