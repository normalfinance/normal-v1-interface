import type { Theme, SxProps, CSSObject } from '@mui/material/styles';
import Box from '@mui/material/Box';
import TableRow from '@mui/material/TableRow';
import Checkbox from '@mui/material/Checkbox';
import TableHead from '@mui/material/TableHead';
import TableCell from '@mui/material/TableCell';
import TableSortLabel from '@mui/material/TableSortLabel';

const visuallyHidden: CSSObject = {
  border: 0,
  padding: 0,
  width: '1px',
  height: '1px',
  margin: '-1px',
  overflow: 'hidden',
  position: 'absolute',
  whiteSpace: 'nowrap',
  clip: 'rect(0 0 0 0)',
};

export type TableHeadCellProps = {
  id: string;
  label?: string;
  width?: CSSObject['width'];
  align?: 'left' | 'center' | 'right';
  sx?: SxProps<Theme>;
};

export type TableHeadCustomProps = {
  orderBy?: string;
  rowCount?: number;
  sx?: SxProps<Theme>;
  numSelected?: number;
  order?: 'asc' | 'desc';
  headCells: TableHeadCellProps[];
  onSort?: (id: string) => void;
  onSelectAllRows?: (checked: boolean) => void;
};

export function TableHeadCustom({
  sx,
  order,
  onSort,
  orderBy,
  headCells,
  rowCount = 0,
  numSelected = 0,
  onSelectAllRows,
}: TableHeadCustomProps) {
  return (
    <TableHead sx={{ width: '100%', ...sx }}>
      <TableRow>
        {/* Instead of rendering the checkbox cell, render an empty cell that is visually hidden */}
        {onSelectAllRows && <TableCell padding="checkbox" sx={{ display: 'none' }} />}

        {headCells.map((headCell) => (
          <TableCell
            key={headCell.id}
            align={headCell.align || 'left'}
            sortDirection={orderBy === headCell.id ? order : false}
            sx={[
              { width: headCell.width },
              ...(Array.isArray(headCell.sx) ? headCell.sx : [headCell.sx]),
            ]}
          >
            {onSort ? (
              <TableSortLabel
                hideSortIcon
                active={orderBy === headCell.id}
                direction={orderBy === headCell.id ? order : 'asc'}
                onClick={() => onSort(headCell.id)}
              >
                {headCell.label}
                {orderBy === headCell.id ? (
                  <Box component="span" sx={visuallyHidden}>
                    {order === 'desc' ? 'sorted descending' : 'sorted ascending'}
                  </Box>
                ) : null}
              </TableSortLabel>
            ) : (
              headCell.label
            )}
          </TableCell>
        ))}
      </TableRow>
    </TableHead>
  );
}
