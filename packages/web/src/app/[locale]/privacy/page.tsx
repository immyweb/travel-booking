import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { StaticPage } from '@/app/_components/StaticPage';
import { languageAlternates } from '@/i18n/metadata';

type PrivacyPageProps = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: PrivacyPageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'PrivacyPage' });

  return {
    title: t('metaTitle'),
    alternates: { languages: languageAlternates('/privacy') },
  };
}

export default async function PrivacyPage() {
  const t = await getTranslations('PrivacyPage');

  return (
    <StaticPage title={t('title')}>
      <p>{t('paragraph1')}</p>
    </StaticPage>
  );
}
