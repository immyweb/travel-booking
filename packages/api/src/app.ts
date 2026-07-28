import express, { type Express } from 'express';
import pinoHttp from 'pino-http';
import type { Db } from './db/db';
import type { Logger } from './logging/logger';
import type { Mailer } from './mailer/mailer';
import { createBookingsRouter } from './api/bookings/bookings.routes';
import { createListingsRouter } from './api/listings/listings.routes';
import { createSearchRouter } from './api/search/search.routes';
import { createErrorHandler, notFoundHandler } from './errors/errors';

export type AppDependencies = {
  db: Db;
  logger: Logger;
  mailer: Mailer;
  webAppUrl: string;
};

// The api's composition root: every slice is mounted here, and everything the
// app needs arrives as an argument. Nothing in this file reads the environment.
export function createApp({ db, logger, mailer, webAppUrl }: AppDependencies): Express {
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

  // Only write route so far (POST /bookings) needs a parsed JSON body.
  app.use(express.json());

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  app.use(createSearchRouter(db));
  app.use(createListingsRouter(db));
  app.use(createBookingsRouter({ db, mailer, logger, webAppUrl }));

  // Order is load-bearing: every route first, then the 404 fallback for
  // anything unmatched, then the error seam last so both can reach it.
  app.use(notFoundHandler);
  app.use(createErrorHandler(logger));

  return app;
}
