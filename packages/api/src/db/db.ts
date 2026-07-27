import { drizzle } from 'drizzle-orm/bun-sql';
import { SQL } from 'bun';

export type Db = ReturnType<typeof createDb>;

// Constructed explicitly by callers rather than at module scope, so importing
// any module that touches data no longer opens a Postgres connection as a side
// effect of the import itself.
export function createDb(url: string) {
  return drizzle({ client: new SQL(url) });
}

// The one definition of how this package reads its database URL. Entry points
// (index.ts, the db scripts, the test harness) call it; nothing else should.
export function databaseUrlFromEnv(): string {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error('DATABASE_URL is not set — start Postgres with `bun run db:up`');
  }

  return url;
}
