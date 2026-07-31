import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { submitSignIn } from '../_actions';
import { SignInForm } from './SignInForm';

vi.mock('../_actions', () => ({
  submitSignIn: vi.fn(async () => null),
}));

beforeEach(() => {
  vi.mocked(submitSignIn).mockClear();
  vi.mocked(submitSignIn).mockResolvedValue(null);
});

async function fillValidFields(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText('Email'), 'jane@example.com');
  await user.type(screen.getByLabelText('Password'), 'password123');
}

describe('SignInForm', () => {
  it('renders email and password inputs', () => {
    render(<SignInForm />);

    expect(screen.getByLabelText('Email')).toBeInTheDocument();
    expect(screen.getByLabelText('Password')).toBeInTheDocument();
  });

  it('blocks submission and shows an inline error for a malformed email', async () => {
    const user = userEvent.setup();
    render(<SignInForm />);
    await user.type(screen.getByLabelText('Email'), 'not-an-email');
    await user.type(screen.getByLabelText('Password'), 'password123');

    await user.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(await screen.findByRole('alert')).toBeInTheDocument();
    expect(submitSignIn).not.toHaveBeenCalled();
  });

  it('blocks submission and shows an inline error when the password is missing', async () => {
    const user = userEvent.setup();
    render(<SignInForm />);
    await user.type(screen.getByLabelText('Email'), 'jane@example.com');

    await user.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(await screen.findByRole('alert')).toBeInTheDocument();
    expect(submitSignIn).not.toHaveBeenCalled();
  });

  it('submits via the Server Action when every field is valid', async () => {
    const user = userEvent.setup();
    render(<SignInForm />);
    await fillValidFields(user);

    await user.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(submitSignIn).toHaveBeenCalled();
  });

  it("carries the redirectTo prop through as the form's hidden field", async () => {
    const user = userEvent.setup();
    render(<SignInForm redirectTo="/listings/1/book" />);
    await fillValidFields(user);

    await user.click(screen.getByRole('button', { name: 'Sign in' }));

    const [, submittedInput] = vi.mocked(submitSignIn).mock.calls[0]!;
    expect(submittedInput).toMatchObject({ redirectTo: '/listings/1/book' });
  });

  it('shows the error returned by the Server Action without revealing whether the email is registered', async () => {
    vi.mocked(submitSignIn).mockResolvedValue({ error: 'Invalid email or password' });
    const user = userEvent.setup();
    render(<SignInForm />);
    await fillValidFields(user);

    await user.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/invalid email or password/i);
  });
});
