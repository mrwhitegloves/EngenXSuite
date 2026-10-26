import { useEffect, useRef, useState } from 'react';
import { formatNumber, pointLabel } from '../format.js';

// Small charts of the Website screen, drawn as SVG with the design tokens (no chart library).
// Colours come from Tailwind classes (fill-brand, stroke-info …), so light and dark mode work.

// The width of a box, following window resizes.
function useWidth() {
  const ref = useRef(null);
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const element = ref.current;
    if (!element) return undefined;
    const observer = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  return [ref, width];
}

// A round top for the y axis: 7 → 10, 23 → 25, 140 → 150.
function niceMax(value) {
  if (value <= 4) return 4;
  const power = 10 ** Math.floor(Math.log10(value));
  const step = [1, 2, 2.5, 5, 10].find((factor) => factor * power >= value / 4) * power;
  return Math.ceil(value / step) * step;
}

const HEIGHT = 260;
const PAD = { top: 12, right: 12, bottom: 28, left: 40 };

/**
 * Pageviews (filled area) and unique visitors (dashed line) over time, with a hover box.
 * @param {{ points: { date: string, views: number, visitors: number }[], unit: 'day' | 'month' }} props
 */
export function TrafficChart({ points, unit }) {
  const [ref, width] = useWidth();
  const [hover, setHover] = useState(null);
  const top = niceMax(Math.max(1, ...points.map((point) => point.views)));
  const innerWidth = Math.max(0, width - PAD.left - PAD.right);
  const innerHeight = HEIGHT - PAD.top - PAD.bottom;
  const x = (index) =>
    PAD.left + (points.length > 1 ? (index / (points.length - 1)) * innerWidth : innerWidth / 2);
  const y = (value) => PAD.top + innerHeight - (value / top) * innerHeight;
  const line = (key) =>
    points.map((point, index) => `${index ? 'L' : 'M'}${x(index)},${y(point[key])}`).join(' ');
  const area = points.length
    ? `${line('views')} L${x(points.length - 1)},${y(0)} L${x(0)},${y(0)} Z`
    : '';
  const ticks = [0, top / 4, top / 2, (top * 3) / 4, top];
  const labelEvery = Math.max(
    1,
    Math.ceil(points.length / Math.max(2, Math.floor(innerWidth / 70))),
  );
  const hovered = hover === null ? null : points[hover];

  return (
    <div ref={ref} className="relative w-full" style={{ height: HEIGHT }}>
      {width > 0 && (
        <svg
          width={width}
          height={HEIGHT}
          role="img"
          aria-label={`Pageviews and unique visitors, ${points.length} ${unit === 'month' ? 'months' : 'days'}`}
          onMouseLeave={() => setHover(null)}
          onMouseMove={(event) => {
            const box = event.currentTarget.getBoundingClientRect();
            const position = event.clientX - box.left - PAD.left;
            const index = Math.round((position / Math.max(1, innerWidth)) * (points.length - 1));
            setHover(Math.min(points.length - 1, Math.max(0, index)));
          }}
        >
          {ticks.map((tick) => (
            <g key={tick}>
              <line
                x1={PAD.left}
                x2={width - PAD.right}
                y1={y(tick)}
                y2={y(tick)}
                className="stroke-border"
                strokeDasharray="3 3"
              />
              <text
                x={PAD.left - 6}
                y={y(tick) + 3}
                textAnchor="end"
                className="fill-text-muted text-[10px]"
              >
                {formatNumber(tick)}
              </text>
            </g>
          ))}
          {points.map((point, index) =>
            index % labelEvery === 0 || index === points.length - 1 ? (
              <text
                key={point.date}
                x={x(index)}
                y={HEIGHT - 8}
                textAnchor={
                  points.length > 1 && index === points.length - 1
                    ? 'end'
                    : points.length > 1 && index === 0
                      ? 'start'
                      : 'middle'
                }
                className="fill-text-muted text-[10px]"
              >
                {pointLabel(point.date, unit)}
              </text>
            ) : null,
          )}
          <path d={area} className="fill-brand/15" />
          <path d={line('views')} className="fill-none stroke-brand" strokeWidth={2} />
          <path
            d={line('visitors')}
            className="fill-none stroke-info"
            strokeWidth={1.5}
            strokeDasharray="4 4"
          />
          {hovered && (
            <g>
              <line
                x1={x(hover)}
                x2={x(hover)}
                y1={PAD.top}
                y2={y(0)}
                className="stroke-text-muted"
                strokeWidth={1}
              />
              <circle cx={x(hover)} cy={y(hovered.views)} r={4} className="fill-brand" />
              <circle cx={x(hover)} cy={y(hovered.visitors)} r={3.5} className="fill-info" />
            </g>
          )}
        </svg>
      )}
      {hovered && (
        <div
          className="pointer-events-none absolute top-2 rounded-md border border-border bg-surface px-2.5 py-1.5 text-xs shadow-md"
          style={x(hover) > width / 2 ? { right: width - x(hover) + 10 } : { left: x(hover) + 10 }}
        >
          <p className="font-semibold">{pointLabel(hovered.date, unit)}</p>
          <p className="text-brand-text">Pageviews: {formatNumber(hovered.views)}</p>
          <p className="text-info">Unique visitors: {formatNumber(hovered.visitors)}</p>
        </div>
      )}
    </div>
  );
}

/** The legend of the traffic chart. */
export function TrafficLegend() {
  return (
    <div className="flex flex-wrap items-center gap-4 text-xs text-text-muted">
      <span className="flex items-center gap-1.5">
        <span className="h-2.5 w-4 rounded-sm bg-brand" aria-hidden="true" />
        Pageviews
      </span>
      <span className="flex items-center gap-1.5">
        <span className="h-0 w-4 border-t-2 border-dashed border-info" aria-hidden="true" />
        Unique visitors
      </span>
    </div>
  );
}

/**
 * Horizontal bars: the most visited pages.
 * @param {{ rows: { label: string, value: number }[], max?: number }} props
 */
export function BarList({ rows }) {
  const max = Math.max(1, ...rows.map((row) => row.value));
  return (
    <ul className="space-y-2">
      {rows.map((row) => (
        <li
          key={row.label}
          className="grid grid-cols-[minmax(0,9rem)_minmax(0,1fr)_3rem] items-center gap-2 text-xs"
        >
          <span className="truncate font-mono" title={row.label}>
            {row.label}
          </span>
          <span className="h-3 overflow-hidden rounded-full bg-page">
            <span
              className="block h-full rounded-full bg-brand"
              style={{ width: `${(row.value / max) * 100}%` }}
            />
          </span>
          <span className="text-right text-text-muted">{formatNumber(row.value)}</span>
        </li>
      ))}
    </ul>
  );
}

// Slices of the donut, by order: brand, then status colours (allowed for charts).
export const SLICE_FILL = [
  'fill-brand',
  'fill-info',
  'fill-warning',
  'fill-success',
  'fill-text-muted',
];
export const SLICE_BG = ['bg-brand', 'bg-info', 'bg-warning', 'bg-success', 'bg-text-muted'];

/**
 * A donut of shares (devices).
 * @param {{ slices: { label: string, value: number }[], label: string }} props
 */
export function DonutChart({ slices, label }) {
  const total = slices.reduce((sum, slice) => sum + slice.value, 0);
  const size = 160;
  const outer = 70;
  const inner = 48;
  const center = size / 2;
  const point = (radius, angle) => [
    center + radius * Math.cos(angle - Math.PI / 2),
    center + radius * Math.sin(angle - Math.PI / 2),
  ];
  let start = 0;
  const paths = slices.map((slice, index) => {
    const sweep = total > 0 ? (slice.value / total) * Math.PI * 2 : 0;
    // A single full slice is drawn as two halves (an arc cannot start and end at the same point).
    const end = start + Math.min(sweep, Math.PI * 2 - 0.0001);
    const large = end - start > Math.PI ? 1 : 0;
    const [x1, y1] = point(outer, start);
    const [x2, y2] = point(outer, end);
    const [x3, y3] = point(inner, end);
    const [x4, y4] = point(inner, start);
    const d = `M${x1},${y1} A${outer},${outer} 0 ${large} 1 ${x2},${y2} L${x3},${y3} A${inner},${inner} 0 ${large} 0 ${x4},${y4} Z`;
    start += sweep;
    return <path key={slice.label} d={d} className={SLICE_FILL[index % SLICE_FILL.length]} />;
  });
  return (
    <svg width={size} height={size} role="img" aria-label={label} className="shrink-0">
      {total > 0 ? paths : <circle cx={center} cy={center} r={outer} className="fill-page" />}
      <text
        x={center}
        y={center + 4}
        textAnchor="middle"
        className="fill-text text-sm font-semibold"
      >
        {formatNumber(total)}
      </text>
    </svg>
  );
}
