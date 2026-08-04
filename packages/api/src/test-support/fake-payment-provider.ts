import { vi } from 'vitest';
import type Stripe from 'stripe';
import type {
  CreatedPaymentIntent,
  CreatePaymentIntentInput,
  PaymentProvider,
} from '../payments/payments';

export type FakePaymentProvider = PaymentProvider & {
  createPaymentIntent: ReturnType<
    typeof vi.fn<(input: CreatePaymentIntentInput) => Promise<CreatedPaymentIntent>>
  >;
  verifyWebhookSignature: ReturnType<
    typeof vi.fn<(payload: string | Buffer, signature: string) => Promise<Stripe.Event>>
  >;
  getCardLast4: ReturnType<typeof vi.fn<(paymentIntentId: string) => Promise<string | null>>>;
  refund: ReturnType<typeof vi.fn<(paymentIntentId: string) => Promise<void>>>;
};

// A fresh fake id per call (rather than a fixed constant) so tests asserting
// `stripe_payment_intent_id` was stored can tell distinct bookings apart.
export function createFakePaymentProvider(): FakePaymentProvider {
  return {
    createPaymentIntent: vi.fn().mockImplementation(async () => {
      const id = `pi_fake_${crypto.randomUUID()}`;
      return { id, clientSecret: `${id}_secret_test` };
    }),
    verifyWebhookSignature: vi.fn(),
    // Stripe's standard test-card last4 — individual tests override with
    // `.mockResolvedValueOnce(...)` where the value itself matters.
    getCardLast4: vi.fn().mockResolvedValue('4242'),
    refund: vi.fn().mockResolvedValue(undefined),
  };
}
