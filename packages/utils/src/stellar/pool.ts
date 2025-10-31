import { StrKey, xdr } from '@stellar/stellar-sdk';
import { createHash } from 'crypto';

/**
 * Validates whether a given string is a valid Stellar/Soroban contract address.
 *
 * A valid contract address:
 * - Is a 56-character Base32 string.
 * - Starts with the prefix "C".
 * - Passes Stellar's StrKey checksum validation.
 *
 * @param {string} address - The address to validate.
 * @returns {boolean} True if the address is a valid contract address, false otherwise.
 *
 * @example
 * ```ts
 * isValidContractAddress("CAXNH52WQ7XUCFND2S7WVXRMRUXKFRKCMM6FWX475ZLZZCHETNL6ME6X");
 * // → true
 *
 * isValidContractAddress("GABCD1234INVALIDXYZ");
 * // → false
 * ```
 */
export const isValidContractAddress = (address: string): boolean => {
  if (typeof address !== 'string' || address.length !== 56 || !address.startsWith('C')) {
    return false;
  }

  try {
    // This will throw if the checksum or format is invalid
    StrKey.decodeContract(address);
    return true;
  } catch {
    return false;
  }
};

/**
 * Returns two strings sorted in ascending (lexicographical) order.
 *
 * @param {string} a - The first string.
 * @param {string} b - The second string.
 * @returns {[string, string]} A tuple of [smaller, larger].
 *
 * @example
 * ```ts
 * sortStringsAscending("zebra", "apple");
 * // → ["apple", "zebra"]
 * ```
 */
export const sortTokenAddreses = (
  a: string,
  b: string
): { tokens: [string, string]; idx: { a: 0 | 1; b: 0 | 1 } } => {
  return a < b ? { tokens: [a, b], idx: { a: 0, b: 1 } } : { tokens: [b, a], idx: { b: 0, a: 1 } };
};

/**
 * Computes the deterministic salt for a "standard" pool contract
 * exactly like the Soroban `get_standard_pool_salt()` Rust function.
 *
 * This function:
 * 1. Serializes the `standard` symbol, a separator (`0x00`),
 *    the `feeFraction` as a Soroban `ScVal::U32`, and another `0x00` symbol
 *    into Soroban XDR format.
 * 2. Concatenates all resulting XDR bytes.
 * 3. Computes the SHA-256 hash of the full preimage and returns it as a hex string.
 *
 * @param {number} feeFraction - The fee fraction value (as a u32) used when creating the pool.
 * @returns {string} The 32-byte SHA-256 hash of the concatenated XDR salt bytes, as a lowercase hex string.
 *
 * @example
 * ```ts
 * const hash = getStandardPoolSalt(30);
 * console.log(hash);
 * // → 9ac7a9cde23ac2ada11105eeaa42e43c2ea8332ca0aa8f41f58d7160274d718e
 * ```
 */
export const getStandardPoolSalt = (feeFraction: number): string => {
  // Helper: convert string symbol to XDR (Symbol is represented as a string in XDR)
  const symbolToXdr = (symbol: string): Buffer => {
    const val = xdr.ScVal.scvSymbol(symbol);
    return val.toXDR();
  };

  // Helper: convert u32 to XDR (Soroban uses ScVal::U32)
  const u32ToXdr = (n: number): Buffer => {
    const val = xdr.ScVal.scvU32(n);
    return val.toXDR();
  };

  // Build the salt sequence just like Rust
  const parts: Buffer[] = [
    symbolToXdr('standard'),
    symbolToXdr('0x00'),
    u32ToXdr(feeFraction),
    symbolToXdr('0x00'),
  ];

  // Concatenate buffers
  const salt = Buffer.concat(parts);

  // SHA-256 hash
  const hash = createHash('sha256').update(salt).digest('hex');

  return hash;
};

/**
 * Computes the deterministic salt for an "elastic" pool contract
 * identical to the Soroban `get_elastic_pool_salt()` Rust function.
 *
 * This function:
 * 1. Serializes the symbols `"elastic"` and `"0x00"` as Soroban `ScVal::Symbol` values.
 * 2. Encodes the `poolCounter` as a Soroban `ScVal::U128` (discriminant = 9).
 * 3. Concatenates all serialized XDR bytes into a single preimage.
 * 4. Hashes the full preimage with SHA-256 to produce a unique 32-byte salt.
 *
 * @param {number} poolCounter - The incremental u128 pool counter used to differentiate pool instances.
 * @returns {string} The resulting 32-byte SHA-256 hash in lowercase hexadecimal format.
 *
 * @example
 * ```ts
 * const hash = getElasticPoolSalt(3);
 * console.log(hash);
 * // → e3a6870d142cb2c4ebdec9b4107b0b295477fe000b1ea25267d67c9c479df5a8
 * ```
 *
 * @remarks
 * - Mirrors the Rust logic in:
 *   ```rust
 *   pub fn get_elastic_pool_salt(e: &Env) -> BytesN<32> {
 *       let mut salt = Bytes::new(e);
 *       salt.append(&symbol_short!("elastic").to_xdr(e));
 *       salt.append(&symbol_short!("0x00").to_xdr(e));
 *       salt.append(&get_pool_next_counter(e).to_xdr(e)); // u128
 *       salt.append(&symbol_short!("0x00").to_xdr(e));
 *       e.crypto().sha256(&salt).to_bytes()
 *   }
 *   ```
 */
export const getElasticPoolSalt = (poolCounter: number): string => {
  // Ensure poolCounter is bigint (u128)
  const value = BigInt(poolCounter);

  // Helper to create SCVal::Symbol bytes
  const encodeSymbol = (str: string): Buffer => {
    const strBuf = Buffer.from(str, 'utf8');
    const padding = Buffer.alloc((4 - (strBuf.length % 4)) % 4); // 4-byte align
    const header = Buffer.alloc(8);
    header.writeUInt32BE(0x0f, 0); // discriminant = Symbol (15)
    header.writeUInt32BE(strBuf.length, 4);
    return Buffer.concat([header, strBuf, padding]);
  };

  // Helper to create SCVal::U128 bytes (discriminant 9)
  const encodeU128 = (n: bigint): Buffer => {
    const header = Buffer.alloc(4);
    header.writeUInt32BE(0x09, 0); // discriminant = U128
    const num = Buffer.alloc(16); // 128 bits = 16 bytes
    num.writeBigUInt64BE(n >> BigInt(64), 0); // high 64 bits
    num.writeBigUInt64BE(n & ((BigInt(1) << BigInt(64)) - BigInt(1)), 8); // low 64 bits
    return Buffer.concat([header, num]);
  };

  // Build salt bytes exactly like Soroban .to_xdr()
  const preimage = Buffer.concat([
    encodeSymbol('elastic'),
    encodeSymbol('0x00'),
    encodeU128(value),
    encodeSymbol('0x00'),
  ]);

  // Compute SHA256
  const hash = createHash('sha256').update(preimage).digest('hex');

  return hash;
};
