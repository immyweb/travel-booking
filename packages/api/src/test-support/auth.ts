import type { Express } from 'express';
import request from 'supertest';

export type TestUser = {
  email: string;
  password: string;
  name: string;
  cookie: string;
};

let userCounter = 0;

// Matches WEB_APP_URL's default (config/config.ts), which createTestContext
// also passes as auth's trustedOrigins — Better Auth rejects any
// cookie-bearing request whose Origin doesn't match, same as lib/api.ts (web
// package) sets on every real server-to-server call.
const WEB_ORIGIN = 'http://localhost:3000';

// Signs up a real user through Better Auth's own endpoint — rather than
// inserting directly into the `user`/`account` tables — so the returned
// session cookie is one Better Auth itself issued and considers valid. Same
// role seedListing/seedBooking play for the bookings feature.
export async function signUpTestUser(
  app: Express,
  overrides: Partial<{ email: string; password: string; name: string }> = {},
): Promise<TestUser> {
  const email = overrides.email ?? `test-user-${++userCounter}@example.com`;
  const password = overrides.password ?? 'password123';
  const name = overrides.name ?? 'Test User';

  const response = await request(app)
    .post('/api/auth/sign-up/email')
    .set('Origin', WEB_ORIGIN)
    .send({ email, password, name });

  const cookie = response.headers['set-cookie']?.[0]?.split(';')[0];
  if (response.status !== 200 || !cookie) {
    throw new Error(`signUpTestUser failed: ${response.status} ${JSON.stringify(response.body)}`);
  }

  return { email, password, name, cookie };
}
