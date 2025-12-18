import { Asset } from '@stellar/stellar-sdk';
import { constants } from '..';

export function serializeAssetCode(code: string, issuer: string): Buffer {
  return Buffer.from(new Asset(code, issuer).toXDRObject().toXDR('base64'));
}

export function serializeNormalAsset(code: string): Buffer {
  return serializeAssetCode(code, constants.StellarConfig.NORMAL_ISSUER);
}
