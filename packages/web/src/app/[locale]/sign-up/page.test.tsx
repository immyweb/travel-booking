import { screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { messages, renderWithIntl as render } from '@/test-support/renderWithIntl';
import SignUpPage from './page';

const t = messages.SignUpPage;

// The Next.js font loader transform only runs inside Next's own build, not
// under Vitest, so next/font/google resolves to no usable export here.
vi.mock('next/font/google', () => ({
  Bricolage_Grotesque: () => ({ className: 'font-display-mock' }),
}));

vi.mock('./_components/SignUpForm', () => ({
  SignUpForm: (props: { redirectTo?: string }) => (
    <div data-testid="sign-up-form">{JSON.stringify(props)}</div>
  ),
}));

describe('SignUpPage', () => {
  it('renders the heading and a link to sign in', async () => {
    const ui = await SignUpPage({
      params: Promise.resolve({ locale: 'en' }),
      searchParams: Promise.resolve({}),
    });
    render(ui);

    expect(screen.getByRole('heading', { name: t.heading })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: t.signIn })).toHaveAttribute('href', '/sign-in');
  });

  it('passes no redirectTo to the form when the redirect query param is absent', async () => {
    const ui = await SignUpPage({
      params: Promise.resolve({ locale: 'en' }),
      searchParams: Promise.resolve({}),
    });
    render(ui);

    const props = JSON.parse(screen.getByTestId('sign-up-form').textContent!);
    expect(props.redirectTo).toBeUndefined();
  });

  it('carries the redirect query param to the form and to the sign-in link', async () => {
    const ui = await SignUpPage({
      params: Promise.resolve({ locale: 'en' }),
      searchParams: Promise.resolve({ redirect: '/listings/1/book' }),
    });
    render(ui);

    const props = JSON.parse(screen.getByTestId('sign-up-form').textContent!);
    expect(props.redirectTo).toBe('/listings/1/book');
    expect(screen.getByRole('link', { name: t.signIn })).toHaveAttribute(
      'href',
      `/sign-in?redirect=${encodeURIComponent('/listings/1/book')}`,
    );
  });
});
