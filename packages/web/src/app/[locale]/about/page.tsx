import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { StaticPage } from '@/app/_components/StaticPage';
import { languageAlternates } from '@/i18n/metadata';

type AboutPageProps = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: AboutPageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'AboutPage' });

  return {
    title: t('metaTitle'),
    alternates: { languages: languageAlternates('/about') },
  };
}

export default async function AboutPage() {
  const t = await getTranslations('AboutPage');

  return (
    <StaticPage title={t('title')}>
      <p>{t('paragraph1')}</p>
      <p>{t('paragraph2')}</p>
    </StaticPage>
  );
}
