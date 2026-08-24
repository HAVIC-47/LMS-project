import { cn } from '@/lib/cn';
import { LEVEL_LABELS, type CourseLevel } from '@/lib/types';

/** One container width for the whole product. Mixing max-widths is what makes pages drift. */
export function Container({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return <div className={cn('mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8', className)}>{children}</div>;
}

/**
 * Small status chip.
 *
 * `tone` maps to meaning, not decoration: `accent` is brand, `success` means a thing is
 * finished, `danger` means it failed. There is no "make it green because green is nice".
 */
export function Badge({
  tone = 'neutral',
  className,
  children,
}: {
  tone?: 'neutral' | 'accent' | 'success' | 'danger';
  className?: string;
  children: React.ReactNode;
}) {
  const tones = {
    neutral: 'bg-shell text-text-muted border-line',
    accent: 'bg-accent-soft text-accent border-accent/25',
    success: 'bg-success-soft text-success border-success/25',
    danger: 'bg-danger-soft text-danger border-danger/25',
  } as const;

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-pill border px-2.5 py-1 text-xs font-medium',
        tones[tone],
        className
      )}
    >
      {children}
    </span>
  );
}

export function LevelBadge({ level }: { level: CourseLevel }) {
  return <Badge tone="neutral">{LEVEL_LABELS[level]}</Badge>;
}

/**
 * Section heading.
 *
 * There is no eyebrow slot by design. An uppercase micro-label above every heading is the
 * single most recognisable machine-generated rhythm, and the headline alone carries the
 * section perfectly well.
 */
export function SectionHeading({
  title,
  lede,
  className,
  align = 'left',
}: {
  title: string;
  lede?: string;
  className?: string;
  align?: 'left' | 'center';
}) {
  return (
    <div className={cn('flex flex-col gap-4', align === 'center' && 'items-center text-center', className)}>
      <h2 className="display-tight max-w-[20ch] text-3xl font-semibold sm:text-4xl lg:text-5xl">
        {title}
      </h2>
      {lede ? <p className="max-w-[58ch] text-lg text-text-muted">{lede}</p> : null}
    </div>
  );
}

/**
 * Progress bar.
 *
 * No filled background track behind a partial fill: the empty portion is a hairline rail,
 * so the eye reads the filled length rather than the ratio of two greys.
 */
export function ProgressRail({
  value,
  label,
  className,
}: {
  value: number;
  label?: string;
  className?: string;
}) {
  const clamped = Math.max(0, Math.min(100, Math.round(value)));

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      {label ? (
        <div className="flex items-baseline justify-between text-sm">
          <span className="text-text-muted">{label}</span>
          <span className="font-mono text-xs tabular-nums text-text">{clamped}%</span>
        </div>
      ) : null}

      <div
        role="progressbar"
        aria-valuenow={clamped}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label ?? 'Progress'}
        className="h-1.5 w-full overflow-hidden rounded-pill bg-line"
      >
        <div
          className="h-full rounded-pill bg-accent transition-[width] duration-700 [transition-timing-function:var(--ease-settle)]"
          style={{ width: `${clamped}%` }}
        />
      </div>
    </div>
  );
}

/**
 * Nested enclosure. Only worth reaching for where elevation means something - a course
 * card you can open, the hero panel. Everywhere else, spacing and a hairline do the job
 * with less visual noise.
 */
export function Enclosure({
  className,
  innerClassName,
  children,
}: {
  className?: string;
  innerClassName?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn('enclosure', className)}>
      <div className={cn('enclosure-core h-full', innerClassName)}>{children}</div>
    </div>
  );
}

/** Empty state. Always says what to do next, never just "nothing here". */
export function EmptyState({
  title,
  description,
  action,
  icon,
}: {
  title: string;
  description: string;
  action?: React.ReactNode;
  icon?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-4 rounded-card border border-dashed border-line-strong bg-surface px-6 py-16 text-center">
      {icon ? <div className="text-text-subtle">{icon}</div> : null}
      <div className="flex flex-col gap-2">
        <h3 className="text-lg font-semibold text-text">{title}</h3>
        <p className="mx-auto max-w-[46ch] text-text-muted">{description}</p>
      </div>
      {action}
    </div>
  );
}

/** Skeleton that matches the shape of what is loading, not a spinner in the middle. */
export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('animate-pulse rounded-input bg-line', className)} />;
}
