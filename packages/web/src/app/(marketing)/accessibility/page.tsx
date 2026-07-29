import type { Metadata } from 'next';
import { StaticPage } from '@/app/_components/StaticPage';

export const metadata: Metadata = { title: 'Accessibility' };

export default function AccessibilityPage() {
  return (
    <StaticPage title="Accessibility">
      <p>
        We want Travel Booking to work for every guest, including those using a keyboard or a screen
        reader. If you run into a barrier, let us know and we&apos;ll fix it.
      </p>
    </StaticPage>
  );
}
