'use client';

import { useId } from 'react';
import { WarningCircleIcon } from '@phosphor-icons/react';
import { cn } from '@/lib/cn';

/**
 * Form field.
 *
 * Layout is fixed: label above, control, hint, then error below. Placeholder text is never
 * the label - it disappears the moment someone types, which strands anyone who gets
 * interrupted mid-form and is invisible to most screen readers.
 *
 * The error is wired with `aria-describedby` and `aria-invalid` rather than colour alone,
 * so the failure is announced and not only seen.
 */

type FieldProps = {
  label: string;
  hint?: string;
  error?: string | null;
  className?: string;
} & React.InputHTMLAttributes<HTMLInputElement>;

export function Field({ label, hint, error, className, id, ...props }: FieldProps) {
  const generatedId = useId();
  const fieldId = id ?? generatedId;
  const hintId = `${fieldId}-hint`;
  const errorId = `${fieldId}-error`;

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <label htmlFor={fieldId} className="text-sm font-medium text-text">
        {label}
      </label>

      <input
        id={fieldId}
        aria-invalid={error ? true : undefined}
        aria-describedby={cn(hint ? hintId : undefined, error ? errorId : undefined) || undefined}
        className={cn(
          'h-12 w-full rounded-input border bg-surface-raised px-4 text-base text-text',
          // 16px text avoids iOS zoom-on-focus. Placeholder sits at --text-subtle, which
          // clears 4.5:1 against the raised surface in both themes.
          'placeholder:text-text-subtle',
          'transition-[border-color,box-shadow] duration-200 [transition-timing-function:var(--ease-settle)]',
          'focus:outline-none focus-visible:border-accent focus-visible:ring-2 focus-visible:ring-accent/30',
          error ? 'border-danger' : 'border-line-strong'
        )}
        {...props}
      />

      {hint && !error ? (
        <p id={hintId} className="text-sm text-text-muted">
          {hint}
        </p>
      ) : null}

      {error ? (
        <p id={errorId} role="alert" className="flex items-center gap-1.5 text-sm text-danger">
          <WarningCircleIcon size={16} weight="fill" aria-hidden />
          {error}
        </p>
      ) : null}
    </div>
  );
}

/** Page-level failure banner, for errors that belong to the form rather than one field. */
export function FormError({ children }: { children: React.ReactNode }) {
  return (
    <div
      role="alert"
      className="flex items-start gap-2.5 rounded-input border border-danger/30 bg-danger-soft px-4 py-3 text-sm text-danger"
    >
      <WarningCircleIcon size={18} weight="fill" className="mt-px shrink-0" aria-hidden />
      <span>{children}</span>
    </div>
  );
}
