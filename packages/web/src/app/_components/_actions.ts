'use server';

import { redirect } from 'next/navigation';
import { signOut } from '@/lib/api';

// Colocated with HomeHeader.tsx (the one place sign-out is offered) rather
// than under a specific route's own _actions.ts, since the header itself is
// mounted globally in the root layout, not scoped to one page.
export async function submitSignOut(): Promise<void> {
  await signOut();

  // Called outside any try/catch: redirect() works by throwing a control-flow
  // exception, so wrapping it would swallow the navigation instead of letting
  // it happen.
  redirect('/');
}
