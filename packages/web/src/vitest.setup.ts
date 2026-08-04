import { cleanup } from '@testing-library/react';
import { afterAll, afterEach, beforeAll } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { cookieStore } from '@/mocks/next-headers';
import { server } from '@/mocks/server';

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
