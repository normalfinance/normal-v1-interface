'use client';

import { useState } from 'react';
import copy from 'copy-to-clipboard';
import Card from '@mui/material/Card';
import { Grid2 } from '@mui/material';
import Stack from '@mui/material/Stack';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import { Iconify } from '@/components/template/iconify';
import { useTranslate } from '@/locales';

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
            <Card sx={{ p: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
              <Typography variant="subtitle2" sx={{ flexGrow: 1, wordBreak: 'break-all' }}>
                {referralLink}
              </Typography>
              <Tooltip title={copied ? 'Copied!' : 'Copy'}>
                <IconButton onClick={handleCopy} color="primary">
                  <Iconify icon="solar:copy-bold" width={24} />
                </IconButton>
              </Tooltip>
            </Card>
          </Stack>
        </Grid2>
        <Grid2 size={{ xs: 12, md: 8 }}>
          <Grid2 container spacing={3}>
            {[
              { label: 'Referrals', value: referralsCount },
              { label: 'Zealy XP', value: zealyXP },
              { label: 'Protocol Points', value: protocolPoints },
            ].map((stat) => (
              <Grid2 size={{ xs: 12, md: 4 }} key={stat.label}>
                <Card sx={{ p: 3, textAlign: 'center' }}>
                  <Typography variant="h3">{stat.value}</Typography>
                  <Typography variant="subtitle2" sx={{ color: 'text.secondary' }}>
                    {stat.label}
                  </Typography>
                </Card>
              </Grid2>
            ))}
          </Grid2>
        </Grid2>
      </Grid2>

      <Typography variant="h3" color="text.primary">
        {t('Your Referals')}
      </Typography>
      <TableContainer component={Card}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Wallet / User</TableCell>
              <TableCell>Joined</TableCell>
              <TableCell align="right">Points</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {referrals.map((r) => (
              <TableRow key={r.id}>
                <TableCell>{r.address}</TableCell>
                <TableCell>{r.joined}</TableCell>
                <TableCell align="right">{r.points}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Stack>
  );
}
