import express, { type Express } from 'express';
import type { Db } from './db/db';
import { createSearchRouter } from './api/search/search.routes';
import { errorHandler, notFoundHandler } from './errors/errors';

export type AppDependencies = {
  db: Db;
};

// The api's composition root: every slice is mounted here, and everything the
// app needs arrives as an argument. Nothing in this file reads the environment.
export function createApp({ db }: AppDependencies): Express {
  const app = express();

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  app.use(createSearchRouter(db));

  // Order is load-bearing: every route first, then the 404 fallback for
  // anything unmatched, then the error seam last so both can reach it.
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
