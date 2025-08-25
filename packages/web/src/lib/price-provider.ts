/**
 * Minimal price provider you can replace later.
 * - Treats known stables as $1.00
 * - Returns undefined for unknown tokens (so those events count as 0 until priced)
 */
const STABLE_SYMBOLS = new Set(['USD', 'USDC', 'USDT', 'USDC.E', 'USDCET', 'USDCet']);

export interface PriceProvider {
  getUSDPrice(symbolOrAddress: string): Promise<number | undefined>;
}

class DefaultPriceProvider implements PriceProvider {
  async getUSDPrice(symbolOrAddress: string): Promise<number | undefined> {
    if (!symbolOrAddress) return undefined;
    const sym = symbolOrAddress.toUpperCase();
    if (STABLE_SYMBOLS.has(sym)) return 1;
    // TODO: plug in your oracle or a Supabase price table here.
    return undefined;
  }
}

export const priceProvider: PriceProvider = new DefaultPriceProvider();
