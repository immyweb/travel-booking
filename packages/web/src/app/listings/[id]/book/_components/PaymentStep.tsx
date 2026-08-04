'use client';

import { Elements, PaymentElement, useElements, useStripe } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
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
        <PaymentForm bookingId={bookingId} />
      </Elements>
    </div>
  );
}

function PaymentForm({ bookingId }: { bookingId: string }) {
  const stripe = useStripe();
  const elements = useElements();
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!stripe || !elements) {
      return;
    }

    setSubmitting(true);
    setError(null);

    // A decline resolves here with `error` rather than redirecting to
    // return_url — Elements stays mounted against the same clientSecret /
    // PaymentIntent, so the Guest can correct or swap their card and submit
    // again without losing the held dates or restarting the booking.
    const { error: confirmError } = await stripe.confirmPayment({
      elements,
      confirmParams: { return_url: `${window.location.origin}/bookings/${bookingId}` },
    });

    if (confirmError) {
      setError(confirmError.message ?? 'Your payment could not be confirmed. Please try again.');
      setSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-4 rounded-2xl bg-white p-6 ring-1 ring-azulejo/10 shadow-sm"
    >
      <PaymentElement />

      {error && (
        <p role="alert" className="text-sm font-medium text-destructive">
          {error}
        </p>
      )}

      <Button
        type="submit"
        size="lg"
        disabled={!stripe || !elements || submitting}
        className="h-11 w-full bg-terracotta text-white hover:bg-terracotta/90 focus-visible:ring-terracotta/40"
      >
        Pay now
      </Button>
    </form>
  );
}
