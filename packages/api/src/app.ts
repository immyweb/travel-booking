import express from 'express';
import { searchRouter } from './features/search';

export const app = express();

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.use(searchRouter);
