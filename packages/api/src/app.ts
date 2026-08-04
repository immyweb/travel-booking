import { toNodeHandler } from 'better-auth/node';
import express, { type Express } from 'express';
import pinoHttp from 'pino-http';
import type { Auth } from './auth/auth';
import type { Db } from './db/db';
import type { Logger } from './logging/logger';
import type { Mailer } from './mailer/mailer';
import type { PaymentProvider } from './payments/payments';
import { createBookingsRouter } from './api/bookings/bookings.routes';
import { createListingsRouter } from './api/listings/listings.routes';
import { createSearchRouter } from './api/search/search.routes';
import { createWebhooksRouter } from './api/webhooks/webhooks.routes';
import { createErrorHandler, notFoundHandler } from './errors/errors';

export type AppDependencies = {
  db: Db;
  logger: Logger;
  mailer: Mailer;
  webAppUrl: string;
  auth: Auth;
  paymentProvider: PaymentProvider;
};

// The api's composition root: every slice is mounted here, and everything the
// app needs arrives as an argument. Nothing in this file reads the environment.
export function createApp({
  db,
  logger,
  mailer,
  webAppUrl,
  auth,
  paymentProvider,
}: AppDependencies): Express {
  const app = express();

  // First, so every request — including ones that never reach a route — gets
  // logged. Levels mirror the response: 5xx/thrown errors are 'error', 4xx is
  // 'warn', everything else 'info', so severity is readable off the level
  // alone without parsing the status code out of the log line.
  app.use(
    pinoHttp({
      logger,
      customLogLevel: (_req, res, err) => {
        if (err || res.statusCode >= 500) return 'error';
        if (res.statusCode >= 400) return 'warn';
        return 'info';
      },
    }),
  );

  // Better Auth owns request parsing for its own routes and must be mounted
  // before express.json() — parsing the body first leaves nothing for
  // Better Auth's handler to read, and its client hangs on "pending".
  app.all('/api/auth/*splat', toNodeHandler(auth));

  // Same ordering concern as Better Auth above: Stripe signs the exact raw
  // bytes of the request body, so this route parses its own body (via
  // express.raw, inside the router itself) ahead of the global express.json()
  // below rather than relying on it.
  app.use(createWebhooksRouter({ db, mailer, webAppUrl, paymentProvider, logger }));

  // Only write routes (POST /bookings, and Better Auth's own routes above)
  // need a parsed JSON body.
  app.use(express.json());

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  app.use(createSearchRouter(db));
  app.use(createListingsRouter(db));
  app.use(createBookingsRouter({ db, auth, paymentProvider }));

  // Order is load-bearing: every route first, then the 404 fallback for
  // anything unmatched, then the error seam last so both can reach it.
  app.use(notFoundHandler);
  app.use(createErrorHandler(logger));

  return app;
}
