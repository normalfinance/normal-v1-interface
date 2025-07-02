'use client';
import { useTranslate } from '@/locales';

import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  Box,
  Typography,
  Button,
  IconButton,
  TextField,
  InputAdornment,
} from '@mui/material';
import { IndexCoin } from '@/types/indexes';
import { Iconify } from '../template/iconify';
import { useTheme } from '@mui/material/styles';
import { fCurrencyTwoDecimals, fShortenNumber } from '@/utils/format-number';
import { getCryptoIconUrl } from '@/utils/get-crypto-icon';

type Props = {
  open: boolean;
  onClose: () => void;
  onSelectCoins: (selectedCoins: IndexCoin[]) => void;
  availableCoins: IndexCoin[];
};

export default function IndexCoinPickerDialog({
  open,
  onClose,
  onSelectCoins,
  availableCoins,
}: Props) {
  const theme = useTheme();
  const { t } = useTranslate('auto');

  const [searchTerm, setSearchTerm] = useState('');

  const filteredTokens = availableCoins.filter((token) => {
    const lowerTerm = searchTerm.toLowerCase();
    return (
      token.name.toLowerCase().includes(lowerTerm) ||
      token.shortName.toLowerCase().includes(lowerTerm)
    );
  });

  // When a user clicks on a coin, immediately return it as the "selected" one
  const handleSelectCoin = (coin: IndexCoin) => {
    onSelectCoins([coin]);
    onClose();
  };

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
            {t('Select a token')}
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
            placeholder="Search tokens"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
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

        {searchTerm.length > 0 ? (
          <Box width={'100%'}>
            <Box sx={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
              <Iconify icon="eva:search-fill" width={14} />

              <Typography variant="caption">{t('Search results')}</Typography>
            </Box>
            {filteredTokens.length > 0 ? (
              <Box sx={{ mt: '12px' }} width={'100%'}>
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
                  {filteredTokens.map((token) => (
                    <Button
                      key={token.id}
                      sx={{
                        display: 'flex',
                        padding: '16px 0px',
                        width: '100%',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                      }}
                      onClick={() => handleSelectCoin(token)}
                    >
                      <Box
                        display={'flex'}
                        alignItems={'center'}
                        justifyContent={'center'}
                        gap={'10px'}
                      >
                        <Box
                          component="img"
                          src={getCryptoIconUrl(token.shortName)}
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
                                color: theme.palette.text.disabled,
                                fontSize: '12px',
                              }}
                            >
                              {token.shortName}
                            </Typography>
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
                            {fCurrencyTwoDecimals(token.price)}
                          </Typography>
                          <Typography
                            variant="body2"
                            sx={{
                              fontWeight: 500,
                              color: theme.palette.text.secondary,
                              fontSize: '12px',
                            }}
                          >
                            {fShortenNumber(token.marketCap)}
                            {t('MKap')}
                          </Typography>
                        </Box>
                      </Box>
                    </Button>
                  ))}
                </Box>
              </Box>
            ) : (
              <Typography>{t('No tokens match your search.')}</Typography>
            )}
          </Box>
        ) : (
          <Box sx={{ mt: '12px' }} width={'100%'}>
            <Box sx={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
              <Iconify icon="eva:star-outline" width={14} />

              <Typography variant="caption">{t('Available Tokens')}</Typography>
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
              {availableCoins.map((token) => (
                <Button
                  key={token.id}
                  sx={{
                    display: 'flex',
                    padding: '16px 0px',
                    width: '100%',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                  onClick={() => handleSelectCoin(token)}
                >
                  <Box
                    display={'flex'}
                    alignItems={'center'}
                    justifyContent={'center'}
                    gap={'10px'}
                  >
                    <Box
                      component="img"
                      src={getCryptoIconUrl(token.shortName)}
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
                            color: theme.palette.text.disabled,
                            fontSize: '12px',
                          }}
                        >
                          {token.shortName}
                        </Typography>
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
                        {fCurrencyTwoDecimals(token.price)}
                      </Typography>
                      <Typography
                        variant="body2"
                        sx={{
                          fontWeight: 500,
                          color: theme.palette.text.secondary,
                          fontSize: '12px',
                        }}
                      >
                        {fShortenNumber(token.marketCap)}
                        {t('MKap')}
                      </Typography>
                    </Box>
                  </Box>
                </Button>
              ))}
            </Box>
          </Box>
        )}
      </DialogContent>
    </Dialog>
  );
}
