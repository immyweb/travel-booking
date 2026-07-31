import { z } from 'zod';

export type Config = {
  db: { url: string };
  server: { port: number };
  log: { level: 'fatal' | 'error' | 'warn' | 'info' | 'debug' | 'trace' | 'silent' };
  // Where the web app lives — used both to build the confirmation link in a
  // booking email (mailer) and as the one Origin Better Auth trusts on a
  // cookie-bearing request (auth), so it lives at the top level rather than
  // nested under either one.
  webAppUrl: string;
  mailer: { resendApiKey: string };
  auth: { secret: string; baseUrl: string };
};

const envSchema = z.object({
  DATABASE_URL: z.string({
    error: 'DATABASE_URL is not set — start Postgres with `bun run db:up`',
  }),
  PORT: z.coerce.number().int().positive().default(4000),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),
  RESEND_API_KEY: z.string({
    error: 'RESEND_API_KEY is not set — required to send booking confirmation emails',
  }),
  // Builds the confirmation link inside the booking confirmation email.
  WEB_APP_URL: z.url().default('http://localhost:3000'),
  BETTER_AUTH_SECRET: z.string({
    error: 'BETTER_AUTH_SECRET is not set — required to sign session cookies',
  }),
  // Better Auth's own view of where it's mounted — used to derive the
  // secure-cookie flag and to build any absolute links it generates.
  API_BASE_URL: z.url().default('http://localhost:4000'),
});

// The one place this package reads process.env. Entry points call it once;
// everything else receives config as an argument.
export function configFromEnv(): Config {
  const env = envSchema.parse(process.env);

  return {
    db: { url: env.DATABASE_URL },
    server: { port: env.PORT },
    log: { level: env.LOG_LEVEL },
    webAppUrl: env.WEB_APP_URL,
    mailer: { resendApiKey: env.RESEND_API_KEY },
    auth: { secret: env.BETTER_AUTH_SECRET, baseUrl: env.API_BASE_URL },
  };
}
