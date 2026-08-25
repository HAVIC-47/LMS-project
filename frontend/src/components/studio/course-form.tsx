'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Field, FormError } from '@/components/ui/field';
import { Checkbox, Select, TextArea } from './form-controls';
import { ImageField } from './image-field';
import { createEntry, deleteEntry, updateEntry } from '@/lib/manage';
import type { CourseLevel } from '@/lib/types';

const LEVELS = [
  { value: 'beginner', label: 'Beginner' },
  { value: 'intermediate', label: 'Intermediate' },
  { value: 'advanced', label: 'Advanced' },
];

/** Lowercase, hyphenated, no leading or trailing separators. Matches Strapi's uid field. */
const slugify = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

export type CourseDraft = {
  documentId?: string;
  title: string;
  slug: string;
  description: string;
  coverImageUrl: string;
  level: CourseLevel;
  isPublished: boolean;
};

/**
 * Create and edit a course.
 *
 * Note what the form does not send: an `owner`. The backend assigns it from the JWT on
 * create and refuses to reassign it for anyone but an admin, so there is deliberately no
 * control for it here. A field the server ignores is a field that misleads whoever fills it in.
 */
export function CourseForm({ initial }: { initial?: CourseDraft }) {
  const editing = Boolean(initial?.documentId);

  const [draft, setDraft] = useState<CourseDraft>(
    initial ?? {
      title: '',
      slug: '',
      description: '',
      coverImageUrl: '',
      level: 'beginner',
      isPublished: false,
    }
  );
  const [slugTouched, setSlugTouched] = useState(editing);
  const [pending, setPending] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{ title?: string; slug?: string }>({});

  const router = useRouter();

  const set = <K extends keyof CourseDraft>(key: K, value: CourseDraft[K]) =>
    setDraft((current) => ({ ...current, [key]: value }));

  const onTitleChange = (value: string) => {
    set('title', value);
    // Follow the title until someone edits the slug by hand, then stop: changing a slug
    // under an editor who set it deliberately would break their links.
    if (!slugTouched) set('slug', slugify(value));
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();

    const errors: typeof fieldErrors = {};
    if (!draft.title.trim()) errors.title = 'Give the course a title.';
    if (!draft.slug.trim()) errors.slug = 'A slug is required for the course URL.';

    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setPending(true);
    setError(null);

    const payload = {
      title: draft.title.trim(),
      slug: draft.slug.trim(),
      description: draft.description.trim() || null,
      coverImageUrl: draft.coverImageUrl.trim() || null,
      level: draft.level,
      isPublished: draft.isPublished,
    };

    try {
      if (editing) {
        await updateEntry('courses', initial!.documentId!, payload);
        router.refresh();
      } else {
        const created = (await createEntry('courses', payload)) as {
          data?: { documentId?: string };
        };
        const documentId = created?.data?.documentId;
        router.push(documentId ? `/studio/courses/${documentId}` : '/studio');
        router.refresh();
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not save the course.');
    } finally {
      setPending(false);
    }
  };

  const remove = async () => {
    // A course takes its lessons, quiz and enrollments with it, so this asks first.
    if (!window.confirm(`Delete "${draft.title}"? Its lessons and quiz go with it.`)) return;

    setDeleting(true);
    setError(null);

    try {
      await deleteEntry('courses', initial!.documentId!);
      router.push('/studio');
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not delete the course.');
      setDeleting(false);
    }
  };

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-6">
      {error ? <FormError>{error}</FormError> : null}

      <Field
        label="Title"
        value={draft.title}
        onChange={(event) => onTitleChange(event.target.value)}
        error={fieldErrors.title}
        placeholder="Modern JavaScript Foundations"
      />

      <Field
        label="Slug"
        value={draft.slug}
        onChange={(event) => {
          setSlugTouched(true);
          set('slug', event.target.value);
        }}
        error={fieldErrors.slug}
        hint="Used in the course URL."
      />

      <TextArea
        label="Description"
        rows={4}
        value={draft.description}
        onChange={(event) => set('description', event.target.value)}
        hint="Shown on the catalog card and the course page."
      />

      <ImageField
        label="Cover image"
        value={draft.coverImageUrl}
        onChange={(url) => set('coverImageUrl', url)}
        hint="Shown on the catalog index and the course page."
      />

      <Select
        label="Level"
        value={draft.level}
        options={LEVELS}
        onChange={(event) => set('level', event.target.value as CourseLevel)}
      />

      <Checkbox
        label="Published"
        checked={draft.isPublished}
        onChange={(event) => set('isPublished', event.target.checked)}
        hint="Unpublished courses are invisible in the catalog and cannot be enrolled in."
      />

      <div className="flex flex-wrap items-center gap-3 border-t border-line pt-6">
        <Button type="submit" loading={pending}>
          {editing ? 'Save changes' : 'Create course'}
        </Button>

        {editing ? (
          <Button type="button" variant="danger" onClick={remove} loading={deleting}>
            Delete course
          </Button>
        ) : null}
      </div>
    </form>
  );
}
