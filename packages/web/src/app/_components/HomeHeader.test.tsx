import { screen } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { describe, expect, it, vi } from 'vitest';
import { server } from '@/mocks/server';
import { renderWithIntl as render } from '@/test-support/renderWithIntl';
import { HomeHeader } from './HomeHeader';

const API_URL = 'http://localhost:4000';

// The Next.js font loader transform only runs inside Next's own build, not
// under Vitest, so next/font/google resolves to no usable export here.
vi.mock('next/font/google', () => ({
  Bricolage_Grotesque: () => ({ className: 'font-display-mock' }),
}));

describe('HomeHeader', () => {
  it('renders the wordmark linking home and a search CTA regardless of session state', async () => {
    server.use(http.get(`${API_URL}/api/auth/get-session`, () => HttpResponse.json(null)));

    render(await HomeHeader());

    expect(screen.getByRole('link', { name: 'Travel Booking' })).toHaveAttribute('href', '/');
    expect(screen.getByRole('link', { name: 'Search stays' })).toHaveAttribute('href', '/search');
  });

  it('shows sign-in/sign-up links when signed out', async () => {
    server.use(http.get(`${API_URL}/api/auth/get-session`, () => HttpResponse.json(null)));

    render(await HomeHeader());

    expect(screen.getByRole('link', { name: 'Sign in' })).toHaveAttribute('href', '/sign-in');
    expect(screen.getByRole('link', { name: 'Sign up' })).toHaveAttribute('href', '/sign-up');
    expect(screen.queryByRole('button', { name: 'Sign out' })).not.toBeInTheDocument();
  });

  it('shows the signed-in state and a sign-out control when signed in', async () => {
    server.use(
      http.get(`${API_URL}/api/auth/get-session`, () =>
        HttpResponse.json({
          session: { id: 'session-1' },
          user: { id: 'u1', name: 'Jane Doe', email: 'jane@example.com' },
        }),
      ),
    );

    render(await HomeHeader());

    expect(screen.getByText(/welcome back,/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Jane Doe' })).toHaveAttribute('href', '/my-bookings');
    expect(screen.getByRole('button', { name: 'Sign out' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Sign in' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Sign up' })).not.toBeInTheDocument();
  });
});
