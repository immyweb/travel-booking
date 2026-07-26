import type { Request, RequestHandler, Response } from 'express';
import { z, type ZodType } from 'zod';
import { ApiError } from './errors';

// Parsed data is handed to the route as an argument rather than written back
// onto the request: Express 5 defines `req.query` as a getter with no setter,
// so the familiar `req.query = parsed.data` middleware trick is not available.
// Wrapping the handler also keeps the parsed type inferred at the call site.
export function validateQuery<Schema extends ZodType>(
  schema: Schema,
  handler: (query: z.output<Schema>, req: Request, res: Response) => Promise<void> | void,
): RequestHandler {
  return async (req, res) => {
    const parsed = schema.safeParse(req.query);
    if (!parsed.success) {
      // Rejecting here rather than replying keeps the 400 envelope defined in
      // exactly one place (errorHandler).
      throw new ApiError(400, 'Invalid query parameters', z.flattenError(parsed.error));
    }

    await handler(parsed.data, req, res);
  };
}
