import { ROLES } from '../../../utils/permissions';

export default {
  routes: [
    {
      method: 'GET',
      path: '/quizzes/:id/take',
      handler: 'quiz.take',
      config: {
        // Enrollment is re-checked in the controller as well; the policy keeps the
        // unauthorized request from reaching any query at all.
        policies: [{ name: 'global::is-enrolled', config: { subject: 'quiz' } }],
      },
    },
    {
      method: 'POST',
      path: '/quizzes/:id/submit',
      handler: 'quiz.submit',
      config: {
        // "Take quizzes" is a student-only row in the permission matrix. Staff can preview
        // a quiz through /take, but an attempt can only be recorded for a student.
        policies: [
          { name: 'global::has-role', config: { roles: [ROLES.STUDENT] } },
          { name: 'global::is-enrolled', config: { subject: 'quiz' } },
        ],
      },
    },
  ],
};
