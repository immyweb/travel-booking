import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { submitSignUp } from '../_actions';
import { SignUpForm } from './SignUpForm';

vi.mock('../_actions', () => ({
  submitSignUp: vi.fn(async () => null),
}));

beforeEach(() => {
  vi.mocked(submitSignUp).mockClear();
  vi.mocked(submitSignUp).mockResolvedValue(null);
});

async function fillValidFields(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText('Full name'), 'Jane Doe');
  await user.type(screen.getByLabelText('Email'), 'jane@example.com');
  await user.type(screen.getByLabelText('Password'), 'password123');
}

describe('SignUpForm', () => {
  it('renders name, email and password inputs', () => {
    render(<SignUpForm />);

    expect(screen.getByLabelText('Full name')).toBeInTheDocument();
    expect(screen.getByLabelText('Email')).toBeInTheDocument();
    expect(screen.getByLabelText('Password')).toBeInTheDocument();
  });

  it('blocks submission and shows an inline error when the name is missing', async () => {
    const user = userEvent.setup();
    render(<SignUpForm />);
    await user.type(screen.getByLabelText('Email'), 'jane@example.com');
    await user.type(screen.getByLabelText('Password'), 'password123');

    await user.click(screen.getByRole('button', { name: 'Create account' }));

    expect(await screen.findByRole('alert')).toBeInTheDocument();
    expect(submitSignUp).not.toHaveBeenCalled();
  });

  it('blocks submission and shows an inline error for a malformed email', async () => {
    const user = userEvent.setup();
    render(<SignUpForm />);
    await user.type(screen.getByLabelText('Full name'), 'Jane Doe');
    await user.type(screen.getByLabelText('Email'), 'not-an-email');
    await user.type(screen.getByLabelText('Password'), 'password123');

    await user.click(screen.getByRole('button', { name: 'Create account' }));

    expect(await screen.findByRole('alert')).toBeInTheDocument();
    expect(submitSignUp).not.toHaveBeenCalled();
  });

  it('blocks submission and shows an inline error for a too-short password', async () => {
    const user = userEvent.setup();
    render(<SignUpForm />);
    await user.type(screen.getByLabelText('Full name'), 'Jane Doe');
    await user.type(screen.getByLabelText('Email'), 'jane@example.com');
    await user.type(screen.getByLabelText('Password'), 'short');

    await user.click(screen.getByRole('button', { name: 'Create account' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/at least 8 characters/i);
    expect(submitSignUp).not.toHaveBeenCalled();
  });

  it('submits via the Server Action when every field is valid', async () => {
    const user = userEvent.setup();
    render(<SignUpForm />);
    await fillValidFields(user);

    await user.click(screen.getByRole('button', { name: 'Create account' }));

    expect(submitSignUp).toHaveBeenCalled();
  });

  it("carries the redirectTo prop through as the form's hidden field", async () => {
    const user = userEvent.setup();
    render(<SignUpForm redirectTo="/listings/1/book" />);
    await fillValidFields(user);

    await user.click(screen.getByRole('button', { name: 'Create account' }));

    const [, submittedInput] = vi.mocked(submitSignUp).mock.calls[0]!;
    expect(submittedInput).toMatchObject({ redirectTo: '/listings/1/book' });
  });

  it('shows the error returned by the Server Action (e.g. a duplicate email)', async () => {
    vi.mocked(submitSignUp).mockResolvedValue({
      error: 'User already exists. Use another email.',
    });
    const user = userEvent.setup();
    render(<SignUpForm />);
    await fillValidFields(user);

    await user.click(screen.getByRole('button', { name: 'Create account' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/already exists/i);
  });
});
