export function createStripeURL(amountUsd: number | string): string {
  return `https://crypto.link.com?source_amount=${String(amountUsd ?? '0')}&source_currency=usd&destination_currency=usdc&destination_network=stellar`;
}
