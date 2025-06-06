'use client';

import type { TableHeadCellProps } from 'src/components/table';
import type { IMarketTableFilters } from 'src/types/marketTable';

import { useState, useCallback } from 'react';
import { varAlpha } from 'minimal-shared/utils';
import { useSetState } from 'minimal-shared/hooks';

import Box from '@mui/material/Box';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import Card from '@mui/material/Card';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';

import { Scrollbar } from 'src/components/scrollbar';
import {
  useTable,
  emptyRows,
  TableNoData,
  getComparator,
  TableEmptyRows,
  TableHeadCustom,
  TablePaginationCustom,
} from 'src/components/table';

import { Label, LabelColor } from 'src/components/label';
import { MarketTableRow } from './_components/market-table-row';
import { MarketTableToolbar } from './_components/market-table-toolbar';
import { MarketTableFiltersResult } from './_components/market-table-filters-result';

// ----------------------------------------------------------------------

//const STATUS_OPTIONS = [{ value: 'all', label: 'All' }, ...Market_STATUS_OPTIONS];

const TABLE_HEAD: TableHeadCellProps[] = [
  { id: 'name', label: 'Name' },
  { id: 'price', label: 'Price' },
  { id: 'percentageChange', label: 'Change (%)' },
  { id: 'performance', label: 'Performance' },
  { id: 'status' },
  { id: '', width: 88 },
];

// ─── Define a type for Market ─────────────────────────────────────────────
export interface Market {
  id: string;
  name: string;
  price: number;
  percentageChange: number;
  performance: string;
  status: string;
  avatarUrl: string;
  url: string;
}

// ─── Define status options (adjust as needed) ─────────────────────────────
const STATUS_OPTIONS = [
  { value: 'all', label: 'All' },
  { value: 'trending', label: 'Trending' },
  { value: 'new', label: 'New' },
  { value: 'meme', label: 'Meme' },
  { value: 'rwa', label: 'RWA' },
];

// Mapping between status values and colors
const statusColorMapping: Record<string, LabelColor> = {
  trending: 'info',
  new: 'primary',
  meme: 'warning',
  rwa: 'error',
  all: 'default',
};

export type MarketTableProps = {
  markets: Market[];
};

// ----------------------------------------------------------------------

export function MarketTable({ markets }: MarketTableProps) {
  const table = useTable({ defaultRowsPerPage: 100 });

  const [tableData, setTableData] = useState<Market[]>(markets);

  const filters = useSetState<IMarketTableFilters>({ name: '', role: [], status: 'all' });
  const { state: currentFilters, setState: updateFilters } = filters;

  const dataFiltered = applyFilter({
    inputData: tableData,
    comparator: getComparator(table.order, table.orderBy),
    filters: currentFilters,
  });

  const canReset = !!currentFilters.name || currentFilters.status !== 'all';

  const notFound = (!dataFiltered.length && canReset) || !dataFiltered.length;

  const handleFilterStatus = useCallback(
    (event: React.SyntheticEvent, newValue: string) => {
      table.onResetPage();
      updateFilters({ status: newValue });
    },
    [updateFilters, table]
  );

  return (
    <>
      <Card>
        <Tabs
          value={currentFilters.status}
          onChange={handleFilterStatus}
          sx={[
            (theme) => ({
              px: 2.5,
              boxShadow: `inset 0 -2px 0 0 ${varAlpha(theme.vars.palette.grey['500Channel'], 0.08)}`,
            }),
          ]}
        >
          {STATUS_OPTIONS.map((tab) => (
            <Tab
              key={tab.value}
              iconPosition="end"
              value={tab.value}
              label={tab.label}
              icon={
                <Label
                  variant={
                    ((tab.value === 'all' || tab.value === currentFilters.status) && 'filled') ||
                    'soft'
                  }
                  color={
                    (tab.value === 'trending' && 'info') ||
                    (tab.value === 'new' && 'primary') ||
                    (tab.value === 'meme' && 'warning') ||
                    (tab.value === 'rwa' && 'error') ||
                    'default'
                  }
                >
                  {['trending', 'new', 'meme', 'rwa'].includes(tab.value)
                    ? tableData.filter((market) => market.status === tab.value).length
                    : tableData.length}
                </Label>
              }
            />
          ))}
        </Tabs>

        {/************ SEARCHBAR IN THERE *************/}
        <MarketTableToolbar filters={filters} onResetPage={table.onResetPage} />

        {canReset && (
          <MarketTableFiltersResult
            filters={filters}
            totalResults={dataFiltered.length}
            onResetPage={table.onResetPage}
            sx={{ p: 2.5, pt: 0 }}
          />
        )}

        <Box sx={{ position: 'relative' }}>
          <Scrollbar>
            <Table size={table.dense ? 'small' : 'medium'} sx={{ minWidth: 960 }}>
              {/**************** TABLE HEAD HERE *******************/}
              <TableHeadCustom
                order={table.order}
                orderBy={table.orderBy}
                headCells={TABLE_HEAD}
                rowCount={dataFiltered.length}
                numSelected={table.selected.length}
                onSort={table.onSort}
                onSelectAllRows={(checked) =>
                  table.onSelectAllRows(
                    checked,
                    dataFiltered.map((row) => row.id)
                  )
                }
              />

              <TableBody>
                {dataFiltered
                  .slice(
                    table.page * table.rowsPerPage,
                    table.page * table.rowsPerPage + table.rowsPerPage
                  )
                  .map((row) => (
                    <MarketTableRow
                      key={row.id}
                      row={row}
                      selected={table.selected.includes(row.id)}
                      editHref="#"
                    />
                  ))}

                <TableEmptyRows
                  height={table.dense ? 56 : 56 + 20}
                  emptyRows={emptyRows(table.page, table.rowsPerPage, dataFiltered.length)}
                />

                <TableNoData notFound={notFound} />
              </TableBody>
            </Table>
          </Scrollbar>
        </Box>
      </Card>
    </>
  );
}

// ----------------------------------------------------------------------

type ApplyFilterProps = {
  inputData: Market[];
  filters: IMarketTableFilters;
  comparator: (a: any, b: any) => number;
};

function applyFilter({ inputData, comparator, filters }: ApplyFilterProps) {
  const { name, status } = filters; // ignore `role` since it's not used for markets

  // Sort the data
  const stabilizedThis = inputData.map((el, index) => [el, index] as const);
  stabilizedThis.sort((a, b) => {
    const order = comparator(a[0], b[0]);
    if (order !== 0) return order;
    return a[1] - b[1];
  });
  inputData = stabilizedThis.map((el) => el[0]);

  // Filter by name
  if (name) {
    inputData = inputData.filter((market) =>
      market.name.toLowerCase().includes(name.toLowerCase())
    );
  }

  // Filter by status (if not "all")
  if (status !== 'all') {
    inputData = inputData.filter((market) => market.status === status);
  }

  return inputData;
}
