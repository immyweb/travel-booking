import type { Metadata } from 'next';
import Link from 'next/link';
import { displayFont } from '@/app/_components/fonts';
import { SignInForm } from './_components/SignInForm';

export const metadata: Metadata = { title: 'Sign in' };

type SignInPageProps = {
  searchParams: Promise<{ redirect?: string }>;
};

export default async function SignInPage({ searchParams }: SignInPageProps) {
  const { redirect } = await searchParams;
  const signUpHref = redirect ? `/sign-up?redirect=${encodeURIComponent(redirect)}` : '/sign-up';

  return (
    <main className="flex flex-1 flex-col bg-limestone">
      <div className="motion-safe:animate-[rise-in_0.5s_ease-out] mx-auto flex w-full max-w-md flex-col gap-8 px-6 py-12 sm:py-16">
        <div className="flex flex-col gap-1.5">
          <p className="font-mono text-xs tracking-wide text-azulejo/60 uppercase">
            Travel Booking
          </p>
          <h1
            className={`${displayFont.className} text-3xl font-semibold text-azulejo sm:text-4xl`}
          >
            Sign in
          </h1>
        </div>

        <SignInForm redirectTo={redirect} />

        <p className="text-center text-sm text-azulejo/70">
          New here?{' '}
          <Link href={signUpHref} className="font-medium text-terracotta hover:underline">
            Create an account
          </Link>
        </p>
      </div>
    </main>
  );
}
