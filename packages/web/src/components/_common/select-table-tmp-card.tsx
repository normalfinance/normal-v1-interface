import type { TableHeadCellProps } from '@/components/template/table';

import Table from '@mui/material/Table';
import TableRow from '@mui/material/TableRow';
import TableCell from '@mui/material/TableCell';
import TableBody from '@mui/material/TableBody';

import { Scrollbar } from '@/components/template/scrollbar';
import { TableHeadCustom } from '@/components/template/table';

// ----------------------------------------------------------------------

const TABLE_HEAD: TableHeadCellProps[] = [
  { id: 'dessert', label: 'Dessert (100g serving)' },
  { id: 'calories', label: 'Calories', align: 'right' },
  { id: 'fat', label: 'Fat (g)', align: 'right' },
  { id: 'carbs', label: 'Carbs (g)', align: 'right' },
  { id: 'protein', label: 'Protein (g)', align: 'right' },
];

const TABLE_DATA = [{ name: 'Frozen yoghurt', calories: 159, fat: 6, carbs: 24, protein: 4 }];

// ----------------------------------------------------------------------

export function SelectTableTmpCard() {
  return (
    <Scrollbar sx={{ minHeight: 0 }}>
      <Table sx={{ minWidth: 800 }}>
        <TableHeadCustom headCells={TABLE_HEAD} />

        <TableBody>
          {TABLE_DATA.map((row) => (
            <TableRow key={row.name}>
              <TableCell>{row.name}</TableCell>
              <TableCell align="right">{row.calories}</TableCell>
              <TableCell align="right">{row.fat}</TableCell>
              <TableCell align="right">{row.carbs}</TableCell>
              <TableCell align="right">{row.protein}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Scrollbar>
  );
}
