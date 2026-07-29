import type { Metadata } from 'next';
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
