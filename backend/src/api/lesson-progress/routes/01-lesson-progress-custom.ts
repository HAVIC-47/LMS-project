import { ROLES } from '../../../utils/permissions';

const STUDENT_ONLY = [{ name: 'global::has-role', config: { roles: [ROLES.STUDENT] } }];

export default {
  routes: [
    {
      method: 'POST',
      path: '/lesson-progresses/complete',
      handler: 'lesson-progress.complete',
      config: { policies: STUDENT_ONLY },
    },
    {
      method: 'POST',
      path: '/lesson-progresses/uncomplete',
      handler: 'lesson-progress.uncomplete',
      config: { policies: STUDENT_ONLY },
    },
  ],
};
