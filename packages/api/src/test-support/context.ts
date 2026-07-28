import type { Express } from 'express';
import { createApp } from '../app';
import { configFromEnv } from '../config/config';
import { createDb, type Db } from '../db/db';
import { createLogger } from '../logging/logger';
import { createFakeMailer, type FakeMailer } from './fake-mailer';

export type TestContext = {
  app: Express;
  db: Db;
  mailer: FakeMailer;
};

// Wires the app exactly as index.ts does, so tests exercise the real
// composition rather than a parallel arrangement. Vitest runs each test file in
// its own process (`pool: 'forks'`), so one connection per file is enough. The
// mailer is the one dependency swapped for a fake — tests never make a real
// network call to Resend.
export function createTestContext(): TestContext {
  const config = configFromEnv();
  const db = createDb(config.db.url);
  const logger = createLogger(config.log.level);
  const mailer = createFakeMailer();

  return {
    app: createApp({ db, logger, mailer, webAppUrl: config.mailer.webAppUrl }),
    db,
    mailer,
  };
}
