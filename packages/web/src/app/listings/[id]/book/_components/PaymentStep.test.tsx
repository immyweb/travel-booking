import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PaymentStep } from './PaymentStep';

// A shared spy standing in for the real Stripe instance's confirmPayment —
// lets each test drive a decline-then-retry sequence without a real
// Stripe.js/network round trip.
const confirmPayment = vi.fn();

vi.mock('@stripe/stripe-js', () => ({
  loadStripe: () => Promise.resolve(null),
}));
vi.mock('@stripe/react-stripe-js', () => ({
  Elements: ({ children }: { children: React.ReactNode }) => children,
  PaymentElement: () => <div data-testid="payment-element" />,
  useStripe: () => ({ confirmPayment }),
  useElements: () => ({}),
}));

// The Next.js font loader transform only runs inside Next's own build, not
// under Vitest, so next/font/google resolves to no usable export here.
vi.mock('next/font/google', () => ({
  Bricolage_Grotesque: () => ({ className: 'font-display-mock' }),
}));

beforeEach(() => {
  confirmPayment.mockReset();
});

describe('PaymentStep', () => {
  it('confirms payment against the given clientSecret with a return_url back to the booking', async () => {
    confirmPayment.mockResolvedValueOnce({ paymentIntent: { status: 'succeeded' } });
    const user = userEvent.setup();
    render(<PaymentStep bookingId="booking-1" clientSecret="pi_test_secret" />);

    await user.click(screen.getByRole('button', { name: 'Pay now' }));

    expect(confirmPayment).toHaveBeenCalledWith(
      expect.objectContaining({
        confirmParams: expect.objectContaining({
          return_url: expect.stringContaining('/bookings/booking-1'),
        }),
      }),
    );
  });

  it('shows an inline error on a declined card and lets the same Payment Element be retried', async () => {
    confirmPayment.mockResolvedValueOnce({ error: { message: 'Your card was declined.' } });
    const user = userEvent.setup();
    render(<PaymentStep bookingId="booking-1" clientSecret="pi_test_secret" />);

    await user.click(screen.getByRole('button', { name: 'Pay now' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/card was declined/i);
    // Same Elements/PaymentElement instance — not unmounted or remounted —
    // so the Guest can retry without losing the held dates.
    expect(screen.getByTestId('payment-element')).toBeInTheDocument();

    confirmPayment.mockResolvedValueOnce({ paymentIntent: { status: 'succeeded' } });
    await user.click(screen.getByRole('button', { name: 'Pay now' }));

    expect(confirmPayment).toHaveBeenCalledTimes(2);
  });
});
