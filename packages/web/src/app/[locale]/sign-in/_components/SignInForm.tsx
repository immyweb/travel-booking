'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslations } from 'next-intl';
import { startTransition, useActionState, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { submitSignIn, type SignInFormState, type SignInInput } from '../_actions';

type SignInFormProps = {
  redirectTo?: string;
};

const initialState: SignInFormState = null;

// Priority order for showing one error at a time — matches the fields'
// top-to-bottom order in the form below.
const FIELD_ORDER = ['email', 'password'] as const;

export function SignInForm({ redirectTo }: SignInFormProps) {
  const t = useTranslations('SignInForm');
  const [state, formAction, pending] = useActionState(submitSignIn, initialState);

  // Mirrors submitSignIn's own schema (see _actions.ts) so client-side errors
  // read identically to whatever the Server Action would otherwise catch —
  // built here, not at module scope, so its validation message is translated.
  const SignInFormSchema = useMemo(
    () =>
      z.object({
        email: z.email(),
        password: z.string().min(1, t('passwordRequired')),
        redirectTo: z.string().optional(),
      }),
    [t],
  );

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SignInInput>({
    resolver: zodResolver(SignInFormSchema),
    defaultValues: { email: '', password: '', redirectTo },
  });

  // useActionState's dispatcher isn't only for <form action>: it can be
  // invoked directly with whatever argument the action expects, which is how
  // a React Hook Form-validated submit hands off to the Server Action here.
  // Bypassing the action/formAction prop also means React no longer wraps
  // the dispatch in a transition automatically, so startTransition is
  // required here to keep `pending` updating correctly.
  function onValid(values: SignInInput) {
    startTransition(() => {
      formAction(values);
    });
  }

  const fieldError = FIELD_ORDER.map((field) => errors[field]?.message).find(Boolean);
  const error = fieldError ?? state?.error;

  return (
    <form
      onSubmit={handleSubmit(onValid)}
      noValidate
      className="flex flex-col gap-4 rounded-2xl bg-white p-6 ring-1 ring-azulejo/10 shadow-sm"
    >
      <input type="hidden" {...register('redirectTo')} />

      <div className="flex flex-col gap-1">
        <Label htmlFor="sign-in-email">{t('email')}</Label>
        <Input id="sign-in-email" type="email" autoComplete="email" {...register('email')} />
      </div>

      <div className="flex flex-col gap-1">
        <Label htmlFor="sign-in-password">{t('password')}</Label>
        <Input
          id="sign-in-password"
          type="password"
          autoComplete="current-password"
          {...register('password')}
        />
      </div>

      {error && (
        <p role="alert" className="text-sm font-medium text-destructive">
          {error}
        </p>
      )}

      <Button
        type="submit"
        size="lg"
        disabled={pending}
        className="h-11 w-full bg-terracotta text-white hover:bg-terracotta/90 focus-visible:ring-terracotta/40"
      >
        {t('signIn')}
      </Button>
    </form>
  );
}
