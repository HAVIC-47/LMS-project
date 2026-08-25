'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Field, FormError } from '@/components/ui/field';
import { TextArea } from './form-controls';
import { ImageField } from './image-field';
import { createEntry, deleteEntry, setPostPublished, updateEntry } from '@/lib/manage';

const slugify = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

export type PostDraft = {
  documentId?: string;
  title: string;
  slug: string;
  excerpt: string;
  body: string;
  coverImageUrl: string;
  isPublished: boolean;
};

/**
 * Blog post editor.
 *
 * Saving and publishing are separate actions, which is the whole point of the draft state:
 * an editor can save half a paragraph without it appearing on the public blog. Publishing
 * calls the dedicated `/publish` endpoint rather than setting a field, so the transition is
 * one explicit call the backend wraps in its own ownership check.
 *
 * As with courses, no `author` is sent. The backend assigns it from the JWT and only an
 * admin may change it.
 */
export function PostForm({ initial }: { initial?: PostDraft }) {
  const editing = Boolean(initial?.documentId);

  const [draft, setDraft] = useState<PostDraft>(
    initial ?? {
      title: '',
      slug: '',
      excerpt: '',
      body: '',
      coverImageUrl: '',
      isPublished: false,
    }
  );
  const [slugTouched, setSlugTouched] = useState(editing);
  const [pending, setPending] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{ title?: string; slug?: string }>({});

  const router = useRouter();

  const set = <K extends keyof PostDraft>(key: K, value: PostDraft[K]) =>
    setDraft((current) => ({ ...current, [key]: value }));

  const validate = () => {
    const errors: typeof fieldErrors = {};
    if (!draft.title.trim()) errors.title = 'Give the post a title.';
    if (!draft.slug.trim()) errors.slug = 'A slug is required for the post URL.';
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const payload = () => ({
    title: draft.title.trim(),
    slug: draft.slug.trim(),
    excerpt: draft.excerpt.trim() || null,
    body: draft.body,
    coverImageUrl: draft.coverImageUrl.trim() || null,
  });

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!validate()) return;

    setPending(true);
    setError(null);

    try {
      if (editing) {
        await updateEntry('blog-posts', initial!.documentId!, payload());
        router.refresh();
      } else {
        const created = (await createEntry('blog-posts', payload())) as {
          data?: { documentId?: string };
        };
        const documentId = created?.data?.documentId;
        router.push(documentId ? `/studio/blog/${documentId}` : '/studio/blog');
        router.refresh();
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not save the post.');
    } finally {
      setPending(false);
    }
  };

  const togglePublished = async () => {
    if (!editing) return;

    setPublishing(true);
    setError(null);

    try {
      await setPostPublished(initial!.documentId!, !draft.isPublished);
      set('isPublished', !draft.isPublished);
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not change the publish state.');
    } finally {
      setPublishing(false);
    }
  };

  const remove = async () => {
    if (!window.confirm(`Delete "${draft.title}"?`)) return;

    setDeleting(true);
    setError(null);

    try {
      await deleteEntry('blog-posts', initial!.documentId!);
      router.push('/studio/blog');
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not delete the post.');
      setDeleting(false);
    }
  };

  return (
    <form onSubmit={save} noValidate className="flex flex-col gap-6">
      {error ? <FormError>{error}</FormError> : null}

      <Field
        label="Title"
        value={draft.title}
        onChange={(event) => {
          set('title', event.target.value);
          if (!slugTouched) set('slug', slugify(event.target.value));
        }}
        error={fieldErrors.title}
      />

      <Field
        label="Slug"
        value={draft.slug}
        onChange={(event) => {
          setSlugTouched(true);
          set('slug', event.target.value);
        }}
        error={fieldErrors.slug}
        hint="Used in the post URL."
      />

      <TextArea
        label="Excerpt"
        rows={2}
        value={draft.excerpt}
        onChange={(event) => set('excerpt', event.target.value)}
        hint="Shown on the blog index under the title."
      />

      <ImageField
        label="Cover image"
        value={draft.coverImageUrl}
        onChange={(url) => set('coverImageUrl', url)}
        hint="Shown at the top of the post and on the blog index."
      />

      <TextArea
        label="Body"
        rows={16}
        value={draft.body}
        onChange={(event) => set('body', event.target.value)}
        hint="Blank lines separate paragraphs. Rendered as plain text, so markup is not interpreted."
      />

      <div className="flex flex-wrap items-center gap-3 border-t border-line pt-6">
        <Button type="submit" loading={pending}>
          {editing ? 'Save draft' : 'Create post'}
        </Button>

        {editing ? (
          <>
            <Button
              type="button"
              variant={draft.isPublished ? 'outline' : 'solid'}
              onClick={togglePublished}
              loading={publishing}
            >
              {draft.isPublished ? 'Unpublish' : 'Publish'}
            </Button>

            <Button type="button" variant="danger" onClick={remove} loading={deleting}>
              Delete
            </Button>
          </>
        ) : null}
      </div>

      {editing ? (
        <p className="text-sm text-text-muted">
          {draft.isPublished
            ? 'This post is live. Anyone can read it, signed in or not.'
            : 'This is a draft. It does not appear on the public blog.'}
        </p>
      ) : null}
    </form>
  );
}
