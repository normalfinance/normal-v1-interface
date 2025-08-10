export type RealtimeChartData = {
  series: {
    name: string;
    data: { name: string; data: number[] }[];
  }[];
  categories: string[];
  tickAmount: number;
};

// Define a type for all supported timeframe keys
export type TimeframeKey =
  | '24h'
  | '1d'
  | '7d'
  | '1w'
  | '14d'
  | '2w'
  | '30d'
  | '1m'
  | '3m'
  | '6m'
  | '12m'
  | '1y'
  | '3y'
  | '5y';

/**
 * Generates x-axis categories (labels) based on the timeframe.
 * Ensures that roughly 8 labels will be displayed on the x-axis for longer timeframes.
 */
function getCategories(timeframe: TimeframeKey): string[] {
  const now = new Date();
  if (timeframe === '24h' || timeframe === '1d') {
    // 24 hourly labels (last 24 hours, ending at current hour)
    const currentHour = now.getHours();
    return Array.from({ length: 24 }, (_, i) => {
      const hour = (currentHour - 23 + i + 24) % 24;
      return hour.toString().padStart(2, '0') + ':00';
    });
  } else if (timeframe === '7d' || timeframe === '1w') {
    // 7 daily labels (last 7 days, ending today) - use weekday abbreviations
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(now.getDate() - (6 - i));
      return d.toLocaleDateString('en-US', { weekday: 'short' }); // e.g. "Mon", "Tue"
    });
  } else if (timeframe === '14d' || timeframe === '2w') {
    // 14 daily labels (last 14 days, ending today) - use short month and day
    return Array.from({ length: 14 }, (_, i) => {
      const d = new Date();
      d.setDate(now.getDate() - (13 - i));
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }); // e.g. "Aug 5"
    });
  } else if (timeframe === '30d' || timeframe === '1m') {
    // ~30 daily labels (last 30 days, ending today)
    return Array.from({ length: 31 }, (_, i) => {
      const d = new Date();
      d.setDate(now.getDate() - (30 - i));
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }); // e.g. "Aug 10"
    });
  } else if (timeframe === '3m') {
    // ~90 daily labels (last 90 days)
    return Array.from({ length: 91 }, (_, i) => {
      const d = new Date();
      d.setDate(now.getDate() - (90 - i));
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    });
  } else if (timeframe === '6m') {
    // ~180 daily labels (last 180 days)
    return Array.from({ length: 181 }, (_, i) => {
      const d = new Date();
      d.setDate(now.getDate() - (180 - i));
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    });
  } else if (timeframe === '12m' || timeframe === '1y') {
    // 12 monthly labels (last 12 months, ending this month) – month abbreviations
    const categories: string[] = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      categories.push(d.toLocaleString('en-US', { month: 'short' })); // e.g. "Jan"
    }
    return categories;
  } else if (timeframe === '3y') {
    // 36 monthly labels (last 36 months) – include month and year for clarity
    const categories: string[] = [];
    for (let i = 35; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      categories.push(d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })); // e.g. "Jan 2023"
    }
    return categories;
  } else if (timeframe === '5y') {
    // 60 monthly labels (last 60 months) – include month and year
    const categories: string[] = [];
    for (let i = 59; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      categories.push(d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })); // e.g. "Jan 2021"
    }
    return categories;
  }
  return [];
}

/**
 * Creates a RealtimeChartData object for the given timeframe and data series.
 * Automatically sets tickAmount to ensure roughly 8 x-axis labels (or fewer if data points are fewer).
 */
export function createChartData(
  timeframe: TimeframeKey,
  data: number[],
  tickAmount?: number
): RealtimeChartData {
  const categories = getCategories(timeframe);
  // Determine tickAmount: use provided value or default to min(categories length, 8)
  const effectiveTicks = tickAmount !== undefined ? tickAmount : Math.min(categories.length, 8);
  return {
    series: [
      {
        name: timeframe,
        data: [{ name: 'Balance', data }],
      },
    ],
    categories,
    tickAmount: effectiveTicks,
  };
}
