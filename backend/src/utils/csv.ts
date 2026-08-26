/**
 * CSV serialisation.
 *
 * Small enough to write, and worth writing rather than pulling in a dependency, because the
 * only hard part is the quoting and that is eight lines.
 *
 * Three rules that a naive `join(',')` gets wrong, and that turn a broken export into a
 * silently corrupted one:
 *
 *   A field containing a comma, a quote or a newline must be wrapped in quotes, and any
 *   quote inside it doubled. Course titles contain commas constantly.
 *
 *   A field beginning with `=`, `+`, `-` or `@` is executed as a formula when the file is
 *   opened in Excel or Sheets. A student whose display name starts with `=` becomes a
 *   formula injection in whatever machine opens the export, so those are prefixed with a
 *   single quote. This is the part people leave out.
 *
 *   `\r\n` line endings, because Excel on Windows is the overwhelmingly likely destination
 *   and it is the format the RFC specifies anyway.
 */

const RISKY_PREFIX = /^[=+\-@\t\r]/;

const escapeField = (value: unknown): string => {
  if (value === null || value === undefined) return '';

  let text = String(value);

  // Formula injection. Prefixing with an apostrophe is what spreadsheet software reads as
  // "this is text", and it is stripped on display.
  if (RISKY_PREFIX.test(text)) text = `'${text}`;

  if (/[",\r\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }

  return text;
};

export const toCsv = (headers: string[], rows: unknown[][]): string =>
  [headers, ...rows].map((row) => row.map(escapeField).join(',')).join('\r\n');

/**
 * A filename safe to put in a Content-Disposition header.
 *
 * Anything outside a conservative set becomes a hyphen: a quote or a newline in a course
 * title would otherwise break out of the header value.
 */
export const csvFilename = (...parts: string[]): string => {
  const stem = parts
    .join('-')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);

  return `${stem || 'export'}-${new Date().toISOString().slice(0, 10)}.csv`;
};
