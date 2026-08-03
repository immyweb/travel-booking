import { z } from 'zod';

// The User half of a Session (see CONTEXT.md) as Better Auth's own
// get-session endpoint returns it — shared so the web package can parse it
// against the same contract on both the server and any future client code.
export const SessionUserSchema = z.object({ id: z.string(), name: z.string(), email: z.string() });
export type SessionUser = z.infer<typeof SessionUserSchema>;

// Better Auth's own REST endpoints reply with a flat `{ code, message }` on
// failure, not this app's own `{ error: { message } }` envelope (see
// ErrorResponseSchema in shared.ts), so it needs its own contract.
export const BetterAuthErrorSchema = z.object({ message: z.string() });
export type BetterAuthError = z.infer<typeof BetterAuthErrorSchema>;

// The outcome of signUp/signIn/signOut as the web client discriminates it —
// a rejected credential (Better Auth's own message) re-renders the form
// rather than being treated as a failure.
export type AuthActionResult = { ok: true } | { ok: false; message: string };
