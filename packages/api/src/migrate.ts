import { migrate } from 'drizzle-orm/bun-sql/migrator';
import { db } from './db';

await migrate(db, { migrationsFolder: './drizzle' });
