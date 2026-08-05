'use client';

import { useLocale, useTranslations } from 'next-intl';
import { useSearchParams } from 'next/navigation';
import { Link, usePathname } from '@/i18n/navigation';
import { routing } from '@/i18n/routing';
import { cn } from '@/lib/utils';

// Switches the *current* page to its other-locale equivalent (ADR-0008 /
// #38 user story 4) — usePathname here is next-intl's own, locale-stripped
// and with dynamic segments already resolved (e.g. /listings/abc123), so a
// Link with an explicit `locale` override re-renders the same route under
// that locale rather than always routing to the homepage. Query params
// (Search's own filter state) are carried forward the same way.
export function LocaleSwitcher() {
  const t = useTranslations('LocaleSwitcher');
  const locale = useLocale();
  const pathname = usePathname() ?? '/';
  const searchParams = useSearchParams();
  const query = Object.fromEntries((searchParams ?? new URLSearchParams()).entries());

  return (
    <nav aria-label={t('label')} className="flex items-center gap-2 text-sm">
      {routing.locales.map((loc, index) => (
        <span key={loc} className="flex items-center gap-2">
          {index > 0 && (
            <span className="text-white/40" aria-hidden="true">
              /
            </span>
          )}
          <Link
            href={{ pathname, query }}
            locale={loc}
            aria-current={loc === locale ? 'true' : undefined}
            className={cn(
              'font-medium hover:underline',
              loc === locale ? 'text-white' : 'text-white/60',
            )}
          >
            {t(loc)}
          </Link>
        </span>
      ))}
    </nav>
  );
}
