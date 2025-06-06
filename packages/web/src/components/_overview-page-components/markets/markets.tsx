import type { BoxProps } from '@mui/material/Box';
import type { CardProps } from '@mui/material/Card';

import Box from '@mui/material/Box';
import Link from '@mui/material/Link';
import Card from '@mui/material/Card';
import Avatar from '@mui/material/Avatar';
import CardHeader from '@mui/material/CardHeader';

import { fCurrency, fPercent } from 'src/utils/format-number';
import { Scrollbar } from 'src/components/scrollbar';
import { Icon } from '@iconify/react';
import { useTheme } from '@mui/material/styles';
import NextLink from 'next/link';

// ----------------------------------------------------------------------
// 1) Update list item type with `percentage` instead of `priceSale`.
type Props = CardProps & {
  title?: string;
  subheader?: string;
  list: {
    id: string;
    name: string;
    coverUrl: string;
    price: number;
    percentage: number;
    url: string;
  }[];
};

export function Markets({ title, subheader, list, sx, ...other }: Props) {
  return (
    <Card sx={sx} {...other}>
      <CardHeader title={title} subheader={subheader} />

      <Scrollbar>
        <Box
          sx={{
            p: 3,
            gap: 3,
            minWidth: 240,
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {list.map((item) => (
            <Item key={item.id} item={item} />
          ))}
        </Box>
      </Scrollbar>
    </Card>
  );
}

// ----------------------------------------------------------------------

type ItemProps = BoxProps & {
  item: Props['list'][number];
};

function Item({ item, sx, ...other }: ItemProps) {
  const theme = useTheme();

  // 1. Check if negative or positive
  const isNegative = item.percentage < 0;

  // 2. Use absolute value for formatting (so "5.2323425" => "5.23%")
  const absValue = Math.abs(item.percentage);

  // 3. Format with fPercent => e.g. "5.23%"
  const formatted = fPercent(absValue); // e.g. "5.23%"

  // 4. Add sign => "+5.23%" or "-5.23%"
  const displayPercentage = isNegative ? `-${formatted}` : `+${formatted}`;

  // 5. Determine color => success for positive, error for negative
  const percentageColor = isNegative ? 'error.main' : 'success.main';

  return (
    <Box
      component={NextLink}
      href={item.url}
      sx={[
        {
          gap: 2,
          display: 'flex',
          alignItems: 'center',
          cursor: 'pointer',
          textDecoration: 'none',
          color: 'inherit',
          '&:hover': {
            textDecoration: 'none',
          },
        },
        ...(Array.isArray(sx) ? sx : [sx]),
      ]}
      {...other}
    >
      <Avatar
        variant="rounded"
        alt={item.name}
        src={item.coverUrl}
        sx={{ width: 48, height: 48, flexShrink: 0 }}
      />

      <Box
        sx={{
          gap: 0.5,
          minWidth: 0,
          display: 'flex',
          flex: '1 1 auto',
          flexDirection: 'column',
        }}
      >
        {/* Name */}
        <Link noWrap sx={{ color: 'text.primary', typography: 'subtitle2' }}>
          {item.name}
        </Link>

        {/* Price and Percentage */}
        <Box
          sx={{
            gap: 1,
            display: 'flex',
            typography: 'body2',
            color: 'text.secondary',
            alignItems: 'center',
          }}
        >
          <Box component="span">{fCurrency(item.price)}</Box>

          <Box component="span" sx={{ color: percentageColor }}>
            {displayPercentage}
          </Box>
        </Box>
      </Box>

      <Icon
        icon="mdi:keyboard-arrow-right"
        width="24"
        height="24"
        style={{ color: theme.palette.grey[600] }}
      />
    </Box>
  );
}
