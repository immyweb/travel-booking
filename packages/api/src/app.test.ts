import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { createTestContext } from './test-support/context';

const { app } = createTestContext();

describe('GET /health', () => {
  it('returns ok status', async () => {
    const response = await request(app).get('/health');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: 'ok' });
  });
});

// Guards the registration order in app.ts: routes, then notFoundHandler, then
// errorHandler. Get it wrong and unmatched paths fall back to Express's HTML.
describe('unmatched routes', () => {
  it('returns the shared JSON error envelope', async () => {
    const response = await request(app).get('/no-such-route');

    expect(response.status).toBe(404);
    expect(response.headers['content-type']).toMatch(/application\/json/);
    expect(response.body).toEqual({ error: { message: 'Cannot GET /no-such-route' } });
  });
});
