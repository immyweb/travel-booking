import { render, type RenderOptions } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import type { ReactElement } from 'react';
import messages from '../../messages/en.json';

// Shared by every page.test.tsx (#38), per next-intl's own documented
// component-testing pattern — wraps the rendered tree in
// NextIntlClientProvider fed the real en.json, so useTranslations/Link/
// useRouter calls inside Client Components have the locale context they
// need. Doesn't cover getTranslations/getFormatter calls made directly
// inside an async Server Component (those run before this ever mounts) —
// see vitest.setup.ts's next-intl/server mock for that half.
export function renderWithIntl(ui: ReactElement, options?: RenderOptions) {
  return render(
    <NextIntlClientProvider locale="en" messages={messages}>
      {ui}
    </NextIntlClientProvider>,
    options,
  );
}

export { messages };
