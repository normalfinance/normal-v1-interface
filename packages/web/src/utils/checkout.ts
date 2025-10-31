export type CreateOnramperUrlOpts = {
  amountUsd: number | string;
  tokenSymbol: string;
  walletAddress?: string;
  fiat?: string;
};

function isTestKey(apiKey?: string) {
  return !!apiKey && apiKey.startsWith('pk_test_');
}

/**
 * Map an app token symbol to Onramper's asset ID, preferring the Stellar variant when relevant.
 * Known Stellar-native:
 *  - XLM -> xlm_stellar
 *
 * For other symbols we return the uppercased ticker (Onramper accepts plain tickers
 * for single-network assets like ETH). If later you support more Stellar-native assets
 * via Onramper (e.g., USDC on Stellar), extend the map below.
 */
function toOnramperAssetId(symbolRaw: string): string {
  const s = symbolRaw?.trim().toUpperCase();

  // Prefer Stellar chain where applicable
  if (s === 'XLM') return 'xlm_stellar';

  // TODO: extend as needed, e.g.:
  // if (s === 'USDC') return 'usdc_stellar'; // only if confirmed in your Onramper asset list

  return s || 'XLM';
}

export function createOnramperURL(
  apiKey: string,
  arg2?: number | string | CreateOnramperUrlOpts
): string {
  const base = `https://${isTestKey(apiKey) ? 'buy.onramper.dev' : 'buy.onramper.com'}`;

  // Back-compat: createOnramperURL(apiKey, amount)
  if (typeof arg2 === 'number' || typeof arg2 === 'string' || arg2 == null) {
    const amountUsd = String(arg2 ?? '0');
    const params = new URLSearchParams({
      apiKey,
      mode: 'buy',
      defaultFiat: 'USD',
      defaultAmount: amountUsd,
    });
    return `${base}/?${params.toString()}`;
  }

  const { amountUsd, tokenSymbol, walletAddress, fiat = 'USD' } = arg2 as CreateOnramperUrlOpts;

  const assetId = toOnramperAssetId(tokenSymbol);
  const params = new URLSearchParams({
    apiKey,
    mode: 'buy',
    defaultFiat: fiat,
    defaultAmount: String(amountUsd ?? '0'),
    defaultCrypto: assetId,
  });

  if (walletAddress) {
    params.set('wallets', `${assetId}:${walletAddress}`);
  }

  return `${base}/?${params.toString()}`;
}

export type CreateCoinbaseUrlOpts = {
  amountUsd: number | string;
  assetSymbol: string;
  sessionToken: string;
  fiat?: string;
  path?: 'buy' | 'buy/select-asset'; // default 'buy'
  redirectUrl?: string;
  sandbox?: boolean;
};

export function createCoinbasePayURL(opts: CreateCoinbaseUrlOpts): string {
  const {
    amountUsd,
    assetSymbol,
    sessionToken,
    fiat = 'USD',
    path = 'buy',
    redirectUrl,
    sandbox = true, // default to sandbox while testing
  } = opts;

  const base = sandbox ? 'https://pay-sandbox.coinbase.com' : 'https://pay.coinbase.com';

  const params = new URLSearchParams({
    presetFiatAmount: String(amountUsd),
    fiatCurrency: fiat,
    defaultAsset: assetSymbol, // e.g., 'XLM'
    sessionToken,
  });

  if (redirectUrl) params.set('redirectUrl', redirectUrl);

  return `${base}/${path}?${params.toString()}`;
}
