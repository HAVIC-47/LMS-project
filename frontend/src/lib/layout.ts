/**
 * The page width, in one place.
 *
 * Two elements have to agree on it or the whole product looks crooked: the content
 * container and the floating header bar. When they were two separate `max-w-6xl` literals
 * in two files, changing one silently misaligned the header from everything under it.
 *
 * 84rem rather than Tailwind's `max-w-6xl` (72rem): on a 1440px display the old width left
 * roughly 145px of dead margin down each side, which read as the page being narrower than
 * the screen rather than as deliberate breathing room. Long-form reading areas are not
 * affected — lesson bodies, post bodies and course descriptions carry their own `68ch`
 * measure inside this container, so prose stays readable while tables, card grids and
 * dashboards get the room they were always short of.
 */
export const CONTAINER_MAX = 'max-w-[84rem]';

/** Horizontal padding, scaled by breakpoint. Kept next to the width it pairs with. */
export const CONTAINER_PADDING = 'px-4 sm:px-6 lg:px-8';
