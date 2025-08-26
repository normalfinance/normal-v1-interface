'use client';

import Card from '@mui/material/Card';
import Table from '@mui/material/Table';
import TableRow from '@mui/material/TableRow';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableContainer from '@mui/material/TableContainer';
import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';

import { useProtocolLeaderboard } from './hooks/tmp-leaderboards';
import { format } from '@normalfinance/utils';

export default function ProtocolPointsLeaderboard() {
  const { loading, error, rows } = useProtocolLeaderboard(2000, 30);

  if (loading) return <Typography>Loading leaderboard…</Typography>;
  if (error) return <Typography color="error">{error}</Typography>;
  if (rows.length === 0) return <Typography>No wallets with points yet.</Typography>;

  return (
    <Stack spacing={2}>
      <Typography variant="h6">Protocol Points — Leaderboard (last 30 days)</Typography>
      <TableContainer component={Card}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Rank</TableCell>
              <TableCell>Address</TableCell>
              <TableCell align="right">Total Points</TableCell>
              <TableCell align="right">Swaps</TableCell>
              <TableCell align="right">Adds</TableCell>
              <TableCell align="right">Stake</TableCell>
              <TableCell align="right">Create</TableCell>
              <TableCell align="right">Mint</TableCell>
              <TableCell>Last Activity</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((r, i) => (
              <TableRow key={r.address}>
                <TableCell>{i + 1}</TableCell>
                <TableCell>{format.fTruncate(r.address, 18)}</TableCell>
                <TableCell align="right">{r.totalPoints}</TableCell>
                <TableCell align="right">{r.swaps}</TableCell>
                <TableCell align="right">{r.addLiquidity}</TableCell>
                <TableCell align="right">{r.stake}</TableCell>
                <TableCell align="right">{r.createIndex}</TableCell>
                <TableCell align="right">{r.mintIndex}</TableCell>
                <TableCell>{new Date(r.lastActivity ?? '').toLocaleString()}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Stack>
  );
}
