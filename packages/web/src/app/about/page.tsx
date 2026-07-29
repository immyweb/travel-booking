import type { Metadata } from 'next';
import { StaticPage } from '@/app/_components/StaticPage';

export const metadata: Metadata = { title: 'About' };

export default function AboutPage() {
  return (
    <StaticPage title="About Travel Booking">
      <p>
        Travel Booking lists boutique stays across Portugal and France — Lisbon, Sintra, Cascais and
        Paris — and lets guests book them direct, with no marketplace standing in between.
      </p>
      <p>More about who&apos;s behind it will appear here.</p>
    </StaticPage>
  );
}
