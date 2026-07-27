import type { ErrorResponse } from '@travel-booking/core';
import type { ErrorRequestHandler, RequestHandler } from 'express';
import type { Logger } from '../logging/logger';

// Throw this from anywhere in a handler. Express 5 forwards both synchronous
// throws and rejected promises to the error handler below, so routes never
// build a status/body pair themselves.
export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly details?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

// Unmatched paths. Without this Express's built-in handler replies with HTML,
// which would make 404 the one response shape clients can't parse.
export const notFoundHandler: RequestHandler = (req) => {
  throw new ApiError(404, `Cannot ${req.method} ${req.path}`);
};

// Must be registered last, and must take four parameters — that arity is how
// Express recognises a handler as an error handler rather than a route.
export function createErrorHandler(logger: Logger): ErrorRequestHandler {
  return (err, _req, res, next) => {
    // Once the response has started there is no envelope left to write; handing
    // back to Express's default handler is the only way to close the connection.
    if (res.headersSent) {
      next(err);
      return;
    }

    if (err instanceof ApiError) {
      const body: ErrorResponse = { error: { message: err.message } };
      if (err.details !== undefined) {
        body.error.details = err.details;
      }
      res.status(err.status).json(body);
      return;
    }

    // Anything else is a bug rather than a client mistake: log it whole, and
    // tell the client nothing that could expose internals. pino-http's own
    // request-level log line carries method/path/status but not the Error
    // itself, so this is the one place the stack trace is captured.
    logger.error(err);
    res.status(500).json({ error: { message: 'Internal Server Error' } } satisfies ErrorResponse);
  };
}
