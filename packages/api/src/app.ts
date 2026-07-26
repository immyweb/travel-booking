import express from 'express';
import { searchRouter } from './features/search/routes';
import { errorHandler, notFoundHandler } from './http/errors';

export const app = express();

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.use(searchRouter);

// Order is load-bearing: every route first, then the 404 fallback for anything
// unmatched, then the error seam last so both can reach it.
app.use(notFoundHandler);
app.use(errorHandler);
