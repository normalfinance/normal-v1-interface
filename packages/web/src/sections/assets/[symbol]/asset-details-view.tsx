'use client';

import BigNumber from 'bignumber.js';
import { useTranslate } from '@/locales';
import { DashboardContent } from '@/layouts/dashboard';
import { usePersistStore } from '@normalfinance/state';
import { getCryptoIconUrl } from '@normalfinance/utils';
import { fCurrencyTwoDecimals } from '@/utils/format-number';

import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Grid2 from '@mui/material/Grid2';
import Avatar from '@mui/material/Avatar';
import Typography from '@mui/material/Typography';
import CardContent from '@mui/material/CardContent';

import { Iconify } from '@/components/template/iconify';
import { SpecificNotFound } from '@/components/_common/specific-not-found';

export default function AssetDetailsView({ symbol }: { symbol: string }) {
  const { t } = useTranslate();

  const {
    tokenState: { tokens },
  } = usePersistStore();

  // Find the token by symbol
  const token = tokens.find((tkn) => tkn.symbol.toLowerCase() === symbol.toLowerCase());

  if (!token) {
    return <SpecificNotFound type="asset" />;
  }

  const balance = BigNumber(token.balance || 0);
  const price = BigNumber(token.price || 0);
  const value = balance.multipliedBy(price);

  return (
    <DashboardContent maxWidth="xl">
      <Grid2 container spacing={3}>
        {/* Asset Overview Card */}
        <Grid2 size={{ xs: 12, md: 6 }}>
          <Card>
            <CardContent>
              <Stack spacing={3}>
                <Stack direction="row" alignItems="center" spacing={2}>
                  <Avatar
                    src={token.icon || getCryptoIconUrl(token.symbol)}
                    alt={token.name}
                    sx={{ width: 48, height: 48 }}
                  />
                  <Stack>
                    <Typography variant="h5">{token.name}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      {token.symbol}
                    </Typography>
                  </Stack>
                </Stack>

                <Stack spacing={1}>
                  <Stack direction="row" justifyContent="space-between">
                    <Typography variant="body2" color="text.secondary">
                      {t('Price')}
                    </Typography>
                    <Typography variant="body2">{fCurrencyTwoDecimals(price.toNumber())}</Typography>
                  </Stack>

                  <Stack direction="row" justifyContent="space-between">
                    <Typography variant="body2" color="text.secondary">
                      {t('Your Balance')}
                    </Typography>
                    <Typography variant="body2">
                      {balance.toFormat(token.decimals > 4 ? 4 : token.decimals)} {token.symbol}
                    </Typography>
                  </Stack>

                  <Stack direction="row" justifyContent="space-between">
                    <Typography variant="body2" color="text.secondary">
                      {t('Value')}
                    </Typography>
                    <Typography variant="body2" fontWeight="bold">
                      {fCurrencyTwoDecimals(value.toNumber())}
                    </Typography>
                  </Stack>
                </Stack>
              </Stack>
            </CardContent>
          </Card>
        </Grid2>

        {/* Token Info Card */}
        <Grid2 size={{ xs: 12, md: 6 }}>
          <Card>
            <CardContent>
              <Stack spacing={3}>
                <Typography variant="h6">{t('Token Information')}</Typography>

                <Stack spacing={1}>
                  <Stack direction="row" justifyContent="space-between">
                    <Typography variant="body2" color="text.secondary">
                      {t('Contract')}
                    </Typography>
                    <Stack direction="row" alignItems="center" spacing={0.5}>
                      <Typography
                        variant="body2"
                        sx={{
                          maxWidth: 200,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                      >
                        {token.contract}
                      </Typography>
                      <Iconify
                        icon="solar:copy-linear"
                        width={16}
                        sx={{ cursor: 'pointer', color: 'text.secondary' }}
                        onClick={() => navigator.clipboard.writeText(token.contract)}
                      />
                    </Stack>
                  </Stack>

                  {token.issuer && (
                    <Stack direction="row" justifyContent="space-between">
                      <Typography variant="body2" color="text.secondary">
                        {t('Issuer')}
                      </Typography>
                      <Stack direction="row" alignItems="center" spacing={0.5}>
                        <Typography
                          variant="body2"
                          sx={{
                            maxWidth: 200,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                          }}
                        >
                          {token.issuer}
                        </Typography>
                        <Iconify
                          icon="solar:copy-linear"
                          width={16}
                          sx={{ cursor: 'pointer', color: 'text.secondary' }}
                          onClick={() => navigator.clipboard.writeText(token.issuer || '')}
                        />
                      </Stack>
                    </Stack>
                  )}

                  <Stack direction="row" justifyContent="space-between">
                    <Typography variant="body2" color="text.secondary">
                      {t('Decimals')}
                    </Typography>
                    <Typography variant="body2">{token.decimals}</Typography>
                  </Stack>
                </Stack>
              </Stack>
            </CardContent>
          </Card>
        </Grid2>
      </Grid2>
    </DashboardContent>
  );
}
