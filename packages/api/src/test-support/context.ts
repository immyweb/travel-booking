import type { Express } from 'express';
import { createApp } from '../app';
import { createAuth, type Auth } from '../auth/auth';
import { configFromEnv } from '../config/config';
import { createDb, type Db } from '../db/db';
import { createLogger } from '../logging/logger';
import { createFakeMailer, type FakeMailer } from './fake-mailer';
import { createFakePaymentProvider, type FakePaymentProvider } from './fake-payment-provider';

export type TestContext = {
  app: Express;
  db: Db;
  mailer: FakeMailer;
  auth: Auth;
  paymentProvider: FakePaymentProvider;
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
  const auth = createAuth({
    db,
    secret: config.auth.secret,
    baseUrl: config.auth.baseUrl,
    webAppUrl: config.webAppUrl,
  });
  const paymentProvider = createFakePaymentProvider();

  return {
    app: createApp({ db, logger, mailer, webAppUrl: config.webAppUrl, auth, paymentProvider }),
    db,
    mailer,
    auth,
    paymentProvider,
  };
}
