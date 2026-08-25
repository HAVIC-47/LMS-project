'use client';

import { useId, useRef, useState } from 'react';
import { ImageSquareIcon, TrashIcon, UploadSimpleIcon } from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/cn';
import { isRenderableImage } from '@/lib/format';

/**
 * Cover image: upload from the device, or paste a URL.
 *
 * Both, rather than replacing one with the other. Uploading is what people expect, but the
 * seeded content references images by URL and an editor who has a link in hand should not
 * have to download it first just to upload it again.
 *
 * The upload replaces the field's value with the returned URL, so everything downstream
 * still deals with a single string and nothing about the data model changes.
 */
export function ImageField({
  label,
  value,
  onChange,
  hint,
}: {
  label: string;
  value: string;
  onChange: (url: string) => void;
  hint?: string;
}) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const fieldId = useId();

  const upload = async (file: File) => {
    setUploading(true);
    setError(null);

    const form = new FormData();
    form.append('file', file);

    try {
      const response = await fetch('/api/upload', { method: 'POST', body: form });
      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        setError(payload?.error ?? 'Could not upload that image.');
        return;
      }

      onChange(payload.data.url);
    } catch {
      setError('Could not reach the server. Try again.');
    } finally {
      setUploading(false);
      // Clearing the input means picking the same file twice in a row still fires change.
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const onDrop = (event: React.DragEvent) => {
    event.preventDefault();
    setDragging(false);

    const file = event.dataTransfer.files?.[0];
    if (file) void upload(file);
  };

  return (
    <div className="flex flex-col gap-3">
      <span className="text-sm font-medium text-text">{label}</span>

      {isRenderableImage(value) ? (
        <div className="flex flex-col gap-3">
          <div className="relative aspect-[16/9] w-full overflow-hidden rounded-card border border-line bg-shell">
            {/* A plain img, not next/image: an editor can paste a URL from any host, and
                next/image refuses hosts that are not in remotePatterns. Optimisation is
                not worth a broken preview in an editing form. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={value} alt="" className="size-full object-cover" />
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => inputRef.current?.click()}
              loading={uploading}
            >
              <UploadSimpleIcon size={14} aria-hidden />
              Replace
            </Button>

            <Button type="button" variant="ghost" size="sm" onClick={() => onChange('')}>
              <TrashIcon size={14} aria-hidden />
              Remove
            </Button>
          </div>
        </div>
      ) : (
        <div
          onDragOver={(event) => {
            event.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          className={cn(
            'flex flex-col items-center gap-3 rounded-card border border-dashed px-6 py-10 text-center transition-colors duration-200',
            dragging ? 'border-text bg-shell' : 'border-line-strong'
          )}
        >
          <ImageSquareIcon size={28} className="text-text-subtle" aria-hidden />

          <div className="flex flex-col gap-1">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => inputRef.current?.click()}
              loading={uploading}
            >
              <UploadSimpleIcon size={14} aria-hidden />
              Choose an image
            </Button>
            <span className="microlabel mt-2">or drop one here</span>
          </div>

          <span className="text-xs text-text-subtle">JPEG, PNG, WebP or AVIF, up to 5MB</span>
        </div>
      )}

      <input
        ref={inputRef}
        id={fieldId}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/avif,image/gif"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) void upload(file);
        }}
        className="sr-only"
      />

      <div className="flex flex-col gap-2">
        <label htmlFor={`${fieldId}-url`} className="microlabel">
          or paste a URL
        </label>
        <input
          id={`${fieldId}-url`}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder="https://"
          className="h-11 w-full rounded-input border border-line-strong bg-surface-raised px-3 text-sm text-text placeholder:text-text-subtle focus:outline-none focus-visible:border-text focus-visible:ring-2 focus-visible:ring-text/15"
        />
      </div>

      {/* Caught at the render sites too, but saying so here is the difference between an
          editor seeing a missing image and knowing why. */}
      {value && !isRenderableImage(value) ? (
        <p className="text-sm text-danger">
          That is not a usable image address. It needs to start with https:// or /.
        </p>
      ) : null}

      {hint && !error ? <p className="text-sm text-text-muted">{hint}</p> : null}
      {error ? (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}
