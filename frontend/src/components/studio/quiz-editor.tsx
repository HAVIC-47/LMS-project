'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { PencilSimpleIcon, PlusIcon, TrashIcon } from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import { Field, FormError } from '@/components/ui/field';
import { Panel } from '@/components/ui/primitives';
import { TextArea } from './form-controls';
import { createEntry, deleteEntry, updateEntry } from '@/lib/manage';
import type { AuthoredQuestion, AuthoredQuiz } from '@/lib/api/authoring';
import { cn } from '@/lib/cn';

type QuestionDraft = {
  documentId?: string;
  prompt: string;
  options: string[];
  correctIndex: number;
  order: number;
};

const blankQuestion = (order: number): QuestionDraft => ({
  prompt: '',
  options: ['', ''],
  correctIndex: 0,
  order,
});

/**
 * Quiz and question editor.
 *
 * The correct answer is chosen with a radio beside each option rather than a separate
 * "correct answer" number field. An index typed into a box drifts the moment options are
 * reordered or removed, and the backend rejects a `correctIndex` outside the option list,
 * so the two would disagree at exactly the wrong moment.
 */
export function QuizEditor({
  courseId,
  quiz,
}: {
  courseId: string;
  quiz: AuthoredQuiz | null;
}) {
  const router = useRouter();

  if (!quiz) {
    return <CreateQuiz courseId={courseId} />;
  }

  return <ExistingQuiz quiz={quiz} onChanged={() => router.refresh()} />;
}

function CreateQuiz({ courseId }: { courseId: string }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [passingScore, setPassingScore] = useState(60);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  const router = useRouter();

  const create = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!title.trim()) {
      setError('Give the quiz a title.');
      return;
    }

    setPending(true);
    setError(null);

    try {
      await createEntry('quizzes', {
        title: title.trim(),
        description: description.trim() || null,
        passingScore: Number(passingScore) || 60,
        course: courseId,
      });

      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not create the quiz.');
    } finally {
      setPending(false);
    }
  };

  return (
    <section className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h2 className="text-xl font-semibold">Quiz</h2>
        {!open ? (
          <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
            <PlusIcon size={15} weight="bold" aria-hidden />
            Add a quiz
          </Button>
        ) : null}
      </div>

      {!open ? (
        <p className="rounded-card border border-dashed border-line-strong px-5 py-8 text-center text-text-muted">
          This course has no quiz. Students can still finish it; progress is measured on
          lessons.
        </p>
      ) : (
        <Panel className="p-6">
          <form onSubmit={create} noValidate className="flex flex-col gap-5">
            {error ? <FormError>{error}</FormError> : null}

            <Field label="Title" value={title} onChange={(e) => setTitle(e.target.value)} />
            <TextArea
              label="Description"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
            <Field
              label="Pass mark"
              type="number"
              min={0}
              max={100}
              value={String(passingScore)}
              onChange={(e) => setPassingScore(Number(e.target.value))}
              hint="Percentage needed to pass."
            />

            <div className="flex flex-wrap gap-3">
              <Button type="submit" loading={pending}>
                Create quiz
              </Button>
              <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
                Cancel
              </Button>
            </div>
          </form>
        </Panel>
      )}
    </section>
  );
}

function ExistingQuiz({ quiz, onChanged }: { quiz: AuthoredQuiz; onChanged: () => void }) {
  const [draft, setDraft] = useState<QuestionDraft | null>(null);
  const [pending, setPending] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const questions = quiz.questions ?? [];

  const startNew = () => {
    const nextOrder = questions.length > 0 ? Math.max(...questions.map((q) => q.order)) + 1 : 1;
    setDraft(blankQuestion(nextOrder));
    setError(null);
  };

  const startEdit = (question: AuthoredQuestion) => {
    setDraft({
      documentId: question.documentId,
      prompt: question.prompt,
      options: [...question.options],
      correctIndex: question.correctIndex,
      order: question.order,
    });
    setError(null);
  };

  const setOption = (index: number, value: string) =>
    setDraft((current) =>
      current
        ? { ...current, options: current.options.map((o, i) => (i === index ? value : o)) }
        : current
    );

  const addOption = () =>
    setDraft((current) => (current ? { ...current, options: [...current.options, ''] } : current));

  const removeOption = (index: number) =>
    setDraft((current) => {
      if (!current || current.options.length <= 2) return current;

      const options = current.options.filter((_, i) => i !== index);

      // Removing the option above the answer shifts it down; removing the answer itself
      // falls back to the first option rather than leaving a dangling index.
      let correctIndex = current.correctIndex;
      if (index === current.correctIndex) correctIndex = 0;
      else if (index < current.correctIndex) correctIndex -= 1;

      return { ...current, options, correctIndex };
    });

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!draft) return;

    const options = draft.options.map((o) => o.trim());

    if (!draft.prompt.trim()) {
      setError('Write the question.');
      return;
    }

    if (options.length < 2 || options.some((o) => !o)) {
      setError('Every option needs text, and there must be at least two.');
      return;
    }

    setPending(true);
    setError(null);

    try {
      const payload = {
        prompt: draft.prompt.trim(),
        options,
        correctIndex: draft.correctIndex,
        order: Number(draft.order) || 1,
        quiz: quiz.documentId,
      };

      if (draft.documentId) {
        await updateEntry('questions', draft.documentId, payload);
      } else {
        await createEntry('questions', payload);
      }

      setDraft(null);
      onChanged();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not save the question.');
    } finally {
      setPending(false);
    }
  };

  const remove = async (question: AuthoredQuestion) => {
    if (!window.confirm('Delete this question?')) return;

    setBusyId(question.documentId);

    try {
      await deleteEntry('questions', question.documentId);
      onChanged();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not delete the question.');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <section className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h2 className="text-xl font-semibold">{quiz.title}</h2>
          <p className="microlabel">
            {questions.length} questions, pass mark {quiz.passingScore}%
          </p>
        </div>
        {!draft ? (
          <Button size="sm" variant="outline" onClick={startNew}>
            <PlusIcon size={15} weight="bold" aria-hidden />
            Add question
          </Button>
        ) : null}
      </div>

      {error && !draft ? <FormError>{error}</FormError> : null}

      {questions.length === 0 && !draft ? (
        <p className="rounded-card border border-dashed border-line-strong px-5 py-8 text-center text-text-muted">
          No questions yet. Students see a message rather than an empty quiz.
        </p>
      ) : (
        <ol className="flex flex-col">
          {questions.map((question) => (
            <li
              key={question.documentId}
              className="flex flex-wrap items-start gap-4 border-b border-line py-4 first:border-t"
            >
              <span className="mt-1 font-mono text-xs tabular-nums text-text-subtle">
                {String(question.order).padStart(2, '0')}
              </span>

              <span className="min-w-0 flex-1">
                <span className="block text-text">{question.prompt}</span>
                <span className="mt-1 block text-sm text-text-subtle">
                  Answer: {question.options[question.correctIndex] ?? 'not set'}
                </span>
              </span>

              <span className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => startEdit(question)}
                  aria-label="Edit question"
                  className="flex size-11 cursor-pointer items-center justify-center rounded-control text-text-muted transition-colors hover:bg-shell hover:text-text"
                >
                  <PencilSimpleIcon size={16} aria-hidden />
                </button>
                <button
                  type="button"
                  onClick={() => remove(question)}
                  disabled={busyId === question.documentId}
                  aria-label="Delete question"
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
              {draft.documentId ? 'Edit question' : 'New question'}
            </h3>

            {error ? <FormError>{error}</FormError> : null}

            <TextArea
              label="Question"
              rows={2}
              value={draft.prompt}
              onChange={(e) => setDraft({ ...draft, prompt: e.target.value })}
            />

            <fieldset className="flex flex-col gap-3">
              <legend className="text-sm font-medium text-text">
                Options, with the correct one selected
              </legend>

              {draft.options.map((option, index) => (
                <div key={index} className="flex items-center gap-3">
                  <input
                    type="radio"
                    name="correctIndex"
                    checked={draft.correctIndex === index}
                    onChange={() => setDraft({ ...draft, correctIndex: index })}
                    aria-label={`Mark option ${index + 1} as correct`}
                    className="size-4 shrink-0 cursor-pointer accent-[var(--accent)]"
                  />

                  <input
                    value={option}
                    onChange={(e) => setOption(index, e.target.value)}
                    aria-label={`Option ${index + 1}`}
                    placeholder={`Option ${index + 1}`}
                    className={cn(
                      'h-12 flex-1 rounded-input border bg-surface-raised px-4 text-base text-text',
                      'placeholder:text-text-subtle focus:outline-none',
                      'focus-visible:border-accent focus-visible:ring-2 focus-visible:ring-accent/30',
                      draft.correctIndex === index ? 'border-accent' : 'border-line-strong'
                    )}
                  />

                  <button
                    type="button"
                    onClick={() => removeOption(index)}
                    disabled={draft.options.length <= 2}
                    aria-label={`Remove option ${index + 1}`}
                    className="flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-control text-text-muted transition-colors hover:bg-danger-soft hover:text-danger disabled:opacity-30"
                  >
                    <TrashIcon size={15} aria-hidden />
                  </button>
                </div>
              ))}

              <Button type="button" variant="ghost" size="sm" onClick={addOption} className="self-start">
                <PlusIcon size={14} weight="bold" aria-hidden />
                Add option
              </Button>
            </fieldset>

            <Field
              label="Order"
              type="number"
              min={1}
              value={String(draft.order)}
              onChange={(e) => setDraft({ ...draft, order: Number(e.target.value) })}
            />

            <div className="flex flex-wrap gap-3">
              <Button type="submit" loading={pending}>
                {draft.documentId ? 'Save question' : 'Add question'}
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
