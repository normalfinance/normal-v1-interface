'use client';

import type { IndexDetails } from '@normalfinance/types';
import { Card, Stack, Typography, Divider, List, ListItem, ListItemText, Box } from '@mui/material';
import { fCurrency } from '@/utils/format-number';
import { format } from 'date-fns';
import { alpha, useTheme } from '@mui/material/styles';

interface Props {
  index: IndexDetails;
}

export default function IndexMetaCard({ index }: Props) {
  const fmt = (iso: string) => format(new Date(iso), 'yyyy-MM-dd');
  const theme = useTheme();

  const getLargestSmallest = (arr: IndexDetails['constituents']) => {
    if (arr.length === 0) return { largest: null, smallest: null, others: [] };

    const sorted = [...arr].sort((a, b) => b.weightPct - a.weightPct);

    const largest = sorted[0];
    const smallest = sorted[sorted.length - 1];
    const others = sorted.slice(1, -1);

    return { largest, smallest, others };
  };

  const { largest, smallest, others } = getLargestSmallest(index.constituents);

  return (
    <Card
      sx={[
        {
          p: 4,
          borderRadius: 3,
          alignItems: 'center',
          border: 1,
          borderColor: alpha(theme.palette.grey[500], 0.32),
        },
      ]}
    >
      <Stack spacing={1}>
        <Typography variant="h6">{index.name}</Typography>
        <Typography variant="body2" color="text.secondary">
          {index.description}
        </Typography>

        <Divider flexItem sx={{ my: 1 }} />

        <Typography variant="subtitle2">Details</Typography>
        <List dense disablePadding>
          {[
            { label: 'Created', value: fmt(index.creationDate) },
            { label: 'Last update', value: fmt(index.updatedAt) },
            { label: 'Weighting strategy', value: index.weighting.label },
          ].map((row) => (
            <ListItem key={row.label} disableGutters sx={{ px: 0 }}>
              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  width: 1,
                }}
              >
                <Typography variant="body2" fontWeight={400} color="text.secondary">
                  {row.label}:
                </Typography>
                <Typography variant="body2" fontWeight={700} color="text.primary">
                  {row.value}
                </Typography>
              </Box>
            </ListItem>
          ))}
        </List>

        <Divider flexItem sx={{ my: 1 }} />

        <Typography variant="subtitle2">Constituents</Typography>

        <List dense disablePadding>
          {[
            { label: 'Largest asset', token: largest },
            { label: 'Smallest asset', token: smallest },
          ]
            .filter((row) => row.token)
            .map((row) => (
              <ListItem key={row.label} disableGutters sx={{ px: 0 }}>
                <Box
                  sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    width: 1,
                  }}
                >
                  <Typography variant="body2" color="text.secondary">
                    {row.label}:
                  </Typography>

                  <Box sx={{ display: 'flex', alignItems: 'center', columnGap: 1 }}>
                    <Box
                      component="img"
                      src={row.token!.icon}
                      alt={row.token!.shortname}
                      sx={{
                        width: 20,
                        height: 20,
                        display: 'inline-block',
                        flexShrink: 0,
                        borderRadius: 9999,
                      }}
                    />

                    <Typography variant="body2" color="text.primary" sx={{ fontWeight: 500 }}>
                      {row.token!.shortname}
                    </Typography>

                    <Typography variant="body2" color="text.secondary">
                      {`${row.token!.weightPct.toFixed(2)} %`}
                    </Typography>
                  </Box>
                </Box>
              </ListItem>
            ))}
        </List>

        <Typography variant="subtitle2">Other</Typography>

        <List dense disablePadding>
          {others.map((tok) => (
            <ListItem key={tok.id} disableGutters sx={{ px: 0 }}>
              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'flex-end',
                  alignItems: 'center',
                  columnGap: 1,
                  width: 1,
                }}
              >
                <Box
                  component="img"
                  src={tok.icon}
                  alt={tok.shortname}
                  sx={{ width: 20, height: 20, borderRadius: 9999 }}
                />

                <Typography variant="body2" color="text.primary" sx={{ fontWeight: 500 }}>
                  {tok.shortname}
                </Typography>

                <Typography variant="body2" color="text.secondary">
                  {`${tok.weightPct.toFixed(2)} %`}
                </Typography>
              </Box>
            </ListItem>
          ))}
        </List>
      </Stack>
    </Card>
  );
}
