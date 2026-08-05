import { useTranslations } from 'next-intl';
import { displayFont } from '@/app/_components/fonts';
import { TileMark } from '@/app/_components/TileMark';

export function EmptyState() {
  const t = useTranslations('SearchEmptyState');

  return (
    <div className="flex h-[520px] flex-col items-center justify-center gap-3 rounded-2xl bg-white p-8 text-center shadow-sm ring-1 ring-azulejo/10 sm:h-[600px]">
      <TileMark className="size-10 text-azulejo/20" />
      <p className={`${displayFont.className} text-lg font-semibold text-azulejo`}>{t('title')}</p>
      <p className="text-sm text-muted-foreground">{t('subtitle')}</p>
    </div>
  );
}
