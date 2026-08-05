import { useTranslations } from 'next-intl';
import { displayFont } from '@/app/_components/fonts';
import { TileMark } from '@/app/_components/TileMark';
import { buttonVariants } from '@/components/ui/button';
import { Link } from '@/i18n/navigation';
import { cn } from '@/lib/utils';

export default function NotFound() {
  const t = useTranslations('NotFoundPage');

  return (
    <main className="flex flex-1 flex-col items-center justify-center bg-limestone px-6 py-16 text-center">
      <div className="motion-safe:animate-[rise-in_0.5s_ease-out] flex flex-col items-center gap-3">
        <TileMark aria-hidden="true" className="size-10 text-azulejo/20" />
        <h1 className={`${displayFont.className} text-3xl font-semibold text-azulejo sm:text-4xl`}>
          {t('heading')}
        </h1>
        <p className="max-w-sm text-sm text-muted-foreground">{t('subheading')}</p>
        <Link
          href="/search"
          className={cn(
            buttonVariants({
              size: 'lg',
              className:
                'mt-3 bg-terracotta text-white hover:bg-terracotta/90 focus-visible:ring-terracotta/40',
            }),
          )}
        >
          {t('backToSearch')}
        </Link>
      </div>
    </main>
  );
}
