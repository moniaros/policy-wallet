'use client'

import { useEffect, useRef } from 'react'

/** Native disclosure with a reliable destination for direct fragment links. */
export function HashDisclosure({ id, summary, children }: { id: string; summary: React.ReactNode; children: React.ReactNode }) {
    const ref = useRef<HTMLDetailsElement>(null)
    useEffect(() => {
        const reveal = () => {
            let fragment = window.location.hash.slice(1)
            try { fragment = decodeURIComponent(fragment) } catch { /* Treat malformed fragments as literal ids. */ }
            const target = document.getElementById(fragment)
            if (!ref.current || (window.location.hash !== `#${id}` && (!target || !ref.current.contains(target)))) return
            ref.current.open = true
            ref.current.scrollIntoView({ block: 'start' })
        }
        reveal()
        window.addEventListener('hashchange', reveal)
        return () => window.removeEventListener('hashchange', reveal)
    }, [id])
    return <details ref={ref} id={id} className="group/wizard scroll-mt-24"><summary className="pw-card pw-pad min-h-11 cursor-pointer text-sm font-semibold">{summary}</summary><div className="mt-4">{children}</div></details>
}
