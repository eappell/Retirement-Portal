import { vi } from 'vitest'

// Provide a lightweight `jest` shim for tests written using Jest syntax
;(global as any).jest = (global as any).jest || vi as unknown as typeof globalThis['jest']

// Stub next/navigation for tests so `useRouter()` doesn't throw invariant errors
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: () => {}, replace: () => {}, prefetch: () => {} }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
}))

