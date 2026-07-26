import { migrate } from 'drizzle-orm/bun-sql/migrator';
import { createDb, databaseUrlFromEnv } from './db';

await migrate(createDb(databaseUrlFromEnv()), { migrationsFolder: './drizzle' });
