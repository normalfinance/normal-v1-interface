import { Metadata } from 'next';
import LiquidityPositionsView from '@/sections/liquidity-positions';

// ----------------------------------------------------------------------

export const metadata: Metadata = {
  title: 'Normal | Liquidity Positions',
  description: '',
};

export default function Page() {
  return <LiquidityPositionsView />;
}
