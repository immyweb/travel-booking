'use server';

import { getLocale, getTranslations } from 'next-intl/server';
import { z } from 'zod';
import { redirect } from '@/i18n/navigation';
import { signIn } from '@/lib/api';
import { toInternalPath } from '@/lib/utils';

export type SignInInput = {
  email: string;
  password: string;
  // Kept separate from next/navigation's own redirect() rather than named
  // `redirect`, purely so destructuring it below can't shadow that import.
  redirectTo?: string;
};

export type SignInFormState = { error: string } | null;

// Mirrors book/_actions.ts's submitBooking: re-validates server-side despite
// the form's own client-side validation (a Server Action is a reachable POST
// endpoint regardless of what the UI enforces), then defers to Better Auth's
// own authoritative check (email/password match) via lib/api.ts's signIn.
export async function submitSignIn(
  _prevState: SignInFormState,
  input: SignInInput,
): Promise<SignInFormState> {
  const [t, tErrors] = await Promise.all([
    getTranslations('SignInForm'),
    getTranslations('ServerErrors'),
  ]);

  // Built per-request rather than at module scope so its validation message
  // is translated — mirrors BookingForm.tsx's own client-side schema.
  const SignInInputSchema = z.object({
    email: z.email(),
    password: z.string().min(1, t('passwordRequired')),
    redirectTo: z.string().optional(),
  });

  const parsed = SignInInputSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? tErrors('invalidSignInDetails') };
  }

  const { redirectTo, ...body } = parsed.data;
  const result = await signIn(body);
  if (!result.ok) {
    return { error: result.message };
  }

  // Called outside any try/catch: redirect() works by throwing a control-flow
  // exception, so wrapping it would swallow the navigation instead of letting
  // it happen. The locale-aware wrapper, not plain next/navigation: redirectTo
  // (carried from wherever the auth gate redirected the guest from — e.g.
  // /listings/:id/book) is always unprefixed, so this needs the current
  // request's locale applied to land back in the same locale, not always en.
  const locale = await getLocale();
  return redirect({ href: toInternalPath(redirectTo), locale });
}
