'use client';

import { CardElement, Elements, useElements, useStripe } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { displayFont } from '@/app/_components/fonts';
import { Button } from '@/components/ui/button';

// Loaded once at module scope, not per render — loadStripe itself caches the
// underlying script tag, but re-invoking it on every render would still
// re-run that check pointlessly. Safe to call during SSR: loadStripe
// resolves to null outside a browser rather than throwing.
const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? '');

type PaymentStepProps = {
  bookingId: string;
  clientSecret: string;
};

export function PaymentStep({ bookingId, clientSecret }: PaymentStepProps) {
  return (
    <div className="flex flex-col gap-4">
      <h2 className={`${displayFont.className} text-xl font-semibold text-azulejo`}>Payment</h2>
      <Elements stripe={stripePromise} options={{ clientSecret }}>
        <PaymentForm bookingId={bookingId} clientSecret={clientSecret} />
      </Elements>
    </div>
  );
}

function PaymentForm({ bookingId, clientSecret }: { bookingId: string; clientSecret: string }) {
  const stripe = useStripe();
  const elements = useElements();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  // Elements register with `elements` via a ref, not React state, so
  // `elements.getElement(CardElement)` doesn't become non-null until the
  // Card Element's iframe finishes mounting — and nothing re-renders this
  // component when that happens. onReady is the actual signal; the button's
  // disabled state tracks it directly instead of a stale getElement() read,
  // so it can't diverge from what handleSubmit (which looks up the element
  // fresh, at click time) will actually find.
  const [cardReady, setCardReady] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const cardElement = elements?.getElement(CardElement);
    if (!stripe || !cardElement) {
      return;
    }

    setSubmitting(true);
    setError(null);

    // A decline resolves here with `error` rather than throwing — the same
    // Card Element stays mounted against the same clientSecret /
    // PaymentIntent, so the Guest can correct or swap their card and submit
    // again without losing the held dates or restarting the booking.
    const { error: confirmError } = await stripe.confirmCardPayment(clientSecret, {
      payment_method: { card: cardElement },
    });

    if (confirmError) {
      setError(confirmError.message ?? 'Your payment could not be confirmed. Please try again.');
      setSubmitting(false);
      return;
    }

    // confirmCardPayment resolves in place rather than redirecting via a
    // return_url (unlike confirmPayment) — the client-side navigation is
    // this component's own responsibility (see ADR-0011).
    router.push(`/bookings/${bookingId}`);
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-4 rounded-2xl bg-white p-6 ring-1 ring-azulejo/10 shadow-sm"
    >
      <CardElement
        id="card-element"
        options={{ hidePostalCode: true }}
        onReady={() => setCardReady(true)}
      />

      {error && (
        <p role="alert" className="text-sm font-medium text-destructive">
          {error}
        </p>
      )}

      <Button
        type="submit"
        size="lg"
        disabled={!stripe || !cardReady || submitting}
        className="h-11 w-full bg-terracotta text-white hover:bg-terracotta/90 focus-visible:ring-terracotta/40"
      >
        Pay now
      </Button>
    </form>
  );
}
