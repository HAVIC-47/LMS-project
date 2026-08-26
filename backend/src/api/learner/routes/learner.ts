import { ROLES } from '../../../utils/permissions';

/**
 * One learner's record, for the three roles allowed to view student progress.
 *
 * `has-role` is the only policy. There is no `owns-course` equivalent to hang here because
 * the subject is a *person*, not a course — an instructor is not refused, they are shown
 * the student's work on their own courses and nothing else. That narrowing happens in the
 * controller's query, which is the only place that knows which courses are in scope.
 */
export default {
  routes: [
    {
      method: 'GET',
      path: '/learners/:id',
      handler: 'learner.show',
      config: {
        policies: [
          {
            name: 'global::has-role',
            config: { roles: [ROLES.ADMIN, ROLES.CONTENT_MANAGER, ROLES.INSTRUCTOR] },
          },
        ],
      },
    },
  ],
};
