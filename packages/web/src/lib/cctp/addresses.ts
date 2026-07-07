// 32-byte address conversions for CCTP messages. CCTP addresses are raw
// 32-byte payloads: EVM addresses are left-padded, Stellar contract addresses
// are the decoded strkey bytes.

import { StrKey } from '@stellar/stellar-sdk';

export const ZERO_BYTES32: `0x${string}` = `0x${'00'.repeat(32)}`;

/** EVM 0x address → left-padded bytes32 hex (CCTP mintRecipient format). */
export function evmAddressToBytes32(address: string): `0x${string}` {
  if (!/^0x[a-fA-F0-9]{40}$/.test(address)) throw new Error(`not an EVM address: ${address}`);
  return `0x${'00'.repeat(12)}${address.slice(2).toLowerCase()}` as `0x${string}`;
}

/** Stellar contract strkey (C…) → bytes32 hex. Used for CctpForwarder as
 *  mintRecipient AND destinationCaller on Stellar-bound burns. */
export function stellarContractToBytes32(contractId: string): `0x${string}` {
  const raw = StrKey.decodeContract(contractId);
  return `0x${Buffer.from(raw).toString('hex')}` as `0x${string}`;
}

/** EVM address → 32-byte Uint8Array (Soroban BytesN<32> argument format). */
export function evmAddressToBytes(address: string): Uint8Array {
  if (!/^0x[a-fA-F0-9]{40}$/.test(address)) throw new Error(`not an EVM address: ${address}`);
  const out = new Uint8Array(32);
  const addr = address.slice(2);
  for (let i = 0; i < 20; i++) out[12 + i] = parseInt(addr.slice(i * 2, i * 2 + 2), 16);
  return out;
}
