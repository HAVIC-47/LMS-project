'use client';

import { useEffect, useRef, useState } from 'react';
import { CheckIcon } from '@phosphor-icons/react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Container } from '@/components/ui/primitives';
import { cn } from '@/lib/cn';

gsap.registerPlugin(ScrollTrigger);

/**
 * "Built around finishing, not starting."
 *
 * The photograph that used to sit here was decoration: it showed a desk, and the claim
 * being made is about how progress is counted. This draws the claim instead — the three
 * stages as an infographic that assembles itself, so the picture and the copy say the
 * same thing.
 *
 * The list and the figure are one component rather than two because they are wired to
 * each other: pointing at a step highlights its station and vice versa. Splitting them
 * would mean lifting that state into the page for no benefit.
 *
 * All of it is GSAP, deliberately — the `Reveal` wrapper used elsewhere is Motion, and
 * running both engines over the same subtree means two rAF loops fighting over the same
 * transforms.
 */

const STEPS = [
  {
    n: '01',
    title: 'Enroll',
    body: 'Lessons unlock in the order the instructor set them.',
  },
  {
    n: '02',
    title: 'Work through it',
    body: 'Mark a lesson done and the percentage is recomputed on the server from what you actually finished.',
  },
  {
    n: '03',
    title: 'Sit the quiz',
    body: 'Graded the moment you submit. Your score is stored and readable later.',
  },
];

const SLOTS = [0, 1, 2, 3, 4];
const OPTIONS = ['Every lesson marked complete', 'The lessons you opened', 'Time spent on the page'];

export function FinishingSection() {
  const rootRef = useRef<HTMLElement>(null);
  const [active, setActive] = useState<number | null>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const ctx = gsap.context(() => {
      const media = gsap.matchMedia();
      const q = gsap.utils.selector(root);

      // Reduced motion still gets the finished diagram, just not the assembly. The figure
      // is information, so hiding it would remove content rather than remove an effect.
      media.add('(prefers-reduced-motion: reduce)', () => {
        gsap.set(q('[data-rail]'), { scaleY: 1 });
        gsap.set(q('[data-dot], [data-panel], [data-step]'), { opacity: 1, y: 0, scale: 1 });
        gsap.set(q('[data-slot-fill]'), { scaleX: 1 });
        gsap.set(q('[data-option]'), { opacity: 1, x: 0 });
        gsap.set(q('[data-check], [data-score]'), { opacity: 1, scale: 1 });
        const counter = root.querySelector('[data-counter]');
        if (counter) counter.textContent = '100';
      });

      media.add('(prefers-reduced-motion: no-preference)', () => {
        const percent = { value: 0 };
        const counter = root.querySelector('[data-counter]');

        const tl = gsap.timeline({
          defaults: { ease: 'power3.out' },
          scrollTrigger: {
            trigger: root,
            // Fires when the section is comfortably in view rather than at the first
            // pixel, so the assembly is not already finished by the time it is readable.
            start: 'top 68%',
            once: true,
          },
        });

        tl
          // The copy comes in first: the diagram illustrates the claim, so it should not
          // arrive before the claim has been made.
          .fromTo(
            q('[data-step]'),
            { opacity: 0, y: 18 },
            { opacity: 1, y: 0, duration: 0.7, stagger: 0.09 }
          )
          // The rail drawing downward is what turns three panels into a sequence.
          .fromTo(q('[data-rail]'), { scaleY: 0 }, { scaleY: 1, duration: 0.9 }, 0.2)
          .fromTo(
            q('[data-dot]'),
            { scale: 0, opacity: 0 },
            { scale: 1, opacity: 1, duration: 0.5, stagger: 0.28, ease: 'back.out(2)' },
            0.35
          )
          .fromTo(
            q('[data-panel]'),
            { opacity: 0, x: 14 },
            { opacity: 1, x: 0, duration: 0.6, stagger: 0.28 },
            0.42
          )

          // 01 — one slot fills: you are in, and only the first lesson is open.
          .fromTo(
            q('[data-station="0"] [data-slot-fill]'),
            { scaleX: 0 },
            { scaleX: 1, duration: 0.45 },
            0.8
          )

          // 02 — the rest fill in order while the number climbs with them. The counter is
          // tied to the same tween rather than run separately so the digits can never
          // disagree with the bars.
          .fromTo(
            q('[data-station="1"] [data-slot-fill]'),
            { scaleX: 0 },
            { scaleX: 1, duration: 0.4, stagger: 0.13 },
            1.15
          )
          .to(
            percent,
            {
              value: 100,
              duration: 0.4 + 0.13 * (SLOTS.length - 1),
              ease: 'none',
              onUpdate: () => {
                if (counter) counter.textContent = String(Math.round(percent.value));
              },
            },
            1.15
          )

          // 03 — the options settle, then the right one is marked and the score lands.
          .fromTo(
            q('[data-option]'),
            { opacity: 0, x: 10 },
            { opacity: 1, x: 0, duration: 0.4, stagger: 0.08 },
            1.75
          )
          .fromTo(
            q('[data-check]'),
            { scale: 0, opacity: 0 },
            { scale: 1, opacity: 1, duration: 0.4, ease: 'back.out(2.4)' },
            2.15
          )
          .fromTo(
            q('[data-score]'),
            { scale: 0.7, opacity: 0 },
            { scale: 1, opacity: 1, duration: 0.45, ease: 'back.out(2)' },
            2.25
          );
      });
    }, root);

    return () => ctx.revert();
  }, []);

  return (
    <section
      ref={rootRef}
      className="border-b border-line py-20 lg:py-28"
      onPointerLeave={() => setActive(null)}
    >
      <Container>
        <div className="grid items-start gap-14 lg:grid-cols-12 lg:gap-16">
          <div className="flex flex-col gap-10 lg:col-span-5">
            <h2
              data-step
              className="display-tight font-serif text-[2rem] font-normal sm:text-[2.5rem]"
            >
              Built around finishing, not starting.
            </h2>

            <dl className="flex flex-col">
              {STEPS.map((step, index) => (
                <div
                  key={step.n}
                  data-step
                  // Pointing at a step lights its station. Not a click target: there is
                  // nowhere to go, and making it look clickable would be a lie.
                  onPointerEnter={() => setActive(index)}
                  className={cn(
                    'flex gap-5 border-t border-line py-5 transition-colors duration-300 last:border-b',
                    '[transition-timing-function:var(--ease-settle)]',
                    active === index && 'border-line-strong'
                  )}
                >
                  <span
                    className={cn(
                      'font-mono text-xs tabular-nums transition-colors duration-300',
                      active === index ? 'text-accent-text' : 'text-text-subtle'
                    )}
                  >
                    {step.n}
                  </span>
                  <div className="flex flex-col gap-1.5">
                    <dt className="font-medium text-text">{step.title}</dt>
                    <dd className="text-sm leading-relaxed text-text-muted">{step.body}</dd>
                  </div>
                </div>
              ))}
            </dl>
          </div>

          <div className="relative lg:col-span-6 lg:col-start-7">
            {/* The rail sits behind the dots and is centred on them: 1.125rem is half of
                the 2.25rem dot, so it stays aligned whatever the panels do. */}
            <span
              aria-hidden
              data-rail
              className="absolute left-[1.125rem] top-3 bottom-3 w-px origin-top bg-line-strong"
            />

            <ul className="flex flex-col gap-4">
              {STEPS.map((step, index) => (
                <li
                  key={step.n}
                  data-station={index}
                  onPointerEnter={() => setActive(index)}
                  className="relative flex gap-4"
                >
                  <span
                    data-dot
                    className={cn(
                      'relative z-10 mt-3 flex size-9 shrink-0 items-center justify-center rounded-full',
                      'border font-mono text-[10px] tabular-nums transition-colors duration-300',
                      '[transition-timing-function:var(--ease-settle)]',
                      active === index
                        ? 'border-accent bg-accent text-accent-ink-on'
                        : 'border-line bg-surface-raised text-text-subtle'
                    )}
                  >
                    {step.n}
                  </span>

                  <div
                    data-panel
                    className={cn(
                      'flex-1 rounded-card border bg-surface-raised p-5 transition-[border-color,box-shadow,transform] duration-300',
                      '[transition-timing-function:var(--ease-settle)]',
                      active === index
                        ? 'border-line-strong shadow-[var(--shadow-lifted)] lg:-translate-y-0.5'
                        : 'border-line'
                    )}
                  >
                    {index === 0 ? <EnrollPanel /> : null}
                    {index === 1 ? <ProgressPanel /> : null}
                    {index === 2 ? <QuizPanel /> : null}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </Container>
    </section>
  );
}

/** A lesson slot: an outlined track with a fill that scales in from the left. */
function Slot({ filled }: { filled: boolean }) {
  return (
    <span className="relative h-1.5 flex-1 overflow-hidden rounded-full bg-shell">
      {filled ? (
        <span
          data-slot-fill
          className="absolute inset-0 origin-left rounded-full bg-accent"
        />
      ) : null}
    </span>
  );
}

/** 01 — enrolled, first lesson open, the rest still closed. */
function EnrollPanel() {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between gap-3">
        <span className="microlabel">Enrolled</span>
        <span className="font-mono text-[11px] tabular-nums text-text-subtle">
          1 / {SLOTS.length} open
        </span>
      </div>
      <div className="flex gap-1.5">
        {SLOTS.map((slot) => (
          <Slot key={slot} filled={slot === 0} />
        ))}
      </div>
    </div>
  );
}

/** 02 — every slot fills and the percentage climbs with them. */
function ProgressPanel() {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between gap-3">
        <span className="microlabel">Lessons complete</span>
        <span className="font-mono text-xl tabular-nums text-text">
          <span data-counter>0</span>
          <span className="text-sm text-text-subtle">%</span>
        </span>
      </div>
      <div className="flex gap-1.5">
        {SLOTS.map((slot) => (
          <Slot key={slot} filled />
        ))}
      </div>
    </div>
  );
}

/** 03 — options, the marked answer, the stored score. */
function QuizPanel() {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between gap-3">
        <span className="microlabel">Auto-graded</span>
        <span
          data-score
          className="rounded-control bg-accent px-2 py-0.5 font-mono text-[11px] tabular-nums text-accent-ink-on"
        >
          80%
        </span>
      </div>

      <p className="text-xs leading-relaxed text-text-muted">
        What does the progress bar count?
      </p>

      <ul className="flex flex-col gap-1.5">
        {OPTIONS.map((option, index) => (
          <li
            key={option}
            data-option
            className={cn(
              'flex items-center gap-2 rounded-control border px-2.5 py-1.5 text-xs',
              index === 0
                ? 'border-line-strong bg-accent-soft text-text'
                : 'border-line text-text-subtle'
            )}
          >
            <span
              className={cn(
                'flex size-4 shrink-0 items-center justify-center rounded-full border',
                index === 0 ? 'border-accent bg-accent' : 'border-line-strong'
              )}
            >
              {index === 0 ? (
                <CheckIcon
                  data-check
                  size={9}
                  weight="bold"
                  aria-hidden
                  className="text-accent-ink-on"
                />
              ) : null}
            </span>
            {option}
          </li>
        ))}
      </ul>
    </div>
  );
}
