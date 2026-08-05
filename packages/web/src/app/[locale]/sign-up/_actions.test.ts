import { http, HttpResponse } from 'msw';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { server } from '@/mocks/server';
import { submitSignUp } from './_actions';

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
  name: 'Jane Doe',
  email: 'jane@example.com',
  password: 'password123',
};

beforeEach(() => {
  redirectMock.mockClear();
});

describe('submitSignUp', () => {
  it('returns a validation error without calling signUp when the name is missing', async () => {
    // The default handler would otherwise silently serve the happy path and
    // this omission would go unnoticed — wrap it in a spy to prove no request
    // reached the network boundary at all.
    const signUpSpy = vi.fn();
    server.use(
      http.post(`${API_URL}/api/auth/sign-up/email`, () => {
        signUpSpy();
        return HttpResponse.json({ user: { id: 'u1' } });
      }),
    );

    const state = await submitSignUp(null, { ...VALID_INPUT, name: '' });

    expect(state?.error).toBeTruthy();
    expect(signUpSpy).not.toHaveBeenCalled();
  });

  it('returns a validation error for a too-short password without calling signUp', async () => {
    const signUpSpy = vi.fn();
    server.use(
      http.post(`${API_URL}/api/auth/sign-up/email`, () => {
        signUpSpy();
        return HttpResponse.json({ user: { id: 'u1' } });
      }),
    );

    const state = await submitSignUp(null, { ...VALID_INPUT, password: 'short' });

    expect(state?.error).toBeTruthy();
    expect(signUpSpy).not.toHaveBeenCalled();
  });

  it('redirects to "/" on success when no redirectTo was supplied', async () => {
    await expect(submitSignUp(null, VALID_INPUT)).rejects.toThrow('NEXT_REDIRECT');

    expect(redirectMock).toHaveBeenCalledWith('/');
  });

  it('redirects to a supplied in-app redirectTo on success', async () => {
    await expect(
      submitSignUp(null, { ...VALID_INPUT, redirectTo: '/listings/1/book' }),
    ).rejects.toThrow('NEXT_REDIRECT');

    expect(redirectMock).toHaveBeenCalledWith('/listings/1/book');
  });

  // Guards the open-redirect vector #26/#27 call out: the `redirect` query
  // param is attacker-controlled, so an absolute or protocol-relative URL
  // must never be followed as-is.
  it.each(['https://evil.example', '//evil.example', 'evil.example'])(
    'falls back to "/" rather than redirecting off-site for redirectTo=%s',
    async (redirectTo) => {
      await expect(submitSignUp(null, { ...VALID_INPUT, redirectTo })).rejects.toThrow(
        'NEXT_REDIRECT',
      );

      expect(redirectMock).toHaveBeenCalledWith('/');
    },
  );

  it('returns the message and does not redirect when signUp fails (e.g. a duplicate email)', async () => {
    server.use(
      http.post(`${API_URL}/api/auth/sign-up/email`, () =>
        HttpResponse.json(
          { message: 'User already exists. Use another email.', code: 'USER_ALREADY_EXISTS' },
          { status: 422 },
        ),
      ),
    );

    const state = await submitSignUp(null, VALID_INPUT);

    expect(state?.error).toBe('User already exists. Use another email.');
    expect(redirectMock).not.toHaveBeenCalled();
  });
});
