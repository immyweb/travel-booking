import Link from 'next/link';
import { displayFont } from './fonts';
import { TileMark } from './TileMark';

const FOOTER_LINKS = [
  { href: '/about', label: 'About' },
  { href: '/terms', label: 'Terms & conditions' },
  { href: '/privacy', label: 'Privacy' },
  { href: '/accessibility', label: 'Accessibility' },
  { href: '/cookies', label: 'Cookies' },
];

export function HomeFooter() {
  return (
    <footer className="bg-azulejo text-white">
      <div className="mx-auto flex max-w-6xl flex-col gap-8 px-6 py-10 sm:flex-row sm:justify-between">
        <div className="flex max-w-sm flex-col gap-2.5">
          <div className="flex items-center gap-2.5">
            <TileMark className="size-6 text-gold" />
            <span className={`${displayFont.className} text-lg font-semibold tracking-tight`}>
              Travel Booking
            </span>
          </div>
          <p className="text-sm text-white/70">
            Boutique stays across Portugal and France — booked direct, no faceless marketplace in
            between.
          </p>
        </div>
        <nav aria-label="Company" className="flex flex-col gap-2.5">
          <span className="text-xs font-medium tracking-wide text-white/70 uppercase">Company</span>
          <ul className="flex flex-col gap-1.5">
            {FOOTER_LINKS.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="text-sm text-white/80 hover:text-white hover:underline underline-offset-4"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
      <div className="border-t border-white/10">
        <div className="mx-auto max-w-6xl px-6 py-4 text-xs text-white/70">
          © {new Date().getFullYear()} Travel Booking
        </div>
      </div>
    </footer>
  );
}
