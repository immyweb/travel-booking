import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import MarketingLayout from './layout';

// The Next.js font loader transform only runs inside Next's own build, not
// under Vitest, so next/font/google resolves to no usable export here.
vi.mock('next/font/google', () => ({
  Bricolage_Grotesque: () => ({ className: 'font-display-mock' }),
}));

describe('MarketingLayout', () => {
  it('renders the shared header, footer, and the wrapped page content', () => {
    render(
      <MarketingLayout>
        <p>Page content</p>
      </MarketingLayout>,
    );

    expect(screen.getAllByRole('link', { name: 'Search stays' }).length).toBeGreaterThan(0);
    expect(screen.getByRole('navigation', { name: 'Company' })).toBeInTheDocument();
    expect(screen.getByText('Page content')).toBeInTheDocument();
  });
});
