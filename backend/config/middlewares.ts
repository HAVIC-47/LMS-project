import type { Core } from '@strapi/strapi';

/**
 * The frontend runs on a different origin than Strapi (localhost:3000 vs localhost:1337
 * in dev, Vercel vs Railway in production), so CORS has to name that origin explicitly.
 * `credentials: true` is required because the Next.js server sends the Authorization
 * header on behalf of the browser session.
 */
const frontendOrigins = (env: Core.Config.Shared.ConfigParams['env']): string[] => {
  const configured = env('FRONTEND_URL', '');

  return [
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    ...configured
      .split(',')
      .map((origin) => origin.trim())
      .filter(Boolean),
  ];
};

const config = ({ env }: Core.Config.Shared.ConfigParams): Core.Config.Middlewares => [
  'strapi::logger',
  'strapi::errors',
  'strapi::security',
  {
    name: 'strapi::cors',
    config: {
      origin: frontendOrigins(env),
      credentials: true,
      headers: ['Content-Type', 'Authorization', 'Origin', 'Accept'],
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'],
    },
  },
  'strapi::poweredBy',
  'strapi::query',
  'strapi::body',
  'strapi::session',
  'strapi::favicon',
  'strapi::public',
];

export default config;
