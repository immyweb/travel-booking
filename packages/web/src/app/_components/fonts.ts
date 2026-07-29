import { Bricolage_Grotesque } from 'next/font/google';

// The homepage's display face — used only for the wordmark and headline, not
// registered in the shared Tailwind theme, so the rest of the app keeps
// Geist Sans untouched.
export const displayFont = Bricolage_Grotesque({
  subsets: ['latin'],
  weight: ['600', '700'],
});
