export type LiquidityPosition = {
  pair: {
    pairAddress: string;
    asset: string;
  };
  usdValues: {
    long: string | number;
    short: string | number;
    usdc: string | number;
  };
};

export function useManageLiquidity() {
  return { liquidityPositions: [] as LiquidityPosition[] };
}
