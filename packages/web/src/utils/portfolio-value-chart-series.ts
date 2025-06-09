// src/utils/chartSeries.ts

export type RealtimeChartData = {
  series: {
    name: string;
    data: { name: string; data: number[] }[];
  }[];
  categories: string[];
  tickAmount: number;
};

/**
 * Generates x-axis categories based on the timeframe.
 * - "24h": returns an array of 24 hourly labels, where the last label is the current hour.
 * - "7d": returns an array of 7 abbreviated weekday names (the last label is today’s weekday).
 * - "30d": returns an array of 31 date labels (e.g., "Aug 24"), with the last label being today.
 */
function getCategories(timeframe: '24h' | '7d' | '30d' | '12m'): string[] {
  const now = new Date();
  if (timeframe === '24h') {
    // Generate 24 hourly labels such that the last label is the current hour.
    const currentHour = now.getHours();
    return Array.from({ length: 24 }, (_, i) => {
      // For i = 0, we want the label for currentHour - 23 (with wrap-around)
      // For i = 23, we want the label for currentHour.
      const hour = (currentHour - 23 + i + 24) % 24;
      return hour.toString().padStart(2, '0') + ':00';
    });
  } else if (timeframe === '7d') {
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      // For i = 0, label is for 6 days ago; for i = 6, label is today.
      d.setDate(d.getDate() - (6 - i));
      return d.toLocaleDateString('en-US', { weekday: 'short' });
    });
  } else if (timeframe === '30d') {
    return Array.from({ length: 31 }, (_, i) => {
      const d = new Date();
      // For i = 0, label is for 30 days ago; for i = 30, label is today.
      d.setDate(d.getDate() - (30 - i));
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    });
  } else if (timeframe === '12m') {
    const categories: string[] = [];
    // Generate 12 month labels ending with the current month.
    const now = new Date();
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      categories.push(d.toLocaleString('default', { month: 'short' }));
    }
    return categories;
  }
  return [];
}

/**
 * createChartData
 * @param timeframe - one of '24h', '7d', or '30d'
 * @param data - array of numbers representing the balance over time
 * @param tickAmount - number of x-axis labels to display
 * @returns a RealtimeChartData object.
 */
export function createChartData(
  timeframe: '24h' | '7d' | '30d' | '12m',
  data: number[],
  tickAmount: number
): RealtimeChartData {
  const categories = getCategories(timeframe);
  return {
    series: [
      {
        name: timeframe,
        data: [{ name: 'Balance', data }],
      },
    ],
    categories,
    tickAmount,
  };
}
