'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { checkBookingStatus } from '../_actions';

const POLL_INTERVAL_MS = 3000;
const MAX_POLLS = 20; // ~60s at POLL_INTERVAL_MS — webhooks land in 1-2s normally

// Rendered in place of a static "still confirming" message so the page
// self-updates once the Stripe webhook (#32) flips status to 'confirmed' —
// otherwise the Guest has no signal to manually refresh. Polls a Server
// Action rather than fetching Express directly: Express is only ever reached
// server-side (ADR-0002), so even this lightweight status check needs that
// hop. See ADR-0012 for why polling was chosen over SSE/push.
export function PendingBookingWatcher({ bookingId }: { bookingId: string }) {
  const router = useRouter();
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    let pollCount = 0;
    // clearInterval alone can't stop a tick already scheduled before a slow
    // checkBookingStatus call resolves — this flag is checked on both sides
    // of that await so a late-arriving tick becomes a no-op instead of an
    // extra poll (or, worse, two overlapping in-flight requests).
    let cancelled = false;

    const interval = setInterval(async () => {
      if (cancelled) {
        return;
      }
      pollCount += 1;
      const status = await checkBookingStatus(bookingId);
      if (cancelled) {
        return;
      }

      if (status === 'confirmed') {
        cancelled = true;
        clearInterval(interval);
        // Re-runs the Server Component so the confirmed view renders from
        // freshly fetched data, rather than duplicating that view here.
        router.refresh();
        return;
      }

      if (pollCount >= MAX_POLLS) {
        cancelled = true;
        clearInterval(interval);
        setTimedOut(true);
      }
    }, POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [bookingId, router]);

  return (
    <p className="text-sm text-muted-foreground">
      {timedOut
        ? 'This is taking longer than expected. Try refreshing this page in a moment.'
        : "This can take a few moments — refresh the page shortly if it doesn't update."}
    </p>
  );
}
