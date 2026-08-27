/**
 * The page width, in one place.
 *
 * Two elements have to agree on it or the whole product looks crooked: the content
 * container and the floating header bar. When they were two separate `max-w-6xl` literals
 * in two files, changing one silently misaligned the header from everything under it.
 *
 * The sizes themselves live in `globals.css` as `--page-max`, because the width steps
 * rather than scales and the steps have to land in a known order:
 *
 *   viewport            container   margin each side
 *   ---------------------------------------------------
 *   below 1536px        1152px      fluid below ~1200px
 *   1536px and up       1400px      >= 68px
 *   2200px and up       1700px      >= 250px
 *
 * Steps rather than a `clamp()` because the three target sizes are 90%, 73% and 66% of
 * their viewports -- no single curve passes through all three. Plain media queries rather
 * than Tailwind breakpoint variants because Tailwind sorts its own rules, and it emitted a
 * `3xl` (2200px) rule *ahead* of `2xl` (1536px): both match on a 2560px screen, the later
 * one wins, and so the widest step lost on every display it was written for.
 *
 * Long-form reading areas are unaffected at every size: lesson bodies, post bodies and
 * course descriptions carry their own `68ch` measure inside this container, so prose keeps
 * its line length while tables, card grids and dashboards take the extra room.
 */
export const CONTAINER_MAX = 'max-w-[var(--page-max)]';

/** Horizontal padding, scaled by breakpoint. Kept next to the width it pairs with. */
export const CONTAINER_PADDING = 'px-4 sm:px-6 lg:px-8';
