import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { StaticPage } from '@/app/_components/StaticPage';
import { languageAlternates } from '@/i18n/metadata';

type TermsPageProps = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: TermsPageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'TermsPage' });

  return {
    title: t('metaTitle'),
    alternates: { languages: languageAlternates('/terms') },
  };
}

export default async function TermsPage() {
  const t = await getTranslations('TermsPage');

  return (
    <StaticPage title={t('title')}>
      <p>{t('paragraph1')}</p>
    </StaticPage>
  );
}
