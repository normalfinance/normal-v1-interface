export type NetworkType = 'testnet' | 'mainnet';

export function getCurrentNetwork(): NetworkType {
  // trim() guards against a stray trailing space in the env value (e.g.
  // "MAINNET "), which would otherwise fail the strict === and silently fall
  // back to testnet — reading Stellar/savings on the wrong network.
  const network = process.env.NEXT_PUBLIC_NETWORK?.trim().toLowerCase();
  return network === 'mainnet' ? 'mainnet' : 'testnet';
}

export function isMainnet(): boolean {
  return getCurrentNetwork() === 'mainnet';
}

export function isTestnet(): boolean {
  return getCurrentNetwork() === 'testnet';
}

export function getNetworkConfig<T>(testnetValue: T, mainnetValue: T): T {
  return isMainnet() ? mainnetValue : testnetValue;
}

export function getNetworkApiPath(basePath: string): string {
  return isMainnet() ? basePath : `/testnet${basePath}`;
}

export function getNetworkDisplayName(): string {
  return isMainnet() ? 'Mainnet' : 'Testnet';
}
