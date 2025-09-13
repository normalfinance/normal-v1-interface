export type NetworkType = 'testnet' | 'mainnet';

export function getCurrentNetwork(): NetworkType {
  const network = process.env.NEXT_PUBLIC_NETWORK?.toLowerCase();
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

export function getNetworkTableName(baseName: string): string {
  return isMainnet() ? baseName : `${baseName}_testnet`;
}


export function getNetworkApiPath(basePath: string): string {
  return isMainnet() ? basePath : `/testnet${basePath}`;
}


export function getNetworkDisplayName(): string {
  return isMainnet() ? 'Mainnet' : 'Testnet';
}
