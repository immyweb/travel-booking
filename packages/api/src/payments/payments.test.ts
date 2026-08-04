import { describe, expect, it, vi } from 'vitest';

const {
  paymentIntentsCreateMock,
  paymentIntentsRetrieveMock,
  webhooksConstructEventMock,
  refundsCreateMock,
} = vi.hoisted(() => ({
  paymentIntentsCreateMock: vi.fn(),
  paymentIntentsRetrieveMock: vi.fn(),
  webhooksConstructEventMock: vi.fn(),
  refundsCreateMock: vi.fn(),
}));

vi.mock('stripe', () => ({
  default: class {
    paymentIntents = { create: paymentIntentsCreateMock, retrieve: paymentIntentsRetrieveMock };
    webhooks = { constructEvent: webhooksConstructEventMock };
    refunds = { create: refundsCreateMock };
  },
}));

const { createStripePaymentProvider } = await import('./payments');

describe('createStripePaymentProvider', () => {
  describe('createPaymentIntent', () => {
    it('creates a PaymentIntent with a lowercased currency and returns its id/clientSecret', async () => {
      paymentIntentsCreateMock.mockResolvedValueOnce({
        id: 'pi_123',
        client_secret: 'pi_123_secret_test',
      });
      const paymentProvider = createStripePaymentProvider('sk_test_dummy', 'whsec_dummy');

      const result = await paymentProvider.createPaymentIntent({
        amount: 50000,
        currency: 'EUR',
        metadata: { bookingId: 'booking-1' },
      });

      expect(paymentIntentsCreateMock).toHaveBeenCalledExactlyOnceWith({
        amount: 50000,
        currency: 'eur',
        metadata: { bookingId: 'booking-1' },
      });
      expect(result).toEqual({ id: 'pi_123', clientSecret: 'pi_123_secret_test' });
    });

    it('throws if Stripe creates a PaymentIntent without a client_secret', async () => {
      paymentIntentsCreateMock.mockResolvedValueOnce({ id: 'pi_123', client_secret: null });
      const paymentProvider = createStripePaymentProvider('sk_test_dummy', 'whsec_dummy');

      await expect(
        paymentProvider.createPaymentIntent({
          amount: 50000,
          currency: 'EUR',
          metadata: { bookingId: 'booking-1' },
        }),
      ).rejects.toThrow('pi_123');
    });
  });

  describe('verifyWebhookSignature', () => {
    it('delegates to the Stripe SDK with the configured webhook secret', () => {
      const fakeEvent = { id: 'evt_123', type: 'payment_intent.succeeded' };
      webhooksConstructEventMock.mockReturnValueOnce(fakeEvent);
      const paymentProvider = createStripePaymentProvider('sk_test_dummy', 'whsec_dummy');

      const event = paymentProvider.verifyWebhookSignature('raw-payload', 'sig-header');

      expect(webhooksConstructEventMock).toHaveBeenCalledExactlyOnceWith(
        'raw-payload',
        'sig-header',
        'whsec_dummy',
      );
      expect(event).toBe(fakeEvent);
    });

    it('propagates Stripe SDK signature-verification failures', () => {
      webhooksConstructEventMock.mockImplementationOnce(() => {
        throw new Error('Invalid signature');
      });
      const paymentProvider = createStripePaymentProvider('sk_test_dummy', 'whsec_dummy');

      expect(() => paymentProvider.verifyWebhookSignature('raw-payload', 'bad-sig')).toThrow(
        'Invalid signature',
      );
    });
  });

  describe('getCardLast4', () => {
    it("retrieves the PaymentIntent with payment_method expanded and returns the card's last4", async () => {
      paymentIntentsRetrieveMock.mockResolvedValueOnce({
        id: 'pi_123',
        payment_method: { card: { last4: '4242' } },
      });
      const paymentProvider = createStripePaymentProvider('sk_test_dummy', 'whsec_dummy');

      const last4 = await paymentProvider.getCardLast4('pi_123');

      expect(paymentIntentsRetrieveMock).toHaveBeenCalledExactlyOnceWith('pi_123', {
        expand: ['payment_method'],
      });
      expect(last4).toBe('4242');
    });

    it('returns null when the PaymentIntent has no attached payment method', async () => {
      paymentIntentsRetrieveMock.mockResolvedValueOnce({ id: 'pi_123', payment_method: null });
      const paymentProvider = createStripePaymentProvider('sk_test_dummy', 'whsec_dummy');

      await expect(paymentProvider.getCardLast4('pi_123')).resolves.toBeNull();
    });

    it('returns null when the payment method has no card (e.g. a non-card method)', async () => {
      paymentIntentsRetrieveMock.mockResolvedValueOnce({
        id: 'pi_123',
        payment_method: { card: undefined },
      });
      const paymentProvider = createStripePaymentProvider('sk_test_dummy', 'whsec_dummy');

      await expect(paymentProvider.getCardLast4('pi_123')).resolves.toBeNull();
    });
  });

  describe('refund', () => {
    it('refunds the given PaymentIntent', async () => {
      refundsCreateMock.mockResolvedValueOnce({ id: 're_123' });
      const paymentProvider = createStripePaymentProvider('sk_test_dummy', 'whsec_dummy');

      await paymentProvider.refund('pi_123');

      expect(refundsCreateMock).toHaveBeenCalledExactlyOnceWith({ payment_intent: 'pi_123' });
    });
  });
});
