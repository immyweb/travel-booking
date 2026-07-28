import { createApp } from './app';
import { configFromEnv } from './config/config';
import { createDb } from './db/db';
import { createLogger } from './logging/logger';
import { createResendMailer } from './mailer/mailer';

// The process entry point, and the only place that turns environment into
// wiring. Everything below it receives what it needs as an argument.
const config = configFromEnv();
const db = createDb(config.db.url);
const logger = createLogger(config.log.level);
const mailer = createResendMailer(config.mailer.resendApiKey);
const app = createApp({ db, logger, mailer, webAppUrl: config.mailer.webAppUrl });

app.listen(config.server.port, () => {
  logger.info(`API listening on http://localhost:${config.server.port}`);
});
