import { BetterAuthErrorSchema, ErrorResponseSchema } from '@travel-booking/core';

// The api replies with one error envelope for every non-2xx (see
// api/src/http/errors.ts). safeParse, because an error from a proxy or load
// balancer won't be in our envelope. Shared by `failed()` (which throws) and
// any caller that needs the message without throwing, like createBooking's
// 400 branch.
export async function errorMessageFrom(response: Response, fallback: string): Promise<string> {
  const body: unknown = await response.json().catch(() => null);
  const parsed = ErrorResponseSchema.safeParse(body);
  return parsed.success ? parsed.data.error.message : fallback;
}

export async function failed(route: string, response: Response): Promise<never> {
  const detail = await errorMessageFrom(response, response.statusText);
  throw new Error(`${route} failed with status ${response.status}: ${detail}`);
}

// Better Auth's own REST endpoints (mounted in Express — see ADR-0002 and
// api/src/auth/auth.ts) reply with a flat `{ code, message }` on failure, not
// this app's own `{ error: { message } }` envelope, so it needs its own
// parser rather than reusing errorMessageFrom.
export async function betterAuthErrorMessageFrom(
  response: Response,
  fallback: string,
): Promise<string> {
  const body: unknown = await response.json().catch(() => null);
  const parsed = BetterAuthErrorSchema.safeParse(body);
  return parsed.success ? parsed.data.message : fallback;
}
