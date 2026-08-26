'use client';

import { useEffect, useRef, useState } from 'react';
import { ArrowsInSimpleIcon, ArrowsOutSimpleIcon } from '@phosphor-icons/react';
import { cn } from '@/lib/cn';

/**
 * A list that scrolls inside itself instead of growing the page.
 *
 * The admin panel has two lists that grow without limit — every account that has ever
 * signed up, and every privileged action ever taken. Left in normal flow they push the page
 * to whatever length the database happens to be, which makes the panel unusable exactly when
 * it matters most: on a busy platform, where the sections below are unreachable without
 * scrolling past a thousand rows.
 *
 * Capping the height keeps the panel a fixed shape whatever the data does. The expander
 * raises the cap rather than removing it — even expanded this scrolls internally, because
 * the point is that the *page* never inherits the length of a table.
 *
 * The button appears only when there is something to expand into. Measured rather than
 * counted: this component holds server-rendered children and has no idea how many rows are
 * inside them, and a row count would be wrong anyway once rows wrap at narrow widths.
 */
export function ScrollSection({
  children,
  label,
  collapsedClass = 'max-h-[28rem]',
  expandedClass = 'max-h-[80vh]',
}: {
  children: React.ReactNode;
  /** Named in the button's accessible label, so two on one page are distinguishable. */
  label: string;
  collapsedClass?: string;
  expandedClass?: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const [overflows, setOverflows] = useState(false);
  const [atEnd, setAtEnd] = useState(false);
  const scroller = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = scroller.current;
    if (!element) return;

    const measure = () => {
      // A pixel of slack: sub-pixel layout rounding otherwise reports a one-pixel overflow
      // on content that fits, and the button would appear with nothing to reveal.
      setOverflows(element.scrollHeight - element.clientHeight > 1);
      setAtEnd(element.scrollTop + element.clientHeight >= element.scrollHeight - 1);
    };

    measure();

    // Rows reflow when the window narrows and when a filter changes what is inside, so the
    // measurement has to follow the content rather than run once on mount.
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    for (const child of Array.from(element.children)) observer.observe(child);

    element.addEventListener('scroll', measure, { passive: true });

    return () => {
      observer.disconnect();
      element.removeEventListener('scroll', measure);
    };
  }, [children, expanded]);

  return (
    <div className="flex flex-col gap-3">
      <div className="relative">
        <div
          ref={scroller}
          // `overscroll-contain` stops a flick at the bottom of the list carrying on into
          // the page behind it, which on a trackpad reads as the panel jumping.
          className={cn(
            // `relative` is load-bearing, not decoration. `overflow` does not clip an
            // absolutely-positioned descendant whose containing block sits outside the
            // scroller — and every row's `sr-only` label is absolutely positioned. Left
            // static, those labels escaped the clip and stretched the document to the full
            // height of the list, which is the exact thing this component exists to prevent:
            // the list looked capped while the page still scrolled for thousands of pixels.
            'relative overflow-y-auto overscroll-contain rounded-card',
            'motion-safe:transition-[max-height] motion-safe:duration-300 motion-safe:ease-[var(--ease-settle)]',
            expanded ? expandedClass : collapsedClass
          )}
        >
          {children}
        </div>

        {/* A fade at the cut, so a list that continues below the fold looks continued
            rather than truncated. Removed at the end of the scroll, where there is nothing
            more to hint at, and pointer-events-none so it never eats a click on a row. */}
        {overflows && !atEnd ? (
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 bottom-0 h-12 rounded-b-card bg-gradient-to-t from-page to-transparent"
          />
        ) : null}
      </div>

      {overflows || expanded ? (
        <button
          type="button"
          onClick={() => setExpanded((open) => !open)}
          aria-expanded={expanded}
          className={cn(
            'flex w-fit cursor-pointer items-center gap-2 rounded-control border border-line px-3.5 py-2',
            'text-sm text-text-muted transition-colors duration-200',
            'hover:border-line-strong hover:text-text'
          )}
        >
          {expanded ? (
            <ArrowsInSimpleIcon size={14} aria-hidden />
          ) : (
            <ArrowsOutSimpleIcon size={14} aria-hidden />
          )}
          {expanded ? 'Collapse' : 'Expand'}
          <span className="sr-only"> {label}</span>
        </button>
      ) : null}
    </div>
  );
}
