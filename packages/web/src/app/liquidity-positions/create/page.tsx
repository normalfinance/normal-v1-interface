import { Metadata } from 'next';
import CreateLiquidityPositionView from '@/sections/liquidity-positions/create';

// ----------------------------------------------------------------------

export const metadata: Metadata = {
  title: 'Normal | Liquidity Positions - Create',
  description: '',
};

export default function Page() {
  return <CreateLiquidityPositionView />;
}
