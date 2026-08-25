'use client';

import { useId } from 'react';
import { cn } from '@/lib/cn';

/**
 * Textarea and select to match the input in `field.tsx`.
 *
 * Same rules as everywhere else: label above the control, never a placeholder standing in
 * for a label, and the error announced through `aria-describedby` rather than signalled by
 * colour alone.
 */

export function TextArea({
  label,
  hint,
  error,
  className,
  rows = 6,
  id,
  ...props
}: {
  label: string;
  hint?: string;
  error?: string | null;
  className?: string;
} & React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const generated = useId();
  const fieldId = id ?? generated;

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <label htmlFor={fieldId} className="text-sm font-medium text-text">
        {label}
      </label>
      <textarea
        id={fieldId}
        rows={rows}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${fieldId}-error` : hint ? `${fieldId}-hint` : undefined}
        className={cn(
          'w-full rounded-input border bg-surface-raised px-4 py-3 text-base leading-relaxed text-text',
          'placeholder:text-text-subtle',
          'transition-[border-color,box-shadow] duration-200 [transition-timing-function:var(--ease-settle)]',
          'focus:outline-none focus-visible:border-accent focus-visible:ring-2 focus-visible:ring-accent/30',
          error ? 'border-danger' : 'border-line-strong'
        )}
        {...props}
      />
      {hint && !error ? (
        <p id={`${fieldId}-hint`} className="text-sm text-text-muted">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={`${fieldId}-error`} role="alert" className="text-sm text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function Select({
  label,
  options,
  className,
  id,
  ...props
}: {
  label: string;
  options: { value: string; label: string }[];
  className?: string;
} & React.SelectHTMLAttributes<HTMLSelectElement>) {
  const generated = useId();
  const fieldId = id ?? generated;

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <label htmlFor={fieldId} className="text-sm font-medium text-text">
        {label}
      </label>
      <select
        id={fieldId}
        className={cn(
          'h-12 w-full cursor-pointer rounded-input border border-line-strong bg-surface-raised px-4 text-base text-text',
          'transition-[border-color] duration-200',
          'focus:outline-none focus-visible:border-accent focus-visible:ring-2 focus-visible:ring-accent/30'
        )}
        {...props}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}

/** Checkbox with the label beside it, which is the one place a label sits after a control. */
export function Checkbox({
  label,
  hint,
  className,
  id,
  ...props
}: {
  label: string;
  hint?: string;
  className?: string;
} & React.InputHTMLAttributes<HTMLInputElement>) {
  const generated = useId();
  const fieldId = id ?? generated;

  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <div className="flex items-center gap-3">
        <input
          id={fieldId}
          type="checkbox"
          className="size-4 cursor-pointer accent-[var(--accent)]"
          {...props}
        />
        <label htmlFor={fieldId} className="cursor-pointer text-sm font-medium text-text">
          {label}
        </label>
      </div>
      {hint ? <p className="pl-7 text-sm text-text-muted">{hint}</p> : null}
    </div>
  );
}
