import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { HomeHeader } from './HomeHeader';

// The Next.js font loader transform only runs inside Next's own build, not
// under Vitest, so next/font/google resolves to no usable export here.
vi.mock('next/font/google', () => ({
  Bricolage_Grotesque: () => ({ className: 'font-display-mock' }),
}));

describe('HomeHeader', () => {
  it('renders the wordmark linking home and a search CTA', () => {
    render(<HomeHeader />);

    expect(screen.getByRole('link', { name: 'Travel Booking' })).toHaveAttribute('href', '/');
    expect(screen.getByRole('link', { name: 'Search stays' })).toHaveAttribute('href', '/search');
  });
});
