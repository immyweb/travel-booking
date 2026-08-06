import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { displayFont } from '@/app/_components/fonts';
import { Link } from '@/i18n/navigation';
import { languageAlternates } from '@/i18n/metadata';
import { SignInForm } from './_components/SignInForm';

type SignInPageProps = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ redirect?: string }>;
};

export async function generateMetadata({ params }: SignInPageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'SignInPage' });

  return {
    title: t('heading'),
    alternates: { languages: languageAlternates('/sign-in') },
  };
}

export default async function SignInPage({ searchParams }: SignInPageProps) {
  const [{ redirect }, t] = await Promise.all([searchParams, getTranslations('SignInPage')]);
  const signUpHref = redirect ? `/sign-up?redirect=${encodeURIComponent(redirect)}` : '/sign-up';

  return (
    <main className="flex flex-1 flex-col bg-limestone">
      <div className="motion-safe:animate-[rise-in_0.5s_ease-out] mx-auto flex w-full max-w-md flex-col gap-8 px-6 py-12 sm:py-16">
        <div className="flex flex-col gap-1.5">
          <p className="font-mono text-xs tracking-wide text-azulejo/70 uppercase">
            {t('eyebrow')}
          </p>
          <h1
            className={`${displayFont.className} text-3xl font-semibold text-azulejo sm:text-4xl`}
          >
            {t('heading')}
          </h1>
        </div>

        <SignInForm redirectTo={redirect} />

        <p className="text-center text-sm text-azulejo/70">
          {t('newHere')}{' '}
          <Link href={signUpHref} className="font-medium text-terracotta hover:underline">
            {t('createAccount')}
          </Link>
        </p>
      </div>
    </main>
  );
}
