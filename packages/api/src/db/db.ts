import { drizzle } from 'drizzle-orm/bun-sql';
import { SQL } from 'bun';

export type Db = ReturnType<typeof createDb>;

// Constructed explicitly by callers rather than at module scope, so importing
// any module that touches data no longer opens a Postgres connection as a side
// effect of the import itself.
export function createDb(url: string) {
  return drizzle({ client: new SQL(url) });
}
