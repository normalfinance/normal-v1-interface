'use client';

import type { IndexDetails } from '@normalfinance/types';
import type { IMarketTableFilters } from '@/types/marketTable';
import type { TableHeadCellProps } from '@/components/template/table';

import { useSetState } from 'minimal-shared/hooks';
import {
  Card,
  Table,
  TableBody,
  Avatar,
  Stack,
  Typography,
  TableRow,
  TableCell,
} from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';

import { Scrollbar } from '@/components/template/scrollbar';
import {
  useTable,
  emptyRows,
  TableNoData,
  getComparator,
  TableSkeleton,
  TableEmptyRows,
  TableHeadCustom,
} from '@/components/template/table';

import { ExploreIndexesTableToolbar } from '@/components/_index-details/explore-indexes-table-toolbar';

type HeadCell = TableHeadCellProps;

const TABLE_HEAD: HeadCell[] = [
  { id: 'id', label: 'ID', width: 64 },
  { id: 'name', label: 'Index', width: 240 },
  { id: 'coinCount', label: 'Coins', width: 80 },
  { id: 'weighting', label: 'Weighting Strategy', width: 160 },
  { id: 'largest', label: 'Largest Asset', width: 160 },
  { id: 'smallest', label: 'Smallest Asset', width: 160 },
  { id: 'tvlUsd', label: 'TVL', align: 'left' },
  { id: 'priceUsd', label: 'Price', align: 'left' },
  { id: '', label: '' },
];

export interface ExploreIndexesTableProps {
  indexes: IndexDetails[];
  loading: boolean;
}

export function ExploreIndexesTable({ indexes, loading }: ExploreIndexesTableProps) {
  const theme = useTheme();
  const table = useTable({ defaultRowsPerPage: 20 });

  // ✅ Make filters match IMarketTableFilters so the toolbar type fits
  const filters = useSetState<IMarketTableFilters>({
    name: '',
    role: [], // unused for indexes, but required by the type
    status: 'all', // unused for indexes, but required by the type
  });

  type SortableKeys = 'tvlUsd' | 'priceUsd' | 'coinCount';
  const comparator = getComparator<SortableKeys>(table.order, table.orderBy as SortableKeys) as (
    a: IndexDetails,
    b: IndexDetails
  ) => number;

  const dataFiltered = applyFilter({
    data: indexes,
    comparator,
    nameFilter: filters.state.name,
  });

  const notFound = !dataFiltered.length;

  return (
    <div data-testid="explore-indexes-table">
      {/* ✅ Reuse the pools toolbar (search box) */}
      <ExploreIndexesTableToolbar
        filters={filters}
        onResetPage={table.onResetPage}
        createHref="/indexes/create"
        createLabel="Create index"
        placeholder="Search indexes..."
      />

      <Card sx={{ borderRadius: 3, border: 1, borderColor: alpha(theme.palette.grey[500], 0.32) }}>
        <Scrollbar>
          <Table sx={{ minWidth: 960 }}>
            <TableHeadCustom
              order={table.order}
              orderBy={table.orderBy}
              headCells={TABLE_HEAD}
              rowCount={dataFiltered.length}
              numSelected={table.selected.length}
              onSort={table.onSort}
            />

            <TableBody>
              {loading ? (
                <TableSkeleton rowCount={10} cellCount={8} />
              ) : (
                <>
                  {dataFiltered
                    .slice(
                      table.page * table.rowsPerPage,
                      table.page * table.rowsPerPage + table.rowsPerPage
                    )
                    .map((idx) => {
                      const sorted = [...idx.constituents].sort(
                        (a, b) => b.weightPct - a.weightPct
                      );
                      const largest = sorted[0];
                      const smallest = sorted[sorted.length - 1];

                      return (
                        <TableRow key={idx.id} hover>
                          <TableCell>{idx.id}</TableCell>

                          <TableCell>
                            <Stack direction="row" alignItems="center" spacing={1.5}>
                              <Avatar
                                src={idx.constituents[0]?.icon}
                                alt={idx.name}
                                sx={{ width: 32, height: 32 }}
                              />
                              <Typography variant="body2" noWrap>
                                {idx.name}
                              </Typography>
                            </Stack>
                          </TableCell>

                          <TableCell>{idx.coinCount}</TableCell>
                          <TableCell>{idx.weighting.label}</TableCell>

                          <TableCell>
                            {largest ? (
                              <Stack direction="row" spacing={1} alignItems="center">
                                <Avatar src={largest.icon} sx={{ width: 24, height: 24 }} />
                                <Typography variant="body2">{largest.shortname}</Typography>
                                <Typography variant="caption">
                                  ({largest.weightPct.toFixed(1)}%)
                                </Typography>
                              </Stack>
                            ) : (
                              '-'
                            )}
                          </TableCell>

                          <TableCell>
                            {smallest ? (
                              <Stack direction="row" spacing={1} alignItems="center">
                                <Avatar src={smallest.icon} sx={{ width: 24, height: 24 }} />
                                <Typography variant="body2">{smallest.shortname}</Typography>
                                <Typography variant="caption">
                                  ({smallest.weightPct.toFixed(1)}%)
                                </Typography>
                              </Stack>
                            ) : (
                              '-'
                            )}
                          </TableCell>

                          <TableCell>${idx.tvlUsd.toLocaleString()}</TableCell>
                          <TableCell>${idx.priceUsd.toFixed(2)}</TableCell>
                          <TableCell />
                        </TableRow>
                      );
                    })}

                  <TableEmptyRows
                    height={56}
                    emptyRows={emptyRows(table.page, table.rowsPerPage, dataFiltered.length)}
                  />
                  <TableNoData notFound={notFound} />
                </>
              )}
            </TableBody>
          </Table>
        </Scrollbar>
      </Card>
    </div>
  );
}

function applyFilter({
  data,
  comparator,
  nameFilter,
}: {
  data: IndexDetails[];
  comparator: (a: IndexDetails, b: IndexDetails) => number;
  nameFilter: string;
}) {
  const out = nameFilter
    ? data.filter((idx) => idx.name.toLowerCase().includes(nameFilter.toLowerCase()))
    : data;

  const stabilised = out.map((el, idx) => [el, idx] as const);
  stabilised.sort((a, b) => {
    const order = comparator(a[0], b[0]);
    return order !== 0 ? order : a[1] - b[1];
  });

  return stabilised.map((el) => el[0]);
}
