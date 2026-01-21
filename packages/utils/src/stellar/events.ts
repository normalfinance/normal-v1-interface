import { SorobanPrimitive, events } from '@normalfinance/types';

export function parseBigInt(value: SorobanPrimitive): bigint {
  if ('i128' in value) return BigInt(value.i128);
  if ('u128' in value) return BigInt(value.u128);
  if ('i64' in value) return BigInt(value.i64);
  if ('u64' in value) return BigInt(value.u64);
  if ('i32' in value) return BigInt(value.i32);
  if ('u32' in value) return BigInt(value.u32);
  throw new Error(`Expected i128 or u128 but got ${JSON.stringify(value)}`);
}

export function parseAddress(value: SorobanPrimitive): string {
  if ('address' in value) return value.address;
  throw new Error(`Expected address but got ${JSON.stringify(value)}`);
}

export function parseBool(value: SorobanPrimitive): boolean {
  if ('bool' in value) return value.bool;
  throw new Error(`Expected bool but got ${JSON.stringify(value)}`);
}

export function parseSymbol(value: SorobanPrimitive): string {
  if ('symbol' in value) return value.symbol;
  throw new Error(`Expected symbol but got ${JSON.stringify(value)}`);
}

export function parseVec(value: SorobanPrimitive): SorobanPrimitive[] {
  if ('vec' in value) return value.vec;
  throw new Error(`Expected vec but got ${JSON.stringify(value)}`);
}

export function parseEvent(
  topics: SorobanPrimitive[],
  data: SorobanPrimitive,
  txHash: string
): events.NormalContractEvent {
  const type = parseSymbol(topics[0]);

  const parsedData = parseVec(data);

  switch (type) {
    // ─── Pair Factory Events ──────────────────────────────────

    case 'mint': {
      return {
        type,
        user: parseAddress(topics[1]),
        pair: parseAddress(topics[2]),
        collateral: parseBigInt(parsedData[0]),
        tokensMinted: parseBigInt(parsedData[1]),
        ts: parseBigInt(parsedData[2]),
        txHash,
      };
    }

    case 'redeem': {
      return {
        type,
        user: parseAddress(topics[1]),
        pair: parseAddress(topics[2]),
        collateral: BigInt(0),
        tokensRedeemed: parseBigInt(parsedData[0]),
        ts: parseBigInt(parsedData[1]),
        txHash,
      };
    }

    // ─── Treasury Events ──────────────────────────────────

    case 'deposit': {
      return {
        type,
        user: parseAddress(topics[2]),
        pair: parseAddress(topics[1]),
        pairAmount: parseBigInt(parsedData[0]),
        usdcAmount: parseBigInt(parsedData[1]),
        ts: parseBigInt(parsedData[6]),
        txHash,
      };
    }

    case 'withdraw': {
      return {
        type,
        user: parseAddress(topics[2]),
        pair: parseAddress(topics[1]),
        pairAmount: parseBigInt(parsedData[0]),
        usdcAmount: parseBigInt(parsedData[1]),
        ts: parseBigInt(parsedData[8]),
        txHash,
      };
    }

    case 'trade': {
      return {
        type,
        user: parseAddress(topics[2]),
        pair: parseAddress(topics[1]),
        side: parseSymbol(parseVec(parsedData[1])[0]),
        direction: parseSymbol(parseVec(parsedData[2])[0]),
        inAmount: parseBigInt(parsedData[3]),
        outAmount: parseBigInt(parsedData[4]),
        price: parseBigInt(parsedData[5]),
        ts: parseBigInt(parsedData[8]),
        txHash,
      };
    }

    default:
      throw new Error(`Unknown event type: ${type}`);
  }
}
