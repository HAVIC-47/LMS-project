import type { Core } from '@strapi/strapi';

const allowedMediaTypes = [
  'image/*',
  'video/*',
  'audio/*',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.*',
  'text/plain',
  'text/csv',
];

const deniedExecutableTypes = [
  'application/vnd.microsoft.portable-executable',
  'application/x-msdownload',
  'application/x-msdos-program',
  'application/x-executable',
  'application/x-dosexec',
  'application/x-sh',
  'text/x-shellscript',
  'application/x-mach-binary',
];

const config = ({ env }: Core.Config.Shared.ConfigParams): Core.Config.Plugin => ({
  'users-permissions': {
    config: {
      /**
       * `legacy-support` issues a single self-contained JWT from `POST /api/auth/local`.
       *
       * The alternative, `refresh`, splits auth into a short-lived access token plus a
       * refresh token that the plugin stores in its own cookie. We already keep the token
       * in an httpOnly cookie that the Next.js route handlers own (see frontend, Part 2),
       * so a second plugin-managed cookie would mean two competing session lifetimes and
       * a refresh dance on every expired request. One token, one cookie, one owner.
       */
      jwtManagement: 'legacy-support',
      jwt: {
        expiresIn: env('JWT_EXPIRES_IN', '7d'),
      },
      /**
       * Empty `allowedFields` is the default, but it is spelled out here because it is a
       * security boundary: it stops `POST /api/auth/local/register` from accepting a
       * `role` in the request body. Without it a visitor could sign themselves up as an
       * admin. Roles are only ever assigned by an admin via /api/platform/users/:id/role.
       */
      register: {
        allowedFields: [],
      },
    },
  },
  upload: {
    config: {
      security: {
        allowedTypes: allowedMediaTypes,
        deniedTypes: deniedExecutableTypes,
      },
    },
  },
});

export default config;
