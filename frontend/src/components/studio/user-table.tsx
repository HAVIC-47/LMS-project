'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { CheckIcon, WarningCircleIcon } from '@phosphor-icons/react';
import { FormError } from '@/components/ui/field';
import { setUserRole } from '@/lib/manage';
import { ROLE_LABELS, ROLES, type RoleType } from '@/lib/types';
import type { PlatformUser } from '@/lib/api/authoring';
import { cn } from '@/lib/cn';

const ASSIGNABLE: RoleType[] = [ROLES.ADMIN, ROLES.CONTENT_MANAGER, ROLES.INSTRUCTOR, ROLES.STUDENT];

/**
 * The user table, and the one place a role can be changed.
 *
 * A select rather than a promote button, because roles are lateral as often as they are
 * upward: a content manager might become an instructor. The change is saved immediately on
 * choosing, with the row reporting its own state, so there is no separate save step to
 * forget.
 *
 * The backend refuses to demote the last remaining admin. That error is surfaced verbatim
 * rather than pre-empted here: this component would have to duplicate the count to guess
 * at it, and the count it holds is already one request out of date.
 */
export function UserTable({ users, currentUserId }: { users: PlatformUser[]; currentUserId: number }) {
  const [busyId, setBusyId] = useState<number | null>(null);
  const [savedId, setSavedId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const router = useRouter();

  const change = async (user: PlatformUser, role: string) => {
    if (role === user.role?.type) return;

    // Changing your own role can only lose you access to this page, so it asks first.
    if (
      user.id === currentUserId &&
      !window.confirm(
        `Change your own role to ${ROLE_LABELS[role as RoleType]}? You will lose access to the admin panel.`
      )
    ) {
      router.refresh();
      return;
    }

    setBusyId(user.id);
    setError(null);
    setSavedId(null);

    try {
      await setUserRole(user.id, role);
      setSavedId(user.id);
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not change that role.');
      // Put the select back where it was: the value shown must match the server.
      router.refresh();
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      {error ? <FormError>{error}</FormError> : null}

      <div className="flex flex-col">
        {users.map((user) => (
          <div
            key={user.id}
            className="flex flex-wrap items-center justify-between gap-4 border-b border-line py-4 first:border-t"
          >
            <div className="flex min-w-0 flex-col gap-0.5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-medium text-text">{user.username}</span>
                {user.id === currentUserId ? <span className="microlabel">you</span> : null}
                {user.blocked ? (
                  <span className="microlabel text-danger">blocked</span>
                ) : null}
              </div>
              <span className="truncate text-sm text-text-subtle">{user.email}</span>
            </div>

            <div className="flex items-center gap-5">
              <dl className="hidden items-center gap-5 sm:flex">
                <div className="flex items-baseline gap-1.5">
                  <dd className="font-mono text-sm tabular-nums text-text">{user.ownedCourses}</dd>
                  <dt className="microlabel">owns</dt>
                </div>
                <div className="flex items-baseline gap-1.5">
                  <dd className="font-mono text-sm tabular-nums text-text">{user.enrollments}</dd>
                  <dt className="microlabel">enrolled</dt>
                </div>
              </dl>

              <div className="flex items-center gap-2">
                <label htmlFor={`role-${user.id}`} className="sr-only">
                  Role for {user.username}
                </label>
                <select
                  id={`role-${user.id}`}
                  value={user.role?.type ?? ''}
                  disabled={busyId === user.id}
                  onChange={(event) => change(user, event.target.value)}
                  className={cn(
                    'h-11 cursor-pointer rounded-input border border-line-strong bg-surface-raised px-3 text-sm text-text',
                    'transition-[border-color] duration-200 disabled:opacity-50',
                    'focus:outline-none focus-visible:border-accent focus-visible:ring-2 focus-visible:ring-accent/30'
                  )}
                >
                  {!user.role ? <option value="">No role</option> : null}
                  {ASSIGNABLE.map((role) => (
                    <option key={role} value={role}>
                      {ROLE_LABELS[role]}
                    </option>
                  ))}
                </select>

                <span aria-live="polite" className="flex size-5 items-center justify-center">
                  {savedId === user.id ? (
                    <>
                      <CheckIcon size={16} weight="bold" className="text-success" aria-hidden />
                      <span className="sr-only">Role saved</span>
                    </>
                  ) : null}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      <p className="flex items-start gap-2 text-sm text-text-subtle">
        <WarningCircleIcon size={16} className="mt-0.5 shrink-0" aria-hidden />
        Everyone signs up as a student. Roles are only ever assigned here, and the last
        remaining admin cannot be demoted.
      </p>
    </div>
  );
}
