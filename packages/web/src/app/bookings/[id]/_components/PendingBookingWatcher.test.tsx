import { act, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PendingBookingWatcher } from './PendingBookingWatcher';

const refresh = vi.fn();
const checkBookingStatus = vi.fn();
// A stable object, matching real Next.js (useRouter()'s return value doesn't
// change identity across renders) — a fresh object per call would make the
// polling effect (which depends on `router`) tear down and restart on every
// re-render, unlike production.
const router = { refresh };

vi.mock('next/navigation', () => ({
  useRouter: () => router,
}));
vi.mock('../_actions', () => ({
  checkBookingStatus: (id: string) => checkBookingStatus(id),
}));

beforeEach(() => {
  refresh.mockReset();
  checkBookingStatus.mockReset();
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('PendingBookingWatcher', () => {
  it('polls checkBookingStatus every 3s against the given bookingId', async () => {
    checkBookingStatus.mockResolvedValue('pending');
    render(<PendingBookingWatcher bookingId="booking-1" />);

    await act(() => vi.advanceTimersByTimeAsync(3000));
    expect(checkBookingStatus).toHaveBeenNthCalledWith(1, 'booking-1');

    await act(() => vi.advanceTimersByTimeAsync(3000));
    expect(checkBookingStatus).toHaveBeenNthCalledWith(2, 'booking-1');
  });

  it('refreshes the router and stops polling once status flips to confirmed', async () => {
    checkBookingStatus.mockResolvedValue('confirmed');
    render(<PendingBookingWatcher bookingId="booking-1" />);

    await act(() => vi.advanceTimersByTimeAsync(3000));

    expect(refresh).toHaveBeenCalledTimes(1);

    await act(() => vi.advanceTimersByTimeAsync(30000));
    expect(checkBookingStatus).toHaveBeenCalledTimes(1);
  });

  it('stops polling and shows a fallback message after ~60s still pending', async () => {
    checkBookingStatus.mockResolvedValue('pending');
    render(<PendingBookingWatcher bookingId="booking-1" />);

    expect(screen.getByText(/this can take a few moments/i, { exact: false })).toBeInTheDocument();

    await act(() => vi.advanceTimersByTimeAsync(60000));

    expect(screen.getByText(/taking longer than expected/i, { exact: false })).toBeInTheDocument();
    expect(refresh).not.toHaveBeenCalled();

    checkBookingStatus.mockClear();
    await act(() => vi.advanceTimersByTimeAsync(30000));
    expect(checkBookingStatus).not.toHaveBeenCalled();
  });
});
