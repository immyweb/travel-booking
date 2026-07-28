import { z } from 'zod';

export type Config = {
  db: { url: string };
  server: { port: number };
  log: { level: 'fatal' | 'error' | 'warn' | 'info' | 'debug' | 'trace' | 'silent' };
  mailer: { resendApiKey: string; webAppUrl: string };
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
  // Not yet read anywhere — reserved for the confirmation link a later ticket
  // builds into the booking confirmation email.
  WEB_APP_URL: z.url().default('http://localhost:3000'),
});

// The one place this package reads process.env. Entry points call it once;
// everything else receives config as an argument.
export function configFromEnv(): Config {
  const env = envSchema.parse(process.env);

  return {
    db: { url: env.DATABASE_URL },
    server: { port: env.PORT },
    log: { level: env.LOG_LEVEL },
    mailer: { resendApiKey: env.RESEND_API_KEY, webAppUrl: env.WEB_APP_URL },
  };
}
