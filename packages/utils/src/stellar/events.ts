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

export function parseEvent(
  topics: SorobanPrimitive[],
  data: SorobanPrimitive[],
  txHash: string
): events.NormalContractEvent {
  const type = parseSymbol(topics[0]);

  switch (type) {
    // ─── Pool Events ──────────────────────────────────

    case 'deposit_liquidity':
      return {
        type,
        token: parseAddress(topics[1]),
        user: parseAddress(topics[2]),
        amount: parseBigInt(data[0]),
        shareAmount: parseBigInt(data[1]),
        txHash,
        timestamp: '',
      };

    case 'withdraw_liquidity':
      return {
        type,
        token: parseAddress(topics[1]),
        user: parseAddress(topics[2]),
        shareAmount: parseBigInt(data[0]),
        amount: parseBigInt(data[1]),
        txHash,
        timestamp: '',
      };

    case 'swap': {
      if (topics.length === 4 && data.length === 8) {
        // FeeSwapEvent (PoolSwapFee)
        return {
          type,
          asset: parseSymbol(topics[1]),
          pool: parseAddress(topics[2]),
          user: parseAddress(topics[3]),
          direction: parseSymbol(data[0]),
          inAmount: parseBigInt(data[1]),
          outAmount: parseBigInt(data[2]),
          feeAmount: parseBigInt(data[3]),
          lpFee: parseBigInt(data[4]),
          bufferFee: parseBigInt(data[5]),
          ifPremium: parseBigInt(data[6]),
          revenueFee: parseBigInt(data[7]),
          txHash,
          timestamp: '',
        };
      } else if (topics.length === 4 && data.length === 3) {
        // RouterSwapEvent (PoolRouter)
        return {
          type,
          asset: parseSymbol(topics[1]),
          pool: parseAddress(topics[2]),
          user: parseAddress(topics[3]),
          direction: parseSymbol(data[0]),
          inAmount: parseBigInt(data[1]),
          outAmount: parseBigInt(data[2]),
          txHash,
          timestamp: '',
        };
      }

      throw new Error(
        `Malformed swap event: topics.length = ${topics.length}, data.length = ${data.length}`
      );
    }

    case 'rebalance':
      return {
        type,
        reserveA: parseBigInt(data[0]),
        reserveB: parseBigInt(data[1]),
        newReserveA: parseBigInt(data[2]),
        newReserveB: parseBigInt(data[3]),
        deltaA: parseBigInt(data[4]),
        txHash,
        timestamp: '',
      };

    // ─── Buffer Events ───────────────────────────────────────────

    case 'deposit':
      return {
        type,
        token: parseAddress(topics[1]),
        user: parseAddress(data[0]),
        amount: parseBigInt(data[1]),
        txHash,
        timestamp: '',
      };

    case 'resolve_liquidity_deficit':
      return {
        type,
        pool: parseAddress(topics[1]),
        token: parseAddress(topics[2]),
        user: parseAddress(data[0]),
        amount: parseBigInt(data[1]),
        paid: parseBigInt(data[2]),
        txHash,
        timestamp: '',
      };

    case 'withdraw_surplus':
      return {
        type,
        token: parseAddress(topics[1]),
        user: parseAddress(data[0]),
        amount: parseBigInt(data[1]),
        txHash,
        timestamp: '',
      };

    case 'skim':
      return {
        type,
        token: parseAddress(topics[1]),
        user: parseAddress(data[0]),
        amount: parseBigInt(data[1]),
        txHash,
        timestamp: '',
      };

    // ─── Insurance Fund Events ──────────────────────────────────

    case 'if_stake_record':
      return {
        type,
        user: parseAddress(topics[1]),
        action: parseSymbol(topics[2]),
        amount: parseBigInt(data[0]),
        insuranceVaultAmountBefore: parseBigInt(data[1]),
        ifSharesBefore: parseBigInt(data[2]),
        totalIfSharesBefore: parseBigInt(data[3]),
        ifSharesAfter: parseBigInt(data[4]),
        totalIfSharesAfter: parseBigInt(data[5]),
        txHash,
        timestamp: '',
      };

    case 'collect_premium':
      return {
        type,
        sender: parseAddress(topics[1]),
        amount: parseBigInt(data[0]),
        txHash,
        timestamp: '',
      };

    // ─── Pool Swap Fee Events ──────────────────────────────────

    case 'claim_fees':
      return {
        type,
        token: parseAddress(data[0]),
        sender: parseAddress(data[1]),
        amount: parseBigInt(data[2]),
        txHash,
        timestamp: '',
      };

    // ─── Pool Router Events ──────────────────────────────────

    case 'add_pool':
      return {
        type,
        asset: parseSymbol(topics[1]),
        pool: parseAddress(data[0]),
        tokens: (data[1] as unknown as { vec: SorobanPrimitive[] }).vec.map(parseAddress),
        initArgs: (data[2] as unknown as { vec: unknown[] }).vec,
        txHash,
        timestamp: '',
      };

    case 'config_rewards':
      return {
        type,
        asset: parseSymbol(topics[1]),
        pool: parseAddress(topics[2]),
        poolTps: parseBigInt(data[0]),
        expiredAt: BigInt((data[1] as unknown as { u64: string }).u64),
        txHash,
        timestamp: '',
      };

    case 'claim':
      return {
        type,
        asset: parseSymbol(topics[1]),
        pool: parseAddress(topics[2]),
        user: parseAddress(topics[3]),
        rewardToken: parseAddress(data[0]),
        rewardAmount: parseBigInt(data[1]),
        txHash,
        timestamp: '',
      };

    default:
      throw new Error(`Unknown event type: ${type}`);
  }
}
