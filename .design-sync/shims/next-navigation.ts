// next/navigation shim for design-sync bundles: designs built with this DS
// don't run inside a Next.js router, so navigation hooks become inert no-ops.
const noop = () => undefined

export function useRouter() {
    return { push: noop, replace: noop, refresh: noop, back: noop, forward: noop, prefetch: noop }
}
export function usePathname(): string { return "/" }
export function useSearchParams(): URLSearchParams { return new URLSearchParams() }
export function useParams(): Record<string, string> { return {} }
export function redirect(_url: string): void { /* no-op outside Next */ }
export function notFound(): void { /* no-op outside Next */ }
