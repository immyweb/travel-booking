import type { Metadata, Viewport } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import { HomeFooter } from '@/app/_components/HomeFooter';
import { HomeHeader } from '@/app/_components/HomeHeader';
import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <HomeHeader />
        {children}
        <HomeFooter />
      </body>
    </html>
  );
}
