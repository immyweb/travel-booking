import type { Metadata } from 'next';
import { StaticPage } from '@/app/_components/StaticPage';

export const metadata: Metadata = { title: 'Privacy' };

export default function PrivacyPage() {
  return (
    <StaticPage title="Privacy">
      <p>Details on how Travel Booking handles guest data will appear here.</p>
    </StaticPage>
  );
}
