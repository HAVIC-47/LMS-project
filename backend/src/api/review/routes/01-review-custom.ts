/**
 * Review routes.
 *
 * The filename is prefixed so it loads before any core router: without it, a core
 * `GET /reviews/:id` would swallow `GET /reviews/course/abc` with `id = "course"`.
 *
 * No policies. `forTarget` is genuinely public — ratings on a published course are part of
 * the catalog — and the two writes need nothing beyond a session, which the permission grid
 * already decides by granting them to signed-in roles and withholding them from the public
 * role. Who may review *what* is a per-record question the controller answers.
 */
export default {
  routes: [
    {
      method: 'GET',
      path: '/reviews/:targetType/:targetDocumentId',
      handler: 'review.forTarget',
    },
    {
      method: 'POST',
      path: '/reviews',
      handler: 'review.submit',
    },
    {
      method: 'DELETE',
      path: '/reviews/:id',
      handler: 'review.remove',
    },
  ],
};
