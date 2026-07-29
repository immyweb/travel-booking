import type { ReactNode } from 'react';
import { displayFont } from './fonts';

type StaticPageProps = {
  title: string;
  children: ReactNode;
};

// Shared body shell for standalone content pages (About, Terms, Privacy,
// Accessibility, Cookies) reached from the footer — header/footer come from
// the root layout, same as every other page; this only covers what's
// specific to a static content page.
export function StaticPage({ title, children }: StaticPageProps) {
  return (
    <main className="flex flex-1 flex-col bg-limestone">
      <div className="mx-auto w-full max-w-2xl px-6 py-12 sm:py-16">
        <h1 className={`${displayFont.className} text-3xl font-semibold text-azulejo sm:text-4xl`}>
          {title}
        </h1>
        <div className="mt-4 flex flex-col gap-4 text-muted-foreground">{children}</div>
      </div>
    </main>
  );
}
