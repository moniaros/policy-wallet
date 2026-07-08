// Vitest setup file
import '@testing-library/jest-dom';
import { expect, afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';

// Node 22+ defines an experimental global localStorage that is undefined
// without --localstorage-file; under vitest's jsdom pool it clobbers jsdom's
// implementation with a plain `undefined` slot. Install an in-memory Storage
// so tests see browser behavior on any Node version (no-op where one exists).
class MemoryStorage implements Storage {
    private store = new Map<string, string>();
    get length() { return this.store.size; }
    key(index: number) { return [...this.store.keys()][index] ?? null; }
    getItem(key: string) { return this.store.get(key) ?? null; }
    setItem(key: string, value: string) { this.store.set(String(key), String(value)); }
    removeItem(key: string) { this.store.delete(key); }
    clear() { this.store.clear(); }
}
for (const name of ['localStorage', 'sessionStorage'] as const) {
    if (!(globalThis as any)[name]?.setItem) {
        Object.defineProperty(globalThis, name, {
            value: new MemoryStorage(),
            configurable: true,
        });
    }
}

// Cleanup after each test
afterEach(() => {
    cleanup();
});

// Mock Next.js router
vi.mock('next/navigation', () => ({
    useRouter: () => ({
        push: vi.fn(),
        replace: vi.fn(),
        prefetch: vi.fn(),
    }),
    useSearchParams: () => ({
        get: vi.fn(),
    }),
    usePathname: () => '',
}));

// Mock environment variables
process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-key';
