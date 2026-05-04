import { Asset } from '@stellar/stellar-sdk';
import { NetworkConfig } from '@normalfinance/types';
import { constants } from '..';

export function serializeAssetCode(code: string, issuer: string): Buffer {
  return Buffer.from(new Asset(code, issuer).toXDRObject().toXDR('base64'));
}

export function serializeNormalAsset(
  code: string,
  config: NetworkConfig = constants.StellarConfig
): Buffer {
  return serializeAssetCode(code, config.NORMAL_ISSUER);
}
