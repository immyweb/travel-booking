import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import HomePage from './page';

describe('HomePage', () => {
  it('renders the placeholder heading', () => {
    render(<HomePage />);

    expect(screen.getByText('Travel Booking')).toBeInTheDocument();
  });
});
