import { beforeEach, describe, expect, it, vi } from 'vitest';
import { signUp } from '@/lib/api';
import { submitSignUp } from './_actions';

vi.mock('@/lib/api', () => ({
  signUp: vi.fn(),
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
  name: 'Jane Doe',
  email: 'jane@example.com',
  password: 'password123',
};

beforeEach(() => {
  redirectMock.mockClear();
  vi.mocked(signUp).mockReset();
});

describe('submitSignUp', () => {
  it('returns a validation error without calling signUp when the name is missing', async () => {
    const state = await submitSignUp(null, { ...VALID_INPUT, name: '' });

    expect(state?.error).toBeTruthy();
    expect(signUp).not.toHaveBeenCalled();
  });

  it('returns a validation error for a too-short password without calling signUp', async () => {
    const state = await submitSignUp(null, { ...VALID_INPUT, password: 'short' });

    expect(state?.error).toBeTruthy();
    expect(signUp).not.toHaveBeenCalled();
  });

  it('redirects to "/" on success when no redirectTo was supplied', async () => {
    vi.mocked(signUp).mockResolvedValue({ ok: true });

    await expect(submitSignUp(null, VALID_INPUT)).rejects.toThrow('NEXT_REDIRECT');

    expect(redirectMock).toHaveBeenCalledWith('/');
  });

  it('redirects to a supplied in-app redirectTo on success', async () => {
    vi.mocked(signUp).mockResolvedValue({ ok: true });

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
      vi.mocked(signUp).mockResolvedValue({ ok: true });

      await expect(submitSignUp(null, { ...VALID_INPUT, redirectTo })).rejects.toThrow(
        'NEXT_REDIRECT',
      );

      expect(redirectMock).toHaveBeenCalledWith('/');
    },
  );

  it('returns the message and does not redirect when signUp fails (e.g. a duplicate email)', async () => {
    vi.mocked(signUp).mockResolvedValue({
      ok: false,
      message: 'User already exists. Use another email.',
    });

    const state = await submitSignUp(null, VALID_INPUT);

    expect(state?.error).toBe('User already exists. Use another email.');
    expect(redirectMock).not.toHaveBeenCalled();
  });
});
