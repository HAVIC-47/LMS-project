/**
 * Profile routes.
 *
 * `PUT /profiles/me` is listed before the `:username` read, which is only cosmetic here —
 * the two differ by method so they could never collide — but it keeps the write, which is
 * the sensitive one, at the top where it is read first.
 *
 * Neither route carries a policy. `show` is genuinely public, and `updateMe` needs nothing
 * beyond "is there a token", which the permission grid already answers: the action is
 * granted to the four signed-in roles and withheld from the public role, so an anonymous
 * request is refused before the handler runs. A `has-role` policy listing all four roles
 * would restate the grid and then drift from it.
 */
export default {
  routes: [
    {
      method: 'PUT',
      path: '/profiles/me',
      handler: 'profile.updateMe',
    },
    {
      method: 'GET',
      path: '/profiles/:username',
      handler: 'profile.show',
    },
  ],
};
