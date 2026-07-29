import { HomeFooter } from '@/app/_components/HomeFooter';
import { HomeHeader } from '@/app/_components/HomeHeader';

// Shared chrome for the browse/marketing surfaces (Home, Search, Listing
// Detail, and the static content pages) — kept out of the checkout flow
// (Book, Booking Confirmation), which stays chrome-free on purpose.
export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <HomeHeader />
      {children}
      <HomeFooter />
    </>
  );
}
