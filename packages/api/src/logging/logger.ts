import pino, { type Logger } from 'pino';
import type { Config } from '../config/config';

export type { Logger };

// Plain JSON output in every environment — no pino-pretty transport, since
// that runs through a worker thread and Bun's worker-thread support for Pino
// transports is unproven here. A log shipper can format single-line JSON;
// a human reading raw dev output cannot un-garble a broken transport.
export function createLogger(level: Config['log']['level']): Logger {
  return pino({ level });
}
