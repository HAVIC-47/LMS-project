/**
 * The `01-` prefix is load order, not decoration. Strapi registers route files
 * alphabetically, and the core router's `/course-comments/:id` would otherwise match
 * `/course-comments/course/abc` first and hand "course" to `findOne` as an id.
 */
export default {
  routes: [
    {
      method: 'GET',
      path: '/course-comments/course/:courseDocumentId',
      handler: 'course-comment.forCourse',
      // Open to everyone, including logged-out visitors: the course page is public, and a
      // discussion you cannot read before enrolling is a discussion that cannot help you
      // decide whether to enroll.
      config: { policies: [] },
    },
  ],
};
