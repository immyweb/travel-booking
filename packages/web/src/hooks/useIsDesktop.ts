import { useSyncExternalStore } from 'react';

// Matches Tailwind's default `md` breakpoint.
const DESKTOP_QUERY = '(min-width: 768px)';

function subscribe(callback: () => void) {
  const mediaQueryList = window.matchMedia(DESKTOP_QUERY);
  mediaQueryList.addEventListener('change', callback);
  return () => mediaQueryList.removeEventListener('change', callback);
}

function getSnapshot() {
  return window.matchMedia(DESKTOP_QUERY).matches;
}

// No `window` on the server — treat as non-desktop until hydrated.
function getServerSnapshot() {
  return false;
}

export function useIsDesktop(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
