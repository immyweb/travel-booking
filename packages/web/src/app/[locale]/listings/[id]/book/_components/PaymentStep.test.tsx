import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useEffect } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderWithIntl as render } from '@/test-support/renderWithIntl';
import { PaymentStep } from './PaymentStep';

// A shared spy standing in for the real Stripe instance's confirmCardPayment
// — lets each test drive a decline-then-retry sequence without a real
// Stripe.js/network round trip.
const confirmCardPayment = vi.fn();
const push = vi.fn();
// Stands in for the mounted CardElement instance elements.getElement(CardElement)
// would return — confirmCardPayment is asserted against this same reference.
const mockCardElement = { mock: 'card-element' };

// Partial mock, not a full replacement: '@/i18n/navigation''s createNavigation
// call (which PaymentStep's own useRouter import resolves through) needs the
// rest of the real module (redirect, etc.) at import time.
vi.mock('next/navigation', async (importOriginal) => ({
  ...(await importOriginal<typeof import('next/navigation')>()),
  useRouter: () => ({ push }),
}));
vi.mock('@stripe/stripe-js', () => ({
  loadStripe: () => Promise.resolve(null),
}));
vi.mock('@stripe/react-stripe-js', () => ({
  Elements: ({ children }: { children: React.ReactNode }) => children,
  // Simulates the real Card Element's onReady firing once its iframe mounts
  // (see PaymentStep.tsx) — without this, the "Pay now" button stays
  // disabled in every test, same as the real component would.
  CardElement: (props: { options?: { hidePostalCode?: boolean }; onReady?: () => void }) => {
    useEffect(() => props.onReady?.(), [props.onReady]);
    return (
      <div
        data-testid="card-element"
        data-hide-postal-code={String(props.options?.hidePostalCode)}
      />
    );
  },
  useStripe: () => ({ confirmCardPayment }),
  useElements: () => ({ getElement: () => mockCardElement }),
}));

// The Next.js font loader transform only runs inside Next's own build, not
// under Vitest, so next/font/google resolves to no usable export here.
vi.mock('next/font/google', () => ({
  Bricolage_Grotesque: () => ({ className: 'font-display-mock' }),
}));

beforeEach(() => {
  confirmCardPayment.mockReset();
  push.mockReset();
});

describe('PaymentStep', () => {
  it('hides the postal code field — the booking form collects no billing address elsewhere', () => {
    render(<PaymentStep bookingId="booking-1" clientSecret="pi_test_secret" />);

    expect(screen.getByTestId('card-element')).toHaveAttribute('data-hide-postal-code', 'true');
  });

  it('confirms payment against the given clientSecret and navigates to the booking on success', async () => {
    confirmCardPayment.mockResolvedValueOnce({ paymentIntent: { status: 'succeeded' } });
    const user = userEvent.setup();
    render(<PaymentStep bookingId="booking-1" clientSecret="pi_test_secret" />);

    await user.click(screen.getByRole('button', { name: 'Pay now' }));

    expect(confirmCardPayment).toHaveBeenCalledWith('pi_test_secret', {
      payment_method: { card: mockCardElement },
    });
    expect(push).toHaveBeenCalledWith('/bookings/booking-1');
  });

  it('shows an inline error on a declined card and lets the same Card Element be retried', async () => {
    confirmCardPayment.mockResolvedValueOnce({ error: { message: 'Your card was declined.' } });
    const user = userEvent.setup();
    render(<PaymentStep bookingId="booking-1" clientSecret="pi_test_secret" />);

    await user.click(screen.getByRole('button', { name: 'Pay now' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/card was declined/i);
    // Same Elements/CardElement instance — not unmounted or remounted — so
    // the Guest can retry without losing the held dates.
    expect(screen.getByTestId('card-element')).toBeInTheDocument();
    expect(push).not.toHaveBeenCalled();

    confirmCardPayment.mockResolvedValueOnce({ paymentIntent: { status: 'succeeded' } });
    await user.click(screen.getByRole('button', { name: 'Pay now' }));

    expect(confirmCardPayment).toHaveBeenCalledTimes(2);
    expect(push).toHaveBeenCalledWith('/bookings/booking-1');
  });
});
