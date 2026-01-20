import type { TreasuryBalances } from '@/hooks/stellar/use-treasury';

export type TradeRouteType =
  | 'buy_long_direct'
  | 'buy_long_mint'
  | 'buy_short_direct'
  | 'buy_short_mint'
  | 'sell_long_direct'
  | 'sell_long_redeem'
  | 'sell_short_direct'
  | 'sell_short_redeem';

export interface TradeRoute {
  type: TradeRouteType;
  label: string;
  hasSufficientLiquidity: boolean;
}

export interface DetermineRouteParams {
  tradeDirection: 'buy' | 'sell';
  isLongToken: boolean;
  requiredAmount: BigNumber;
  treasuryBalances: TreasuryBalances;
  safetyMargin?: number;
}

const ROUTE_LABELS: Record<TradeRouteType, string> = {
  buy_long_direct: 'Buying Long',
  buy_long_mint: 'Minting & Selling Short',
  buy_short_direct: 'Buying Short',
  buy_short_mint: 'Minting & Selling Long',
  sell_long_direct: 'Selling Long',
  sell_long_redeem: 'Buying Short & Redeeming',
  sell_short_direct: 'Selling Short',
  sell_short_redeem: 'Buying Long & Redeeming',
};

export function determineTradeRoute(params: DetermineRouteParams): TradeRoute {
  const {
    tradeDirection,
    isLongToken,
    requiredAmount,
    treasuryBalances,
    safetyMargin = 0.02,
  } = params;

  const requiredWithMargin = requiredAmount.multipliedBy(1 + safetyMargin);

  const relevantBalance =
    tradeDirection === 'buy'
      ? isLongToken
        ? treasuryBalances.long
        : treasuryBalances.short
      : treasuryBalances.quote;

  const hasLiquidity = relevantBalance.gte(requiredWithMargin);

  const routeMap: Record<string, TradeRouteType> = {
    buy_true_true: 'buy_long_direct',
    buy_true_false: 'buy_long_mint',
    buy_false_true: 'buy_short_direct',
    buy_false_false: 'buy_short_mint',
    sell_true_true: 'sell_long_direct',
    sell_true_false: 'sell_long_redeem',
    sell_false_true: 'sell_short_direct',
    sell_false_false: 'sell_short_redeem',
  };

  const key = `${tradeDirection}_${isLongToken}_${hasLiquidity}`;
  const routeType = routeMap[key];

  return {
    type: routeType,
    label: ROUTE_LABELS[routeType],
    hasSufficientLiquidity: hasLiquidity,
  };
}
