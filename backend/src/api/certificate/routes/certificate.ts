/**
 * `verify` carries no policy because it is genuinely public — the permission grid grants
 * it to the public role. `me` is granted to signed-in roles and takes the student from the
 * token, so there is no id in the URL to point at somebody else's certificates.
 */
export default {
  routes: [
    {
      method: 'GET',
      path: '/certificates/me',
      handler: 'certificate.me',
    },
    {
      method: 'GET',
      path: '/certificates/verify/:serial',
      handler: 'certificate.verify',
    },
  ],
};
