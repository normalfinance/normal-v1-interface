import { TimeEpoch } from '@normalfinance/types';

/**
 * Maps a time period like '1d', '7d', '30d', or 'custom' (with seconds) to a timestampAgo
 * @param timeframe - e.g., '1d', '7d', '30d', or a custom seconds value like 432000
 * @returns timestamp in seconds since UNIX epoch
 */
export function getTimestampAgo(timeEpoch: TimeEpoch): number {
  const now = Math.floor(Date.now() / 1000); // current time in seconds

  const secondsAgo =
    typeof timeEpoch === 'number'
      ? timeEpoch
      : (
          {
            daily: 86400,
            weekly: 7 * 86400,
            monthly: 30 * 86400,
          } as const
        )[timeEpoch];

  return now - secondsAgo;
}
