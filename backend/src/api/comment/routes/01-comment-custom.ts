export default {
  routes: [
    {
      method: 'GET',
      path: '/comments/post/:postDocumentId',
      handler: 'comment.forPost',
      // Open to everyone, including logged-out visitors: the discussion under a published
      // post is part of the post.
      config: { policies: [] },
    },
  ],
};
