import { fileURLToPath } from 'node:url';
import { migrate } from 'drizzle-orm/bun-sql/migrator';
import { configFromEnv } from '../src/config/config';
import { createDb, type Db } from '../src/db/db';

// Resolved against this file rather than the working directory, so the script
// behaves the same however it is invoked.
const MIGRATIONS_FOLDER = fileURLToPath(new URL('../drizzle', import.meta.url));

export async function runMigrations(db: Db) {
  await migrate(db, { migrationsFolder: MIGRATIONS_FOLDER });
}

// Only runs when this file is the process entry point. Importing it — to reuse
// runMigrations, or to read the fixtures next door — must not touch a database.
if (import.meta.main) {
  await runMigrations(createDb(configFromEnv().db.url));
}
