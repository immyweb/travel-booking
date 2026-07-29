import type { Metadata } from 'next';
import { StaticPage } from '@/app/_components/StaticPage';

export const metadata: Metadata = { title: 'Terms & conditions' };

export default function TermsPage() {
  return (
    <StaticPage title="Terms & conditions">
      <p>The full terms for booking a stay through Travel Booking will appear here.</p>
    </StaticPage>
  );
}
