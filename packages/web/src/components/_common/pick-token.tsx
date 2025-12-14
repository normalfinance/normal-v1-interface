import type { Token } from '@normalfinance/types';

import React, { useState } from 'react';
import { useTranslate } from '@/locales';
import { BigNumber } from 'bignumber.js';
import { fCurrency } from '@/utils/format-number';
import { format, getCryptoIconUrl } from '@normalfinance/utils';

import { alpha, useTheme } from '@mui/material/styles';
import {
  Box,
  Dialog,
  Button,
  TextField,
  Typography,
  IconButton,
  DialogTitle,
  DialogContent,
  InputAdornment,
} from '@mui/material';

import { Iconify } from '@/components/template/iconify';

export interface PickTokenProps {
  open: boolean;
  onClose: () => void;
  buttonSource?: string;
  tokens?: Token[];
  onTokenSelect: (token: Token) => void;
}

const PickToken: React.FC<PickTokenProps> = ({
  open,
  onClose,
  buttonSource,
  tokens = [],
  onTokenSelect,
}) => {
  const theme = useTheme();
  const { t } = useTranslate('auto');

  const [searchTerm, setSearchTerm] = useState('');

  const filteredTokens = tokens.filter((token) => {
    const lowerTerm = searchTerm.toLowerCase();
    return (
      token.name.toLowerCase().includes(lowerTerm) || token.symbol.toLowerCase().includes(lowerTerm)
    );
  });

  const handleTokenClick = (token: Token) => {
    onTokenSelect(token);
    onClose();
  };

  const featuredTokens = tokens.filter((token) => token.featured);
  const ownedTokens = tokens.filter((token) => BigNumber(token.balance).gt(0));
  const unownedTokens = tokens.filter((token) => BigNumber(token.balance).eq(0));
  const arrangedTokens = [...unownedTokens];

  return (
    <Dialog
      open={open}
      onClose={onClose}
      slotProps={{
        paper: {
          sx: {
            gap: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-start',
            width: '100%',
            maxWidth: '400px',
            maxHeight: '600px',
          },
        },
      }}
    >
      <DialogTitle sx={{ p: 2, pb: 0, width: '100%' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6" component="div">
            {t('Select an asset')}
          </Typography>
          <IconButton onClick={onClose}>
            <Iconify icon="mingcute:close-line" width={24} />
          </IconButton>
        </Box>
      </DialogTitle>
      <DialogContent
        sx={{
          p: 2,
          width: '100%',
          '&::-webkit-scrollbar': {
            width: '2px',
          },
          '&::-webkit-scrollbar-thumb': {
            backgroundColor: theme.palette.divider,
            borderRadius: '4px',
          },
          scrollbarWidth: 'thin',
          scrollbarColor: `${theme.palette.divider} transparent`,
        }}
      >
        {/* Search Bar */}
        <Box sx={{ mb: 2, display: 'flex', gap: 1, height: '48px' }}>
          <TextField
            variant="outlined"
            fullWidth
            size="small"
            placeholder={t('Search assets')}
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
            }}
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <Iconify icon="eva:search-fill" width={20} />
                  </InputAdornment>
                ),
              },
            }}
            sx={{
              '& .MuiOutlinedInput-root': {
                height: 48,
              },
            }}
          />
        </Box>

        {/* Conditionally render different components */}
        {searchTerm.length > 0 ? (
          <Box width="100%">
            <Box sx={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
              <Iconify icon="eva:search-fill" width={14} />

              <Typography variant="caption">{t('Search results')}</Typography>
            </Box>
            {filteredTokens.length > 0 ? (
              filteredTokens.map((token) => (
                <Button
                  key={token.contract}
                  sx={{
                    display: 'flex',
                    padding: '16px 0px',
                    width: '100%',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                  onClick={() => handleTokenClick(token)}
                >
                  <Box display="flex" alignItems="center" justifyContent="center" gap="10px">
                    <Box
                      component="img"
                      src={token.icon ?? getCryptoIconUrl(token.symbol)}
                      sx={{
                        width: 40,
                        height: 40,
                        borderRadius: '50%',
                        objectFit: 'cover',
                      }}
                    />
                    <Box
                      sx={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'flex-start',
                        justifyContent: 'center',
                      }}
                    >
                      <Typography
                        variant="body2"
                        sx={{ fontWeight: 500, color: theme.palette.text.primary }}
                      >
                        {token.name}
                      </Typography>
                      <Box
                        sx={{
                          display: 'flex',
                          gap: '4px',
                          alignItems: 'flex-start',
                          justifyContent: 'center',
                        }}
                      >
                        <Typography
                          variant="body2"
                          sx={{
                            fontWeight: 500,
                            color: theme.palette.text.secondary,
                            fontSize: '12px',
                          }}
                        >
                          {token.symbol}
                        </Typography>
                        {token.contract && (
                          <Typography
                            variant="body2"
                            sx={{
                              fontWeight: 500,
                              color: theme.palette.text.disabled,
                              fontSize: '12px',
                            }}
                          >
                            {format.shortenAddress(token.contract)}
                          </Typography>
                        )}
                      </Box>
                    </Box>
                  </Box>
                  <Box>
                    {token.balance && (
                      <Box
                        sx={{
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'flex-end',
                          justifyContent: 'center',
                        }}
                      >
                        <Typography
                          variant="body2"
                          sx={{ fontWeight: 500, color: theme.palette.text.primary }}
                        >
                          {fCurrency(BigNumber(token.price).multipliedBy(token.balance))}
                        </Typography>
                        <Typography
                          variant="body2"
                          sx={{
                            fontWeight: 500,
                            color: theme.palette.text.secondary,
                            fontSize: '12px',
                          }}
                        >
                          {BigNumber(token.balance).toFixed(token.decimals)}
                        </Typography>
                      </Box>
                    )}
                  </Box>
                </Button>
              ))
            ) : (
              <Typography>{t('No tokens match your search.')}</Typography>
            )}
          </Box>
        ) : (
          <Box sx={{ p: 0 }}>
            <Box
              sx={{
                display: 'flex',
                padding: '8px 0px',
                flexDirection: 'column',
                alignItems: 'flex-start',
                gap: '10px',
                alignSelf: 'stretch',
              }}
            >
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '4px',
                  justifyContent: 'flex-start',
                  alignSelf: 'stretch',
                  flexWrap: 'wrap',
                }}
              >
                {featuredTokens.map((token) => (
                  <Button
                    key={token.contract}
                    sx={{
                      display: 'flex',
                      height: '68px',
                      width: '68.5px',
                      padding: '10px',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '4px',
                      alignSelf: 'stretch',
                      borderRadius: '16px',
                      border: `1px solid ${theme.palette.divider}`,
                      backgroundColor: alpha(theme.palette.grey[500], 0.08),
                    }}
                    onClick={() => handleTokenClick(token)}
                  >
                    <Box
                      component="img"
                      src={token.icon ?? getCryptoIconUrl(token.symbol)}
                      sx={{
                        width: 20,
                        height: 20,
                        borderRadius: '50%', // If you want it circular; remove if square
                        objectFit: 'cover', // ensures image covers the box
                      }}
                    />
                    <Typography
                      variant="body2"
                      sx={{ fontWeight: 500, color: theme.palette.text.primary }}
                    >
                      {token.symbol}
                    </Typography>
                  </Button>
                ))}
              </Box>
              {ownedTokens.length > 0 && (
                <Box sx={{ mt: '12px' }} width="100%">
                  <Box sx={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                    <Iconify icon="carbon:skill-level-basic" width={14} />

                    <Typography variant="caption">{t('Your assets')}</Typography>
                  </Box>
                  <Box
                    sx={{
                      display: 'flex',
                      width: '100%',
                      flexDirection: 'column',
                      alignItems: 'flex-start',
                      gap: '0px',
                      alignSelf: 'stretch',
                    }}
                  >
                    {ownedTokens.map((token) => (
                      <Button
                        key={token.contract}
                        sx={{
                          display: 'flex',
                          padding: '16px 0px',
                          width: '100%',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                        }}
                        onClick={() => handleTokenClick(token)}
                      >
                        <Box display="flex" alignItems="center" justifyContent="center" gap="10px">
                          <Box
                            component="img"
                            src={token.icon ?? getCryptoIconUrl(token.symbol)}
                            sx={{
                              width: 40,
                              height: 40,
                              borderRadius: '50%',
                              objectFit: 'cover',
                            }}
                          />
                          <Box
                            sx={{
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'flex-start',
                              justifyContent: 'center',
                            }}
                          >
                            <Typography
                              variant="body2"
                              sx={{ fontWeight: 500, color: theme.palette.text.primary }}
                            >
                              {token.name}
                            </Typography>
                            <Box
                              sx={{
                                display: 'flex',
                                gap: '4px',
                                alignItems: 'flex-start',
                                justifyContent: 'center',
                              }}
                            >
                              <Typography
                                variant="body2"
                                sx={{
                                  fontWeight: 500,
                                  color: theme.palette.text.secondary,
                                  fontSize: '12px',
                                }}
                              >
                                {token.symbol}
                              </Typography>
                              {token.contract && (
                                <Typography
                                  variant="body2"
                                  sx={{
                                    fontWeight: 500,
                                    color: theme.palette.text.disabled,
                                    fontSize: '12px',
                                  }}
                                >
                                  {format.shortenAddress(token.contract)}
                                </Typography>
                              )}
                            </Box>
                          </Box>
                        </Box>
                        <Box>
                          <Box
                            sx={{
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'flex-end',
                              justifyContent: 'center',
                            }}
                          >
                            <Typography
                              variant="body2"
                              sx={{ fontWeight: 500, color: theme.palette.text.primary }}
                            >
                              {fCurrency(BigNumber(token.price).multipliedBy(token.balance))}
                            </Typography>
                            <Typography
                              variant="body2"
                              sx={{
                                fontWeight: 500,
                                color: theme.palette.text.secondary,
                                fontSize: '12px',
                              }}
                            >
                              {BigNumber(token.balance).toFixed(token.decimals)}
                            </Typography>
                          </Box>
                        </Box>
                      </Button>
                    ))}
                  </Box>
                </Box>
              )}
              <Box sx={{ mt: '12px' }} width="100%">
                <Box sx={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                  <Iconify icon="eva:star-outline" width={14} />

                  <Typography variant="caption">{t('All asset')}</Typography>
                </Box>
                <Box
                  sx={{
                    display: 'flex',
                    width: '100%',
                    flexDirection: 'column',
                    alignItems: 'flex-start',
                    gap: '0px',
                    alignSelf: 'stretch',
                  }}
                >
                  {arrangedTokens.map((token) => (
                    <Button
                      key={token.contract}
                      sx={{
                        display: 'flex',
                        padding: '16px 0px',
                        width: '100%',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                      }}
                      onClick={() => handleTokenClick(token)}
                    >
                      <Box display="flex" alignItems="center" justifyContent="center" gap="10px">
                        <Box
                          component="img"
                          src={token.icon ?? getCryptoIconUrl(token.symbol)}
                          sx={{
                            width: 40,
                            height: 40,
                            borderRadius: '50%',
                            objectFit: 'cover',
                          }}
                        />
                        <Box
                          sx={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'flex-start',
                            justifyContent: 'center',
                          }}
                        >
                          <Typography
                            variant="body2"
                            sx={{ fontWeight: 500, color: theme.palette.text.primary }}
                          >
                            {token.name}
                          </Typography>
                          <Box
                            sx={{
                              display: 'flex',
                              gap: '4px',
                              alignItems: 'flex-start',
                              justifyContent: 'center',
                            }}
                          >
                            <Typography
                              variant="body2"
                              sx={{
                                fontWeight: 500,
                                color: theme.palette.text.secondary,
                                fontSize: '12px',
                              }}
                            >
                              {token.symbol}
                            </Typography>
                            {token.contract && (
                              <Typography
                                variant="body2"
                                sx={{
                                  fontWeight: 500,
                                  color: theme.palette.text.disabled,
                                  fontSize: '12px',
                                }}
                              >
                                {format.shortenAddress(token.contract)}
                              </Typography>
                            )}
                          </Box>
                        </Box>
                      </Box>
                      <Box>
                        {BigNumber(token.balance).gt(0) && (
                          <Box
                            sx={{
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'flex-end',
                              justifyContent: 'center',
                            }}
                          >
                            <Typography
                              variant="body2"
                              sx={{ fontWeight: 500, color: theme.palette.text.primary }}
                            >
                              {fCurrency(BigNumber(token.price).multipliedBy(token.balance))}
                            </Typography>
                            <Typography
                              variant="body2"
                              sx={{
                                fontWeight: 500,
                                color: theme.palette.text.secondary,
                                fontSize: '12px',
                              }}
                            >
                              {BigNumber(token.balance).toFixed(token.decimals)}
                            </Typography>
                          </Box>
                        )}
                      </Box>
                    </Button>
                  ))}
                </Box>
              </Box>
            </Box>
          </Box>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default PickToken;
