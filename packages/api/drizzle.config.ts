import { defineConfig } from 'drizzle-kit';
import { configFromEnv } from './src/config/config';

const config = configFromEnv();

export default defineConfig({
  dialect: 'postgresql',
  schema: './src/db/schema.ts',
  out: './drizzle',
  dbCredentials: {
    url: config.db.url,
  },
});
