import type { Context } from 'koa';
import type { AuthUser } from './permissions';

/**
 * Feature restrictions, separate from being blocked.
 *
 * `blocked` is the users-permissions flag and it is absolute: the plugin refuses the login
 * itself, so a blocked account cannot reach any of this. These two are narrower, and exist
 * because "this person is misusing the comments" and "this person should not be here at
 * all" are different judgements and deserve different buttons.
 *
 *   courseAccessRestricted — cannot enroll or submit a quiz attempt
 *   blogAccessRestricted   — cannot comment or like
 *
 * Both are read from `ctx.state.user`, which is the row loaded from the token on every
 * request. That matters: a restriction applied by an admin takes effect on the offender's
 * very next request, with no need to wait for a session to expire.
 *
 * What neither flag does is hide anything. A restricted student still reads the course and
 * the thread — the restriction is on participating, not on looking, and taking away reading
 * as a side effect of a moderation action would be a surprise.
 */

export const isCourseRestricted = (user?: AuthUser | null) =>
  Boolean(user && (user as { courseAccessRestricted?: boolean }).courseAccessRestricted);

export const isBlogRestricted = (user?: AuthUser | null) =>
  Boolean(user && (user as { blogAccessRestricted?: boolean }).blogAccessRestricted);

/**
 * Refuses the request when the flag is set, and returns whether it did.
 *
 * Returning a boolean rather than throwing keeps the call site a plain early return, which
 * reads better beside the ownership checks it sits next to.
 */
export const denyIfCourseRestricted = (ctx: Context): boolean => {
  if (!isCourseRestricted(ctx.state.user as AuthUser)) return false;

  ctx.forbidden('Your access to course features has been restricted by an administrator.');
  return true;
};

export const denyIfBlogRestricted = (ctx: Context): boolean => {
  if (!isBlogRestricted(ctx.state.user as AuthUser)) return false;

  ctx.forbidden('Your access to blog features has been restricted by an administrator.');
  return true;
};
