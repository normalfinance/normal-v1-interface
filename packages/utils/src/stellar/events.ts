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
    // ─── Pair Events ──────────────────────────────────

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
        collateral: parseBigInt(parsedData[0]),
        tokensRedeemed: parseBigInt(parsedData[1]),
        ts: parseBigInt(parsedData[2]),
        txHash,
      };
    }

    // ─── Treasury Events ──────────────────────────────────

    case 'deposit': {
      return {
        type,
        user: parseAddress(topics[2]),
        pair: parseAddress(topics[1]),
        amount: parseBigInt(parsedData[0]),
        ts: parseBigInt(parsedData[1]),
        txHash,
      };
    }

    case 'withdraw': {
      return {
        type,
        user: parseAddress(topics[2]),
        pair: parseAddress(topics[1]),
        amount: parseBigInt(parsedData[0]),
        ts: parseBigInt(parsedData[1]),
        txHash,
      };
    }

    case 'trade': {
      return {
        type,
        user: parseAddress(topics[2]),
        pair: parseAddress(topics[1]),
        side: parseBigInt(parsedData[0]),
        direction: parseBigInt(parsedData[1]),
        amount: parseBigInt(parsedData[2]),
        ts: parseBigInt(parsedData[3]),
        txHash,
      };
    }

    // case 'claim':
    //   return {
    //     type,
    //     pool: parseAddress(topics[1]),
    //     user: parseAddress(topics[2]),
    //     rewardToken: parseAddress(parsedData[0]),
    //     rewardAmount: parseBigInt(parsedData[1]),
    //     txHash,
    //   };

    default:
      throw new Error(`Unknown event type: ${type}`);
  }
}
