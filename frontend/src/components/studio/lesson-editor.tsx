'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { PencilSimpleIcon, PlusIcon, TrashIcon } from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import { Field, FormError } from '@/components/ui/field';
import { Panel } from '@/components/ui/primitives';
import { Select, TextArea } from './form-controls';
import { createEntry, deleteEntry, updateEntry } from '@/lib/manage';
import type { AuthoredLesson } from '@/lib/api/authoring';

const CONTENT_TYPES = [
  { value: 'text', label: 'Written' },
  { value: 'video', label: 'Video' },
];

type Draft = {
  documentId?: string;
  title: string;
  contentType: 'text' | 'video';
  body: string;
  videoUrl: string;
  order: number;
};

const blank = (order: number): Draft => ({
  title: '',
  contentType: 'text',
  body: '',
  videoUrl: '',
  order,
});

/**
 * Lesson list and editor for one course.
 *
 * One form open at a time rather than every row being editable at once: lessons carry a
 * lot of text, and a page of open textareas makes it easy to lose track of which one is
 * being saved.
 *
 * `order` is what the student player sorts by, so it is an explicit field rather than
 * something inferred from row position. Drag-to-reorder would be nicer and is not worth
 * a hidden value the author cannot see or type.
 */
export function LessonEditor({
  courseId,
  lessons,
}: {
  courseId: string;
  lessons: AuthoredLesson[];
}) {
  const [draft, setDraft] = useState<Draft | null>(null);
  const [pending, setPending] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const router = useRouter();

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) =>
    setDraft((current) => (current ? { ...current, [key]: value } : current));

  const startNew = () => {
    const nextOrder = lessons.length > 0 ? Math.max(...lessons.map((l) => l.order)) + 1 : 1;
    setDraft(blank(nextOrder));
    setError(null);
  };

  const startEdit = (lesson: AuthoredLesson) => {
    setDraft({
      documentId: lesson.documentId,
      title: lesson.title,
      contentType: lesson.contentType,
      body: lesson.body ?? '',
      videoUrl: lesson.videoUrl ?? '',
      order: lesson.order,
    });
    setError(null);
  };

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!draft) return;

    if (!draft.title.trim()) {
      setError('Give the lesson a title.');
      return;
    }

    setPending(true);
    setError(null);

    // Only the field for the chosen type is sent, and the other is cleared, so a lesson
    // switched from video to written cannot keep a stale URL the player might still use.
    const payload = {
      title: draft.title.trim(),
      order: Number(draft.order) || 1,
      contentType: draft.contentType,
      body: draft.contentType === 'text' ? draft.body : null,
      videoUrl: draft.contentType === 'video' ? draft.videoUrl.trim() || null : null,
      course: courseId,
    };

    try {
      if (draft.documentId) {
        await updateEntry('lessons', draft.documentId, payload);
      } else {
        await createEntry('lessons', payload);
      }

      setDraft(null);
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not save the lesson.');
    } finally {
      setPending(false);
    }
  };

  const remove = async (lesson: AuthoredLesson) => {
    if (!window.confirm(`Delete "${lesson.title}"?`)) return;

    setBusyId(lesson.documentId);
    setError(null);

    try {
      await deleteEntry('lessons', lesson.documentId);
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not delete the lesson.');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <section className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h2 className="text-xl font-semibold">Lessons</h2>
        {!draft ? (
          <Button size="sm" variant="outline" onClick={startNew}>
            <PlusIcon size={15} weight="bold" aria-hidden />
            Add lesson
          </Button>
        ) : null}
      </div>

      {error && !draft ? <FormError>{error}</FormError> : null}

      {lessons.length === 0 && !draft ? (
        <p className="rounded-card border border-dashed border-line-strong px-5 py-8 text-center text-text-muted">
          No lessons yet. Students see an empty syllabus until you add one.
        </p>
      ) : (
        <ol className="flex flex-col">
          {lessons.map((lesson) => (
            <li
              key={lesson.documentId}
              className="flex flex-wrap items-center gap-4 border-b border-line py-4 first:border-t"
            >
              <span className="font-mono text-xs tabular-nums text-text-subtle">
                {String(lesson.order).padStart(2, '0')}
              </span>

              <span className="min-w-0 flex-1">
                <span className="block truncate text-text">{lesson.title}</span>
                <span className="microlabel">
                  {lesson.contentType === 'video' ? 'Video' : 'Written'}
                </span>
              </span>

              <span className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => startEdit(lesson)}
                  aria-label={`Edit ${lesson.title}`}
                  className="flex size-11 cursor-pointer items-center justify-center rounded-control text-text-muted transition-colors hover:bg-shell hover:text-text"
                >
                  <PencilSimpleIcon size={16} aria-hidden />
                </button>
                <button
                  type="button"
                  onClick={() => remove(lesson)}
                  disabled={busyId === lesson.documentId}
                  aria-label={`Delete ${lesson.title}`}
                  className="flex size-11 cursor-pointer items-center justify-center rounded-control text-text-muted transition-colors hover:bg-danger-soft hover:text-danger disabled:opacity-50"
                >
                  <TrashIcon size={16} aria-hidden />
                </button>
              </span>
            </li>
          ))}
        </ol>
      )}

      {draft ? (
        <Panel className="p-6">
          <form onSubmit={save} noValidate className="flex flex-col gap-5">
            <h3 className="text-lg font-semibold">
              {draft.documentId ? 'Edit lesson' : 'New lesson'}
            </h3>

            {error ? <FormError>{error}</FormError> : null}

            <Field
              label="Title"
              value={draft.title}
              onChange={(event) => set('title', event.target.value)}
            />

            <div className="grid gap-5 sm:grid-cols-2">
              <Select
                label="Type"
                value={draft.contentType}
                options={CONTENT_TYPES}
                onChange={(event) => set('contentType', event.target.value as 'text' | 'video')}
              />
              <Field
                label="Order"
                type="number"
                min={1}
                value={String(draft.order)}
                onChange={(event) => set('order', Number(event.target.value))}
                hint="Lessons run in this order."
              />
            </div>

            {draft.contentType === 'video' ? (
              <Field
                label="Video URL"
                value={draft.videoUrl}
                onChange={(event) => set('videoUrl', event.target.value)}
                hint="YouTube or Vimeo. A normal watch link is fine, it is converted for embedding."
              />
            ) : (
              <TextArea
                label="Content"
                rows={10}
                value={draft.body}
                onChange={(event) => set('body', event.target.value)}
                hint="Blank lines separate paragraphs."
              />
            )}

            <div className="flex flex-wrap gap-3">
              <Button type="submit" loading={pending}>
                {draft.documentId ? 'Save lesson' : 'Add lesson'}
              </Button>
              <Button type="button" variant="ghost" onClick={() => setDraft(null)}>
                Cancel
              </Button>
            </div>
          </form>
        </Panel>
      ) : null}
    </section>
  );
}
