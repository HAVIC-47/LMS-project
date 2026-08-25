/**
 * Formatting helpers.
 *
 * A fixed `en-GB` locale rather than the visitor's: the server renders the markup first,
 * and if the two disagreed about how to write a date, React would report a hydration
 * mismatch on every page that shows one.
 */

const dateFormatter = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  timeZone: 'UTC',
});

export function formatDate(value: string | null | undefined): string {
  if (!value) return '';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return '';

  return dateFormatter.format(date);
}

/**
 * Splits plain text into paragraphs on blank lines.
 *
 * Strapi's richtext field stores Markdown. Rendering it through a Markdown parser would
 * mean trusting editor input as HTML, so the body is rendered as text and only paragraph
 * breaks are honoured. No `dangerouslySetInnerHTML`, no sanitiser to keep patched, and an
 * editor cannot inject a script into a public page.
 */
export function toParagraphs(body: string | null | undefined): string[] {
  if (!body) return [];

  return body
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
}

export function readingTime(body: string | null | undefined): number {
  if (!body) return 1;

  const words = body.trim().split(/\s+/).length;

  return Math.max(1, Math.round(words / 200));
}

/**
 * Whether a stored image URL is safe to hand to `next/image`.
 *
 * `next/image` throws on a src it cannot parse, and a thrown error in a Server Component
 * takes down the whole route. Cover images are typed in by editors, so a value like "no"
 * or a half-pasted URL is not hypothetical: one such row broke the entire blog index for
 * every visitor.
 *
 * Guarding at the render site rather than validating on save is deliberate. Rows already
 * in the database were never validated, and a public page should not depend on every
 * historical value having been well-formed.
 */
export function isRenderableImage(url: string | null | undefined): url is string {
  if (!url) return false;

  const value = url.trim();

  // A root-relative path is valid for next/image and needs no host check.
  if (value.startsWith('/')) return true;

  try {
    const parsed = new URL(value);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}
