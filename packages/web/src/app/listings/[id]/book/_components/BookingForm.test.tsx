import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { submitBooking } from '../_actions';
import { BookingForm } from './BookingForm';

vi.mock('../_actions', () => ({
  submitBooking: vi.fn(async () => null),
}));

// The Next.js font loader transform only runs inside Next's own build, not
// under Vitest, so next/font/google resolves to no usable export here.
vi.mock('next/font/google', () => ({
  Bricolage_Grotesque: () => ({ className: 'font-display-mock' }),
}));

const LISTING_ID = '11111111-1111-4111-8111-111111111111';

// The signed-in User's own name/email, as passed down from the booking
// page's session lookup — the common case is booking for yourself, so most
// tests render with these already prefilled rather than typing them in.
const SIGNED_IN_USER = { guestName: 'Jane Doe', guestEmail: 'jane@example.com' };

beforeEach(() => {
  vi.mocked(submitBooking).mockClear();
  vi.mocked(submitBooking).mockResolvedValue(null);
});

describe('BookingForm', () => {
  it('renders editable date and guest inputs when none were carried forward', () => {
    render(<BookingForm listingId={LISTING_ID} maxGuests={4} {...SIGNED_IN_USER} />);

    expect(screen.getByLabelText('Check-in')).toBeInTheDocument();
    expect(screen.getByLabelText('Check-out')).toBeInTheDocument();
    expect(screen.getByLabelText('Guests')).toBeInTheDocument();
  });

  it('shows carried-forward guests as read-only text instead of an input', () => {
    render(
      <BookingForm
        listingId={LISTING_ID}
        maxGuests={4}
        checkIn="2026-08-05"
        checkOut="2026-08-10"
        guests={2}
        {...SIGNED_IN_USER}
      />,
    );

    expect(screen.queryByLabelText('Check-in')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Guests')).not.toBeInTheDocument();
    expect(screen.getByText('2 guests')).toBeInTheDocument();
  });

  it("prefills the Guest fields with the signed-in User's own name and email", () => {
    render(
      <BookingForm
        listingId={LISTING_ID}
        maxGuests={4}
        checkIn="2026-08-05"
        checkOut="2026-08-10"
        guests={2}
        {...SIGNED_IN_USER}
      />,
    );

    expect(screen.getByLabelText('Full name')).toHaveValue(SIGNED_IN_USER.guestName);
    expect(screen.getByLabelText('Email')).toHaveValue(SIGNED_IN_USER.guestEmail);
  });

  it('allows overwriting the prefilled contact details to book for someone else', async () => {
    const user = userEvent.setup();
    render(
      <BookingForm
        listingId={LISTING_ID}
        maxGuests={4}
        checkIn="2026-08-05"
        checkOut="2026-08-10"
        guests={2}
        {...SIGNED_IN_USER}
      />,
    );

    const nameInput = screen.getByLabelText('Full name');
    const emailInput = screen.getByLabelText('Email');
    await user.clear(nameInput);
    await user.type(nameInput, 'John Smith');
    await user.clear(emailInput);
    await user.type(emailInput, 'john@example.com');

    await user.click(screen.getByRole('button', { name: 'Confirm booking' }));

    expect(submitBooking).toHaveBeenCalledWith(
      null,
      expect.objectContaining({ guestName: 'John Smith', guestEmail: 'john@example.com' }),
    );
  });

  it('blocks submission and shows an inline error when the name is missing', async () => {
    const user = userEvent.setup();
    render(
      <BookingForm
        listingId={LISTING_ID}
        maxGuests={4}
        checkIn="2026-08-05"
        checkOut="2026-08-10"
        guests={2}
        guestEmail={SIGNED_IN_USER.guestEmail}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Confirm booking' }));

    expect(await screen.findByRole('alert')).toBeInTheDocument();
    expect(submitBooking).not.toHaveBeenCalled();
  });

  it('blocks submission and shows an inline error for a malformed email', async () => {
    const user = userEvent.setup();
    render(
      <BookingForm
        listingId={LISTING_ID}
        maxGuests={4}
        checkIn="2026-08-05"
        checkOut="2026-08-10"
        guests={2}
        guestName={SIGNED_IN_USER.guestName}
      />,
    );
    await user.type(screen.getByLabelText('Email'), 'not-an-email');

    await user.click(screen.getByRole('button', { name: 'Confirm booking' }));

    expect(await screen.findByRole('alert')).toBeInTheDocument();
    expect(submitBooking).not.toHaveBeenCalled();
  });

  it('blocks submission and shows an inline error when guests exceed maxGuests', async () => {
    const user = userEvent.setup();
    render(<BookingForm listingId={LISTING_ID} maxGuests={2} {...SIGNED_IN_USER} />);
    await user.type(screen.getByLabelText('Check-in'), '2026-08-05');
    await user.type(screen.getByLabelText('Check-out'), '2026-08-10');
    const guestsInput = screen.getByLabelText('Guests');
    await user.clear(guestsInput);
    await user.type(guestsInput, '5');

    await user.click(screen.getByRole('button', { name: 'Confirm booking' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/sleeps up to 2 guests/i);
    expect(submitBooking).not.toHaveBeenCalled();
  });

  it('blocks submission and shows an inline error when checkOut is before checkIn', async () => {
    const user = userEvent.setup();
    render(<BookingForm listingId={LISTING_ID} maxGuests={4} guests={2} {...SIGNED_IN_USER} />);
    await user.type(screen.getByLabelText('Check-in'), '2026-08-10');
    await user.type(screen.getByLabelText('Check-out'), '2026-08-05');

    await user.click(screen.getByRole('button', { name: 'Confirm booking' }));

    expect(await screen.findByRole('alert')).toBeInTheDocument();
    expect(submitBooking).not.toHaveBeenCalled();
  });

  it('submits via the Server Action when every field is valid', async () => {
    const user = userEvent.setup();
    render(
      <BookingForm
        listingId={LISTING_ID}
        maxGuests={4}
        checkIn="2026-08-05"
        checkOut="2026-08-10"
        guests={2}
        {...SIGNED_IN_USER}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Confirm booking' }));

    expect(submitBooking).toHaveBeenCalled();
  });

  it('shows the error returned by the Server Action (e.g. a 409 conflict)', async () => {
    vi.mocked(submitBooking).mockResolvedValue({
      error: 'Sorry, these dates are no longer available for this listing.',
    });
    const user = userEvent.setup();
    render(
      <BookingForm
        listingId={LISTING_ID}
        maxGuests={4}
        checkIn="2026-08-05"
        checkOut="2026-08-10"
        guests={2}
        {...SIGNED_IN_USER}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Confirm booking' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/no longer available/i);
  });
});
