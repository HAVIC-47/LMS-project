/**
 * Joins class names, dropping falsy values.
 *
 * Deliberately not `tailwind-merge`: this codebase composes classes through explicit
 * variant maps rather than by overriding a base string, so there are no conflicting
 * utilities to de-duplicate and no reason to pay for the parser.
 */
export function cn(...values: Array<string | false | null | undefined>): string {
  return values.filter(Boolean).join(' ');
}
