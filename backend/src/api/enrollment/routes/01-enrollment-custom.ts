import { ROLES } from '../../../utils/permissions';

const STUDENT_ONLY = [{ name: 'global::has-role', config: { roles: [ROLES.STUDENT] } }];

/**
 * "Enroll in a course" is a student-only row in the permission matrix — an instructor
 * cannot enroll in their own course, and an admin cannot accidentally become a learner.
 */
export default {
  routes: [
    {
      method: 'POST',
      path: '/enrollments/enroll',
      handler: 'enrollment.enroll',
      config: { policies: STUDENT_ONLY },
    },
    {
      method: 'GET',
      path: '/enrollments/me',
      handler: 'enrollment.me',
      config: { policies: STUDENT_ONLY },
    },
    {
      method: 'DELETE',
      path: '/enrollments/me/:courseId',
      handler: 'enrollment.unenroll',
      config: { policies: STUDENT_ONLY },
    },
  ],
};
