'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { TrashIcon, UploadSimpleIcon } from '@phosphor-icons/react';
import { Avatar } from '@/components/ui/avatar';
import { Button, ButtonLink } from '@/components/ui/button';
import { Field, FormError } from '@/components/ui/field';
import { cn } from '@/lib/cn';
import type { SessionUser } from '@/lib/types';

/**
 * Edit your own profile.
 *
 * There is no user id anywhere in this component, and that is deliberate rather than an
 * oversight: the endpoint it posts to takes the account from the session cookie. A form
 * that carried an id would be one missing check away from editing somebody else, so the
 * id simply does not exist on this side to be tampered with.
 *
 * The avatar uploads immediately on choose, but the *profile* is not saved until Save is
 * pressed. That split is intentional — the file has to reach the server to have a URL at
 * all, and showing the real picture before committing is what lets someone see that they
 * picked the wrong one.
 */

const MAX_BIO = 400;

export function ProfileForm({ user }: { user: SessionUser }) {
  const router = useRouter();

  const [displayName, setDisplayName] = useState(user.displayName ?? '');
  const [bio, setBio] = useState(user.bio ?? '');
  const [website, setWebsite] = useState(user.website ?? '');
  const [avatarUrl, setAvatarUrl] = useState(user.avatarUrl ?? '');

  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const fileRef = useRef<HTMLInputElement>(null);

  const upload = async (file: File) => {
    setUploading(true);
    setError(null);
    setSaved(false);

    const form = new FormData();
    form.append('file', file);

    try {
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: form,
      });
      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        setError(payload?.error ?? 'Could not upload that image.');
        return;
      }

      setAvatarUrl(payload?.data?.url ?? '');
    } catch {
      setError('Could not upload that image.');
    } finally {
      setUploading(false);
      // Without this the same file cannot be re-picked after a failure: the input keeps
      // the old value, so choosing it again fires no change event.
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setSaved(false);

    try {
      const response = await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        // Sent whether or not they changed, so clearing a field is expressible. An
        // omitted key means "leave alone" on the backend, which is not what an empty
        // input means.
        body: JSON.stringify({ displayName, bio, website, avatarUrl }),
      });

      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        setError(payload?.error ?? 'Could not save your profile.');
        return;
      }

      setSaved(true);
      // The header renders the avatar from the server-rendered session, so it keeps the
      // old picture until the layout re-runs. `refresh` is what makes the change visible
      // everywhere at once rather than only on this form.
      router.refresh();
    } catch {
      setError('Could not save your profile.');
    } finally {
      setSaving(false);
    }
  };

  const name = displayName.trim() || user.username;

  return (
    <form onSubmit={save} className="flex max-w-2xl flex-col gap-8">
      {error ? <FormError>{error}</FormError> : null}

      <div className="flex flex-col gap-4">
        <span className="text-sm font-medium text-text">Profile picture</span>

        <div className="flex flex-wrap items-center gap-5">
          <Avatar src={avatarUrl} name={name} size="lg" />

          <div className="flex flex-wrap items-center gap-2">
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/avif,image/gif"
              className="sr-only"
              id="avatar-file"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void upload(file);
              }}
            />

            {/* A label styled as a button rather than a button that clicks a hidden input:
                the label is natively keyboard reachable and announces the control it
                owns, so no synthetic click and no aria wiring is needed. */}
            <label
              htmlFor="avatar-file"
              className={cn(
                'inline-flex h-11 cursor-pointer items-center gap-2 rounded-control border border-line-strong px-4 text-sm font-medium text-text',
                'transition-colors duration-200 hover:border-text',
                'focus-within:outline-none focus-within:ring-2 focus-within:ring-accent/30',
                uploading && 'pointer-events-none opacity-60',
              )}
            >
              <UploadSimpleIcon size={16} aria-hidden />
              {uploading ? 'Uploading…' : avatarUrl ? 'Replace' : 'Upload a picture'}
            </label>

            {avatarUrl ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setAvatarUrl('')}
                className="gap-2"
              >
                <TrashIcon size={15} aria-hidden />
                Remove
              </Button>
            ) : null}
          </div>
        </div>

        <p className="text-sm text-text-muted">
          JPEG, PNG, WebP, AVIF or GIF, up to 5MB. Removing it falls back to your initials.
        </p>
      </div>

      <Field
        label="Display name"
        value={displayName}
        maxLength={60}
        onChange={(event) => setDisplayName(event.target.value)}
        hint={`Shown instead of @${user.username}. Leave it empty to use your username.`}
      />

      <div className="flex flex-col gap-2">
        <label htmlFor="bio" className="text-sm font-medium text-text">
          Bio
        </label>
        <textarea
          id="bio"
          value={bio}
          maxLength={MAX_BIO}
          rows={4}
          onChange={(event) => setBio(event.target.value)}
          className={cn(
            'w-full rounded-input border border-line-strong bg-surface-raised px-4 py-3 text-base leading-relaxed text-text',
            'placeholder:text-text-subtle',
            'transition-[border-color,box-shadow] duration-200 [transition-timing-function:var(--ease-settle)]',
            'focus:outline-none focus-visible:border-accent focus-visible:ring-2 focus-visible:ring-accent/30',
          )}
        />
        <p className="flex items-center justify-between text-sm text-text-muted">
          <span>A sentence or two about what you do here.</span>
          <span className="font-mono tabular-nums text-text-subtle">
            {bio.length}/{MAX_BIO}
          </span>
        </p>
      </div>

      {/*
        `type="text"`, not `type="url"`. The hint promises the scheme is optional, and the
        backend does add it — but a `url` input refuses to submit "example.com" at all, so
        the browser's own validation would block the form before that promise could be
        kept, with a tooltip contradicting the hint directly underneath. `inputMode` still
        gets the right keyboard on a phone.
      */}
      <Field
        label="Website"
        type="text"
        inputMode="url"
        value={website}
        maxLength={200}
        onChange={(event) => setWebsite(event.target.value)}
        hint="Optional. https:// is added if you leave it off."
      />

      <div className="flex flex-wrap items-center gap-3 border-t border-line pt-8">
        <Button type="submit" loading={saving} disabled={uploading}>
          Save changes
        </Button>
        <ButtonLink href={`/u/${user.username}`} variant="outline">
          View profile
        </ButtonLink>
        {saved ? (
          <span role="status" className="text-sm text-success">
            Saved.
          </span>
        ) : null}
      </div>
    </form>
  );
}
