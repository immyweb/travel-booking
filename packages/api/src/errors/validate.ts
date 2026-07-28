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

// Path params get the same treatment as query params, for the same reason:
// Express 5's `req.params` has no setter either, so parsed data is handed to
// the route as an argument rather than written back onto the request.
export function validateParams<Schema extends ZodType>(
  schema: Schema,
  handler: (params: z.output<Schema>, req: Request, res: Response) => Promise<void> | void,
): RequestHandler {
  return async (req, res) => {
    const parsed = schema.safeParse(req.params);
    if (!parsed.success) {
      throw new ApiError(400, 'Invalid path parameters', z.flattenError(parsed.error));
    }

    await handler(parsed.data, req, res);
  };
}

// JSON body validation, for write routes like POST /bookings. Express 5 still
// allows writing `req.body` (unlike `req.query`/`req.params`, which are
// getter-only), but parsed data is passed as an argument anyway, for the same
// inferred-type-at-the-call-site benefit the other two get.
export function validateBody<Schema extends ZodType>(
  schema: Schema,
  handler: (body: z.output<Schema>, req: Request, res: Response) => Promise<void> | void,
): RequestHandler {
  return async (req, res) => {
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      throw new ApiError(400, 'Invalid request body', z.flattenError(parsed.error));
    }

    await handler(parsed.data, req, res);
  };
}

// For routes that need both — e.g. GET /listings/:id, where the id is a path
// param and checkIn/checkOut are query params. A single pass so a bad path
// param 400s before a bad query param is even parsed.
export function validateParamsAndQuery<ParamsSchema extends ZodType, QuerySchema extends ZodType>(
  paramsSchema: ParamsSchema,
  querySchema: QuerySchema,
  handler: (
    params: z.output<ParamsSchema>,
    query: z.output<QuerySchema>,
    req: Request,
    res: Response,
  ) => Promise<void> | void,
): RequestHandler {
  return async (req, res) => {
    const parsedParams = paramsSchema.safeParse(req.params);
    if (!parsedParams.success) {
      throw new ApiError(400, 'Invalid path parameters', z.flattenError(parsedParams.error));
    }

    const parsedQuery = querySchema.safeParse(req.query);
    if (!parsedQuery.success) {
      throw new ApiError(400, 'Invalid query parameters', z.flattenError(parsedQuery.error));
    }

    await handler(parsedParams.data, parsedQuery.data, req, res);
  };
}
