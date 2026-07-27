import { z } from 'zod';

export type Config = {
  db: { url: string };
  server: { port: number };
};

const envSchema = z.object({
  DATABASE_URL: z.string({
    error: 'DATABASE_URL is not set — start Postgres with `bun run db:up`',
  }),
  PORT: z.coerce.number().int().positive().default(4000),
});

// The one place this package reads process.env. Entry points call it once;
// everything else receives config as an argument.
export function configFromEnv(): Config {
  const env = envSchema.parse(process.env);

  return {
    db: { url: env.DATABASE_URL },
    server: { port: env.PORT },
  };
}
