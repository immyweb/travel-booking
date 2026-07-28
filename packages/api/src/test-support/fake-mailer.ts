import { vi } from 'vitest';
import type { Email, Mailer } from '../mailer/mailer';

export type FakeMailer = Mailer & {
  send: ReturnType<typeof vi.fn<(email: Email) => Promise<void>>>;
};

// Resolves by default so most tests never think about the mailer; a test
// asserting the "never fails the booking" behavior can override with
// `mailer.send.mockRejectedValueOnce(...)`.
export function createFakeMailer(): FakeMailer {
  return { send: vi.fn().mockResolvedValue(undefined) };
}
