import { cn } from '@/lib/cn';
import { LEVEL_LABELS, type CourseLevel } from '@/lib/types';

/** One container width for the whole product. Mixed max-widths are what make pages drift. */
export function Container({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return <div className={cn('mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8', className)}>{children}</div>;
}

/**
 * A bounded surface.
 *
 * On paper a panel is defined by its rule, not by elevation. There is no shadow and no
 * inset highlight: an editorial page separates blocks with hairlines and margin, and a
 * floating card would read as a widget dropped onto the page.
 */
export function Panel({
  className,
  children,
  as: Tag = 'div',
}: {
  className?: string;
  children: React.ReactNode;
  as?: 'div' | 'article' | 'section' | 'aside';
}) {
  return (
    <Tag className={cn('rounded-card border border-line bg-surface-raised', className)}>
      {children}
    </Tag>
  );
}

/**
 * Status chip. `tone` carries meaning, never decoration: `accent` is brand, `success`
 * means finished, `danger` means failed.
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
    neutral: 'border-line bg-shell text-text-muted',
    accent: 'border-accent/30 bg-accent-soft text-accent-text',
    success: 'border-success/30 bg-success-soft text-success',
    danger: 'border-danger/30 bg-danger-soft text-danger',
  } as const;

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-control border px-2.5 py-1 text-xs font-medium',
        tones[tone],
        className
      )}
    >
      {children}
    </span>
  );
}

export function LevelBadge({ level }: { level: CourseLevel }) {
  return (
    <span className="microlabel border-l border-line pl-2 text-text-subtle">
      {LEVEL_LABELS[level]}
    </span>
  );
}

/**
 * Section heading.
 *
 * No eyebrow slot. A small uppercase label above every section heading is the most
 * recognisable machine-generated rhythm there is, and the headline carries the section on
 * its own.
 */
export function SectionHeading({
  title,
  lede,
  className,
  align = 'left',
  as: Heading = 'h2',
}: {
  title: string;
  lede?: string;
  className?: string;
  align?: 'left' | 'center';
  /**
   * `h2` by default because this is usually a section within a page. Pages whose title
   * IS this heading pass `as="h1"`: a document with no h1 gives screen-reader users no
   * anchor for what the page is.
   */
  as?: 'h1' | 'h2';
}) {
  return (
    <div
      className={cn('flex flex-col gap-4', align === 'center' && 'items-center text-center', className)}
    >
      <Heading className="display-tight max-w-[20ch] font-serif text-[2rem] font-normal sm:text-[2.5rem] lg:text-[3rem]">
        {title}
      </Heading>
      {lede ? <p className="max-w-[56ch] text-lg text-text-muted">{lede}</p> : null}
    </div>
  );
}

/**
 * Progress rail.
 *
 * The unfilled portion is a hairline track, not a filled grey bar: the eye should read the
 * length of the accent, not the ratio between two greys.
 */
export function ProgressRail({
  value,
  label,
  className,
  size = 'md',
}: {
  value: number;
  label?: string;
  className?: string;
  size?: 'sm' | 'md';
}) {
  const clamped = Math.max(0, Math.min(100, Math.round(value)));
  const complete = clamped === 100;

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      {label ? (
        <div className="flex items-baseline justify-between gap-3">
          <span className="microlabel">{label}</span>
          <span className="font-mono text-xs tabular-nums text-text">{clamped}%</span>
        </div>
      ) : null}

      <div
        role="progressbar"
        aria-valuenow={clamped}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label ?? 'Progress'}
        className={cn('w-full overflow-hidden rounded-control bg-line', size === 'sm' ? 'h-1' : 'h-1.5')}
      >
        <div
          className={cn(
            'h-full rounded-control transition-[width] duration-700 [transition-timing-function:var(--ease-settle)]',
            complete ? 'bg-success' : 'bg-accent'
          )}
          style={{ width: `${clamped}%` }}
        />
      </div>
    </div>
  );
}

/**
 * Figure with a mono numeral. The instrument-panel note that gives the interface its
 * character, used for real data only.
 */
export function Stat({
  value,
  label,
  className,
}: {
  value: string | number;
  label: string;
  className?: string;
}) {
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <span className="font-mono text-3xl tabular-nums text-text sm:text-4xl">{value}</span>
      <span className="microlabel">{label}</span>
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

/** Skeleton shaped like the thing that is loading, so nothing shifts when it arrives. */
export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('animate-pulse rounded-input bg-line', className)} />;
}
