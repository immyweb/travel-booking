import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchSession } from '@/lib/api';
import { HomeHeader } from './HomeHeader';

vi.mock('@/lib/api', () => ({
  fetchSession: vi.fn(),
}));

// The Next.js font loader transform only runs inside Next's own build, not
// under Vitest, so next/font/google resolves to no usable export here.
vi.mock('next/font/google', () => ({
  Bricolage_Grotesque: () => ({ className: 'font-display-mock' }),
}));

beforeEach(() => {
  vi.mocked(fetchSession).mockReset();
});

describe('HomeHeader', () => {
  it('renders the wordmark linking home and a search CTA regardless of session state', async () => {
    vi.mocked(fetchSession).mockResolvedValue(null);

    render(await HomeHeader());

    expect(screen.getByRole('link', { name: 'Travel Booking' })).toHaveAttribute('href', '/');
    expect(screen.getByRole('link', { name: 'Search stays' })).toHaveAttribute('href', '/search');
  });

  it('shows sign-in/sign-up links when signed out', async () => {
    vi.mocked(fetchSession).mockResolvedValue(null);

    render(await HomeHeader());

    expect(screen.getByRole('link', { name: 'Sign in' })).toHaveAttribute('href', '/sign-in');
    expect(screen.getByRole('link', { name: 'Sign up' })).toHaveAttribute('href', '/sign-up');
    expect(screen.queryByRole('button', { name: 'Sign out' })).not.toBeInTheDocument();
  });

  it('shows the signed-in state and a sign-out control when signed in', async () => {
    vi.mocked(fetchSession).mockResolvedValue({
      id: 'u1',
      name: 'Jane Doe',
      email: 'jane@example.com',
    });

    render(await HomeHeader());

    expect(screen.getByText(/welcome back,/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Jane Doe' })).toHaveAttribute('href', '/my-bookings');
    expect(screen.getByRole('button', { name: 'Sign out' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Sign in' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Sign up' })).not.toBeInTheDocument();
  });
});
