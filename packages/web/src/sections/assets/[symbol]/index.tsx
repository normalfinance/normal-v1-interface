'use client';

import AssetDetailsView from './asset-details-view';

export default function AssetView({ symbol }: { symbol: string }) {
  return <AssetDetailsView symbol={symbol} />;
}
