import { createApp } from './app';
import { createDb, databaseUrlFromEnv } from './db/db';

// The process entry point, and the only place that turns environment into
// wiring. Everything below it receives what it needs as an argument.
const db = createDb(databaseUrlFromEnv());
const app = createApp({ db });
const port = process.env.PORT ?? 4000;

app.listen(port, () => {
  console.log(`API listening on http://localhost:${port}`);
});
