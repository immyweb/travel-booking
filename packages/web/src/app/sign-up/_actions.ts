'use server';

import { redirect } from 'next/navigation';
import { z } from 'zod';
import { signUp } from '@/lib/api';
import { toInternalPath } from '@/lib/utils';

const SignUpInputSchema = z.object({
  name: z.string().min(1, 'Please enter your name.'),
  email: z.email(),
  password: z.string().min(8, 'Password must be at least 8 characters.'),
  // Kept separate from next/navigation's own redirect() rather than named
  // `redirect`, purely so destructuring it below can't shadow that import.
  redirectTo: z.string().optional(),
});
export type SignUpInput = z.infer<typeof SignUpInputSchema>;

export type SignUpFormState = { error: string } | null;

// Mirrors book/_actions.ts's submitBooking: re-validates server-side despite
// the form's own client-side validation (a Server Action is a reachable POST
// endpoint regardless of what the UI enforces), then defers to Better Auth's
// own authoritative checks (duplicate email) via lib/api.ts's signUp.
export async function submitSignUp(
  _prevState: SignUpFormState,
  input: SignUpInput,
): Promise<SignUpFormState> {
  const parsed = SignUpInputSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Please check your details.' };
  }

  const { redirectTo, ...body } = parsed.data;
  const result = await signUp(body);
  if (!result.ok) {
    return { error: result.message };
  }

  // Called outside any try/catch: redirect() works by throwing a control-flow
  // exception, so wrapping it would swallow the navigation instead of letting
  // it happen.
  redirect(toInternalPath(redirectTo));
}
