import { beforeEach, describe, expect, it, vi } from 'vitest';
import { signIn } from '@/lib/api';
import { submitSignIn } from './_actions';

vi.mock('@/lib/api', () => ({
  signIn: vi.fn(),
}));

const redirectMock = vi.fn((path: string) => {
  // Mirrors next/navigation's real redirect(), which throws to halt
  // execution — the action relies on this to skip past the return statement.
  throw new Error(`NEXT_REDIRECT: ${path}`);
});
vi.mock('next/navigation', () => ({
  redirect: (path: string) => redirectMock(path),
}));

const VALID_INPUT = {
  email: 'jane@example.com',
  password: 'password123',
};

beforeEach(() => {
  redirectMock.mockClear();
  vi.mocked(signIn).mockReset();
});

describe('submitSignIn', () => {
  it('returns a validation error without calling signIn for a malformed email', async () => {
    const state = await submitSignIn(null, { ...VALID_INPUT, email: 'not-an-email' });

    expect(state?.error).toBeTruthy();
    expect(signIn).not.toHaveBeenCalled();
  });

  it('returns a validation error without calling signIn when the password is missing', async () => {
    const state = await submitSignIn(null, { ...VALID_INPUT, password: '' });

    expect(state?.error).toBeTruthy();
    expect(signIn).not.toHaveBeenCalled();
  });

  it('redirects to "/" on success when no redirectTo was supplied', async () => {
    vi.mocked(signIn).mockResolvedValue({ ok: true });

    await expect(submitSignIn(null, VALID_INPUT)).rejects.toThrow('NEXT_REDIRECT');

    expect(redirectMock).toHaveBeenCalledWith('/');
  });

  it('redirects to a supplied in-app redirectTo on success', async () => {
    vi.mocked(signIn).mockResolvedValue({ ok: true });

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
      vi.mocked(signIn).mockResolvedValue({ ok: true });

      await expect(submitSignIn(null, { ...VALID_INPUT, redirectTo })).rejects.toThrow(
        'NEXT_REDIRECT',
      );

      expect(redirectMock).toHaveBeenCalledWith('/');
    },
  );

  it('returns the message and does not redirect when signIn fails (wrong password/unknown email)', async () => {
    vi.mocked(signIn).mockResolvedValue({
      ok: false,
      message: 'Invalid email or password',
    });

    const state = await submitSignIn(null, VALID_INPUT);

    expect(state?.error).toBe('Invalid email or password');
    expect(redirectMock).not.toHaveBeenCalled();
  });
});
