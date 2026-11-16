'use client';

interface ChartDataPoint {
  timestamp: string;
  volume: number;
  mints: number;
}

interface MiniChartProps {
  chartData?: ChartDataPoint[];
  width?: number;
  height?: number;
}

export function MiniChart({ chartData = [], width = 67, height = 20 }: MiniChartProps) {
  if (!chartData || chartData.length === 0) {
    return (
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
        <line x1="0" y1={height / 2} x2={width} y2={height / 2} stroke="#6A7282" strokeWidth="1" />
      </svg>
    );
  }

  // Calculate min and max for scaling - using mints instead of volume
  const mints = chartData.map(d => d.mints);
  const maxMints = Math.max(...mints);
  const minMints = Math.min(...mints);
  const range = maxMints - minMints || 1;

  // Generate path for the line chart
  const points = chartData.map((d, i) => {
    const x = (i / (chartData.length - 1)) * width;
    const y = height - ((d.mints - minMints) / range) * height;
    return `${x},${y}`;
  });

  const pathD = `M ${points.join(' L ')}`;

  // Determine if trend is positive
  // Compare first value with last value for more accurate trend
  const firstValue = chartData[0].mints;
  const lastValue = chartData[chartData.length - 1].mints;
  const isPositive = lastValue >= firstValue;

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <path
        d={pathD}
        fill="none"
        stroke={isPositive ? '#05DF72' : '#F87683'}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
