'use client';

import Card from '@mui/material/Card';
import { Grid2 } from '@mui/material';
import Typography from '@mui/material/Typography';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';

export interface ProtocolPointsProps {
  totalPoints: number;
  history: { date: string; points: number; action: string }[];
}

export function ProtocolPoints({ totalPoints, history }: ProtocolPointsProps) {
  return (
    <Grid2 container spacing={3}>
      {/* Total banner */}
      <Grid2 size={{ xs: 12 }}>
        <Card sx={{ p: 4, textAlign: 'center' }}>
          <Typography variant="h2">{totalPoints}</Typography>
          <Typography color="text.secondary">Total Protocol Points</Typography>
        </Card>
      </Grid2>

      {/* Recent earnings table */}
      <Grid2 size={{ xs: 12 }}>
        <TableContainer component={Card}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Date</TableCell>
                <TableCell>Action</TableCell>
                <TableCell align="right">Points</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {history.map((row) => (
                <TableRow key={`${row.date}-${row.action}`}>
                  <TableCell>{row.date}</TableCell>
                  <TableCell>{row.action}</TableCell>
                  <TableCell align="right">{row.points}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Grid2>
    </Grid2>
  );
}
