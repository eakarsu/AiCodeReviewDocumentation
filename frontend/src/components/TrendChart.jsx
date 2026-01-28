// TrendChart Component - Simple line/bar chart for trends
import { useMemo } from 'react';

function TrendChart({ data, dataKey, label, color = '#3b82f6', type = 'line', height = 200 }) {
  const chartData = useMemo(() => {
    if (!data || data.length === 0) return { points: [], max: 0, min: 0 };

    const values = data.map(d => d[dataKey] || 0);
    const max = Math.max(...values, 1);
    const min = Math.min(...values, 0);

    return { values, max, min };
  }, [data, dataKey]);

  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-gray-400 dark:text-gray-500">
        No data available
      </div>
    );
  }

  const width = 100;
  const padding = 5;
  const chartWidth = width - padding * 2;
  const chartHeight = height - 40;
  const barWidth = chartWidth / data.length;

  const getY = (value) => {
    const range = chartData.max - chartData.min || 1;
    return chartHeight - ((value - chartData.min) / range) * (chartHeight - 20) - 10;
  };

  const points = data.map((d, i) => ({
    x: padding + (i + 0.5) * barWidth,
    y: getY(d[dataKey] || 0),
    value: d[dataKey] || 0,
    label: d.date || d.name || i
  }));

  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');

  return (
    <div className="relative">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full"
        style={{ height }}
        preserveAspectRatio="none"
      >
        {/* Grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => (
          <line
            key={i}
            x1={padding}
            y1={10 + (chartHeight - 20) * (1 - ratio)}
            x2={width - padding}
            y2={10 + (chartHeight - 20) * (1 - ratio)}
            stroke="currentColor"
            className="text-gray-200 dark:text-gray-700"
            strokeWidth="0.5"
          />
        ))}

        {type === 'bar' ? (
          // Bar chart
          points.map((p, i) => (
            <g key={i}>
              <rect
                x={p.x - barWidth * 0.3}
                y={p.y}
                width={barWidth * 0.6}
                height={chartHeight - p.y - 10}
                fill={color}
                opacity="0.8"
                rx="1"
              />
            </g>
          ))
        ) : (
          // Line chart
          <>
            {/* Area under line */}
            <path
              d={`${linePath} L ${points[points.length - 1].x} ${chartHeight - 10} L ${points[0].x} ${chartHeight - 10} Z`}
              fill={color}
              opacity="0.1"
            />
            {/* Line */}
            <path
              d={linePath}
              fill="none"
              stroke={color}
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {/* Points */}
            {points.map((p, i) => (
              <circle
                key={i}
                cx={p.x}
                cy={p.y}
                r="2"
                fill={color}
              />
            ))}
          </>
        )}

        {/* X-axis labels (show first, middle, last) */}
        {[0, Math.floor(points.length / 2), points.length - 1].map(i => {
          const p = points[i];
          if (!p) return null;
          return (
            <text
              key={i}
              x={p.x}
              y={height - 5}
              textAnchor="middle"
              className="text-[6px] fill-gray-500 dark:fill-gray-400"
            >
              {typeof p.label === 'string' ? p.label.slice(5) : p.label}
            </text>
          );
        })}

        {/* Y-axis label */}
        <text
          x={padding}
          y={8}
          className="text-[6px] fill-gray-500 dark:fill-gray-400"
        >
          {chartData.max}
        </text>
      </svg>

      {/* Legend */}
      <div className="flex items-center justify-center gap-2 mt-2">
        <div className="w-3 h-3 rounded" style={{ backgroundColor: color }} />
        <span className="text-xs text-gray-500 dark:text-gray-400">{label}</span>
      </div>
    </div>
  );
}

export default TrendChart;
