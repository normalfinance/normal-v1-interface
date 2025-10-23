import { SorobanPrimitive, events } from '@normalfinance/types';

export function parseBigInt(value: SorobanPrimitive): bigint {
  if ('i128' in value) return BigInt(value.i128);
  if ('u128' in value) return BigInt(value.u128);
  throw new Error(`Expected i128 or u128 but got ${JSON.stringify(value)}`);
}

export function parseAddress(value: SorobanPrimitive): string {
  if ('address' in value) return value.address;
  throw new Error(`Expected address but got ${JSON.stringify(value)}`);
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
    // ─── Pool and Pool Router Events ──────────────────────────────────

    case 'deposit_liquidity': {
      if (topics.length === 4 && parsedData.length === 2) {
        // PoolRouter
        return {
          type,
          tokens: (topics[0] as unknown as { vec: SorobanPrimitive[] }).vec.map(parseAddress),
          user: parseAddress(topics[1]),
          poolAddress: parseAddress(parsedData[0]),
          amounts: (parsedData[1] as unknown as { vec: SorobanPrimitive[] }).vec.map(parseBigInt),
          shareAmount: parseBigInt(parsedData[2]),
          txHash,
          timestamp: undefined,
        };
      } else {
        // Pool
        return {
          type,
          token: parseAddress(topics[1]),
          user: parseAddress(topics[2]),
          amount: parseBigInt(parsedData[0]),
          shareAmount: parseBigInt(parsedData[1]),
          txHash,
          timestamp: undefined,
        };
      }
    }

    case 'withdraw_liquidity': {
      if (topics.length === 4 && parsedData.length === 2) {
        // PoolRouter
        return {
          type,
          tokens: (topics[0] as unknown as { vec: SorobanPrimitive[] }).vec.map(parseAddress),
          user: parseAddress(topics[1]),
          poolAddress: parseAddress(parsedData[0]),
          amounts: (parsedData[1] as unknown as { vec: SorobanPrimitive[] }).vec.map(parseBigInt),
          shareAmount: parseBigInt(parsedData[2]),
          txHash,
          timestamp: undefined,
        };
      } else {
        // Pool
        return {
          type,
          token: parseAddress(topics[1]),
          user: parseAddress(topics[2]),
          shareAmount: parseBigInt(parsedData[0]),
          amount: parseBigInt(parsedData[1]),
          txHash,
          timestamp: undefined,
        };
      }
    }

    // ─── Pool Router Events ──────────────────────────────────

    case 'swap': {
      return {
        type,
        tokens: (topics[0] as unknown as { vec: SorobanPrimitive[] }).vec.map(parseAddress),
        user: parseAddress(topics[1]),
        poolAddress: parseAddress(parsedData[0]),
        tokenIn: parseAddress(parsedData[1]),
        tokenOut: parseAddress(parsedData[2]),
        inAmount: parseBigInt(parsedData[3]),
        outAmount: parseBigInt(parsedData[4]),
        txHash,
        timestamp: undefined,
      };
    }

    case 'claim':
      return {
        type,
        asset: parseSymbol(topics[1]),
        pool: parseAddress(topics[2]),
        user: parseAddress(topics[3]),
        rewardToken: parseAddress(parsedData[0]),
        rewardAmount: parseBigInt(parsedData[1]),
        txHash,
        timestamp: undefined,
      };

    default:
      throw new Error(`Unknown event type: ${type}`);
  }
}
