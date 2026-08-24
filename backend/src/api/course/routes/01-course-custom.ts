import { ROLES } from '../../../utils/permissions';

/**
 * Custom course routes.
 *
 * The filename is prefixed so it loads before `course.ts`. Route files are registered in
 * filename order and Koa matches in registration order — without the prefix, the core
 * router's `GET /courses/:id` would swallow `GET /courses/mine` with `id = "mine"`.
 */
export default {
  routes: [
    {
      method: 'GET',
      path: '/courses/mine',
      handler: 'course.mine',
      config: {
        policies: [
          {
            name: 'global::has-role',
            config: { roles: [ROLES.ADMIN, ROLES.CONTENT_MANAGER, ROLES.INSTRUCTOR] },
          },
        ],
      },
    },
    {
      method: 'GET',
      path: '/courses/slug/:slug',
      handler: 'course.bySlug',
      config: { policies: [] },
    },
    {
      method: 'GET',
      path: '/courses/:id/my-progress',
      handler: 'course.myProgress',
      config: {
        policies: [],
      },
    },
    {
      method: 'GET',
      path: '/courses/:id/students-progress',
      handler: 'course.studentsProgress',
      config: {
        policies: [
          {
            name: 'global::has-role',
            config: { roles: [ROLES.ADMIN, ROLES.CONTENT_MANAGER, ROLES.INSTRUCTOR] },
          },
          { name: 'global::owns-course', config: { subject: 'course' } },
        ],
      },
    },
  ],
};
