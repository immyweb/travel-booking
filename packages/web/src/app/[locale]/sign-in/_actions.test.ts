import { http, HttpResponse } from 'msw';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { server } from '@/mocks/server';
import { submitSignIn } from './_actions';

const API_URL = 'http://localhost:4000';

const redirectMock = vi.fn((path: string) => {
  // Mirrors next/navigation's real redirect(), which throws to halt
  // execution — the action relies on this to skip past the return statement.
  throw new Error(`NEXT_REDIRECT: ${path}`);
});
// Partial mock, not a full replacement: '@/i18n/navigation''s redirect (which
// the action now calls, not next/navigation's directly) still delegates to
// this underlying next/navigation redirect with the final, locale-resolved
// href — for the 'en' default locale under as-needed prefixing (the mocked
// getLocale in vitest.setup.ts), that's the same unprefixed string.
vi.mock('next/navigation', async (importOriginal) => ({
  ...(await importOriginal<typeof import('next/navigation')>()),
  redirect: (path: string) => redirectMock(path),
}));

const VALID_INPUT = {
  email: 'jane@example.com',
  password: 'password123',
};

beforeEach(() => {
  redirectMock.mockClear();
});

describe('submitSignIn', () => {
  it('returns a validation error without calling signIn for a malformed email', async () => {
    // The default handler would otherwise silently serve the happy path and
    // this omission would go unnoticed — wrap it in a spy to prove no request
    // reached the network boundary at all.
    const signInSpy = vi.fn();
    server.use(
      http.post(`${API_URL}/api/auth/sign-in/email`, () => {
        signInSpy();
        return HttpResponse.json({ user: { id: 'u1' } });
      }),
    );

    const state = await submitSignIn(null, { ...VALID_INPUT, email: 'not-an-email' });

    expect(state?.error).toBeTruthy();
    expect(signInSpy).not.toHaveBeenCalled();
  });

  it('returns a validation error without calling signIn when the password is missing', async () => {
    const signInSpy = vi.fn();
    server.use(
      http.post(`${API_URL}/api/auth/sign-in/email`, () => {
        signInSpy();
        return HttpResponse.json({ user: { id: 'u1' } });
      }),
    );

    const state = await submitSignIn(null, { ...VALID_INPUT, password: '' });

    expect(state?.error).toBeTruthy();
    expect(signInSpy).not.toHaveBeenCalled();
  });

  it('redirects to "/" on success when no redirectTo was supplied', async () => {
    await expect(submitSignIn(null, VALID_INPUT)).rejects.toThrow('NEXT_REDIRECT');

    expect(redirectMock).toHaveBeenCalledWith('/');
  });

  it('redirects to a supplied in-app redirectTo on success', async () => {
    await expect(
      submitSignIn(null, { ...VALID_INPUT, redirectTo: '/listings/1/book' }),
    ).rejects.toThrow('NEXT_REDIRECT');

    expect(redirectMock).toHaveBeenCalledWith('/listings/1/book');
  });

  // Guards the open-redirect vector #26/#27 call out: the `redirect` query
  // param is attacker-controlled, so an absolute or protocol-relative URL
  // must never be followed as-is.
  it.each(['https://evil.example', '//evil.example', 'evil.example'])(
    'falls back to "/" rather than redirecting off-site for redirectTo=%s',
    async (redirectTo) => {
      await expect(submitSignIn(null, { ...VALID_INPUT, redirectTo })).rejects.toThrow(
        'NEXT_REDIRECT',
      );

      expect(redirectMock).toHaveBeenCalledWith('/');
    },
  );

  it('returns the message and does not redirect when signIn fails (wrong password/unknown email)', async () => {
    server.use(
      http.post(`${API_URL}/api/auth/sign-in/email`, () =>
        HttpResponse.json(
          { message: 'Invalid email or password', code: 'INVALID_EMAIL_OR_PASSWORD' },
          { status: 401 },
        ),
      ),
    );

    const state = await submitSignIn(null, VALID_INPUT);

    expect(state?.error).toBe('Invalid email or password');
    expect(redirectMock).not.toHaveBeenCalled();
  });
});
