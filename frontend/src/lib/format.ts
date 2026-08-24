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
