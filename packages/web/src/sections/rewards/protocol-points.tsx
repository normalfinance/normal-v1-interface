'use client';

import { useTranslate } from '@/locales';

import Card from '@mui/material/Card';
import Table from '@mui/material/Table';
import Alert from '@mui/material/Alert';
import TableRow from '@mui/material/TableRow';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import { Box, Grid2, Paper } from '@mui/material';
import Typography from '@mui/material/Typography';
import TableContainer from '@mui/material/TableContainer';

export interface ProtocolPointsProps {
  totalPoints: number;
  history: { date: string; points: number; action: string }[];
}

export function ProtocolPoints({ totalPoints, history }: ProtocolPointsProps) {
  const { t } = useTranslate();

  return (
    <Grid2 container spacing={3}>
      {/* Total banner */}
      <Grid2 size={{ xs: 12 }}>
        <Box sx={{ width: 'fit-content', mb: 2 }}>
          <Alert severity="info" variant="outlined" sx={{ textAlign: 'center' }}>
            {t('Protocol Points are coming soon')}
          </Alert>
        </Box>
        <Paper
          variant="outlined"
          sx={{
            p: 4,
            display: 'inline-flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 2,
            backgroundColor: 'grey.100',
            borderRadius: 3,
          }}
        >
          <Typography variant="h2">{totalPoints}</Typography>
          <Typography color="text.secondary">{t('Total Protocol Points')}</Typography>
        </Paper>
      </Grid2>

      {/* Recent earnings table */}
      <Grid2 size={{ xs: 12 }}>
        <TableContainer component={Card}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>{t('Date')}</TableCell>
                <TableCell>{t('Action')}</TableCell>
                <TableCell align="right">{t('Points')}</TableCell>
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
