import { like } from 'drizzle-orm';
import type { Express } from 'express';
import request from 'supertest';
import { user } from '../db/auth-schema';
import type { Db } from '../db/db';

export type TestUser = {
  id: string;
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

  return { id: response.body.user.id, email, password, name, cookie };
}

// For test files where every seeded booking shares one account (the test
// exercises something other than who a booking belongs to — availability,
// an EXCLUDE constraint, etc.) — signs up once under a marker email domain
// unique to the caller, and returns a cleanup callback to run in `afterAll`.
// Matches the marker-domain pattern signUpTestUser's own callers use
// per-test, just scoped to the whole file instead.
export async function signUpSharedTestUser(
  app: Express,
  db: Db,
  emailDomain: string,
): Promise<{ userId: string; cleanup: () => Promise<void> }> {
  const { id } = await signUpTestUser(app, { email: `booker@${emailDomain}` });

  return {
    userId: id,
    cleanup: async () => {
      await db.delete(user).where(like(user.email, `%@${emailDomain}`));
    },
  };
}
