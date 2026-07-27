import express from 'express';
import request from 'supertest';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { ApiError, errorHandler, notFoundHandler } from './errors';
import { validateQuery } from './validate';

// A throwaway app per test keeps these off the real router — and off the
// database connection that importing `app` would open.
function appThrowing(err: unknown) {
  const local = express();
  local.get('/boom', async () => {
    throw err;
  });
  local.use(notFoundHandler);
  local.use(errorHandler);
  return local;
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('errorHandler', () => {
  it('renders an ApiError as its own status and message', async () => {
    const response = await request(appThrowing(new ApiError(404, 'Listing not found'))).get(
      '/boom',
    );

    expect(response.status).toBe(404);
    expect(response.body).toEqual({ error: { message: 'Listing not found' } });
  });

  it('includes details when the ApiError carries them', async () => {
    const err = new ApiError(422, 'Unprocessable', { field: 'checkOut' });
    const response = await request(appThrowing(err)).get('/boom');

    expect(response.status).toBe(422);
    expect(response.body.error.details).toEqual({ field: 'checkOut' });
  });

  it('omits the details key entirely when there are none', async () => {
    const response = await request(appThrowing(new ApiError(400, 'Bad'))).get('/boom');

    expect(response.body.error).not.toHaveProperty('details');
  });

  it('converts an unrecognised rejection into a 500 that leaks nothing', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const secret = new Error('connection to postgres://user:hunter2@db failed');

    const response = await request(appThrowing(secret)).get('/boom');

    expect(response.status).toBe(500);
    expect(response.body).toEqual({ error: { message: 'Internal Server Error' } });
    expect(JSON.stringify(response.body)).not.toContain('hunter2');
  });

  it('logs the unrecognised error rather than swallowing it', async () => {
    const logged = vi.spyOn(console, 'error').mockImplementation(() => {});
    const err = new Error('boom');

    await request(appThrowing(err)).get('/boom');

    expect(logged).toHaveBeenCalledWith(err);
  });

  it('responds with JSON, not HTML, for an unmatched path', async () => {
    const response = await request(appThrowing(new Error('unused'))).get('/nope');

    expect(response.status).toBe(404);
    expect(response.headers['content-type']).toMatch(/application\/json/);
    expect(response.body.error.message).toBe('Cannot GET /nope');
  });
});

describe('validateQuery', () => {
  const schema = z.object({ radiusKm: z.coerce.number().positive() });

  function appValidating() {
    const local = express();
    local.get(
      '/thing',
      validateQuery(schema, (query, _req, res) => {
        res.json({ received: query.radiusKm });
      }),
    );
    local.use(notFoundHandler);
    local.use(errorHandler);
    return local;
  }

  it('passes parsed and coerced data to the handler', async () => {
    const response = await request(appValidating()).get('/thing').query({ radiusKm: '10' });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ received: 10 });
  });

  it('rejects invalid input through the same envelope as every other error', async () => {
    const response = await request(appValidating()).get('/thing').query({ radiusKm: 'nonsense' });

    expect(response.status).toBe(400);
    expect(response.body.error.message).toBe('Invalid query parameters');
    expect(response.body.error.details.fieldErrors.radiusKm).toBeDefined();
  });
});
