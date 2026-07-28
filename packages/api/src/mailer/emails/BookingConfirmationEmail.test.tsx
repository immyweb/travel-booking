import { render } from 'react-email';
import { describe, expect, it } from 'vitest';
import { BookingConfirmationEmail } from './BookingConfirmationEmail';

describe('BookingConfirmationEmail', () => {
  it('renders the listing, dates, nights, total price, and confirmation link', async () => {
    const html = await render(
      <BookingConfirmationEmail
        guestName="Jane Doe"
        listingTitle="Sunny Alfama studio"
        checkIn="2026-08-05"
        checkOut="2026-08-10"
        nights={5}
        totalPrice={500}
        currency="EUR"
        confirmationUrl="http://localhost:3000/bookings/abc-123"
      />,
    );

    expect(html).toContain('Sunny Alfama studio');
    expect(html).toContain('2026-08-05');
    expect(html).toContain('2026-08-10');
    expect(html).toContain('5 nights');
    expect(html).toContain('500');
    expect(html).toContain('EUR');
    expect(html).toContain('http://localhost:3000/bookings/abc-123');
  });

  it('uses singular "night" for a one-night stay', async () => {
    const html = await render(
      <BookingConfirmationEmail
        guestName="Jane Doe"
        listingTitle="Sunny Alfama studio"
        checkIn="2026-08-05"
        checkOut="2026-08-06"
        nights={1}
        totalPrice={100}
        currency="EUR"
        confirmationUrl="http://localhost:3000/bookings/abc-123"
      />,
    );

    expect(html).toContain('1 night');
    expect(html).not.toContain('1 nights');
  });
});
