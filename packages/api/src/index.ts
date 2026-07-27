import { createApp } from './app';
import { configFromEnv } from './config/config';
import { createDb } from './db/db';

// The process entry point, and the only place that turns environment into
// wiring. Everything below it receives what it needs as an argument.
const config = configFromEnv();
const db = createDb(config.db.url);
const app = createApp({ db });

app.listen(config.server.port, () => {
  console.log(`API listening on http://localhost:${config.server.port}`);
});
