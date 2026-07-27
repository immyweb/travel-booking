import type { Express } from 'express';
import { createApp } from '../app';
import { configFromEnv } from '../config/config';
import { createDb, type Db } from '../db/db';

export type TestContext = {
  app: Express;
  db: Db;
};

// Wires the app exactly as index.ts does, so tests exercise the real
// composition rather than a parallel arrangement. Vitest runs each test file in
// its own process (`pool: 'forks'`), so one connection per file is enough.
export function createTestContext(): TestContext {
  const db = createDb(configFromEnv().db.url);

  return { app: createApp({ db }), db };
}
