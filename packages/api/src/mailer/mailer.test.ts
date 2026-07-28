import { describe, expect, it, vi } from 'vitest';

const { sendMock } = vi.hoisted(() => ({ sendMock: vi.fn() }));

vi.mock('resend', () => ({
  Resend: class {
    emails = { send: sendMock };
  },
}));

const { createResendMailer } = await import('./mailer');

describe('createResendMailer', () => {
  it('sends via the Resend SDK with the right recipient, subject, and idempotency key', async () => {
    sendMock.mockResolvedValueOnce({ data: { id: 'email_123' }, error: null });
    const mailer = createResendMailer('test-api-key');

    await mailer.send({
      to: 'jane@example.com',
      subject: 'Booking confirmed',
      react: 'placeholder-content',
      idempotencyKey: 'booking-confirmation/abc-123',
    });

    expect(sendMock).toHaveBeenCalledWith(
      expect.objectContaining({ to: 'jane@example.com', subject: 'Booking confirmed' }),
      { idempotencyKey: 'booking-confirmation/abc-123' },
    );
  });

  it('rejects when Resend reports an error rather than throwing itself', async () => {
    sendMock.mockResolvedValueOnce({
      data: null,
      error: { name: 'validation_error', message: 'Invalid `to` field' },
    });
    const mailer = createResendMailer('test-api-key');

    await expect(
      mailer.send({
        to: 'not-an-email',
        subject: 'Booking confirmed',
        react: 'placeholder-content',
        idempotencyKey: 'booking-confirmation/abc-123',
      }),
    ).rejects.toThrow('Invalid `to` field');
  });
});
