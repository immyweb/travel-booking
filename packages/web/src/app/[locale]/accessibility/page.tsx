import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { StaticPage } from '@/app/_components/StaticPage';
import { languageAlternates } from '@/i18n/metadata';

type AccessibilityPageProps = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: AccessibilityPageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'AccessibilityPage' });

  return {
    title: t('metaTitle'),
    alternates: { languages: languageAlternates('/accessibility') },
  };
}

export default async function AccessibilityPage() {
  const t = await getTranslations('AccessibilityPage');

  return (
    <StaticPage title={t('title')}>
      <p>{t('paragraph1')}</p>
    </StaticPage>
  );
}
