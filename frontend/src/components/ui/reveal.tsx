'use client';

import { motion, useReducedMotion } from 'motion/react';

/**
 * Scroll entry animation.
 *
 * Motion is here to establish reading order: a section resolves top-down as it arrives, so
 * the eye is led rather than presented with everything at once. That is the whole
 * justification. Nothing on this site loops forever or moves without a reason.
 *
 * `whileInView` uses an IntersectionObserver internally. A scroll listener would fire on
 * every frame and re-render the tree with it.
 *
 * Under `prefers-reduced-motion` the element renders in its final state immediately -
 * `initial={false}` rather than a shortened animation, so nothing is ever left invisible.
 *
 * The server renders these at `opacity: 0`, so without JavaScript the content would never
 * appear. The `data-reveal` hook exists for the `<noscript>` rule in the root layout, which
 * forces every one of them visible when scripting is off.
 */
export function Reveal({
  children,
  delay = 0,
  className,
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) {
  const reduceMotion = useReducedMotion();

  return (
    <motion.div
      data-reveal
      className={className}
      initial={reduceMotion ? false : { opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.25 }}
      transition={{ duration: 0.7, delay, ease: [0.16, 1, 0.3, 1] }}
    >
      {children}
    </motion.div>
  );
}

/** Same idea for a list, staggered by index so rows arrive in sequence. */
export function RevealList({
  children,
  className,
  step = 0.06,
}: {
  children: React.ReactNode[];
  className?: string;
  step?: number;
}) {
  const reduceMotion = useReducedMotion();

  return (
    <div className={className}>
      {children.map((child, index) => (
        <motion.div
          key={index}
          data-reveal
          initial={reduceMotion ? false : { opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.6, delay: index * step, ease: [0.16, 1, 0.3, 1] }}
        >
          {child}
        </motion.div>
      ))}
    </div>
  );
}
