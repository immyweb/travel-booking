import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import type { Db } from '../db/db';
import { account, session, user, verification } from '../db/auth-schema';

export type AuthDependencies = {
  db: Db;
  secret: string;
  baseUrl: string;
  webAppUrl: string;
};

export type Auth = ReturnType<typeof createAuth>;

// Better Auth owns its own tables and routes end-to-end (see the
// /api/auth/*splat mount in app.ts) — nothing here is hand-rolled the way
// bookings/listings are. `schema` is passed explicitly rather than relying on
// `db`'s own drizzle() config, since createDb (db/db.ts) doesn't pass a full
// schema to the client.
export function createAuth({ db, secret, baseUrl, webAppUrl }: AuthDependencies) {
  return betterAuth({
    database: drizzleAdapter(db, {
      provider: 'pg',
      schema: { user, session, account, verification },
    }),
    secret,
    baseURL: baseUrl,
    // Any request that carries a session cookie (get-session, sign-out, ...)
    // is checked against this list, even when it never touches a browser —
    // lib/api.ts (web package) sets a matching `Origin` header on every call
    // it makes here, since there's no real browser Origin on a
    // server-to-server fetch from Next's Server Actions.
    trustedOrigins: [webAppUrl],
    // Registration/reset-password email verification, social sign-in, and
    // rate limiting are all explicitly out of scope for #26/#27.
    emailAndPassword: { enabled: true },
  });
}
