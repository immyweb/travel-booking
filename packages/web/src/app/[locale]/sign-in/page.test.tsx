import { screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { renderWithIntl as render } from '@/test-support/renderWithIntl';
import SignInPage from './page';

// The Next.js font loader transform only runs inside Next's own build, not
// under Vitest, so next/font/google resolves to no usable export here.
vi.mock('next/font/google', () => ({
  Bricolage_Grotesque: () => ({ className: 'font-display-mock' }),
}));

vi.mock('./_components/SignInForm', () => ({
  SignInForm: (props: { redirectTo?: string }) => (
    <div data-testid="sign-in-form">{JSON.stringify(props)}</div>
  ),
}));

describe('SignInPage', () => {
  it('renders the heading and a link to sign up', async () => {
    const ui = await SignInPage({ params: Promise.resolve({ locale: 'en' }), searchParams: Promise.resolve({}) });
    render(ui);

    expect(screen.getByRole('heading', { name: 'Sign in' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Create an account' })).toHaveAttribute(
      'href',
      '/sign-up',
    );
  });

  it('passes no redirectTo to the form when the redirect query param is absent', async () => {
    const ui = await SignInPage({ params: Promise.resolve({ locale: 'en' }), searchParams: Promise.resolve({}) });
    render(ui);

    const props = JSON.parse(screen.getByTestId('sign-in-form').textContent!);
    expect(props.redirectTo).toBeUndefined();
  });

  it('carries the redirect query param to the form and to the sign-up link', async () => {
    const ui = await SignInPage({
      params: Promise.resolve({ locale: 'en' }),
      searchParams: Promise.resolve({ redirect: '/listings/1/book' }),
    });
    render(ui);

    const props = JSON.parse(screen.getByTestId('sign-in-form').textContent!);
    expect(props.redirectTo).toBe('/listings/1/book');
    expect(screen.getByRole('link', { name: 'Create an account' })).toHaveAttribute(
      'href',
      `/sign-up?redirect=${encodeURIComponent('/listings/1/book')}`,
    );
  });
});
