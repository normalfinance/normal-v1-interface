'use client';

import { useState } from 'react';
import copy from 'copy-to-clipboard';
import { useTranslate } from '@/locales';

import Card from '@mui/material/Card';
import { Grid2, Paper } from '@mui/material';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import Tooltip from '@mui/material/Tooltip';
import TableRow from '@mui/material/TableRow';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import TableContainer from '@mui/material/TableContainer';

import { Iconify } from '@/components/template/iconify';

export interface Referral {
  id: string;
  address: string;
  joined: string;
  points: number;
}

export interface RewardsOverviewProps {
  referralLink: string;
  referralsCount: number;
  zealyUrl?: string;
  zealyXP: number;
  protocolPoints: number;
  referrals: Referral[];
}

export function RewardsOverview({
  referralLink,
  referralsCount,
  zealyXP,
  protocolPoints,
  referrals,
}: RewardsOverviewProps) {
  const { t } = useTranslate();
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    copy(referralLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Stack spacing={3}>
      <Grid2 container columnSpacing={3} rowSpacing={3} alignItems="flex-start">
        <Grid2 size={{ xs: 12, md: 4 }}>
          <Stack spacing={2}>
            <Paper
              variant="outlined"
              sx={{
                p: 3,
                display: 'flex',
                alignItems: 'center',
                gap: 2,
                backgroundColor: 'grey.100',
                borderRadius: 3,
              }}
            >
              <Typography variant="subtitle2" sx={{ flexGrow: 1, wordBreak: 'break-all' }}>
                {referralLink}
              </Typography>
              <Tooltip title={copied ? 'Copied!' : 'Copy'}>
                <IconButton onClick={handleCopy} color="primary">
                  <Iconify icon="solar:copy-bold" width={24} />
                </IconButton>
              </Tooltip>
            </Paper>
          </Stack>
        </Grid2>
        <Grid2 size={{ xs: 12, md: 8 }}>
          <Grid2 container spacing={3}>
            {[
              { label: t('Referrals'), value: referralsCount },
              { label: t('Zealy XP'), value: zealyXP },
              { label: t('Protocol Points'), value: protocolPoints },
            ].map((stat) => (
              <Grid2 size={{ xs: 12, md: 4 }} key={stat.label}>
                <Paper
                  variant="outlined"
                  sx={{
                    p: 3,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 2,
                    backgroundColor: 'grey.100',
                    borderRadius: 3,
                  }}
                >
                  <Typography variant="h3">{stat.value}</Typography>
                  <Typography variant="subtitle2" sx={{ color: 'text.secondary' }}>
                    {stat.label}
                  </Typography>
                </Paper>
              </Grid2>
            ))}
          </Grid2>
        </Grid2>
      </Grid2>

      <Typography variant="h3" color="text.primary">
        {t('Your Referrals')}
      </Typography>
      <TableContainer component={Card}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>{`${t('Wallet')} / ${t('User')}`}</TableCell>

              <TableCell align="right">{t('Joined')}</TableCell>
            </TableRow>
          </TableHead>

          <TableBody>
            {referrals.map((r) => (
              <TableRow key={r.id}>
                <TableCell>{r.address}</TableCell>
                <TableCell align="right">{r.joined}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Stack>
  );
}
