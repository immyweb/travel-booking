import type { Metadata, Viewport } from 'next';
import { hasLocale, NextIntlClientProvider } from 'next-intl';
import { Geist, Geist_Mono } from 'next/font/google';
import { notFound } from 'next/navigation';
import { HomeFooter } from '@/app/_components/HomeFooter';
import { HomeHeader } from '@/app/_components/HomeHeader';
import { routing } from '@/i18n/routing';
import { SITE_URL } from '@/lib/api';
import '../globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  // Required for URL-based metadata fields defined with a relative path
  // (e.g. Search's canonical link to /[city]/stays) to resolve to a full
  // URL — Next.js errors at build time on a relative path with no
  // metadataBase set anywhere in the tree.
  metadataBase: new URL(SITE_URL),
  title: 'Travel Booking',
  description: 'Search, book, and manage stays.',
};

// The site has no dark theme (the `.dark` CSS variables in globals.css are
// unused shadcn boilerplate). Without this, a browser in system dark mode
// renders native form controls (date pickers, checkboxes, selects) with
// dark styling that clashes with this light-only design, and paints a dark
// background for any window/tab opened from here — e.g. the search map's
// pins, which still open listings via `window.open(..., '_blank')` — until
// this page's own light background loads.
export const viewport: Viewport = {
  colorScheme: 'light',
};

// This is the app's root layout — it lives under the [locale] segment
// rather than directly in app/, which Next.js supports explicitly for i18n
// (see node_modules/next/dist/docs .../file-conventions/layout.md's "Root
// Layout" section). A request that doesn't resolve to any locale at all
// (outside this proxy's matcher) is instead handled by
// app/global-not-found.tsx, which has no locale to render with.
export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

type RootLayoutProps = Readonly<{
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}>;

export default async function RootLayout({ children, params }: RootLayoutProps) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  return (
    <html
      lang={locale}
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <NextIntlClientProvider>
          <HomeHeader />
          {children}
          <HomeFooter />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
