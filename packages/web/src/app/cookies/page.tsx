import type { Metadata } from 'next';
import { StaticPage } from '@/app/_components/StaticPage';

export const metadata: Metadata = { title: 'Cookies' };

export default function CookiesPage() {
  return (
    <StaticPage title="Cookies">
      <p>Details on the cookies Travel Booking uses will appear here.</p>
    </StaticPage>
  );
}
