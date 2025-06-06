// src/types/stat-card-data.ts
import type { ChartOptions } from 'src/components/chart';

export type StatCardData = {
  title: string;
  percent: number;
  total: number;
  formatter: (value: number) => string;
  // Allowed chart types per ApexCharts
  chartType:
    | 'bar'
    | 'area'
    | 'line'
    | 'pie'
    | 'donut'
    | 'radialBar'
    | 'scatter'
    | 'bubble'
    | 'heatmap'
    | 'candlestick'
    | 'boxPlot'
    | 'radar'
    | 'polarArea'
    | 'rangeBar'
    | 'rangeArea'
    | 'treemap';
  displayChart: boolean;
  chart: {
    colors?: string[];
    categories: string[];
    series: number[];
    options?: ChartOptions;
  };
};
