import { cn } from '@/lib/cn';

/**
 * Charts, hand-drawn in SVG.
 *
 * No charting library. The three used here — a ring, a bar column, a sparkline — are a few
 * dozen lines each, while a library would add a large client bundle to pages that are
 * otherwise entirely server-rendered, and would then have to be re-themed anyway: every
 * one of them ships its own colour and type defaults, and this palette is four colours
 * with specific roles.
 *
 * Drawing them here means they are Server Components. Nothing below has state, so nothing
 * needs to reach the browser at all.
 *
 * Every chart is also readable without seeing it: values are exposed as text or as
 * `<title>`, because a chart that only exists visually is a chart a screen reader user
 * cannot read.
 */

/* ------------------------------------------------------------------ progress ring ---- */

export function Ring({
  value,
  label,
  caption,
  size = 132,
}: {
  /** 0–100. */
  value: number;
  label?: string;
  caption?: string;
  size?: number;
}) {
  const clamped = Math.max(0, Math.min(100, Math.round(value)));
  const stroke = size * 0.09;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;

  return (
    <figure className="flex flex-col items-center gap-3">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden>
          {/* Rotated so the arc starts at twelve o'clock rather than at three. */}
          <g transform={`rotate(-90 ${size / 2} ${size / 2})`}>
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke="var(--line)"
              strokeWidth={stroke}
            />
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke="var(--accent)"
              strokeWidth={stroke}
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={circumference * (1 - clamped / 100)}
            />
          </g>
        </svg>

        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-mono text-2xl tabular-nums text-text">{clamped}</span>
          <span className="text-xs text-text-subtle">%</span>
        </div>
      </div>

      {label ? (
        <figcaption className="flex flex-col items-center gap-0.5 text-center">
          <span className="text-sm font-medium text-text">{label}</span>
          {caption ? <span className="text-xs text-text-subtle">{caption}</span> : null}
        </figcaption>
      ) : null}
    </figure>
  );
}

/* --------------------------------------------------------------------- bar column ---- */

export type Bar = { label: string; value: number; hint?: string };

/**
 * Vertical bars on a shared baseline.
 *
 * Bars are `div`s rather than SVG rects so the labels sit in normal flow and wrap like
 * text — an SVG chart with long category names either clips them or needs manual rotation.
 */
export function BarChart({
  data,
  max,
  suffix = '',
  className,
  height = 132,
}: {
  data: Bar[];
  /** Fixed ceiling. Omit to scale to the tallest bar. */
  max?: number;
  suffix?: string;
  className?: string;
  height?: number;
}) {
  if (data.length === 0) return null;

  // A zero ceiling would divide by zero; an all-zero series should render a flat floor
  // rather than nothing at all, so the axis still communicates "measured, and empty".
  const ceiling = Math.max(max ?? Math.max(...data.map((bar) => bar.value)), 1);

  return (
    <div className={cn('flex flex-col gap-3', className)}>
      <div className="flex items-end gap-2" style={{ height }} role="list">
        {data.map((bar) => {
          const pct = Math.max(0, Math.min(100, (bar.value / ceiling) * 100));

          return (
            <div
              key={bar.label}
              role="listitem"
              aria-label={`${bar.label}: ${bar.value}${suffix}`}
              className="group flex h-full flex-1 flex-col justify-end gap-1.5"
            >
              <span className="text-center font-mono text-[11px] tabular-nums text-text-subtle">
                {bar.value}
                {suffix}
              </span>
              <div
                title={bar.hint ?? `${bar.label}: ${bar.value}${suffix}`}
                className="w-full rounded-t-[3px] bg-accent transition-opacity duration-300 [transition-timing-function:var(--ease-settle)] group-hover:opacity-80"
                // A bar of exactly 0 still gets a hairline, so an empty category reads as
                // "none" rather than as a missing column.
                style={{ height: `${Math.max(pct, 1.5)}%` }}
              />
            </div>
          );
        })}
      </div>

      <div className="flex gap-2 border-t border-line pt-2">
        {data.map((bar) => (
          <span
            key={bar.label}
            className="flex-1 truncate text-center text-[11px] text-text-subtle"
            title={bar.label}
          >
            {bar.label}
          </span>
        ))}
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------------- sparkline ---- */

/**
 * A line over an ordered series, with the area beneath it filled.
 *
 * `preserveAspectRatio="none"` lets one viewBox stretch to any container width, which is
 * what keeps this responsive without measuring anything. The stroke is drawn in a
 * non-scaling vector so it stays one weight however far the box is stretched.
 */
export function Sparkline({
  values,
  className,
  height = 96,
}: {
  values: number[];
  className?: string;
  height?: number;
}) {
  if (values.length === 0) return null;

  // A single point has no line to draw, so it is doubled into a flat one. Better than
  // rendering an empty box the reader has to interpret.
  const series = values.length === 1 ? [values[0], values[0]] : values;

  const top = Math.max(...series, 1);
  const width = 100;
  const step = width / (series.length - 1);

  const points = series.map((value, index) => {
    const x = index * step;
    const y = 100 - (value / top) * 100;
    return `${x.toFixed(2)},${y.toFixed(2)}`;
  });

  return (
    <svg
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      className={cn('w-full', className)}
      style={{ height }}
      role="img"
      aria-label={`Trend: ${series.join(', ')}`}
    >
      <polygon
        points={`0,100 ${points.join(' ')} 100,100`}
        fill="var(--accent)"
        opacity={0.14}
      />
      <polyline
        points={points.join(' ')}
        fill="none"
        stroke="var(--accent)"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

/* ------------------------------------------------------------------- stacked bar ----- */

export type Segment = { label: string; value: number; tone: 'accent' | 'muted' | 'faint' };

const TONES: Record<Segment['tone'], string> = {
  accent: 'var(--accent)',
  muted: 'var(--line-strong)',
  faint: 'var(--line)',
};

/**
 * One horizontal bar split into parts, for a distribution over a small set of categories —
 * finished / in progress / not started. A pie would need a legend to be read at all; this
 * carries its own.
 */
export function StackedBar({ segments, className }: { segments: Segment[]; className?: string }) {
  const total = segments.reduce((sum, segment) => sum + segment.value, 0);

  if (total === 0) {
    return (
      <div className={cn('flex flex-col gap-3', className)}>
        <div className="h-3 w-full rounded-full bg-line" />
        <p className="text-sm text-text-subtle">Nothing to show yet.</p>
      </div>
    );
  }

  return (
    <div className={cn('flex flex-col gap-3', className)}>
      <div className="flex h-3 w-full overflow-hidden rounded-full bg-line">
        {segments.map((segment) =>
          segment.value === 0 ? null : (
            <div
              key={segment.label}
              title={`${segment.label}: ${segment.value}`}
              style={{
                width: `${(segment.value / total) * 100}%`,
                background: TONES[segment.tone],
              }}
            />
          )
        )}
      </div>

      <dl className="flex flex-wrap gap-x-5 gap-y-2">
        {segments.map((segment) => (
          <div key={segment.label} className="flex items-center gap-2">
            <span
              aria-hidden
              className="size-2 rounded-full"
              style={{ background: TONES[segment.tone] }}
            />
            <dd className="font-mono text-sm tabular-nums text-text">{segment.value}</dd>
            <dt className="text-sm text-text-muted">{segment.label}</dt>
          </div>
        ))}
      </dl>
    </div>
  );
}

/* ------------------------------------------------------------------------- panel ----- */

/** A titled box, so every chart on a dashboard is framed the same way. */
export function ChartCard({
  title,
  caption,
  action,
  children,
  className,
}: {
  title: string;
  caption?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        'flex flex-col gap-5 rounded-card border border-line bg-surface-raised p-6',
        className
      )}
    >
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h3 className="font-medium text-text">{title}</h3>
          {caption ? <p className="text-sm text-text-muted">{caption}</p> : null}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}
