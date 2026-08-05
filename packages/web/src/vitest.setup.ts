import { cleanup } from '@testing-library/react';
import { createFormatter, createTranslator } from 'next-intl';
import { afterAll, afterEach, beforeAll, vi } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { cookieStore } from '@/mocks/next-headers';
import { server } from '@/mocks/server';
import messages from '../messages/en.json';

// next-intl/server's real implementation resolves via the 'react-server'
// conditional export, which only a Next.js/webpack build understands —
// Vitest resolves the plain 'next-intl' (client) condition instead, where
// every server-only function is a stub that throws "not supported in Client
// Components". Page components call getTranslations/getFormatter/getLocale
// directly (outside any React tree, before render() is even called), so
// NextIntlClientProvider — which only covers the *rendered* tree — can't
// reach them. Mocked here globally, backed by next-intl's own real
// createTranslator/createFormatter (from the client-safe 'next-intl' entry,
// not a reimplementation) against the real en.json, so tests exercise real
// ICU formatting/pluralization and can't silently desync from the actual
// message file. English-only, per #38's testing decision.
vi.mock('next-intl/server', () => ({
  getTranslations: async (arg?: string | { namespace?: string; locale?: string }) => {
    const namespace = typeof arg === 'string' ? arg : arg?.namespace;
    // createTranslator's `namespace` is typed against the literal union of
    // real namespace keys — callers here pass a plain runtime string (the
    // namespace argument every page.tsx already uses), so a precise type
    // isn't derivable at this generic mock boundary.
    return createTranslator({ locale: 'en', messages, namespace: namespace as never });
  },
  getFormatter: async () => createFormatter({ locale: 'en' }),
  getLocale: async () => 'en',
  getMessages: async () => messages,
  getNow: async () => new Date(),
  getTimeZone: async () => undefined,
  setRequestLocale: () => {},
}));

// Vitest isn't configured with `test.globals`, so RTL's implicit
// afterEach-based auto cleanup never registers — do it explicitly.
afterEach(cleanup);

// MSW intercepts every lib/api.ts call at the network boundary — see
// docs/adr/0009-msw-as-frontend-network-mocking-boundary.md. 'error' on an
// unhandled request surfaces a missing/wrong handler immediately rather than
// letting the real fetch hang against a server that isn't running.
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => {
  server.resetHandlers();
  cookieStore.set.mockClear();
  cookieStore.getAll.mockReset().mockReturnValue([]);
});
afterAll(() => server.close());

// jsdom doesn't implement these — Radix UI's Select relies on them for its
// pointer-driven open/scroll behaviour.
if (!Element.prototype.hasPointerCapture) {
  Element.prototype.hasPointerCapture = () => false;
}
if (!Element.prototype.setPointerCapture) {
  Element.prototype.setPointerCapture = () => {};
}
if (!Element.prototype.releasePointerCapture) {
  Element.prototype.releasePointerCapture = () => {};
}
if (!Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = () => {};
}
if (typeof globalThis.ResizeObserver === 'undefined') {
  globalThis.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}
// jsdom doesn't implement this either — embla-carousel (shadcn's Carousel)
// uses it to track which slides are currently in view.
if (typeof globalThis.IntersectionObserver === 'undefined') {
  globalThis.IntersectionObserver = class IntersectionObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
    takeRecords(): IntersectionObserverEntry[] {
      return [];
    }
  } as unknown as typeof IntersectionObserver;
}
// jsdom doesn't implement this — embla-carousel (shadcn's Carousel) checks it
// on init to decide whether to react to viewport-based option overrides.
if (!window.matchMedia) {
  window.matchMedia = (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  });
}
