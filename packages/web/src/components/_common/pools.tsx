'use client';

import type { Token } from '@normalfinance/types';

import { useState, useCallback } from 'react';

import Box from '@mui/material/Box';
import Link from '@mui/material/Link';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Avatar from '@mui/material/Avatar';
// @mui
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { Button, AvatarGroup } from '@mui/material';
import InputAdornment from '@mui/material/InputAdornment';

// components
import { Iconify } from '../template/iconify';
import { SearchNotFound } from '../template/search-not-found';

// ----------------------------------------------------------------------

export interface Pool {
  tokens: Token[];
  tvl: string;
  maxApr: string;
  userLiquidity: number;
  poolAddress: string;
}

type Props = {
  pools: Pool[];
  onShowDetailsClick: (pool: Pool) => void;
};

export default function ProfileFriends({ pools, onShowDetailsClick }: Props) {
  const [searchPools, setSearchPools] = useState('');

  const handleSearchPools = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchPools(event.target.value);
  }, []);

  const dataFiltered = applyFilter({
    inputData: pools,
    query: searchPools,
  });

  const notFound = !dataFiltered.length && !!searchPools;

  return (
    <>
      <Stack
        spacing={2}
        justifyContent="space-between"
        direction={{ xs: 'column', sm: 'row' }}
        sx={{ my: 5 }}
      >
        <Typography variant="h4">Friends</Typography>

        <TextField
          value={searchPools}
          onChange={handleSearchPools}
          placeholder="Search pool..."
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Iconify icon="eva:search-fill" sx={{ color: 'text.disabled' }} />
              </InputAdornment>
            ),
          }}
          sx={{ width: { xs: 1, sm: 260 } }}
        />
      </Stack>

      {notFound ? (
        <SearchNotFound query={searchPools} sx={{ mt: 10 }} />
      ) : (
        <Box
          gap={3}
          display="grid"
          gridTemplateColumns={{
            xs: 'repeat(1, 1fr)',
            sm: 'repeat(2, 1fr)',
            md: 'repeat(3, 1fr)',
          }}
        >
          {dataFiltered.map((pool, index) => (
            <PoolCard
              key={index}
              // onAddLiquidityClick={() => onAddLiquidityClick(pool)}
              onShowDetailsClick={onShowDetailsClick}
              pool={pool}
            />
          ))}
        </Box>
      )}
    </>
  );
}

// ----------------------------------------------------------------------

type FriendCardProps = {
  pool: Pool;
  onShowDetailsClick: (pool: Pool) => void;
};

function PoolCard({ pool, onShowDetailsClick }: FriendCardProps) {
  return (
    <Card
      onClick={() => onShowDetailsClick(pool)}
      sx={{
        py: 5,
        display: 'flex',
        position: 'relative',
        alignItems: 'center',
        flexDirection: 'column',
      }}
    >
      {/* <Avatar alt={name} src={avatarUrl} sx={{ width: 64, height: 64, mb: 3 }} /> */}
      <AvatarGroup>
        <Avatar
          key={pool.tokens[0].name}
          alt={pool.tokens[0].name}
          src={pool.tokens[0].icon}
          sx={{ width: 64, height: 64, mb: 3 }}
        />
        <Avatar
          key={pool.tokens[1].name}
          alt={pool.tokens[1].name}
          src={pool.tokens[1].icon}
          sx={{ width: 64, height: 64, mb: 3 }}
        />
      </AvatarGroup>

      <Link variant="subtitle1" color="text.primary">
        {`${pool.tokens[0].name} - ${pool.tokens[1].name}`}
      </Link>

      <Typography variant="body2" sx={{ color: 'text.secondary', mb: 1, mt: 0.5 }}>
        {pool.tvl}
      </Typography>

      <Stack alignItems="center" justifyContent="center" direction="row">
        <Stack direction="row" spacing={1.5}>
          <Button fullWidth variant="contained" color="warning">
            Deposit
          </Button>

          <Button fullWidth variant="contained" color="primary">
            Withdraw
          </Button>
        </Stack>
      </Stack>
    </Card>
  );
}

// ----------------------------------------------------------------------

function applyFilter({ inputData, query }: { inputData: Pool[]; query: string }) {
  if (query) {
    return inputData.filter(
      (pool) =>
        pool.tokens[0].name.toLowerCase().indexOf(query.toLowerCase()) !== -1 ||
        pool.tokens[1].name.toLowerCase().indexOf(query.toLowerCase()) !== -1
    );
  }

  return inputData;
}
