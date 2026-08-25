'use client';

import { Fragment, useEffect, useMemo, useRef } from 'react';
import Link from 'next/link';
import { ArrowRightIcon } from '@phosphor-icons/react';
import { gsap } from 'gsap';
import { Container } from '@/components/ui/primitives';

/**
 * Hero.
 *
 * No photograph. A stock picture of people at laptops says nothing about this product and
 * dates the page the moment the picture goes out of fashion, so the visual interest comes
 * from a generated field of marks instead — it costs no bytes, it inherits the theme, and
 * it is the same in every locale.
 *
 * The field carries two motions at once, which is the point of building it rather than
 * dropping in a static graphic:
 *
 *   automatic — a diagonal wave runs through it forever, so the section is alive before
 *               the pointer ever arrives and on touch devices where it never does;
 *   interactive — marks near the pointer lengthen, thicken and swing to face it, with a
 *               falloff, so moving across the hero pushes a bright lens through the field.
 *
 * The two are combined with `max` rather than added: adding them lets a wave crest under
 * the cursor blow past full brightness and flicker.
 *
 * Theme comes free. Every mark is `bg-current` inside a container that inherits `text`,
 * so bone marks on black and near-black marks on bone need no second code path.
 */

const HEADLINE = ['Learn', 'the', 'parts', 'that', 'stick.'];

const COLS = 18;
const ROWS = 11;

/** How far the pointer reaches, as a fraction of the shorter side of the section. */
const REACH = 0.42;

export function Hero() {
  const rootRef = useRef<HTMLElement>(null);
  const fieldRef = useRef<HTMLDivElement>(null);

  /** Normalised cell centres, computed once. Pixel positions are derived per frame from
      the measured size so a resize needs no rebuild. */
  const cells = useMemo(() => {
    const out: { nx: number; ny: number }[] = [];
    for (let r = 0; r < ROWS; r += 1) {
      for (let c = 0; c < COLS; c += 1) {
        out.push({ nx: (c + 0.5) / COLS, ny: (r + 0.5) / ROWS });
      }
    }
    return out;
  }, []);

  useEffect(() => {
    const root = rootRef.current;
    const field = fieldRef.current;
    if (!root || !field) return;

    const marks = Array.from(field.children) as HTMLElement[];

    const ctx = gsap.context(() => {
      const media = gsap.matchMedia();

      /**
       * Reduced motion gets the composition, not the animation: the marks are laid out at
       * a fixed pleasing energy and nothing moves or fades in. Returning a still frame is
       * better than returning nothing, because the layout was designed around the field
       * being there.
       */
      media.add('(prefers-reduced-motion: reduce)', () => {
        gsap.set(root.querySelectorAll('[data-hero-in]'), { opacity: 1, y: 0, yPercent: 0 });
        gsap.set(root.querySelectorAll('[data-hero-rule]'), { scaleX: 1 });
        gsap.set(field, { opacity: 1 });
        marks.forEach((mark, i) => {
          const energy = (Math.sin(cells[i].nx * 6.1 + cells[i].ny * 3.7) + 1) / 2;
          mark.style.transform = `scaleX(${0.5 + energy * 0.6}) scaleY(${0.7 + energy * 1.1})`;
          mark.style.opacity = String(0.1 + energy * 0.3);
        });
      });

      media.add('(prefers-reduced-motion: no-preference)', () => {
        // Pointer state. `strength` fades the whole interactive term in and out so the
        // lens does not snap on at the edge of the section when the cursor enters.
        const pointer = { x: -9999, y: -9999, strength: 0 };

        // The raw pointer is not used directly: easing it means a fast flick across the
        // hero drags the lens behind the cursor and lets it catch up, which reads as the
        // field having weight. A hard follow looks like a cursor effect; this looks like
        // a material.
        const moveX = gsap.quickTo(pointer, 'x', { duration: 0.55, ease: 'power3' });
        const moveY = gsap.quickTo(pointer, 'y', { duration: 0.55, ease: 'power3' });

        let width = root.clientWidth;
        let height = root.clientHeight;
        let reach = Math.min(width, height) * REACH;

        const measure = () => {
          width = root.clientWidth;
          height = root.clientHeight;
          reach = Math.min(width, height) * REACH;
        };

        const observer = new ResizeObserver(measure);
        observer.observe(root);

        const onMove = (event: PointerEvent) => {
          const box = root.getBoundingClientRect();
          moveX(event.clientX - box.left);
          moveY(event.clientY - box.top);
          gsap.to(pointer, { strength: 1, duration: 0.4, overwrite: 'auto' });
        };

        const onLeave = () => {
          gsap.to(pointer, { strength: 0, duration: 0.7, overwrite: 'auto' });
        };

        root.addEventListener('pointermove', onMove);
        root.addEventListener('pointerleave', onLeave);

        /**
         * One ticker writing straight to `style` rather than 198 tweens. GSAP is doing the
         * work it is good at here — the clock, the pointer easing, the intro — while the
         * per-frame field is a plain loop, because 198 concurrent tweens would spend more
         * time in the engine than in layout.
         */
        const render = () => {
          const t = gsap.ticker.time;

          for (let i = 0; i < marks.length; i += 1) {
            const cell = cells[i];
            const mark = marks[i];

            // Automatic: a plane wave travelling diagonally. Squaring it sharpens the
            // crests into bands with quiet space between, instead of an even shimmer.
            const phase = (cell.nx * 2.6 + cell.ny * 1.7) * Math.PI - t * 0.85;
            const wave = ((Math.sin(phase) + 1) / 2) ** 2 * 0.55;

            // Interactive: quadratic falloff from the eased pointer.
            const dx = cell.nx * width - pointer.x;
            const dy = cell.ny * height - pointer.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            const near = Math.max(0, 1 - distance / reach);
            const lens = near * near * pointer.strength;

            const energy = Math.max(wave, lens);

            // Marks swing to face the cursor, weighted by the lens so the ones far from
            // it keep the horizontal rhythm of the grid. This is what stops the field
            // reading as a grid of dashes and makes it read as iron filings.
            const angle = lens > 0.001 ? (Math.atan2(dy, dx) * 180) / Math.PI : 0;

            mark.style.transform = `rotate(${angle * lens}deg) scaleX(${0.45 + energy * 1.05}) scaleY(${0.6 + energy * 1.9})`;
            mark.style.opacity = String(0.08 + energy * 0.5);
          }
        };

        gsap.ticker.add(render);

        // Intro. The field arrives first and quietly, then the type, so the eye lands on
        // the headline rather than on the animation behind it.
        const intro = gsap.timeline({ defaults: { ease: 'power3.out' } });

        intro
          .fromTo(field, { opacity: 0 }, { opacity: 1, duration: 1.4 })
          .fromTo(
            root.querySelectorAll('[data-hero-rule]'),
            { scaleX: 0 },
            { scaleX: 1, duration: 0.7 },
            0.1
          )
          .fromTo(
            root.querySelectorAll('[data-hero-word]'),
            { yPercent: 115 },
            { yPercent: 0, duration: 1, stagger: 0.075 },
            0.15
          )
          .fromTo(
            root.querySelectorAll('[data-hero-in]'),
            { opacity: 0, y: 16 },
            { opacity: 1, y: 0, duration: 0.8, stagger: 0.09 },
            0.55
          );

        return () => {
          gsap.ticker.remove(render);
          observer.disconnect();
          root.removeEventListener('pointermove', onMove);
          root.removeEventListener('pointerleave', onLeave);
        };
      });
    }, root);

    return () => ctx.revert();
  }, [cells]);

  return (
    <section
      ref={rootRef}
      className={
        'relative isolate overflow-hidden border-b border-line bg-page ' +
        // Pulled up behind the floating header so the field runs under the glass pane
        // rather than starting below it.
        '-mt-20 sm:-mt-[5.25rem]'
      }
    >
      {/* Warm wash from the lower left. Very low opacity: felt rather than seen, and it
          keeps the section from being a flat rectangle in either theme. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-20 opacity-60 [background:radial-gradient(75%_65%_at_8%_100%,var(--accent-soft)_0%,transparent_68%)]"
      />

      {/* The field. `text-text` is what every mark inherits, so the whole thing flips with
          the theme without a single conditional. */}
      <div
        ref={fieldRef}
        aria-hidden
        className={
          'pointer-events-none absolute inset-0 -z-10 text-text opacity-0 ' +
          // A hole is punched in the field where the type sits. Marks running through a
          // 6rem serif look like a printing fault, and dropping the opacity far enough to
          // fix that would have left the field invisible everywhere else. Masking keeps
          // the marks at full strength across the open canvas and clears the measure.
          // The centre moves with the layout: on a phone the text is the full width, so
          // the hole is centred and wide; from lg it follows the left-set column.
          '[mask-image:radial-gradient(72%_52%_at_50%_40%,transparent_0%,transparent_38%,#000_82%)] ' +
          '[-webkit-mask-image:radial-gradient(72%_52%_at_50%_40%,transparent_0%,transparent_38%,#000_82%)] ' +
          'lg:[mask-image:radial-gradient(44%_58%_at_28%_44%,transparent_0%,transparent_24%,#000_70%)] ' +
          'lg:[-webkit-mask-image:radial-gradient(44%_58%_at_28%_44%,transparent_0%,transparent_24%,#000_70%)]'
        }
      >
        {cells.map((cell, index) => (
          <span
            key={index}
            className="absolute block h-[2px] w-10 rounded-full bg-current will-change-transform"
            style={{
              left: `${cell.nx * 100}%`,
              top: `${cell.ny * 100}%`,
              // Centred with negative margins, not a translate: the ticker overwrites
              // `transform` wholesale every frame, so a centring translate living there
              // would be wiped on the first tick and the grid would jump half a mark.
              marginLeft: '-1.25rem',
              marginTop: '-1px',
              transformOrigin: 'center',
            }}
          />
        ))}
      </div>

      <Container className="flex flex-col items-start gap-8 pb-24 pt-40 lg:pb-32 lg:pt-48">
        <span className="flex items-center gap-3 text-[11px] uppercase tracking-[0.22em] text-text-subtle">
          <span
            aria-hidden
            data-hero-rule
            className="h-px w-10 origin-left bg-line-strong"
          />
          Learn by finishing
        </span>

        {/* Each word sits in its own clipping row so the intro can slide it up from
            nowhere. One <span> per word rather than per character: characters flying in
            individually is a showreel effect, words reading in is typesetting. */}
        <h1 className="display-tight max-w-[16ch] font-serif text-[clamp(2.75rem,8vw,6rem)] font-normal text-text">
          {HEADLINE.map((word, index) => (
            <Fragment key={word}>
              <span className="inline-block overflow-hidden pb-[0.08em] align-bottom">
                <span data-hero-word className="inline-block">
                  {word}
                </span>
              </span>
              {/* A real space between the boxes, not a non-breaking space inside them.
                  Whitespace inside an inline-block is trimmed, which is why the tempting
                  version needs `&nbsp;` — and that ships a headline nobody can paste
                  into a search box without it coming back with U+00A0 between the words. */}
              {index < HEADLINE.length - 1 ? ' ' : null}
            </Fragment>
          ))}
        </h1>

        <p data-hero-in className="max-w-[48ch] text-lg leading-relaxed text-text-muted">
          Short courses with real lessons. Progress counts what you finished, and every quiz
          marks itself the moment you submit.
        </p>

        <div data-hero-in className="flex flex-wrap items-center gap-4">
          <Link
            href="/signup"
            className="group inline-flex h-13 cursor-pointer items-center gap-2 rounded-control bg-accent px-7 text-base font-medium text-accent-ink-on transition-colors duration-200 hover:bg-accent-hover"
          >
            Get started
            <ArrowRightIcon
              size={15}
              aria-hidden
              className="transition-transform duration-200 [transition-timing-function:var(--ease-settle)] group-hover:translate-x-0.5"
            />
          </Link>

          <Link
            href="/courses"
            className="inline-flex h-13 cursor-pointer items-center rounded-control border border-line-strong px-6 text-base text-text transition-colors duration-200 hover:border-text"
          >
            Browse the catalog
          </Link>
        </div>
      </Container>
    </section>
  );
}
