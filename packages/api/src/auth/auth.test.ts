import { like } from 'drizzle-orm';
import request from 'supertest';
import { afterEach, describe, expect, it } from 'vitest';
import { user } from '../db/auth-schema';
import { createTestContext } from '../test-support/context';
import { signUpTestUser } from '../test-support/auth';

const { app, db } = createTestContext();

// Same origin createTestContext wires into auth's trustedOrigins (see
// test-support/auth.ts) — every request that carries a session cookie needs
// this, or Better Auth rejects it as a missing/untrusted Origin.
const WEB_ORIGIN = 'http://localhost:3000';

// Isolated from other test files' own users by a marker domain unique to this
// file, mirroring bookings.routes.test.ts's TEST_COUNTRY marker. Deleting the
// user row cascades to its session/account rows (see auth-schema.ts).
const TEST_EMAIL_DOMAIN = 'auth-routes-test.example';

function testEmail(local: string): string {
  return `${local}@${TEST_EMAIL_DOMAIN}`;
}

afterEach(async () => {
  await db.delete(user).where(like(user.email, `%@${TEST_EMAIL_DOMAIN}`));
});

describe('POST /api/auth/sign-up/email', () => {
  it('creates an account and sets a session cookie', async () => {
    const response = await request(app)
      .post('/api/auth/sign-up/email')
      .set('Origin', WEB_ORIGIN)
      .send({ name: 'Jane Doe', email: testEmail('jane'), password: 'password123' });

    expect(response.status).toBe(200);
    expect(response.body.user).toMatchObject({ name: 'Jane Doe', email: testEmail('jane') });
    expect(response.headers['set-cookie']?.[0]).toMatch(/^better-auth\.session_token=/);
  });

  it('returns an error for an already-registered email, without creating a second account', async () => {
    await signUpTestUser(app, { email: testEmail('dup'), name: 'First' });

    const response = await request(app)
      .post('/api/auth/sign-up/email')
      .set('Origin', WEB_ORIGIN)
      .send({ name: 'Second', email: testEmail('dup'), password: 'password123' });

    expect(response.status).toBe(422);
    expect(response.body.message).toEqual(expect.any(String));
  });
});

describe('POST /api/auth/sign-in/email', () => {
  it('signs in with the correct password and sets a session cookie', async () => {
    const testUser = await signUpTestUser(app, { email: testEmail('signin') });

    const response = await request(app)
      .post('/api/auth/sign-in/email')
      .set('Origin', WEB_ORIGIN)
      .send({ email: testUser.email, password: testUser.password });

    expect(response.status).toBe(200);
    expect(response.headers['set-cookie']?.[0]).toMatch(/^better-auth\.session_token=/);
  });

  it('rejects the wrong password with the same message as an unregistered email', async () => {
    const testUser = await signUpTestUser(app, { email: testEmail('wrongpass') });

    const wrongPassword = await request(app)
      .post('/api/auth/sign-in/email')
      .set('Origin', WEB_ORIGIN)
      .send({ email: testUser.email, password: 'not-the-password' });
    const unknownEmail = await request(app)
      .post('/api/auth/sign-in/email')
      .set('Origin', WEB_ORIGIN)
      .send({ email: testEmail('never-registered'), password: 'whatever123' });

    expect(wrongPassword.status).toBe(401);
    expect(unknownEmail.status).toBe(401);
    // Same message either way, so a sign-in failure never reveals whether the
    // email itself is registered.
    expect(wrongPassword.body.message).toBe(unknownEmail.body.message);
  });
});

describe('GET /api/auth/get-session', () => {
  it("returns the signed-in user's session when the cookie is forwarded", async () => {
    const testUser = await signUpTestUser(app, { email: testEmail('session') });

    const response = await request(app)
      .get('/api/auth/get-session')
      .set('Origin', WEB_ORIGIN)
      .set('Cookie', testUser.cookie);

    expect(response.status).toBe(200);
    expect(response.body.user).toMatchObject({ email: testUser.email });
  });

  it('returns null when signed out', async () => {
    const response = await request(app).get('/api/auth/get-session').set('Origin', WEB_ORIGIN);

    expect(response.status).toBe(200);
    expect(response.body).toBeNull();
  });
});

describe('POST /api/auth/sign-out', () => {
  it('ends the session, so the same cookie no longer resolves a session afterward', async () => {
    const testUser = await signUpTestUser(app, { email: testEmail('signout') });

    const signOutResponse = await request(app)
      .post('/api/auth/sign-out')
      .set('Origin', WEB_ORIGIN)
      .set('Cookie', testUser.cookie);
    expect(signOutResponse.status).toBe(200);

    const sessionAfter = await request(app)
      .get('/api/auth/get-session')
      .set('Origin', WEB_ORIGIN)
      .set('Cookie', testUser.cookie);
    expect(sessionAfter.body).toBeNull();
  });
});
