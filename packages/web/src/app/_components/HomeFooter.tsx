import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { displayFont } from './fonts';
import { TileMark } from './TileMark';

const FOOTER_LINKS = [
  { href: '/about', labelKey: 'about' },
  { href: '/terms', labelKey: 'terms' },
  { href: '/privacy', labelKey: 'privacy' },
  { href: '/accessibility', labelKey: 'accessibility' },
  { href: '/cookies', labelKey: 'cookies' },
] as const;

export function HomeFooter() {
  const t = useTranslations('HomeFooter');

  return (
    <footer className="bg-azulejo text-white">
      <div className="mx-auto flex max-w-6xl flex-col gap-8 px-6 py-10 sm:flex-row sm:justify-between">
        <div className="flex max-w-sm flex-col gap-2.5">
          <div className="flex items-center gap-2.5">
            <TileMark className="size-6 text-gold" />
            <span className={`${displayFont.className} text-lg font-semibold tracking-tight`}>
              Travel Booking
            </span>
          </div>
          <p className="text-sm text-white/70">{t('tagline')}</p>
        </div>
        <nav aria-label={t('companyNavLabel')} className="flex flex-col gap-2.5">
          <span className="text-xs font-medium tracking-wide text-white/70 uppercase">
            {t('companyNavLabel')}
          </span>
          <ul className="flex flex-col gap-1.5">
            {FOOTER_LINKS.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="text-sm text-white/80 hover:text-white hover:underline underline-offset-4"
                >
                  {t(link.labelKey)}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
      <div className="border-t border-white/10">
        <div className="mx-auto max-w-6xl px-6 py-4 text-xs text-white/70">
          {t('copyright', { year: new Date().getFullYear() })}
        </div>
      </div>
    </footer>
  );
}
