import { vi } from 'vitest';

// next/headers only works inside a real request scope, which vitest never
// provides — every lib/api.ts function that reads/writes cookies goes through
// this fake store instead. Exported so individual tests can configure what
// cookies are "present" via cookieStore.getAll.mockReturnValue(...).
export const cookieStore = {
  set: vi.fn(),
  getAll: vi.fn((): { name: string; value: string }[] => []),
};

vi.mock('next/headers', () => ({
  cookies: vi.fn(async () => cookieStore),
}));
