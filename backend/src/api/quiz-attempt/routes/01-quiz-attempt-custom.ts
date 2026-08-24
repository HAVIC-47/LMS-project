import { ROLES } from '../../../utils/permissions';

export default {
  routes: [
    {
      method: 'GET',
      path: '/quiz-attempts/me',
      handler: 'quiz-attempt.me',
      config: {
        policies: [{ name: 'global::has-role', config: { roles: [ROLES.STUDENT] } }],
      },
    },
    {
      method: 'GET',
      path: '/quiz-attempts/quiz/:id',
      handler: 'quiz-attempt.forQuiz',
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
