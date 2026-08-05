import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { StaticPage } from '@/app/_components/StaticPage';
import { languageAlternates } from '@/i18n/metadata';

type CookiesPageProps = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: CookiesPageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'CookiesPage' });

  return {
    title: t('metaTitle'),
    alternates: { languages: languageAlternates('/cookies') },
  };
}

export default async function CookiesPage() {
  const t = await getTranslations('CookiesPage');

  return (
    <StaticPage title={t('title')}>
      <p>{t('paragraph1')}</p>
    </StaticPage>
  );
}
