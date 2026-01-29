'use client';

import { useState } from 'react';
import { TrustFactors } from '@/lib/trust-calculator';

interface TrustSpiderChartProps {
  factors: TrustFactors;
  size?: number;
  showLabels?: boolean;
  showTooltips?: boolean;
  thresholdLine?: number; // 0-1 scale, optional threshold line
  className?: string;
}

// Factor configuration
const factorConfig: { key: keyof TrustFactors; label: string; shortLabel: string }[] = [
  { key: 'documentation', label: 'Documentation', shortLabel: 'Doc' },
  { key: 'governance', label: 'Governance', shortLabel: 'Gov' },
  { key: 'quality', label: 'Quality', shortLabel: 'Qual' },
  { key: 'usage', label: 'Usage', shortLabel: 'Use' },
  { key: 'reliability', label: 'Reliability', shortLabel: 'Rel' },
  { key: 'freshness', label: 'Freshness', shortLabel: 'Fresh' },
];

export function TrustSpiderChart({
  factors,
  size = 200,
  showLabels = true,
  showTooltips = true,
  thresholdLine,
  className = '',
}: TrustSpiderChartProps) {
  const [hoveredFactor, setHoveredFactor] = useState<keyof TrustFactors | null>(null);

  const centerX = size / 2;
  const centerY = size / 2;
  const radius = (size / 2) * 0.7; // 70% of half the size for the chart
  const labelRadius = (size / 2) * 0.92; // Position labels outside

  // Calculate point positions for each factor
  const angleStep = (2 * Math.PI) / factorConfig.length;
  const startAngle = -Math.PI / 2; // Start from top

  const getPoint = (index: number, value: number): { x: number; y: number } => {
    const angle = startAngle + index * angleStep;
    return {
      x: centerX + Math.cos(angle) * radius * value,
      y: centerY + Math.sin(angle) * radius * value,
    };
  };

  const getLabelPoint = (index: number): { x: number; y: number } => {
    const angle = startAngle + index * angleStep;
    return {
      x: centerX + Math.cos(angle) * labelRadius,
      y: centerY + Math.sin(angle) * labelRadius,
    };
  };

  // Generate polygon points for the data
  const dataPoints = factorConfig.map((factor, i) => {
    const value = factors[factor.key] || 0;
    return getPoint(i, value);
  });

  const dataPolygonPoints = dataPoints.map((p) => `${p.x},${p.y}`).join(' ');

  // Generate threshold polygon if provided
  const thresholdPoints = thresholdLine
    ? factorConfig.map((_, i) => getPoint(i, thresholdLine)).map((p) => `${p.x},${p.y}`).join(' ')
    : null;

  // Generate grid lines (at 25%, 50%, 75%, 100%)
  const gridLevels = [0.25, 0.5, 0.75, 1];

  return (
    <div className={`relative ${className}`} style={{ width: size, height: size }}>
      <svg width={size} height={size} className="overflow-visible">
        {/* Background grid circles */}
        {gridLevels.map((level) => (
          <polygon
            key={`grid-${level}`}
            points={factorConfig.map((_, i) => {
              const p = getPoint(i, level);
              return `${p.x},${p.y}`;
            }).join(' ')}
            fill="none"
            stroke="currentColor"
            strokeWidth="1"
            className="text-gray-200 dark:text-gray-700"
          />
        ))}

        {/* Axis lines from center to each vertex */}
        {factorConfig.map((_, i) => {
          const endPoint = getPoint(i, 1);
          return (
            <line
              key={`axis-${i}`}
              x1={centerX}
              y1={centerY}
              x2={endPoint.x}
              y2={endPoint.y}
              stroke="currentColor"
              strokeWidth="1"
              className="text-gray-200 dark:text-gray-700"
            />
          );
        })}

        {/* Threshold line polygon */}
        {thresholdPoints && (
          <polygon
            points={thresholdPoints}
            fill="none"
            stroke="rgba(156, 163, 175, 0.6)"
            strokeWidth="2"
            strokeDasharray="4 4"
          />
        )}

        {/* Data polygon fill */}
        <polygon
          points={dataPolygonPoints}
          fill="rgba(147, 51, 234, 0.2)"
          stroke="rgba(147, 51, 234, 0.8)"
          strokeWidth="2"
          className="transition-all duration-300"
        />

        {/* Data points */}
        {dataPoints.map((point, i) => {
          const factor = factorConfig[i];
          const isHovered = hoveredFactor === factor.key;
          return (
            <circle
              key={`point-${i}`}
              cx={point.x}
              cy={point.y}
              r={isHovered ? 6 : 4}
              fill={isHovered ? '#7c3aed' : '#9333ea'}
              stroke="white"
              strokeWidth="2"
              className="cursor-pointer transition-all duration-200"
              onMouseEnter={() => setHoveredFactor(factor.key)}
              onMouseLeave={() => setHoveredFactor(null)}
            />
          );
        })}

        {/* Labels */}
        {showLabels &&
          factorConfig.map((factor, i) => {
            const labelPoint = getLabelPoint(i);
            const value = Math.round((factors[factor.key] || 0) * 100);

            // Determine text anchor based on position
            let textAnchor: 'start' | 'middle' | 'end' = 'middle';
            if (labelPoint.x < centerX - 10) textAnchor = 'end';
            else if (labelPoint.x > centerX + 10) textAnchor = 'start';

            // Adjust y position for top/bottom labels
            const yOffset = labelPoint.y < centerY - 10 ? -4 : labelPoint.y > centerY + 10 ? 12 : 4;

            return (
              <g key={`label-${i}`}>
                <text
                  x={labelPoint.x}
                  y={labelPoint.y + yOffset}
                  textAnchor={textAnchor}
                  className="text-xs font-medium fill-gray-600 dark:fill-gray-400"
                >
                  {size < 180 ? factor.shortLabel : factor.label}
                </text>
                <text
                  x={labelPoint.x}
                  y={labelPoint.y + yOffset + 12}
                  textAnchor={textAnchor}
                  className="text-xs font-semibold fill-gray-900 dark:fill-white"
                >
                  {value}%
                </text>
              </g>
            );
          })}
      </svg>

      {/* Tooltip */}
      {showTooltips && hoveredFactor && (
        <div
          className="absolute z-10 px-3 py-2 text-sm bg-gray-900 text-white rounded-lg shadow-lg pointer-events-none"
          style={{
            left: '50%',
            top: '50%',
            transform: 'translate(-50%, -50%)',
          }}
        >
          <div className="font-medium">
            {factorConfig.find((f) => f.key === hoveredFactor)?.label}
          </div>
          <div className="text-purple-300">
            {Math.round((factors[hoveredFactor] || 0) * 100)}%
          </div>
        </div>
      )}
    </div>
  );
}

// Mini version for compact displays
export function TrustSpiderChartMini({
  factors,
  size = 80,
  className = '',
}: {
  factors: TrustFactors;
  size?: number;
  className?: string;
}) {
  return (
    <TrustSpiderChart
      factors={factors}
      size={size}
      showLabels={false}
      showTooltips={false}
      className={className}
    />
  );
}
