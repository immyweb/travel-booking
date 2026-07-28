import { Resend } from 'resend';

// `react` is untyped here on purpose: the concrete email content (a
// react-email component) lands in a separate ticket, and this port shouldn't
// pull in a React dependency just to describe its shape. Resend's own SDK
// accepts whatever is passed through at send time.
export type Email = {
  to: string;
  subject: string;
  react: unknown;
  idempotencyKey: string;
};

export type Mailer = {
  send(email: Email): Promise<void>;
};

// Shared v1 sandbox sender — no custom domain is verified yet (see #21).
const FROM = 'onboarding@resend.dev';

export function createResendMailer(apiKey: string): Mailer {
  const resend = new Resend(apiKey);

  return {
    async send({ to, subject, react, idempotencyKey }) {
      const { error } = await resend.emails.send(
        { from: FROM, to, subject, react: react as never },
        { idempotencyKey },
      );

      // Resend reports API-level failures via this field rather than
      // throwing, so callers awaiting `send()` would otherwise see it as a
      // silent success — normalize both failure modes to a rejection.
      if (error) {
        throw new Error(`Resend failed to send email: ${error.message}`);
      }
    },
  };
}
