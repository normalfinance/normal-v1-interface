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
          asset: parseSymbol(topics[1]),
          pool: parseAddress(topics[2]),
          user: parseAddress(topics[3]),
          amount: parseBigInt(parsedData[0]),
          shareAmount: parseBigInt(parsedData[1]),
          delta_a: parseBigInt(parsedData[2]),
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
          asset: parseSymbol(topics[1]),
          pool: parseAddress(topics[2]),
          user: parseAddress(topics[3]),
          shareAmount: parseBigInt(parsedData[0]),
          amount: parseBigInt(parsedData[1]),
          delta_a: parseBigInt(parsedData[2]),
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

    case 'swap': {
      if (topics.length === 4 && parsedData.length === 8) {
        // FeeSwapEvent (PoolSwapFee)
        return {
          type,
          asset: parseSymbol(topics[1]),
          pool: parseAddress(topics[2]),
          user: parseAddress(topics[3]),
          direction: parseSymbol(parsedData[0]),
          inAmount: parseBigInt(parsedData[1]),
          outAmount: parseBigInt(parsedData[2]),
          feeAmount: parseBigInt(parsedData[3]),
          lpFee: parseBigInt(parsedData[4]),
          ifPremium: parseBigInt(parsedData[5]),
          revenueFee: parseBigInt(parsedData[6]),
          txHash,
          timestamp: undefined,
        };
      } else if (topics.length === 4 && parsedData.length === 3) {
        // PoolRouterSwapEvent (PoolRouter)
        return {
          type,
          asset: parseSymbol(topics[1]),
          pool: parseAddress(topics[2]),
          user: parseAddress(topics[3]),
          direction: parseSymbol(parseVec(parsedData[0])[0]),
          inAmount: parseBigInt(parsedData[1]),
          outAmount: parseBigInt(parsedData[2]),
          delta_a_prior: parseBigInt(parsedData[2]),
          delta_a_post: parseBigInt(parsedData[3]),
          txHash,
          timestamp: undefined,
        };
      }

      throw new Error(
        `Malformed swap event: topics.length = ${topics.length}, parsedData.length = ${parsedData.length}`
      );
    }

    case 'rebalance':
      return {
        type,
        reserveA: parseBigInt(parsedData[0]),
        reserveB: parseBigInt(parsedData[1]),
        newReserveA: parseBigInt(parsedData[2]),
        newReserveB: parseBigInt(parsedData[3]),
        deltaA: parseBigInt(parsedData[4]),
        txHash,
        timestamp: undefined,
      };

    // ─── Insurance Fund Events ──────────────────────────────────

    case 'insurance_stake_record':
      return {
        type,
        user: parseAddress(topics[1]),
        token: parseAddress(topics[2]),
        action: parseSymbol(parseVec(topics[3])[0]),
        amount: parseBigInt(parsedData[0]),
        reserveAmountBefore: parseBigInt(parsedData[1]),
        stakeSharesBefore: parseBigInt(parsedData[2]),
        totalSharesBefore: parseBigInt(parsedData[3]),
        stakeSharesAfter: parseBigInt(parsedData[4]),
        totalSharesAfter: parseBigInt(parsedData[5]),
        txHash,
        timestamp: undefined,
      };

    case 'collect_premium':
      return {
        type,
        sender: parseAddress(topics[1]),
        amount: parseBigInt(parsedData[0]),
        txHash,
        timestamp: undefined,
      };

    // ─── Pool Swap Fee Events ──────────────────────────────────

    case 'claim_fees':
      return {
        type,
        token: parseAddress(parsedData[0]),
        sender: parseAddress(parsedData[1]),
        amount: parseBigInt(parsedData[2]),
        txHash,
        timestamp: undefined,
      };

    // ─── Pool Router Events ──────────────────────────────────

    case 'add_pool':
      return {
        type,
        asset: parseSymbol(topics[1]),
        pool: parseAddress(parsedData[0]),
        tokens: (parsedData[1] as unknown as { vec: SorobanPrimitive[] }).vec.map(parseAddress),
        initArgs: (parsedData[2] as unknown as { vec: unknown[] }).vec,
        txHash,
        timestamp: undefined,
      };

    case 'config_rewards':
      return {
        type,
        asset: parseSymbol(topics[1]),
        pool: parseAddress(topics[2]),
        poolTps: parseBigInt(parsedData[0]),
        expiredAt: BigInt((parsedData[1] as unknown as { u64: string }).u64),
        txHash,
        timestamp: undefined,
      };

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
