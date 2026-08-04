import Stripe from 'stripe';

export type CreatePaymentIntentInput = {
  // Minor units (e.g. cents) — the caller (bookings.service.ts) is
  // responsible for the `totalPrice * 100` conversion, same "never
  // client-supplied" treatment ADR-0001 gives price/currency.
  amount: number;
  currency: string;
  metadata: { bookingId: string };
};

export type CreatedPaymentIntent = {
  id: string;
  clientSecret: string;
};

// Mirrors the existing Mailer port (packages/api/src/mailer/mailer.ts):
// a real adapter wraps the Stripe SDK, a fake stands in for it in tests.
export type PaymentProvider = {
  createPaymentIntent(input: CreatePaymentIntentInput): Promise<CreatedPaymentIntent>;
  verifyWebhookSignature(payload: string | Buffer, signature: string): Stripe.Event;
  // Webhook events carry the PaymentIntent's `payment_method` as a bare id,
  // not the expanded card details — the #32 webhook needs a follow-up call
  // to actually read the card's last4.
  getCardLast4(paymentIntentId: string): Promise<string | null>;
  refund(paymentIntentId: string): Promise<void>;
};

export function createStripePaymentProvider(
  secretKey: string,
  webhookSecret: string,
): PaymentProvider {
  const stripe = new Stripe(secretKey);

  return {
    async createPaymentIntent({ amount, currency, metadata }) {
      const intent = await stripe.paymentIntents.create({
        amount,
        // Stripe requires lowercase ISO currency codes; the listings/
        // bookings tables store currency uppercase (e.g. 'EUR').
        currency: currency.toLowerCase(),
        metadata,
        // Card-only by product decision (ADR-0011) — the frontend only ever
        // mounts a CardElement, so this keeps the PaymentIntent's allowed
        // methods in sync with what it can actually receive.
        payment_method_types: ['card'],
      });

      // Only absent for PaymentIntents created with certain non-default
      // confirmation methods, which this adapter never uses — treat its
      // absence as a bug surfacing loudly rather than silently.
      if (!intent.client_secret) {
        throw new Error(`Stripe PaymentIntent ${intent.id} was created without a client_secret`);
      }

      return { id: intent.id, clientSecret: intent.client_secret };
    },

    verifyWebhookSignature(payload, signature) {
      return stripe.webhooks.constructEvent(payload, signature, webhookSecret);
    },

    async getCardLast4(paymentIntentId) {
      const intent = await stripe.paymentIntents.retrieve(paymentIntentId, {
        expand: ['payment_method'],
      });

      // Expanded, so an object rather than a bare id — except for the (here
      // impossible in practice) case of a PaymentIntent with no attached
      // payment method yet.
      const paymentMethod = intent.payment_method;
      if (!paymentMethod || typeof paymentMethod === 'string') {
        return null;
      }

      return paymentMethod.card?.last4 ?? null;
    },

    async refund(paymentIntentId) {
      await stripe.refunds.create({ payment_intent: paymentIntentId });
    },
  };
}
